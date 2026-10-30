import { createAdminClient } from "@/lib/supabase/admin";
import {
  searchIGDB,
  searchIGDBBySlug,
  extractDeveloper,
  extractPublisher,
  formatCoverUrl,
  filterPlatforms,
} from "@/lib/api/igdb";
import { resolveCoverUrl } from "@/lib/api/cover";
import { SEED_GAMES, type SeedGame } from "@/config/seed-games";
import { logIngest } from "./ingest-log";

/**
 * Resolves the game in IGDB and updates metadata and cover art.
 * Uses the seed's exact IGDB slug when present; otherwise only accepts a confident title match.
 */
export async function refreshMetadata(gameId: string, title: string, seedGame?: SeedGame) {
  const supabase = createAdminClient();
  const seed = seedGame ?? SEED_GAMES.find((g) => g.title.toLowerCase() === title.toLowerCase());

  const igdbData = seed?.igdbSlug ? await searchIGDBBySlug(seed.igdbSlug) : await searchIGDB(title);

  if (!igdbData) {
    await logIngest(supabase, gameId, "igdb", "empty",
      seed?.igdbSlug ? `slug "${seed.igdbSlug}" not found in IGDB` : "no confident title match; set igdbSlug in seed-games.ts");
    // Fall back to Steam art so the game is not blank
    const coverUrl = await resolveCoverUrl({ title, steamAppId: seed?.steamAppId, igdbCoverUrl: null });
    if (coverUrl) await supabase.from("games").update({ cover_url: coverUrl }).eq("id", gameId);
    return null;
  }

  // Only keeps a cover URL that actually loads (Steam -> IGDB -> Steam header)
  const coverUrl = await resolveCoverUrl({
    title,
    steamAppId: seed?.steamAppId,
    igdbCoverUrl: formatCoverUrl(igdbData.cover?.url),
  });

  const { error } = await supabase
    .from("games")
    .update({
      igdb_id: igdbData.id,
      cover_url: coverUrl,
      summary: igdbData.summary || null,
      genres: igdbData.genres?.map((g) => g.name) || [],
      platforms: filterPlatforms(igdbData.platforms?.map((p) => p.name) || []),
      developer: extractDeveloper(igdbData),
      publisher: extractPublisher(igdbData),
      release_date: igdbData.first_release_date
        ? new Date(igdbData.first_release_date * 1000).toISOString().split("T")[0]
        : null,
    })
    .eq("id", gameId);

  if (error) {
    await logIngest(supabase, gameId, "igdb", "failed", `could not save: ${error.message}`);
    return null;
  }
  await logIngest(supabase, gameId, "igdb", "ok", `${igdbData.name} (${igdbData.slug}, ${igdbData.game_type?.type ?? "?"})`);
  return igdbData;
}
