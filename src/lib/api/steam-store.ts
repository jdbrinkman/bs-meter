// Steam store facts from the public store API (no key). Uses the app's own identity.
const UA = "BSMeter/1.0 game-review-aggregator";

export type SteamFacts = {
  appId: number;
  name: string | null;
  isFree: boolean;
  /** What a buyer pays today, USD. null when free or unpriced. */
  priceFinal: number | null;
  priceInitial: number | null;
  discountPercent: number;
  hasInAppPurchases: boolean;
  dlcCount: number;
  achievements: {
    total: number;
    mostCommonPercent: number | null;
    rarestPercent: number | null;
    /** Share of achievements earned by fewer than 5% of players: a rough signal of how much optional grind exists. */
    rareShare: number | null;
  } | null;
  fetchedAt: string;
};

export type FetchResult<T> = { ok: true; data: T } | { ok: false; reason: string };

async function getJson(url: string): Promise<FetchResult<unknown>> {
  try {
    // redirect: "manual" so a throttle/redirect to the store homepage is reported, not followed
    const res = await fetch(url, { headers: { "User-Agent": UA }, redirect: "manual", signal: AbortSignal.timeout(15000) });
    if (res.status >= 300 && res.status < 400) return { ok: false, reason: `redirected (${res.status}), likely rate-limited` };
    if (!res.ok) return { ok: false, reason: `HTTP ${res.status}` };
    if (!(res.headers.get("content-type") || "").includes("json")) return { ok: false, reason: "response was not JSON" };
    return { ok: true, data: await res.json() };
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : String(error) };
  }
}

export function parseAppDetails(appId: number, payload: unknown): Omit<SteamFacts, "achievements" | "fetchedAt"> | null {
  const entry = (payload as Record<string, { success?: boolean; data?: Record<string, unknown> }>)?.[String(appId)];
  if (!entry?.success || !entry.data) return null;
  const d = entry.data as {
    name?: string;
    is_free?: boolean;
    price_overview?: { final?: number; initial?: number; discount_percent?: number; currency?: string };
    categories?: { description: string }[];
    dlc?: number[];
  };
  const price = d.price_overview;
  return {
    appId,
    name: d.name ?? null,
    isFree: !!d.is_free,
    priceFinal: price?.final != null ? price.final / 100 : null,
    priceInitial: price?.initial != null ? price.initial / 100 : null,
    discountPercent: price?.discount_percent ?? 0,
    hasInAppPurchases: !!d.categories?.some((c) => c.description === "In-App Purchases"),
    dlcCount: d.dlc?.length ?? 0,
  };
}

export function summarizeAchievements(payload: unknown): SteamFacts["achievements"] {
  const list = (payload as { achievementpercentages?: { achievements?: { percent: number | string }[] } })?.achievementpercentages?.achievements;
  if (!list?.length) return null;
  const pct = list.map((a) => Number(a.percent)).filter((n) => Number.isFinite(n));
  if (!pct.length) return null;
  return {
    total: pct.length,
    mostCommonPercent: Math.round(Math.max(...pct) * 10) / 10,
    rarestPercent: Math.round(Math.min(...pct) * 10) / 10,
    rareShare: Math.round((pct.filter((p) => p < 5).length / pct.length) * 100) / 100,
  };
}

export async function fetchSteamFacts(appId: number): Promise<FetchResult<SteamFacts>> {
  const details = await getJson(`https://store.steampowered.com/api/appdetails?appids=${appId}&cc=us&l=english`);
  if (!details.ok) return { ok: false, reason: `appdetails: ${details.reason}` };
  const base = parseAppDetails(appId, details.data);
  if (!base) return { ok: false, reason: "appdetails: no store data for this app ID" };

  let achievements: SteamFacts["achievements"] = null;
  const ach = await getJson(`https://api.steampowered.com/ISteamUserStats/GetGlobalAchievementPercentagesForApp/v2/?gameid=${appId}`);
  if (ach.ok) achievements = summarizeAchievements(ach.data);

  return { ok: true, data: { ...base, achievements, fetchedAt: new Date().toISOString() } };
}
