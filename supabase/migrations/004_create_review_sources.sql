CREATE TABLE review_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,

  source_type TEXT NOT NULL CHECK (source_type IN ('youtube', 'opencritic', 'hltb')),
  channel_name TEXT,
  video_id TEXT,
  video_title TEXT,
  transcript TEXT,
  url TEXT,

  fetched_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_review_sources_game_id ON review_sources(game_id);
