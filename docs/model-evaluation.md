# BS Meter AI model evaluation

**Scope:** `verdict-redesign` model and scoring code, the read-only data audit in [the branch evaluation](./verdict-redesign-evaluation.md), and current first-party model documentation checked on 2026-10-24. This is a design and evidence audit, not a live head-to-head model benchmark.

## Recommendation

Keep the current `gemini-2.5-flash` output as the **baseline**, but do not select a permanent provider yet. First repair source identity, freshness, duplicates, and claim provenance. Then benchmark the same frozen game evidence with `gemini-3.8-flash`, `gpt-6.1-sol`, and `claude-sonnet-5-5`. On the current evidence, **Gemini 3.8 Flash is the first upgrade candidate** because it stays within the existing integration and is materially cheaper per token than the two balanced cross-vendor challengers; that is an implementation/cost judgment, not a claim that it scores games more accurately. Use a stronger or independent model only for disputed, high-impact dimensions if the benchmark justifies it.

The model should extract and assess *supported claims*, while deterministic code computes BS/juice and current-price advice. A model with a larger context window or higher general benchmark score cannot make wrong IDs, stale sources, duplicate transcripts, or unsupported claims trustworthy.

## Current implementation

### One model performs every judgment — **High priority**

**What:** [`GEMINI_MODEL`](../src/lib/ai/gemini.ts#L12) is hard-coded to `gemini-2.5-flash`. The [v2 call](../src/lib/ai/v2/analyze.ts#L6-L34) sends one large prompt containing every stored usable YouTube transcript and Steam summary/review block, requests 12 ratings plus a headline and confidence in one JSON response, and retries the same request up to three times. It sets temperature to zero and validates the JSON shape. The [prompt](../src/lib/ai/v2/prompt.ts#L14-L51) explicitly allows ratings based on inference or general knowledge.

**So what:** Gemini 2.5 Flash is a legitimate, low-cost long-context model with structured output; Google says it remains supported, although it recommends newer models for new projects. [Google model documentation](https://ai.google.dev/gemini-api/docs/models), [Gemini 2.5 Flash](https://ai.google.dev/gemini-api/docs/models/gemini-2.5-flash). But one-pass scoring makes it difficult to separate faulty evidence selection from model judgment. JSON validity and `temperature: 0` do not verify that a reason is true, current, or grounded in the cited source. Larger models may write more persuasive unsupported explanations.

**Now what:** Split analysis into (1) per-source claim extraction with source ID, short passage or timestamp, game/edition/platform/version, and date; (2) corroboration, conflict, and source-age checks; and (3) a single 12-measure rating from the vetted claim set. Allow `insufficient_evidence` at measure level. Keep model-generated prose separate from deterministic index/verdict formulas.

### Sources are names rather than checkable evidence — **Critical**

**What:** The v2 rating schema accepts `source: string`, `basis: direct|inferred`, and `reason: string`; it has no source-row ID, excerpt, timestamp, or publication date requirement ([`schema.ts`](../src/lib/ai/v2/schema.ts#L4-L48)). The scorer selects **all** review-source rows for a game, including duplicates ([`score-v2.ts`](../src/lib/pipeline/score-v2.ts#L14-L18)). In the live audit, 69 of 276 v2 measure ratings (25%) were marked `inferred`; 29 (11%) named general or genre knowledge as source. Those labels are model-generated and may overlap; they are not an independent citation check.

**So what:** The site cannot reliably show why a measure got its rating. Repeated material can gain extra influence. A provider switch may change the wording or score while leaving the core trust problem intact.

**Now what:** Require structured evidence IDs for direct ratings, validate those IDs against the frozen input snapshot, and inspect whether the cited excerpt actually supports each decisive claim. Exclude duplicate source keys. Withhold or label a measure when support is sparse. Record the source snapshot, model ID, prompt version, rubric version, run timestamp, input/output tokens, and returned confidence; v2 currently saves neither the model ID for that run nor the returned confidence.

## Current model shortlist

The prices below are published **standard paid API text rates per million input/output tokens on this audit date**, before cache, batch, thinking, and other usage effects. These are comparison inputs, not measured BS Meter bills. All named models document structured output or an equivalent JSON-schema path and ample context for the present text workflow; task accuracy is unproven without an eval.

| Candidate | Published input / output | Fit and reason to test |
|---|---:|---|
| Current `gemini-2.5-flash` | $0.30 / $2.50 | Cheapest baseline already integrated; established long-context structured JSON. Google now directs new projects to newer Flash models. [Models](https://ai.google.dev/gemini-api/docs/models), [pricing](https://ai.google.dev/gemini-api/docs/pricing). |
| `gemini-3.8-flash` | $0.75 / $3.75 through 2026-12-31 | Lowest-friction candidate to test in the existing SDK; newer stable Flash. Price rises to $1.50 / $7.50 on 2027-01-01 under current published terms. [Models](https://ai.google.dev/gemini-api/docs/models), [pricing](https://ai.google.dev/gemini-api/docs/pricing). |
| `gpt-6.1-sol` | $2 / $10 | Balanced cross-vendor challenger with structured outputs; use the documented API and validate its schema behavior in a prototype. [OpenAI model comparison](https://developers.openai.com/api/docs/models/compare), [Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs). |
| `claude-sonnet-5-5` | $2 / $10 | Balanced cross-vendor challenger for nuanced editorial assessment; verify its structured-output implementation in a prototype. [Anthropic model overview](https://platform.claude.com/docs/en/models/overview). |

Flagship models such as GPT-6 Astra and Claude Opus 5.5 cost more per token than the balanced candidates in their published schedules; there is no BS Meter evidence yet that they produce better verdicts. [OpenAI model comparison](https://developers.openai.com/api/docs/models/compare), [Anthropic model overview](https://platform.claude.com/docs/en/models/overview). A smaller model could later handle source tagging or candidate filtering, but only after checking its claim-extraction precision on this dataset.

**Integration detail:** Gemini 3.8 Flash [supports structured outputs](https://ai.google.dev/gemini-api/docs/models/gemini-3.8-flash). OpenAI [requires `additionalProperties: false` on every object](https://developers.openai.com/api/docs/guides/structured-outputs) for its strict schema path, so the current handwritten Gemini schema would need adaptation. Claude Sonnet 5.5 [supports structured outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs), but Anthropic's native citation blocks cannot be combined with its strict JSON output in one request. Provider-neutral source IDs in BS Meter's own JSON schema would avoid depending on any provider's citation format.

## Head-to-head evaluation before choosing

**What:** There is no repository benchmark comparing providers against editor-verified BS/juice evidence. Existing numeric outputs and model-written confidence are not ground truth.

**So what:** A generic model leaderboard cannot establish which model best handles wrong-game matches, launch-versus-current bugs, mixed PC/console evidence, sparse review coverage, or the difference between a long game and a padded one.

**Now what:** Freeze a labeled set of about 20 diverse games and the exact same vetted sources for every candidate. Include deliberate hard cases: wrong edition, recently fixed bug, early access, missing transcript, conflicting expert/player reports, and severe but platform-specific defects. Have editors label each of the 12 measures with accepted evidence and acceptable rating range, then run current Gemini plus the three candidates on the same input. Repeat a subset to measure stability. Track:

1. **Evidence support:** percent of decisive claims whose cited passage actually supports them; fabricated or mismatched citation rate.
2. **Decision fit:** agreement with editor rating ranges and whether the resulting BS/juice/verdict would change a player's decision incorrectly.
3. **Time and platform accuracy:** launch/current separation, patch handling, edition match, and PC-versus-console scope.
4. **Abstention and calibration:** correctly marks insufficient evidence or provisional status; compare confidence with observed correctness.
5. **Operations:** JSON validity, latency, retries, token use, and dollars per game on identical inputs.

Choose the least expensive candidate that meets a predeclared evidence-support and decision-quality gate. Keep the current model if a challenger fails to improve those measures. Recheck after changing sources, rubrics, or model versions; the winner is specific to the evaluated pipeline.

## Immediate code changes independent of provider

1. Replace free-text `source` with a validated list of source IDs and passage offsets or review IDs.
2. Add `insufficient_evidence`, so a missing source cannot quietly become a confident score.
3. Deduplicate and select current, relevant evidence before the model call; separate player reports from expert reviews.
4. Do not put stale seed price in the quality-scoring prompt. Compute buy advice from a current store quote after the BS and juice assessment.
5. Save model, prompt, rubric, evidence snapshot, generation date, usage, and confidence for every v2 run.

## Evaluation limit

No live OpenAI or Anthropic calls were made, and no human-labeled game set exists in the project. The shortlist is based on current first-party model documentation and implementation fit. It cannot establish a universal or task-specific accuracy winner.
