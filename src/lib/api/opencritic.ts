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

export async function searchOpenCritic(
  title: string
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

  const results = await res.json();
  if (!results.length) return null;

  // Get full game data
  const gameId = results[0].id;
  return getOpenCriticGame(gameId);
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
