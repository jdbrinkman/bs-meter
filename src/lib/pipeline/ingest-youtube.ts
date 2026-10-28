import { createAdminClient } from "@/lib/supabase/admin";
import { fetchTranscriptRobust } from "@/lib/api/youtube";
import { findReviewVideos } from "@/lib/api/youtube-lookup";
import { TRUSTED_REVIEWERS } from "@/config/trusted-reviewers";
import { SEED_GAMES } from "@/config/seed-games";
import { logIngest } from "./ingest-log";

/** Finds trusted review videos for a game, fetches transcripts, and upserts them. Logs every step. */
export async function ingestYouTubeSources(gameId: string, title: string) {
  const supabase = createAdminClient();
  try {
    const lookup = await findReviewVideos(title, {
      apiKey: process.env.YOUTUBE_API_KEY!,
      referer: process.env.NEXT_PUBLIC_SITE_URL,
      reviewers: TRUSTED_REVIEWERS,
      siblingTitles: SEED_GAMES.map((g) => g.title),
    });
    await logIngest(supabase, gameId, "youtube:search", lookup.videos.length ? "ok" : "empty",
      `${lookup.videos.length} trusted review videos, ${lookup.searchesUsed} searches${lookup.notes.length ? "; " + lookup.notes.join("; ") : ""}`);

    let saved = 0;
    for (const video of lookup.videos) {
      const result = await fetchTranscriptRobust(video.videoId);
      await logIngest(supabase, gameId, `youtube:${video.channelName}`, result.status, `${video.title} — ${result.detail}`);
      if (result.status !== "ok") continue;

      const { error } = await supabase.from("review_sources").upsert(
        {
          game_id: gameId,
          source_type: "youtube",
          channel_name: video.channelName,
          video_id: video.videoId,
          video_title: video.title,
          transcript: result.text,
          url: `https://www.youtube.com/watch?v=${video.videoId}`,
          published_at: video.publishedAt,
          fetched_at: new Date().toISOString(),
        },
        { onConflict: "game_id,source_type,video_id" }
      );
      if (error) await logIngest(supabase, gameId, `youtube:${video.channelName}`, "failed", `could not save: ${error.message}`);
      else saved++;
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
    return { found: lookup.videos.length, saved, searches: lookup.searchesUsed };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.warn(`YouTube ingestion failed for ${title}:`, msg);
    await logIngest(supabase, gameId, "youtube:search", "failed", msg.slice(0, 300));
    return { found: 0, saved: 0, searches: 0, error: msg };
  }
}
