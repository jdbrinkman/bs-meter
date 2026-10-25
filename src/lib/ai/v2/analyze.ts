import { getGeminiClient, GEMINI_MODEL } from "../gemini";
import { buildPromptV2 } from "./prompt";
import { analysisV2JsonSchema, parseAnalysisV2, type AnalysisV2 } from "./schema";
import type { Game, ReviewSource } from "@/lib/types";

export async function analyzeGameV2(
  game: Game,
  reviewSources: ReviewSource[],
  genreKey: string
): Promise<AnalysisV2> {
  const client = getGeminiClient();
  const prompt = buildPromptV2(game, reviewSources, genreKey);

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await client.models.generateContent({
        model: GEMINI_MODEL,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseJsonSchema: analysisV2JsonSchema,
          temperature: 0,
        },
      });
      if (!response.text) throw new Error("Empty response from Gemini");
      return parseAnalysisV2(response.text);
    } catch (error) {
      if (attempt === 2) {
        throw new Error(`Gemini v2 analysis failed: ${error instanceof Error ? error.message : String(error)}`);
      }
      await new Promise((r) => setTimeout(r, 4000 * (attempt + 1)));
    }
  }
  throw new Error("unreachable");
}
