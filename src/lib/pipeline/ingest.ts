import { createAdminClient } from "@/lib/supabase/admin";
import {
  searchIGDB,
  searchIGDBBySlug,
  extractDeveloper,
  extractPublisher,
  formatCoverUrl,
  filterPlatforms,
} from "@/lib/api/igdb";
import { resolveCoverUrl, urlLoads } from "@/lib/api/cover";
import { searchHLTB } from "@/lib/api/hltb";
import { searchOpenCritic, getOpenCriticGame } from "@/lib/api/opencritic";
import { ingestYouTubeSources } from "./ingest-youtube";
import { refreshMetadata } from "./ingest-metadata";
import { ingestCritics } from "./ingest-critics";
import { searchRedditSentiment } from "@/lib/api/reddit";
import { findSteamAppId, fetchSteamReviews } from "@/lib/api/steam";
import { SEED_GAMES } from "@/config/seed-games";

export async function ingestGameData(
  gameId: string,
  title: string
): Promise<{ redditSentiment: string | null }> {
  const supabase = createAdminClient();

  // Update status
  await supabase
    .from("games")
    .update({ analysis_status: "ingesting" })
    .eq("id", gameId);

  try {
    // Resolve seed config early — used across multiple steps below
    const seedGame = SEED_GAMES.find(
      (g) => g.title.toLowerCase() === title.toLowerCase()
    );

    // 1. IGDB metadata (exact slug when seeded; otherwise a verified title match)
    await refreshMetadata(gameId, title, seedGame);

    // 2. HLTB time data (try scraper, then fall back to seed data)
    const hltbData = await searchHLTB(title);
    if (hltbData) {
      await supabase
        .from("games")
        .update({
          hltb_id: parseInt(hltbData.id),
          main_story_hours: hltbData.gameplayMain || null,
          main_extras_hours: hltbData.gameplayMainExtra || null,
          completionist_hours: hltbData.gameplayCompletionist || null,
        })
        .eq("id", gameId);
    } else {
      // Fallback: use manual HLTB data from seed config
      if (seedGame?.hltb) {
        console.log(`Using seed HLTB data for ${title}`);
        await supabase
          .from("games")
          .update({
            main_story_hours: seedGame.hltb.mainStory,
            main_extras_hours: seedGame.hltb.mainExtras,
            completionist_hours: seedGame.hltb.completionist,
          })
          .eq("id", gameId);
      } else {
        console.warn(`No HLTB data available for ${title}`);
      }
    }

    // 3. OpenCritic
    try {
      let ocData = null;
      if (seedGame && "opencriticId" in seedGame) {
        // Seed knows the answer (an exact ID, or null when OpenCritic has no entry for this game)
        ocData = seedGame.opencriticId ? await getOpenCriticGame(seedGame.opencriticId) : null;
      } else {
        const { data: row } = await supabase.from("games").select("release_date").eq("id", gameId).single();
        ocData = await searchOpenCritic(title, row?.release_date ? new Date(row.release_date).getFullYear() : null);
      }
      if (ocData) {
        await supabase
          .from("games")
          .update({
            opencritic_id: ocData.id,
            opencritic_score: ocData.topCriticScore,
            opencritic_tier: ocData.tier,
          })
          .eq("id", gameId);
        await ingestCritics(gameId, ocData.id);
      }
    } catch (error) {
      console.warn(`OpenCritic fetch failed for ${title}:`, error);
    }

    // 4. YouTube transcripts from trusted reviewers
    await ingestYouTubeSources(gameId, title);

    // 5. Reddit sentiment via Perplexity (optional — graceful failure)
    const redditSentiment = await searchRedditSentiment(title);
    if (redditSentiment) {
      console.log(`Reddit sentiment fetched for ${title}`);
    }

    // 6. Steam user reviews (optional — graceful failure)
    try {
      const { data: gameRecord } = await supabase
        .from("games")
        .select("steam_app_id")
        .eq("id", gameId)
        .single();

      const steamAppId: number | null =
        gameRecord?.steam_app_id ??
        seedGame?.steamAppId ??
        (await findSteamAppId(title));

      if (steamAppId) {
        if (!gameRecord?.steam_app_id) {
          await supabase
            .from("games")
            .update({ steam_app_id: steamAppId })
            .eq("id", gameId);
        }

        const steamData = await fetchSteamReviews(steamAppId);
        if (steamData) {
          await supabase
            .from("games")
            .update({
              steam_review_score_desc: steamData.summary.review_score_desc,
              steam_total_reviews: steamData.summary.total_reviews,
            })
            .eq("id", gameId);

          const { error: steamSrcError } = await supabase.from("review_sources").upsert(
            {
              game_id: gameId,
              source_type: "steam",
              channel_name: "Steam Users",
              video_id: String(steamAppId),
              video_title: `Steam Reviews (${steamData.summary.review_score_desc})`,
              transcript: steamData.reviewText,
              url: `https://store.steampowered.com/app/${steamAppId}`,
              fetched_at: new Date().toISOString(),
            },
            { onConflict: "game_id,source_type,video_id" }
          );
          if (steamSrcError) throw new Error(`Could not save Steam source: ${steamSrcError.message}`);

          console.log(
            `Steam reviews fetched for ${title}: ${steamData.summary.review_score_desc} (${steamData.summary.total_reviews.toLocaleString()} reviews)`
          );
        }
      }
    } catch (error) {
      console.warn(`Steam ingestion failed for ${title}:`, error);
    }

    console.log(`Ingestion complete for: ${title}`);
    // Final check: a game must never finish ingest with a broken or missing cover
    const { data: finalGame } = await supabase
      .from("games")
      .select("cover_url")
      .eq("id", gameId)
      .single();
    if (!(await urlLoads(finalGame?.cover_url))) {
      console.warn(`[ingest] No working cover art for "${title}" — needs manual cover_url`);
    }

    return { redditSentiment };
  } catch (error) {
    const errorMsg =
      error instanceof Error ? error.message : String(error);
    await supabase
      .from("games")
      .update({ analysis_status: "error", error_log: errorMsg })
      .eq("id", gameId);
    throw error;
  }
}
