export type GenreRule = {
  key: string;
  displayName: string;
  /** Context for the rater: what this kind of game is trying to be, plus designed exemptions.
   *  It must not tell the rater what to penalize; the measure rubrics and decision order do that. */
  aiGuidance: string;
};

// Profiles are assigned per game in game-profiles.ts. The Juice weight for each profile
// lives in JUICE_WEIGHTS (scoring/v2.ts) under the same key.
export const GENRE_RULES: Record<string, GenreRule> = {
  "narrative-rpg": {
    key: "narrative-rpg",
    displayName: "Narrative RPG",
    aiGuidance:
      "A story-driven RPG. Characters, writing, and choices are the main draw; combat and systems support the story.",
  },
  soulslike: {
    key: "soulslike",
    displayName: "Soulslike",
    aiGuidance:
      "Difficulty and retrying after death are the design. Rate fairness under Challenge, and do not count retrying itself as Grind or Friction. Cryptic, environmental storytelling counts fully for Story.",
  },
  "soulslike-blended": {
    key: "soulslike-blended",
    displayName: "Soulslike with story",
    aiGuidance:
      "Soulslike combat with a real narrative (Lies of P, Stellar Blade). Difficulty and retrying are the design: rate fairness under Challenge. Story counts at full weight because the game aims to tell one.",
  },
  "action-adventure": {
    key: "action-adventure",
    displayName: "Action Adventure",
    aiGuidance:
      "An authored action-adventure where combat, story, and exploration share the spotlight. Rate each as it appears.",
  },
  roguelike: {
    key: "roguelike",
    displayName: "Roguelike",
    aiGuidance:
      "Runs are meant to repeat. Do not count the run loop itself as Repetition or Grind. Count meta-progression as Grind only if it gates content behind tedious unlocks. Story told across runs counts fully.",
  },
  "roguelike-atmospheric": {
    key: "roguelike-atmospheric",
    displayName: "Roguelike (story-driven)",
    aiGuidance:
      "A roguelike where story is delivered across runs or through the world (Hades, Returnal, Saros). Do not count the run loop itself as Repetition or Grind. Story told across runs, and wordless or environmental storytelling, counts fully.",
  },
  "platformer-metroidvania": {
    key: "platformer-metroidvania",
    displayName: "Platformer / Metroidvania",
    aiGuidance:
      "Revisiting areas with new abilities is the design. Count backtracking as Friction only when it costs time and pays off nothing. Wordless, atmospheric storytelling counts fully for Story.",
  },
  "puzzle-narrative": {
    key: "puzzle-narrative",
    displayName: "Puzzle / Narrative",
    aiGuidance:
      "Story and puzzle design carry the experience; combat is minor or absent. Rate Challenge on the depth and fairness of the puzzles.",
  },
  "pure-gameplay": {
    key: "pure-gameplay",
    displayName: "Pure Gameplay",
    aiGuidance:
      "No authored story by design (Mario Odyssey, Astro Bot, Hitman). Mark Story not applicable.",
  },
  "narrative-open-world": {
    key: "narrative-open-world",
    displayName: "Narrative Open World",
    aiGuidance:
      "Story and atmosphere are the experience (Rockstar style). Deliberate slowness that serves immersion is not a Pacing problem unless momentum is lost without payoff.",
  },
  "action-horror": {
    key: "action-horror",
    displayName: "Action Horror",
    aiGuidance:
      "Tension and atmosphere are core to the design. Deliberate scarcity and a measured pace in service of tension are not flaws.",
  },
  crpg: {
    key: "crpg",
    displayName: "CRPG / Tactical RPG",
    aiGuidance:
      "A story-heavy, choice-driven RPG. Dense menus and long dialogue are expected in this genre: rate Friction only if the interface is genuinely hostile.",
  },
  "multiplayer-live": {
    key: "multiplayer-live",
    displayName: "Multiplayer / live service",
    aiGuidance:
      "A multiplayer-first or live-service game (hero shooters, extraction games). Mark Story not applicable unless there is a real campaign. Moment-to-moment play and Staying power matter most. Rate Broken on the game's current patch. Count progression systems as Grind only when they gate play.",
  },
  "turn-based-tactics": {
    key: "turn-based-tactics",
    displayName: "Turn-based tactics",
    aiGuidance:
      "Fighting on a grid, one battle after another, is the genre. Rate Repetition on whether maps, enemies, and mechanics evolve across the campaign, and count long enemy-turn waits as Friction.",
  },
  default: {
    key: "default",
    displayName: "General",
    aiGuidance:
      "No exact genre match. Rate every measure for what this kind of game is trying to be.",
  },
};

export function getGenreRule(genreKey: string): GenreRule {
  return GENRE_RULES[genreKey] || GENRE_RULES.default;
}

/**
 * Fallback for games without an entry in PROFILE_BY_SLUG (game-profiles.ts). Best-effort guess from
 * IGDB tags and a few known titles. IGDB has no roguelike genre tag, so roguelikes and live-service
 * games must be assigned explicitly.
 */
export function mapIGDBGenreToKey(genres: string[], developer?: string | null, title?: string): string {
  const genreLower = genres.map((g) => g.toLowerCase());
  const titleLower = (title || "").toLowerCase();
  const devLower = (developer || "").toLowerCase();
  const has = (...needles: string[]) => genreLower.some((g) => needles.some((n) => g.includes(n)));

  // Extraction / multiplayer-first
  if (titleLower.includes("arc raiders") || titleLower.includes("hunt: showdown") || titleLower.includes("hunt showdown"))
    return "multiplayer-live";

  // Roguelike
  if (has("roguelike", "roguelite")) {
    if (titleLower.includes("returnal") || titleLower.includes("saros")) return "roguelike-atmospheric";
    return "roguelike";
  }

  // Soulslike
  if (has("souls", "soulslike")) {
    if (titleLower.includes("lies of p") || titleLower.includes("stellar blade") || titleLower.includes("nioh"))
      return "soulslike-blended";
    return "soulslike";
  }
  if (titleLower.includes("mortal shell")) return "soulslike";
  if (devLower.includes("fromsoftware") || titleLower.includes("elden ring") || titleLower.includes("dark souls") || titleLower.includes("sekiro") || titleLower.includes("bloodborne"))
    return "soulslike";

  // Horror
  if (has("horror")) return "action-horror";

  // CRPG
  if (titleLower.includes("baldur") || titleLower.includes("divinity") || titleLower.includes("pillars of eternity") || titleLower.includes("pathfinder"))
    return "crpg";

  // Turn-based tactics
  if (has("turn-based strategy", "tactical") && !has("hack and slash")) return "turn-based-tactics";

  // Platformer / Metroidvania
  if (has("metroidvania", "platform")) return "platformer-metroidvania";

  // Puzzle / Narrative (not when the game is also a shooter or brawler, e.g. Resident Evil 4's Puzzle tag)
  if (has("puzzle", "visual novel") && !has("shooter", "hack and slash")) return "puzzle-narrative";

  // Pure gameplay
  if (titleLower.includes("mario") || titleLower.includes("astro bot") || titleLower.includes("hitman"))
    return "pure-gameplay";

  // Narrative open world (Rockstar style)
  if (titleLower.includes("red dead") || titleLower.includes("grand theft auto"))
    return "narrative-open-world";

  // Action Adventure
  if (has("hack and slash", "beat 'em up", "adventure")) return "action-adventure";

  // Other RPGs
  if (has("role-playing", "rpg")) return "narrative-rpg";

  return "default";
}
