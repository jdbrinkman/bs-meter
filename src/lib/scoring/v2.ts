// Scoring v2: the AI rates 12 measures (6 juice, 6 squeeze) 0-5 against written rubrics.
// The target rubric (1-5 scale, new squeeze measures) is in docs/scoring-rubric.md; only the juice measures
// and genre weights have been moved to it so far.
// Everything below (index math, verdict rules) is deterministic and can be re-tuned
// from stored ratings without re-running the AI.

export type Side = "juice" | "squeeze";

export type MeasureDef = {
  key: string;
  side: Side;
  label: string;
  /** One-line plain-English meaning, shown in UI and given to the AI. */
  summary: string;
  /** 0-5 rubric given to the AI. */
  rubric: string;
};

export const JUICE: MeasureDef[] = [
  {
    key: "story", side: "juice", label: "Story",
    summary: "Characters and narrative that pull you forward.",
    rubric: "Plot, characters, writing, emotional impact, and the writing quality of side quests. Environmental and cryptic storytelling counts fully. Narrative rhythm belongs to Pacing and voice performance to Presentation. Lowest = incoherent or actively bad, 3 = competent, 5 = memorable and drives you to keep playing. Mark NOT APPLICABLE if the game has no story intent (competitive shooters, abstract puzzles).",
  },
  {
    key: "gameplay", side: "juice", label: "Gameplay",
    summary: "How good it feels to play, minute to minute.",
    rubric: "Core loop, combat, movement, controls, and depth of systems. Difficulty fairness belongs to Challenge, enemy and encounter variety to Repetition, and bugs to Broken: rate as if the game works. Lowest = frustrating to play, 3 = solid, 5 = feels great and stays great. Applies to every genre.",
  },
  {
    key: "world", side: "juice", label: "World",
    summary: "Places worth being in: level design and exploration that pays off.",
    rubric: "Level and world design, exploration that pays off, environmental storytelling, coherence of place. Art and audio craft belong to Presentation and filler density to Padding. Lowest = bland or incoherent, 3 = pleasant, 5 = a place you want to be in, and exploring is rewarded. Mark NOT APPLICABLE for abstract or menu-driven games with no spaces.",
  },
  {
    key: "presentation", side: "juice", label: "Presentation",
    summary: "Art direction, animation, sound, music, and voice acting.",
    rubric: "Art direction, animation, sound design, music, voice acting. Performance and stability problems belong to Broken and level layout to World. Lowest = dated, ugly, or grating, 3 = competent, 5 = distinctive and polished.",
  },
  {
    key: "challenge", side: "juice", label: "Challenge",
    summary: "Fair, well-designed difficulty and room to master it.",
    rubric: "Quality of difficulty: fair, readable, rewards mastery. Cheap, arbitrary, or badly balanced difficulty lowers it. For games that are easy by design, rate the depth of decisions instead. The difficulty level itself is never penalized. Lowest = trivial or unfair, 3 = engaging, 5 = deep, fair, memorable.",
  },
  {
    key: "staying", side: "juice", label: "Staying power",
    summary: "Reasons to keep playing after one pass.",
    rubric: "New builds, runs, NG+, multiplayer, mods, post-game. Mark NOT APPLICABLE unless the game's design relies on repeat play (roguelikes, multiplayer, live service, sandbox); a complete-by-design game is skipped, not scored low. Lowest = nothing worth returning for, 3 = some reasons, 5 = strong reasons to return.",
  },
];

export const SQUEEZE: MeasureDef[] = [
  {
    key: "padding", side: "squeeze", label: "Padding",
    summary: "Content stretched thin to inflate the runtime.",
    rubric: "Marker/collectible filler, copy-paste side content, runtime inflated beyond the good stuff. 0 = nothing to skip, 1 = a few ignorable collectibles, 2 = some filler but the main path stays clean, 3 = filler noticeably dilutes the game, 4 = filler is a big part of it, 5 = mostly filler. A large optional world is NOT padding if the content is good.",
  },
  {
    key: "grind", side: "squeeze", label: "Grind",
    summary: "Forced repetition just to progress.",
    rubric: "Level walls, XP gates, resource farming, RNG-gated progress, daily chores. 0 = none, 2 = occasional, 3 = regularly gets in the way, 5 = progress is mostly grinding. Optional farming for min-maxing does not count.",
  },
  {
    key: "monetization", side: "squeeze", label: "Monetization",
    summary: "Pressure to spend more money.",
    rubric: "Microtransactions, battle passes, FOMO timers, pay-to-skip, season passes, content cut and sold separately. 0 = none, 1 = optional cosmetics only, 3 = notable pressure or locked content, 5 = progress or fun is gated behind spending. Rate it from the player's experience, not the business model.",
  },
  {
    key: "repetition", side: "squeeze", label: "Repetition",
    summary: "The same enemies, bosses, or activities on loop.",
    rubric: "Recycled enemies, bosses, locations, activity loops. 0 = constantly fresh, 2 = some reuse, 3 = noticeable by the midpoint, 5 = the same thing for most of the game. Roguelike run loops are by design and do not count unless the content itself runs thin.",
  },
  {
    key: "friction", side: "squeeze", label: "Friction",
    summary: "Things that waste your time between the fun parts.",
    rubric: "Long runbacks, unskippable scenes, slow traversal, menu/inventory sludge, forced backtracking, poor checkpoints, overlong tutorials, artificial difficulty spikes. 0 = respects your time, 3 = regularly annoying, 5 = constant.",
  },
  {
    key: "broken", side: "squeeze", label: "Broken",
    summary: "Bugs, crashes, and unfinished states.",
    rubric: "Rate the game AS IT IS TODAY, after patches, on its best-supported platform (usually PC). Problems on one console only cap this at 3; give 4-5 only for problems that persist across platforms. 0 = rock solid, 2 = minor bugs, 3 = frequent bugs but playable, 4 = serious problems (crashes, lost progress, major performance issues), 5 = barely playable. Rough launches that have since been fixed go in the separate rough_launch flag, not here.",
  },
];

export const MEASURES = [...JUICE, ...SQUEEZE];
export const MEASURE_BY_KEY = Object.fromEntries(MEASURES.map((m) => [m.key, m]));

export type Rating = {
  rating: number; // 0-5
  applicable: boolean;
  reason: string;
  source: string;
  basis: "direct" | "inferred";
};

export type Ratings = Record<string, Rating>;

type JuiceWeights = Record<"story" | "gameplay" | "world" | "presentation" | "challenge" | "staying", number>;
const w = (story: number, gameplay: number, world: number, presentation: number, challenge: number, staying: number): JuiceWeights =>
  ({ story, gameplay, world, presentation, challenge, staying });

// How much each juice measure matters per genre profile (keys match GENRE_RULES in config/genre-weights.ts;
// games are assigned a profile in config/game-profiles.ts). Hand-set starting points, not validated:
// see docs/genre-profiles.md. Order: story, gameplay, world, presentation, challenge, staying power.
export const JUICE_WEIGHTS: Record<string, JuiceWeights> = {
  "narrative-rpg": w(3, 2, 1.5, 1, 0.5, 0.5),
  soulslike: w(0.5, 3, 2, 1, 3, 1),
  "soulslike-blended": w(1.5, 3, 2, 1, 2.5, 1),
  "action-adventure": w(2, 3, 2, 1, 1, 0.5),
  roguelike: w(0.5, 3, 1, 1, 1.5, 3),
  "roguelike-atmospheric": w(1.5, 3, 2, 1, 1.5, 2.5),
  "platformer-metroidvania": w(0.5, 3, 2, 1.5, 1.5, 1),
  "puzzle-narrative": w(2, 2.5, 2, 1, 1.5, 0.5),
  "pure-gameplay": w(0, 3, 1, 1, 1.5, 2),
  "narrative-open-world": w(3, 2, 2, 1.5, 0.5, 0.5),
  "action-horror": w(1.5, 3, 2, 1.5, 1, 0.5),
  crpg: w(3, 2, 1.5, 0.5, 1, 1),
  "multiplayer-live": w(0, 3, 1, 1, 2, 3),
  "turn-based-tactics": w(1.5, 3, 1, 1, 2.5, 1.5),
  default: w(1.5, 3, 2, 1, 1, 1),
};

// BS index: the worst squeeze measures dominate, so one maxed-out problem can't be averaged away.
export const BS_TOP_WEIGHTS = [0.5, 0.3, 0.2];

export function computeJuiceIndex(ratings: Ratings, genreKey: string): number {
  const weights = JUICE_WEIGHTS[genreKey] ?? JUICE_WEIGHTS.default;
  let sum = 0;
  let total = 0;
  for (const m of JUICE) {
    const r = ratings[m.key];
    if (!r || !r.applicable) continue;
    const wt = weights[m.key as keyof JuiceWeights];
    sum += (r.rating / 5) * wt;
    total += wt;
  }
  return total > 0 ? Math.round((sum / total) * 100) : 0;
}

export function computeBsIndex(ratings: Ratings): number {
  const vals = SQUEEZE.map((m) => ratings[m.key]?.rating ?? 0).sort((a, b) => b - a);
  const score = BS_TOP_WEIGHTS.reduce((acc, wt, i) => acc + wt * (vals[i] ?? 0), 0);
  return Math.round((score / 5) * 100);
}

export type VerdictKey = "worth-it" | "wait" | "not-yet" | "skip";

export const VERDICTS: Record<VerdictKey, { label: string; color: string }> = {
  "worth-it": { label: "Worth it", color: "#22C55E" },
  wait: { label: "Wait for a sale", color: "#EAB308" },
  "not-yet": { label: "Not yet", color: "#F97316" },
  skip: { label: "Skip", color: "#EF4444" },
};

// Verdict rules. One place, so the code and the methodology page cannot disagree.
export const VERDICT_RULES = {
  /** "Not yet": Broken at or above this, and the game is newer than notYetMaxAgeMonths. */
  notYetBroken: 4,
  notYetMaxAgeMonths: 24,
  /** "Skip": juice below this... */
  skipJuiceBelow: 50,
  /** ...or BS at or above this while juice is under skipHighBsJuiceBelow. */
  skipBsAtLeast: 65,
  skipHighBsJuiceBelow: 80,
  /** "Worth it": juice at least this (cheaper games / pricier games) and BS at most worthBsAtMost. */
  worthJuiceCheap: 65,
  worthJuiceExpensive: 72,
  expensiveAbove: 40,
  worthBsAtMost: 60,
} as const;

export function deriveVerdictV2(input: {
  juice: number;
  bs: number;
  broken: number;
  priceUsd: number | null;
  releaseDate: string | null;
}): VerdictKey {
  const { juice, bs, broken, priceUsd, releaseDate } = input;
  const r = VERDICT_RULES;
  // "Not yet" is for recent releases that are rough today. Older games' source
  // reviews describe launch-era problems that have mostly been patched.
  const monthsOld = releaseDate ? (Date.now() - new Date(releaseDate).getTime()) / 2.63e9 : 999;
  if (broken >= r.notYetBroken && monthsOld < r.notYetMaxAgeMonths) return "not-yet";
  if (juice < r.skipJuiceBelow || (bs >= r.skipBsAtLeast && juice < r.skipHighBsJuiceBelow)) return "skip";
  const juiceNeeded = (priceUsd ?? 0) > r.expensiveAbove ? r.worthJuiceExpensive : r.worthJuiceCheap;
  if (juice >= juiceNeeded && bs <= r.worthBsAtMost) return "worth-it";
  return "wait";
}

export function bsColor(bs: number): string {
  if (bs <= 25) return "#22C55E";
  if (bs <= 50) return "#EAB308";
  if (bs <= 75) return "#F97316";
  return "#EF4444";
}
