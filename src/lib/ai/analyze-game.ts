import { getGeminiClient, GEMINI_MODEL } from "./gemini";
import { buildAnalysisPrompt } from "./prompts";
import {
  parseAnalysisResponse,
  analysisJsonSchema,
  type AnalysisResponse,
} from "./parse-response";
import type { Game, ReviewSource } from "@/lib/types";

export async function analyzeGame(
  game: Game,
  reviewSources: ReviewSource[],
  genreKey: string,
  redditSentiment?: string | null
): Promise<AnalysisResponse> {
  const client = getGeminiClient();
  const prompt = buildAnalysisPrompt(game, reviewSources, genreKey, redditSentiment);

  // Try up to 2 times (initial + 1 retry)
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await client.models.generateContent({
        model: GEMINI_MODEL,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseJsonSchema: analysisJsonSchema,
        },
      });

      const text = response.text;
      if (!text) throw new Error("Empty response from Gemini");

      return parseAnalysisResponse(text);
    } catch (error) {
      if (attempt === 1) {
        throw new Error(
          `Gemini analysis failed after 2 attempts: ${error instanceof Error ? error.message : String(error)}`
        );
      }
      console.warn(`Gemini attempt ${attempt + 1} failed, retrying...`, error);
    }
  }

  // This should never be reached due to the throw above
  throw new Error("Gemini analysis failed unexpectedly");
}
