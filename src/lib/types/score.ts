export type BracketKey =
  | "lean-masterpiece"
  | "high-signal"
  | "fair-trade"
  | "content-sludge"
  | "clock-puncher";

export type Score = {
  id: string;
  game_id: string;

  bs_score: number;
  bracket: BracketKey;

  pacing_score: number;
  bloat_score: number;
  value_score: number;
  grind_score: number;

  genre_rule_applied: string | null;
  weight_adjustments: Record<string, number> | null;

  summary: string;
  top_reasons: string[];

  model_version: string;
  raw_ai_response: Record<string, unknown> | null;
  confidence: number | null;

  created_at: string;
};
