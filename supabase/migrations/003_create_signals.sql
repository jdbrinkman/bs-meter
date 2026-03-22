CREATE TABLE signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,

  signal_key TEXT NOT NULL,
  polarity TEXT NOT NULL CHECK (polarity IN ('positive', 'negative')),
  strength NUMERIC(3,1) NOT NULL,

  evidence_text TEXT,
  evidence_source TEXT,
  evidence_url TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_signals_game_id ON signals(game_id);
CREATE INDEX idx_signals_key ON signals(signal_key);
