import { getGenreRule } from "@/config/genre-weights";
import { classifyVerdict } from "./brackets";
import type { VerdictKey } from "@/lib/types";

export type DimensionScores = {
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

export type ComputedScore = {
  enjoyment_score: number; // 0-100 integer
  bs_score: number;        // 0-10 float (1 decimal)
  verdict: VerdictKey;
  weights: Record<string, number>;
};

// Friction dimensions used for BS Score
const FRICTION_DIMENSIONS: (keyof DimensionScores)[] = [
  "pacing",
  "combat_repetition",
  "ui_controls",
  "polish_bugs",
];

export function computeScore(
  dimensionScores: DimensionScores,
  genreKey: string
): ComputedScore {
  const rule = getGenreRule(genreKey);
  const w = rule.weights;

  // --- Enjoyment Score ---
  // Weighted sum across all 9 dimensions
  let weightedSum = 0;
  let maxPossible = 0;

  for (const [dim, weight] of Object.entries(w)) {
    const score = dimensionScores[dim as keyof DimensionScores] ?? 5;
    weightedSum += score * weight;
    maxPossible += 10 * weight;
  }

  const rawRatio = maxPossible > 0 ? weightedSum / maxPossible : 0;

  // Apply power curve: compresses lower range, expands upper range
  // A "genuinely good" game scoring 7/10 across all dimensions
  // (~70% raw) should land at ~78, not 70.
  const curved = Math.pow(rawRatio, 0.75);
  const enjoyment_score = Math.round(Math.min(100, Math.max(0, curved * 100)));

  // --- BS Score ---
  // Based only on friction dimensions using their genre weights.
  // Higher dimension score = less friction = lower BS score.
  let frictionDelta = 0;
  let frictionMax = 0;

  for (const dim of FRICTION_DIMENSIONS) {
    const weight = w[dim] ?? 0.5;
    const score = dimensionScores[dim] ?? 5;
    frictionDelta += (10 - score) * weight; // inverted: high score = low friction
    frictionMax += 10 * weight;
  }

  const rawBs = frictionMax > 0 ? frictionDelta / frictionMax : 0;
  const bs_score = Math.round(rawBs * 100) / 10; // 0-10, 1 decimal

  // --- Verdict ---
  const verdict = classifyVerdict(enjoyment_score, rule.narrativeCap);

  return {
    enjoyment_score,
    bs_score,
    verdict,
    weights: w as Record<string, number>,
  };
}
