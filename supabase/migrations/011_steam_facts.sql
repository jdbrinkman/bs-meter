-- Steam store facts: current price (what a buyer pays today), IAP/DLC flags, achievement stats,
-- and recent-vs-all-time review sentiment.
ALTER TABLE games
  ADD COLUMN IF NOT EXISTS current_price_usd NUMERIC(6,2),
  ADD COLUMN IF NOT EXISTS steam_facts JSONB,
  ADD COLUMN IF NOT EXISTS steam_facts_checked_at TIMESTAMPTZ;
