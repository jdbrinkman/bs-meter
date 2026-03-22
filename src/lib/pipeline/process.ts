import { createAdminClient } from "@/lib/supabase/admin";
import { analyzeGame } from "@/lib/ai/analyze-game";
import { computeBSScore } from "@/lib/scoring/formula";
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
    if (game.analysis_status === "pending") {
      await ingestGameData(gameId, game.title);

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

    // Step 4: Determine genre key
    const genreKey = mapIGDBGenreToKey(
      (game as Game).genres || []
    );

    // Step 5: Run AI analysis
    const analysis = await analyzeGame(
      game as Game,
      (reviewSources || []) as ReviewSource[],
      genreKey
    );

    // Step 6: Compute final score with genre-adjusted weights
    const { score, bracket, weights } = computeBSScore(
      analysis.pillar_scores,
      genreKey
    );

    // Step 7: Delete any existing scores/signals for this game (re-analysis)
    await supabase.from("scores").delete().eq("game_id", gameId);
    await supabase.from("signals").delete().eq("game_id", gameId);

    // Step 8: Store the score
    await supabase.from("scores").insert({
      game_id: gameId,
      bs_score: score,
      bracket,
      pacing_score: analysis.pillar_scores.pacing,
      bloat_score: analysis.pillar_scores.bloat,
      value_score: analysis.pillar_scores.value,
      grind_score: analysis.pillar_scores.grind,
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
      `Analysis complete for ${game.title}: ${score} (${bracket})`
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
