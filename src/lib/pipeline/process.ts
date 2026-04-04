import { createAdminClient } from "@/lib/supabase/admin";
import { analyzeGame } from "@/lib/ai/analyze-game";
import { computeScore } from "@/lib/scoring/formula";
import { mapIGDBGenreToKey } from "@/config/genre-weights";
import { ingestGameData } from "./ingest";
import type { Game, ReviewSource } from "@/lib/types";

/**
 * Re-score a game using existing review_sources in the DB.
 * Does NOT re-fetch any external data — safe to call after prompt/formula changes.
 */
export async function scoreGame(
  gameId: string,
  redditSentiment: string | null = null
): Promise<void> {
  const supabase = createAdminClient();

  const { data: game, error: gameError } = await supabase
    .from("games")
    .select("*")
    .eq("id", gameId)
    .single();

  if (gameError || !game) throw new Error(`Game not found: ${gameId}`);

  try {
    await supabase
      .from("games")
      .update({ analysis_status: "analyzing" })
      .eq("id", gameId);

    const { data: reviewSources } = await supabase
      .from("review_sources")
      .select("*")
      .eq("game_id", gameId);

    const typedGame = game as Game;
    const genreKey = mapIGDBGenreToKey(
      typedGame.genres || [],
      typedGame.developer,
      typedGame.title
    );

    const analysis = await analyzeGame(
      typedGame,
      (reviewSources || []) as ReviewSource[],
      genreKey,
      redditSentiment
    );

    const { enjoyment_score, bs_score, verdict, weights } = computeScore(
      analysis.dimension_scores,
      genreKey
    );

    // Wipe old scores/signals before inserting fresh ones
    await supabase.from("scores").delete().eq("game_id", gameId);
    await supabase.from("signals").delete().eq("game_id", gameId);

    await supabase.from("scores").insert({
      game_id: gameId,
      enjoyment_score,
      bs_score,
      verdict,
      story_quality_score: analysis.dimension_scores.story_quality,
      narrative_investment_score: analysis.dimension_scores.narrative_investment,
      pacing_score: analysis.dimension_scores.pacing,
      combat_repetition_score: analysis.dimension_scores.combat_repetition,
      boss_difficulty_score: analysis.dimension_scores.boss_difficulty,
      exploration_score: analysis.dimension_scores.exploration,
      polish_bugs_score: analysis.dimension_scores.polish_bugs,
      ui_controls_score: analysis.dimension_scores.ui_controls,
      atmospheric_depth_score: analysis.dimension_scores.atmospheric_depth,
      genre_rule_applied: genreKey,
      weight_adjustments: weights,
      summary: analysis.summary,
      top_reasons: analysis.top_reasons,
      model_version: "gemini-2.5-flash",
      raw_ai_response: analysis as unknown as Record<string, unknown>,
      confidence: analysis.confidence,
    });

    if (analysis.signals.length > 0) {
      await supabase.from("signals").insert(
        analysis.signals.map((s) => ({
          game_id: gameId,
          signal_key: s.signal_key,
          polarity: s.polarity,
          strength: s.strength,
          evidence_text: s.evidence_text,
          evidence_source: s.evidence_source,
        }))
      );
    }

    await supabase
      .from("games")
      .update({
        analysis_status: "complete",
        analyzed_at: new Date().toISOString(),
      })
      .eq("id", gameId);

    console.log(
      `Scoring complete for ${game.title}: ${enjoyment_score}/100 enjoyment, ${bs_score}/10 BS (${verdict})`
    );
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    await supabase
      .from("games")
      .update({ analysis_status: "error", error_log: errorMsg })
      .eq("id", gameId);
    throw error;
  }
}

/**
 * Full pipeline: ingest raw data (if not yet done), then score.
 */
export async function processGame(gameId: string): Promise<void> {
  const supabase = createAdminClient();

  const { data: game, error: gameError } = await supabase
    .from("games")
    .select("*")
    .eq("id", gameId)
    .single();

  if (gameError || !game) throw new Error(`Game not found: ${gameId}`);

  let redditSentiment: string | null = null;

  if (game.analysis_status === "pending") {
    const ingestResult = await ingestGameData(gameId, game.title);
    redditSentiment = ingestResult.redditSentiment;
  }

  await scoreGame(gameId, redditSentiment);
}

export async function seedAndProcessGames(
  games: { title: string; slug: string; priceUsd: number; genres: string[]; steamAppId?: number }[]
): Promise<{ success: string[]; failed: string[] }> {
  const supabase = createAdminClient();
  const success: string[] = [];
  const failed: string[] = [];

  for (const seedGame of games) {
    try {
      // Check if game already exists
      const { data: existing } = await supabase
        .from("games")
        .select("id, analysis_status")
        .eq("slug", seedGame.slug)
        .single();

      let gameId: string;

      if (existing) {
        if (existing.analysis_status === "complete") {
          console.log(`Skipping ${seedGame.title} — already analyzed`);
          success.push(seedGame.title);
          continue;
        }
        gameId = existing.id;
      } else {
        // Create the game record
        const { data: created, error } = await supabase
          .from("games")
          .insert({
            slug: seedGame.slug,
            title: seedGame.title,
            price_usd: seedGame.priceUsd,
            genres: seedGame.genres,
            steam_app_id: seedGame.steamAppId ?? null,
          })
          .select("id")
          .single();

        if (error || !created) {
          throw new Error(`Failed to create game: ${error?.message}`);
        }
        gameId = created.id;
      }

      // Process the game
      await processGame(gameId);
      success.push(seedGame.title);

      // Delay between games to respect rate limits
      await new Promise((resolve) => setTimeout(resolve, 2000));
    } catch (error) {
      console.error(`Failed to process ${seedGame.title}:`, error);
      failed.push(seedGame.title);
    }
  }

  return { success, failed };
}
