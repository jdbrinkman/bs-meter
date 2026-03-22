export type GenreRule = {
  key: string;
  displayName: string;
  weights: {
    pacing: number;
    bloat: number;
    value: number;
    grind: number;
  };
  aiGuidance: string;
};

export const GENRE_RULES: Record<string, GenreRule> = {
  default: {
    key: "default",
    displayName: "Default",
    weights: { pacing: 0.4, bloat: 0.3, value: 0.2, grind: 0.1 },
    aiGuidance:
      "Evaluate this game using standard criteria. Balance all four pillars equally with the default weighting.",
  },
  "open-world-rpg": {
    key: "open-world-rpg",
    displayName: "Open-World RPG",
    weights: { pacing: 0.3, bloat: 0.4, value: 0.15, grind: 0.15 },
    aiGuidance:
      "For open-world RPGs, penalize checklist filler and repetitive side content heavily. Do NOT penalize large world size alone — only penalize if the world is hollow or padded. Map vomit and fetch-quest overload are the primary BS signals to watch for.",
  },
  roguelike: {
    key: "roguelike",
    displayName: "Roguelike",
    weights: { pacing: 0.35, bloat: 0.15, value: 0.25, grind: 0.25 },
    aiGuidance:
      "For roguelikes, repetition is a core design feature — do NOT penalize replay loops. Instead, penalize forced meta-progression grind that gates content. Focus on whether each run feels fresh and rewarding, and whether the meta-grind feels earned or forced.",
  },
  survival: {
    key: "survival",
    displayName: "Survival",
    weights: { pacing: 0.25, bloat: 0.3, value: 0.2, grind: 0.25 },
    aiGuidance:
      "For survival games, resource gathering and base building are core gameplay — do NOT penalize these. Instead, penalize material grind walls that block progression, excessive crafting requirements, and artificial scarcity designed to pad playtime.",
  },
  "horror-action": {
    key: "horror-action",
    displayName: "Horror / Action",
    weights: { pacing: 0.5, bloat: 0.2, value: 0.2, grind: 0.1 },
    aiGuidance:
      "For horror and action games, pacing is king. Heavily weight authored density — every encounter and area should feel intentional. Penalize padding, unnecessary backtracking, and anything that breaks tension or flow. A tight 10-15 hour experience should score higher than a padded 40-hour one.",
  },
  jrpg: {
    key: "jrpg",
    displayName: "JRPG",
    weights: { pacing: 0.35, bloat: 0.25, value: 0.25, grind: 0.15 },
    aiGuidance:
      "For JRPGs, longer playtimes are expected and acceptable — do NOT penalize length alone. Instead, penalize filler padding: repetitive dungeons, excessive random encounters, and story segments that don't advance the narrative. Walk-and-talk downtime is more tolerable in this genre if the story is compelling.",
  },
  "souls-like": {
    key: "souls-like",
    displayName: "Souls-like",
    weights: { pacing: 0.3, bloat: 0.2, value: 0.2, grind: 0.3 },
    aiGuidance:
      "For Souls-likes, difficulty and repetition through death are core features — do NOT penalize these. Penalize artificial difficulty walls (unfair hitboxes, HP sponge bosses), forced grinding for levels/materials, and bad boss-run design. Focus on whether challenge feels fair and progression feels earned.",
  },
  metroidvania: {
    key: "metroidvania",
    displayName: "Metroidvania",
    weights: { pacing: 0.4, bloat: 0.25, value: 0.25, grind: 0.1 },
    aiGuidance:
      "For Metroidvanias, backtracking is a core mechanic — do NOT penalize intentional revisiting of areas with new abilities. Penalize mandatory grind, excessive filler between meaningful upgrades, and map bloat that doesn't reward exploration.",
  },
  "fps-shooter": {
    key: "fps-shooter",
    displayName: "FPS / Shooter",
    weights: { pacing: 0.45, bloat: 0.25, value: 0.2, grind: 0.1 },
    aiGuidance:
      "For FPS/shooters, campaign pacing is the primary concern. Penalize repetitive arena encounters, filler missions, and anything that interrupts the action flow. A tight 8-hour campaign that never lets up should score very high.",
  },
  "indie-short": {
    key: "indie-short",
    displayName: "Indie / Short",
    weights: { pacing: 0.35, bloat: 0.1, value: 0.4, grind: 0.15 },
    aiGuidance:
      "For indie/short games, value-per-dollar is the most important factor. Bloat is rarely an issue. Focus on whether the price is justified by the quality and length of the experience, and whether the game delivers a complete, satisfying arc.",
  },
};

export function getGenreRule(genreKey: string): GenreRule {
  return GENRE_RULES[genreKey] || GENRE_RULES.default;
}

export function mapIGDBGenreToKey(genres: string[]): string {
  const genreLower = genres.map((g) => g.toLowerCase());

  if (genreLower.some((g) => g.includes("roguelike") || g.includes("roguelite")))
    return "roguelike";
  if (genreLower.some((g) => g.includes("souls") || g.includes("soulslike")))
    return "souls-like";
  if (genreLower.some((g) => g.includes("horror"))) return "horror-action";
  if (genreLower.some((g) => g.includes("survival"))) return "survival";
  if (genreLower.some((g) => g.includes("jrpg") || g.includes("role-playing")))
    return "jrpg";
  if (genreLower.some((g) => g.includes("metroidvania") || g.includes("platform")))
    return "metroidvania";
  if (genreLower.some((g) => g.includes("shooter") || g.includes("fps")))
    return "fps-shooter";
  if (genreLower.some((g) => g.includes("indie"))) return "indie-short";
  if (genreLower.some((g) => g.includes("open world") || g.includes("adventure")))
    return "open-world-rpg";

  return "default";
}
