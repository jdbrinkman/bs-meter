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

async function steamJson(url: string): Promise<{ ok: true; json: any } | { ok: false; reason: string }> {
  try {
    const res = await fetch(url, { headers: { "User-Agent": "BSMeter/1.0 game-review-aggregator" }, redirect: "manual", signal: AbortSignal.timeout(15000) });
    if (res.status >= 300 && res.status < 400) return { ok: false, reason: `redirected (${res.status}), likely rate-limited` };
    if (!res.ok) return { ok: false, reason: `HTTP ${res.status}` };
    if (!(res.headers.get("content-type") || "").includes("json")) return { ok: false, reason: "response was not JSON" };
    const json = await res.json();
    if (!json?.success) return { ok: false, reason: "success=0" };
    return { ok: true, json };
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : String(error) };
  }
}

export async function fetchSteamReviews(appid: number): Promise<{ ok: true; data: SteamSample } | { ok: false; reason: string }> {
  const base = `https://store.steampowered.com/appreviews/${appid}?json=1&purchase_type=all`;
  const pause = () => new Promise((r) => setTimeout(r, 1500));

  const all = await steamJson(`${base}&language=all&filter=all&num_per_page=0`);
  if (!all.ok) return { ok: false, reason: `all-time summary: ${all.reason}` };
  const qs = all.json.query_summary;

  await pause();
  const recentRes = await steamJson(`${base}&language=all&filter=all&day_range=30&num_per_page=0`);
  const rq = recentRes.ok ? recentRes.json.query_summary : null;

  await pause();
  const neg = await steamJson(`${base}&language=english&filter=all&review_type=negative&num_per_page=100`);
  await pause();
  const pos = await steamJson(`${base}&language=english&filter=all&review_type=positive&num_per_page=100`);

  const playtimeReviews = [
    ...(neg.ok ? pickPlaytimeReviews(neg.json.reviews ?? [], false) : []),
    ...(pos.ok ? pickPlaytimeReviews(pos.json.reviews ?? [], true) : []),
  ];

  const sample = {
    allTime: {
      desc: qs.review_score_desc ?? "Unknown",
      positive: qs.total_positive ?? 0,
      negative: qs.total_negative ?? 0,
      total: qs.total_reviews ?? 0,
    },
    recent: rq
      ? { positive: rq.total_positive ?? 0, negative: rq.total_negative ?? 0, total: rq.total_reviews ?? 0, percentPositive: pctPositive(rq.total_positive ?? 0, rq.total_negative ?? 0) }
      : null,
    playtimeReviews,
  };
  return { ok: true, data: { ...sample, reviewText: buildSteamReviewText(sample) } };
}
