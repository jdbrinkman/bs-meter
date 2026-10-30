# Reliability test results (rubric v3, run 2026-10-28 to 2026-10-29)

Plan and pre-registered thresholds: [reliability-test-plan.md](./reliability-test-plan.md). Rubric: [scoring-rubric.md](./scoring-rubric.md). Everything here is AI-only: no human rated anything. Consistency is not accuracy; read "Plausibility" before trusting any number as correct.

All raw data is in `tmp/irr/` (git-ignored, 5 MB). See "Where the data is" at the end.

## Summary

1. **Neither config passed every pre-registered gate, so by the plan's own rules there is no clean "go".** The failures are narrow, and they point at one fixable cause (below).
2. **`gemini-3.8-flash` (config A) is clearly the better model.** It beat `gemini-3.5-flash-lite` (B) on every metric. B leaves 20-43% of squeeze measures "not discussed", went provisional in 15 of 35 runs (A: 0 of 35), and gave different verdicts across runs on 4 of 7 games (FFT: only 3 of 5 runs agreed). B is not viable at medium thinking.
3. **A's individual ratings are very consistent.** Krippendorff alpha 0.92 (95% interval 0.87-0.94). 99% of comparable items agree to within one step across 5 runs, and none differ by 3 or more. All 7 dev games kept their verdict in at least 4 of 5 runs, and none flipped between Worth it and Skip.
4. **A fails two gates:** index noise (median SD 5.5 against a target of 3; 95th percentile 8.1 against 6) and applicability agreement (kappa 0.60 against 0.80).
5. **Where the noise comes from:** the rating step and the classification step are almost perfectly stable when run on a frozen list (alpha 0.97 and kappa 0.99). The instability is in **stage 1, the extraction of issues from the sources**: the same evidence produces 30 to 65 issues on one run and 14 to 38 on another, so some measures get covered on some runs and "not discussed" on others.
6. **The index-noise gate is close to unreachable on a 1-5 scale.** One rating step moves an index by 5 to 12 points, so a single one-step disagreement already exceeds the SD target. Item-level agreement is excellent; the gate measures the scale's coarseness more than the model's reliability. I did not relax it; this is your call (recommendation 4).
7. **The rubric is insensitive to irrelevant changes.** Shuffled sources, duplicated sources, reworded prompt and hidden game title all produced a median rating shift of 0 (mean 0.14-0.19), with 1 verdict flip in 16 runs (the allowed maximum).
8. **The confirmation set matched expectations without any tuning on it:** Sekiro Worth it, The Last of Us Part II Remastered Worth it, Marvel Rivals Wait for a sale.
9. **Total spend: $7.97 of the $10 budget** (the $8 meter never tripped).
10. **Nothing has been re-scored and the live database is untouched.** The re-score waits for your decision.

## What was run, and what was cut

The pilot cost more per call than projected, and Phase 2 was more expensive than estimated, so I applied the plan's spend ladder. This is a smaller test than planned.

| Phase | Planned | Actually run | Cost |
|---|---|---|---|
| 0 Pilot | 2 games x 2 runs x A,B | same (Lorelei, Valhalla), 8 calls | $0.35 |
| 1 Test-retest | 7 games x 5 runs x A,B (70) | same, 70 end-to-end runs (+1 retry, see failures) | $4.08 |
| 2 Stage noise | A and B, 3 reruns of rating and classification | **A only**, 3 reruns x 7 games x 2 stages (42 calls) | $1.68 |
| 3 Robustness | 3 games x 4 variants x 3 runs (36) | **2 games (Witcher 3, Valhalla) x 4 variants x 2 runs (16)**; Redfall dropped | $1.39 |
| 4 Decision | rules + optional Argon diagnostic | rules applied; Argon diagnostic **not run** | $0 |
| 5 Confirmation | 3 games x 3 runs | 3 games x **2 runs** (6) | $0.47 |
| Rubric wording rounds | up to 2 | **none** (see "Decision") | $0 |

Other deviations: all calls were synchronous (I did not verify that Batch accepts thinking level and a JSON schema, so the 50% discount was not used). Temperature was left at the model default (Google advises against lowering it on Gemini 3.x). Phase 3's baseline is Phase 1 (same prompt version v3.0, same frozen evidence). The prompt, rubric and schema stayed at v3.0 throughout, so every phase is comparable.

## Results

### Phase 1: test-retest (7 dev games x 5 runs)

| Metric (threshold) | A: gemini-3.8-flash | B: gemini-3.5-flash-lite |
|---|---|---|
| Pooled alpha, ordinal (>= 0.80) | **0.92** [0.87, 0.94] PASS | 0.83 [0.74, 0.89] PASS |
| Juice alpha / squeeze alpha | 0.90 / 0.80 | 0.78 / 0.64 [0.38, 0.81] |
| Item stability, range <= 1 (>= 90%) | **99%** PASS | 95% PASS |
| Per-measure stability (>= 80% each) | all PASS (lowest: gameplay 86%) | **FAIL** (padding 75%) |
| Modal agreement (>= 70%) | 84% PASS | 79% PASS |
| Large swings, range >= 3 (<= 2%) | 0% PASS | 0% PASS |
| Index SD, median (<= 3) | **5.5 FAIL** | 4.9 FAIL |
| Index SD, 95th percentile (<= 6) | **8.1 FAIL** | 9.1 FAIL |
| Verdict stability (>= 90% of games, no Worth it/Skip split) | 100% (7/7) PASS | **86% (6/7) FAIL** |
| Applicability kappa (>= 0.80) | **0.60 FAIL** | 0.49 FAIL |
| Extraction stability (>= 70%, exploratory) | 35% | 40% |
| Provisional runs (>= 3 measures not discussed) | 0 of 35 | **15 of 35** |
| Quoted passages found verbatim in the evidence | 95% | 88% |
| Failed model attempts | 0 of 70 (plus 1 API error, below) | 0 of 70 |
| Cost / mean seconds per game | $2.89 / 96 s | $1.11 / 20 s |

Per game (A), Juice and BS across 5 runs: Valhalla 63 / 73, FFT 78 / 30, Hades II 94 / 30, Lorelei 86 / 44, Redfall 25 / 58, Witcher 3 83 / 47, XCOM 2 83 / 31. Verdicts: Valhalla Skip, Redfall Skip, Hades II / Lorelei / Witcher 3 / XCOM 2 Worth it, FFT Worth it in 4 of 5 (one Wait for a sale). Full tables: `tmp/irr/reports/phase1-A.md`, `phase1-B.md`.

### Phase 2: which stage is noisy? (A only, frozen intermediate results)

| Step | Result |
|---|---|
| Rating only, rerun on a frozen issue list (21 reruns) | alpha **0.97**, item stability 100%, median index SD **0.3** (end to end: 5.5). The one verdict flip: FFT Juice came out 83 / 70 / 80 and one rerun fell to Wait for a sale, a borderline game. |
| Classification only, 314 issues x 3 reruns | modal agreement **99%**, Fleiss kappa **0.99**, matches the stage-1 label 98% of the time. Only 5 issues were labelled differently by any rerun (friction vs gameplay 2, gameplay vs story, story vs world, broken vs staying). |
| Extraction (end to end, 5 runs) | Issues found again in >= 80% of runs: 35% (by a lenient topic match; exploratory). Issues extracted per run for the same game vary widely: Valhalla 30 / 56 / 60 / 65 / 34, Lorelei 15 / 14 / 21 / 38 / 36, XCOM 2 37 / 51 / 22 / 35 / 50, FFT 59 / 60 / 43 / 27 / 31. |

So the decision order, tie-breakers and 1-5 anchors are being followed reliably. The weak step is deciding what to pull out of the sources. When a point is not extracted, stage 2 correctly says "not discussed" for that measure, which is how a measure flips between a rating and "not discussed" across runs.

### Phase 3: irrelevant-change robustness (A; Witcher 3 and Valhalla, 2 runs per variant)

| Variant | Median abs shift (<= 0.5) | Mean shift | Items moved >= 2 | Verdict flips |
|---|---|---|---|---|
| Source order shuffled | 0.00 | 0.16 | 0% | 1 of 4 (Valhalla Skip -> Wait for a sale) |
| Duplicate sources re-inserted | 0.00 | 0.14 | 0% | 0 of 4 |
| Prompt reworded + sections reordered | 0.00 | 0.16 | 0% | 0 of 4 |
| Title masked | 0.00 | 0.19 | 0% | 0 of 4 |

Passes the plan's rule (median <= 0.5, at most 1 flip). Caveats: it is only 2 games and 2 runs each, and the duplicate test ran without the production de-duplication (so it shows what de-duplication guards against: the answer is "very little effect on this model"). Masking removes the name but not recognizable plot or mechanics, so the 0 shift shows the ratings do not depend on the name token, not that the model never recognizes the game. None of the 43 rated masked items cited "general knowledge" (old run: 11%).

### Phase 4: cross-model (A vs B medians, 65 items rated by both)

Quadratic-weighted kappa **0.76** (>= 0.75, PASS), mean absolute difference **0.49** (<= 0.5, PASS), exact agreement 55%. Verdicts differ on 2 of 7 games (FFT and XCOM 2: A says Worth it, B says Wait for a sale). Agreement between models says nothing about accuracy. The biggest gaps go both ways (FFT Broken A 1 vs B 3, Hades II Story A 4 vs B 2, XCOM 2 Challenge A 4 vs B 2).

### Phase 5: confirmation (A; 3 games x 2 runs, never used for tuning)

| Game | Runs | Juice / BS | Verdict | Expected |
|---|---|---|---|---|
| Sekiro | 99, 89 / 25, 25 | 94 / 25 | Worth it (both runs) | Worth it |
| The Last of Us Part II Remastered | 72, 72 / 50, 38 | 72 / 44 | Worth it (both runs) | Worth it |
| Marvel Rivals | 63, 63 / 38, 45 | 63 / 42 | Wait for a sale (both runs) | no expectation |

Gates on this set (only 6 runs, so wide intervals): alpha 0.94, item stability 100%, modal agreement 90%, median index SD 2.5 (PASS), 95th percentile SD 8.1 (FAIL), applicability kappa 0.73 (FAIL), verdicts 3 of 3 stable. Read the reasons and sources for these in "Anchor games" below. Per the plan the set was not tuned on.

## Follow-up: stage-1 fix (prompt v3.1), tested 2026-10-29

Change: stage 1 now writes a per-measure coverage list before the observations (every measure must be looked at), caps each measure at 2-6 observations instead of "50 to 70 in total", and stage 2 receives that coverage list. Staying power applicability is decided in code from the genre profile (applies when its Juice weight is 1 or more; it is the rubric's "complete by design is skipped" rule made deterministic). Same 7 dev games, config A, 3 runs each, phase `fix1`. Cost $1.26; total spend now $9.23 of $10.

| Metric | v3.0 (5 runs) | v3.1 (3 runs) | Rule |
|---|---|---|---|
| Pooled alpha | 0.92 | 0.94 | >= 0.80 |
| Index SD, median | 5.5 | 2.89 | <= 3 |
| Index SD, 95th percentile | 8.1 | 9.23 | <= 6 |
| Applicability kappa | 0.60 | 0.86 | >= 0.80 |
| Verdict stability | 100% (of 10 games) | 86% (6 of 7) | >= 90% |
| Not-discussed share, squeeze | 20-43% in B, a few in A | 0-10% | n/a |

Read: the median-index-noise and applicability gates now pass. Two gates still fail, and both come from one game: Final Fantasy Tactics sits on the Worth it / Wait for a sale line (Juice 63, 80, 68) because Staying power (5/4/3), Challenge (2/3/2) and Grind (3/2/3) each move a step. The other six games kept their verdict in all three runs. Caveats: 3 runs per game here against 5 before, so the two sets are not exactly comparable, and the same 7 games were used to design and test the fix (the confirmation games were not rerun). The extraction-stability metric (38%) is still low; its matching is strict, but issue counts are much steadier (16-29 per run against 14-65).

### Confirmation games on v3.1 (3 games x 2 runs, phase `fix1-confirm`, $0.34; total spend $9.57 of $10)

| Game | v3.0 | v3.1 | Verdicts v3.1 |
|---|---|---|---|
| Sekiro | Juice 99, 89; BS 25, 25 | Juice 96, 94; BS 25, 25 | Worth it x2 |
| The Last of Us Part II | Juice 72, 72; BS 50, 38 | Juice 81, 78; BS 45, 45 | Worth it x2 |
| Marvel Rivals | Juice 63, 63; BS 38, 45 | Juice 65, 63; BS 50, 45 | Worth it, Wait for a sale |

- Sekiro's Juice gap shrank (10 points to 2) and TLOU2's BS gap closed (12 points to 0).
- TLOU2's Juice rose about 6-9 points because Staying power is now not applicable for its profile (action-adventure, weight 0.5); that was a 4 in v3.0. This is the intended effect of the code rule, but it is a real change to the number.
- Marvel Rivals flipped: run 1 had Juice 65 (Presentation 5 instead of 4), which sits exactly on the 65 "Worth it" line for a free game. The ratings differed by one step; the verdict rules turn that into a flip. Same pattern as Final Fantasy Tactics, so both remaining failures are borderline games meeting a hard threshold.
- Coverage did not close every gap. Marvel Rivals Padding stayed "not discussed" in both runs, TLOU2 Grind in both runs. Those look like real silence in the reviews. But Marvel Rivals Grind in run 2 was marked not discussed while its own note said "all heroes are unlocked from the start," which is evidence the problem is absent and run 1 rated it 1. So the extractor still contradicts itself at the margin: a coverage note that cites a source should force "discussed". Not fixed or retested (budget).
- Pass criteria I stated before running: verdicts unchanged in both runs (failed for Marvel Rivals), index differences of a few points (passed, 2-5), fewer unrated measures (not met: no improvement on Marvel Rivals and TLOU2).

### Verdict now computed on the rounded numbers (2026-10-29)

`deriveVerdictV2` (`src/lib/scoring/v2.ts`) now rounds Juice and BS to the nearest 5 (`displayIndex`) before applying `VERDICT_RULES`, so two games that show the same "about N" cannot get different verdicts. Stored indexes are unchanged. Offline replay of all 68 base runs of config A (phase1, confirm, fix1, fix1-confirm), no API cost: 5 runs changed verdict, 63 did not.

- Marvel Rivals: 3 runs went from Wait for a sale to Worth it (Juice 63 now rounds to 65). It is now Worth it in all 4 runs on file, from Wait for a sale in 3 of 4.
- The Last of Us Part II, v3.0 confirmation runs only: 2 runs went from Worth it to Wait for a sale. Their Juice was 72 and the game costs $49.99, so the bar is 72; 72 now rounds to 70. Its v3.1 runs (Juice 78, 81) are unaffected.
- Everything else, including the Final Fantasy Tactics flip (68, 80, 63), is unchanged.
- Because rounded values are multiples of 5, a threshold of 72 now behaves as 75 and a threshold of 65 behaves as 65 on rounded numbers (62.5 raw). The thresholds were tuned on the old math and should be re-tuned as multiples of 5.

Follow-up the same day: `worthJuiceExpensive` changed from 72 to 70, the nearest multiple of 5 (the only threshold off the 5-point grid; chosen to keep the original intent, not tuned on the test games, which are too few to tune on). Replay against the original raw-number rules, 68 runs: 5 runs differ in total, all toward "Worth it": Marvel Rivals x3 (Wait for a sale -> Worth it) and Final Fantasy Tactics x2 (the two Juice 68 runs, Wait for a sale -> Worth it). The Last of Us Part II's two Juice-72 runs are back to Worth it. Final Fantasy Tactics in the v3.1 set is still 2 of 3 Worth it (the Juice 63 run stays Wait for a sale), so its verdict stability is still below the 80% rule. The About page reads its numbers from `VERDICT_RULES`, so it now says 70+ above $40.

Reports: `tmp/irr/reports/fix1-A.md`, `tmp/irr/reports/fix1-confirm-A.md`; runs in `tmp/irr/runs/fix1/` (each run file also holds the coverage list).

## Decision under the pre-registered rules

- **Rule 1-2 (config passes if every hard gate is met):** neither does. A misses 2 gates, B misses 6.
- **Rule 3 (only A passes):** does not apply since A did not pass either. A is still the only sensible choice on the evidence, and it is the config I used for Phases 3 and 5.
- **Rule 4 (fix wording, at most two rounds, retest affected measures):** I did **not** do a wording round. Phase 2 showed the measure wording, decision order and anchors are not the problem (classification kappa 0.99, rating alpha 0.97). The problem is in the extraction prompt's coverage behavior, which is a design change to stage 1, not a wording fix on specific measures. I also had $0.03 left under the $8 meter, and a prompt change after Phase 1 would make Phases 3 and 5 non-comparable. I'd rather you decide whether to spend the remaining ~$2 of your budget on the stage-1 fix (recommendation 2).
- **Rule 5 (median of 3 runs as mitigation):** tested offline on the saved runs, no extra spend. Median-of-3 cuts median index SD from 5.5 to about 2.6 (an optimistic estimate, since the 3-run subsets overlap). It triples cost: about $9.3 for a 38-game re-score with A, against $3.1 for single runs.
- **Rule 6 (merge measure pairs under 70% classification agreement):** no pair is close (every pair is 99%+), so no merge.

**My reading:** the pre-registered gates are not met, but the shortfall is (a) a gate that the 1-5 scale makes nearly unreachable (index SD), and (b) a real, fixable stage-1 problem (coverage). The user-facing outputs, verdicts, were stable on 10 of 10 games. I would not call this a pass, and I would not re-score the live site yet, but I think A with a stage-1 fix is the right route.

## Findings worth knowing

1. **One rating step is worth 5 to 12 index points.** BS: 12.5 on the worst measure, 7.5 on the second, 5 on the third. Juice: up to 8.8 for the heaviest measure (Story in a Narrative RPG, Gameplay in action games). A single run-to-run difference of one step on one measure gives an index SD of about 5. Valhalla on config B went from BS 50 to BS 75 because three measures each moved one step.
2. **Rounding the display to the nearest 5 does not help the noise** (median SD 5.4), but it does not change any verdict either.
3. **Ten of 84 items flip between "rated", "not applicable" and "not discussed"** across A's runs. Three are Staying power (the Witcher 3 was rated 5 once and N/A four times; Valhalla and FFT also flip), two are Broken, two are Grind, and three more are in World, Repetition and Padding. Outside the dev set, Sekiro's second confirmation run also rated Staying power 3 where its first said N/A. Staying power's applicability is a design property of the game, so the AI should not decide it per run.
4. **Quotes:** 95% of A's quoted passages appear in the evidence (88% for B), after tolerating "..." joins. The examples I read looked like edited or paraphrased text rather than invented claims, but I only read about 15 and did not trace each to its source. A real check of the remaining 5% is still open.
5. **Stage-2 output has a schema nit:** when a measure is "not discussed", the model sometimes writes "general knowledge" as the source. It's harmless to the indexes but looks like a prior-knowledge citation. Use "none" there.
6. **The one transient failure:** 1 of 71 end-to-end runs for A (FFT run 4) failed with an unexplained HTTP 400 INVALID_ARGUMENT on the rating call right after extraction succeeded. I checked the input for broken Unicode and control characters and found none, and a retry of the same cell succeeded. The failed record is kept at `tmp/irr/failed/`. My runner treated 400 as non-retryable; production should retry it once.
7. **Cost and speed:** A costs about $0.08 per game (from $0.04 to $0.13 depending on evidence size), 96 seconds each; thinking is about half of A's output tokens. B costs about $0.03 per game and 20 seconds. Rating-only reruns cost about $0.02. Gemini 3.8 Flash's current rate is promotional through 2026-12-31; per Google it doubles on 2027-01-01, so a re-score after that costs about twice as much.
8. **Sensitivity of verdicts to unvalidated design choices** (offline, 7 dev games): equal Juice weights or the default profile's weights change 0 verdicts. Replacing "worst three at 50/30/20" with "mean of all rated squeeze measures" changes 1 (Valhalla Skip -> Wait for a sale); "worst only" and "worst two 60/40" change 0. So the Juice weights hardly matter for these games, and the BS formula matters only for a game at the edge. This was 7 games and is not conclusive.

## Plausibility (non-human proxies; flags, not proof)

- **Padding vs objective hours and achievements:** consistent for the high end (Valhalla 3.2 with 2.5x completionist hours and 55% of achievements earned by under 5% of players; Witcher 3 3.0 with 3.4x; Redfall 3.0). Hades II has a 3.3x gap but Padding 1.8, which fits a roguelike where meta-progression is the extra time. **XCOM 2 has a 2.7x gap and Padding 1.0**: a flag worth reading (the gap may come from replaying the campaign, not filler).
- **Broken vs recent Steam positive share:** the two lowest-rated recent-review games (Valhalla 66%, Redfall 67%) have the highest Broken (2.8, 3.0); the 81-94% games are 1.0-2.4. Direction is right. Redfall, a 2023 game, cannot trigger "Not yet" because it is past the 24-month window, so its Broken 3 only feeds BS.
- **Genre bias:** too few games per profile to say much (tactics games rate high on Gameplay, 4.9, and low on Repetition, 1.3, as you might expect from that genre but also what a genre-biased rater would do). Needs more games.
- **Rubric leaks seen in the anchor games:** Sekiro's Pacing reason cites the "steep initial difficulty curve" (difficulty belongs to Challenge); Marvel Rivals' Challenge (2) is driven by hero balance and the lack of role queue, which is matchmaking and balance rather than difficulty design. Neither is large, but the "one complaint, one measure" rule is slightly leaky for difficulty-related complaints.

## Anchor games (for your review)

Config A, run 1 of the confirmation set. Full reasoning for every run is in `tmp/irr/ratings.csv`.

- **Sekiro (Worth it, Juice 99, BS 25):** Story 4, Gameplay 5, World 5, Presentation 5, Challenge 5, Staying power N/A. Squeeze: Padding 1, Grind 2 (running out of spirit emblems occasionally forces farming, per Eurogamer), Friction 2 (camera in tight spaces), Repetition 2 (recycled mini-bosses), Pacing 2, Broken 1 (PC Gamer: rock-solid 60 fps). Run 2 gave Juice 89: World 4 instead of 5, and Staying power rated 3 instead of N/A.
- **The Last of Us Part II Remastered (Worth it, Juice 72, BS 50):** Story 3 ("divisive narrative choices"), Gameplay 4, World 4, Presentation 5, Challenge 4, Staying power 4 (No Return mode). Squeeze: Padding 3 (sprawling subplots, scavenging loops), Grind not discussed, Friction 1, Repetition 3, Pacing 3 (mid-game perspective shift, flashbacks), Broken 1. The Story rating of 3 is the most debatable thing here for a game you expected to be a clear Worth it; the verdict still held because BS stays moderate. BS was 50 in run 1 and 38 in run 2: Padding and Repetition were each one step lower in run 2 (3 -> 2), which is enough to move the worst-three average by 12 points.
- **Marvel Rivals (Wait for a sale, Juice 63, BS 42):** Story N/A, Gameplay 4, World 3, Presentation 4, Challenge 2, Staying power 4; Padding and Pacing not discussed, Grind 1, Friction 2, Repetition 2, Broken 3 (memory leaks, shader stutter). Challenge is the odd one for a PvP shooter (see leaks above).
- **Onimusha:** not scored (outside the test set, about $0.10 if you want it).

## Recommendations

Ordered by what I think matters most.

1. **Use `gemini-3.8-flash` at medium thinking as the production model; drop `gemini-3.5-flash-lite` at medium.** B's cheaper price ($0.03 vs $0.08 per game) is not worth leaving 20-43% of squeeze measures unrated and verdicts changing between runs. It's already the default in `SCORING_CONFIG`, still marked provisional.
2. **Fix stage 1's coverage behavior, then re-test just that stage.** Have the extraction prompt (a) output, for each of the 12 measures, either its issues or an explicit "no evidence found", so "not discussed" is only used when the sources really say nothing, and (b) prefer a stable issue count (the 14-to-65 spread per game is the source of most noise). Option: run extraction twice and merge the lists (with corroboration counts) before rating once, since rating is cheap (about $0.02). Cost to test properly: 7 dev games x 3 runs of stage 1 plus rating is about $1.7, so it fits in the remaining budget. Do this before any re-score.
3. **Make Staying power's applicability a property of the genre profile in code**, not a per-run AI decision (it caused 3 of the 10 applicability flips). Roguelike, multiplayer / live service, and pure-gameplay profiles apply; the AI only rates quality when it applies.
4. **Decide what to do about the index-noise gate.** Options, in the order I would consider them: (a) keep single runs and re-specify the gate on what users see (verdict stability, plus index agreement within +-10 points or the same band), which A already meets; (b) make the BS formula less step-sensitive, for example the worst three equally weighted (about 8 points per step) instead of 50/30/20 (12.5 on a single step), and recheck (the sensitivity run shows verdicts mostly unaffected); (c) use a median of 3 runs, which roughly halves index SD but triples cost ($9.3 for the 38-game re-score). I did not change the pre-registered gate myself.
5. **Tighten the difficulty rule:** add to Pacing and Friction "difficulty is never counted here, only in Challenge", and clarify that Challenge for PvP games rates the quality of competition design, or mark it N/A for them and re-weight (the multiplayer profile already weights it 2).
6. **Production hardening:** retry HTTP 400 once; write "none" instead of "general knowledge" in the source of an unrated measure; drop or flag observations whose quote cannot be found in the evidence (about 5% today); store the stage-1 issue list with each score (migration 017 does this) so every rating can be traced.
7. **Re-tune verdict thresholds after the re-score.** They were set on the old 0-5 math; all dev results look sensible under them (for example the Witcher 3, with BS 47, and Lorelei, with BS 44, are Worth it), but nothing here validates the cutoffs.
8. **Re-score only after 2 and 4 are decided.** Then apply migration 017, re-score all 38 games with the chosen config, run `POST /api/recompute-v2`, and review Sekiro, TLOU2 and Onimusha.
9. **If budget is a concern:** try the Batch API for the re-score (50% off) after a small test that thinking level and the response schema work with it.
10. **Plausibility checks that still need a person:** the 5% unmatched quotes, XCOM 2's Padding 1.0 against its 2.7x hours gap, and whether TLOU2's Story 3 reads as fair.

## What this can and cannot tell you

- Reliability is not validity. Consistent ratings can be consistently wrong, and shared model bias passes every test here. The anchor reading above and your own judgement of the reasons are the only accuracy check.
- The sample is small: 7 dev games and 3 confirmation games, and the confirmation set got only 2 runs per game. Intervals are wide. Per-measure statistics rest on 4-7 comparable items each.
- Same-evidence design: it does not test whether the right sources were ingested. That is the audit's job.
- Results apply to this prompt (v3.0), this evidence, and `gemini-3.8-flash` as served in October 2026 (the returned model ID is saved on every run to detect changes).

## Where the data is

Everything is under `tmp/irr/` (git-ignored; it exists on this machine only, so copy it if you want it kept):

| Path | Contents |
|---|---|
| `tmp/irr/ratings.csv` | One row per run x measure: phase, game, config, variant, run, status, rating, source, reason, issue ids (open in a spreadsheet) |
| `tmp/irr/runs.csv` | One row per run: indexes, verdict, provisional, issue count, cost, tokens, evidence hash, prompt / rubric / schema versions, error |
| `tmp/irr/runs/<phase>/*.json` | The full record of every run: model ID returned, thinking level, every attempt with tokens, finish reason and latency, the stage-1 issues with quotes, the stage-2 ratings (phases: `pilot`, `phase1`, `phase2`, `phase3`, `confirm`, `fix1`, `fix1-confirm`) |
| `tmp/irr/failed/` | The one failed run |
| `tmp/irr/snapshots/` | The frozen, de-duplicated, hashed evidence for the 10 games |
| `tmp/irr/reports/*.md` and `.json` | Generated analysis: `phase1-A`, `phase1-B`, `phase2-A`, `phase3-A`, `confirm-A`, `cross-model`, `offline-A` (median-of-3, step sizes, applicability), `plausibility-A`, `sensitivity-A` |
| `tmp/irr/ledger.jsonl` | Cost per run (sums to $7.97) |

Code: `scripts/irr/` (`run.ts` runner, `analyze.ts` metrics, `offline.ts`, `export.ts`, `project.ts`, `stats.ts` with `stats.test.ts`). Re-run any report with, for example, `npx tsx scripts/irr/analyze.ts retest --phase phase1`.
