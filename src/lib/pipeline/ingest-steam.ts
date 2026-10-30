import { createAdminClient } from "@/lib/supabase/admin";
import { fetchSteamFacts } from "@/lib/api/steam-store";
import { findSteamAppId, fetchSteamReviews } from "@/lib/api/steam";
import { SEED_GAMES } from "@/config/seed-games";
import { logIngest } from "./ingest-log";

/** Steam store facts (price, IAP, DLC, achievements) and a playtime-weighted review sample. Logs every step. */
export async function ingestSteam(gameId: string, title: string, options: { reviews?: boolean } = {}) {
  const supabase = createAdminClient();
  const seed = SEED_GAMES.find((g) => g.title.toLowerCase() === title.toLowerCase());

  const { data: row } = await supabase.from("games").select("steam_app_id, steam_facts").eq("id", gameId).single();
  const appId: number | null = row?.steam_app_id ?? seed?.steamAppId ?? (await findSteamAppId(title));
  if (!appId) {
    await logIngest(supabase, gameId, "steam", "skipped", "no Steam App ID (console exclusive, or title did not match)");
    return { appId: null, facts: false, reviews: false };
  }
  if (!row?.steam_app_id) await supabase.from("games").update({ steam_app_id: appId }).eq("id", gameId);

  // 1. Store facts
  let factsOk = false;
  let facts: Record<string, unknown> | null = (row?.steam_facts as Record<string, unknown>) ?? null;
  const f = await fetchSteamFacts(appId);
  if (f.ok) {
    facts = { ...(facts ?? {}), ...f.data };
    const price = f.data.isFree ? 0 : f.data.priceFinal;
    const { error } = await supabase
      .from("games")
      .update({ steam_facts: facts, steam_facts_checked_at: new Date().toISOString(), ...(price != null ? { current_price_usd: price, price_source: "steam" } : {}) })
      .eq("id", gameId);
    factsOk = !error;
    await logIngest(supabase, gameId, "steam:store", error ? "failed" : "ok",
      error ? error.message : `price ${f.data.isFree ? "free" : "$" + f.data.priceFinal}${f.data.discountPercent ? ` (-${f.data.discountPercent}%)` : ""}, IAP ${f.data.hasInAppPurchases}, DLC ${f.data.dlcCount}, ${f.data.achievements?.total ?? 0} achievements`);
  } else {
    await logIngest(supabase, gameId, "steam:store", "failed", f.reason);
  }

  // 2. Reviews (skippable so a bulk store-facts refresh does not hit a throttled reviews endpoint)
  let reviewsOk = false;
  if (options.reviews === false) return { appId, facts: factsOk, reviews: false };
  const r = await fetchSteamReviews(appId);
  if (r.ok) {
    const s = r.data;
    const { error } = await supabase.from("review_sources").upsert(
      {
        game_id: gameId,
        source_type: "steam",
        channel_name: "Steam Users",
        video_id: String(appId),
        video_title: `Steam Reviews (${s.allTime.desc})`,
        transcript: s.reviewText,
        url: `https://store.steampowered.com/app/${appId}`,
        fetched_at: new Date().toISOString(),
      },
      { onConflict: "game_id,source_type,video_id" }
    );
    await supabase
      .from("games")
      .update({
        steam_review_score_desc: s.allTime.desc,
        steam_total_reviews: s.allTime.total,
        steam_facts: { ...(facts ?? {}), reviews: { allTime: s.allTime, recent: s.recent, sampled: s.playtimeReviews.length } },
      })
      .eq("id", gameId);
    reviewsOk = !error;
    await logIngest(supabase, gameId, "steam:reviews", error ? "failed" : "ok",
      error ? error.message : `${s.allTime.desc}; recent ${s.recent?.percentPositive ?? "?"}% positive; ${s.playtimeReviews.length} long-playtime reviews`);
  } else {
    await logIngest(supabase, gameId, "steam:reviews", "failed", r.reason);
  }
  return { appId, facts: factsOk, reviews: reviewsOk };
}
