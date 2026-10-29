import type { Ratings, VerdictKey } from "@/lib/scoring/v2";

export type { VerdictKey };

/** One row per game. Only the v2 columns are read or written; v1 columns remain in the table as legacy. */
export type Score = {
  id: string;
  game_id: string;
  ratings: Ratings;
  juice_index: number; // 0-100, higher is better
  bs_index: number;    // 0-100, lower is better
  verdict_v2: VerdictKey;
  headline: string | null;
  rough_launch: boolean | null;
  genre_rule_applied: string | null;
  confidence: number | null;
  model_version: string | null;
  scoring_version: number;
  scored_at: string | null;
  created_at: string;
};
