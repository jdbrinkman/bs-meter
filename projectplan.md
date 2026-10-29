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
- [ ] Reliability tests for v2 (repeat runs, source-drop sensitivity)
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
- [ ] Gemini paid billing, then re-score all 35 once

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
