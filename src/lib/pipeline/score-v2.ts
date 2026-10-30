import { createAdminClient } from "@/lib/supabase/admin";
import { analyzeGameV2, VERSIONS } from "@/lib/ai/v2/analyze";
import { SCORING_CONFIG } from "@/lib/ai/gemini";
import { resolveGenreKey } from "@/config/game-profiles";
import { computeBsIndex, computeJuiceIndex, deriveVerdictV2, isProvisional, ratingValue } from "@/lib/scoring/v2";
import type { Ratings } from "@/lib/scoring/v2";
import { dedupeSources, flagQuotes } from "@/lib/pipeline/evidence";
import type { Game, ReviewSource } from "@/lib/types";

/**
 * Rates a game with the stored sources (two AI stages: extract issues, then rate) and writes the result. This is the only scoring path.
 * Does not fetch anything: run ingest first. Creates the score row if the game has none.
 */
export async function scoreGameV2(gameId: string) {
  const supabase = createAdminClient();
  const { data: game, error } = await supabase.from("games").select("*").eq("id", gameId).single();
  if (error || !game) throw new Error(`Game not found: ${gameId}`);

  try {
    await supabase.from("games").update({ analysis_status: "analyzing" }).eq("id", gameId);

    const { data: sources } = await supabase.from("review_sources").select("*").eq("game_id", gameId);
    const { data: critics } = await supabase
      .from("critic_reviews")
      .select("outlet, snippet")
      .eq("game_id", gameId)
      .order("published_at", { ascending: true })
      .limit(40);
    const g = game as Game;
    const genreKey = resolveGenreKey(g);

    const usedSources = dedupeSources((sources || []) as ReviewSource[]);
    const result = await analyzeGameV2(g, usedSources, genreKey, critics || []);
    const issues = flagQuotes(result.observations, usedSources, critics || []);
    const analysis = result.analysis;
    const ratings = analysis.ratings as Ratings;
    const attempts = [...result.extract, ...result.rate];
    const okAttempts = attempts.filter((a) => a.kind === "ok");
    const modelReturned = okAttempts[okAttempts.length - 1]?.modelReturned ?? SCORING_CONFIG.model;
    const sum = (f: (a: (typeof attempts)[number]) => number) => attempts.reduce((n, a) => n + f(a), 0);

    const juice = computeJuiceIndex(ratings, genreKey);
    const bs = computeBsIndex(ratings);
    const verdict = deriveVerdictV2({
      juice,
      bs,
      broken: ratingValue(ratings.broken),
      priceUsd: g.current_price_usd ?? g.price_usd,
      releaseDate: g.release_date,
    });

    const { data: saved, error: upErr } = await supabase
      .from("scores")
      .upsert(
        {
          game_id: gameId,
          ratings,
          juice_index: juice,
          bs_index: bs,
          verdict_v2: verdict,
          headline: analysis.headline,
          rough_launch: analysis.rough_launch,
          genre_rule_applied: genreKey,
          confidence: analysis.confidence,
          model_version: modelReturned,
          issues,
          provisional: isProvisional(ratings),
          run_meta: {
            model_requested: SCORING_CONFIG.model,
            model_returned: modelReturned,
            thinking_level: SCORING_CONFIG.thinkingLevel,
            versions: VERSIONS,
            coverage: result.coverage,
            unmatched_quotes: issues.filter((i) => i.quote_found === false).length,
            input_tokens: sum((a) => a.inputTokens),
            output_tokens: sum((a) => a.outputTokens),
            thinking_tokens: sum((a) => a.thinkingTokens),
            attempts: attempts.length,
          },
          scoring_version: 3,
          scored_at: new Date().toISOString(),
        },
        { onConflict: "game_id" }
      )
      .select("id");
    if (upErr) throw new Error(upErr.message);
    if (!saved?.length) throw new Error("Score was not saved (no row returned)");

    await supabase.from("games").update({ analysis_status: "complete", analyzed_at: new Date().toISOString(), error_log: null }).eq("id", gameId);
    return { title: g.title, genreKey, juice, bs, verdict };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await supabase.from("games").update({ analysis_status: "error", error_log: message.slice(0, 500) }).eq("id", gameId);
    throw e;
  }
}

/** Recompute indexes and verdicts from stored ratings (no AI calls). Use after tuning the math. */
export async function recomputeAllV2() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("scores")
    .select("game_id, ratings, scoring_version, games (slug, title, genres, developer, price_usd, current_price_usd, release_date)")
    .not("ratings", "is", null);
  if (error) throw new Error(error.message);

  const out = [];
  for (const row of data || []) {
    // Ratings stored before rubric v3 use the old keys and 0-5 scale; recomputing them would corrupt the indexes.
    if ((row.scoring_version ?? 0) < 3) continue;
    const g = (Array.isArray(row.games) ? row.games[0] : row.games) as unknown as Game;
    const ratings = row.ratings as Ratings;
    const genreKey = resolveGenreKey(g);
    const juice = computeJuiceIndex(ratings, genreKey);
    const bs = computeBsIndex(ratings);
    const verdict = deriveVerdictV2({
      juice,
      bs,
      broken: ratingValue(ratings.broken),
      priceUsd: g.current_price_usd ?? g.price_usd,
      releaseDate: g.release_date,
    });
    const { error: upErr } = await supabase
      .from("scores")
      .update({ juice_index: juice, bs_index: bs, verdict_v2: verdict, genre_rule_applied: genreKey, provisional: isProvisional(ratings) })
      .eq("game_id", row.game_id);
    if (upErr) throw new Error(`${g.title}: ${upErr.message}`);
    out.push({ title: g.title, genreKey, juice, bs, verdict });
  }
  return out;
}
