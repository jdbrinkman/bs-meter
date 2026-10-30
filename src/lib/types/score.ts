import type { Ratings, VerdictKey } from "@/lib/scoring/v2";

export type { VerdictKey };

/** One row per game. Only the v2 columns are read or written; v1 columns remain in the table as legacy. */
export type Score = {
  id: string;
  game_id: string;
  ratings: Ratings;
  juice_index: number | null; // 0-100, higher is better
  bs_index: number | null;    // 0-100, lower is better
  verdict_v2: VerdictKey;
  headline: string | null;
  rough_launch: boolean | null;
  genre_rule_applied: string | null;
  confidence: number | null;
  model_version: string | null;
  scoring_version: number;
  /** Stage 1 observations behind the ratings (v3+). */
  issues: unknown[] | null;
  /** Too many measures lacked coverage for the numbers to be trusted (v3+). */
  provisional: boolean | null;
  run_meta: Record<string, unknown> | null;
  scored_at: string | null;
  created_at: string;
};
