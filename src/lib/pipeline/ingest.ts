import { createAdminClient } from "@/lib/supabase/admin";
import {
  searchIGDB,
  extractDeveloper,
  extractPublisher,
  formatCoverUrl,
} from "@/lib/api/igdb";
import { searchHLTB } from "@/lib/api/hltb";
import { searchOpenCritic } from "@/lib/api/opencritic";
import { searchYouTubeChannel, fetchTranscript } from "@/lib/api/youtube";
import { searchRedditSentiment } from "@/lib/api/reddit";
import { TRUSTED_REVIEWERS } from "@/config/trusted-reviewers";
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
    // 1. IGDB metadata
    const igdbData = await searchIGDB(title);
    if (igdbData) {
      await supabase
        .from("games")
        .update({
          igdb_id: igdbData.id,
          cover_url: formatCoverUrl(igdbData.cover?.url),
          summary: igdbData.summary || null,
          genres: igdbData.genres?.map((g) => g.name) || [],
          platforms: igdbData.platforms?.map((p) => p.name) || [],
          developer: extractDeveloper(igdbData),
          publisher: extractPublisher(igdbData),
          release_date: igdbData.first_release_date
            ? new Date(igdbData.first_release_date * 1000)
                .toISOString()
                .split("T")[0]
            : null,
        })
        .eq("id", gameId);
    }

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
      const seedGame = SEED_GAMES.find(
        (g) => g.title.toLowerCase() === title.toLowerCase()
      );
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
      const ocData = await searchOpenCritic(title);
      if (ocData) {
        await supabase
          .from("games")
          .update({
            opencritic_id: ocData.id,
            opencritic_score: ocData.topCriticScore,
            opencritic_tier: ocData.tier,
          })
          .eq("id", gameId);
      }
    } catch (error) {
      console.warn(`OpenCritic fetch failed for ${title}:`, error);
    }

    // 4. YouTube transcripts from trusted reviewers
    for (const reviewer of TRUSTED_REVIEWERS) {
      try {
        const searchResult = await searchYouTubeChannel(title, reviewer);
        if (!searchResult) continue;

        const transcript = await fetchTranscript(searchResult.videoId);

        await supabase.from("review_sources").insert({
          game_id: gameId,
          source_type: "youtube",
          channel_name: reviewer.channelName,
          video_id: searchResult.videoId,
          video_title: searchResult.title,
          transcript: transcript,
          url: `https://www.youtube.com/watch?v=${searchResult.videoId}`,
        });

        // Small delay to respect YouTube API rate limits
        await new Promise((resolve) => setTimeout(resolve, 200));
      } catch (error) {
        console.warn(
          `Failed to fetch review from ${reviewer.channelName}:`,
          error
        );
      }
    }

    // 5. Reddit sentiment via Perplexity (optional — graceful failure)
    const redditSentiment = await searchRedditSentiment(title);
    if (redditSentiment) {
      console.log(`Reddit sentiment fetched for ${title}`);
    }

    console.log(`Ingestion complete for: ${title}`);
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
