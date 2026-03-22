import { z } from "zod";

export const signalResponseSchema = z.object({
  signal_key: z.string(),
  polarity: z.enum(["positive", "negative"]),
  strength: z.number().min(1).max(10),
  evidence_text: z.string(),
  evidence_source: z.string(),
});

export const analysisResponseSchema = z.object({
  dimension_scores: z.object({
    story_quality: z.number().min(1).max(10),
    narrative_investment: z.number().min(1).max(10),
    pacing: z.number().min(1).max(10),
    combat_repetition: z.number().min(1).max(10),
    boss_difficulty: z.number().min(1).max(10),
    exploration: z.number().min(1).max(10),
    polish_bugs: z.number().min(1).max(10),
    ui_controls: z.number().min(1).max(10),
    atmospheric_depth: z.number().min(1).max(10),
  }),
  signals: z.array(signalResponseSchema),
  summary: z.string(),
  top_reasons: z.array(z.string()).min(3).max(5),
  confidence: z.number().min(0).max(1),
});

export type AnalysisResponse = z.infer<typeof analysisResponseSchema>;

// Hand-written JSON schema for Gemini structured output
// (zodToJsonSchema has compatibility issues with newer zod versions)
export const analysisJsonSchema = {
  type: "object",
  properties: {
    dimension_scores: {
      type: "object",
      properties: {
        story_quality: { type: "number" },
        narrative_investment: { type: "number" },
        pacing: { type: "number" },
        combat_repetition: { type: "number" },
        boss_difficulty: { type: "number" },
        exploration: { type: "number" },
        polish_bugs: { type: "number" },
        ui_controls: { type: "number" },
        atmospheric_depth: { type: "number" },
      },
      required: [
        "story_quality",
        "narrative_investment",
        "pacing",
        "combat_repetition",
        "boss_difficulty",
        "exploration",
        "polish_bugs",
        "ui_controls",
        "atmospheric_depth",
      ],
    },
    signals: {
      type: "array",
      items: {
        type: "object",
        properties: {
          signal_key: { type: "string" },
          polarity: { type: "string", enum: ["positive", "negative"] },
          strength: { type: "number" },
          evidence_text: { type: "string" },
          evidence_source: { type: "string" },
        },
        required: [
          "signal_key",
          "polarity",
          "strength",
          "evidence_text",
          "evidence_source",
        ],
      },
    },
    summary: { type: "string" },
    top_reasons: {
      type: "array",
      items: { type: "string" },
    },
    confidence: { type: "number" },
  },
  required: [
    "dimension_scores",
    "signals",
    "summary",
    "top_reasons",
    "confidence",
  ],
};

export function parseAnalysisResponse(text: string): AnalysisResponse {
  const parsed = JSON.parse(text);
  return analysisResponseSchema.parse(parsed);
}
