# BS Meter: verdict-redesign evaluation

**Reviewed:** `verdict-redesign` at `bff83e9` against `main` at `c7f0eb2`  
**Data snapshot:** read-only Supabase queries on 2026-10-24 (America/Los_Angeles)  
**Decision:** **Not ready to present v2 verdicts as current, evidence-backed buying advice across the full catalog.** The model is a promising direction, but the rollout, freshness, source integrity, and explanation path need repair before that claim is supportable.

## Executive summary

- **Coverage:** All 35 games are marked `complete` and have a score row, but only **23/35 (66%)** have ratings, both v2 indexes, and a v2 verdict. The other 12 show no new verdict on cards or detail pages. The normal processing path still writes v1; v2 is a separate manual call.
- **Version conflict:** Among the 23 games with v2, **13/23 (57%)** fall into a different BS tier under the displayed v2 index than under the v1 score used by home and browse filters.
- **Source quality:** There are **146 review source rows**: 110 YouTube and 36 Steam. **30/146 (21%)** lack transcript text. **28/146 (19%)** are additional rows for the same game, source type, and video/app ID. Re-ingestion appends sources without deduplication, so repeated material can influence the model more than once.
- **Game identity:** A live IGDB ID check found three confirmed release-date mismatches: The Witcher 3 is stored with a game bundle's 2018 date rather than 2015; Hollow Knight has 2023 rather than 2017; Silksong has 2021 rather than 2025. The Witcher 3 ID itself resolves to a bundle that also names Dark Souls III.
- **Freshness:** **32/35 (91%)** games were last analyzed more than 90 days before this audit; **135/146 (92%)** source rows were fetched more than 90 days ago. The newest analysis and source fetch are both October 6, 2026. The verdict nonetheless claims to rate games “today.”
- **Fit to purpose:** The new 12-measure model covers padding, grind, monetization, repetition, friction, bugs, and positive game qualities. That fits a time-and-money decision better than the old nine dimensions. But the purchase verdict uses a static seed price, a cross-platform “best-supported platform” bug rubric, and source claims that cannot be traced to an exact excerpt. These choices can materially change advice for a specific buyer.
- **Release recommendation:** Finish a source-aware v2 backfill, refresh the underlying evidence, validate a small anchor set with human reviewers, then make the public UI and methodology use one version. Until then, label missing or weak-evidence verdicts as unrated or provisional.

## Intended use and evidence standard

The owner clarified the main goal: an alternative to a Metacritic-style score that shows whether a game is **worth the player's time**, how much **BS** it has, and what **juice** it offers. “Buy” is the presentation being explored on this branch, not yet the settled primary metric. The owner wants **current store price** to inform buy advice and **clearly labeled provisional verdicts** for unreleased or early access games. A dependable result therefore needs a correctly matched game, representative and current evidence, a defined store/platform context, traceable reasons, and consistent public presentation.

The unit of analysis is one game. The intended score grain is one current score per game; review evidence is many source records per game. The audit checked repository code, migrations, deployment build, and aggregate live rows. It did **not** independently adjudicate whether each game's actual quality, price, release status, or reviewer statements are factually correct. No external provider was written to or refreshed during the audit.

## Data flow reviewed

| Stage | Current behavior | Main quality risk |
|---|---|---|
| Seed | Curated titles, slugs, fixed USD price, optional Steam/IGDB IDs, and manual completion times in [`seed-games.ts`](../src/config/seed-games.ts) | Fixed price and manually entered values can become stale; matching overrides need verification. |
| Metadata | IGDB exact slug for a few seeds, otherwise first fuzzy title result in [`igdb.ts`](../src/lib/api/igdb.ts#L49-L85) | Wrong edition or game can become the canonical record. |
| Time and critic data | HLTB integration is a stub; seed values are used. OpenCritic takes the first search result in [`hltb.ts`](../src/lib/api/hltb.ts) and [`opencritic.ts`](../src/lib/api/opencritic.ts#L16-L36) | Coverage and title matching are not verified; 10/35 complete games have no main-story hours. |
| Reviews | One YouTube search per curated channel, optional transcript; 20 recent Steam reviews, plus a Steam summary. Reddit sentiment is an optional Perplexity summary ([`youtube.ts`](../src/lib/api/youtube.ts), [`steam.ts`](../src/lib/api/steam.ts#L80-L145), [`reddit.ts`](../src/lib/api/reddit.ts)) | Missing captions, title-only relevance checks, one-page Steam selection, and transient Reddit summary limit representativeness and auditability. |
| Storage | Game fields are updated separately; review sources are inserted on every ingest ([`ingest.ts`](../src/lib/pipeline/ingest.ts)) | Partial writes, stale fields, duplicates, and no source-version snapshot. |
| v1 scoring | Gemini rates nine dimensions; old scores/signals are deleted and rewritten ([`process.ts`](../src/lib/pipeline/process.ts#L20-L103)) | A failed rewrite can remove a prior result. This remains the standard processing path. |
| v2 scoring | Gemini rates 12 measures; deterministic juice/BS indexes and a verdict are saved into an existing score row ([`score-v2.ts`](../src/lib/pipeline/score-v2.ts)) | No automatic v2 promotion, no evidence gate, no persisted v2 confidence or v2 analysis timestamp. |
| Publication | Detail/cards read v2 fields, home filters and `/games` still read v1 BS tiers ([detail](../src/app/games/%5Bslug%5D/page.tsx), [home](../src/app/page.tsx#L75-L100), [games](../src/app/games/page.tsx#L75-L100)) | Visitors can see inconsistent definitions and blank v2 verdicts. |

## Findings: what, so what, now what

### 1. V2 is only partially populated and is not part of the ordinary pipeline — **Critical, high confidence**

**What:** The live database has 35 complete games and 35 score rows, but only 23 complete v2 result sets. Twelve game slugs lack a v2 verdict, including `hades`, `hollow-knight`, `starfield`, and `final-fantasy-vii-rebirth`. [`processGame`](../src/lib/pipeline/process.ts#L120-L138) invokes v1 `scoreGame`; [`scoreGameV2`](../src/lib/pipeline/score-v2.ts#L9-L38) is only exposed through a separate route. A v2 update also does not check that it matched a score row before returning success.

**So what:** “Complete” currently means v1 complete, while new cards and detail pages rely on v2 fields. Missing verdicts can appear to be a product judgment or a broken page. Newly seeded games will remain in this state until someone separately runs v2.

**Now what:** Define one publication state: `v2_ready` only after required inputs, successful v2 score write, and quality gates. Make seeding/refresh enqueue both stages or explicitly keep the game unpublished. Backfill all 12 missing games, verify the updated row count, and make a zero-row v2 update fail.

### 2. The evidence is too old to support a “today” claim — **High, high confidence**

**What:** 32/35 analyses and 135/146 source records are over 90 days old. The oldest analysis is March 22, 2026, the oldest source March 20, and the newest in both groups October 6. No scheduled refresh is implemented (the [project plan](../projectplan.md) still lists it for phase 3). The v2 [prompt](../src/lib/ai/v2/prompt.ts#L42-L50) and [broken rubric](../src/lib/scoring/v2.ts#L77-L80) direct the model to assess the game “today,” but source publication dates are not included in the prompt.

**So what:** Patches, monetization, performance, reviews, and price can change after the captured material. A model instruction cannot make older evidence current. `rough_launch` and “Not yet” are especially sensitive to this gap.

**Now what:** Persist source `published_at`, fetch time, platform, and score `evaluated_at`/`evidence_as_of`. Establish different refresh windows for stable metadata and volatile bugs, monetization, reviews, and price. Suppress or mark current-state claims when the evidence age exceeds the defined window. Refresh the 32 old analyses before calling the catalog current.

### 3. Re-ingestion duplicates review material — **High, high confidence**

**What:** 28 source rows are extra copies of a game/source-type/video-or-app key, spread across 26 keys; 24 extra rows are YouTube and four are Steam. [`ingestGameData`](../src/lib/pipeline/ingest.ts#L115-L142) inserts after each fetch, and the [migration](../supabase/migrations/004_create_review_sources.sql) has no unique constraint. The [v2 prompt](../src/lib/ai/v2/prompt.ts#L14-L19) concatenates every matching transcript.

**So what:** Repeated reviews can crowd out independent sources and bias a dimension rating. Extra rows also increase model input size and cost. The source count shown to the model is not an independent-evidence count.

**Now what:** Choose a stable key `(game_id, source_type, provider_id)` and upsert the current version or version it explicitly. Deduplicate existing rows after comparing timestamps and text; count independent reviewers and usable transcripts before scoring. Add a database uniqueness rule and a duplicate-rate check.

### 4. Evidence gaps and unsupported inference are not visible enough — **High, high confidence**

**What:** 30/146 source rows have no transcript. Across the 23 v2 games, 69/276 measure ratings (25%) are marked `inferred`; 29/276 (11%) list “general knowledge” or “genre knowledge” in their source field (these groups can overlap). Three v2 games have no usable YouTube transcript; all three have at least one other transcript. V2 stores model-generated `reason`, free-text `source`, and `basis`, but the [detail page](../src/app/games/%5Bslug%5D/page.tsx#L156-L186) displays only the reason and a separate source list.

**So what:** The site can look equally certain when a claim is supported by a specific review and when it is extrapolated. A source label such as “SkillUp” is not proof that a specific statement appears in that review; source lists do not connect evidence to individual measures.

**Now what:** Store structured evidence references per measure: source row ID, excerpt or timestamp, platform, published date, and direct/inferred status. Validate that each cited source exists and supports the reason; show a source link beside each rating. Gate or prominently label verdicts when too many decisive measures are inferred. Keep model confidence as a diagnostic, and calibrate it against human review before displaying it as a probability.

### 5. Game identity is wrong for several records, and review selection can bias scores — **Critical, high confidence for confirmed mismatches**

**What:** IGDB and OpenCritic default to the first search hit ([`igdb.ts`](../src/lib/api/igdb.ts#L49-L66), [`opencritic.ts`](../src/lib/api/opencritic.ts#L16-L36)). A read-only batch query resolved all 33 stored IGDB IDs. Three stored dates are demonstrably for the wrong release or wrong record: The Witcher 3's stored IGDB result is “The Witcher 3: Wild Hunt + Dark Souls III” dated **2018-10-26**, while the developer dates the game **2015-05-19** ([CD Projekt](https://www.thewitcher.com/us/en/news/1030/the-witcher-3-wild-hunt-now-available-for-preload-on-gog-com-and-steam)); Hollow Knight is stored as **2023-11-13**, while its [Steam page](https://store.steampowered.com/app/367520/) and [developer](https://www.teamcherry.com.au/blog/hollow-knight-silksong-revealed) date the original **2017-02-24**; Silksong is stored as **2021-07-28**, while its [Steam page](https://store.steampowered.com/app/1030300/Hollow_Knigh1t_Silksong/?l=english) and [developer](https://www.teamcherry.com.au/blog/silksong-available-now) date release **2025-09-04**. Two other games lack IGDB IDs. YouTube accepts a result when 60% of significant title words occur, without checking edition or review type beyond a short exclusion list ([`youtube.ts`](../src/lib/api/youtube.ts#L41-L71)). Steam takes up to 20 recent English reviews without a reproducible positive/negative or playtime sample ([`steam.ts`](../src/lib/api/steam.ts#L101-L123)).

**So what:** The wrong IGDB record can supply incorrect cover, release year, genre, platform, and company fields to the prompt. The v2 verdict's “Not yet” rule uses release age, so a wrong date can directly change advice. The Witcher 3 cover mismatch noted in the project plan is consistent with this provider record mismatch, although the displayed image itself was not independently checked. A wrong video, preview, benchmark, or unusually vocal recent group can also alter verdict inputs while passing current checks.

**Now what:** Correct the three confirmed IGDB mappings and re-ingest their metadata and cover art, then re-score any verdict that used the wrong release year or genre. Resolve provider identities using title, edition, release date, platform, and known IDs; quarantine ambiguous matches for manual review. For videos, keep channel/video/published date and classify review vs preview vs technical analysis. For Steam, store sampling parameters and use stratified positive/negative and recent/all-time cuts. Compare source coverage by genre and platform before expanding the catalog.

### 6. The purchase recommendation is tied to a fixed price and an implicit platform — **High, high confidence**

**What:** [`deriveVerdictV2`](../src/lib/scoring/v2.ts#L150-L166) changes its juice threshold at `$40` and treats a missing price as `$0`. The price is seeded from [`seed-games.ts`](../src/config/seed-games.ts) or manually passed to game creation; ingestion does not fetch current prices. The `broken` rubric rates the “best-supported platform,” while the verdict and cards do not name a platform.

**So what:** “Wait for a sale” and “Worth it” can become wrong as store prices change, and a player on a troubled platform may receive advice based on a different platform's condition. A $40 cutoff creates a hard verdict flip for a small price change without evidence that it matches users' value judgments.

**Now what:** Use the owner's chosen **current store price** for buy advice, with amount, currency, edition, platform/store, observed time, and expiration; display the price basis next to the verdict. If that feed is unavailable or stale, label buy advice provisional. Make technical quality platform-specific or clearly label the platform assessed. Run sensitivity cases around $40 and the verdict thresholds with human-labeled examples.

### 7. The new scoring rules are plausible but unvalidated — **High, high confidence for missing validation**

**What:** Juice is a weighted average across applicable measures; BS is the top three squeeze ratings weighted 50/30/20; verdict thresholds are hand-coded ([`v2.ts`](../src/lib/scoring/v2.ts#L96-L166)). As a deterministic edge case, one 5/5 squeeze problem and five 0/5 problems yield BS 50/100; a game with juice 80/100 and price below $40 would still receive “Worth it.” The schema allows fractional 0–5 ratings although the prompt asks for whole numbers, and it does not enforce squeeze applicability, evidence links, or reason length ([`schema.ts`](../src/lib/ai/v2/schema.ts#L4-L19)). The project plan still lists anchor-game and repeat-run/source-drop checks as unfinished.

**So what:** A single severe issue can drive BS yet leave a positive purchase verdict; whether that is right depends on how strongly BS should cap the advice. The exact weights and cutoffs may give unintuitive verdicts. The model may vary under different source sets. Passing JSON validation demonstrates shape, not editorial accuracy or decision usefulness.

**Now what:** Build a blinded anchor set across genres, price bands, release ages, and platform conditions. Have at least two human reviewers label each measure and purchase verdict, reconcile disagreements, then compare v2 output. Test repeated runs, removal of one source, duplicate-source injection, and threshold edge cases. Version prompts, formulas, weights, and source snapshots so a verdict can be reproduced.

### 8. Public pages and methodology mix v1 and v2 — **High, high confidence**

**What:** Home and `/games` filter/sort on v1 `bs_score` and [`BS_TIERS`](../src/lib/scoring/brackets.ts#L76-L91), while cards and game detail show the v2 BS index/verdict. In the live data, 13/23 v2 games map to a different tier after converting v2's 0–100 index to the old 0–10 tier scale. For example, Elden Ring is 2.4 (“Respectful”) in v1 and 50/100 (“Tolerable”) in v2; Resident Evil 4 Remake is 1.4 (“Respectful”) in v1 and 46/100 (“Tolerable”) in v2. The detail page shows 12 measures, while [methodology](../src/app/about/page.tsx#L35-L65) describes nine dimensions and genre-adjusted BS weights. `/api/games` still filters `scores.bracket`, a column renamed to `verdict` in migration 006 ([route](../src/app/api/games/route.ts#L8-L40), [migration](../supabase/migrations/006_update_scores_schema.sql#L20-L27)).

**So what:** Users can select a “Respectful” tier derived from the old 0–10 score and see a game whose displayed v2 BS index implies a different tier. The methodology cannot explain the visible verdict. The API bracket filter can error if used.

**Now what:** Pick one canonical public scoring version and derive filters, sorting, labels, API fields, cards, detail, and methodology from it. Migrate or explicitly sunset v1 routes and types. Add a page-level check that the shown filters and displayed index use the same version.

### 9. Writes and refreshes lack an atomic, observable quality gate — **Medium, high confidence**

**What:** Ingestion makes separate updates and ignores many Supabase write errors ([`ingest.ts`](../src/lib/pipeline/ingest.ts)). V1 deletes scores and signals before reinserting them, without a transaction ([`process.ts`](../src/lib/pipeline/process.ts#L50-L103)). `recomputeAllV2` does not check select/update errors and can return partial results ([`score-v2.ts`](../src/lib/pipeline/score-v2.ts#L43-L61)). `updated_at` has a default but no update trigger in migrations. V2 does not record the model's returned confidence or when v2 was run.

**So what:** Failed or partial work may look successful, old scores can be lost, and there is no reliable way to distinguish recently re-evaluated evidence from an older v1 `analyzed_at`. Retries can create duplicates, especially after timeouts.

**Now what:** Write each run to a staging/run record, validate source counts and score fields, and atomically promote a ready version. Check every database error and affected-row count. Store ingest/scoring run IDs, timestamps, prompt/formula version, and source snapshot IDs. Add idempotent retries and a small health dashboard for failed, stale, and incomplete runs.

### 10. The project documents claim more automation than the code provides — **Medium, high confidence**

**What:** HLTB is explicitly a stub ([`hltb.ts`](../src/lib/api/hltb.ts)); current ingestion can only use manual seed fallback for playtime values. Reddit is an optional Perplexity summary returned in memory, and [`scoreGameV2`](../src/lib/pipeline/score-v2.ts#L9-L18) does not pass it to the v2 prompt. OpenCritic stores aggregate score/tier rather than review snippets. The [project plan](../projectplan.md) and [methodology](../src/app/about/page.tsx#L35-L54) describe a broader automated review pipeline.

**So what:** A visitor or maintainer may overestimate source coverage and reproducibility. Data omissions may be mistaken for a judgment that no problem exists.

**Now what:** Update public methodology to say what is actually used for v2, including manual HLTB, optional/unused Reddit, source dates, and coverage limits. Either persist a sourced Reddit artifact and use it consistently, or remove it from the claimed v2 evidence path. Record provenance for manual completion times.

### 11. The release lifecycle cannot drive the provisional label reliably — **Medium, high confidence**

**What:** The schema has a `release_date` but no release-state or early-access field ([`games` migration](../supabase/migrations/001_create_games.sql#L1-L37)). Two complete games have a null release date, and no stored release date is in the future in this snapshot. The v2 “Not yet” rule treats an unknown release date as very old ([`v2.ts`](../src/lib/scoring/v2.ts#L157-L161)). None of these fields identifies early access, preview evidence, or a provisional score.

**So what:** The owner wants unreleased and early access games to show a clearly labeled provisional verdict, but the current data model cannot distinguish them consistently. A missing or wrong date can also change the “Not yet” result.

**Now what:** Add a reviewed release state (`unreleased`, `early_access`, `released`, or equivalent) with source, last checked time, and manual override. Store `verdict_status` separately from the verdict (`final`, `provisional`, `unrated`). Use release state and evidence quality to determine that label; do not infer it only from a date.

## Measured quality profile

| Check | Result | Interpretation |
|---|---:|---|
| Complete games / score rows | 35 / 35 | No missing score row among complete games in this snapshot. |
| Complete games with v2 result | 23 / 35 (66%) | Public v2 rollout is incomplete. |
| V2 games whose BS tier differs from v1 | 13 / 23 (57%) | Old filters can contradict the displayed index. |
| Source rows with no transcript | 30 / 146 (21%) | These rows are listed as sources but do not provide transcript content to the model. |
| Duplicate source rows beyond first | 28 / 146 (19%) | At least some inputs are overweighted on re-ingest. |
| Analyses older than 90 days | 32 / 35 (91%) | Current-state assertions need refreshed evidence. |
| Source rows older than 90 days | 135 / 146 (92%) | Same freshness concern at input level. |
| V2 ratings marked inferred | 69 / 276 (25%) | Inference is common and needs visibility or gating. |
| V2 ratings citing general/genre knowledge | 29 / 276 (11%) | Not attributable to a stored review; overlaps with inferred ratings. |
| Complete games missing main-story hours | 10 / 35 (29%) | Manual HLTB coverage is partial. |
| Confirmed wrong stored release dates in IGDB cross-check | 3 / 33 with IGDB IDs | Entity matching can corrupt date and other metadata. |

The source counts use the database row grain, not unique reviews or independent reviewers. The duplicate key used here was `(game_id, source_type, video_id)`; a more complete provider identity audit may find additional near-duplicates. The 90-day threshold is a diagnostic chosen for this review, not an approved product service level. The inferred and general-knowledge counts are output labels generated by the model, not independently verified citation quality.

## Prioritized improvement plan

1. **Before v2 release:** Write the time-respect/BS/juice promise in product terms; decide how prominently the experimental buy verdict should appear and which platform/store it represents. Use current store price for buy advice. Show unreleased or early access results as **provisional**, and make the 12 missing v2 results visible as **unrated**. Align home, browse, detail, API, and methodology on one version.
2. **Repair the evidence pipeline:** Correct the confirmed IGDB mismatches first. Deduplicate and upsert sources; save publication date, platform, provider ID, selection method, and manual-data provenance. Refresh stale inputs. Quarantine ambiguous game/video matches. Preserve prior published scores during a failed run.
3. **Prove the verdict:** Human-review an anchor set and measure agreement, repeated-run stability, source-drop sensitivity, and threshold sensitivity. Add citation checks and a minimum evidence rule before promoting a result. Review especially the “Not yet” rule and $40 price boundary.
4. **Operate it:** Add scheduled freshness checks, run-level logs and errors, a v2 backfill/refresh queue, and a small set of stable data tests: one canonical score per game, unique current provider source, no ready verdict without required ratings, valid ranges, non-null provenance, and age within the chosen service level.

### Suggested release gate

The following are proposed gates, not measured commitments: 100% of publicly rated games have a v2 result; zero duplicate current source keys; every public rating has a source snapshot and evaluation date; decisive ratings have inspectable evidence or an explicit inference label; the anchor set meets an agreed human-review standard; page filters and methodology match the displayed version. Buy advice has a current store/edition/platform price. Unreleased and early access games carry a provisional label. A game that fails a gate should stay unscored or provisional rather than silently inheriting v1 completion.

## Checks performed and limits

- Compared `verdict-redesign` to `main`, traced seed → provider fetch → storage → v1/v2 scoring → public display, and reviewed all eight SQL migrations.
- Read-only Supabase profile of games, scores, review sources, and signals; inspected status, v2 completeness, source-type and transcript coverage, duplicate keys, nulls, date ranges, and v2 rating basis/source fields. A read-only IGDB batch query checked all 33 stored IDs and dates against the provider response. No re-ingestion or score writes were made.
- `npx tsc --noEmit` passed. `npm run lint` passed with two existing unused-variable warnings. `npm run build` passed when allowed to fetch its configured Google Fonts; it warned that Next.js inferred a workspace root from another lockfile.
- A read-only spot check of the Steam summary endpoint for Hades, Elden Ring, and Starfield returned HTTP 200 with an HTML response rather than JSON, including with the application's User-Agent. This environment-specific result could not establish current Steam values. The application catches such failures and returns `null`, so it needs explicit source health monitoring. It is not proof that production requests fail the same way.
- This review did not replay Gemini, verify source excerpts against the original videos, compare every stored game field with IGDB, compare OpenCritic live records, inspect RLS in the deployed database, or conduct user research. Those are necessary to validate factual correctness and buyer usefulness, rather than just pipeline integrity.

## Open product decisions

1. Should “Worth it / Wait / Skip” remain a top-line summary, or should BS and juice be the top-line measures with purchase advice underneath?
2. Is the verdict global, or should technical condition and current price be specific to a platform/store?
3. What minimum independent evidence and freshness window are acceptable for a public verdict?
