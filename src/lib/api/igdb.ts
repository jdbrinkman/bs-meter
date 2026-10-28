import type { IGDBGame } from "@/lib/types";

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token;
  }

  const params = new URLSearchParams({
    client_id: process.env.IGDB_CLIENT_ID!,
    client_secret: process.env.IGDB_CLIENT_SECRET!,
    grant_type: "client_credentials",
  });

  const res = await fetch(
    `https://id.twitch.tv/oauth2/token?${params.toString()}`,
    { method: "POST" }
  );

  if (!res.ok) throw new Error(`Twitch auth failed: ${res.status}`);

  const data = await res.json();
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000 - 60000,
  };
  return cachedToken.token;
}

const IGDB_FIELDS =
  "name,slug,summary,cover.url,genres.name,platforms.name,involved_companies.company.name,involved_companies.developer,involved_companies.publisher,first_release_date,game_type.type,rating_count";

// Mobile/handheld platforms that shouldn't appear for console/PC games
const MOBILE_PLATFORMS = new Set([
  "Android",
  "iOS",
  "Windows Phone",
  "J2ME",
  "Symbian",
  "Palm OS",
  "BlackBerry OS",
]);

export function filterPlatforms(platforms: string[]): string[] {
  return platforms.filter((p) => !MOBILE_PLATFORMS.has(p));
}

// IGDB types that are real, standalone games. Everything else (Bundle, Mod, Update, Expansion,
// DLC, Season, Pack...) is never the game we want, even when it ranks first in search.
const GAME_TYPES = new Set(["Main Game", "Remake", "Remaster", "Standalone Expansion", "Expanded Game", "Port", "Fork"]);

function normName(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
}

/** Picks the right IGDB record from search candidates. Exported so it can be tested offline. */
export function pickIGDBCandidate(title: string, candidates: IGDBGame[]): IGDBGame | null {
  const real = candidates.filter((c) => GAME_TYPES.has(c.game_type?.type ?? ""));
  const exact = real.filter((c) => c.name.toLowerCase() === title.toLowerCase());
  const normalized = real.filter((c) => normName(c.name) === normName(title));
  const pool = exact.length ? exact : normalized;
  if (!pool.length) return null; // no confident match: caller must report it, not guess
  // IGDB has duplicate entries for some games; the real one has far more ratings.
  return [...pool].sort((a, b) => (b.rating_count ?? 0) - (a.rating_count ?? 0))[0];
}

export async function searchIGDB(title: string): Promise<IGDBGame | null> {
  const token = await getAccessToken();

  const res = await fetch("https://api.igdb.com/v4/games", {
    method: "POST",
    headers: {
      "Client-ID": process.env.IGDB_CLIENT_ID!,
      Authorization: `Bearer ${token}`,
      "Content-Type": "text/plain",
    },
    body: `search "${title.replace(/"/g, "")}"; fields ${IGDB_FIELDS}; limit 15;`,
  });

  if (!res.ok) throw new Error(`IGDB search failed: ${res.status}`);

  return pickIGDBCandidate(title, (await res.json()) as IGDBGame[]);
}

export async function searchIGDBBySlug(slug: string): Promise<IGDBGame | null> {
  const token = await getAccessToken();

  const res = await fetch("https://api.igdb.com/v4/games", {
    method: "POST",
    headers: {
      "Client-ID": process.env.IGDB_CLIENT_ID!,
      Authorization: `Bearer ${token}`,
      "Content-Type": "text/plain",
    },
    body: `fields ${IGDB_FIELDS}; where slug = "${slug}"; limit 1;`,
  });

  if (!res.ok) throw new Error(`IGDB slug lookup failed: ${res.status}`);

  const results: IGDBGame[] = await res.json();
  return results[0] || null;
}

export function extractDeveloper(game: IGDBGame): string | null {
  return (
    game.involved_companies?.find((ic) => ic.developer)?.company.name ?? null
  );
}

export function extractPublisher(game: IGDBGame): string | null {
  return (
    game.involved_companies?.find((ic) => ic.publisher)?.company.name ?? null
  );
}

export function formatCoverUrl(url: string | undefined): string | null {
  if (!url) return null;
  // IGDB returns //images.igdb.com/... — we want https and larger size
  return url.replace("t_thumb", "t_cover_big").replace("//", "https://");
}
