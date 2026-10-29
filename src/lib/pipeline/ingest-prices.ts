import { createAdminClient } from "@/lib/supabase/admin";
import { lookupBySteamAppId, fetchPrices } from "@/lib/api/itad";
import { logIngest } from "./ingest-log";

/**
 * Adds price history (all-time low, best fresh reliable-store price) from IsThereAnyDeal, and
 * cross-checks ITAD's Steam price against the Steam store API price. Games without a Steam App ID
 * (console exclusives) are marked as list-price. Pass gameIds to limit the run.
 */
export async function ingestPrices(gameIds?: string[]) {
  const supabase = createAdminClient();
  let q = supabase.from("games").select("id, title, steam_app_id, current_price_usd");
  if (gameIds?.length) q = q.in("id", gameIds);
  const { data: games, error } = await q;
  if (error || !games) throw new Error(error?.message ?? "could not load games");

  const itadIds = new Map<string, string>(); // game id -> ITAD id
  for (const g of games) {
    if (!g.steam_app_id) continue;
    try {
      const id = await lookupBySteamAppId(g.steam_app_id);
      if (id) itadIds.set(g.id, id);
      else await logIngest(supabase, g.id, "itad", "empty", `ITAD has no game for Steam App ID ${g.steam_app_id}`);
    } catch (e) {
      await logIngest(supabase, g.id, "itad", "failed", e instanceof Error ? e.message : String(e));
    }
    await new Promise((r) => setTimeout(r, 150));
  }

  const prices = await fetchPrices([...new Set(itadIds.values())]);
  const results: { title: string; source: string; steamMismatch?: boolean }[] = [];

  for (const g of games) {
    const hasSteamPrice = g.current_price_usd != null;
    const history = itadIds.has(g.id) ? prices.get(itadIds.get(g.id)!) : undefined;
    const mismatch =
      history?.steamPrice != null && hasSteamPrice && Math.abs(history.steamPrice - Number(g.current_price_usd)) > 1;

    await supabase
      .from("games")
      .update({
        price_source: hasSteamPrice ? "steam" : "list",
        ...(history ? { price_history: history, price_checked_at: history.checkedAt } : {}),
      })
      .eq("id", g.id);

    if (history) {
      await logIngest(supabase, g.id, "itad", mismatch ? "failed" : "ok",
        `all-time low ${history.historyLow.all != null ? "$" + history.historyLow.all : "?"}; best fresh ${history.bestFreshDeal ? `$${history.bestFreshDeal.amount} at ${history.bestFreshDeal.shop}` : "none"}${mismatch ? `; PRICE MISMATCH: ITAD Steam $${history.steamPrice} vs Steam API $${g.current_price_usd}` : ""}`);
    } else if (!g.steam_app_id) {
      await logIngest(supabase, g.id, "itad", "skipped", "no Steam App ID (console exclusive); using list price");
    }
    results.push({ title: g.title, source: hasSteamPrice ? "steam" : "list", steamMismatch: mismatch || undefined });
  }
  return results;
}
