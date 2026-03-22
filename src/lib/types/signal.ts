export type GameSignal = {
  id: string;
  game_id: string;

  signal_key: string;
  polarity: "positive" | "negative";
  strength: number;

  evidence_text: string | null;
  evidence_source: string | null;
  evidence_url: string | null;

  created_at: string;
};
