CREATE TABLE scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,

  bs_score NUMERIC(3,1) NOT NULL,
  bracket TEXT NOT NULL,

  pacing_score NUMERIC(3,1) NOT NULL,
  bloat_score NUMERIC(3,1) NOT NULL,
  value_score NUMERIC(3,1) NOT NULL,
  grind_score NUMERIC(3,1) NOT NULL,

  genre_rule_applied TEXT,
  weight_adjustments JSONB,

  summary TEXT NOT NULL,
  top_reasons TEXT[] NOT NULL,

  model_version TEXT DEFAULT 'gemini-2.5-flash',
  raw_ai_response JSONB,
  confidence NUMERIC(3,2),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_scores_game_id ON scores(game_id);
