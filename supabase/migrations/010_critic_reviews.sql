-- Critic layer: every OpenCritic review we pull, plus 'article' as a review_sources type
-- (full text of the written reviews we analyze).

ALTER TABLE review_sources DROP CONSTRAINT IF EXISTS review_sources_source_type_check;
ALTER TABLE review_sources
  ADD CONSTRAINT review_sources_source_type_check
  CHECK (source_type IN ('youtube', 'opencritic', 'hltb', 'steam', 'article'));

CREATE TABLE IF NOT EXISTS critic_reviews (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id       UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  opencritic_review_id TEXT NOT NULL,
  outlet        TEXT NOT NULL,
  author        TEXT,
  score         NUMERIC(5,1),          -- normalized 0-100 as given by OpenCritic (null if unscored)
  snippet       TEXT,
  url           TEXT,
  published_at  TIMESTAMPTZ,
  fetched_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (game_id, opencritic_review_id)
);
CREATE INDEX IF NOT EXISTS critic_reviews_game_idx ON critic_reviews (game_id, published_at DESC);

ALTER TABLE critic_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read critic_reviews" ON critic_reviews FOR SELECT USING (true);
