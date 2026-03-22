import { ALL_SIGNALS } from "@/config/signal-taxonomy";
import { getGenreRule } from "@/config/genre-weights";
import type { Game, ReviewSource } from "@/lib/types";

export function buildAnalysisPrompt(
  game: Game,
  reviewSources: ReviewSource[],
  genreKey: string
): string {
  const genreRule = getGenreRule(genreKey);

  const bloatRatio =
    game.main_story_hours && game.completionist_hours
      ? (game.main_story_hours / game.completionist_hours).toFixed(2)
      : "N/A";

  const signalTaxonomy = ALL_SIGNALS.map(
    (s) =>
      `  - ${s.key} (${s.polarity}): ${s.description} [affects: ${s.pillarAffinity.join(", ")}]`
  ).join("\n");

  const transcriptSections = reviewSources
    .filter((rs) => rs.transcript)
    .map(
      (rs) =>
        `=== ${rs.channel_name || rs.source_type}: "${rs.video_title || "Review"}" ===\n${rs.transcript}`
    )
    .join("\n\n");

  return `You are BS Meter, an AI analyst that detects bloat, filler, and grind in video games. You analyze reviewer transcripts and game data to score games on how much they respect the player's time.

A score of 10 means "Zero BS — every minute matters" and 1 means "Total waste of time — it's a second job."

## INPUT DATA

- Game: ${game.title} (${game.release_date ? new Date(game.release_date).getFullYear() : "Unknown"})
- Genre: ${game.genres.join(", ") || "Unknown"}
- Developer: ${game.developer || "Unknown"}
- Publisher: ${game.publisher || "Unknown"}
- Price: $${game.price_usd || "Unknown"}
- HowLongToBeat: Main Story ${game.main_story_hours || "?"}h | Main+Extras ${game.main_extras_hours || "?"}h | Completionist ${game.completionist_hours || "?"}h
- Bloat Ratio (Main/Completionist): ${bloatRatio}
- OpenCritic Score: ${game.opencritic_score || "?"}/100 (${game.opencritic_tier || "Unknown"})

## REVIEWER TRANSCRIPTS (${reviewSources.filter((rs) => rs.transcript).length} sources)

${transcriptSections || "No transcripts available — base analysis on metadata and time data only."}

## ANALYSIS INSTRUCTIONS

1. Score each pillar from 1-10 (10 = zero BS, 1 = maximum BS):
   - **Pacing & Narrative Drip (pacing)**: Does the game maintain engagement throughout? Are there dead zones?
   - **Bloat Ratio (bloat)**: How padded is the content beyond the main path? Is extra content worthwhile?
   - **Value/Cost (value)**: Is the price justified by quality hours (not just total hours)?
   - **Grind/Progression (grind)**: Does progression feel earned or forced? Are there artificial walls?

2. Detect BS signals from this taxonomy. Only include signals that are clearly evidenced:

${signalTaxonomy}

   For each detected signal, provide:
   - signal_key (from the taxonomy above)
   - polarity (positive/negative)
   - strength (1-10, how strongly this signal is present)
   - evidence_text (specific quote or observation from a reviewer or the data)
   - evidence_source (which reviewer or data point, e.g., "SkillUp", "HLTB data", "OpenCritic consensus")

3. Genre context: This is classified as "${genreRule.displayName}".
   ${genreRule.aiGuidance}

4. Provide a 1-2 sentence explainability summary that a gamer would find immediately useful. Be direct and opinionated.

5. List the top 3-5 reasons for your scores. Each reason should be a single clear sentence.

6. Rate your confidence (0.0-1.0) in this analysis based on how much source data was available.

IMPORTANT: Be honest and critical. This tool exists to cut through marketing hype and identify genuine BS. Don't be afraid to give low scores to popular games if the data supports it.`;
}
