export type IGDBGame = {
  id: number;
  name: string;
  slug: string;
  summary?: string;
  cover?: { url: string };
  genres?: { name: string }[];
  platforms?: { name: string }[];
  involved_companies?: {
    company: { name: string };
    developer: boolean;
    publisher: boolean;
  }[];
  first_release_date?: number;
};

export type HLTBResult = {
  id: string;
  name: string;
  gameplayMain: number;
  gameplayMainExtra: number;
  gameplayCompletionist: number;
};

export type OpenCriticGame = {
  id: number;
  name: string;
  topCriticScore: number;
  tier: string;
  reviewCount: number;
};

export type YouTubeSearchResult = {
  videoId: string;
  title: string;
  channelTitle: string;
  publishedAt: string;
};

export type ReviewSource = {
  id: string;
  game_id: string;
  source_type: "youtube" | "opencritic" | "hltb";
  channel_name: string | null;
  video_id: string | null;
  video_title: string | null;
  transcript: string | null;
  url: string | null;
  fetched_at: string;
};
