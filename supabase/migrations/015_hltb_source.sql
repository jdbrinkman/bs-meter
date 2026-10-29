-- HowLongToBeat is now a live source (with the site owner's permission); hand-entered hours stay as fallback.
ALTER TABLE games DROP CONSTRAINT IF EXISTS games_hours_source_check;
ALTER TABLE games ADD CONSTRAINT games_hours_source_check CHECK (hours_source IN ('seed', 'igdb', 'hltb'));
