import { SCORING_CONFIG, type ModelConfig } from "../gemini";
import {
  buildClassifyPrompt,
  buildExtractPrompt,
  buildRatePrompt,
  PROMPT_VERSION,
  RUBRIC_VERSION,
  type CriticSnippet,
  type PromptOptions,
} from "./prompt";
import {
  analysisV2JsonSchema,
  classificationJsonSchema,
  extractionJsonSchema,
  parseAnalysisV2,
  parseClassification,
  parseExtraction,
  SCHEMA_VERSION,
  type AnalysisV2,
  type Classification,
  type Coverage,
  type Extraction,
  type Observation,
} from "./schema";
import { stayingApplies } from "@/lib/scoring/v2";
import { runStage, type Attempt } from "./run";
import type { Game, ReviewSource } from "@/lib/types";

export const VERSIONS = { prompt: PROMPT_VERSION, rubric: RUBRIC_VERSION, schema: SCHEMA_VERSION };

export type StageResult<T> = { value: T; attempts: Attempt[] };

export type AnalysisResult = {
  analysis: AnalysisV2;
  observations: Observation[];
  coverage: Coverage;
  extract: Attempt[];
  rate: Attempt[];
};

/** Only a few juice measures can be not-applicable; squeeze measures never are. */
const CAN_BE_NA = new Set(["story", "world", "staying"]);

function validateAnalysis(a: AnalysisV2, genreKey: string): AnalysisV2 {
  for (const [key, r] of Object.entries(a.ratings)) {
    if (r.status === "not_applicable" && !CAN_BE_NA.has(key)) {
      throw new Error(`${key} cannot be not_applicable`);
    }
  }
  // Staying power applicability comes from the genre profile, not from the rater (it used to flip between runs).
  const staying = a.ratings.staying;
  if (!stayingApplies(genreKey)) {
    a.ratings.staying = {
      rating: null, status: "not_applicable", basis: "inferred", source: "genre profile", issue_ids: [],
      reason: "Complete by design; repeat play isn't part of this kind of game.",
    };
  } else if (staying.status === "not_applicable") {
    a.ratings.staying = {
      rating: null, status: "not_discussed", basis: "inferred", source: "", issue_ids: [],
      reason: "The sources we read don't cover this.",
    };
  }
  // An unrated measure has no supporting source; the rater sometimes wrote "general knowledge" there anyway.
  for (const r of Object.values(a.ratings)) {
    if (r.status !== "rated" && r.source !== "genre profile") r.source = "none";
  }
  return a;
}

function validateExtraction(e: Extraction): Extraction {
  const ids = new Set<string>();
  const seen = new Set<string>();
  for (const o of e.observations) {
    if (ids.has(o.id)) throw new Error(`duplicate observation id ${o.id}`);
    ids.add(o.id);
    seen.add(o.measure);
  }
  for (const [key, c] of Object.entries(e.coverage)) {
    // Claimed coverage with nothing listed is a failed extraction; observations on a "not discussed" measure just correct the flag.
    if (c.discussed && !seen.has(key)) throw new Error(`coverage says ${key} is discussed but no observation was listed`);
    if (!c.discussed && seen.has(key)) c.discussed = true;
  }
  return e;
}

/** Stage 1: read the sources and produce the merged, classified observation list. */
export function extractObservations(
  game: Game,
  reviewSources: ReviewSource[],
  genreKey: string,
  criticSnippets: CriticSnippet[] = [],
  config: ModelConfig = SCORING_CONFIG,
  promptOpts: PromptOptions = {},
  maxAttempts = 3
): Promise<StageResult<Extraction>> {
  return runStage({
    config,
    prompt: buildExtractPrompt(game, reviewSources, genreKey, criticSnippets, promptOpts),
    jsonSchema: extractionJsonSchema,
    parse: (t) => validateExtraction(parseExtraction(t)),
    maxAttempts,
  });
}

/** Stage 2: rate the 12 measures from the observation list. */
export function rateFromObservations(
  game: Game,
  genreKey: string,
  observations: Observation[],
  config: ModelConfig = SCORING_CONFIG,
  promptOpts: PromptOptions = {},
  maxAttempts = 3,
  coverage?: Coverage
): Promise<StageResult<AnalysisV2>> {
  return runStage({
    config,
    prompt: buildRatePrompt(game, genreKey, observations, promptOpts, coverage),
    jsonSchema: analysisV2JsonSchema,
    parse: (t) => validateAnalysis(parseAnalysisV2(t), genreKey),
    maxAttempts,
  });
}

/** Harness only: classify a frozen observation list without seeing the first run's labels. */
export function classifyObservations(
  observations: Observation[],
  config: ModelConfig = SCORING_CONFIG,
  maxAttempts = 2
): Promise<StageResult<Classification>> {
  return runStage({
    config,
    prompt: buildClassifyPrompt(observations),
    jsonSchema: classificationJsonSchema,
    parse: parseClassification,
    maxAttempts,
  });
}

/** Both stages end to end. */
export async function analyzeGameV2(
  game: Game,
  reviewSources: ReviewSource[],
  genreKey: string,
  criticSnippets: CriticSnippet[] = [],
  config: ModelConfig = SCORING_CONFIG,
  promptOpts: PromptOptions = {}
): Promise<AnalysisResult> {
  const extracted = await extractObservations(game, reviewSources, genreKey, criticSnippets, config, promptOpts);
  const rated = await rateFromObservations(game, genreKey, extracted.value.observations, config, promptOpts, 3, extracted.value.coverage);
  return { analysis: rated.value, observations: extracted.value.observations, coverage: extracted.value.coverage, extract: extracted.attempts, rate: rated.attempts };
}
