import { YoutubeTranscript } from "youtube-transcript";
import type { YouTubeSearchResult } from "@/lib/types";
import type { TrustedReviewer } from "@/config/trusted-reviewers";

export async function searchYouTubeChannel(
  gameTitle: string,
  reviewer: TrustedReviewer
): Promise<YouTubeSearchResult | null> {
  const query = `"${gameTitle}" ${reviewer.searchSuffix}`;

  const res = await fetch(
    `https://www.googleapis.com/youtube/v3/search?` +
      new URLSearchParams({
        part: "snippet",
        q: query,
        channelId: reviewer.channelId,
        type: "video",
        maxResults: "1",
        order: "relevance",
        key: process.env.YOUTUBE_API_KEY!,
      }),
    {
      headers: {
        Referer: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
      },
    }
  );

  if (!res.ok) {
    console.warn(
      `YouTube search failed for ${reviewer.channelName}: ${res.status}`
    );
    return null;
  }

  const data = await res.json();
  const item = data.items?.[0];

  if (!item) return null;

  // Verify the video title is actually about this game
  const videoTitle = item.snippet.title.toLowerCase();
  const gameTitleLower = gameTitle.toLowerCase();

  // Check if the game title appears in the video title
  const hasGameTitle = videoTitle.includes(gameTitleLower);

  // For multi-word titles, also accept if most significant words appear
  const gameWords = gameTitleLower.split(/[\s:]+/).filter((w: string) => w.length > 2);
  const matchingWords = gameWords.filter((word: string) => videoTitle.includes(word));
  const matchRatio = gameWords.length > 0 ? matchingWords.length / gameWords.length : 0;

  // Reject if title contains obvious non-gaming indicators
  const nonGamingKeywords = ["nuc", "benchmark", "cpu", "gpu", "intel", "amd", "unboxing", "setup", "build"];
  const hasNonGaming = nonGamingKeywords.some((kw) => videoTitle.includes(kw));

  const hasRelevantTitle = (hasGameTitle || matchRatio >= 0.6) && !hasNonGaming;

  if (!hasRelevantTitle) {
    console.log(
      `Skipping irrelevant result from ${reviewer.channelName}: "${item.snippet.title}" (searched for "${gameTitle}")`
    );
    return null;
  }

  return {
    videoId: item.id.videoId,
    title: item.snippet.title,
    channelTitle: item.snippet.channelTitle,
    publishedAt: item.snippet.publishedAt,
  };
}

export async function fetchTranscript(videoId: string): Promise<string | null> {
  try {
    const transcript = await YoutubeTranscript.fetchTranscript(videoId);

    // Combine all transcript segments into one string
    const fullText = transcript.map((segment) => segment.text).join(" ");

    // Truncate to ~4000 words to fit within reasonable prompt size
    const words = fullText.split(/\s+/);
    if (words.length > 4000) {
      return words.slice(0, 4000).join(" ") + "... [truncated]";
    }

    return fullText;
  } catch (error) {
    console.warn(`Transcript fetch failed for ${videoId}:`, error);
    return null;
  }
}
