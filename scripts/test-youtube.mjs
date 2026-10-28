// Usage: node --no-warnings scripts/test-youtube.mjs match     (offline title-matching tests, free)
//        node --no-warnings scripts/test-youtube.mjs live "Game A" "Game B"   (uses YouTube quota: ~100-400 units per game)
import { readFileSync } from "node:fs";
import { findReviewVideos, titleMatchesGame } from "../src/lib/api/youtube-lookup.ts";
import { TRUSTED_REVIEWERS } from "../src/config/trusted-reviewers.ts";
import { SEED_GAMES } from "../src/config/seed-games.ts";
import { YoutubeTranscript } from "../node_modules/youtube-transcript/dist/youtube-transcript.esm.js";

for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
}
const siblings = SEED_GAMES.map((g) => g.title);
const mode = process.argv[2];

if (mode === "match") {
  // [game, video title, should match]
  const cases = [
    ["Hades", "Hades Review - Buy, Wait for Sale, Rent, Never Touch?", true],
    ["Hades", "Hades II Review - Early Access Impressions", false],
    ["Hades II", "Hades 2 Review", true],
    ["Hades II", "Hades Review After 100%", false],
    ["Hollow Knight", "Hollow Knight Review", true],
    ["Hollow Knight", "Hollow Knight Silksong Review - Worth the Wait?", false],
    ["Hollow Knight: Silksong", "Hollow Knight: Silksong Review", true],
    ["Hollow Knight: Silksong", "Hollow Knight Review", false],
    ["The Witcher 3: Wild Hunt", "The Witcher 3 Review", true],
    ["The Witcher 3: Wild Hunt", "The Witcher 3: Wild Hunt - Review After 100%", true],
    ["The Witcher 3: Wild Hunt", "The Witcher 2 Review", false],
    ["Mass Effect 3", "Mass Effect 3 Review", true],
    ["Mass Effect 3", "Mass Effect Andromeda Review", false],
    ["Mass Effect: Andromeda", "Mass Effect: Andromeda Review", true],
    ["Mass Effect: Andromeda", "Mass Effect 3 Review", false],
    ["Resident Evil 4 Remake", "Resident Evil 4 Remake Review", true],
    ["Resident Evil 4 Remake", "Resident Evil 4 Review (2005)", false],
    ["Diablo IV", "Diablo 4 Review - Is it worth it?", true],
    ["Diablo IV", "Diablo 3 Review", false],
    ["Baldur's Gate 3", "Baldur&#39;s Gate 3 Review", true],
    ["God of War Ragnarök", "God of War Ragnarok Review", true],
    ["God of War Ragnarök", "God of War (2018) Review", false],
    ["The Last of Us Part II Remastered", "The Last of Us Part 2 Review", true],
    ["Elden Ring", "Elden Ring Review - Tier List Top 10 Bosses", false],
    ["Elden Ring", "Elden Ring Trailer Review", false],
  ];
  let bad = 0;
  for (const [game, title, want] of cases) {
    let got = titleMatchesGame(title, game, siblings);
    if (got) got = !/\b(trailer|tier list|top \d+)\b/i.test(title); // reject words are applied by the lookup, not this function
    const ok = got === want;
    if (!ok) bad++;
    console.log(`${ok ? "ok  " : "BAD "} ${game} <- "${title}" (wanted ${want}, got ${got})`);
  }
  console.log(bad ? `\n${bad} failing` : "\nall title-match cases pass");
  process.exit(bad ? 1 : 0);
}

if (mode === "live") {
  for (const game of process.argv.slice(3)) {
    const r = await findReviewVideos(game, { apiKey: process.env.YOUTUBE_API_KEY, reviewers: TRUSTED_REVIEWERS, siblingTitles: siblings });
    console.log(`\n=== ${game}: ${r.videos.length} videos, ${r.searchesUsed} searches ${r.notes.join("; ")}`);
    for (const v of r.videos) {
      let tr = "?";
      try { const t = await YoutubeTranscript.fetchTranscript(v.videoId); tr = `${t.map((s) => s.text).join(" ").split(/\s+/).length} words`; } catch (e) { tr = "TRANSCRIPT FAIL " + String(e).slice(0, 60); }
      console.log(`  ${v.channelName.padEnd(18)} ${v.publishedAt.slice(0, 10)} ${String(Math.round(v.durationSec / 60)).padStart(3)}min ${String(v.views).padStart(9)} views  [${v.method}]  ${tr}\n      ${v.title}`);
    }
  }
}
