import { createAdminClient } from "@/lib/supabase/admin";
import { VERDICTS, type VerdictKey } from "@/lib/scoring/v2";
import { GENRE_GROUPS, PLATFORM_GROUPS, type BrowseGroup } from "@/config/browse-groups";
import type { ViewKey } from "@/lib/browse-view";

export const VERDICT_ORDER: VerdictKey[] = ["worth-it", "wait", "not-yet", "skip"];

export type ListedGame = {
  slug: string;
  title: string;
  cover_url: string | null;
  developer: string | null;
  genres: string[];
  platforms: string[];
  release_date: string | null;
  main_story_hours: number | null;
  /** Current price in USD (0 = free), null when unknown. */
  price: number | null;
  scores: {
    verdict_v2: VerdictKey | null;
    bs_index: number | null;
    juice_index: number | null;
    genre_rule_applied: string | null;
    headline: string | null;
    /** True when several measures could not be rated for lack of coverage. */
    provisional: boolean | null;
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
      .select(
        "slug, title, cover_url, developer, genres, platforms, release_date, main_story_hours, current_price_usd, price_usd, analysis_status, scores (verdict_v2, bs_index, juice_index, genre_rule_applied, headline, provisional)"
      )
      .in("analysis_status", ["complete", "pending"]);
    return (data || [])
      .map((g) => ({
        ...g,
        main_story_hours: g.main_story_hours == null ? null : Number(g.main_story_hours),
        price: (g.current_price_usd ?? g.price_usd) == null ? null : Number(g.current_price_usd ?? g.price_usd),
        scores: Array.isArray(g.scores) ? g.scores[0] || null : g.scores,
      }))
      .filter((g) => isListed(g.analysis_status, g.scores?.verdict_v2)) as ListedGame[];
  } catch {
    return []; // Supabase not configured
  }
}

// ---------------------------------------------------------------------------
// Browse state: what the URL asks for, validated, and the filtering around it.
// ---------------------------------------------------------------------------

export const SORTS = [
  { key: "best", label: "Best deal first" },
  { key: "bs", label: "Lowest BS" },
  { key: "juice", label: "Highest Juice" },
  { key: "newest", label: "Newest" },
  { key: "shortest", label: "Shortest" },
  { key: "price", label: "Cheapest" },
] as const;
export type SortKey = (typeof SORTS)[number]["key"];

/** `view` is only what the URL says; the page falls back to the remembered choice, then to the grid. */
export type BrowseState = { verdict?: VerdictKey; genre?: string; platform?: string; sort: SortKey; view?: ViewKey };
export type FilterKey = "verdict" | "genre" | "platform";

type Params = { [key: string]: string | string[] | undefined };
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/** Anything in the URL that is not a known value is ignored, so old or hand-edited links never break the page. */
export function parseBrowseState(params: Params): BrowseState {
  const verdict = one(params.verdict);
  const genre = one(params.genre);
  const platform = one(params.platform);
  const sort = one(params.sort);
  const view = one(params.view);
  return {
    verdict: verdict && verdict in VERDICTS ? (verdict as VerdictKey) : undefined,
    genre: GENRE_GROUPS.some((g) => g.key === genre) ? genre : undefined,
    platform: PLATFORM_GROUPS.some((g) => g.key === platform) ? platform : undefined,
    sort: SORTS.some((s) => s.key === sort) ? (sort as SortKey) : "best",
    view: view === "grid" || view === "list" ? view : undefined,
  };
}

export function buildUrl(basePath: string, state: BrowseState): string {
  const p = new URLSearchParams();
  if (state.verdict) p.set("verdict", state.verdict);
  if (state.genre) p.set("genre", state.genre);
  if (state.platform) p.set("platform", state.platform);
  if (state.sort !== "best") p.set("sort", state.sort);
  if (state.view) p.set("view", state.view);
  const qs = p.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

const inGroup = (values: string[], group: BrowseGroup) => group.match.some((m) => values.includes(m));

export const genreValues = (g: ListedGame) => [...g.genres, ...(g.scores?.genre_rule_applied ? [g.scores.genre_rule_applied] : [])];
export const inGenre = (g: ListedGame, key: string) => {
  const group = GENRE_GROUPS.find((x) => x.key === key);
  return !!group && inGroup(genreValues(g), group);
};
export const inPlatform = (g: ListedGame, key: string) => {
  const group = PLATFORM_GROUPS.find((x) => x.key === key);
  return !!group && inGroup(g.platforms, group);
};

/** Applies every filter in the state except `skip`, which lets each filter show counts for its own options. */
export function applyFilters(games: ListedGame[], state: BrowseState, skip?: FilterKey): ListedGame[] {
  return games.filter(
    (g) =>
      (skip === "verdict" || !state.verdict || g.scores?.verdict_v2 === state.verdict) &&
      (skip === "genre" || !state.genre || inGenre(g, state.genre)) &&
      (skip === "platform" || !state.platform || inPlatform(g, state.platform))
  );
}

/** "Best deal first" is verdict order, then high Juice and low BS inside each verdict. Unrated games always go last. */
export function sortGames(games: ListedGame[], sort: SortKey): ListedGame[] {
  const rank = (g: ListedGame) => (g.scores?.verdict_v2 ? VERDICT_ORDER.indexOf(g.scores.verdict_v2) : 99);
  const juice = (g: ListedGame) => g.scores?.juice_index ?? -1;
  const bs = (g: ListedGame) => g.scores?.bs_index ?? 101;
  const net = (g: ListedGame) => juice(g) - (g.scores?.bs_index ?? 0);
  const date = (g: ListedGame) => g.release_date ?? "";
  const hours = (g: ListedGame) => g.main_story_hours ?? Infinity;
  const price = (g: ListedGame) => g.price ?? Infinity;
  const by: Record<SortKey, (a: ListedGame, b: ListedGame) => number> = {
    best: (a, b) => rank(a) - rank(b) || net(b) - net(a),
    bs: (a, b) => bs(a) - bs(b) || juice(b) - juice(a),
    juice: (a, b) => juice(b) - juice(a) || bs(a) - bs(b),
    newest: (a, b) => (date(a) < date(b) ? 1 : date(a) > date(b) ? -1 : 0),
    shortest: (a, b) => (hours(a) === hours(b) ? 0 : hours(a) < hours(b) ? -1 : 1),
    price: (a, b) => (price(a) === price(b) ? juice(b) - juice(a) : price(a) < price(b) ? -1 : 1),
  };
  return [...games].sort(by[sort]);
}
