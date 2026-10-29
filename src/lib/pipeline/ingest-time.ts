import { createAdminClient } from "@/lib/supabase/admin";
import { fetchTimeToBeat, usableTimeToBeat } from "@/lib/api/igdb";
import { lookupHltb, HLTB_REFRESH_DAYS } from "@/lib/api/hltb";
import { logIngest } from "./ingest-log";

/**
 * Time to beat, in order of preference:
 *   1. HowLongToBeat (live, identity-checked by title and release year, refreshed every HLTB_REFRESH_DAYS)
 *   2. hand-entered HLTB numbers from the seed list (already on the row)
 *   3. IGDB community data, only to fill a game that has no hours
 * IGDB is also stored beside whichever is used so the two can be compared.
 */
export async function ingestTimeToBeat(gameId: string) {
  const supabase = createAdminClient();
  const { data: game } = await supabase
    .from("games")
    .select("title, release_date, igdb_id, main_story_hours, main_extras_hours, completionist_hours, time_to_beat")
    .eq("id", gameId)
    .single();
  if (!game) return { filled: false };

  await refreshFromHltb(gameId, game);
  return fillFromIgdb(gameId);
}

type GameRow = {
  title: string;
  release_date: string | null;
  main_extras_hours: number | null;
  time_to_beat: Record<string, any> | null; // eslint-disable-line @typescript-eslint/no-explicit-any
};

async function refreshFromHltb(gameId: string, game: GameRow) {
  const supabase = createAdminClient();
  const last = game.time_to_beat?.hltb?.checkedAt;
  if (last && Date.now() - new Date(last).getTime() < HLTB_REFRESH_DAYS * 86_400_000) {
    await logIngest(supabase, gameId, "hltb", "skipped", `checked ${last.slice(0, 10)}; refreshed every ${HLTB_REFRESH_DAYS} days`);
    return;
  }
  const year = game.release_date ? new Date(game.release_date).getFullYear() : null;
  const r = await lookupHltb(game.title, year);
  await new Promise((resolve) => setTimeout(resolve, 2500)); // polite spacing between games

  if (!r.ok) return void (await logIngest(supabase, gameId, "hltb", "failed", r.reason));
  if (!r.match) return void (await logIngest(supabase, gameId, "hltb", "empty", "no entry with the same title and release year"));

  const m = r.match;
  const hasTimes = m.mainHours != null || m.extraHours != null || m.completionistHours != null;
  const stored = { ...m, checkedAt: new Date().toISOString() };

  // Do not overwrite hours with an entry that disagrees wildly with IGDB: probably the wrong game or edition.
  const ig = game.time_to_beat?.usable ? game.time_to_beat.normalHours : null;
  const ratio = ig && m.extraHours ? m.extraHours / ig : null;
  const disagrees = ratio != null && (ratio > 2 || ratio < 0.5);

  const update: Record<string, unknown> = { hltb_id: m.id, time_to_beat: { ...(game.time_to_beat ?? {}), hltb: stored } };
  if (hasTimes && !disagrees) {
    update.main_story_hours = m.mainHours;
    update.main_extras_hours = m.extraHours;
    update.completionist_hours = m.completionistHours;
    update.hours_source = "hltb";
  }
  const { error } = await supabase.from("games").update(update).eq("id", gameId);
  if (error) return void (await logIngest(supabase, gameId, "hltb", "failed", error.message));
  await logIngest(supabase, gameId, "hltb", hasTimes && !disagrees ? "ok" : "empty",
    `${m.name} (${m.releaseYear ?? "?"}): ${m.mainHours ?? "?"}/${m.extraHours ?? "?"}/${m.completionistHours ?? "?"}h` +
      (!hasTimes ? "; no single-player times (live service?)" : disagrees ? `; NOT USED: disagrees with IGDB by ${ratio!.toFixed(1)}x` : ""));
}

async function fillFromIgdb(gameId: string) {

  const supabase = createAdminClient();
  const { data: game } = await supabase
    .from("games")
    .select("igdb_id, main_story_hours, main_extras_hours, completionist_hours")
    .eq("id", gameId)
    .single();
  if (!game?.igdb_id) {
    await logIngest(supabase, gameId, "time-to-beat", "skipped", "no IGDB ID");
    return { filled: false };
  }

  try {
    const ttb = await fetchTimeToBeat(game.igdb_id);
    if (!ttb) {
      await logIngest(supabase, gameId, "time-to-beat", "empty", "IGDB has no time-to-beat for this game");
      return { filled: false };
    }
    const verdict = usableTimeToBeat(ttb);
    const hasHours = game.main_story_hours != null || game.main_extras_hours != null || game.completionist_hours != null;
    const fill = verdict.ok && !hasHours;

    const { error } = await supabase
      .from("games")
      .update({
        time_to_beat: { ...ttb, usable: verdict.ok, reason: verdict.reason, checkedAt: new Date().toISOString() },
        ...(fill
          ? { main_story_hours: verdict.cleaned.fastHours, main_extras_hours: verdict.cleaned.normalHours, completionist_hours: verdict.cleaned.completeHours, hours_source: "igdb" }
          : {}),
      })
      .eq("id", gameId);
    if (error) {
      await logIngest(supabase, gameId, "time-to-beat", "failed", error.message);
      return { filled: false };
    }
    await logIngest(supabase, gameId, "time-to-beat", verdict.ok ? "ok" : "empty",
      `${ttb.fastHours ?? "?"}/${ttb.normalHours ?? "?"}/${ttb.completeHours ?? "?"}h from ${ttb.count} submissions; ${verdict.ok ? (fill ? "used (no hours on file)" : "kept hand-entered hours") + (verdict.reason !== "ok" ? "; " + verdict.reason : "") : "rejected: " + verdict.reason}`);
    return { filled: fill };
  } catch (e) {
    await logIngest(supabase, gameId, "time-to-beat", "failed", e instanceof Error ? e.message : String(e));
    return { filled: false };
  }
}
