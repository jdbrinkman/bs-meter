-- Migration 006: Update scores table for Aditya's 9-dimension rating system
-- Run this in the Supabase SQL Editor.
-- WARNING: This wipes all existing scores and signals (they are under the old schema).

-- 1. Wipe old score data (incompatible with new schema)
TRUNCATE TABLE signals CASCADE;
TRUNCATE TABLE scores CASCADE;

-- 2. Reset all games to pending so they get re-analyzed
UPDATE games SET analysis_status = 'pending', analyzed_at = NULL, error_log = NULL;

-- 3. Remove old 4-pillar columns
ALTER TABLE scores
  DROP COLUMN IF EXISTS pacing_score,
  DROP COLUMN IF EXISTS bloat_score,
  DROP COLUMN IF EXISTS value_score,
  DROP COLUMN IF EXISTS grind_score;

-- 4. Rename bracket → verdict
ALTER TABLE scores RENAME COLUMN bracket TO verdict;

-- 5. Add Enjoyment Score (0-100)
ALTER TABLE scores
  ADD COLUMN IF NOT EXISTS enjoyment_score INTEGER NOT NULL DEFAULT 0;

-- 6. Add 9 dimension score columns (all 1-10)
ALTER TABLE scores
  ADD COLUMN IF NOT EXISTS story_quality_score NUMERIC(3,1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS narrative_investment_score NUMERIC(3,1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pacing_score NUMERIC(3,1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS combat_repetition_score NUMERIC(3,1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS boss_difficulty_score NUMERIC(3,1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS exploration_score NUMERIC(3,1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS polish_bugs_score NUMERIC(3,1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ui_controls_score NUMERIC(3,1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS atmospheric_depth_score NUMERIC(3,1) NOT NULL DEFAULT 0;
