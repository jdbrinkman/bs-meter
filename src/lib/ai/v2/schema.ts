import { z } from "zod";
import { MEASURES } from "@/lib/scoring/v2";

const ratingSchema = z.object({
  rating: z.number().min(0).max(5),
  applicable: z.boolean(),
  reason: z.string(),
  source: z.string(),
  basis: z.enum(["direct", "inferred"]),
});

export const analysisV2Schema = z.object({
  ratings: z.object(
    Object.fromEntries(MEASURES.map((m) => [m.key, ratingSchema])) as Record<string, typeof ratingSchema>
  ),
  headline: z.string(),
  rough_launch: z.boolean(),
  confidence: z.number().min(0).max(1),
});

export type AnalysisV2 = z.infer<typeof analysisV2Schema>;

const ratingJson = {
  type: "object",
  properties: {
    rating: { type: "number" },
    applicable: { type: "boolean" },
    reason: { type: "string" },
    source: { type: "string" },
    basis: { type: "string", enum: ["direct", "inferred"] },
  },
  required: ["rating", "applicable", "reason", "source", "basis"],
};

export const analysisV2JsonSchema = {
  type: "object",
  properties: {
    ratings: {
      type: "object",
      properties: Object.fromEntries(MEASURES.map((m) => [m.key, ratingJson])),
      required: MEASURES.map((m) => m.key),
    },
    headline: { type: "string" },
    rough_launch: { type: "boolean" },
    confidence: { type: "number" },
  },
  required: ["ratings", "headline", "rough_launch", "confidence"],
};

export function parseAnalysisV2(text: string): AnalysisV2 {
  return analysisV2Schema.parse(JSON.parse(text));
}
