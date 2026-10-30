-- Time to beat: IGDB community data stored next to the hand-typed hours so the two can be compared.
ALTER TABLE games
  ADD COLUMN IF NOT EXISTS time_to_beat JSONB,
  ADD COLUMN IF NOT EXISTS hours_source TEXT CHECK (hours_source IN ('seed', 'igdb'));
UPDATE games SET hours_source = 'seed' WHERE main_story_hours IS NOT NULL AND hours_source IS NULL;
