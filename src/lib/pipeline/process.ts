import { createAdminClient } from "@/lib/supabase/admin";
import { analyzeGame } from "@/lib/ai/analyze-game";
import { computeScore } from "@/lib/scoring/formula";
import { mapIGDBGenreToKey } from "@/config/genre-weights";
import { ingestGameData } from "./ingest";
import type { Game, ReviewSource } from "@/lib/types";

export async function processGame(gameId: string): Promise<void> {
  const supabase = createAdminClient();

  // Fetch the game
  const { data: game, error: gameError } = await supabase
    .from("games")
    .select("*")
    .eq("id", gameId)
    .single();

  if (gameError || !game) {
    throw new Error(`Game not found: ${gameId}`);
  }

  try {
    // Step 1: Ingest data if not already done
    let redditSentiment: string | null = null;
    if (game.analysis_status === "pending") {
      const ingestResult = await ingestGameData(gameId, game.title);
      redditSentiment = ingestResult.redditSentiment;

      // Refresh game data after ingestion
      const { data: refreshed } = await supabase
        .from("games")
        .select("*")
        .eq("id", gameId)
        .single();

      if (!refreshed) throw new Error("Failed to refresh game data");
      Object.assign(game, refreshed);
    }

    // Step 2: Update status to analyzing
    await supabase
      .from("games")
      .update({ analysis_status: "analyzing" })
      .eq("id", gameId);

    // Step 3: Fetch review sources
    const { data: reviewSources } = await supabase
      .from("review_sources")
      .select("*")
      .eq("game_id", gameId);

    // Step 4: Determine genre key from IGDB genres + developer/title hints
    const typedGame = game as Game;
    const genreKey = mapIGDBGenreToKey(
      typedGame.genres || [],
      typedGame.developer,
      typedGame.title
    );

    // Step 5: Run AI analysis
    const analysis = await analyzeGame(
      typedGame,
      (reviewSources || []) as ReviewSource[],
      genreKey,
      redditSentiment
    );

    // Step 6: Compute dual scores with genre-adjusted weights
    const { enjoyment_score, bs_score, verdict, weights } = computeScore(
      analysis.dimension_scores,
      genreKey
    );

    // Step 7: Delete any existing scores/signals (re-analysis)
    await supabase.from("scores").delete().eq("game_id", gameId);
    await supabase.from("signals").delete().eq("game_id", gameId);

    // Step 8: Store the score
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

    // Step 9: Store detected signals
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

    // Step 10: Mark as complete
    await supabase
      .from("games")
      .update({
        analysis_status: "complete",
        analyzed_at: new Date().toISOString(),
      })
      .eq("id", gameId);

    console.log(
      `Analysis complete for ${game.title}: ${enjoyment_score}/100 enjoyment, ${bs_score}/10 BS (${verdict})`
    );
  } catch (error) {
    const errorMsg =
      error instanceof Error ? error.message : String(error);
    await supabase
      .from("games")
      .update({ analysis_status: "error", error_log: errorMsg })
      .eq("id", gameId);
    throw error;
  }
}

export async function seedAndProcessGames(
  games: { title: string; slug: string; priceUsd: number; genres: string[] }[]
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
