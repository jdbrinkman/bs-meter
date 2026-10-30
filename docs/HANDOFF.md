# Handoff: implement the new rubric, build the test harness, run the reliability tests

Branch `verdict-redesign` (local, nothing pushed, `main` untouched). Last commit `eefb07b`; **everything below is uncommitted** (see "Uncommitted work"). Read `CLAUDE.md` (thesis), `projectplan.md`, `docs/scoring-rubric.md`, `docs/reliability-test-plan.md`, and `docs/genre-profiles.md` first. This file is the map.

## What BS Meter is
**Thesis: is this game worth your time?** One verdict per game (Worth it / Wait for a sale / Not yet / Skip) plus two 0-100 numbers: **Juice** (what earns your time) and **BS** (what wastes it). The AI rates 12 measures; fixed code computes the numbers and verdict. The AI never picks the verdict. Price enters through the verdict (Steam's current price), not the ratings.

## Where we are
Design is settled (below). The code is only partly on the new rubric. The next job is: **finish implementing the rubric, build the test harness, run the reliability tests with a $10 budget, then re-score all games.**

### Decisions already made (don't relitigate)
- **The BS side, 6 measures:** Padding (low value), Grind (gated), Friction (operating/moving through the game), Repetition (low variety), Pacing (timing), Broken (technical state). Monetization and Manipulation were dropped (not about time). Time-savers sold alongside padding/grind count as evidence for Padding/Grind.
- **The Juice side, 6 measures:** Story, Gameplay, World, Presentation, Challenge, Staying power (not applicable unless the design relies on repeat play).
- **Scale 1-5 both sides** (BS labels: Negligible, Minor, Moderate, Major, Severe; Juice: Poor to Best in class); indexes use `(r - 1) / 4`. Not applicable and "not discussed" are empty values the index skips, never a 1.
- **One complaint, one measure.** BS decision order, first match wins: Broken > Grind > Friction > Padding > Repetition > Pacing. A complaint is an *issue* (same issue from several sources = one issue with a corroboration count).
- **Staged pipeline:** call 1 extracts/merges/classifies issues with quotes; call 2 rates each measure from that list; code computes indexes.
- Verdict price = Steam's current price; critics are sources only; no browser-impersonation scraping; BS = worst three weighted 50/30/20 is **under test, not final**.
- Full rubric text, anchors, and tie-breakers: `docs/scoring-rubric.md`.

### Done in code (uncommitted)
- **Genre profiles** (`docs/genre-profiles.md`): explicit per-game assignment in `src/config/game-profiles.ts` (38 games, mapper kept as fallback), neutral guidance + new profiles in `src/config/genre-weights.ts` (Multiplayer / live service, Turn-based tactics), Juice measures (incl. Presentation, Staying power) and `JUICE_WEIGHTS` rewritten in `src/lib/scoring/v2.ts`. `score-v2.ts` uses `resolveGenreKey`. Assignments and weights are my hand-set starting points; Jordan has not reviewed them.
- **YouTube lookup fixes** (`src/lib/api/youtube-lookup.ts`, `src/config/known-expansions.ts`, `scripts/test-youtube.mjs`): expansions/DLC rejected via extra sibling titles, roman numerals up to XX, reject filter ignores quoted text. Run `node --no-warnings scripts/test-youtube.mjs match` (all pass).
- **Data:** 38 games ingested (35 original + XCOM 2, FFT Ivalice Chronicles, Lorelei and the Laser Eyes), none of the three scored. 6 wrong-game YouTube rows deleted. Still stored but rejected by the matcher: DF "Mass Effect Legendary Edition" tech breakdown (ME3) and SkillUp "Dead Space (2023)" (correct game).

### NOT done (this is your work)
1. **`src/lib/scoring/v2.ts`:** squeeze measures (add Pacing, remove Monetization, update Padding/Repetition/Friction/Broken rubrics to the doc), the 1-5 scale and `(r - 1) / 4` math in `computeJuiceIndex`/`computeBsIndex`, empty-value handling (BS index currently does `?? 0`, which treats missing as clean; must skip), provisional flag when too many measures lack coverage, `rough_launch` kept. Keep `VERDICT_RULES` but expect to re-tune after the re-score (`POST /api/recompute-v2`).
2. **`src/lib/ai/v2/schema.ts`:** rating 1-5, coverage/"not discussed", issue list with quote, source, category, corroboration count.
3. **`src/lib/ai/v2/prompt.ts`:** rewrite for the staged pipeline, decision order, one-complaint rule, full 1-5 anchors with worked examples and the tie-breakers (Padding/Grind, Padding/Repetition, Repetition/Pacing, Friction/Pacing, Friction/Grind), minimum evidence per measure, N/A rules.
4. **`src/lib/ai/v2/analyze.ts` + `src/lib/ai/gemini.ts`:** model is hard-coded `gemini-2.5-flash` (legacy). Make model and thinking level configurable; save the model ID that actually answered with every run. Verify Google's temperature guidance for 3.x models (the code sets `temperature: 0`); thinking tokens count toward `max_output_tokens`.
5. **UI:** game page (`src/app/games/[slug]/page.tsx` `MeasureColumn`: dots, N/A, "not discussed", no `?? ` assumptions), About page (renders from `v2.ts`), banded/rounded numbers (five-level ratings do not support one-point precision).
6. **Test harness** (below), then update `projectplan.md` as items complete (CLAUDE.md rule).

Old stored ratings use the old keys (`content`, `replay`, `monetization`) and are incompatible: **don't run `/api/recompute-v2` until after the re-score.**

## The reliability test (the goal)
Full plan with thresholds and decision rules: `docs/reliability-test-plan.md`. AI-only inter-rater reliability: score a fixed game set many times with two models and measure consistency. **No human rates anything.** Consistency is not accuracy; Jordan judges accuracy.

- **Models:** `gemini-3.8-flash` (thinking medium; min is low, can't be off) vs `gemini-3.5-flash-lite` (thinking medium; default is minimal, too low). Billing is on. Choose the cheapest that passes; Batch API (50% off) for Phases 1-2.
- **Budget $10.** Harness cost meter stops at $8. Expected $4.50-6.10, worst case $7.70-9.90. Run the pilot first and project the real cost before Phase 1; follow the spend ladder in the plan if over $8.
- **Dev set (7), slugs:** `lorelei-and-the-laser-eyes`, `xcom-2`, `final-fantasy-tactics-the-ivalice-chronicles`, `assassins-creed-valhalla`, `redfall`, `hades-2`, `the-witcher-3-wild-hunt`.
- **Confirmation set (3), run once at the end, never tuned on:** `sekiro-shadows-die-twice`, `the-last-of-us-part-2-remastered`, `marvel-rivals`. The anchors are here on purpose: don't tune wording until they give the expected verdict.
- **Phases:** 0 pilot (2 games x 2 runs x 2 configs) > 1 test-retest (7 x 5 runs x 2 configs) > 2 stage noise (frozen reruns of classification and rating) > 3 robustness (Witcher 3, Valhalla, Redfall: shuffled sources, duplicates, reworded prompt, hidden title; winning config only) > 4 decision > 5 confirmation.
- **Harness rules:** the harness must **not** call `scoreGameV2` (it upserts the live score row). Write every run to files under `tmp/irr/` (`/tmp/` is now in `.gitignore`). Snapshot and hash each game's evidence before the first run so differences come from the model. Record per run: model ID returned, thinking level, prompt/rubric/schema versions, evidence hash, input/output/thinking tokens, finish reason, latency, all stage outputs. Retry a truncated or invalid run once and report the failure rate. Metrics need Krippendorff's alpha (ordinal, missing-value tolerant), Cohen/Fleiss kappa, ICC; implement in the analysis script (no human labels needed). Final report: `docs/reliability-results.md`.
- **Plausibility checks (no human rater):** Padding vs the HowLongToBeat main-to-completionist gap and achievement rates; Broken vs recent Steam negatives; title masking; genre-bias distributions; quote spot-check.
- After the tests pass: re-score all 38 games with the chosen config, then `POST /api/recompute-v2`, then Jordan reviews anchors (Sekiro, TLOU2, Onimusha: look at reasons and sources, don't force results).

## Operating notes
- `npm run audit` (health checks; pre-existing FAIL: games with no v2 ratings), `node --no-warnings scripts/test-*.mjs` (offline tests: youtube, igdb, opencritic, steam, itad, hltb). `npx tsc --noEmit` has two stale errors from `.next/types` (old route names), ignore. `npm run lint` has 4 old warnings, 0 errors.
- Ingest routes (all `POST`, header `x-api-key: $ADMIN_API_KEY`): `/api/ingest/{youtube,critics,steam,igdb,time,prices}` with `{gameId}`; `/api/ingest/prices` takes no id. `/api/seed` **scores** games (Gemini spend): don't use it to add games; insert the `games` row and run the ingest routes. `/api/covers` walks every game.
- Scoring: `POST /api/score` with `{gameId}`. Game ids: `GET /api/games`.
- Dev server goes stale after adding a route or env var; restart it. One may already be on port 3001 from another session.
- Keys are in `.env.local` (not tracked): Supabase, Gemini, YouTube, IGDB, OpenCritic (RapidAPI, 200 requests/day), ITAD, Perplexity (unused), `ADMIN_API_KEY`. Never print them.
- Supabase project `bzbxopevjmurwsajemsc` pauses on inactivity; restore it if queries fail. **RLS is now enabled on all public tables on the live project** (applied by a separate session); the app uses the service-role client for everything server-side, so nothing should break.

## Uncommitted work and branches
- On `verdict-redesign`: modified `CLAUDE.md` (thesis), `projectplan.md`, `src/config/genre-weights.ts`, `src/config/seed-games.ts`, `src/lib/pipeline/{ingest-youtube,score-v2}.ts`, `src/lib/api/youtube-lookup.ts`, `src/lib/scoring/v2.ts`, `scripts/test-youtube.mjs`, `.claude/launch.json`; new `src/config/game-profiles.ts`, `src/config/known-expansions.ts`, `docs/{scoring-rubric,reliability-test-plan,genre-profiles,model-evaluation}.md` (`model-evaluation.md`, `source-and-ingestion-evaluation.md`, and `verdict-redesign-evaluation.md` are untracked review docs from earlier work; the Gemini facts in `model-evaluation.md` were checked against Google's pages on 2026-10-28, its OpenAI/Anthropic rows were not). Consider committing in logical pieces before starting.
- **RLS branch `claude/sleepy-curran-87a6d3`** (one commit, not pushed) forked from an older commit and names its migration `008_enable_rls.sql`, which clashes with `008_scoring_v2.sql` here. The migration is already applied live. To bring it in, copy it as `supabase/migrations/016_enable_rls.sql` (don't re-apply) rather than merging that branch.

## Open items for Jordan
Review `docs/genre-profiles.md` (assignments flagged as judgment calls: Skull and Bones, Diablo IV, God of War Ragnarök, Onimusha, Redfall, Ghost of Yotei, and the BioWare/Starfield RPGs) and the Juice weights; paste the HowLongToBeat permission into `docs/data-source-permissions.md`; Mass Effect 3 and the console exclusives (Saros, Ghost of Yotei) have no live price; XCOM 2 and Lorelei seed prices are stale (scoring uses the Steam price); `.env.example` is git-ignored.
