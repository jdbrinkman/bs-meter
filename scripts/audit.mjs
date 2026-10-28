// Data health check. Run: npm run audit
// Exits non-zero if any check FAILS. WARN = needs a look, not blocking.
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { TRUSTED_REVIEWERS } from "../src/config/trusted-reviewers.ts";

// --- env ---
for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
}

const results = [];
const add = (level, check, detail) => results.push({ level, check, detail });
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// --- 1. Trusted channel IDs resolve to the channel we expect ---
async function checkChannels() {
  const ids = TRUSTED_REVIEWERS.map((r) => r.channelId).join(",");
  const url = `https://www.googleapis.com/youtube/v3/channels?part=snippet&maxResults=50&id=${ids}&key=${process.env.YOUTUBE_API_KEY}`;
  const res = await fetch(url, { headers: { Referer: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000" } });
  if (!res.ok) return add("FAIL", "channels", `YouTube API returned ${res.status}`);
  const found = new Map(((await res.json()).items || []).map((i) => [i.id, i.snippet.title]));
  for (const r of TRUSTED_REVIEWERS) {
    const title = found.get(r.channelId);
    if (!title) add("FAIL", "channels", `${r.channelName}: ID ${r.channelId} does not exist`);
    else if (norm(title) !== norm(r.expectedTitle)) add("FAIL", "channels", `${r.channelName}: ID resolves to "${title}", expected "${r.expectedTitle}"`);
  }
  if (!results.some((x) => x.check === "channels")) add("PASS", "channels", `${TRUSTED_REVIEWERS.length} trusted channel IDs resolve to the expected channels`);
}

// --- 2..5. Database checks ---
async function checkDatabase() {
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { data: games, error } = await db.from("games").select("id,slug,title,release_date,steam_app_id,igdb_id,analysis_status,main_story_hours,price_usd");
  if (error) return add("FAIL", "database", error.message);
  const { data: sources } = await db.from("review_sources").select("game_id,source_type,video_id,channel_name,transcript,url");
  const { data: scores } = await db.from("scores").select("game_id,ratings,scoring_version");
  const bySource = new Map();
  for (const s of sources || []) (bySource.get(s.game_id) || bySource.set(s.game_id, []).get(s.game_id)).push(s);
  const title = (id) => games.find((g) => g.id === id)?.title ?? id;

  // duplicates
  const seen = new Map();
  let dupes = 0;
  for (const s of sources || []) {
    const k = `${s.game_id}|${s.source_type}|${s.video_id}`;
    seen.set(k, (seen.get(k) || 0) + 1);
  }
  for (const n of seen.values()) if (n > 1) dupes += n - 1;
  add(dupes ? "FAIL" : "PASS", "duplicates", dupes ? `${dupes} duplicate review_sources rows` : "no duplicate review sources");

  // sources that do not belong to a trusted channel (e.g. the Karl Jobst rows)
  const trustedNames = new Set(TRUSTED_REVIEWERS.map((r) => r.channelName));
  const stray = (sources || []).filter((s) => s.source_type === "youtube" && !trustedNames.has(s.channel_name));
  add(stray.length ? "WARN" : "PASS", "unknown-channel", stray.length ? `${stray.length} YouTube rows from channels not in the trusted list` : "all YouTube rows come from trusted channels");

  // evidence coverage
  const noText = [], noYt = [];
  for (const g of games) {
    const rows = bySource.get(g.id) || [];
    const usable = rows.filter((r) => r.source_type === "youtube" && (r.transcript || "").length > 500);
    if (usable.length === 0) noYt.push(g.title);
    if (rows.some((r) => r.source_type === "youtube" && (r.transcript || "").length <= 500)) noText.push(g.title);
  }
  add(noYt.length ? "FAIL" : "PASS", "coverage", noYt.length ? `${noYt.length} games have no usable YouTube transcript: ${noYt.join(", ")}` : "every game has at least one transcript");
  add(noText.length ? "WARN" : "PASS", "empty-transcripts", noText.length ? `${noText.length} games have source rows with no transcript text` : "no empty transcript rows");

  // v2 completeness
  const v2 = new Map((scores || []).filter((s) => s.ratings).map((s) => [s.game_id, s]));
  const missing = games.filter((g) => g.analysis_status === "complete" && !v2.has(g.id)).map((g) => g.title);
  add(missing.length ? "FAIL" : "PASS", "v2-complete", missing.length ? `${missing.length} complete games have no v2 ratings: ${missing.join(", ")}` : "all complete games have v2 ratings");

  // critic layer identity: wrong OpenCritic entries show up as shared IDs or review dates far from release
  const { data: gamesOC } = await db.from("games").select("id,title,release_date,opencritic_id");
  const { data: critics } = await db.from("critic_reviews").select("game_id,published_at");
  const ocIds = new Map();
  for (const g of gamesOC) if (g.opencritic_id) ocIds.set(g.opencritic_id, [...(ocIds.get(g.opencritic_id) || []), g.title]);
  const shared = [...ocIds.values()].filter((t) => t.length > 1).map((t) => t.join(" + "));
  add(shared.length ? "FAIL" : "PASS", "critic-shared-id", shared.length ? `games sharing one OpenCritic entry: ${shared.join("; ")}` : "no two games share an OpenCritic entry");
  const earliest = new Map();
  for (const c of critics || []) if (c.published_at && (!earliest.has(c.game_id) || c.published_at < earliest.get(c.game_id))) earliest.set(c.game_id, c.published_at);
  const offDates = [];
  for (const g of gamesOC) {
    const e = earliest.get(g.id);
    if (e && g.release_date && new Date(e).getFullYear() < new Date(g.release_date).getFullYear() - 2) offDates.push(`${g.title} (release ${g.release_date.slice(0, 4)}, earliest critic ${e.slice(0, 4)})`);
  }
  add(offDates.length ? "FAIL" : "PASS", "critic-dates", offDates.length ? `critic reviews predate release by 3+ years (wrong OpenCritic entry?): ${offDates.join("; ")}` : "critic review dates line up with release dates");
  const noArticles = gamesOC.filter((g) => g.opencritic_id && !(sources || []).some((s) => s.game_id === g.id && s.source_type === "article")).map((g) => g.title);
  add(noArticles.length ? "WARN" : "PASS", "critic-articles", noArticles.length ? `${noArticles.length} games have no written critic article: ${noArticles.join(", ")}` : "every game with OpenCritic data has written reviews");

  // Steam facts and price freshness
  const { data: steamGames } = await db.from("games").select("title,price_usd,current_price_usd,steam_app_id,steam_facts");
  const noFacts = steamGames.filter((g) => g.steam_app_id && !g.steam_facts).map((g) => g.title);
  add(noFacts.length ? "WARN" : "PASS", "steam-facts", noFacts.length ? `${noFacts.length} Steam games have no store facts: ${noFacts.join(", ")}` : "every Steam game has store facts (price, IAP, DLC, achievements)");
  const noPrice = steamGames.filter((g) => g.current_price_usd == null).map((g) => g.title);
  add(noPrice.length ? "WARN" : "PASS", "current-price", noPrice.length ? `${noPrice.length} games have no current Steam price (verdict falls back to the hand-typed seed price): ${noPrice.join(", ")}` : "every game has a current price");
  const stale = steamGames.filter((g) => g.current_price_usd != null && g.price_usd != null && Math.abs(Number(g.current_price_usd) - Number(g.price_usd)) / Math.max(Number(g.price_usd), 1) > 0.2).map((g) => `${g.title} (seed $${g.price_usd}, now $${g.current_price_usd})`);
  add(stale.length ? "WARN" : "PASS", "seed-price-stale", stale.length ? `${stale.length} hand-typed seed prices are off by more than 20%: ${stale.join("; ")}` : "seed prices are within 20% of Steam");

  // missing core facts
  const noHours = games.filter((g) => !g.main_story_hours).map((g) => g.title);
  add(noHours.length ? "WARN" : "PASS", "time-to-beat", noHours.length ? `${noHours.length} games have no time-to-beat hours` : "all games have hours");
  const noIgdb = games.filter((g) => !g.igdb_id || !g.release_date).map((g) => g.title);
  add(noIgdb.length ? "WARN" : "PASS", "metadata", noIgdb.length ? `${noIgdb.length} games lack an IGDB ID or release date: ${noIgdb.join(", ")}` : "all games have IGDB ID and release date");

  // release year: our stored date vs Steam's store page (two independent sources)
  const mismatches = [];
  const possiblePorts = [];
  for (const g of games.filter((x) => x.steam_app_id && x.release_date)) {
    try {
      const res = await fetch(`https://store.steampowered.com/api/appdetails?appids=${g.steam_app_id}&filters=release_date&cc=us&l=english`);
      const d = (await res.json())?.[g.steam_app_id]?.data?.release_date;
      const steamYear = d?.date && new Date(d.date).getFullYear();
      const ours = new Date(g.release_date).getFullYear();
      // Ours later than Steam's PC release is impossible for the same game (wrong edition/bundle).
      // Steam later than ours can be a legitimate late PC port, so it is only a warning.
      if (steamYear && ours - steamYear > 1) mismatches.push(`${g.title} (ours ${ours}, Steam ${steamYear})`);
      else if (steamYear && steamYear - ours > 1) possiblePorts.push(`${g.title} (ours ${ours}, Steam ${steamYear})`);
    } catch { /* Steam unreachable for this game: skip */ }
    await sleep(350);
  }
  add(mismatches.length ? "FAIL" : "PASS", "release-date", mismatches.length ? `${mismatches.length} stored release years are later than the Steam release: ${mismatches.join("; ")}` : "no stored release year is later than its Steam release");
  add(possiblePorts.length ? "WARN" : "PASS", "release-date-port", possiblePorts.length ? `${possiblePorts.length} games have a Steam release later than ours (late PC port, or a wrong date; check): ${possiblePorts.join("; ")}` : "no unexplained Steam-later dates");
}

await checkChannels();
await checkDatabase();

const icon = { PASS: "PASS", WARN: "WARN", FAIL: "FAIL" };
for (const r of results) console.log(`${icon[r.level]}  [${r.check}] ${r.detail}`);
const fails = results.filter((r) => r.level === "FAIL").length;
console.log(`\n${results.filter((r) => r.level === "PASS").length} passed, ${results.filter((r) => r.level === "WARN").length} warnings, ${fails} failed`);
process.exit(fails ? 1 : 0);
