export type GenreWeights = {
  story_quality: number;
  narrative_investment: number;
  pacing: number;
  combat_repetition: number;
  boss_difficulty: number;
  exploration: number;
  polish_bugs: number;
  ui_controls: number;
  atmospheric_depth: number;
};

export type GenreRule = {
  key: string;
  displayName: string;
  weights: GenreWeights;
  narrativeCap: boolean; // if true, enjoyment_score capped at 87
  aiGuidance: string;
};

export const GENRE_RULES: Record<string, GenreRule> = {
  "narrative-rpg": {
    key: "narrative-rpg",
    displayName: "Narrative RPG",
    narrativeCap: false,
    weights: {
      story_quality: 1.00,
      narrative_investment: 1.00,
      pacing: 1.00,
      combat_repetition: 0.85,
      boss_difficulty: 0.60,
      atmospheric_depth: 0.80,
      exploration: 0.45,
      polish_bugs: 0.25,
      ui_controls: 0.20,
    },
    aiGuidance:
      "Story and narrative investment are the primary pillars. A weak story is fatal regardless of combat quality. Penalize filler that pads runtime without advancing the narrative. Combat is important but secondary to storytelling.",
  },
  soulslike: {
    key: "soulslike",
    displayName: "Soulslike",
    narrativeCap: false,
    weights: {
      boss_difficulty: 1.00,
      combat_repetition: 1.00,
      atmospheric_depth: 0.80,
      pacing: 0.80,
      polish_bugs: 0.60,
      story_quality: 0.40,
      narrative_investment: 0.35,
      exploration: 0.35,
      ui_controls: 0.25,
    },
    aiGuidance:
      "Boss design and combat variety are paramount. Difficulty through death is expected — do NOT penalize this. Penalize unfair hitboxes, HP sponge enemies, and excessive run-backs to bosses. Atmospheric storytelling (environmental, cryptic) fully counts as narrative investment — do not require explicit dialogue.",
  },
  "soulslike-blended": {
    key: "soulslike-blended",
    displayName: "Soulslike Blended",
    narrativeCap: false,
    weights: {
      combat_repetition: 0.94,
      boss_difficulty: 0.88,
      pacing: 0.88,
      atmospheric_depth: 0.75,
      story_quality: 0.64,
      narrative_investment: 0.61,
      polish_bugs: 0.46,
      exploration: 0.39,
      ui_controls: 0.23,
    },
    aiGuidance:
      "This genre blends soulslike combat with genuine narrative investment (Lies of P, Stellar Blade). Both combat excellence AND story quality matter. Penalize weak narrative in games that clearly aspire to tell a story, and penalize poor boss design equally.",
  },
  "action-adventure": {
    key: "action-adventure",
    displayName: "Action Adventure",
    narrativeCap: false,
    weights: {
      pacing: 0.90,
      story_quality: 0.85,
      narrative_investment: 0.85,
      atmospheric_depth: 0.80,
      combat_repetition: 0.80,
      boss_difficulty: 0.55,
      exploration: 0.55,
      polish_bugs: 0.35,
      ui_controls: 0.30,
    },
    aiGuidance:
      "Pacing and narrative are co-equal priorities. Combat should feel fresh throughout. Penalize repetitive encounter design and filler that interrupts the story flow. A tight authored experience scores higher than a bloated open-world expansion.",
  },
  roguelike: {
    key: "roguelike",
    displayName: "Roguelike",
    narrativeCap: false,
    weights: {
      combat_repetition: 1.00,
      narrative_investment: 0.85,
      atmospheric_depth: 0.80,
      story_quality: 0.75,
      pacing: 0.70,
      boss_difficulty: 0.65,
      polish_bugs: 0.40,
      exploration: 0.35,
      ui_controls: 0.25,
    },
    aiGuidance:
      "Repetition through runs is a core feature — do NOT penalize replay loops. Penalize forced meta-progression grind that gates content behind tedious unlocks. Each run should feel fresh and rewarding. Narrative revealed through runs fully counts — judge story_quality on total narrative depth over all runs.",
  },
  "roguelike-atmospheric": {
    key: "roguelike-atmospheric",
    displayName: "Roguelike + Atmospheric",
    narrativeCap: false,
    weights: {
      combat_repetition: 1.00,
      narrative_investment: 0.85,
      atmospheric_depth: 0.80,
      story_quality: 0.75,
      pacing: 0.70,
      boss_difficulty: 0.65,
      polish_bugs: 0.40,
      exploration: 0.35,
      ui_controls: 0.25,
    },
    aiGuidance:
      "Like roguelike but atmosphere is the primary narrative delivery mechanism (Returnal, Saros). Cryptic environmental and world-based storytelling counts as FULL narrative investment — do not penalize for lack of explicit dialogue. Judge story_quality on the emotional and atmospheric impact of the world, not cutscene volume.",
  },
  "platformer-metroidvania": {
    key: "platformer-metroidvania",
    displayName: "Platformer / Metroidvania",
    narrativeCap: false,
    weights: {
      pacing: 1.00,
      story_quality: 0.90,
      narrative_investment: 0.90,
      exploration: 0.85,
      atmospheric_depth: 0.70,
      polish_bugs: 0.60,
      ui_controls: 0.55,
      combat_repetition: 0.40,
      boss_difficulty: 0.40,
    },
    aiGuidance:
      "Pacing and exploration are the heart of this genre. Backtracking with new abilities is a core mechanic — do NOT penalize intentional revisiting. Penalize filler between meaningful upgrades and areas that feel empty. Wordless atmospheric storytelling counts fully as narrative investment.",
  },
  "puzzle-narrative": {
    key: "puzzle-narrative",
    displayName: "Puzzle / Narrative",
    narrativeCap: false,
    weights: {
      story_quality: 1.00,
      narrative_investment: 1.00,
      pacing: 0.95,
      atmospheric_depth: 0.70,
      polish_bugs: 0.50,
      exploration: 0.45,
      ui_controls: 0.30,
      combat_repetition: 0.10,
      boss_difficulty: 0.10,
    },
    aiGuidance:
      "Story and intellectual engagement are everything. Combat is nearly irrelevant. Penalize puzzles that feel arbitrary or block narrative flow without purpose. Pacing through puzzle difficulty is important — the game should challenge without frustrating.",
  },
  "pure-gameplay": {
    key: "pure-gameplay",
    displayName: "Pure Gameplay",
    narrativeCap: true, // max enjoyment_score = 87
    weights: {
      combat_repetition: 1.00,
      pacing: 0.95,
      boss_difficulty: 0.80,
      exploration: 0.75,
      polish_bugs: 0.65,
      ui_controls: 0.60,
      atmospheric_depth: 0.20,
      story_quality: 0.10,
      narrative_investment: 0.10,
    },
    aiGuidance:
      "This game has no authored story by design (Mario Odyssey, Astro Bot, Hitman). Do not penalize the absence of narrative — score story_quality and narrative_investment at 5/10 as neutral. Focus entirely on mechanical excellence: does each level/mission feel fresh? Is pacing tight? Note: a narrative cap of 87 applies — pure gameplay games cannot reach Must Play tier regardless of mechanical quality.",
  },
  "narrative-open-world": {
    key: "narrative-open-world",
    displayName: "Narrative Open World",
    narrativeCap: false,
    weights: {
      story_quality: 1.00,
      narrative_investment: 1.00,
      atmospheric_depth: 0.90,
      pacing: 0.75,
      exploration: 0.65,
      combat_repetition: 0.45,
      boss_difficulty: 0.35,
      polish_bugs: 0.25,
      ui_controls: 0.20,
    },
    aiGuidance:
      "Story and atmosphere are the primary experience (RDR2, slow-burn Rockstar style). Deliberate slowness is intentional design — do NOT penalize it if it serves immersion. Pacing weight is reduced to reflect that measured moments are part of the vision. Penalize filler that pads the world without narrative payoff.",
  },
  "action-horror": {
    key: "action-horror",
    displayName: "Action Horror Blended",
    narrativeCap: false,
    weights: {
      combat_repetition: 0.94,
      boss_difficulty: 0.88,
      atmospheric_depth: 0.80,
      pacing: 0.88,
      story_quality: 0.64,
      narrative_investment: 0.61,
      polish_bugs: 0.46,
      exploration: 0.39,
      ui_controls: 0.23,
    },
    aiGuidance:
      "Combat and atmosphere drive the experience equally (RE series). Boss design must be memorable and fair. Atmosphere is critical — it elevates or destroys the experience. Story matters more than pure action games but less than narrative RPGs. Penalize anything that breaks tension or makes combat feel repetitive.",
  },
  crpg: {
    key: "crpg",
    displayName: "CRPG / Tactical RPG",
    narrativeCap: false,
    weights: {
      story_quality: 1.00,
      narrative_investment: 1.00,
      pacing: 0.90,
      exploration: 0.70,
      atmospheric_depth: 0.70,
      combat_repetition: 0.65,
      polish_bugs: 0.30,
      ui_controls: 0.25,
      boss_difficulty: 0.30,
    },
    aiGuidance:
      "Story depth and narrative investment are the primary purpose of this genre. Tactical combat variety matters — encounters should feel distinct and strategic, not repetitive. Penalize padding that adds playtime without advancing story or exploration. Complex UI is somewhat expected in this genre — only penalize if it's genuinely hostile.",
  },
  "pvpve-extraction": {
    key: "pvpve-extraction",
    displayName: "PvPvE Extraction",
    narrativeCap: true, // max enjoyment_score = 87
    weights: {
      combat_repetition: 1.00,
      pacing: 0.95,
      boss_difficulty: 0.80,
      exploration: 0.75,
      polish_bugs: 0.65,
      ui_controls: 0.60,
      atmospheric_depth: 0.50,
      story_quality: 0.10,
      narrative_investment: 0.10,
    },
    aiGuidance:
      "This is a multiplayer-first extraction game with no authored story. Score story_quality and narrative_investment at 5/10 as neutral. Focus on moment-to-moment combat freshness, map design quality, and technical stability. Note: a narrative cap of 87 applies.",
  },
  default: {
    key: "default",
    displayName: "General",
    narrativeCap: false,
    weights: {
      story_quality: 0.70,
      narrative_investment: 0.70,
      pacing: 0.85,
      combat_repetition: 0.75,
      boss_difficulty: 0.55,
      exploration: 0.55,
      polish_bugs: 0.45,
      ui_controls: 0.35,
      atmospheric_depth: 0.60,
    },
    aiGuidance:
      "No exact genre match — using balanced default weights. Evaluate all 9 dimensions fairly. Penalize bloat and filler that disrespects the player's time.",
  },
};

export function getGenreRule(genreKey: string): GenreRule {
  return GENRE_RULES[genreKey] || GENRE_RULES.default;
}

export function mapIGDBGenreToKey(genres: string[], developer?: string | null, title?: string): string {
  const genreLower = genres.map((g) => g.toLowerCase());
  const titleLower = (title || "").toLowerCase();
  const devLower = (developer || "").toLowerCase();

  // Extraction / PvPvE
  if (titleLower.includes("arc raiders") || titleLower.includes("hunt: showdown") || titleLower.includes("hunt showdown"))
    return "pvpve-extraction";

  // Roguelike
  if (genreLower.some((g) => g.includes("roguelike") || g.includes("roguelite"))) {
    // Atmospheric roguelikes
    if (titleLower.includes("returnal") || titleLower.includes("saros"))
      return "roguelike-atmospheric";
    return "roguelike";
  }

  // Soulslike
  if (genreLower.some((g) => g.includes("souls") || g.includes("soulslike"))) {
    // Blended soulslikes (have narrative)
    if (titleLower.includes("lies of p") || titleLower.includes("stellar blade") || titleLower.includes("nioh"))
      return "soulslike-blended";
    return "soulslike";
  }
  // FromSoftware games are soulslike
  if (devLower.includes("fromsoftware") || titleLower.includes("elden ring") || titleLower.includes("dark souls") || titleLower.includes("sekiro") || titleLower.includes("bloodborne"))
    return "soulslike";

  // Horror / Action Horror
  if (genreLower.some((g) => g.includes("horror")))
    return "action-horror";

  // CRPG
  if (titleLower.includes("baldur") || titleLower.includes("divinity") || titleLower.includes("pillars of eternity") || titleLower.includes("pathfinder"))
    return "crpg";
  if (genreLower.some((g) => g.includes("tactical") && g.includes("rpg")))
    return "crpg";

  // Platformer / Metroidvania
  if (genreLower.some((g) => g.includes("metroidvania") || g.includes("platform")))
    return "platformer-metroidvania";

  // Puzzle / Narrative
  if (genreLower.some((g) => g.includes("puzzle") || g.includes("visual novel")))
    return "puzzle-narrative";

  // Pure gameplay (Nintendo style)
  if (titleLower.includes("mario") || titleLower.includes("astro bot") || titleLower.includes("hitman"))
    return "pure-gameplay";

  // Narrative Open World (Rockstar style)
  if (titleLower.includes("red dead") || titleLower.includes("grand theft auto"))
    return "narrative-open-world";

  // Action Adventure
  if (genreLower.some((g) => g.includes("hack and slash") || g.includes("beat 'em up")))
    return "action-adventure";
  if (genreLower.some((g) => g.includes("adventure")))
    return "action-adventure";

  // Narrative RPG (Witcher, Cyberpunk, God of War style)
  if (genreLower.some((g) => g.includes("role-playing") || g.includes("rpg")))
    return "narrative-rpg";

  return "default";
}
