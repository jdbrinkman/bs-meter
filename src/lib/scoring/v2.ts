// Scoring v2: the AI rates 12 measures (6 juice, 6 squeeze) 1-5 against written rubrics.
// The full rubric, anchors and tie-breakers are in docs/scoring-rubric.md; the text below is what the rater sees.
// Everything after the measure definitions (index math, verdict rules) is deterministic and can be re-tuned
// from stored ratings without re-running the AI.

export type Side = "juice" | "squeeze";

export type MeasureDef = {
  key: string;
  side: Side;
  label: string;
  /** One-line plain-English meaning, shown in UI and given to the AI. */
  summary: string;
  /** 1-5 rubric given to the AI: what counts, what does not, anchors, and the minimum evidence. */
  rubric: string;
};

export const JUICE: MeasureDef[] = [
  {
    key: "story", side: "juice", label: "Story",
    summary: "Characters and narrative that pull you forward.",
    rubric: `Counts: plot, characters, writing, emotional impact, side-quest writing. Environmental and cryptic storytelling counts fully.
Does not count: narrative rhythm (Pacing); voice performance (Presentation).
Anchors: 1 = incoherent or actively bad; 2 = weak, forgettable; 3 = competent; 4 = excellent, sticks with you; 5 = memorable and drives you to keep playing.
Not applicable: the game has no story intent (competitive shooters, abstract puzzles).`,
  },
  {
    key: "gameplay", side: "juice", label: "Gameplay",
    summary: "How good it feels to play, minute to minute.",
    rubric: `Counts: core loop, combat, movement, controls, depth of systems.
Does not count: difficulty fairness (Challenge); enemy or encounter variety (Repetition); bugs (Broken). Rate as if the game works.
Anchors: 1 = frustrating to play; 2 = clunky or shallow; 3 = solid; 4 = excellent; 5 = feels great and stays great.
Applies to every game.`,
  },
  {
    key: "world", side: "juice", label: "World",
    summary: "Places worth being in: level design and exploration that pays off.",
    rubric: `Counts: level design, exploration that pays off, environmental storytelling, coherence of place.
Does not count: audiovisual craft (Presentation); filler density (Padding).
Anchors: 1 = bland or incoherent; 2 = forgettable; 3 = pleasant; 4 = rich, rewarding to explore; 5 = a place you want to be in, and exploring is rewarded.
Not applicable: abstract or menu-driven games with no spaces.`,
  },
  {
    key: "presentation", side: "juice", label: "Presentation",
    summary: "Art direction, animation, sound, music, and voice acting.",
    rubric: `Counts: art direction, animation, sound design, music, voice acting.
Does not count: performance problems (Broken); level layout (World).
Anchors: 1 = dated, ugly, or grating; 2 = rough in places; 3 = competent; 4 = strong and cohesive; 5 = distinctive and polished.`,
  },
  {
    key: "challenge", side: "juice", label: "Challenge",
    summary: "Fair, well-designed difficulty and room to master it.",
    rubric: `Counts: fair, readable difficulty that rewards mastery. Cheap, arbitrary, or badly balanced difficulty lowers it. For games that are easy by design, rate the depth of decisions instead.
Does not count: the difficulty level itself, which is never penalized. Unfair difficulty lowers Challenge only, not Friction.
Anchors: 1 = trivial or unfair; 2 = uneven; 3 = engaging; 4 = well tuned, rewarding to master; 5 = deep, fair, memorable.`,
  },
  {
    key: "staying", side: "juice", label: "Staying power",
    summary: "Reasons to keep playing after one pass.",
    rubric: `Counts: builds, runs, NG+, multiplayer, mods, post-game.
Not applicable unless the game's design relies on repeat play (roguelikes, multiplayer, live service, sandbox). A complete-by-design game is skipped, not scored low.
Anchors: 1 = nothing worth returning for; 2 = thin; 3 = some reasons; 4 = good reasons; 5 = strong reasons to return.`,
  },
];

export const SQUEEZE: MeasureDef[] = [
  {
    key: "padding", side: "squeeze", label: "Padding",
    summary: "Content stretched thin to inflate the runtime.",
    rubric: `Question: does it add hours with content that gives nothing back? (Padding = low VALUE.)
Counts: filler and fetch quests, templated activities, collectible checklists, map-icon sprawl, whether mandatory or optional. Time-savers sold alongside padding count as evidence.
Does not count: a big world with good content; recurring encounters (Repetition); required farming (Grind).
Severity scale (how often and how costly, in time and progress, not enjoyment): 1 = none, or a few ignorable collectibles; 2 = some filler but the main path stays clean; 3 = filler noticeably dilutes the game, you could cut hours without loss; 4 = filler is a big part of the experience for most players; 5 = most of the hours are filler.
Evidence that counts: HowLongToBeat main vs completionist gap, achievement completion rates, reviewers saying filler / checklist / map icons.
Minimum evidence: rate it only if reviewers discuss content filler, or the hours gap or achievements give an objective hint. Otherwise not_discussed.`,
  },
  {
    key: "grind", side: "squeeze", label: "Grind",
    summary: "Forced repetition just to progress.",
    rubric: `Question: is progress blocked until you repeat work? (Grind = GATED.)
Counts: XP and level walls, forced resource farming, RNG-gated progress, chores required to unlock the story, time-savers sold to skip these.
Does not count: optional farming for min-maxing. Retrying a boss after death in a game built around that is not Grind.
Severity scale: 1 = none; 2 = occasional; 3 = regularly stalls progress until you farm; 4 = a big part of progression for most players; 5 = progress is mostly grinding.
Minimum evidence: rate it only if sources describe how progression is gated, or say there is no gate. Otherwise not_discussed.`,
  },
  {
    key: "friction", side: "squeeze", label: "Friction",
    summary: "Things that waste your time between the fun parts.",
    rubric: `Question: does operating or moving through the game cost avoidable time? (Friction = OPERATING.)
Counts: UI, menu, and inventory sludge; poor fast travel; long runbacks after death; sparse checkpoints; forced backtracking that pays off nothing; save/load overhead.
Does not count: how controls feel (Gameplay); difficulty spikes (Challenge); unskippable scenes and tutorials (Pacing). Designed backtracking, as in a metroidvania, is not Friction unless it is pure time cost.
Severity scale: 1 = respects your time; 2 = minor overhead; 3 = regularly annoying overhead; 4 = overhead is a big part of the experience; 5 = constant.
Minimum evidence: rate it only if sources mention menus, travel, checkpoints, runbacks, or save/load, or clearly describe their absence. Otherwise not_discussed.`,
  },
  {
    key: "repetition", side: "squeeze", label: "Repetition",
    summary: "The same enemies, bosses, or activities on loop.",
    rubric: `Question: does the core game recycle the same things without evolving? (Repetition = low VARIETY.)
Counts: reused enemies, bosses, and arenas; the same mission or encounter structure across the campaign; mechanics that overstay their welcome.
Does not count: templated side activities as content units (Padding); required repetition (Grind); roguelike run loops, unless the content itself runs thin.
Severity scale: 1 = constantly fresh; 2 = some reuse; 3 = noticeable by the midpoint; 4 = obvious for much of the game; 5 = the same thing for most of the game.
Minimum evidence: rate it only if sources discuss variety of enemies, missions, or mechanics. Otherwise not_discussed.`,
  },
  {
    key: "pacing", side: "squeeze", label: "Pacing",
    summary: "Slow starts, sagging stretches, and momentum that drains away.",
    rubric: `Question: does the sequencing of content lose momentum? (Pacing = poor TIMING.)
Counts: slow starts, overlong tutorials, unskippable cutscenes, sagging stretches, payoff droughts.
Does not count: low-value units (Padding); story quality (Story); a deliberate slow burn that pays off.
Severity scale: 1 = momentum holds; 2 = a brief lull; 3 = recurring stretches that lose momentum, or a start that takes hours to get going; 4 = long stretches drag for most players; 5 = the pace undermines the whole game.
Minimum evidence: rate it only if sources discuss the start, the middle, or the length/structure of the game. Otherwise not_discussed.`,
  },
  {
    key: "broken", side: "squeeze", label: "Broken",
    summary: "Bugs, crashes, and unfinished states.",
    rubric: `Question: do technical faults cost time or progress TODAY? (Broken = technical state.)
Counts: crashes, bugs, lost saves, broken quests, severe performance problems. Rate the game as it is today, after patches, on its best-supported platform. A problem on one platform only caps this at 3; 4-5 requires problems that persist across platforms. Fixed launch problems go in rough_launch, not here.
Does not count: design weakness. A confusing inventory is Friction; an inventory that loses changes is Broken. Do not also lower other measures for bugs.
Severity scale: 1 = rock solid; 2 = minor bugs; 3 = frequent bugs but playable; 4 = serious problems (crashes, lost progress, major performance); 5 = barely playable.
Minimum evidence: rate it only with recent evidence (Steam reviews from the last 30 days, current-state reviewer comments, or a tech review). Launch-era reviews alone are not enough: not_discussed.`,
  },
];

export const MEASURES = [...JUICE, ...SQUEEZE];
export const MEASURE_BY_KEY = Object.fromEntries(MEASURES.map((m) => [m.key, m]));
export const JUICE_KEYS = JUICE.map((m) => m.key);
export const SQUEEZE_KEYS = SQUEEZE.map((m) => m.key);

/** BS decision order: when one complaint could fit several measures, the first match wins. */
export const BS_DECISION_ORDER: { key: string; test: string }[] = [
  { key: "broken", test: "a technical fault (crash, bug, performance, lost progress)" },
  { key: "grind", test: "the player must repeat work to be allowed to progress" },
  { key: "friction", test: "operating or moving through the game costs time (menus, travel, runbacks, checkpoints)" },
  { key: "padding", test: "a low-value content unit (quest, activity, collectible)" },
  { key: "repetition", test: "core encounters, bosses, or mechanics recurring" },
  { key: "pacing", test: "the timing and sequencing of content" },
];

/** Written tie-breakers for the pairs of measures that get confused. */
export const TIE_BREAKERS: string[] = [
  "Padding vs Grind: if the player MUST do it to progress it is Grind; if it is optional or skippable filler it is Padding.",
  "Padding vs Repetition: Padding = a content unit with low value (a fetch quest); Repetition = the core fights, bosses or missions recurring. A fetch quest that is both low value and repetitive is Padding, counted once.",
  "Repetition vs Pacing: Repetition = the same things coming back; Pacing = the order and timing of content, even if every piece is different.",
  "Friction vs Pacing: Friction = cost of operating the game (menus, travel, runbacks, saves); Pacing = momentum of content (slow start, unskippable scenes, tutorials).",
  "Friction vs Grind: Friction slows you down while you play; Grind stops you progressing until you repeat work.",
];

export type RatingStatus = "rated" | "not_applicable" | "not_discussed";

export type Rating = {
  /** 1-5 when status is "rated"; null otherwise. Null is skipped by the indexes, never treated as 1 or 0. */
  rating: number | null;
  status: RatingStatus;
  reason: string;
  source: string;
  basis: "direct" | "inferred";
  /** Ids of the extracted observations this rating rests on. */
  issue_ids: string[];
};

export type Ratings = Record<string, Rating>;

/** The numeric rating when the measure was rated, else null. Tolerates ratings stored on the old schema. */
export function ratingValue(r: Rating | undefined): number | null {
  if (!r || r.status !== "rated" || typeof r.rating !== "number") return null;
  return r.rating;
}

/**
 * Display-side reader for stored ratings. Rows scored before rubric v3 have `applicable` and no `status`;
 * they are shown as they were (0-5) until the re-score replaces them. Never used for index math.
 */
export function normalizeRating(r: Rating | (Partial<Rating> & { applicable?: boolean; rating?: number | null }) | undefined): Rating | null {
  if (!r) return null;
  if (r.status) return r as Rating;
  const legacy = r as { applicable?: boolean; rating?: number | null; reason?: string; source?: string; basis?: "direct" | "inferred" };
  return {
    rating: legacy.applicable === false ? null : (legacy.rating ?? null),
    status: legacy.applicable === false ? "not_applicable" : "rated",
    reason: legacy.reason ?? "",
    source: legacy.source ?? "",
    basis: legacy.basis ?? "inferred",
    issue_ids: [],
  };
}

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

/**
 * Staying power applies when the profile gives it real weight (>= 1 in the table above). At 0.5
 * the genre is complete by design, which the rubric says to skip, not score low. Decided here
 * rather than by the rater because the rater flipped between rating it and calling it N/A.
 */
export function stayingApplies(genreKey: string): boolean {
  return (JUICE_WEIGHTS[genreKey] ?? JUICE_WEIGHTS.default).staying >= 1;
}

// BS index: the worst squeeze measures dominate, so one maxed-out problem can't be averaged away.
// Under test (docs/reliability-test-plan.md), not final.
export const BS_TOP_WEIGHTS = [0.5, 0.3, 0.2];

/** A game is provisional when this many measures (not counting not-applicable ones) could not be rated for lack of coverage. */
export const PROVISIONAL_MIN_UNRATED = 3;

const unit = (r: number) => (r - 1) / 4;

/** Juice index 0-100: genre-weighted average of the rated measures. Not-applicable and not-discussed are skipped and the rest re-weighted. */
export function computeJuiceIndex(ratings: Ratings, genreKey: string): number | null {
  const weights = JUICE_WEIGHTS[genreKey] ?? JUICE_WEIGHTS.default;
  let sum = 0;
  let total = 0;
  for (const m of JUICE) {
    const r = ratingValue(ratings[m.key]);
    if (r == null) continue;
    const wt = weights[m.key as keyof JuiceWeights];
    sum += unit(r) * wt;
    total += wt;
  }
  return total > 0 ? Math.round((sum / total) * 100) : null;
}

/**
 * BS index 0-100: the worst three rated squeeze measures weighted 50/30/20. A clean game scores 0.
 * Unrated measures are skipped (never counted as clean); if fewer than three are rated the weights are
 * re-normalised over the ones that exist. Null when nothing could be rated.
 */
export function computeBsIndex(ratings: Ratings): number | null {
  const vals = SQUEEZE.map((m) => ratingValue(ratings[m.key]))
    .filter((v): v is number => v != null)
    .sort((a, b) => b - a);
  if (!vals.length) return null;
  const weights = BS_TOP_WEIGHTS.slice(0, vals.length);
  const totalW = weights.reduce((a, b) => a + b, 0);
  const score = weights.reduce((acc, wt, i) => acc + wt * unit(vals[i]), 0) / totalW;
  return Math.round(score * 100);
}

/** True when too many measures lack coverage for the numbers to be trusted. */
export function isProvisional(ratings: Ratings): boolean {
  const unrated = MEASURES.filter((m) => ratings[m.key]?.status === "not_discussed").length;
  return unrated >= PROVISIONAL_MIN_UNRATED;
}

/** Five-level ratings do not support one-point precision: show indexes to the nearest 5. */
export function displayIndex(n: number | null): number | null {
  return n == null ? null : Math.round(n / 5) * 5;
}

export type VerdictKey = "worth-it" | "wait" | "not-yet" | "skip";

export const VERDICTS: Record<VerdictKey, { label: string; color: string }> = {
  "worth-it": { label: "Worth it", color: "#22C55E" },
  wait: { label: "Wait for a sale", color: "#EAB308" },
  "not-yet": { label: "Not yet", color: "#F97316" },
  skip: { label: "Skip", color: "#EF4444" },
};

// Verdict rules. One place, so the code and the methodology page cannot disagree.
// Thresholds were tuned on the old 0-5 math; re-tune after the re-score (POST /api/recompute-v2).
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
  worthJuiceExpensive: 70,
  expensiveAbove: 40,
  worthBsAtMost: 60,
} as const;

export function deriveVerdictV2(input: {
  juice: number | null;
  bs: number | null;
  /** The Broken rating (1-5), or null when it could not be rated. */
  broken: number | null;
  priceUsd: number | null;
  releaseDate: string | null;
}): VerdictKey {
  const { broken, priceUsd, releaseDate } = input;
  const r = VERDICT_RULES;
  // The rules run on the same rounded numbers the page shows ("about 65"), so two games that display
  // the same number cannot get different verdicts. Missing indexes are treated as the neutral case,
  // never as a clean or a terrible game.
  const juice = displayIndex(input.juice) ?? 60;
  const bs = displayIndex(input.bs) ?? 30;
  // "Not yet" is for recent releases that are rough today. Older games' source
  // reviews describe launch-era problems that have mostly been patched.
  const monthsOld = releaseDate ? (Date.now() - new Date(releaseDate).getTime()) / 2.63e9 : 999;
  if (broken != null && broken >= r.notYetBroken && monthsOld < r.notYetMaxAgeMonths) return "not-yet";
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
