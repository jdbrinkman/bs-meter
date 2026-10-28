import { createAdminClient } from "@/lib/supabase/admin";
import { analyzeGameV2 } from "@/lib/ai/v2/analyze";
import { mapIGDBGenreToKey } from "@/config/genre-weights";
import { computeBsIndex, computeJuiceIndex, deriveVerdictV2 } from "@/lib/scoring/v2";
import type { Ratings } from "@/lib/scoring/v2";
import type { Game, ReviewSource } from "@/lib/types";

/** Re-rate a game with v2 using stored sources. Writes only the v2 columns; v1 data is untouched. */
export async function scoreGameV2(gameId: string) {
  const supabase = createAdminClient();
  const { data: game, error } = await supabase.from("games").select("*").eq("id", gameId).single();
  if (error || !game) throw new Error(`Game not found: ${gameId}`);

  const { data: sources } = await supabase.from("review_sources").select("*").eq("game_id", gameId);
  const { data: critics } = await supabase
    .from("critic_reviews")
    .select("outlet, snippet")
    .eq("game_id", gameId)
    .order("published_at", { ascending: true })
    .limit(40);
  const g = game as Game;
  const genreKey = mapIGDBGenreToKey(g.genres || [], g.developer, g.title);

  const analysis = await analyzeGameV2(g, (sources || []) as ReviewSource[], genreKey, critics || []);
  const ratings = analysis.ratings;

  const juice = computeJuiceIndex(ratings, genreKey);
  const bs = computeBsIndex(ratings);
  const verdict = deriveVerdictV2({ juice, bs, broken: ratings.broken.rating, priceUsd: g.price_usd, releaseDate: g.release_date });

  const { error: upErr } = await supabase
    .from("scores")
    .update({
      ratings,
      juice_index: juice,
      bs_index: bs,
      verdict_v2: verdict,
      headline: analysis.headline,
      rough_launch: analysis.rough_launch,
      scoring_version: 2,
    })
    .eq("game_id", gameId);
  if (upErr) throw new Error(upErr.message);

  return { title: g.title, genreKey, juice, bs, verdict };
}

/** Recompute indexes and verdicts from stored ratings (no AI calls). Use after tuning the math. */
export async function recomputeAllV2() {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("scores")
    .select("game_id, ratings, games (title, genres, developer, price_usd, release_date)")
    .not("ratings", "is", null);
  const out = [];
  for (const row of data || []) {
    const g = (Array.isArray(row.games) ? row.games[0] : row.games) as unknown as Game;
    const ratings = row.ratings as Ratings;
    const genreKey = mapIGDBGenreToKey(g.genres || [], g.developer, g.title);
    const juice = computeJuiceIndex(ratings, genreKey);
    const bs = computeBsIndex(ratings);
    const verdict = deriveVerdictV2({ juice, bs, broken: ratings.broken.rating, priceUsd: g.price_usd, releaseDate: g.release_date });
    await supabase.from("scores").update({ juice_index: juice, bs_index: bs, verdict_v2: verdict }).eq("game_id", row.game_id);
    out.push({ title: g.title, genreKey, juice, bs, verdict });
  }
  return out;
}
