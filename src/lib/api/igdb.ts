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
  "name,slug,summary,cover.url,genres.name,platforms.name,involved_companies.company.name,involved_companies.developer,involved_companies.publisher,first_release_date";

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

export async function searchIGDB(title: string): Promise<IGDBGame | null> {
  const token = await getAccessToken();

  const res = await fetch("https://api.igdb.com/v4/games", {
    method: "POST",
    headers: {
      "Client-ID": process.env.IGDB_CLIENT_ID!,
      Authorization: `Bearer ${token}`,
      "Content-Type": "text/plain",
    },
    body: `search "${title}"; fields ${IGDB_FIELDS}; limit 1;`,
  });

  if (!res.ok) throw new Error(`IGDB search failed: ${res.status}`);

  const results: IGDBGame[] = await res.json();
  return results[0] || null;
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
