-- Migration 007: Add Steam user review support
-- Adds steam fields to games table and extends review_sources.source_type to include 'steam'

-- 1. Add Steam columns to games table
ALTER TABLE games
  ADD COLUMN IF NOT EXISTS steam_app_id INTEGER,
  ADD COLUMN IF NOT EXISTS steam_review_score_desc TEXT,
  ADD COLUMN IF NOT EXISTS steam_total_reviews INTEGER;

CREATE INDEX IF NOT EXISTS idx_games_steam_app_id ON games(steam_app_id);

-- 2. Extend source_type CHECK constraint on review_sources to include 'steam'
ALTER TABLE review_sources
  DROP CONSTRAINT IF EXISTS review_sources_source_type_check;

ALTER TABLE review_sources
  ADD CONSTRAINT review_sources_source_type_check
    CHECK (source_type IN ('youtube', 'opencritic', 'hltb', 'steam'));
