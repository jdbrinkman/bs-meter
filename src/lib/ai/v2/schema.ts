import { z } from "zod";
import { MEASURES } from "@/lib/scoring/v2";

// Bump when the output shape changes. Saved with every run so results are comparable.
export const SCHEMA_VERSION = "v3.1";

const MEASURE_KEYS = MEASURES.map((m) => m.key) as [string, ...string[]];

// ---------------------------------------------------------------------------
// Stage 1: extract, merge, and classify observations from the sources.
// An observation is an ISSUE (or a point of praise), not a sentence: the same
// point made by several sources is one observation with a corroboration count,
// classified once into exactly one measure.
// ---------------------------------------------------------------------------

export const observationSchema = z.object({
  id: z.string(),
  measure: z.enum(MEASURE_KEYS),
  polarity: z.enum(["negative", "positive"]),
  /** "launch_only" = a problem the sources say has since been fixed. It feeds rough_launch, not the measure. */
  timeframe: z.enum(["today", "launch_only"]),
  summary: z.string(),
  /** Short verbatim quote from the source text. */
  quote: z.string(),
  /** Who said it: reviewer/outlet name, "Steam players", or "HowLongToBeat data". */
  source: z.string(),
  /** How many distinct sources raise the same point (1 if only one). */
  corroboration: z.number().int().min(1),
});

/**
 * One entry per measure, written BEFORE the observations so the extractor has to look at every
 * measure instead of silently skipping some. "discussed" is true when any source or fact says
 * anything about it, including saying the problem is absent.
 */
export const coverageEntrySchema = z.object({
  discussed: z.boolean(),
  /** Which sources cover it, or "no source mentions it". */
  note: z.string(),
});

export const extractionSchema = z.object({
  coverage: z.object(
    Object.fromEntries(MEASURES.map((m) => [m.key, coverageEntrySchema])) as Record<string, typeof coverageEntrySchema>
  ),
  observations: z.array(observationSchema),
});

export type Observation = z.infer<typeof observationSchema>;
export type CoverageEntry = z.infer<typeof coverageEntrySchema>;
export type Coverage = Record<string, CoverageEntry>;
export type Extraction = z.infer<typeof extractionSchema>;

const observationJson = {
  type: "object",
  properties: {
    id: { type: "string" },
    measure: { type: "string", enum: MEASURE_KEYS },
    polarity: { type: "string", enum: ["negative", "positive"] },
    timeframe: { type: "string", enum: ["today", "launch_only"] },
    summary: { type: "string" },
    quote: { type: "string" },
    source: { type: "string" },
    corroboration: { type: "integer" },
  },
  required: ["id", "measure", "polarity", "timeframe", "summary", "quote", "source", "corroboration"],
};

const coverageJson = {
  type: "object",
  properties: { discussed: { type: "boolean" }, note: { type: "string" } },
  required: ["discussed", "note"],
};

// Property order matters: coverage is generated first, then the observations.
export const extractionJsonSchema = {
  type: "object",
  properties: {
    coverage: {
      type: "object",
      properties: Object.fromEntries(MEASURES.map((m) => [m.key, coverageJson])),
      required: MEASURES.map((m) => m.key),
    },
    observations: { type: "array", items: observationJson },
  },
  required: ["coverage", "observations"],
};

// ---------------------------------------------------------------------------
// Stage 2: rate each of the 12 measures from the observation list.
// ---------------------------------------------------------------------------

const ratingSchema = z
  .object({
    /** 1-5 when status is "rated"; null otherwise. */
    rating: z.number().int().min(1).max(5).nullable(),
    status: z.enum(["rated", "not_applicable", "not_discussed"]),
    reason: z.string(),
    source: z.string(),
    basis: z.enum(["direct", "inferred"]),
    issue_ids: z.array(z.string()),
  })
  .refine((r) => (r.status === "rated") === (r.rating !== null), {
    message: "rating must be a 1-5 number exactly when status is 'rated'",
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
    rating: { type: ["integer", "null"] },
    status: { type: "string", enum: ["rated", "not_applicable", "not_discussed"] },
    reason: { type: "string" },
    source: { type: "string" },
    basis: { type: "string", enum: ["direct", "inferred"] },
    issue_ids: { type: "array", items: { type: "string" } },
  },
  required: ["rating", "status", "reason", "source", "basis", "issue_ids"],
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

// ---------------------------------------------------------------------------
// Classification-only call (used by the reliability harness to test the
// classification step on a frozen observation list; production does not use it).
// ---------------------------------------------------------------------------

export const classificationSchema = z.object({
  classifications: z.array(z.object({ id: z.string(), measure: z.enum(MEASURE_KEYS) })),
});
export type Classification = z.infer<typeof classificationSchema>;

export const classificationJsonSchema = {
  type: "object",
  properties: {
    classifications: {
      type: "array",
      items: {
        type: "object",
        properties: { id: { type: "string" }, measure: { type: "string", enum: MEASURE_KEYS } },
        required: ["id", "measure"],
      },
    },
  },
  required: ["classifications"],
};

export function parseExtraction(text: string): Extraction {
  return extractionSchema.parse(JSON.parse(text));
}
export function parseAnalysisV2(text: string): AnalysisV2 {
  return analysisV2Schema.parse(JSON.parse(text));
}
export function parseClassification(text: string): Classification {
  return classificationSchema.parse(JSON.parse(text));
}
