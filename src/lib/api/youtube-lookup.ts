// Finds review videos for a game on trusted channels.
// Pure module (no imports) so it can be exercised from scripts/test-youtube.mjs.
//
// Strategy (cheapest first; each search costs 100 YouTube quota units):
//   1. One broad "<game> review" search, keep only trusted channels.
//   2. Variant query if still short of the target.
//   3. Channel-restricted searches for channels not yet represented.
// Candidates are filtered by title match, review-type words, and length, then
// the best one per channel is kept.

export type Reviewer = {
  channelId: string;
  channelName: string;
  /** Technical-analysis channel (e.g. Digital Foundry): accepts tech reviews and face-offs, which are rarely titled "review". */
  tech?: boolean;
};

export type FoundVideo = {
  channelId: string;
  channelName: string;
  videoId: string;
  title: string;
  publishedAt: string;
  durationSec: number;
  views: number;
  method: string;
};

export type LookupOptions = {
  apiKey: string;
  referer?: string;
  reviewers: Reviewer[];
  /** Other catalog titles, used to reject videos about a sequel/prequel (e.g. "Hades" vs "Hades II"). */
  siblingTitles?: string[];
  targetCount?: number;
  maxSearches?: number;
};

export type LookupResult = { videos: FoundVideo[]; searchesUsed: number; notes: string[] };

const STOPWORDS = new Set(["the", "of", "a", "an", "and", "in", "to"]);
// Words that name an edition rather than a different game. Optional in video titles.
const EDITION_WORDS = new Set(["remastered", "remaster", "definitive", "edition", "enhanced", "complete", "goty", "director", "cut", "legendary", "hd"]);
const ROMAN: Record<string, string> = { ii: "2", iii: "3", iv: "4", v: "5", vi: "6", vii: "7", viii: "8", ix: "9", x: "10" };

const REVIEW_WORDS = /\b(review|verdict|worth|impressions?|after 100|tech review)\b/i;
const REJECT_WORDS =
  /\b(trailer|walkthrough|guide|tier list|top \d+|best|worst|ranking|ranked|benchmark|unboxing|reaction|livestream|podcast|news|patch notes|dlc|expansion|montage|speedrun|funny|moments|explained|ending|lore|preview|hands-on|first look|vs\.?|versus|comparison|mods?)\b/i;

function decode(s: string): string {
  return s
    .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">");
}

export function tokens(s: string): string[] {
  return decode(s)
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/['’`]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
    .map((t) => ROMAN[t] ?? t);
}

/** True if a video title is about this exact game (not a sequel, prequel, or unrelated game). */
export function titleMatchesGame(videoTitle: string, gameTitle: string, siblingTitles: string[] = []): boolean {
  const v = tokens(videoTitle);
  const vSet = new Set(v);
  const colon = gameTitle.indexOf(":");
  const core = tokens(colon > -1 ? gameTitle.slice(0, colon) : gameTitle).filter((t) => !STOPWORDS.has(t) && !EDITION_WORDS.has(t));
  const sub = colon > -1 ? tokens(gameTitle.slice(colon + 1)).filter((t) => !STOPWORDS.has(t) && !EDITION_WORDS.has(t)) : [];
  if (core.length === 0) return false;
  if (!core.every((t) => vSet.has(t))) return false;

  // A subtitle is required to tell games apart unless the core already has a number ("Witcher 3").
  const coreHasNumber = core.some((t) => /^\d+$/.test(t));
  if (sub.length && !coreHasNumber && !sub.some((t) => vSet.has(t))) return false;

  // Sequel guard: the token right after the title must not be a number the game doesn't have.
  const gameAll = new Set([...core, ...sub]);
  const idx = v.lastIndexOf(core[core.length - 1]);
  const next = v[idx + 1];
  if (next && /^\d+$/.test(next) && !gameAll.has(next)) return false;

  // Sibling guard: reject videos that name a longer catalog title containing this one (Hollow Knight vs Silksong).
  const own = tokens(gameTitle).join(" ");
  for (const sibling of siblingTitles) {
    const st = tokens(sibling).join(" ");
    if (st !== own && st.includes(core.join(" ")) && st.length > own.length) {
      const extra = tokens(sibling).filter((t) => !core.includes(t) && !STOPWORDS.has(t));
      if (extra.length && extra.every((t) => vSet.has(t))) return false;
    }
  }
  return true;
}

// Tech channels name videos "Tech Review", "PS5 vs Series X", "Performance Analysis"...
const TECH_WORDS = /\b(tech review|face-?off|performance|analysis|pc|ps5|ps4|xbox|series [xs]|switch 2?|steam deck|frame ?rate|60fps|vs\.?|versus|comparison)\b/i;
const REJECT_WORDS_TECH =
  /\b(trailer|walkthrough|guide|tier list|top \d+|best|worst|ranking|ranked|unboxing|reaction|livestream|podcast|news|patch notes|dlc|expansion|montage|speedrun|funny|moments|explained|ending|lore|preview|hands-on|first look|mods?|direct|weekly)\b/i;

function reviewScore(title: string): number {
  let s = 0;
  if (/\breview\b/i.test(title)) s += 3;
  if (/(after 100|worth)/i.test(title)) s += 1;
  // For tech channels, prefer the mainstream platforms over a handheld/port analysis
  if (/\b(pc|ps5)\b/i.test(title)) s += 1;
  if (/\bswitch\b/i.test(title)) s -= 1;
  return s;
}

function parseDuration(iso: string): number {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  return m ? (+m[1] || 0) * 3600 + (+m[2] || 0) * 60 + (+m[3] || 0) : 0;
}

async function yt(path: string, params: Record<string, string>, opts: LookupOptions) {
  const res = await fetch(`https://www.googleapis.com/youtube/v3/${path}?` + new URLSearchParams({ ...params, key: opts.apiKey }), {
    headers: { Referer: opts.referer || "http://localhost:3000" },
  });
  if (!res.ok) throw new Error(`YouTube ${path} failed: ${res.status} ${(await res.text()).slice(0, 160)}`);
  return res.json();
}

type Candidate = { channelId: string; videoId: string; title: string; publishedAt: string; method: string };

export async function findReviewVideos(gameTitle: string, opts: LookupOptions): Promise<LookupResult> {
  const target = opts.targetCount ?? 3;
  const maxSearches = opts.maxSearches ?? 4;
  const byChannel = new Map<string, FoundVideo>();
  const seenVideos = new Set<string>();
  const notes: string[] = [];
  let searches = 0;
  const trusted = new Map(opts.reviewers.map((r) => [r.channelId, r.channelName]));
  const techChannels = new Set(opts.reviewers.filter((r) => r.tech).map((r) => r.channelId));

  async function runSearch(q: string, method: string, channelId?: string) {
    if (searches >= maxSearches) return;
    searches++;
    const data = await yt(
      "search",
      { part: "snippet", q, type: "video", maxResults: channelId ? "10" : "50", order: "relevance", ...(channelId ? { channelId } : {}) },
      opts
    );
    const candidates: Candidate[] = [];
    for (const it of data.items || []) {
      const channelId = it.snippet.channelId;
      const title = decode(it.snippet.title);
      if (!trusted.has(channelId) || seenVideos.has(it.id.videoId)) continue;
      if (!titleMatchesGame(title, gameTitle, opts.siblingTitles)) continue;
      const tech = techChannels.has(channelId);
      if ((tech ? REJECT_WORDS_TECH : REJECT_WORDS).test(title)) continue;
      if (!REVIEW_WORDS.test(title) && !(tech && TECH_WORDS.test(title))) continue;
      candidates.push({ channelId, videoId: it.id.videoId, title, publishedAt: it.snippet.publishedAt, method });
    }
    if (!candidates.length) return;
    // 1 quota unit: drop shorts/trailers and use views to break ties
    const details = await yt("videos", { part: "contentDetails,statistics", id: candidates.map((c) => c.videoId).join(",") }, opts);
    const info = new Map<string, { dur: number; views: number }>(
      (details.items || []).map((d: { id: string; contentDetails: { duration: string }; statistics: { viewCount?: string } }) => [
        d.id,
        { dur: parseDuration(d.contentDetails.duration), views: Number(d.statistics.viewCount || 0) },
      ])
    );
    for (const c of candidates) {
      const i = info.get(c.videoId);
      if (!i || i.dur < 240) continue; // reviews are longer than 4 minutes
      seenVideos.add(c.videoId);
      const found: FoundVideo = {
        ...c,
        channelName: trusted.get(c.channelId)!,
        durationSec: i.dur,
        views: i.views,
      };
      const cur = byChannel.get(c.channelId);
      const better =
        !cur || reviewScore(found.title) > reviewScore(cur.title) || (reviewScore(found.title) === reviewScore(cur.title) && found.views > cur.views);
      if (better) byChannel.set(c.channelId, found);
    }
  }

  await runSearch(`${gameTitle} review`, "broad");
  // Tech channels (Digital Foundry) rarely surface for "<game> review"; look for them directly.
  for (const r of opts.reviewers.filter((x) => x.tech)) {
    if (!byChannel.has(r.channelId)) await runSearch(`${gameTitle} tech review`, `tech:${r.channelName}`, r.channelId);
  }
  if (byChannel.size < target) await runSearch(`${gameTitle} review after 100%`, "variant-100");
  if (byChannel.size < target) await runSearch(`is ${gameTitle} worth it`, "variant-worth");

  for (const r of opts.reviewers) {
    if (byChannel.size >= target || searches >= maxSearches) break;
    if (byChannel.has(r.channelId)) continue;
    await runSearch(`${gameTitle} review`, `channel:${r.channelName}`, r.channelId);
  }

  if (byChannel.size < target) notes.push(`only ${byChannel.size} trusted review video(s) found after ${searches} searches`);
  return { videos: [...byChannel.values()], searchesUsed: searches, notes };
}
