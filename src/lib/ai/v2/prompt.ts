import { getGenreRule } from "@/config/genre-weights";
import { JUICE, SQUEEZE, type MeasureDef } from "@/lib/scoring/v2";
import type { Game, ReviewSource } from "@/lib/types";

export type CriticSnippet = { outlet: string; snippet: string | null };

const fmt = (m: MeasureDef) => `- ${m.key} — ${m.label}: ${m.summary}\n  Rubric: ${m.rubric}`;

function steamFactsLine(game: Game): string {
  const f = game.steam_facts as {
    hasInAppPurchases?: boolean; dlcCount?: number; isFree?: boolean;
    achievements?: { total: number; mostCommonPercent: number | null; rarestPercent: number | null; rareShare: number | null } | null;
    reviews?: { recent?: { percentPositive: number | null; total: number } | null; allTime?: { positive: number; negative: number } };
  } | null;
  if (!f) return "";
  const bits: string[] = [];
  if (f.isFree) bits.push("free to play");
  bits.push(f.hasInAppPurchases ? "Steam lists in-app purchases" : "no in-app purchases listed on Steam");
  if (f.dlcCount) bits.push(`${f.dlcCount} DLC/expansions`);
  if (f.achievements) {
    const a = f.achievements;
    bits.push(`${a.total} achievements, the most common earned by ${a.mostCommonPercent}% of players and the rarest by ${a.rarestPercent}%${a.rareShare != null ? `, ${Math.round(a.rareShare * 100)}% earned by under 5% of players` : ""}`);
  }
  const all = f.reviews?.allTime;
  const recent = f.reviews?.recent;
  if (all && recent?.percentPositive != null && all.positive + all.negative > 0) {
    bits.push(`Steam reviews: ${Math.round((all.positive / (all.positive + all.negative)) * 100)}% positive all-time, ${recent.percentPositive}% in the last 30 days`);
  }
  return bits.length ? `- Steam facts: ${bits.join("; ")}\n` : "";
}

export function buildPromptV2(
  game: Game,
  reviewSources: ReviewSource[],
  genreKey: string,
  redditSentiment?: string | null,
  criticSnippets: CriticSnippet[] = []
): string {
  const genre = getGenreRule(genreKey);
  const yt = reviewSources.filter((r) => r.source_type === "youtube" && r.transcript);
  const steam = reviewSources.filter((r) => r.source_type === "steam" && r.transcript);

  const articles = reviewSources.filter((r) => r.source_type === "article" && r.transcript);
  const articleText = articles
    .map((r) => `=== ${r.channel_name || "Critic"} (written review) ===\n${r.transcript}`)
    .join("\n\n");
  const snippetLines = criticSnippets
    .filter((c) => c.snippet)
    .slice(0, 25)
    .map((c) => `- ${c.outlet}: "${c.snippet}"`)
    .join("\n");

  const transcripts = yt
    .map((r) => `=== ${r.channel_name || "Reviewer"}: "${r.video_title || "Review"}" ===\n${r.transcript}`)
    .join("\n\n");

  return `You rate video games for a site that helps busy, budget-conscious players decide whether a game is worth their time and money. You rate the game on 12 fixed measures: 6 "juice" (what's good) and 6 "squeeze" (BS that wastes time or money). You do NOT produce an overall score or recommendation; code does that.

## GAME
- ${game.title} (${game.release_date ? new Date(game.release_date).getFullYear() : "Unknown"})
- Genre profile: ${genre.displayName}
- Price today: $${game.current_price_usd ?? game.price_usd ?? "Unknown"}${game.current_price_usd != null && game.price_usd != null && game.current_price_usd < game.price_usd ? ` (list price $${game.price_usd})` : ""}
- Time to beat (community data): Main ${game.main_story_hours ?? "?"}h | Main+Extras ${game.main_extras_hours ?? "?"}h | Completionist ${game.completionist_hours ?? "?"}h
${steamFactsLine(game)}- Genre notes: ${genre.aiGuidance}

## REVIEWER TRANSCRIPTS (${yt.length})
${transcripts || "None available. Base ratings on the other data and mark basis as inferred."}
${articles.length ? `\n## WRITTEN CRITIC REVIEWS (${articles.length})\n${articleText}\n` : ""}${snippetLines ? `\n## OTHER CRITIC EXCERPTS\n${snippetLines}\n` : ""}${steam.length ? `\n## STEAM USER REVIEWS\n${steam.map((r) => r.transcript).join("\n\n")}\n` : ""}${redditSentiment ? `\n## REDDIT SENTIMENT\n${redditSentiment}\n` : ""}
## THE 12 MEASURES (rate each 0-5, whole numbers)

### Juice (5 = excellent)
${JUICE.map(fmt).join("\n")}

### Squeeze (0 = none, 5 = severe; never mark these not applicable)
${SQUEEZE.map(fmt).join("\n")}

## RULES
- Each measure is separate. Do not count the same issue in two measures. Bugs belong only in "broken"; filler quantity only in "padding"; reused enemies only in "repetition".
- Rate the game as it is TODAY. If launch was rough but it has since been fixed, set rough_launch to true and keep "broken" low.
- Use the full 0-5 range. Do not cluster at 3. Judge against all games in the genre profile, not against perfection.
- If a juice measure truly does not exist in this kind of game, set applicable=false, rating=0, reason="Not applicable to this genre." Squeeze measures are always applicable.
- Every measure needs a "reason": one concrete sentence, 18 words max, naming the specific thing (e.g. "Skellige's hundreds of question-mark markers mostly hide junk loot."). No generic praise.
- "source": the reviewer, Steam, Reddit, or HLTB data that supports it. If you are relying on general knowledge, say "general knowledge".
- "basis": "direct" if the supplied sources explicitly discuss it, "inferred" if you are extrapolating or no source covers it.
- headline: one direct, opinionated sentence, 18 words max, saying what a player should know about this game.
- confidence: 0.0-1.0 based on how much quality source material was provided.`;
}
