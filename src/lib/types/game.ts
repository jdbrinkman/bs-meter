export type AnalysisStatus =
  | "pending"
  | "ingesting"
  | "analyzing"
  | "complete"
  | "error";

export type Game = {
  id: string;
  slug: string;
  title: string;
  igdb_id: number | null;
  opencritic_id: number | null;
  hltb_id: number | null;
  steam_app_id: number | null;

  // Steam user review data
  steam_review_score_desc: string | null;
  steam_total_reviews: number | null;

  // Metadata
  cover_url: string | null;
  summary: string | null;
  genres: string[];
  platforms: string[];
  developer: string | null;
  publisher: string | null;
  release_date: string | null;

  // Time data
  main_story_hours: number | null;
  main_extras_hours: number | null;
  completionist_hours: number | null;

  // Price
  price_usd: number | null;

  // OpenCritic
  opencritic_score: number | null;
  opencritic_tier: string | null;

  // Analysis state
  analysis_status: AnalysisStatus;
  analyzed_at: string | null;
  error_log: string | null;

  created_at: string;
  updated_at: string;
};

export type GameWithScore = Game & {
  scores: Score | null;
  signals: GameSignal[];
};

// Re-export related types for convenience
import type { Score } from "./score";
import type { GameSignal } from "./signal";
