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
- [ ] Full-text search (Postgres tsvector)
- [ ] Genre/bracket filter UI
- [ ] SEO + dynamic OG images
- [ ] Loading skeletons + error boundaries
- [ ] Game comparison view
- [ ] Simple feedback (helpful yes/no)
- [ ] Expand to 50 games

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
