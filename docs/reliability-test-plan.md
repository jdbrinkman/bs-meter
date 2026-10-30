# Reliability test plan: AI inter-rater reliability (IRR)

Status: **run 2026-10-28/29 with a reduced Phase 2/3/5 (spend ladder); results in [reliability-results.md](./reliability-results.md).** Rubric: [scoring-rubric.md](./scoring-rubric.md). Candidate models: `gemini-3.5-flash-lite` and `gemini-3.8-flash`.

## Goal

Score a set of games many times with the new rubric and find out (1) how consistent the AI's ratings are, (2) where the noise comes from, (3) whether the cheaper model is as consistent as the better one, and (4) whether irrelevant changes move the ratings. The output is a go / no-go on the rubric and a choice of model and settings before the full re-score of all 35 games.

No human rates anything in this plan. Jordan supplies the games; the AI applies the rubric.

## What this can and cannot tell us

- **Reliability is not validity.** Consistent ratings can be consistently wrong (for example, always rating open-world games high on Padding because of the genre, not the evidence). IRR only measures consistency.
- **Repeat runs of one model are not independent raters.** They measure test-retest noise, not shared bias. Running two different models helps a little; it still is not a human standard.
- **Agreement between two models proves nothing about accuracy** (agreement can come from shared bias). A second model is a diagnostic, not ground truth.
- So the plan adds **plausibility checks that do not need a human rater** (section 7): objective data we already hold, title masking, and anchor-game sanity checks. These are flags, not proof.
- **IRR depends on how much the games differ.** If the test games are all similar, agreement statistics look poor even when the noise is small. The game set must span good and bad, and we also report absolute noise (rating spread across runs), which does not depend on that.
- **The sample is small.** About 7 dev games x 12 measures is 84 items per model. Per-measure statistics rest on about 10 items each, so they get wide error ranges. Pooled statistics are the primary gate; per-measure statistics use stability counts, not correlation-type statistics.

## Questions the tests answer

| # | Question | Section |
|---|---|---|
| Q1 | Same model, same evidence, repeated runs: do the ratings and the verdict hold? | 5, Phase 1 |
| Q2 | Which stage is noisy: extracting issues, classifying them, or rating from them? | Phase 2 |
| Q3 | Do irrelevant changes (source order, duplicates, prompt wording, hidden title) move ratings? | Phase 3 |
| Q4 | Do the two models agree, and is the cheaper one good enough? | Phase 4 |
| Q5 | Do the ratings track independent non-AI signals? | 7 |

## Design

### Terms
- **Run:** one full scoring of one game with one config.
- **Item:** one game x one measure rating (or "not discussed" / not applicable).
- **Config:** model + thinking level + prompt version + rubric version + temperature.
- **Dev set / confirmation set:** dev set is used to find and fix problems in rubric wording; the confirmation set is run once at the end and never used to tune anything.

### Games
**10 games in total**, chosen to cover genres, quality range, and evidence conditions. All are ingested.

**Dev set (7 games, used for all tests and wording fixes):**

| Game | Why it is in the set |
|---|---|
| Lorelei and the Laser Eyes | Puzzle / narrative game; thin evidence: 1 YouTube transcript (GamesRadar) and 5 written reviews, about 47k characters |
| XCOM 2 | Turn-based tactics; modest evidence (82k characters); on a deep Steam sale |
| Final Fantasy Tactics: The Ivalice Chronicles | Turn-based tactics with a heavy story |
| Assassin's Creed Valhalla | Padding / Repetition test case; not yet scored with v2 |
| Redfall | Broken test case (old v2 run: BS 100, Juice 20) |
| Hades II | Roguelike: Staying power applies, run loops repetitive by design |
| The Witcher 3: Wild Hunt | Narrative open-world RPG; very well known, so the strongest test of the model leaning on memory |

**Confirmation set (3 games, never used to tune wording, run once at the end):**

| Game | Why it is in the set |
|---|---|
| Sekiro: Shadows Die Twice | Anchor game (expected Worth it); souls-like |
| The Last of Us Part II Remastered | Anchor game (old run said Skip, expected Worth it); narrative action-adventure |
| Marvel Rivals | Live service: Story not applicable, no HowLongToBeat hours, only 3 transcripts |

Anchors sit in the confirmation set on purpose: tuning wording until an anchor gives the expected verdict would be forcing the result.

What the 10 cover: eight of the 15 genre profiles (puzzle, tactics x2, action-adventure x3, roguelike, live service, narrative RPG, souls-like), clean and bad games, open-world padding, a Broken case, and thin evidence (Lorelei). Not covered: a very short indie game outside the puzzle slot.

Dropped from the earlier 13-game list: Resident Evil 4 Remake, Elden Ring, God of War Ragnarök, Mortal Shell II, Onimusha, Mio. Onimusha can be scored once at the end if you want to look at it (about $0.10).

Notes from the database:
- Evidence per game is 35k to 71k tokens for the original games (about 55k with the prompt); the cost estimates below use that.
- Marvel Rivals has no HowLongToBeat hours, so Padding has less objective evidence there; good for exercising "not discussed".

### Configs
| Config | Model | Thinking | Why |
|---|---|---|---|
| **A** | `gemini-3.8-flash` | medium (its default) | The stronger candidate |
| **B** | `gemini-3.5-flash-lite` | medium | Cheaper candidate. Its default is minimal, which is too low for classification, so test medium. |
| C (optional) | `gemini-3.5-flash-lite` | minimal | Only if B passes and cost matters more |
| D (optional) | `gemini-3.8-flash` | low | Only if A passes and cost matters more |

Phase 1-4 run A and B. C and D only run if they could change the decision. Production temperature and any other generation settings are fixed before the first run and identical across configs. Test in the mode we would deploy (synchronous vs Batch API), and spot-check the other.

### Frozen evidence
Before the first run, snapshot each game's full source set (transcripts, critic text, Steam facts and reviews, HowLongToBeat) and store a hash. Every run for a game uses the identical snapshot, so any difference between runs comes from the model, not the data. Duplicate sources are removed before snapshotting.

### Run counts
- **5 runs per game per config** in Phase 1: 7 dev games x 5 runs x 2 configs = 70 end-to-end calls, on the Batch API.
- 3 reruns of each frozen stage in Phase 2 (classification and rating), per game per config.
- Phase 3: 3 games (Witcher 3, Valhalla, Redfall) x 4 variants x 3 runs, on the **winning config only**.
- Confirmation: 3 games x 3 runs, winning config, once.

### Harness rules
- The harness **must not write to the production scores table**. Production `scoreGameV2` upserts the score row, so test runs go to files (or a separate `rating_runs` table) only.
- Every run records: model ID returned by the API, thinking level, prompt/rubric/schema versions, temperature, evidence snapshot hash, input/output/thinking tokens, latency, finish reason (truncation), and the full stage outputs (extracted issues, classifications, ratings, quotes).
- A run that fails JSON validation or is truncated is retried once; both attempts are logged and the failure rate is reported.

## Phases

### Phase 0: prerequisites
1. Fold the agreed principles into the rubric and prompt (see [scoring-rubric.md](./scoring-rubric.md)): issue-level dedupe, "not discussed" coverage field, full 5-level anchors with worked examples and tie-breakers, staged pipeline.
2. Turn on Gemini billing.
3. Build the harness and the analysis script; freeze the evidence snapshots; pre-register the thresholds below in the repo.
4. **Genre profiles: done** (2026-10-28, see [genre-profiles.md](./genre-profiles.md)). The profile is chosen by code, not by the AI, so it adds no run-to-run noise. It is now an explicit per-game assignment (all 37 games) with a live-service multiplayer profile and a turn-based tactics profile added, neutral guidance notes, and Juice weights rewritten for the new measures. Hades II maps to Roguelike (story-driven), Marvel Rivals to Multiplayer / live service. Profiles are frozen for all test runs. Add to the sensitivity checks: how much do verdicts move if the Juice weights shift.
5. **Pilot:** 2 games x 2 runs x 2 configs. Measure real token counts and cost, check JSON validity and truncation, and fix harness bugs. No results from the pilot count.

### Phase 1: test-retest (Q1)
5 runs x dev-set games x configs A and B. Compute the end-to-end metrics in section 5 per config.

### Phase 2: where does the noise come from (Q2)
Using the saved stage outputs, plus cheap reruns on frozen intermediate results:
- **Extraction stability:** compare the issue lists across the 5 end-to-end runs (match issues by source ID and quote span). Report how many issues appear in at least 4 of 5 runs.
- **Classification agreement:** freeze one issue list per game, then rerun only the classification step 3 times. Every issue gets 3 category labels, so agreement can be computed directly; the confusion matrix shows which measure pairs get mixed up.
- **Rating agreement:** freeze one classified issue list per game, then rerun only the rating step 3 times.

Whichever stage shows the largest drop in agreement is where to fix wording or add examples.

### Phase 3: irrelevant-change robustness (Q3)
On 3 dev games (Witcher 3, Valhalla, Redfall), 3 runs per variant on the winning config, comparing against the baseline ratings:
1. **Source order shuffled.**
2. **Duplicates reinserted** (a transcript or review present twice).
3. **Prompt harmlessly reworded** (same rubric, different phrasing and field order).
4. **Title masked** (game name and obvious identifiers removed). This shows how much the model relies on what it remembers about the game instead of the evidence. The last audit found 11% of old ratings citing general knowledge.

### Phase 4: cross-model comparison and decision (Q4)
Compare A vs B medians on the dev set and apply the decision rules (section 6). Optionally run Gemini 4 Argon as a diagnostic on disputed items only; its agreement is not treated as validation.

### Phase 5: confirmation
Run the chosen config once on the confirmation set (Sekiro, TLOU2, Marvel Rivals), 3 runs per game. It must meet the same gates. If it does not, report the result; do not tune on that set.

## 5. Metrics and proposed thresholds

All thresholds are **proposed starting points, fixed before the first run**, not published standards (the 0.80 / 0.67 alpha cutoffs are Krippendorff's conventional lines). Ratings are ordinal 1-5; "not applicable" and "not discussed" are treated as missing values, with their own agreement measured separately.

| Metric | What it measures | Pass | Marginal |
|---|---|---|---|
| **Pooled Krippendorff's alpha (ordinal)**, all items, per config; also per side | Overall agreement across runs, handles missing values | >= 0.80 | 0.67-0.80 |
| **Item stability:** share of items whose rating range across runs is <= 1 | Absolute noise, independent of how varied the games are | >= 90% overall, >= 80% per measure | |
| **Modal agreement:** average share of runs equal to the item's most common rating | Exact agreement | >= 70% | |
| **Large swings:** share of items with range >= 3 | Serious instability | <= 2% | |
| **Index noise:** SD of Juice index and BS index across runs, per game | Effect on the headline numbers | median <= 3, 95th percentile <= 6 | |
| **Verdict stability:** games where >= 4 of 5 runs give the same verdict | Effect on what users see | >= 90% of games, and no game gets both Worth it and Skip | |
| **Applicability agreement:** Cohen's kappa on applicable / not applicable / not discussed | Coverage and N/A logic | >= 0.80 | |
| **Classification (frozen issue list):** average share of runs picking the modal category; Fleiss' kappa | Can the AI follow the decision order | >= 80%, kappa >= 0.70 | |
| **Extraction stability:** share of median-run issues found in >= 4 of 5 runs | Is the issue list stable | >= 70% (exploratory, no hard gate) | |
| **Perturbation shift (Phase 3):** median absolute change in rating vs baseline | Sensitivity to irrelevant change | <= 0.5, and at most 1 verdict flip across the subset | |
| **Cross-model:** quadratic-weighted kappa between A and B medians; mean absolute difference | Do the models see the same game | kappa >= 0.75, difference <= 0.5 | |

Reported alongside, with bootstrap intervals (resampling games): per-measure stability counts, ICC for the index values, and the list of the least stable items.

## 6. Decision rules

1. A config **passes** if it meets every "pass" line on the dev set. A "marginal" result is a fail for gating purposes but gets investigated.
2. **Both pass:** choose the cheaper config (B, unless 3.8 Flash on batch costs about the same).
3. **Only A passes:** choose A. If B's extraction stage is stable but its classification or rating is not, test the two-stage setup (B extracts, A classifies and rates) as a cost-saver.
4. **Neither passes:** use the Phase 2 stage results to find the weak step. Fix wording and add examples for the failing measures only, **at most two rounds**, retesting only the affected measures on the dev set.
5. If still failing, try the **median of 3 runs** as a production mitigation (it costs 3x per game) and re-measure the index noise.
6. If a measure pair still has under 70% classification agreement after two rounds, merge those two measures. No other taxonomy changes without evidence from these tests.
7. The confirmation set decides whether the chosen config is accepted. It is run once; failures are reported, not tuned away.

## 7. Plausibility checks (no human rater)

These do not prove accuracy. They catch the "reliable but invalid" failure.

- **Objective proxies we already hold.** Compare the AI's Padding with the HowLongToBeat main-to-completionist gap and achievement-completion rates; compare Broken with the recent Steam negative-review share. Treat as flags (the proxies are noisy, for example collectible-heavy genres inflate completionist time).
- **Anchor games.** Sekiro and TLOU2 were expected to be "Worth it" and Onimusha "looked suspicious". Jordan reads the AI's stated reasons and quoted sources for Sekiro and TLOU2 (Onimusha is outside the test set; score it once at the end if wanted, about $0.10); this is a review of reasoning, not a rating exercise. Do not force the verdict.
- **Title masking** (Phase 3) for reliance on prior knowledge.
- **Genre bias.** Compare rating distributions by genre; a measure that tracks genre label more than evidence is suspect.
- **Quote check.** Spot-check a sample of cited quotes against the snapshot to catch fabricated or mismatched support.

## 8. Cost and logistics

**Budget: $10.** Billing is set up. The harness keeps a running cost meter from the API's reported token usage and **stops at $8**, leaving the rest for retries and one round of wording fixes.

Input is measured from stored evidence (about 55k tokens per end-to-end call, including the prompt); output including thinking is the main unknown. Per call: `gemini-3.8-flash` about $0.071 at 8k output tokens and $0.116 at 20k; `gemini-3.5-flash-lite` about $0.037 and $0.067. Prices are Google's standard rates (3.8 Flash is at its promotional price through Dec 31, 2026). The pilot replaces the output assumption with measured numbers. Lorelei's evidence is much smaller than the 55k assumption (about 16k tokens), so the real total should be a little lower.

| Step | Mode | Expected cost |
|---|---|---|
| Pilot (2 games x 2 runs x 2 configs) | sync | ~$0.45 |
| Phase 1 (70 end-to-end calls) | Batch (50% off) | ~$1.90 |
| Phase 2 (3 reruns x 2 stages, small inputs) | Batch | ~$0.55 |
| Phase 3 (36 calls, winning config) | sync | ~$1.30 (Flash-Lite) to ~$2.60 (3.8 Flash) |
| Confirmation (9 calls, winning config) | sync | ~$0.35 to ~$0.65 |
| **Total, expected (8k output)** | | **~$4.50 (Flash-Lite wins) to ~$6.10 (3.8 Flash wins)** |
| **Total, worst case (20k output)** | | **~$7.70 to ~$9.90** |

The staged pipeline (extract, then rate) may move these by about 20%.

### Spend ladder

The pilot gives measured numbers; the full cost is then projected before Phase 1 starts. If the projection is over $8, cut in this order:
1. Phase 3 from 36 calls to 16 (2 games x 4 variants x 2 runs).
2. Runs per game from 5 to 4.
3. Confirmation from 3 games to 2.
4. Last resort, the minimum useful core: 7 games x 3 runs x 2 configs on Batch (42 calls, about $1-2), which still gives test-retest agreement and the two-model comparison.

If Batch does not work with the harness, Phase 1 on sync pricing is about $3.80-6.40 alone, so start the ladder at step 2.

Output goes to a git-ignored `tmp/irr/` folder; the final report goes to `docs/reliability-results.md`.

## 9. Outputs

- A per-config results table (section 5 metrics with intervals).
- A per-measure table: stability, modal agreement, and the least stable games.
- A classification confusion matrix from Phase 2.
- A list of rubric wording fixes made, per round.
- The decision: model, thinking level, whether to use median-of-3, and any measures flagged low-confidence or merged.
- Then the full re-score of all 35 games, with the production config and the model ID saved on each score.

## 10. Known limits

- Small sample: intervals will be wide, and a pass is evidence of consistency, not a guarantee.
- Same-evidence design hides evidence-selection problems (wrong game, stale source); those are covered by the audit, not here.
- Model versions can change under us (Google routes retired Flash versions to newer ones). Saving the returned model ID with every run lets us notice.
- Results are specific to this rubric, prompt, evidence set, and model version; rerun after any of them changes.
