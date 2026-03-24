export type VerdictKey =
  | "must-play"
  | "buy"
  | "worth-playing"
  | "mixed"
  | "skip";

export type Score = {
  id: string;
  game_id: string;

  enjoyment_score: number; // 0-100
  bs_score: number;        // 0-10
  verdict: VerdictKey;

  // 9 dimension scores (all 1-10)
  story_quality_score: number;
  narrative_investment_score: number;
  pacing_score: number;
  combat_repetition_score: number;
  boss_difficulty_score: number;
  exploration_score: number;
  polish_bugs_score: number;
  ui_controls_score: number;
  atmospheric_depth_score: number;

  genre_rule_applied: string | null;
  weight_adjustments: Record<string, number> | null;

  summary: string;
  top_reasons: string[];

  model_version: string;
  raw_ai_response: Record<string, unknown> | null;
  confidence: number | null;

  created_at: string;
};
