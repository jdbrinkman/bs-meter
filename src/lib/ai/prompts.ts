import { ALL_SIGNALS } from "@/config/signal-taxonomy";
import { getGenreRule } from "@/config/genre-weights";
import type { Game, ReviewSource } from "@/lib/types";

export function buildAnalysisPrompt(
  game: Game,
  reviewSources: ReviewSource[],
  genreKey: string,
  redditSentiment?: string | null
): string {
  const genreRule = getGenreRule(genreKey);

  const bloatRatio =
    game.main_story_hours && game.completionist_hours
      ? (game.main_story_hours / game.completionist_hours).toFixed(2)
      : "N/A";

  const signalTaxonomy = ALL_SIGNALS.map(
    (s) =>
      `  - ${s.key} (${s.polarity}): ${s.description}`
  ).join("\n");

  const transcriptSections = reviewSources
    .filter((rs) => rs.transcript)
    .map(
      (rs) =>
        `=== ${rs.channel_name || rs.source_type}: "${rs.video_title || "Review"}" ===\n${rs.transcript}`
    )
    .join("\n\n");

  const redditSection = redditSentiment
    ? `\n## REDDIT USER SENTIMENT\n${redditSentiment}\n`
    : "";

  return `You are a game quality analyst. Your job is to score games across 9 dimensions that capture both enjoyment quality and player-time respect. You analyze reviewer transcripts, community sentiment, and game metadata to produce accurate, honest scores.

## INPUT DATA

- Game: ${game.title} (${game.release_date ? new Date(game.release_date).getFullYear() : "Unknown"})
- Genre Profile: ${genreRule.displayName}
- Developer: ${game.developer || "Unknown"}
- Publisher: ${game.publisher || "Unknown"}
- Price: $${game.price_usd || "Unknown"}
- HowLongToBeat: Main Story ${game.main_story_hours || "?"}h | Main+Extras ${game.main_extras_hours || "?"}h | Completionist ${game.completionist_hours || "?"}h
- Bloat Ratio (Main/Completionist): ${bloatRatio}
- OpenCritic Score: ${game.opencritic_score || "?"}/100 (${game.opencritic_tier || "Unknown"})

## REVIEWER TRANSCRIPTS (${reviewSources.filter((rs) => rs.transcript).length} sources)

${transcriptSections || "No transcripts available — base analysis on metadata and OpenCritic data only."}
${redditSection}
## SCORING INSTRUCTIONS

Score each of the 9 dimensions from 1.0 to 10.0 (10 = perfect, 1 = catastrophic):

### The 9 Dimensions

1. **story_quality** — How good is the writing, narrative structure, and overall story execution? Is the plot coherent and emotionally resonant?

2. **narrative_investment** — How much do you care about the characters and their arcs? Do you feel emotionally connected to the journey?
   ⚠️ ATMOSPHERIC STORYTELLING RULE: Cryptic environmental or world-based storytelling (Bloodborne, Returnal, Dark Souls, Control) counts as FULL narrative investment. Score this dimension based on atmospheric impact, not dialogue density.

3. **pacing** — Does the game move with purpose? Is every hour earning its keep?
   ⚠️ PACING RULE: Penalize hollow filler and repetitive bloat (AC Valhalla, map-marker saturation). Do NOT penalize deliberate slowness when it serves narrative purpose (RDR2, TLOU quiet moments). Ask: does this slow moment feel authored and meaningful, or does it feel like padding?

4. **combat_repetition** — Does combat stay fresh throughout, or does it become repetitive and grinding? Does the encounter design evolve?

5. **boss_difficulty** — How is the quality and design of boss encounters? Are they fair, memorable, and appropriately challenging?

6. **exploration** — How rewarding is exploration and world discovery? Does the world feel worth exploring?

7. **polish_bugs** — How polished, bug-free, and technically stable is the game? Include performance issues, crashes, and UI jank.

8. **ui_controls** — How intuitive are the controls and interface? Does the game get out of its own way?

9. **atmospheric_depth** — How immersive, cohesive, and tonally consistent is the world — even without explicit dialogue? This captures world-building, environmental storytelling, and the feeling of being "in" the game.

### Genre-Specific Guidance
This game is classified as "${genreRule.displayName}".
${genreRule.aiGuidance}

### Important Scoring Rules
- Score dimensions relevant to this genre based on all available evidence
- If a dimension is nearly irrelevant to this genre (e.g., boss_difficulty for puzzle games), score it 5 as neutral — don't leave it at 1 or 10
- Be honest and critical. Don't round up to protect popular games
- Use Reddit user sentiment to catch bugs, technical failures, or community frustrations that critic reviews missed
- If review data is sparse, state lower confidence and widen your estimates

## SIGNAL DETECTION

Detect BS signals present in the game. Only include signals clearly evidenced by the data:

${signalTaxonomy}

For each detected signal, provide:
- signal_key (from the taxonomy above)
- polarity (positive/negative)
- strength (1-10, how strongly this signal is present)
- evidence_text (specific quote or observation — be concrete)
- evidence_source (which reviewer or data source, e.g., "SkillUp", "Reddit", "HLTB data")

## OUTPUT FORMAT

Provide a 1-2 sentence summary that a gamer would find immediately useful — direct and opinionated.
List the top 3-5 reasons for your scores, each as a single clear sentence.
Rate your confidence (0.0-1.0) based on how much quality source data was available.

IMPORTANT: Be honest. This exists to cut through marketing hype. Don't be afraid to give low scores to popular games if the evidence supports it.`;
}
