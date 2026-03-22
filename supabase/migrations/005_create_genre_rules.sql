CREATE TABLE genre_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  genre_key TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,

  pacing_weight NUMERIC(3,2),
  bloat_weight NUMERIC(3,2),
  value_weight NUMERIC(3,2),
  grind_weight NUMERIC(3,2),

  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed genre rules
INSERT INTO genre_rules (genre_key, display_name, pacing_weight, bloat_weight, value_weight, grind_weight, notes) VALUES
  ('default', 'Default', 0.40, 0.30, 0.20, 0.10, 'Standard evaluation'),
  ('open-world-rpg', 'Open-World RPG', 0.30, 0.40, 0.15, 0.15, 'Penalize checklist filler, not world size'),
  ('roguelike', 'Roguelike', 0.35, 0.15, 0.25, 0.25, 'Penalize meta-grind, not replay loops'),
  ('survival', 'Survival', 0.25, 0.30, 0.20, 0.25, 'Penalize grind walls, not base-building'),
  ('horror-action', 'Horror / Action', 0.50, 0.20, 0.20, 0.10, 'Heavily weight pacing and authored density'),
  ('jrpg', 'JRPG', 0.35, 0.25, 0.25, 0.15, 'Penalize padding, not expected length'),
  ('souls-like', 'Souls-like', 0.30, 0.20, 0.20, 0.30, 'Difficulty is expected; penalize artificial walls'),
  ('metroidvania', 'Metroidvania', 0.40, 0.25, 0.25, 0.10, 'Backtracking is core; penalize mandatory grind'),
  ('fps-shooter', 'FPS / Shooter', 0.45, 0.25, 0.20, 0.10, 'Campaign pacing is king'),
  ('indie-short', 'Indie / Short', 0.35, 0.10, 0.40, 0.15, 'Value-per-dollar matters more');
