// IsThereAnyDeal: cross-store PC prices and price history. https://docs.isthereanydeal.com/
// Used as a SECOND source next to the Steam store API: it corroborates the Steam price and adds the
// all-time low. It is not the verdict price (Steam's own price is first-party and always fresh).

const BASE = "https://api.isthereanydeal.com";

// Stores whose price a buyer can actually act on. Gray-market key sellers are excluded.
export const RELIABLE_SHOPS = new Set([
  "Steam", "GOG", "Epic Game Store", "Humble Store", "Microsoft Store", "Fanatical", "Green Man Gaming",
  "GamesPlanet US", "Blizzard", "EA app", "Ubisoft Store", "PlayStation Store",
]);
// ITAD price timestamps can lag by months for some shops; only trust recent ones.
const MAX_DEAL_AGE_DAYS = 7;

export type ItadDeal = { shop: string; amount: number; regular: number; cut: number; timestamp: string };
export type PriceHistory = {
  itadId: string;
  historyLow: { all: number | null; y1: number | null; m3: number | null };
  /** Cheapest price at a reliable shop, updated within the last week. null if none is fresh. */
  bestFreshDeal: ItadDeal | null;
  steamPrice: number | null;
  checkedAt: string;
};

type Money = { amount: number; currency?: string };
type Json = {
  found?: boolean;
  game?: { id: string };
  id?: string;
  historyLow?: { all?: Money; y1?: Money; m3?: Money };
  deals?: { shop?: { name: string }; price: Money; regular?: Money; cut?: number; timestamp: string }[];
};

function key(): string {
  const k = process.env.ITAD_API_KEY;
  if (!k) throw new Error("ITAD_API_KEY is not configured");
  return k;
}

async function call(method: "GET" | "POST", path: string, params: Record<string, string>, body?: unknown): Promise<Json | Json[]> {
  const res = await fetch(`${BASE}${path}?` + new URLSearchParams({ ...params, key: key() }), {
    method,
    headers: { "User-Agent": "BSMeter/1.0 game-review-aggregator", "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(25000),
  });
  if (res.status === 429) throw new Error("ITAD rate limited (429)");
  if (!res.ok) throw new Error(`ITAD ${path} failed: HTTP ${res.status}`);
  return res.json();
}

/** Looks a game up by its Steam App ID (exact). Returns null if ITAD does not know it. */
export async function lookupBySteamAppId(appId: number): Promise<string | null> {
  const r = (await call("GET", "/games/lookup/v1", { appid: String(appId) })) as Json;
  return r.found && r.game ? r.game.id : null;
}

export function summarizePrices(itadId: string, entry: Json, now = new Date()): PriceHistory {
  const money = (m: Money | undefined) => (m && typeof m.amount === "number" ? m.amount : null);
  const deals = (entry.deals ?? []).filter((d) => d.price?.currency === "USD");
  const ageDays = (d: { timestamp: string }) => (now.getTime() - new Date(d.timestamp).getTime()) / 86_400_000;
  const fresh = deals.filter((d) => RELIABLE_SHOPS.has(d.shop?.name ?? "") && ageDays(d) <= MAX_DEAL_AGE_DAYS);
  const best = fresh.sort((a, b) => a.price.amount - b.price.amount)[0];
  const steam = deals.find((d) => d.shop?.name === "Steam");
  return {
    itadId,
    historyLow: { all: money(entry.historyLow?.all), y1: money(entry.historyLow?.y1), m3: money(entry.historyLow?.m3) },
    bestFreshDeal: best
      ? { shop: best.shop?.name ?? "Unknown", amount: best.price.amount, regular: best.regular?.amount ?? best.price.amount, cut: best.cut ?? 0, timestamp: best.timestamp }
      : null,
    steamPrice: steam ? steam.price.amount : null,
    checkedAt: now.toISOString(),
  };
}

/** Prices for many ITAD game IDs in one request. */
export async function fetchPrices(itadIds: string[]): Promise<Map<string, PriceHistory>> {
  const out = new Map<string, PriceHistory>();
  if (!itadIds.length) return out;
  const rows = (await call("POST", "/games/prices/v3", { country: "US", deals: "false", capacity: "0" }, itadIds)) as Json[];
  for (const row of rows) if (row.id) out.set(row.id, summarizePrices(row.id, row));
  return out;
}
