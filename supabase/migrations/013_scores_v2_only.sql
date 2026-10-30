-- One scoring version. v2 is the only writer; v1 columns stay (nullable) so old values are kept for
-- reference and rollback, but nothing reads or writes them any more.
ALTER TABLE scores
  ALTER COLUMN bs_score DROP NOT NULL,
  ALTER COLUMN verdict DROP NOT NULL,
  ALTER COLUMN summary DROP NOT NULL,
  ALTER COLUMN top_reasons DROP NOT NULL,
  ALTER COLUMN scoring_version SET DEFAULT 2;
ALTER TABLE scores ADD COLUMN IF NOT EXISTS scored_at TIMESTAMPTZ;
