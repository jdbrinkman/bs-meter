import type { OpenCriticGame } from "@/lib/types";

const BASE_URL = "https://opencritic-api.p.rapidapi.com";

function getRapidAPIHeaders(): Record<string, string> {
  const apiKey = process.env.OPENCRITIC_RAPIDAPI_KEY;
  if (!apiKey) {
    throw new Error("OPENCRITIC_RAPIDAPI_KEY is not configured");
  }
  return {
    "x-rapidapi-key": apiKey,
    "x-rapidapi-host": "opencritic-api.p.rapidapi.com",
  };
}

type OCCandidate = { id: number; name: string; dist: number; firstReleaseDate?: string | null; numReviews?: number };

function norm(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
}

/**
 * Picks the OpenCritic entry for a game. A name alone is not enough ("Resident Evil 4" is the 2005
 * game; the 2023 remake is "Resident Evil 4 (2023)"), so the candidate's first release year must
 * match ours. Returns null rather than guessing. Exported for offline testing.
 */
export function pickOpenCriticCandidate(title: string, releaseYear: number | null, candidates: OCCandidate[]): OCCandidate | null {
  const wanted = norm(title.replace(/\b(remake|remastered)\b/i, ""));
  const plausible = candidates.filter((c) => {
    const n = norm(c.name.replace(/\(\d{4}\)/, ""));
    return c.dist <= 0.45 && (n === wanted || n.startsWith(wanted) || wanted.startsWith(n));
  });
  const yearOf = (c: OCCandidate) => (c.firstReleaseDate ? new Date(c.firstReleaseDate).getFullYear() : null);
  const sameYear = releaseYear == null ? plausible : plausible.filter((c) => {
    const y = yearOf(c);
    return y != null && Math.abs(y - releaseYear) <= 1;
  });
  return [...sameYear].sort((a, b) => a.dist - b.dist || (b.numReviews ?? 0) - (a.numReviews ?? 0))[0] ?? null;
}

export async function searchOpenCritic(
  title: string,
  releaseYear: number | null = null
): Promise<OpenCriticGame | null> {
  const res = await fetch(
    `${BASE_URL}/game/search?criteria=${encodeURIComponent(title)}`,
    {
      headers: getRapidAPIHeaders(),
    }
  );

  if (!res.ok) {
    console.warn(`OpenCritic search failed: ${res.status}`);
    return null;
  }

  const results: { id: number; name: string; dist?: number }[] = await res.json();
  // Look up the top few so we can verify release year (1 RapidAPI request each)
  const detailed: OCCandidate[] = [];
  for (const r of results.slice(0, 4)) {
    const g = await getOpenCriticGameRaw(r.id);
    if (g) detailed.push({ id: r.id, name: r.name, dist: r.dist ?? 1, firstReleaseDate: g.firstReleaseDate, numReviews: g.numReviews });
  }
  const pick = pickOpenCriticCandidate(title, releaseYear, detailed);
  if (!pick) {
    console.warn(`OpenCritic: no confident match for "${title}" (${releaseYear ?? "no year"})`);
    return null;
  }
  return getOpenCriticGame(pick.id);
}

async function getOpenCriticGameRaw(id: number): Promise<{ firstReleaseDate?: string | null; numReviews?: number } | null> {
  const res = await fetch(`${BASE_URL}/game/${id}`, { headers: getRapidAPIHeaders() });
  return res.ok ? res.json() : null;
}

export async function getOpenCriticGame(
  id: number
): Promise<OpenCriticGame | null> {
  const res = await fetch(`${BASE_URL}/game/${id}`, {
    headers: getRapidAPIHeaders(),
  });

  if (!res.ok) {
    console.warn(`OpenCritic game fetch failed: ${res.status}`);
    return null;
  }

  const game = await res.json();

  return {
    id: game.id,
    name: game.name,
    topCriticScore: game.topCriticScore ?? 0,
    tier: game.tier ?? "Unknown",
    reviewCount: game.numReviews ?? 0,
  };
}
