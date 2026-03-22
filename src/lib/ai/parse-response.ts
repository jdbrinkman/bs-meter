import { z } from "zod";

export const signalResponseSchema = z.object({
  signal_key: z.string(),
  polarity: z.enum(["positive", "negative"]),
  strength: z.number().min(1).max(10),
  evidence_text: z.string(),
  evidence_source: z.string(),
});

export const analysisResponseSchema = z.object({
  pillar_scores: z.object({
    pacing: z.number().min(1).max(10),
    bloat: z.number().min(1).max(10),
    value: z.number().min(1).max(10),
    grind: z.number().min(1).max(10),
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
    pillar_scores: {
      type: "object",
      properties: {
        pacing: { type: "number" },
        bloat: { type: "number" },
        value: { type: "number" },
        grind: { type: "number" },
      },
      required: ["pacing", "bloat", "value", "grind"],
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
    "pillar_scores",
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
