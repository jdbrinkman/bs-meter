CREATE TABLE games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  igdb_id INTEGER UNIQUE,
  opencritic_id INTEGER,
  hltb_id INTEGER,

  -- Metadata (from IGDB)
  cover_url TEXT,
  summary TEXT,
  genres TEXT[] DEFAULT '{}',
  platforms TEXT[] DEFAULT '{}',
  developer TEXT,
  publisher TEXT,
  release_date DATE,

  -- Time data (from HLTB)
  main_story_hours NUMERIC(5,1),
  main_extras_hours NUMERIC(5,1),
  completionist_hours NUMERIC(5,1),

  -- Price data
  price_usd NUMERIC(5,2),

  -- OpenCritic
  opencritic_score NUMERIC(4,1),
  opencritic_tier TEXT,

  -- Analysis state
  analysis_status TEXT DEFAULT 'pending'
    CHECK (analysis_status IN ('pending','ingesting','analyzing','complete','error')),
  analyzed_at TIMESTAMPTZ,
  error_log TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_games_slug ON games(slug);
CREATE INDEX idx_games_analysis_status ON games(analysis_status);
CREATE INDEX idx_games_genres ON games USING GIN(genres);
