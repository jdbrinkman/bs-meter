-- Price provenance and history. current_price_usd stays the verdict price; these add where it came
-- from and what the game has historically sold for (IsThereAnyDeal).
ALTER TABLE games
  ADD COLUMN IF NOT EXISTS price_source TEXT CHECK (price_source IN ('steam', 'list')),
  ADD COLUMN IF NOT EXISTS price_history JSONB,
  ADD COLUMN IF NOT EXISTS price_checked_at TIMESTAMPTZ;

-- Existing rows: Steam-priced games came from the Steam store API, the rest use the hand-typed list price.
UPDATE games SET price_source = CASE WHEN current_price_usd IS NOT NULL THEN 'steam' ELSE 'list' END
WHERE price_source IS NULL;
