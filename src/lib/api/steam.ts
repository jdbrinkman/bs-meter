export type SteamReviewSummary = {
  review_score: number;
  review_score_desc: string;
  total_positive: number;
  total_negative: number;
  total_reviews: number;
};

export type SteamReview = {
  voted_up: boolean;
  votes_up?: number;
  playtime_at_review: number; // minutes
  review: string;
};

export type SteamData = {
  appid: number;
  summary: SteamReviewSummary;
  reviews: SteamReview[];
  reviewText: string;
};

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function similarityScore(a: string, b: string): number {
  const na = normalizeTitle(a);
  const nb = normalizeTitle(b);
  if (na === nb) return 1.0;
  // Simple overlap ratio: count common words
  const wordsA = new Set(na.split(" "));
  const wordsB = new Set(nb.split(" "));
  const intersection = [...wordsA].filter((w) => wordsB.has(w)).length;
  const union = new Set([...wordsA, ...wordsB]).size;
  return intersection / union;
}

export async function findSteamAppId(gameTitle: string): Promise<number | null> {
  try {
    const url = `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(gameTitle)}&l=english&cc=US`;
    const res = await fetch(url, {
      headers: { "User-Agent": "BSMeter/1.0 game-review-aggregator" },
    });
    if (!res.ok) return null;

    const data = await res.json();
    const items: { id: number; name: string }[] = data?.items ?? [];
    if (!items.length) return null;

    // Find best match by title similarity
    let bestMatch: { id: number; name: string } | null = null;
    let bestScore = 0;

    for (const item of items) {
      const score = similarityScore(gameTitle, item.name);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = item;
      }
    }

    // Require at least 0.6 similarity to avoid false matches
    if (!bestMatch || bestScore < 0.6) {
      console.warn(`No confident Steam match for "${gameTitle}" (best: ${bestMatch?.name}, score: ${bestScore.toFixed(2)})`);
      return null;
    }

    console.log(`Steam match for "${gameTitle}": "${bestMatch.name}" (appid: ${bestMatch.id}, similarity: ${bestScore.toFixed(2)})`);
    return bestMatch.id;
  } catch (error) {
    console.warn(`Steam search failed for "${gameTitle}":`, error);
    return null;
  }
}

// ---- Review sampling -------------------------------------------------------------------------
// What we want for BS scoring is what long-time players say (grind, repetition, "is it broken
// today"), not just the latest 20 posts. So we take: all-time summary, last-30-days summary
// (recent vs overall), and the most helpful positive and negative reviews from players with real
// playtime. 4 requests per game, spaced out; stops at the first redirect/throttle.

export type SteamSample = {
  allTime: { desc: string; positive: number; negative: number; total: number };
  recent: { positive: number; negative: number; total: number; percentPositive: number | null } | null;
  playtimeReviews: SteamReview[];
  reviewText: string;
};

const MIN_PLAYTIME_HOURS = 20;
const PER_SIDE = 6;
const MAX_REVIEW_CHARS = 700;

type RawReview = { voted_up: boolean; votes_up?: number; review: string; author?: { playtime_forever?: number; playtime_at_review?: number } };

export function pickPlaytimeReviews(raw: RawReview[], votedUp: boolean): SteamReview[] {
  return raw
    .filter((r) => r.voted_up === votedUp && r.review && r.review.trim().length > 80)
    .map((r) => ({
      voted_up: r.voted_up,
      votes_up: r.votes_up ?? 0,
      hours: Math.round(Math.max(r.author?.playtime_at_review ?? 0, r.author?.playtime_forever ?? 0) / 60),
      review: r.review.replace(/\s+/g, " ").trim(),
    }))
    .filter((r) => r.hours >= MIN_PLAYTIME_HOURS)
    .sort((a, b) => b.votes_up - a.votes_up)
    .slice(0, PER_SIDE)
    .map((r) => ({ voted_up: r.voted_up, playtime_at_review: r.hours, review: r.review }));
}

export function buildSteamReviewText(sample: Omit<SteamSample, "reviewText">): string {
  const fmt = (n: number) => n.toLocaleString("en-US");
  const lines = [
    `Steam all-time: ${sample.allTime.desc} (${fmt(sample.allTime.positive)} positive / ${fmt(sample.allTime.negative)} negative, ${fmt(sample.allTime.total)} reviews)`,
  ];
  if (sample.recent && sample.recent.total > 0) {
    lines.push(`Steam last 30 days: ${sample.recent.percentPositive}% positive of ${fmt(sample.recent.total)} reviews`);
  }
  const block = (label: string, votedUp: boolean) => {
    const rows = sample.playtimeReviews.filter((r) => r.voted_up === votedUp);
    if (!rows.length) return [];
    return ["", `=== ${label} (players with ${MIN_PLAYTIME_HOURS}+ hours, most helpful first) ===`,
      ...rows.map((r) => `[${r.playtime_at_review}h played] ${r.review.length > MAX_REVIEW_CHARS ? r.review.slice(0, MAX_REVIEW_CHARS) + "…" : r.review}`)];
  };
  return [...lines, ...block("Negative reviews", false), ...block("Positive reviews", true)].join("\n");
}

const pctPositive = (p: number, n: number) => (p + n > 0 ? Math.round((p / (p + n)) * 100) : null);

// Valve's documented replacement for the deprecated store.steampowered.com/appreviews endpoint.
// https://partner.steamgames.com/doc/webapi/IUserReviewsService  (no key needed; anonymous calls share a lower rate limit)
// Enums: filter 0=Helpful 1=Recent; review_type 0=All 1=Positive 2=Negative; purchase_type 1=All.
type ServiceResponse = {
  query_summary?: { review_score_desc?: string; total_positive?: number; total_negative?: number; total_reviews?: number };
  reviews?: RawReview[];
  total_matching?: number;
};
type ServiceResult = { ok: true; response: ServiceResponse } | { ok: false; reason: string; rateLimited: boolean };

async function steamReviewsService(input: Record<string, unknown>): Promise<ServiceResult> {
  try {
    const url = "https://api.steampowered.com/IUserReviewsService/GetAppReviews/v1/?" + new URLSearchParams({ input_json: JSON.stringify(input) });
    const res = await fetch(url, { headers: { "User-Agent": "BSMeter/1.0 game-review-aggregator" }, redirect: "manual", signal: AbortSignal.timeout(20000) });
    if (res.status === 429) return { ok: false, reason: "HTTP 429 (rate limited)", rateLimited: true };
    if (res.status >= 300 && res.status < 400) return { ok: false, reason: `redirected (${res.status})`, rateLimited: true };
    if (!res.ok) return { ok: false, reason: `HTTP ${res.status}`, rateLimited: false };
    const json = await res.json();
    if (!json?.response) return { ok: false, reason: "no response object", rateLimited: false };
    return { ok: true, response: json.response };
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : String(error), rateLimited: false };
  }
}

export async function fetchSteamReviews(appid: number): Promise<{ ok: true; data: SteamSample } | { ok: false; reason: string }> {
  const pause = () => new Promise((r) => setTimeout(r, 1200));
  const base = { appid, languages: ["all"], purchase_type: 1 };

  // 1. all-time summary
  const all = await steamReviewsService({ ...base, filter: 1, num_per_page: 0 });
  if (!all.ok) return { ok: false, reason: `all-time summary: ${all.reason}` };
  const qs = all.response.query_summary;
  if (!qs) return { ok: false, reason: "all-time summary: no query_summary" };

  // 2-3. last 30 days: Helpful + day_range gives windowed counts in total_matching
  let recent: SteamSample["recent"] = null;
  await pause();
  const recentPos = await steamReviewsService({ ...base, filter: 0, day_range: 30, review_type: 1, num_per_page: 1 });
  if (recentPos.ok) {
    await pause();
    const recentNeg = await steamReviewsService({ ...base, filter: 0, day_range: 30, review_type: 2, num_per_page: 1 });
    if (recentNeg.ok) {
      const p = recentPos.response.total_matching ?? 0;
      const n = recentNeg.response.total_matching ?? 0;
      recent = { positive: p, negative: n, total: p + n, percentPositive: pctPositive(p, n) };
    }
  }

  // 4-5. most helpful reviews from players with real playtime, all time
  const longPlay = { appid, languages: ["english"], purchase_type: 1, filter: 0, day_range: 0, playtime_min_hours: MIN_PLAYTIME_HOURS, num_per_page: 40 };
  await pause();
  const neg = await steamReviewsService({ ...longPlay, review_type: 2 });
  await pause();
  const pos = await steamReviewsService({ ...longPlay, review_type: 1 });

  const playtimeReviews = [
    ...(neg.ok ? pickPlaytimeReviews(neg.response.reviews ?? [], false) : []),
    ...(pos.ok ? pickPlaytimeReviews(pos.response.reviews ?? [], true) : []),
  ];

  const sample = {
    allTime: { desc: qs.review_score_desc ?? "Unknown", positive: qs.total_positive ?? 0, negative: qs.total_negative ?? 0, total: qs.total_reviews ?? 0 },
    recent,
    playtimeReviews,
  };
  return { ok: true, data: { ...sample, reviewText: buildSteamReviewText(sample) } };
}
