import { createAdminClient } from "@/lib/supabase/admin";
import { VERDICTS, type VerdictKey } from "@/lib/scoring/v2";

export const VERDICT_ORDER: VerdictKey[] = ["worth-it", "wait", "not-yet", "skip"];

export const GENRE_LABELS: Record<string, string> = {
  "narrative-rpg": "Narrative RPG",
  soulslike: "Soulslike",
  "soulslike-blended": "Soulslike (Blended)",
  "action-adventure": "Action Adventure",
  roguelike: "Roguelike",
  "roguelike-atmospheric": "Roguelike (Atm.)",
  "platformer-metroidvania": "Platformer",
  "puzzle-narrative": "Puzzle",
  "pure-gameplay": "Pure Gameplay",
  "narrative-open-world": "Open World",
  "action-horror": "Horror",
  crpg: "CRPG",
  "pvpve-extraction": "Extraction",
  default: "Other",
};

export type ListedGame = {
  slug: string;
  title: string;
  cover_url: string | null;
  developer: string | null;
  genres: string[];
  scores: {
    verdict_v2: VerdictKey | null;
    bs_index: number | null;
    juice_index: number | null;
    genre_rule_applied: string | null;
  } | null;
};

/**
 * A game is listed once it is complete, or while it is still marked pending but already has a score
 * (the old public site hides pending games, so a scored game can wait there until this design is live).
 */
export const isListed = (status: string | null, verdict: string | null | undefined) =>
  status === "complete" || (status === "pending" && !!verdict);

export async function loadListedGames(): Promise<ListedGame[]> {
  try {
    const { data } = await createAdminClient()
      .from("games")
      .select("slug, title, cover_url, developer, genres, analysis_status, scores (verdict_v2, bs_index, juice_index, genre_rule_applied)")
      .in("analysis_status", ["complete", "pending"]);
    return (data || [])
      .map((g) => ({ ...g, scores: Array.isArray(g.scores) ? g.scores[0] || null : g.scores }))
      .filter((g) => isListed(g.analysis_status, g.scores?.verdict_v2)) as ListedGame[];
  } catch {
    return []; // Supabase not configured
  }
}

/** Verdict order first, then the best deal inside each verdict (high juice, low BS). Unrated games last. */
export function filterAndSort(games: ListedGame[], opts: { verdict?: string; genre?: string }): ListedGame[] {
  let out = games;
  if (opts.verdict && opts.verdict in VERDICTS) out = out.filter((g) => g.scores?.verdict_v2 === opts.verdict);
  if (opts.genre) out = out.filter((g) => g.scores?.genre_rule_applied === opts.genre);
  const rank = (g: ListedGame) => (g.scores?.verdict_v2 ? VERDICT_ORDER.indexOf(g.scores.verdict_v2) : 99);
  const net = (g: ListedGame) => (g.scores?.juice_index ?? 0) - (g.scores?.bs_index ?? 0);
  return [...out].sort((a, b) => rank(a) - rank(b) || net(b) - net(a));
}
