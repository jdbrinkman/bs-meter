import { createAdminClient } from "@/lib/supabase/admin";
import { urlLoads } from "@/lib/api/cover";
import { searchOpenCritic, getOpenCriticGame } from "@/lib/api/opencritic";
import { ingestYouTubeSources } from "./ingest-youtube";
import { refreshMetadata } from "./ingest-metadata";
import { ingestCritics } from "./ingest-critics";
import { ingestSteam } from "./ingest-steam";
import { ingestTimeToBeat } from "./ingest-time";
import { searchRedditSentiment } from "@/lib/api/reddit";
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

    // 2. Time to beat: hand-entered hours from the seed list win; IGDB community data fills the gaps
    if (seedGame?.hltb) {
      await supabase
        .from("games")
        .update({
          main_story_hours: seedGame.hltb.mainStory,
          main_extras_hours: seedGame.hltb.mainExtras,
          completionist_hours: seedGame.hltb.completionist,
          hours_source: "seed",
        })
        .eq("id", gameId);
    }
    await ingestTimeToBeat(gameId);

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

    // 6. Steam store facts + review sample
    await ingestSteam(gameId, title);

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
