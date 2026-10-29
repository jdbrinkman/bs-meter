# Scoring rubric (v3 proposal)

Status: **agreed in design; partly implemented.** Done in `src/lib/scoring/v2.ts`: the six Juice measures and the genre weights. Not yet: the 1-5 scale, the new squeeze measures (Pacing added, Monetization removed), the prompt, and the schema. Next: implement, turn on Gemini billing, run the reliability tests below, then re-score all 35.

Rater: Gemini. Today `gemini-2.5-flash` (set in `src/lib/ai/gemini.ts`); `gemini-3.5-flash-lite` vs `gemini-3.8-flash` to be chosen by the reliability tests.

## Thesis

BS Meter answers one question: **is this game worth your time?** Every measure either wastes the player's time (**The BS**) or earns it (**The Juice**). Price enters through the verdict, not the ratings. Monetization and manipulation are not scored measures; time-savers sold alongside padding or grind count as evidence for Padding or Grind.

## Scale: 1-5 on both sides

Each measure is rated 1-5, or marked not applicable. Indexes use `(rating - 1) / 4`, so a clean game scores 0 BS, not 20.

**The BS** (severity = how often and how costly, in time and progress, not enjoyment):

| Rating | Label | Meaning |
|---|---|---|
| 1 | Negligible | None, or ignorable |
| 2 | Minor | Noticeable; the main path stays clean |
| 3 | Moderate | A regular drag: roughly a quarter of playtime, or a recurring cost |
| 4 | Major | A big part of the experience for most players, or a rare but severe loss |
| 5 | Severe | Defines the experience |

**The Juice** (quality):

| Rating | Label |
|---|---|
| 1 | Poor |
| 2 | Weak |
| 3 | Solid |
| 4 | Excellent |
| 5 | Best in class |

## Rules that keep measures mutually exclusive

1. **One complaint, one measure.** The AI lists complaints (with a source quote), assigns each to exactly one measure using the BS decision order below, and rates from that list.
2. **Rate each measure on its own.** Rate Gameplay and Challenge as if the game works; bugs belong to Broken only.
3. **No complaint on both sides.** Recycled enemies lower Repetition only, not Gameplay. Unfair difficulty lowers Challenge only, not Friction.
4. **Every rating cites a source.** No quote means the basis is "inferred".

### BS decision order (first match wins)

1. Technical fault (crash, bug, performance, lost progress) -> **Broken**
2. Must repeat work to be allowed to progress -> **Grind**
3. Operating or moving through the game -> **Friction**
4. A low-value content unit (quest, activity, collectible) -> **Padding**
5. Core encounters, bosses, or mechanics recurring -> **Repetition**
6. Timing and sequencing of content -> **Pacing**

Padding = low *value*, Repetition = low *variety*, Pacing = poor *timing*. A fetch quest that is both low value and repetitive is Padding (rule 4 comes first), so it is counted once.

## The BS: six measures

### Padding (value)
Does it add hours with content that gives nothing back?
- **Counts:** filler and fetch quests, templated activities, collectible checklists, map-icon sprawl, whether mandatory or optional.
- **Doesn't count:** a big world with good content; recurring encounters (Repetition); required farming (Grind).
- **Anchors:** 1 = a few ignorable collectibles; 3 = filler noticeably dilutes the game, you could cut hours without loss; 5 = most of the hours are filler.
- **Evidence:** HowLongToBeat main vs completionist gap, achievement completion rates, reviewers saying filler / checklist / map icons.

### Grind (gated)
Is progress blocked until you repeat work?
- **Counts:** XP and level walls, forced resource farming, RNG-gated progress, chores required to unlock the story, time-savers sold to skip the above.
- **Doesn't count:** optional farming for min-maxing.
- **Anchors:** 1 = none; 3 = regularly stalls progress until you farm; 5 = progress is mostly grinding.

### Friction (operating)
Does operating or moving through the game cost avoidable time?
- **Counts:** UI, menu, and inventory sludge; poor fast travel; long runbacks after death; sparse checkpoints; forced backtracking that pays off nothing; save/load overhead.
- **Doesn't count:** how controls feel (Gameplay); difficulty spikes (Challenge); unskippable scenes and tutorials (Pacing). Designed backtracking, as in a metroidvania, is not friction unless it is pure time cost.
- **Anchors:** 1 = respects your time; 3 = regularly annoying overhead; 5 = constant.

### Repetition (variety)
Does the core game recycle the same things without evolving?
- **Counts:** reused enemies, bosses, and arenas; the same mission or encounter structure across the campaign; mechanics that overstay their welcome.
- **Doesn't count:** templated side activities as content units (Padding); required repetition (Grind); roguelike run loops, unless the content itself runs thin.
- **Anchors:** 1 = constantly fresh; 3 = noticeable by the midpoint; 5 = the same thing for most of the game.

### Pacing (timing)
Does the sequencing of content lose momentum?
- **Counts:** slow starts, overlong tutorials, unskippable cutscenes, sagging stretches, payoff droughts.
- **Doesn't count:** low-value units (Padding); story quality (Story); a deliberate slow burn that pays off.
- **Anchors:** 1 = momentum holds; 3 = recurring stretches that lose momentum, or a start that takes hours to get going; 5 = the pace undermines the whole game.

### Broken (technical state)
Do technical faults cost time or progress today?
- **Counts:** crashes, bugs, lost saves, broken quests, severe performance problems. Rated as the game is today, after patches, on its best-supported platform. A problem on one platform only caps this at 3; 4-5 requires problems that persist across platforms. Fixed launch problems go in the rough-launch flag, not here.
- **Doesn't count:** design weakness. A confusing inventory is Friction; an inventory that loses changes is Broken. Do not also lower other measures for bugs.
- **Anchors:** 1 = rock solid; 2 = minor bugs; 3 = frequent bugs but playable; 4 = serious problems (crashes, lost progress, major performance); 5 = barely playable.

## The Juice: six measures

### Story
Does the narrative pull you forward?
- **Counts:** plot, characters, writing, emotional impact, side-quest writing. Environmental and cryptic storytelling counts fully.
- **Doesn't count:** narrative rhythm (Pacing); voice performance (Presentation).
- **Not applicable:** no story intent (competitive shooters, abstract puzzles).
- **Anchors:** 1 = incoherent or actively bad; 3 = competent; 5 = memorable and drives you to keep playing.

### Gameplay
How good is it to play, minute to minute?
- **Counts:** core loop, combat, movement, controls, depth of systems.
- **Doesn't count:** difficulty fairness (Challenge); enemy or encounter variety (Repetition); bugs (Broken).
- **Anchors:** 1 = frustrating to play; 3 = solid; 5 = feels great and stays great.

### World
Are the places worth being in?
- **Counts:** level design, exploration that pays off, environmental storytelling, coherence of place.
- **Doesn't count:** audiovisual craft (Presentation); filler density (Padding).
- **Not applicable:** abstract or menu-driven games with no spaces.
- **Anchors:** 1 = bland or incoherent; 3 = pleasant; 5 = a place you want to be in, and exploring is rewarded.

### Presentation
Does it look and sound good?
- **Counts:** art direction, animation, sound design, music, voice acting.
- **Doesn't count:** performance problems (Broken); level layout (World).
- **Anchors:** 1 = dated, ugly, or grating; 3 = competent; 5 = distinctive and polished.

### Challenge
Is the difficulty well designed?
- **Counts:** fair, readable difficulty that rewards mastery. Cheap, arbitrary, or badly balanced difficulty lowers it. For games that are easy by design, rate the depth of decisions instead.
- **Doesn't count:** the difficulty level itself, which is never penalized.
- **Anchors:** 1 = trivial or unfair; 3 = engaging; 5 = deep, fair, memorable.

### Staying power
Are there reasons to keep playing after one pass?
- **Counts:** builds, runs, NG+, multiplayer, mods, post-game.
- **Not applicable** unless the design relies on repeat play (roguelikes, multiplayer, live service, sandbox). Complete-by-design games are skipped, not scored low.
- **Anchors:** 1 = nothing worth returning for; 3 = some reasons; 5 = strong reasons to return.

## Math (under test, not final)

- **Juice** = genre-weighted average of applicable ratings, `(r - 1) / 4`. Genre profiles, weights, and per-game assignments are in [genre-profiles.md](./genre-profiles.md) (done). In code, the Juice measures (including Presentation and Staying power) and weights are already updated; the 1-5 scale and the squeeze side are not yet.
- **BS** = worst three of six, weighted 50/30/20, same `(r - 1) / 4`. Formula sensitivity is a separate offline check after the reliability tests; the one-complaint rule is meant to stop one problem filling several slots.
- **Verdict thresholds** (`VERDICT_RULES`) were tuned on the old 0-5 math. Re-tune with `POST /api/recompute` after the re-score.
- Broken feeds the BS index and also drives "Not yet". "Not yet" short-circuits before the BS rules, so the verdict never stacks; the cross-measure risk is the AI also lowering Gameplay or Friction for bugs, which rule 2 forbids.

## Rubric additions agreed in principle (fold into the sections above before testing)

1. **Coverage:** each measure gets a coverage status. "Not discussed" in the sources is an empty rating (skipped by the index), never a 1. Too many empty measures marks the game provisional. Each measure has minimum evidence (for example Broken needs recent Steam reviews; Padding needs the HowLongToBeat gap, achievements, or reviewer language).
2. **A complaint is an issue, not a sentence.** The same issue described by several sources becomes one issue with a corroboration count, classified once.
3. **Full 1-5 anchors for every measure**, with worked examples (including near-misses) from our own sources, and written tie-breakers for Padding/Grind, Padding/Repetition, Repetition/Pacing, Friction/Pacing, Friction/Grind.
4. **Staged pipeline:** call 1 extracts, merges, and classifies issues (with quotes); call 2 rates each measure from that list; code computes the indexes.
5. **Display:** show the verdict with rounded or banded numbers, since five-level ratings do not support one-point precision.

## Reliability tests

See [reliability-test-plan.md](./reliability-test-plan.md): repeated runs of `gemini-3.5-flash-lite` and `gemini-3.8-flash` on a set of games Jordan provides, with no human rater. It covers test-retest agreement, stage-by-stage noise, irrelevant-change robustness, cross-model agreement, and non-human plausibility checks, with thresholds fixed before the first run.
