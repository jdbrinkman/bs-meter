# BS Meter — Project Plan

## Context

Build a React web app ("BS Meter") that scores video games on a 1-10 scale based on how much they respect the player's time. Like Metacritic/OpenCritic, but instead of aggregating review scores, it uses AI to analyze reviewer transcripts, time-to-beat data, and review sentiment to detect bloat, filler, and grind — producing a transparent "BS Score" with full explainability.

**MVP scope**: ~20 manually curated games, batch-analyzed, browsable on a public site.

---

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 14+ (App Router) — React frontend + API routes in one repo |
| Database | Supabase (Postgres, free tier) |
| AI | Gemini 2.5 Flash (free tier) |
| AI SDK | `@google/genai` + `zod` + `zod-to-json-schema` for structured output |
| Styling | Tailwind CSS |
| Deployment | Vercel (free tier) |
| Validation | Zod (parse AI JSON output via `zodToJsonSchema` for Gemini `responseJsonSchema`) |
| Supabase Client | `@supabase/ssr` with `createServerClient` (server) + `createBrowserClient` (client) |

---

## Scoring System

### Formula
```
BS_Score = (w.P × Pacing) + (w.B × Bloat) + (w.V × Value) + (w.G × Grind)
```
Each pillar scored 1-10 by Gemini 2.5 Flash. Weights vary by genre.

### Default Weights
P=0.40, B=0.30, V=0.20, G=0.10

### Genre-Adjusted Weights
| Genre | P | B | V | G | Key Guidance |
|-------|---|---|---|---|---|
| Open-world RPG | 0.30 | 0.40 | 0.15 | 0.15 | Penalize checklist filler, not world size |
| Roguelike | 0.35 | 0.15 | 0.25 | 0.25 | Penalize meta-grind, not replay loops |
| Survival | 0.25 | 0.30 | 0.20 | 0.25 | Penalize grind walls, not base-building |
| Horror/Action | 0.50 | 0.20 | 0.20 | 0.10 | Heavily weight pacing & authored density |
| JRPG | 0.35 | 0.25 | 0.25 | 0.15 | Penalize padding, not expected length |
| Souls-like | 0.30 | 0.20 | 0.20 | 0.30 | Difficulty is expected; penalize artificial walls |
| Indie/Short | 0.35 | 0.10 | 0.40 | 0.15 | Value-per-dollar matters more |

### Brackets
- 9-10: **Lean Masterpiece** (Blue `#3B82F6`)
- 7-8: **High Signal** (Green `#22C55E`)
- 5-6: **The Fair Trade** (Yellow `#EAB308`)
- 3-4: **Content Sludge** (Orange `#F97316`)
- 1-2: **Clock Puncher** (Red `#EF4444`)

---

## Data Pipeline (per game)

1. **Ingest metadata** — IGDB API (genres, cover, release date, developer)
2. **Ingest time data** — HowLongToBeat (main story, main+extras, completionist hours)
3. **Ingest reviews** — OpenCritic API (score, tier, review snippets)
4. **Ingest transcripts** — YouTube Data API search per trusted reviewer channel + `youtube-transcript` npm for captions
5. **AI analysis** — Send all data to Gemini with structured prompt → get pillar scores, detected BS signals, evidence, confidence
6. **Score computation** — Apply genre-adjusted formula, classify bracket
7. **Store** — Write scores, signals, evidence to Supabase

### Trusted Reviewers
ACG, Mortismal Gaming, Digital Foundry, The Sphere Hunter, Iron Pineapple, Worth A Buy, SkillUp, FightingCowboy

---

## File Structure

```
bs-meter/
├── supabase/migrations/          # Postgres schema
├── src/
│   ├── app/
│   │   ├── page.tsx              # Homepage — hero + featured games
│   │   ├── games/
│   │   │   ├── page.tsx          # Browse/filter game listing
│   │   │   └── [slug]/page.tsx   # Game detail — score, signals, evidence
│   │   ├── about/page.tsx        # Methodology explainer
│   │   └── api/
│   │       ├── games/            # CRUD routes
│   │       ├── analyze/route.ts  # Trigger AI analysis
│   │       ├── ingest/           # Per-source data fetchers
│   │       └── seed/route.ts     # Batch seed + analyze
│   ├── lib/
│   │   ├── supabase/             # Client setup (browser, server, admin)
│   │   ├── api/                  # IGDB, OpenCritic, HLTB, YouTube wrappers
│   │   ├── ai/
│   │   │   ├── gemini.ts         # Client setup
│   │   │   ├── prompts.ts        # Prompt templates (most critical file)
│   │   │   ├── analyze-game.ts   # Analysis orchestrator
│   │   │   └── parse-response.ts # Zod validation of AI output
│   │   ├── scoring/
│   │   │   ├── formula.ts        # Weighted score computation
│   │   │   ├── genre-rules.ts    # Genre weight lookups
│   │   │   └── brackets.ts       # Score → bracket classification
│   │   ├── pipeline/
│   │   │   ├── ingest.ts         # Data fetching orchestrator
│   │   │   └── process.ts        # Full pipeline orchestrator
│   │   └── types/                # TypeScript type definitions
│   ├── components/
│   │   ├── bs-meter/             # ScoreGauge, PillarBreakdown, SignalList, EvidenceCard
│   │   ├── game/                 # GameCard, GameGrid, GameHeader
│   │   └── layout/              # Header, Footer, SearchBar
│   └── config/
│       ├── signal-taxonomy.ts    # BS signal definitions (structured data)
│       ├── genre-weights.ts      # Genre rule configs
│       ├── trusted-reviewers.ts  # YouTube channel IDs + metadata
│       └── seed-games.ts         # Initial game list for MVP
```

---

## Database Schema (5 tables)

- **games** — metadata, time data, price, analysis status
- **scores** — final BS score, pillar scores, bracket, explainability summary, top reasons
- **signals** — detected BS signals per game with strength, evidence, source
- **review_sources** — stored transcripts and review data per game
- **genre_rules** — genre weight overrides (seeded config)

---

## Frontend Pages

### Homepage (`/`)
- Hero with tagline
- Featured "Leanest" and "Most Bloated" game cards
- Recent analyses grid

### Browse (`/games`)
- Genre and bracket filter chips
- Sort by score, release date, recently analyzed
- Responsive GameCard grid

### Game Detail (`/games/[slug]`)
- Cover art, metadata, price
- Large score gauge + bracket badge
- Explainability summary ("Why this scored X")
- Pillar breakdown (4 bars)
- HLTB time comparison visualization
- Positive/negative signal chips with strength
- Evidence cards with reviewer quotes and links
- OpenCritic comparison

### About (`/about`)
- Full methodology, pillar definitions, genre rules, signal taxonomy, reviewer list

---

## Implementation Phases

### Phase 1 — MVP (target: 3 weeks)

**Week 1: Foundation**
- Scaffold Next.js project with TypeScript + Tailwind
- Set up Supabase project + run migrations
- Build Supabase client helpers
- Build API wrappers (IGDB, OpenCritic, HLTB, YouTube)
- Create config files (seed games, reviewers, taxonomy, genre weights)
- Create TypeScript type definitions

**Week 2: Pipeline + AI**
- Build ingest pipeline orchestrator
- Build Gemini client + prompt templates
- Build AI analysis orchestrator + zod response parser
- Build scoring formula + genre rules + bracket classification
- Build full pipeline process orchestrator
- Build `/api/seed` route
- Run against ~20 seed games, iterate on prompt quality

**Week 3: Frontend**
- Layout components (Header, Footer)
- Score display components (ScoreGauge, PillarBreakdown, SignalList, EvidenceCard, BracketBadge)
- Game listing components (GameCard, GameGrid)
- Homepage, browse page, game detail page, about page
- Deploy to Vercel

### Phase 2 — Polish (weeks 4-5)
- [x] Full UI redesign on `new-ui` branch (Stitch-inspired editorial layout)
- [x] Replaced score circle with semicircular needle gauge (BSGauge component)
- [x] Gauge segment hover tooltips with label + plain-English descriptions
- [x] Game detail page: flat open header, 12-col forensic grid, sticky cover art
- [x] Evidence section: 2-col BS/Respect chip layout, labels only (no strength numbers)
- [x] Removed confidence chip, audit report AI noise
- [x] Added Steam reviews + OpenCritic cards to bottom of game page
- [x] Separated ingest pipeline from scoring (`/api/ingest` + `/api/score` routes)
- [x] Fixed IGDB fuzzy search issues (God of War, Dead Space) with exact slug lookup
- [x] Steam CDN cover art as primary source when steamAppId is present
- [x] Added Overwatch 2 and Marvel Rivals to seed list
- [x] Fixed Hades II Steam App ID (1659760 → 1145350)
- [x] Updated home page headline and subheading
- [x] Merged `new-ui` → `main`
- [x] Ingested Mortal Shell II, Onimusha: Way of the Sword, The Blood of Dawnwalker (35 games total)
- [x] Mapped Mortal Shell titles to the soulslike genre rule (IGDB has no soulslike tag)
- [x] Durable cover art: `resolveCoverUrl` checks Steam → IGDB → Steam header and keeps the first that loads (new Steam releases use hashed paths)
- [x] `POST /api/covers` audit/repair route; ingest re-verifies cover at the end
- [~] Verdict-first concept mockup on `verdict-redesign` branch (verdict, BS index, 3 chips; rest collapsed) using derived mock data; scoring model decisions still open (what BS measures, juice vs. squeeze, price in verdict)
- [x] Scoring v2 (juice/squeeze): 12 measures rated 0-5 by the AI against written rubrics (`src/lib/scoring/v2.ts`), deterministic juice/BS index + verdict from ratings; migration 008, `/api/score-v2`, `/api/recompute-v2`
- [~] Re-score all games with v2: 22 of 35 done; remaining 13 hit the Gemini free-tier daily quota; rerun all after prompt tweak (broken = best-supported platform)
- [ ] Anchor-game check with Jordan (TLOU2 and Sekiro expected "Worth it"; Onimusha looked suspicious)
- [x] Category review: BS = Padding, Grind, Friction, Repetition, Pacing, Broken (Monetization and Manipulation dropped: not about time); Juice = Story, Gameplay, World, Presentation, Challenge, Staying power (Content dropped, Staying power not-applicable for complete-by-design games); both sides 1-5; one complaint, one measure; full rubric in `docs/scoring-rubric.md`; thesis added to CLAUDE.md
- [x] Genre profiles (`docs/genre-profiles.md`): explicit per-game assignment for all 37 games (`src/config/game-profiles.ts`, mapper kept as fallback), new Multiplayer / live service and Turn-based tactics profiles, neutral guidance notes, Juice measures (Presentation, Staying power) and weights rewritten in `v2.ts`; types and lint pass; assignments and weights need Jordan's review
- [x] Lorelei and the Laser Eyes ingested (puzzle test game; IGDB 206806, Steam 2008920, HLTB 17.1 h, OpenCritic 87.5 with 40 reviews, 5 written reviews, 1 YouTube transcript after the reject-filter fix), profile puzzle-narrative; not scored
- [x] Implement the rest of the rubric (2026-10-28): `v2.ts` has the 6 squeeze measures (Pacing in, Monetization out) with full 1-5 anchors, minimum evidence, the BS decision order and tie-breakers; indexes use `(r - 1) / 4`; not-applicable and not-discussed are null and skipped (BS no longer treats missing as clean, re-weights if fewer than 3 rated); `isProvisional` flag; `displayIndex` rounds to the nearest 5. `schema.ts` (observations with quote/source/category/corroboration, ratings with status), `prompt.ts` (extract and rate prompts, worked examples, a classify-only prompt for the harness), `run.ts` + `analyze.ts` (staged pipeline; model and thinking level configurable; returned model ID, tokens, finish reason saved), game page (dots, N/A, "Not discussed", provisional note, banded numbers, legacy rows still render) and About page. `scoreGameV2` now runs both stages, de-duplicates sources, and saves issues/provisional/run_meta. `recomputeAllV2` skips pre-v3 rows so old ratings cannot be corrupted. Temperature is no longer forced to 0 (Google advises the 1.0 default for Gemini 3.x). Production model is provisional (`gemini-3.8-flash`, medium) until the tests choose. Migration `017_rubric_v3.sql` written, NOT applied to the live database
- [x] Full re-score done 2026-10-29/30 (`scripts/rescore.ts`; same `scoreGameV2` code as the site; prompt v3.1, rubric v3.0, `gemini-3.8-flash`): 38 of 38 games on scoring_version 3, 0 failures, $2.55, backup of the old rows in `tmp/irr/backup/scores-2026-10-30.json`. Verdicts: 23 Worth it, 5 Wait for a sale, 10 Skip. Against the earlier (rubric v2) verdict: 18 same, 5 changed (Crimson Desert Worth it -> Skip, Marvel Rivals Not yet -> Worth it, Overwatch 2 Skip -> Worth it, Pragmata Worth it -> Wait for a sale, Last of Us Part II Skip -> Worth it), 15 had none. 3 provisional (Marvel Rivals, Mio, Overwatch 2). 38 of 885 quotes not found (4%). Comparison table: `tmp/irr/reports/rescore-comparison.md` (`scripts/irr/compare.ts`). Final Fantasy Tactics, Lorelei and XCOM 2 were put back to 'pending' so the old public UI keeps hiding them. Skull and Bones took 261 s (the `/api/score` route allows 120 s): scoring through the site route may time out for slow games
- [x] Borderline reruns done 2026-10-30 (`scripts/rescore-median.ts`): 8 games within 3 points of a verdict line got 2 more runs; middle rating per measure now decides the stored numbers (`run_meta.median_of = 3`, per-run results in `run_meta.runs`, all runs in `tmp/irr/runs/rescore-median/`, rows backed up in `tmp/irr/backup/scores-pre-median-*.json`). $1.03 (re-score total $3.58). 6 of 8 games had at least one run disagree with the others on the verdict; the median matched the majority verdict in all 8. 2 verdicts changed: Crimson Desert Skip -> Wait for a sale (runs: Skip, Wait, Wait), Mass Effect 3 Worth it -> Wait for a sale (Worth it, Wait, Wait). Still within 3 points of a line after the median: Dragon Age: Inquisition, FFVII Rebirth, FFXVI, Ghost of Yotei, Marvel Rivals, Mass Effect 3. Final tally of 38: see `tmp/irr/reports/rescore-comparison.md`
- [x] New design now lists games that are scored but still 'pending' (`isListed` in `src/lib/listing.ts`, also used by `/api/search` and `/api/games`), so Final Fantasy Tactics, Lorelei and XCOM 2 show on localhost while the old public site keeps hiding them; no status change needed at deploy (38 games listed)
- [x] "The squeeze" renamed "The BS" on the game page and About page (internal code and AI prompt still say squeeze; changing the prompt would need a retest)
- [x] Browse filters reworked on branch `browse-filters` (2026-10-30): verdict as a segmented bar with counts (zero shown muted, not clickable), Platform / Genre / Sort-by dropdowns with counts that respect the other filters (empty options disabled), removable chips for applied filters plus Clear all, URL-driven (`?verdict=&platform=&genre=&sort=`; unknown values ignored). Player-facing groups live in `src/config/browse-groups.ts` (5 genre groups matched on IGDB tags or scoring profile, 5 platform groups; Stadia/iOS dropped); sorts: best deal, lowest BS, highest Juice, newest, shortest. Year and Rating filters deliberately not built (sort covers them). Open: genre groups lean on IGDB tags that are noisy (check on the next batch of games); 36 of 38 games have story hours, the rest sort last under Shortest
- [ ] Review the new scores on localhost, then commit, PR to `main`, check the Vercel preview, merge
- [ ] Deployment order for the re-score (checked 2026-10-29): the public site is https://bs-meter-gules.vercel.app (Vercel project bs-meter, production deploys from `main`, last deploy 2026-10-06 at c7f0eb2; preview URLs are behind Vercel login, the production domain is not). It still runs the old v1 UI, which reads `scores.bs_score`, `verdict` and `top_reasons` and lists only games with `analysis_status = 'complete'`. The new UI exists only on `verdict-redesign` (16 commits ahead of `main`, plus uncommitted work) and reads the v2/v3 columns; 12 live rows (Valhalla, Diablo IV, FFVII Rebirth, FFXVI, Hades, Hollow Knight, Silksong, Horizon FW, ME3, ME Andromeda, Mio, Starfield) have no v2 data, so deploy the new UI only AFTER the re-score. Re-score writes only the v2/v3 columns, so the old public pages keep their old scores; each game drops out of the public list for ~1-2 minutes while it is scored (status 'analyzing'). Final Fantasy Tactics, Lorelei and XCOM 2 have no score row and are 'pending' (unlisted): put them back to 'pending' after scoring and set 'complete' when the new UI deploys, or the old UI would list them with an empty score
- [x] Migration 017 applied to the live BS-Meter project 2026-10-29 (adds `scores.issues`, `provisional`, `run_meta`; verified: 3 nullable columns present, 35 existing score rows untouched). Live table: 38 games, 35 score rows, 23 with a verdict_v2
- [x] Model research: Google's stable lineup checked on its own pages (2026-10-28); candidates `gemini-3.5-flash-lite` (cheaper) vs `gemini-3.8-flash` (stronger); 2.5 Flash is legacy but has no shutdown date; choice to be made by the reliability tests
- [x] Reliability test plan written (`docs/reliability-test-plan.md`): AI-only IRR (test-retest, stage-by-stage noise, robustness, cross-model), no human rater, thresholds fixed before running
- [x] YouTube lookup fix: expansions and DLC (e.g. XCOM 2: War of the Chosen, Elden Ring: Shadow of the Erdtree) are rejected via `src/config/known-expansions.ts` passed as extra sibling titles; roman numerals above X now match (Final Fantasy XVI = 16); 14 new offline cases in `scripts/test-youtube.mjs`, all pass; a tail-word guard was tried and dropped because it would have rejected 75 of 220 stored titles. Reject filter now ignores quoted text (press taglines like 'One of the best puzzle games of 2024' no longer count as a best-of list); 9 reject-filter test cases added. The 6 stored wrong-game videos (Mortal Shell 1 x2 under Mortal Shell II, Dragon Age Veilguard, Mass Effect Andromeda, Hollow Knight preview, ACG ME Legendary Edition) were deleted. Still stored but rejected by the matcher: DF 'Mass Effect Legendary Edition' tech breakdown (ME3) and SkillUp 'Dead Space (2023)' (correct game, no 'Remake' in title)
- [x] Reliability tests for v2 run 2026-10-28/29, $7.97 of the $10 budget; full report in `docs/reliability-results.md`, data in `tmp/irr/` (`ratings.csv`, `runs.csv`, per-run JSON, reports). Outcome: **no config passed every pre-registered gate**. `gemini-3.8-flash` (A) is clearly better than `gemini-3.5-flash-lite` (B: 20-43% of squeeze measures unrated, 15/35 runs provisional, verdicts unstable). A: alpha 0.92, 99% of items within one step, all 10 games' verdicts stable, robust to shuffled/duplicated/reworded/masked inputs (median shift 0); fails index SD (5.5 vs 3) and applicability kappa (0.60 vs 0.80). Noise is in stage 1 extraction (issues per run 14-65 for the same evidence); rating and classification steps are ~stable (alpha 0.97, kappa 0.99). Confirmation: Sekiro and TLOU2 Worth it, Marvel Rivals Wait for a sale. Cuts vs plan (spend ladder): Phase 2 on A only, Phase 3 on 2 games x 2 runs, confirmation 2 runs per game, no wording rounds, no Batch API
  - [x] Harness `scripts/irr/` (`run.ts`, `analyze.ts`, `offline.ts`, `export.ts`, `project.ts`, `stats.ts` + tests); `tsx` added as a dev dependency; never writes to the scores table
  - [x] Phases 0-5 run (see results doc)
  - [ ] Jordan to decide: how to treat the index-noise gate (re-specify on verdict/band stability, change the BS formula, or median of 3 at 3x cost); (stage-1 fix since tested, see below)
  - [x] Stage-1 fix (prompt v3.1: per-measure coverage list, 2-6 observations per measure, coverage passed to the rating step) and Staying power applicability decided by genre profile in code (`stayingApplies`), retested on the 7 dev games x 3 runs, $1.26 (total $9.23 of $10). Median index SD 5.5 -> 2.89 (passes), applicability kappa 0.60 -> 0.86 (passes), alpha 0.94; still fail 95th-percentile index SD (9.2) and verdict stability (86%) because Final Fantasy Tactics sits on the Worth it / Wait for a sale line. Details in `docs/reliability-results.md`. Confirmation games rerun on v3.1 ($0.34, total $9.57): index gaps narrower, but Marvel Rivals flipped Worth it / Wait for a sale at the Juice 65 threshold, and the coverage flag can still contradict its own note (Marvel Rivals Grind)
  - [x] Verdict computed on the rounded (nearest 5) Juice and BS, so equal displayed numbers give equal verdicts; replayed offline on 68 runs: 5 changed (Marvel Rivals Wait -> Worth it x3; Last of Us Part II v3.0 runs at Juice 72 Worth it -> Wait x2), 63 did not
  - [x] `worthJuiceExpensive` 72 -> 70 (only threshold off the 5-point grid); replay: 5 of 68 runs differ from the original rules, all toward Worth it (Marvel Rivals x3, Final Fantasy Tactics x2); Last of Us Part II restored
  - [ ] Decided (Jordan), to do after the first re-score: rerun only the borderline games (Juice or BS within ~3 points of a verdict line) twice more and take the median ratings; about $1 for ~8 games; one-time pass, not built into the pipeline (not tested)
  - [ ] Jordan to decide: whether Marvel Rivals at Juice 63-65, BS 38-50 should be Worth it; whether a coverage note that cites a source should force "discussed" (untested; $0.43 of budget left); re-specify the verdict-stability gate for borderline games; then apply migration 017 and re-score
  - [x] Production hardening (2026-10-29): HTTP 400 retried once (`src/lib/ai/v2/run.ts`); unrated measures get source "none" in code (Staying power forced not-applicable keeps "genre profile"); every saved issue gets `quote_found` (true / false / null) and `run_meta.unmatched_quotes` counts the misses, via the shared check in `src/lib/pipeline/evidence.ts` (harness uses the same code; v3.1 test quotes found 97%, v3.0 95%). Not live-tested: the 400 retry needs a real 400 to exercise it
  - [ ] Difficulty/Challenge wording tweaks (difficulty leaking into Pacing for Sekiro and into PvP Challenge for Marvel Rivals); would change the prompt, so needs a retest
- [ ] Fix wrong cover art (Witcher 3 shows Dark Souls III box)
- [ ] Rethink game page hierarchy: no single glanceable score, and gauge, evidence, dimension breakdown, Steam reviews and OpenCritic compete for attention
- [ ] Full-text search (Postgres tsvector)
- [ ] Genre/bracket filter UI
- [ ] SEO + dynamic OG images
- [ ] Loading skeletons + error boundaries
- [ ] Game comparison view
- [ ] Simple feedback (helpful yes/no)
- [ ] Expand to 50 games (35 so far)

### Phase 2b — Data integrity and evidence sourcing (planned)
- [x] Fix 5 wrong trusted-channel IDs (FightinCowboy, Mortismal, Sphere Hunter, Iron Pineapple, Worth A Buy); verify by handle
- [x] `npm run audit` health check (first version: channels, duplicates, coverage, v2 completeness, release-date cross-check vs Steam) (channel IDs resolve, IGDB vs Steam release-date cross-check, no dupes, evidence age/coverage, one score per game)
- [~] Ingest log: YouTube step writes to `ingest_log`; Steam/OpenCritic/IGDB steps do not yet
- [~] Safe writes: dedupe + unique key + upsert + published_at done (migration 009, ingest.ts); v2 write still needs affected-row check
- [x] Fix IGDB records: verified resolver (`pickIGDBCandidate` rejects bundles/mods/updates, prefers exact name then most-rated), seed slugs for Witcher 3, Hollow Knight, Silksong, RE4 Remake, Overwatch 2; metadata step extracted (`ingest-metadata.ts`, `POST /api/ingest/igdb`); Witcher 3 cover fixed; audit release-date check passes
- [x] Refreshed YouTube sources for all 35 games on the new lookup (30 games have 4+ transcripts, only Mio has 1); Digital Foundry gets its own "tech review" search (29/35 games have a DF video)
- [x] YouTube lookup rebuild (`youtube-lookup.ts`, `ingest-youtube.ts`, `/api/ingest/youtube`; 25 offline title-match cases in `scripts/test-youtube.mjs`; the 10 games with no transcripts now have 2-9 each; transcripts keep start+end, 3 retries, every step logged to ingest_log): ONE broad "[game] review" search (100 units) filtered to the trusted-channel set, then variant queries / channel-restricted search only if short; strict title match, retries, keep start+end of transcripts (upload lists do NOT work for huge channels like IGN, 185k videos)
- [x] Expand trusted channels: IGN, GameSpot, Eurogamer, PC Gamer, Easy Allies, GamesRadar, Rerez, Raycevick (approved; 16 channels, IDs verified by audit)
- [x] Critic layer: `critic_reviews` table + `article` source type (migration 010); OpenCritic reviews (40/game) stored; full text of up to 5 readable written reviews per game fed to the v2 prompt (Eurogamer, PC Gamer, GamesRadar+, IGN, Polygon work; GameSpot 403 and Game Informer JS-rendered are skipped); critics listed as sources at the bottom of the page, not shown prominently; OpenCritic aggregate score removed from the prompt; `POST /api/ingest/critics`
- [ ] Evidence ladder: trusted YouTube -> widened YouTube -> OpenCritic written reviews -> Steam long-playtime reviews -> Reddit; evidence status full / limited / insufficient per game
- [x] Fixed wrong OpenCritic entries (Resident Evil 4 Remake pointed at the 2005 game, Mass Effect 3 shared Andromeda's entry, Mortal Shell II had none); verified resolver `pickOpenCriticCandidate` (name + release year), seed `opencriticId` overrides, audit checks for shared IDs and review dates
- [x] Steam store facts (migration 011, `steam-store.ts`, `ingest-steam.ts`, `POST /api/ingest/steam`): current price, discount, IAP flag, DLC count, achievement stats; 32/35 games (Saros, Ghost of Yotei, Mass Effect 3 are not on Steam); verdict and prompt now use current price; 13 seed prices were >20% off
- [x] Steam reviews rebuilt on Valve's documented replacement `IUserReviewsService/GetAppReviews` (the old `/appreviews` endpoint is deprecated and redirects from this network): all-time summary, last-30-day windowed counts (Helpful + day_range), and the most helpful positive/negative reviews from players with 20+ hours; verified live; 32/32 Steam games sampled (see `docs/source-and-ingestion-evaluation.md` which flagged this)
- [x] Price history via IsThereAnyDeal (`ITAD_API_KEY`, migration 012, `itad.ts`, `ingest-prices.ts`, `POST /api/ingest/prices`): all-time low and best fresh price at reliable stores for 32 games; ITAD's Steam price matches the Steam API on 32/32 (audit cross-check); `price_source` labels steam vs list price; page shows "all-time low $X" and "list price". Verdict price stays Steam's own price (ITAD cheapest deals are often stale or from gray-market sellers: 22 of 35 older than 14 days)
- [x] IGDB time-to-beat (migration 014, `ingest-time.ts`, `POST /api/ingest/time`): community hours stored beside hand-typed ones; hand-typed never overwritten, IGDB fills gaps (6 games) with sanity rules (3+ submissions, ordered times, 6x-outlier completion dropped); agrees with the hand-typed hours on 22/22 comparable games; HLTB stub removed; still no hours: Marvel Rivals and Overwatch 2 (live service), Mio, Saros (too few submissions)
- [x] HowLongToBeat live (permission granted by HLTB/Ziff Davis, per Jordan; paste the confirmation into `docs/data-source-permissions.md`): `howlongtobeat-ts` with an honest BSMeter user agent, identity checked by title + release year, refreshed every 30 days, 2.5s spacing; 33/35 games now have live HLTB hours (Marvel Rivals and Overwatch 2 are live-service with no single-player times); order is HLTB -> hand-entered seed -> IGDB gap-fill; IGDB cross-check agrees (migration 015)
- [x] Remove OpenCritic score from the scoring prompt (display only)
- [x] One scoring version everywhere: home, /games, search, /api/games, About page and cards all read v2 (`verdict_v2`, `bs_index`, `juice_index`); shared `GameBrowser` + `listing.ts`; verdict rules in one place (`VERDICT_RULES`) and rendered on the About page from the same constants; v2 is the only scoring writer (`scoreGameV2` upserts the score row, saves genre/confidence/model/time, sets analysis_status, fails loudly); `/api/score` and `/api/analyze` now score with v2; v1 code deleted (formula, brackets, v1 prompt/parser, gauges, signal/dimension components); v1 DB columns kept nullable as legacy (migration 013); filters are Verdict + Genre; unrated games show "Not rated yet"
- [x] Ingested (not scored) two tactics games for genre variety: Final Fantasy Tactics: The Ivalice Chronicles (2025 remaster, IGDB 347121, Steam 1004640) and XCOM 2 (2016 base game, IGDB 10919, Steam 268500): metadata, HLTB hours, OpenCritic reviews + 5 written articles each, YouTube (3 each), Steam facts + reviews, ITAD prices, covers; audit clean for both. Dataset is now 37 games; the 2 new ones still need scoring after billing. An XCOM 2: War of the Chosen review video the lookup matched by title was removed by hand (the lookup does not yet reject expansion titles)
- [x] Gemini paid billing on (pilot ran on the paid tier)
- [ ] Re-score all 38 games once (needs: migration 017 applied, the decisions above; A costs about $3.1 single-run, $9.3 for median of 3; Gemini 3.8 Flash promo price ends 2026-12-31). Then `POST /api/recompute-v2`, then anchor review

### Phase 3 — Scale (week 6+)
- [ ] Game request form (users suggest, admin approves)
- [ ] Scheduled re-analysis cron
- [ ] User accounts (Supabase Auth)
- [ ] Community features
- [ ] Publisher BS leaderboard

---

## Key Technical Notes

- **YouTube quota**: 10,000 units/day. 8 reviewer searches per game = 800 units = ~12 games/day. Spread MVP seeding across 2 days.
- **HLTB fragility**: The npm package scrapes and may break. Fallback: manual time data in seed config + AI estimation from transcripts.
- **Gemini 2.5 Flash SDK**: Use `@google/genai` (new SDK, not `@google/generative-ai`). Define Zod schemas, convert with `zodToJsonSchema()`, pass as `responseJsonSchema` in config. Model ID: `gemini-2.5-flash`. 1 retry on parse failure.
- **Security**: All write routes protected by `X-API-Key` header. RLS on Supabase: public read, service-role write.
- **Transcript quality**: Pipeline gracefully skips missing transcripts, AI confidence reflects source coverage.

---

## Verification Plan

1. Run `npm run dev` and verify homepage renders with game cards
2. Hit `/api/seed` with a single test game and verify the full pipeline completes
3. Check Supabase tables for correct data in games, scores, signals, review_sources
4. Load `/games/[slug]` for the test game and verify score gauge, pillar breakdown, signals, and evidence all display
5. Run the full seed batch (~20 games) and verify browse page populates correctly
6. Deploy to Vercel and verify all pages work in production
