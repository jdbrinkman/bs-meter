-- Scoring v2: juice/squeeze ratings. Additive; old columns stay for rollback.
ALTER TABLE scores
  ADD COLUMN IF NOT EXISTS ratings JSONB,
  ADD COLUMN IF NOT EXISTS juice_index INTEGER,
  ADD COLUMN IF NOT EXISTS bs_index INTEGER,
  ADD COLUMN IF NOT EXISTS verdict_v2 TEXT,
  ADD COLUMN IF NOT EXISTS headline TEXT,
  ADD COLUMN IF NOT EXISTS rough_launch BOOLEAN,
  ADD COLUMN IF NOT EXISTS scoring_version INTEGER NOT NULL DEFAULT 1;
