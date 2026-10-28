import { YoutubeTranscript } from "youtube-transcript";

export type TranscriptResult = {
  text: string | null;
  status: "ok" | "empty" | "failed";
  detail: string;
  words: number;
};

const MAX_WORDS = 9000; // keep the start and the end; reviewers state their verdict at the end
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function trimToLimit(text: string): string {
  const words = text.split(/\s+/);
  if (words.length <= MAX_WORDS) return text;
  const head = words.slice(0, 5000).join(" ");
  const tail = words.slice(-4000).join(" ");
  return `${head} [... middle of video omitted ...] ${tail}`;
}

/**
 * Fetches captions with retries and says exactly what happened.
 * Never silent: the caller logs `status` and `detail` to ingest_log.
 */
export async function fetchTranscriptRobust(videoId: string): Promise<TranscriptResult> {
  let lastError = "";
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const segments = await YoutubeTranscript.fetchTranscript(videoId);
      const full = segments.map((s) => s.text).join(" ").replace(/\s+/g, " ").trim();
      const words = full ? full.split(/\s+/).length : 0;
      if (words < 150) return { text: null, status: "empty", detail: `captions too short (${words} words)`, words };
      return { text: trimToLimit(full), status: "ok", detail: `${words} words${words > MAX_WORDS ? " (trimmed)" : ""}`, words };
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      // Captions turned off or video gone: retrying will not help
      if (/disabled|no longer available|not available/i.test(lastError)) {
        return { text: null, status: "empty", detail: lastError.replace(/\[YoutubeTranscript\]\s*/, "").slice(0, 160), words: 0 };
      }
      if (attempt < 3) await sleep(1500 * attempt * attempt);
    }
  }
  return { text: null, status: "failed", detail: `3 attempts failed: ${lastError.slice(0, 160)}`, words: 0 };
}
