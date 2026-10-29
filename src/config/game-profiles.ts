import { mapIGDBGenreToKey } from "./genre-weights";

// Explicit genre profile per game, keyed by slug. The profile sets the Juice weights
// (JUICE_WEIGHTS in scoring/v2.ts) and the short "what this game is trying to be" note
// given to the rater (GENRE_RULES in genre-weights.ts). It is a design input that we
// choose and can review, not something the rater or IGDB's tags should decide: the tags
// miss roguelikes entirely and change over time.
// Games not listed here fall back to mapIGDBGenreToKey, which logs a warning.
export const PROFILE_BY_SLUG: Record<string, string> = {
  "assassins-creed-valhalla": "action-adventure",
  "baldurs-gate-3": "crpg",
  "crimson-desert": "action-adventure",
  "dead-space-remake": "action-horror",
  "diablo-iv": "default",
  "dragon-age-inquisition": "narrative-rpg",
  "elden-ring": "soulslike",
  "final-fantasy-tactics-the-ivalice-chronicles": "turn-based-tactics",
  "final-fantasy-vii-rebirth": "narrative-rpg",
  "final-fantasy-xvi": "narrative-rpg",
  forspoken: "action-adventure",
  "ghost-of-yotei": "action-adventure",
  "god-of-war-ragnarok": "action-adventure",
  "gotham-knights": "action-adventure",
  hades: "roguelike-atmospheric",
  "hades-2": "roguelike-atmospheric",
  "hollow-knight": "platformer-metroidvania",
  "hollow-knight-silksong": "platformer-metroidvania",
  "horizon-forbidden-west": "action-adventure",
  "marvel-rivals": "multiplayer-live",
  "lorelei-and-the-laser-eyes": "puzzle-narrative",
  "mass-effect-3": "narrative-rpg",
  "mass-effect-andromeda": "narrative-rpg",
  "mio-memories-in-orbit": "platformer-metroidvania",
  "mortal-shell-2": "soulslike",
  "onimusha-way-of-the-sword": "action-adventure",
  "overwatch-2": "multiplayer-live",
  pragmata: "action-adventure",
  redfall: "action-adventure",
  "resident-evil-4-remake": "action-horror",
  saros: "roguelike-atmospheric",
  "sekiro-shadows-die-twice": "soulslike",
  "skull-and-bones": "multiplayer-live",
  starfield: "narrative-rpg",
  "the-blood-of-dawnwalker": "narrative-rpg",
  "the-last-of-us-part-2-remastered": "action-adventure",
  "the-witcher-3-wild-hunt": "narrative-rpg",
  "xcom-2": "turn-based-tactics",
};

export function resolveGenreKey(game: {
  slug?: string | null;
  genres?: string[] | null;
  developer?: string | null;
  title?: string | null;
}): string {
  const assigned = game.slug ? PROFILE_BY_SLUG[game.slug] : undefined;
  if (assigned) return assigned;
  const fallback = mapIGDBGenreToKey(game.genres || [], game.developer, game.title ?? "");
  console.warn(`No genre profile assigned for "${game.title ?? game.slug}"; using "${fallback}" from IGDB tags. Add it to PROFILE_BY_SLUG.`);
  return fallback;
}
