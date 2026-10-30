-- Source integrity: dedupe review_sources, prevent re-ingest duplicates,
-- record when each source was published, and log every ingest attempt.

-- 1. Remove duplicate sources, keeping the one with the most transcript text
--    (ties: most recently fetched).
DELETE FROM review_sources
WHERE id IN (
  SELECT id FROM (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY game_id, source_type, video_id
             ORDER BY length(coalesce(transcript, '')) DESC, fetched_at DESC
           ) AS rn
    FROM review_sources
    WHERE video_id IS NOT NULL
  ) ranked
  WHERE rn > 1
);

-- 2. One current row per source; ingest should upsert on this key.
CREATE UNIQUE INDEX IF NOT EXISTS review_sources_unique_source
  ON review_sources (game_id, source_type, video_id);

-- 3. When the review itself was published (needed to age evidence).
ALTER TABLE review_sources
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;

-- 4. Per-game, per-source record of what happened during ingest.
CREATE TABLE IF NOT EXISTS ingest_log (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id    UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  source     TEXT NOT NULL,                      -- e.g. 'youtube:IGN', 'steam', 'opencritic'
  status     TEXT NOT NULL CHECK (status IN ('ok', 'empty', 'failed', 'skipped')),
  detail     TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ingest_log_game_idx ON ingest_log (game_id, created_at DESC);
ALTER TABLE ingest_log ENABLE ROW LEVEL SECURITY;  -- no public policy: service role only
