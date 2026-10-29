# Handoff: Juice/Squeeze review, then the re-score

Branch `verdict-redesign` (local, nothing pushed, `main` untouched). Last commit `4fa9af3`. Full history in `projectplan.md`.

## What BS Meter is now
One verdict per game (Worth it / Wait for a sale / Not yet / Skip) plus two 0-100 numbers: **Juice** (quality, higher is better) and **BS** (wasted time/money, lower is better). Each game is rated 0-5 on 12 fixed measures by Gemini; fixed code turns the ratings into the numbers and verdict. The AI never picks the verdict.

- Measures, rubrics, genre weights, verdict rules: `src/lib/scoring/v2.ts` (single source; the About page renders from it)
- Prompt: `src/lib/ai/v2/prompt.ts` | scoring write path: `src/lib/pipeline/score-v2.ts` (`scoreGameV2`, the only writer)
- Juice = genre-weighted average of applicable juice ratings. BS = worst three squeeze ratings weighted 50/30/20. Verdict rules in `VERDICT_RULES`.

## State of the data (all 35 games)
Ingest is done and clean: 16 YouTube channels (broad search + DF tech search), 40 OpenCritic reviews + up to 5 full written reviews, Steam facts/price/reviews (32 games), IsThereAnyDeal history, live HowLongToBeat (33 games, permission granted), IGDB metadata fixed. `npm run audit` is green except **12 games have no v2 ratings** and the other 23 were scored on the old, thinner evidence. All 35 need the re-score.

## Next, in order
1. **Review the juice and squeeze categories** (brief below). Change `v2.ts` and, if needed, the schema/prompt; no data migration needed because ratings live in one JSON column.
2. **Turn on Gemini billing** (Jordan; free tier is 20 requests/day on gemini-2.5-flash, so it blocks the re-score).
3. **Re-score all 35**: `POST /api/score` with header `x-api-key: $ADMIN_API_KEY` and body `{"gameId": "<uuid>"}`, one game at a time, ~4s apart. Game ids: `GET /api/games`. Then `POST /api/recompute` retunes verdicts from stored ratings with no AI cost.
4. **Check the anchors**: Sekiro and The Last of Us Part II were expected "Worth it" (TLOU2 scored Skip before; AI rated story 2/5 and gameplay 2/5 from three reviewers), Onimusha "looked suspicious". Don't force results; look at the reasons and sources.
5. **Reliability tests**: repeat runs (does a rating move?), drop one source, threshold edges.

## Brief for the category review
Questions to answer with real ratings in front of us, not in the abstract:
- **Overlaps.** Padding vs Repetition vs Content; Grind vs Friction; World vs Content. Same issue counted twice inflates BS and muddies the reasons. Rule today: each issue lives in one measure.
- **Friction is a grab-bag** (runbacks, unskippable scenes, menu sludge, tutorials, difficulty spikes, backtracking). Split or narrow?
- **Missing?** UI/controls was a v1 dimension and has no home now. Forced online/multiplayer, always-online DRM, time-gated FOMO events (currently under Monetization), long slow starts.
- **Juice fairness.** Staying power can punish short complete games; Challenge is awkward for easy-by-design games; Story/N-A handling for live-service games.
- **Evidence fit.** Which source can actually inform which measure (Steam 20h+ reviews for Grind/Repetition/Broken-today; HLTB + achievement rates for Padding; Steam store flags + critics for Monetization). Measures with weak evidence will be mostly "inferred".
- **Math.** BS 50/30/20 puts most good games at 36-56; verdict needs BS <= 60 for Worth it. Is BS separating games enough?
- **Calibration.** The AI sometimes rates harshly versus critic consensus (TLOU2). Rubric anchors (a game that is a 5, a 3, a 0) may help.

## Operating notes
- `npm run audit` (health checks), `node --no-warnings scripts/test-*.mjs` (offline tests: youtube, igdb, opencritic, steam, itad, hltb).
- Ingest routes (all `POST`, same key): `/api/ingest/{youtube,critics,steam,igdb,time,prices}` with `{gameId}`; `/api/ingest/prices` takes no id.
- **Dev server goes stale**: after adding a route or an env var, restart it (`preview_stop`/`preview_start`); the port changes (3001/3002).
- Keys live in `.env.local` (not tracked): Supabase, Gemini, YouTube, IGDB, OpenCritic (RapidAPI, 200 requests/day), ITAD, Perplexity (unused), `ADMIN_API_KEY`.
- Supabase project `bzbxopevjmurwsajemsc` pauses on inactivity; restore it if queries fail.

## Decisions already made (don't relitigate)
Verdict is the headline, numbers are supporting; critics are listed as sources only, not shown prominently; verdict price = Steam's current price (ITAD is history/cross-check only); hand-typed hours are fallback to live HLTB; no browser-impersonation scraping (HLTB access is via the permission they gave; confirmation goes in `docs/data-source-permissions.md`, still blank).

## Open items for Jordan
Gemini billing; paste the HLTB permission into the permissions doc and confirm its scope; Mass Effect 3 and the console exclusives (Saros, Ghost of Yotei) have no live price (list price shown); `.env.example` is git-ignored.
