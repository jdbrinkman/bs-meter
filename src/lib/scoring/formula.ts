import { getGenreRule } from "@/config/genre-weights";
import { classifyBracket } from "./brackets";
import type { BracketKey } from "@/lib/types";

export type PillarScores = {
  pacing: number;
  bloat: number;
  value: number;
  grind: number;
};

export type ComputedScore = {
  score: number;
  bracket: BracketKey;
  weights: Record<string, number>;
};

export function computeBSScore(
  pillarScores: PillarScores,
  genreKey: string
): ComputedScore {
  const rule = getGenreRule(genreKey);
  const w = rule.weights;

  const raw =
    w.pacing * pillarScores.pacing +
    w.bloat * pillarScores.bloat +
    w.value * pillarScores.value +
    w.grind * pillarScores.grind;

  // Clamp to 1.0-10.0 and round to 1 decimal
  const score = Math.max(1.0, Math.min(10.0, Math.round(raw * 10) / 10));
  const bracket = classifyBracket(score);

  return { score, bracket, weights: w };
}
