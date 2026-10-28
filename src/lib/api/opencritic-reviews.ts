export type CriticReview = {
  id: string;
  outlet: string;
  author: string | null;
  score: number | null;
  snippet: string | null;
  url: string | null;
  publishedAt: string | null;
};

type RawReview = {
  _id: string;
  snippet?: string | null;
  score?: number | string | null;
  externalUrl?: string | null;
  publishedDate?: string | null;
  alias?: string | null;
  Outlet?: { name?: string } | null;
};

/** Pulls reviews (most popular outlets first) for an OpenCritic game. 20 per page; 1 RapidAPI request per page. */
export async function fetchOpenCriticReviews(opencriticId: number, pages = 2): Promise<CriticReview[]> {
  const key = process.env.OPENCRITIC_RAPIDAPI_KEY;
  if (!key) throw new Error("OPENCRITIC_RAPIDAPI_KEY is not configured");

  const out: CriticReview[] = [];
  for (let page = 0; page < pages; page++) {
    const res = await fetch(
      `https://opencritic-api.p.rapidapi.com/reviews/game/${opencriticId}?skip=${page * 20}&sort=popularity`,
      { headers: { "x-rapidapi-key": key, "x-rapidapi-host": "opencritic-api.p.rapidapi.com" } }
    );
    if (!res.ok) throw new Error(`OpenCritic reviews failed: ${res.status}`);
    const raw = (await res.json()) as RawReview[];
    for (const r of raw) {
      const n = r.score == null ? null : Number(r.score);
      out.push({
        id: r._id,
        outlet: r.Outlet?.name ?? "Unknown",
        author: r.alias || null,
        score: n != null && Number.isFinite(n) ? n : null,
        snippet: r.snippet?.trim() || null,
        url: r.externalUrl || null,
        publishedAt: r.publishedDate || null,
      });
    }
    if (raw.length < 20) break;
  }
  return out;
}
