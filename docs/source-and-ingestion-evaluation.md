# BS Meter source and ingestion evaluation

**Scope:** `verdict-redesign` at `bff83e9`; repository and read-only provider/database checks on 2026-10-24. This deepens the [full branch evaluation](./verdict-redesign-evaluation.md).

## Verdict

**The source categories are sensible; the current ingestion is not optimized for a trustworthy BS-and-juice verdict.** IGDB is appropriate for identity and metadata; Steam users and selected expert reviews can reveal BS and juice; completion times and critic aggregates add context. The implementation currently treats weak or missing evidence as normal, repeats sources, accepts ambiguous game matches, loses dates and citations, and uses a fixed price for a changing purchase decision. The highest-value change is an evidence-first, incremental pipeline with a separate live-price layer.

The site's core question is whether a game is worth a player's **time**, with explicit BS and juice. That requires claims about *why* play feels rewarding or wasteful, not just popularity, runtime, or average review score. Therefore, direct, current, attributable observations should have the greatest influence. Price should inform the experimental **buy** advice after quality has been evaluated.

## Source-by-source assessment

### 1. IGDB metadata — keep, but fix identity resolution first

**What:** The project uses IGDB for title, date, genre, platform, company, summary, and cover, but usually accepts the first fuzzy search hit ([`igdb.ts`](../src/lib/api/igdb.ts#L49-L66)). The live ID cross-check found at least three wrong release dates/records among 33 games with an IGDB ID: The Witcher 3 is linked to a bundle that also contains Dark Souls III; Hollow Knight and Silksong are linked to records dated years away from the base games' release dates. Official release evidence is linked in the [full evaluation](./verdict-redesign-evaluation.md#5-game-identity-is-wrong-for-several-records-and-review-selection-can-bias-scores--critical-high-confidence-for-confirmed-mismatches). IGDB's API provides fields such as `game_type`, versions, parent relations, and release dates that can help distinguish a base game from a bundle or edition. [IGDB API documentation](https://api-docs.igdb.com/).

**So what:** Metadata is upstream of genre selection, prompt year, “Not yet” timing, cover art, and platform context. A wrong canonical ID can contaminate several downstream fields even if the score model itself is consistent.

**Now what:** Maintain a reviewed canonical game record with explicit IGDB and Steam IDs. Search for multiple candidates, reject bundles and unrelated versions, compare normalized title, edition, developer, platform, and plausible release date, then require review when ambiguous. Store the matching decision and its evidence. Fix the three confirmed records before re-ingesting or re-scoring them. Do not use a successful cover URL as proof of the right game.

### 2. YouTube expert reviews — valuable, but the transcript path is fragile and wasteful

**What:** Eight channel searches can run per game; only the first result per channel is considered, and the title check accepts 60% word overlap ([`youtube.ts`](../src/lib/api/youtube.ts#L5-L71)). An unofficial transcript package returns text or `null`; the first 4,000 words are kept, without timestamps ([`youtube.ts`](../src/lib/api/youtube.ts#L74-L92)). In the database, **30 of 110 YouTube rows (27%)** have no transcript. **24 extra YouTube rows** duplicate an existing game/video key. Publication dates are returned by search but not stored. Google's documented search quota is currently **100 `search.list` calls per day**, with one unit per call in that bucket; eight searches per game make a full 35-game sweep about 280 calls before retries. [YouTube search documentation](https://developers.google.com/youtube/data/reference/rest/v3/search/list). The official caption-download method requires permission to edit the video, so it is not a general replacement for transcripts from third-party reviewers. [YouTube captions documentation](https://developers.google.com/youtube/data/reference/rest/v3/captions/download).

**So what:** Reviews are among the best sources for pacing, filler, mechanics, and technical context, but missing captions and first-result selection leave coverage uneven. Duplicate transcripts overweight one opinion. Truncation can discard the reviewer's conclusion, and loss of timestamps prevents a player from checking a specific claim. Re-searching stable videos burns quota with little new evidence.

**Now what:** Curate and cache the selected video IDs per game. Search only for new games, missing coverage, or a defined refresh event. Store publication date, channel ID, review type, platform, language, transcript status, content hash, and timestamped segments. Reject previews and ambiguous editions for a final verdict. If a transcript is unavailable, do not create a usable-evidence row; keep a failed-source record for diagnostics. Retrieve the relevant segments for each measure rather than concatenating every full transcript. For the 35-game MVP, manually reviewing a few high-quality source choices per game will likely improve accuracy more than eight automatic first hits.

**Transcript access qualification:** The installed `youtube-transcript` package fetches captions through YouTube's internal player path or webpage HTML fallback (`node_modules/youtube-transcript/dist/youtube-transcript.esm.js`); the code does not specify a language. Its result already contains offsets, durations, and language, but [`fetchTranscript`](../src/lib/api/youtube.ts#L74-L92) discards them. The [official caption-download API](https://developers.google.com/youtube/data/reference/rest/v3/captions/download) requires permission to edit the video. [YouTube's API policies](https://developers.google.com/youtube/terms/developer-policies) prohibit API clients from obtaining scraped YouTube content. This creates an access and rights risk for treating the current library as a durable production ingestion source; it is not a legal conclusion about this particular deployment. Prefer creator-provided or otherwise licensed transcripts, or editor-reviewed notes linked to video timestamps, after checking the applicable rights. Automated audio download and transcription is not a straightforward workaround to that access question.

**Search improvement:** `search.list` supports up to 50 results in one request, whereas the project asks for one; requesting a shortlist of roughly five candidates does not itself add a search call. [YouTube search documentation](https://developers.google.com/youtube/data/reference/rest/v3/search/list). Score candidates for exact game/edition, review versus preview or walkthrough, platform, publication date, and channel fit. Then approve a small diverse set of videos per game and save why each was selected. Refresh API metadata within the applicable retention window and stop re-searching every approved video on each ingest.

### 3. Steam user reviews — keep, migrate endpoint, and sample deliberately

**What:** The code calls `store.steampowered.com/appreviews/...` for a summary and up to 20 recent English reviews, then turns them into one text block ([`steam.ts`](../src/lib/api/steam.ts#L80-L145)). Valve now marks that endpoint **deprecated** and documents `IUserReviewsService.GetAppReviews` as its replacement, with filters for recent/helpful, positive/negative, language, purchase type, date, playtime, and hardware. [Steamworks replacement API](https://partner.steamgames.com/doc/webapi/IUserReviewsService?language=english). A read-only smoke test of the old endpoint returned HTTP 200 with HTML, while the replacement returned JSON in this environment. For Hades, Elden Ring, and Starfield, the stored all-time review counts were 139,112 / 424,662 / 83,715 versus 143,061 / 436,843 / 86,059 from the replacement endpoint on this audit date; their descriptive tiers were unchanged. These are spot checks, not a full score validation.

**So what:** Steam offers direct player reports, especially for recent bugs, grind, monetization, and technical problems. A single recent page is not a representative sample of all players or platforms; an all-time aggregate can hide a patch improvement or deterioration. The current endpoint may fail silently, and the summary text is not a citation to individual reviews.

**Now what:** Migrate to `GetAppReviews`, verify response type/status, and log rate limits and failures. Store review IDs, creation/update dates, language, recommendation, playtime, purchase type, platform/hardware when available, and source URL. Sample separate recent and broader windows, positive and negative, with a stable cap per stratum; dedupe IDs and exclude irrelevant/off-topic items with an explicit rule. Use trends and quoted, attributable examples as evidence. Label Steam findings as PC/Steam evidence; do not generalize them to consoles without console-specific sources.

### 4. Completion time — useful context, weak proof of BS

**What:** [`hltb.ts`](../src/lib/api/hltb.ts) always returns `null`, so current ingestion falls back to manual values in the seed file. Ten of 35 stored games have no main-story hours. IGDB now offers a documented `game_time_to_beats` endpoint with `hastily`, `normally`, `completely`, and `count` fields. [IGDB time-to-beat documentation](https://api-docs.igdb.com/). A read-only batch check found a record for **28 of the 33 stored IGDB IDs**, including **nine of the ten games missing stored main-story hours**. Its counts are often small, and some outputs are implausible for direct publication (for example, the current IGDB record for Baldur's Gate 3 reported about **5,650 completionist hours** from 28 submissions; Crimson Desert reported about **738 hours** from three submissions). Some genres, especially multiplayer and live service games, lack a meaningful “beat” time.

**So what:** There is a workable automated supplement to manual times, but it is not a clean replacement. A long game is not necessarily padded, and a large main-to-completionist gap is not necessarily BS. Blindly importing low-sample or extreme values would make the site less trustworthy.

**Now what:** Use IGDB time data as a candidate field with units conversion, submission count, range checks, and a human override. Keep the source, sample size, and last update beside the value. Use duration to set player expectations, never as standalone evidence of padding. If HLTB values remain manual, store their URL, observed date, editor, and review date; stop implying that HLTB is currently fetched automatically.

### 5. OpenCritic — keep as a comparison, not a BS source

**What:** OpenCritic ingestion searches by title, takes the first hit, and stores only aggregate score/tier ([`opencritic.ts`](../src/lib/api/opencritic.ts#L16-L60)). It does not store review excerpts, review count, publication dates, or match confidence, although the wrapper receives a review count. A missing score is converted to zero in the wrapper.

**So what:** Overall critic sentiment can contextualize a BS Meter result, but it cannot explain *which* padding, grind, friction, or juice a game has. A wrong first hit or a zero used for missing data can introduce a misleading signal.

**Now what:** Keep OpenCritic as a comparison or candidate discovery aid. Verify the game ID and edition, store review count and fetched date, and preserve missing as `null`. Do not give the aggregate score direct authority over the BS or juice measures unless a validation study shows it improves decisions.

### 6. Reddit via Perplexity — use for leads, not untraceable score evidence

**What:** The pipeline requests a short Reddit-focused Perplexity summary and returns its text in memory ([`reddit.ts`](../src/lib/api/reddit.ts)); it does not persist underlying posts or citations. The v2 scoring call does not pass that result into its prompt ([`score-v2.ts`](../src/lib/pipeline/score-v2.ts#L9-L18)). Thus Reddit is not currently a v2 source despite the public methodology listing it.

**So what:** Community complaints can identify a patch or monetization issue worth investigating, but a summary without post URLs, dates, platform, and corroboration is hard to audit and may be skewed by a vocal thread. It also costs work despite having no effect on v2.

**Now what:** Remove this call from the v2 ingestion path until it has a defined use. If brought back, use it to discover specific posts, keep citations and timestamps, dedupe topics, and require another source before a high-impact claim. Update public methodology to reflect what v2 actually consumes.

**Access qualification:** If Reddit content becomes a systematic production input, check Reddit's current access and commercial-use requirements before implementing collection. Reddit says API access requires approval and commercial use requires permission and a contract. A third-party search summary should not be assumed to resolve those requirements. [Reddit developer access guidance](https://support.reddithelp.com/hc/en-us/articles/14945211791892-Developer-Platform-Accessing-Reddit-Data).

### 7. Current store price — missing source for the buy verdict

**What:** `price_usd` is fixed in seed data or manually entered; the buy rule uses that value, with a threshold at $40 ([`seed-games.ts`](../src/config/seed-games.ts), [`v2.ts`](../src/lib/scoring/v2.ts#L150-L166)). The owner wants the **current store price**. A candidate PC price source is IsThereAnyDeal's API, which documents country, shop, currency, price timestamps, and expiry; access and usage terms should be checked before integration. [IsThereAnyDeal API documentation](https://docs.isthereanydeal.com/). Console stores would need their own supported source or clearly scoped advice.

**So what:** A buy recommendation can change during a sale without the game's BS or juice changing. Running Gemini again to respond to price movement would be expensive and could unnecessarily change the quality assessment.

**Now what:** Keep BS and juice independent of sale price. Store price quotes by game, edition, store, region, currency, observed time, and expiry. Calculate the price-sensitive buy advice deterministically from the latest valid quote and the already published quality result. Show “price unavailable” or provisional advice when the quote is stale; do not silently fall back to a static seed price.

## Ingestion design assessment

### The current pipeline does too much in one request — **High priority**

**What:** One call sequentially fetches metadata, playtime, critic data, eight YouTube searches/transcripts, Reddit, Steam, and cover URLs. It writes each result immediately, ignores many database write errors, and keeps going when optional sources fail ([`ingest.ts`](../src/lib/pipeline/ingest.ts)). Sources append rather than upsert. V2 is a separate pass over every stored source row; v1 remains the default scoring path.

**So what:** Latency and quota costs grow with every game; a timeout leaves a partial record. Retrying creates duplicate evidence. There is no frozen set of inputs that explains a published verdict, and no clear distinction between “no issue found” and “we failed to fetch evidence.” The current 35-game catalog already has 28 extra duplicate source rows and 32 analyses older than 90 days.

**Now what:** Split work into repeatable stages with explicit state and provenance:

1. **Resolve identity:** select and approve canonical game and external IDs, edition, platform, and release state.
2. **Fetch by source:** independent jobs with provider ID, request parameters, response status, `fetched_at`, `published_at`, content hash, and a unique current-source key. Retry a failed source without repeating successful ones.
3. **Qualify evidence:** dedupe, check match and age, classify platform/review type, retain timestamped passages, and record whether each measure has direct support.
4. **Score once per source snapshot:** save model/prompt/formula versions and source IDs; require a minimum evidence rule and human review for ambiguous or provisional games.
5. **Publish atomically:** promote a complete, checked run and keep the prior public result if a refresh fails. Make `unrated` and `provisional` explicit.
6. **Refresh by volatility:** identity and cover rarely, review/bug/monetization evidence when changes are detected, price as frequently as the provider permits. Recompute buy advice from new price without rerunning the quality model.

For 35 curated games, this can be a small job queue and a few normalized tables, not a large data platform. The key optimization is fewer unnecessary fetches and more reliable evidence, not maximum automation.

## Recommended source hierarchy for a v2 measure

| Role | Preferred evidence | Use in verdict |
|---|---|---|
| Direct BS/juice evidence | Verified, dated passages from independent expert reviews and sampled player reviews | Primary. Link each important reason to a specific source and platform. |
| Current-state correction | Recent player reports and publisher patch notes, checked against independent reports | Adjust time-sensitive bugs/monetization; distinguish a fixed launch problem from today's state. |
| Context | IGDB identity/genre, reviewed completion time, OpenCritic aggregate | Help interpret a claim; do not substitute for direct evidence. |
| Price | Current store quote for a specific edition/region/platform | Change buy advice only, with date and store shown. |
| Discovery lead | Reddit/Perplexity search summaries | Trigger investigation, not a scored claim until posts are preserved and corroborated. |

## Better ways to gather player sentiment

### 1. Structured Steam reviews are the first scalable player voice

**What:** The project already has canonical Steam app IDs for many games and a review fetcher, but it takes only 20 recent reviews, strips IDs and dates, and compresses them into one text field. Valve's [GetAppReviews](https://partner.steamgames.com/doc/webapi/IUserReviewsService?language=english) exposes filters for recency, positive/negative recommendation, purchase type, playtime, date, and hardware.

**So what:** A deliberate sample can distinguish persistent grind from a temporary patch problem, and identify the conditions under which players encounter a defect. The current one-page sample cannot support a population sentiment percentage, and Steam views only represent the Steam/PC slice.

**Now what:** For each game, collect bounded, reproducible samples in recent/helpful and positive/negative strata; preserve review IDs, dates, playtime, recommendation, purchase type, and excerpts. Cluster specific BS/juice claims, count independent reviewers mentioning each theme *within the sample*, and link examples. Show sample counts and platform scope rather than presenting search-result frequency as a player-wide rate.

### 2. YouTube comments can expose issues, with a lower evidence weight

**What:** The official [commentThreads.list](https://developers.google.com/youtube/data/reference/rest/v3/commentThreads/list) API retrieves dated comments for a selected video, sorted by time or relevance, at one unit per request. This is a different source from the reviewer's spoken analysis.

**So what:** Comments may flag a patch, platform defect, or disagreement with the reviewer, but they are self-selected, video-audience-specific, sometimes low effort, and may describe a launch state that has changed.

**Now what:** Sample comments from multiple relevant videos as issue leads, retain comment IDs/links and dates if allowed by platform policies, and corroborate high-impact claims with Steam reviews, patch notes, or direct testing. Do not fold comments into an undifferentiated “player sentiment” percentage.

### 3. Community search and on-site reports serve different purposes

**What:** Perplexity currently gives one Reddit-focused prose summary with no stored post references. General web or forum search also ranks for relevance and attention, not a known sampling frame. Direct BS Meter reports do not yet exist.

**So what:** Search is useful for discovering a concrete complaint but cannot establish its prevalence. A structured on-site report can ask the site's actual question — what wasted time and what paid off — while initially having low volume and selection bias.

**Now what:** Use search only to create leads with URL, date, platform, game version, and claim. Subject to access rights, verify the original post and seek independent corroboration. Add an optional, moderated player report form with platform, hours played, date, purchase status, concrete BS/juice examples, and patch version; label the sample size and never treat early submissions as representative. Review per-game findings against a small human-labeled anchor set before allowing any sentiment source to change a verdict.

## Where Tavily could help

**What:** Tavily is a developer API for web search and page extraction, with domain restrictions, source URLs, snippets, and optional estimated publication dates. It offers a two-step search-then-extract workflow and charges per API credit. [Search API](https://docs.tavily.com/documentation/api-reference/endpoint/search), [Extract API](https://docs.tavily.com/documentation/api-reference/endpoint/extract), [pricing](https://www.tavily.com/pricing). Its documented publication date is an estimate and may reflect an update rather than original publication. The project currently uses Perplexity for one Reddit-focused prose summary, so Tavily could be trialed as a more inspectable *discovery* layer.

**So what:** Tavily may surface independent reviews, patch notes, support notices, and specific community discussions that the fixed YouTube channel list misses. Search ranking cannot measure how common a complaint is among players. Tavily does not give rights to third-party YouTube transcripts or Reddit data merely by finding a URL, and extracted text still needs source/edition/date checks. No Tavily account or response-quality benchmark was used in this evaluation, so superiority over the existing search cannot be claimed yet.

**Now what:** Pilot on 10 diverse games, including a recent launch, a patched game, an early-access game, and a console-heavy title. Use three focused queries per game: recent technical/patch state; time-wasting design/monetization; and the strongest player-praised mechanics. Keep Tavily's URLs and snippets, reject wrong games and old versions, then extract only approved pages where source terms permit. Compare against manual research and the existing Perplexity output for relevant unique sources, verifiable claims, date accuracy, platform coverage, and cost. Promote Tavily only as a discovery and corroboration stage if it improves that test. Keep Steam's structured reviews and any properly sourced first-party reports as the basis for sampled player sentiment.

## First implementation slice

1. Fix the confirmed IGDB IDs, add matching validation, and deduplicate existing YouTube/Steam source keys.
2. Replace Steam `/appreviews` with the documented service endpoint and implement a reproducible review sample.
3. Store source dates, video timestamps, status, platform, and per-measure evidence references; stop inserting a transcript row when captions are unavailable.
4. Add IGDB time-to-beat as an **optional checked candidate**, not an automatic overwrite of manual data.
5. Remove Reddit from the v2 ingestion call until it has preserved citations; add a current-price provider for the buy layer.
6. Move ingestion and scoring to idempotent staged runs and refresh only changed or stale inputs.

## Limits of this evaluation

The live database profile and IGDB/Steam read-only spot checks establish coverage, matching errors, source duplication, and endpoint behavior at the audit time. They do not prove that every reviewer claim is accurate or that one sampling design best predicts player satisfaction. A small human-labeled anchor set and source-removal tests should decide the final evidence weights and minimum-source gate.
