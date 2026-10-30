import { GoogleGenAI } from "@google/genai";

let client: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI {
  if (!client) {
    client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
  }
  return client;
}

export type ThinkingLevel = "minimal" | "low" | "medium" | "high";

export type ModelConfig = {
  model: string;
  thinkingLevel: ThinkingLevel;
  /** Thinking tokens count toward this cap, so keep it generous. */
  maxOutputTokens: number;
  /**
   * Left unset on purpose: Google recommends the default (1.0) for Gemini 3.x models and warns that lower
   * values can loop or degrade reasoning. The old code forced 0 for gemini-2.5-flash.
   */
  temperature?: number;
};

/**
 * The production rater. PROVISIONAL until the reliability tests (docs/reliability-test-plan.md) pick a model
 * and thinking level; override with SCORING_MODEL / SCORING_THINKING. The model ID that actually answers is
 * saved with every score.
 */
export const SCORING_CONFIG: ModelConfig = {
  model: process.env.SCORING_MODEL ?? "gemini-3.8-flash",
  thinkingLevel: (process.env.SCORING_THINKING as ThinkingLevel | undefined) ?? "medium",
  maxOutputTokens: 32768,
};

/** Standard paid API rates, USD per million tokens (thinking tokens bill as output). Batch API is 50% of these. */
export const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  "gemini-3.8-flash": { input: 0.75, output: 3.75 }, // promotional rate through 2026-12-31
  "gemini-3.5-flash-lite": { input: 0.3, output: 2.5 },
};

export function costUsd(model: string, inputTokens: number, outputTokens: number, batch = false): number {
  const p = MODEL_PRICING[model];
  if (!p) return 0;
  return ((inputTokens * p.input + outputTokens * p.output) / 1e6) * (batch ? 0.5 : 1);
}
