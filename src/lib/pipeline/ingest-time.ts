import { createAdminClient } from "@/lib/supabase/admin";
import { fetchTimeToBeat, usableTimeToBeat } from "@/lib/api/igdb";
import { logIngest } from "./ingest-log";

/**
 * Stores IGDB's time-to-beat and uses it to fill hours that are missing. Hand-entered hours are never
 * overwritten (they stay, with the IGDB numbers beside them for comparison). Mapping:
 * fast run -> main story, normal run -> main + extras, complete run -> completionist.
 */
export async function ingestTimeToBeat(gameId: string) {
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
