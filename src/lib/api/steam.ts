export type SteamReviewSummary = {
  review_score: number;
  review_score_desc: string;
  total_positive: number;
  total_negative: number;
  total_reviews: number;
};

export type SteamReview = {
  voted_up: boolean;
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

export async function fetchSteamReviews(appid: number): Promise<SteamData | null> {
  try {
    // Fetch summary
    const summaryRes = await fetch(
      `https://store.steampowered.com/appreviews/${appid}?json=1&filter=summary&language=english`,
      { headers: { "User-Agent": "BSMeter/1.0 game-review-aggregator" } }
    );
    if (!summaryRes.ok) return null;

    const summaryData = await summaryRes.json();
    if (!summaryData?.success || !summaryData?.query_summary) return null;

    const qs = summaryData.query_summary;
    const summary: SteamReviewSummary = {
      review_score: qs.review_score ?? 0,
      review_score_desc: qs.review_score_desc ?? "Unknown",
      total_positive: qs.total_positive ?? 0,
      total_negative: qs.total_negative ?? 0,
      total_reviews: qs.total_reviews ?? 0,
    };

    // Fetch recent reviews (mix of positive and negative)
    const reviewsRes = await fetch(
      `https://store.steampowered.com/appreviews/${appid}?json=1&filter=recent&language=english&num_per_page=20&review_type=all&purchase_type=all`,
      { headers: { "User-Agent": "BSMeter/1.0 game-review-aggregator" } }
    );

    let reviews: SteamReview[] = [];
    if (reviewsRes.ok) {
      const reviewsData = await reviewsRes.json();
      const rawReviews: {
        voted_up: boolean;
        author?: { playtime_at_review?: number };
        review: string;
      }[] = reviewsData?.reviews ?? [];

      reviews = rawReviews
        .filter((r) => r.review && r.review.trim().length > 20)
        .map((r) => ({
          voted_up: r.voted_up,
          playtime_at_review: Math.round((r.author?.playtime_at_review ?? 0) / 60), // convert minutes to hours
          review: r.review.trim(),
        }))
        .slice(0, 20);
    }

    // Build formatted text block for the AI prompt
    const positiveCount = summary.total_positive.toLocaleString();
    const negativeCount = summary.total_negative.toLocaleString();
    const totalCount = summary.total_reviews.toLocaleString();

    const reviewLines = reviews.map((r) => {
      const sentiment = r.voted_up ? "POSITIVE" : "NEGATIVE";
      const playtime = r.playtime_at_review > 0 ? `${r.playtime_at_review}h played` : "playtime unknown";
      const text = r.review.length > 300 ? r.review.slice(0, 300) + "…" : r.review;
      return `[${sentiment}, ${playtime}] ${text}`;
    });

    const reviewText = [
      `Steam Review Summary: ${summary.review_score_desc} (${positiveCount} positive / ${negativeCount} negative, ${totalCount} total reviews)`,
      "",
      "=== Recent Steam User Reviews ===",
      ...reviewLines,
    ].join("\n");

    return { appid, summary, reviews, reviewText };
  } catch (error) {
    console.warn(`Steam review fetch failed for appid ${appid}:`, error);
    return null;
  }
}
