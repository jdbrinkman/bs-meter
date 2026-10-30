import { getGeminiClient, type ModelConfig } from "../gemini";

export type AttemptKind = "ok" | "truncated" | "invalid" | "api_error";

/** One call to the model, whether it worked or not. Logged by the reliability harness. */
export type Attempt = {
  kind: AttemptKind;
  error?: string;
  finishReason: string | null;
  inputTokens: number;
  /** Visible output tokens only. */
  outputTokens: number;
  thinkingTokens: number;
  latencyMs: number;
  modelReturned: string | null;
  /** The raw response text, kept when the attempt failed so the failure can be inspected. */
  rawText?: string;
};

export class StageError extends Error {
  constructor(message: string, public attempts: Attempt[]) {
    super(message);
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Calls the model once for a stage and validates the JSON. A truncated or invalid response is retried
 * (up to maxAttempts model attempts in total); transient API errors (rate limit, 5xx) are retried separately
 * with backoff and do not count as model failures. Every attempt is returned so cost and failure rate are known.
 */
export async function runStage<T>(opts: {
  config: ModelConfig;
  prompt: string;
  jsonSchema: object;
  parse: (text: string) => T;
  maxAttempts?: number;
}): Promise<{ value: T; attempts: Attempt[] }> {
  const { config, prompt, jsonSchema, parse } = opts;
  const maxAttempts = opts.maxAttempts ?? 2;
  const client = getGeminiClient();
  const attempts: Attempt[] = [];
  let modelFailures = 0;
  let apiRetries = 0;
  let badRequestRetried = false;

  while (modelFailures < maxAttempts) {
    const started = Date.now();
    try {
      const response = await client.models.generateContent({
        model: config.model,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseJsonSchema: jsonSchema,
          maxOutputTokens: config.maxOutputTokens,
          ...(config.temperature !== undefined ? { temperature: config.temperature } : {}),
          thinkingConfig: { thinkingLevel: config.thinkingLevel as never },
        },
      });
      const u = response.usageMetadata;
      const base = {
        finishReason: (response.candidates?.[0]?.finishReason as string | undefined) ?? null,
        inputTokens: u?.promptTokenCount ?? 0,
        outputTokens: u?.candidatesTokenCount ?? 0,
        thinkingTokens: u?.thoughtsTokenCount ?? 0,
        latencyMs: Date.now() - started,
        modelReturned: response.modelVersion ?? null,
      };
      const text = response.text ?? "";
      if (base.finishReason === "MAX_TOKENS") {
        attempts.push({ ...base, kind: "truncated", error: "hit max output tokens", rawText: text });
        modelFailures++;
        continue;
      }
      try {
        if (!text) throw new Error("empty response");
        const value = parse(text);
        attempts.push({ ...base, kind: "ok" });
        return { value, attempts };
      } catch (e) {
        attempts.push({ ...base, kind: "invalid", error: e instanceof Error ? e.message : String(e), rawText: text });
        modelFailures++;
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      attempts.push({
        kind: "api_error", error: message.slice(0, 500), finishReason: null,
        inputTokens: 0, outputTokens: 0, thinkingTokens: 0, latencyMs: Date.now() - started, modelReturned: null,
      });
      // Only transient errors are worth retrying; an auth error will not fix itself. A 400 is retried once: one
      // appeared in testing with no bad input found, and the same call succeeded on a second try.
      const transient = /\b(429|500|502|503|504)\b|RESOURCE_EXHAUSTED|UNAVAILABLE|DEADLINE|fetch failed|ECONNRESET|ETIMEDOUT/i.test(message);
      const badRequest = /\b400\b|INVALID_ARGUMENT/i.test(message);
      if (badRequest && !badRequestRetried) {
        badRequestRetried = true;
        await sleep(3000);
        continue;
      }
      if (!transient || ++apiRetries > 5) {
        throw new StageError(`Gemini call failed: ${message.slice(0, 300)}`, attempts);
      }
      await sleep(4000 * apiRetries);
    }
  }
  const last = attempts[attempts.length - 1];
  throw new StageError(`Stage failed after ${maxAttempts} attempts: ${last?.error ?? "unknown"}`, attempts);
}
