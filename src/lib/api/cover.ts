import { searchIGDB, formatCoverUrl } from "@/lib/api/igdb";

export async function urlLoads(url: string | null | undefined): Promise<boolean> {
  if (!url) return false;
  try {
    const res = await fetch(url, { method: "HEAD", redirect: "follow" });
    return res.ok && (res.headers.get("content-type") ?? "").startsWith("image/");
  } catch {
    return false;
  }
}

// Newer Steam releases serve art from hashed paths; the appdetails API always returns a valid one
async function steamHeaderImage(steamAppId: number): Promise<string | null> {
  try {
    const res = await fetch(
      `https://store.steampowered.com/api/appdetails?appids=${steamAppId}&filters=basic`
    );
    const json = await res.json();
    return json?.[steamAppId]?.data?.header_image ?? null;
  } catch {
    return null;
  }
}

/**
 * Returns the first cover URL that actually loads, in order of preference:
 * Steam portrait art, IGDB cover, Steam header image. Never returns an unchecked URL.
 */
export async function resolveCoverUrl(opts: {
  title: string;
  steamAppId?: number | null;
  igdbCoverUrl?: string | null;
}): Promise<string | null> {
  const { title, steamAppId } = opts;
  const candidates: (() => Promise<string | null>)[] = [];

  if (steamAppId) {
    const base = `https://cdn.akamai.steamstatic.com/steam/apps/${steamAppId}`;
    candidates.push(async () => `${base}/library_600x900_2x.jpg`);
    candidates.push(async () => `${base}/library_600x900.jpg`);
  }
  candidates.push(async () =>
    opts.igdbCoverUrl !== undefined
      ? opts.igdbCoverUrl
      : formatCoverUrl((await searchIGDB(title))?.cover?.url)
  );
  if (steamAppId) candidates.push(() => steamHeaderImage(steamAppId));

  for (const candidate of candidates) {
    const url = await candidate();
    if (url && (await urlLoads(url))) return url;
  }
  return null;
}
