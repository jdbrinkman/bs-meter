// Offline tests for Steam parsing and review sampling. Review fixtures are synthetic but shaped like
// the live IUserReviewsService/GetAppReviews response (verified against the real endpoint 2026-10-28).
import { pickPlaytimeReviews, buildSteamReviewText } from "../src/lib/api/steam.ts";
import { parseAppDetails, summarizeAchievements } from "../src/lib/api/steam-store.ts";

let bad = 0;
const check = (name, ok, extra = "") => { if (!ok) bad++; console.log(`${ok ? "ok  " : "BAD "} ${name} ${extra}`); };
const long = "x".repeat(120);
const raw = [
  { voted_up: false, votes_up: 50, review: "grind " + long, author: { playtime_forever: 60 * 80, playtime_at_review: 60 * 70 } },
  { voted_up: false, votes_up: 90, review: "tiny playtime " + long, author: { playtime_forever: 60 * 2, playtime_at_review: 60 * 1 } },
  { voted_up: false, votes_up: 10, review: "short", author: { playtime_forever: 60 * 100 } },
  { voted_up: true, votes_up: 5, review: "great " + long, author: { playtime_forever: 60 * 30 } },
  { voted_up: true, votes_up: 99, review: "best " + long, author: { playtime_forever: 60 * 200, playtime_at_review: 60 * 150 } },
];
const neg = pickPlaytimeReviews(raw, false);
const pos = pickPlaytimeReviews(raw, true);
check("negative: drops short-playtime and too-short reviews", neg.length === 1 && neg[0].playtime_at_review === 80);
check("positive: sorted by helpfulness", pos.length === 2 && pos[0].review.startsWith("best"));
const text = buildSteamReviewText({
  allTime: { desc: "Very Positive", positive: 9000, negative: 1000, total: 10000 },
  recent: { positive: 40, negative: 60, total: 100, percentPositive: 40 },
  playtimeReviews: [...neg, ...pos],
});
check("text includes recent-vs-all-time and both review blocks", /last 30 days: 40% positive/.test(text) && /Negative reviews/.test(text) && /Positive reviews/.test(text));

const details = { "292030": { success: true, data: { name: "W3", is_free: false, price_overview: { final: 4999, initial: 4999, discount_percent: 0 }, categories: [{ description: "In-App Purchases" }], dlc: [1, 2] } } };
const f = parseAppDetails(292030, details);
check("appdetails: price in dollars, IAP flag, DLC count", f.priceFinal === 49.99 && f.hasInAppPurchases && f.dlcCount === 2);
check("appdetails: unknown app returns null", parseAppDetails(1, { "1": { success: false } }) === null);
const ach = summarizeAchievements({ achievementpercentages: { achievements: [{ percent: 60.3 }, { percent: "4.2" }, { percent: 1.8 }, { percent: 20 }] } });
check("achievements: total, extremes, rare share", ach.total === 4 && ach.mostCommonPercent === 60.3 && ach.rarestPercent === 1.8 && ach.rareShare === 0.5);
process.exit(bad ? 1 : 0);
