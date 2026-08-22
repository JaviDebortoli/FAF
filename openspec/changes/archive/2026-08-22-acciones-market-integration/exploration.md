# Exploration: Acciones (stocks) as second real market

## Current State

**Ingestion pipeline (n8n -> POST /api/cycle -> L1-L4 -> cache -> GET /api/decisions -> UI):**

- `n8n/faf-workflow.json` is a SINGLE workflow: one Schedule Trigger (6h cadence) -> one Code node (`Symbols`, hardcodes 24 crypto `*USDT` symbols) -> one HTTP Request node (`Fetch Klines`, hits `https://api.binance.com/api/v3/klines?symbol=...&interval=1h&limit=50`, per-item, no auth) -> `Set Symbol` -> one Code node (`Aggregate`, builds `{ assets: [{symbol, klines}] }`) -> one HTTP Request POST to `/api/cycle` (shared-secret header auth). There is no per-market branching anywhere in this workflow.
- `app/api/cycle/route.ts` (`POST`) validates the WHOLE payload with `parseCyclePayload`: every `assets[].symbol` must pass `isWellFormedAsset` (`src/market/assets.ts`), payload capped at `MAX_ASSETS = 25` (`src/cycle/constants.ts`) total across the array. It has NO Binance-specific logic itself — candles are validated purely by shape (`isFiniteNumber` on OHLCV fields).
- `ASSET_SYMBOL_PATTERN = /^[A-Z0-9]{2,20}USDT$/` (`src/market/assets.ts:9`) is the sole gate. Callers: `isWellFormedAsset` used by `app/api/cycle/route.ts` (payload validation), `src/market/binance.ts`'s `BinanceHttpSource.fetchCandles` (defense-in-depth), and `app/api/decisions/[asset]/narrative/route.ts`. Tests: `tests/market/assets.test.ts` (exhaustive truth table, would need new cases for any pattern change).
- `runCycle` (`src/cycle/runCycle.ts`) composes L1 (`mapCandles` -> RDF quads) -> L2 (`extractEvidence`, `src/stream/evidence.ts`) -> L3 (`evaluateGraph`) -> L4 (`decide`, `src/decision/policy.ts`) per asset, purely from the input `Candle[]` — no wall-clock reads, no Binance-specific logic, fully **asset-agnostic** (confirmed by reading `runCycle.ts`, `mapCandles.ts`, `mapIndicators.ts`, `evidence.ts`, `window.ts`, `policy.ts`, `rsi.ts`, `macd.ts` in full).
- `src/stream/window.ts`'s `window()` and every indicator (`rsi.ts`, `macd.ts`, `sma.ts`, `bollinger.ts`) operate purely on index/timestamp-sorted `closes: number[]` slices — **no continuity/24-7 assumption**. Market-hours gaps (weekends/overnight) do not break this math; they only mean it takes longer real-world calendar time to accumulate enough candles for `sufficientHistory` (RSI/Bollinger need 20, MACD/SMA need 50), since a stock market trading ~6.5h/day produces far fewer candles/day than crypto's 24/7 feed at the same `1h` interval.
- **Critical finding — single global cache, not per-market**: `src/cycle/latest.ts` holds exactly ONE module-scope `CacheEntry` (`{ report, expiresAt }`). `cache.put(report, BETA_MS)` in `POST /api/cycle`'s handler UNCONDITIONALLY OVERWRITES that single entry with whatever assets were in THAT POST call's payload. `GET /api/decisions` (`app/api/decisions/route.ts`) is a pure read of that one entry, returned as-is (no market filter). `OverviewClient` (`app/(dashboard)/components/OverviewClient.tsx`) renders every decision in whatever report it receives, unfiltered by market. Today this "just works" only because exactly one thing (Binance crypto) ever pushes. If a second, independent stock push happens (via a second n8n schedule/workflow), it would **completely replace** the cached crypto report (or vice versa, whichever pushed last), not merge with it — this is a hard blocker distinct from, and more foundational than, the regex issue.
- `BETA_MS = 8 * 60 * 60 * 1000` (8h) is the cache TTL, sized as "n8n's 6h cadence + ~33% margin" — an implicit continuous-market assumption. A stock market closed for a weekend (>48h) would blow well past this TTL regardless of push frequency.
- `MAX_ASSETS = 25` is a hard cap on one `POST /api/cycle` call's `assets[]` length. The current crypto symbol list already uses **24 of 25** slots — leaving room for only 1 more symbol if stocks were appended to the SAME payload as crypto.
- `src/domain/types.ts`: `Asset = string` (no market/type discriminator anywhere). `Decision`, `DecisionReport`, `AssetKlines` (`src/cycle/runCycle.ts`) all key purely off the raw asset string — there is **no `market` field anywhere in the domain model today**.

**UI/routing:**

- `app/(dashboard)/lib/markets.ts`'s `MARKETS.acciones` currently has `isReal: false`; `app/dashboard/(with-footer)/[market]/page.tsx` renders the shared `MarketPlaceholder` for any `isReal: false` market. `app/dashboard/(with-footer)/crypto/page.tsx` is the only `isReal: true` route, rendering `<OverviewClient />` (client island: fetch/poll `GET /api/decisions` every 30s, direction filter, drilldown).
- Read `OverviewClient`, `DecisionCard`, `RecommendationBadge`, `ScoreGauge`, `Sparkline`, `DrilldownPanel`, `NarrativePanel` in full: **none of them contain any Binance/crypto/USDT-specific logic, hardcoded currency symbol, or crypto-specific decimal-precision formatting.** They all operate generically on `decision.asset` (raw string display only, no price formatting shown anywhere in these components) and `Candle[]`/`Decision` shapes. A new `app/dashboard/(with-footer)/acciones/page.tsx` following `crypto/page.tsx`'s exact pattern (swap `MARKETS.crypto` for `MARKETS.acciones`) is sufficient for the UI shell — **no generalization needed in these components** for a first pass, PROVIDED `GET /api/decisions` is made market-scoped (see Open Question 1) — otherwise `/dashboard/acciones` and `/dashboard/crypto` would render identical, unfiltered, mixed content.
- `app/(dashboard)/lib/i18n.ts` (`translateRecommendation`/`translateDirection`) is keyed purely on the `Recommendation`/`Direction` unions — **already fully market-agnostic by construction**. No changes needed here for a second market; confirms point 6 of the investigation request — the just-archived `no-recommendation-filter-and-i18n` change requires no revisiting.

## Affected Areas

- `src/market/assets.ts` — `ASSET_SYMBOL_PATTERN`/`isWellFormedAsset` are crypto-only; blocks any non-`*USDT` symbol before it reaches the pipeline (Open Question 2).
- `src/cycle/latest.ts` — single global cache entry; needs to become market-scoped (or otherwise safe against cross-market overwrite) before a second real-data push exists (Open Question 1).
- `app/api/cycle/route.ts` — payload validation (`parseCyclePayload`) and `MAX_ASSETS` cap; would need a `market` field and per-market validation if Open Question 2 resolves to an explicit discriminator.
- `app/api/decisions/route.ts` — currently returns the single global report; needs market-scoping to support a second market cleanly (Open Question 1).
- `src/domain/types.ts` — `Decision`/`AssetKlines`/`DecisionReport` have no `market` field; central to Open Question 2.
- `n8n/faf-workflow.json` — needs either a second parallel branch/workflow (new symbols list + new data-source HTTP node) feeding the same or a market-tagged payload, contingent on Open Questions 1-3.
- `src/cycle/constants.ts` — `BETA_MS` (8h TTL) and `MAX_ASSETS` (25 cap, already 24/25 used by crypto) both carry implicit continuous-market/shared-payload assumptions (Open Questions 1, 5).
- `app/(dashboard)/lib/markets.ts` — flip `MARKETS.acciones.isReal` to `true` once the above is resolved.
- New `app/dashboard/(with-footer)/acciones/page.tsx` — mechanical, follows `crypto/page.tsx` verbatim; no generalization needed in `OverviewClient`/`DecisionCard`/etc.
- `app/(dashboard)/components/ServiceUnavailable.tsx` — may need a third state for "market closed" (Open Question 5), or may stay as-is for MVP scope.
- `tests/market/assets.test.ts` — exhaustive truth table for the current pattern; needs new cases for whatever pattern/identity model is chosen.

## Approaches

1. **Minimal-change: widen regex, share the single payload/cache** — append stock symbols to the SAME n8n POST payload/list as crypto, widen `ASSET_SYMBOL_PATTERN` to accept a union of shapes, keep `Asset = string` with no `market` field, derive "is this a stock" from symbol shape client-side if ever needed.
   - Pros: smallest code diff; no domain-model change; no cache/API surface change.
   - Cons: hits `MAX_ASSETS=25` almost immediately (24/25 already used by crypto — room for ~1 stock symbol before raising the cap); `GET /api/decisions`/`OverviewClient` still have no way to filter per market, so `/dashboard/crypto` and `/dashboard/acciones` would show IDENTICAL mixed content unless a new client-side shape-inference filter is bolted on (fragile — stock tickers and truncated/malformed crypto symbols can look alike); a single cache entry means one market's push still can't be reasoned about independently of the other's freshness/TTL.
   - Effort: Low code, but High latent-risk (silently wrong UI until someone notices mixed cards).

2. **Explicit market-scoped identity + cache/API overhaul** — add a `market` discriminator threaded from `POST /api/cycle`'s payload through `AssetKlines`/`Decision`/`DecisionReport`/cache; make `src/cycle/latest.ts` a per-market cache (map or multiple entries) and `GET /api/decisions` market-scoped (query param or `[market]` route); keep crypto's push exactly as-is (tagged `market: 'crypto'`) and add an independent stock push (new n8n branch/workflow) tagged `market: 'acciones'`; symbol format validation becomes market-specific.
   - Pros: correct by construction — no cross-market overwrite hazard, no `MAX_ASSETS` collision (each market's push is independently capped), UI routes naturally filter by market, matches the existing `MARKETS`/route-per-market mental model already established by `market-nav-redesign`.
   - Cons: touches more files (`types.ts`, `runCycle.ts`, `latest.ts`, both API routes, n8n workflow); larger, more deliberate change.
   - Effort: Medium.

## Recommendation

Approach 2 (explicit market-scoped identity + cache/API overhaul). Approach 1's "minimal" framing is misleading: it defers the real cost (market-scoping) onto fragile client-side inference and immediately collides with `MAX_ASSETS`, while Approach 2 directly matches the architecture the rest of the codebase already assumes (`MARKETS` catalog, one route per market, `isReal` flag). The user's own hunch that "the L2-L4 core is asset-agnostic" is CONFIRMED — none of Approach 2's cost lands in the reasoning core (`window.ts`, `evidence.ts`, `graph.ts`, `policy.ts` need zero changes); the cost is entirely at the ingestion/cache/API boundary, which is exactly where it belongs.

## Open Questions

The following are the genuinely undecided architectural questions, ordered from most to least foundational/blocking. Each is self-contained; the user wants to resolve them one at a time.

**Q1 — How should ingested market data be partitioned by market (single global cache/report vs. per-market)?**
Today `src/cycle/latest.ts` holds exactly one cache entry, unconditionally overwritten by every `POST /api/cycle` call; `GET /api/decisions` returns that one entry with no market filter; `OverviewClient` renders everything in it unfiltered. This works today only by accident (exactly one thing — Binance — ever pushes). A second independent push (stocks) would silently replace or corrupt the crypto view, or vice versa, unless resolved.
- Option A: keep one shared payload/report — append stocks to the same n8n POST/list as crypto. Simple, but collides with `MAX_ASSETS=25` (24/25 already used) and leaves the UI with no clean way to show "only crypto" vs "only acciones" cards.
- Option B: per-market cache + POST payload — `src/cycle/latest.ts` becomes market-keyed, `POST /api/cycle` carries a market discriminator, `GET /api/decisions` becomes market-scoped. More surface area, but avoids the overwrite hazard and the `MAX_ASSETS` collision, and directly enables `/dashboard/acciones` to show only its own market.
- Recommendation: Option B — it's the only option that doesn't silently corrupt one market's view when the other pushes, and it's the most foundational decision (everything else composes on top of it).

**Q2 — Should asset identity carry an explicit market/type discriminator, or should the regex just be widened to accept multiple symbol shapes?**
Today `Asset = string`, gated only by `ASSET_SYMBOL_PATTERN = /^[A-Z0-9]{2,20}USDT$/`. No `market` field exists anywhere in `Decision`/`AssetKlines`/`CyclePushPayload`. Argentine tickers (GGAL, YPFD, PAMP — 4-5 letters, no fixed suffix) and US tickers (AAPL, MSFT — 1-5 letters) don't share a stable shape with crypto's `*USDT` suffix or reliably with each other; format alone can't safely distinguish "well-formed stock ticker" from "malformed crypto symbol."
- Option A: widen the regex to a union of accepted shapes, keep `Asset` as a bare string. Minimal type-level change, but downstream code (UI filtering, per-market validation) still has no reliable signal for which market a decision belongs to.
- Option B: add an explicit `market: 'crypto' | 'acciones'` (or similar) field threaded through `AssetKlines` -> `Decision` -> cache -> `GET /api/decisions`, with market-specific symbol validation. This is also the natural mechanism for Q1's Option B.
- Recommendation: Option B, resolved together with (or immediately after) Q1 — they're two facets of the same underlying decision.

**Q3 — What data source should n8n pull stock candles from?**
Needs to be reachable from n8n's HTTP Request node on a schedule, ideally matching Binance's "public REST, no auth, generous limits" shape, given this is a thesis-scope (not production-scale) project. Verified current constraints (web search, Aug 2026):
- **Alpha Vantage**: free tier capped at 25 requests/day; intraday delayed 15min for US equities; free tier only returns ~100 most recent points without `outputsize=full`. 25 req/day cannot sustain even a handful of tickers on a 6h cadence. Primarily US-listed — Argentine BYMA tickers aren't natively covered (only US ADRs of some Argentine names, e.g. GGAL/YPF/PAM/BMA, which are NOT the same as the local peso-denominated BYMA listing).
- **Yahoo Finance (unofficial `query1.finance.yahoo.com/v8/finance/chart`)**: free, no key, closest to Binance's "hit a public JSON URL" shape; intraday history limited to ~last 7 days. Officially discontinued/unsupported since 2017 — can silently rate-limit, change shape, or block default user agents; real reliability risk for something that needs to keep working over the life of a thesis, though zero-friction to prototype.
- **Twelve Data**: free tier is 800 calls/day, 8 credits/min — comfortably covers a handful of tickers on a 6h cadence. ~4h delay on free-tier stock data (irrelevant at 6h cadence). Requires a free API key (low friction). Argentine/BYMA ticker coverage unconfirmed — needs a symbol-lookup check.
- **Financial Modeling Prep**: free tier is EOD-only (no intraday), 250 calls/day, 500MB/30-day bandwidth. No intraday on free tier, but daily EOD candles may actually fit a 6h-cadence, thesis-scope pipeline BETTER than hourly, since a market open only ~6.5h/day means a 6h cron already can't reliably harvest more than one or two genuinely-new hourly candles/day per ticker anyway (see Q4).
- **IOL (InvertirOnline, Argentine broker)**: free up to 25,000 calls/month, but authenticates via username+password tied to a real brokerage account (bearer/refresh token flow) — meaningfully more operational friction/risk (real financial credentials in an academic pipeline) than an anonymous API key, though it is the most native source for real BYMA/Merval tickers (GGAL, YPFD, PAMP...) in ARS.
- **BYMA official APIs / BYMADATA open portal**: advertises 20-min-delayed data with 3yr history, but reads as a member/institutional product, not confirmed as a simple public unauthenticated REST endpoint. An unofficial third-party wrapper (PyOBD) exists but carries the same "unofficial, can break" caveat as Yahoo, and is a Python library rather than a URL n8n can hit directly.
- Recommendation: this is a real fork the user should decide, since it determines WHICH tickers "Acciones" can even show — Twelve Data (clean anonymous API, generous limits) if targeting US-listed names or if its BYMA coverage checks out; IOL (native BYMA/Merval, but broker-credentialed) if the point of "Acciones" is specifically Argentine equities like GGAL/YPFD/PAMP.

**Q4 — Does the pipeline need hourly candles for stocks, or would daily EOD candles suffice for a first pass?**
Coupled to Q3 (FMP's free tier is EOD-only; a market open ~6.5h/day yields far fewer hourly candles/day than crypto's 24/7 feed at the same interval, so hourly may not even be meaningfully "fresher" per 6h cron tick for stocks). Also interacts with `RSI_SPEC`/`BOLLINGER_SPEC` (need 20 candles) and `MACD_SPEC`/`SMA_SPEC` (need 50 candles) cold-start times — at daily granularity, 50 candles = ~50 trading days (~2.5 months) before stock decisions activate, versus crypto's ~2 days at hourly.
- Recommendation: decide after Q3 — the data source choice largely determines what's practical here.

**Q5 — Does the dashboard need a distinct "market closed" UI state, or is stale-data-with-timestamp enough for a first pass?**
`ServiceUnavailable` currently has exactly two reasons (`'no-data' | 'error'`), both rendering IDENTICAL Spanish copy by explicit design ("the end user has no concept of no-data-yet vs read-failed"). `BETA_MS` (8h cache TTL) is sized for crypto's continuous 6h push cadence. Stock markets close overnight/weekends (e.g. BYMA ~11:00-17:00 ART, closed weekends); n8n's cron doesn't know about market hours, so it will still fire pushes during closed hours. Depending on how the data source behaves when the market is closed (returns last-known values vs. errors/empty), and depending on Q1's cache design, a weekend gap could exceed `BETA_MS` and flip the UI to `ServiceUnavailable('no-data')` every Friday night through Monday — a misleading "service unavailable" message for something that's actually normal.
- Option A: widen `BETA_MS` (or a market-specific TTL) so a weekend gap doesn't exceed it; accept "stale last-session data with a timestamp" as the closed-market UX. Simplest, matches the codebase's existing pattern of deliberately collapsing distinct internal causes into one honest-but-simple user message.
- Option B: add a genuine third state (e.g. `'market-closed'`) with distinct copy — more correct, but needs new market-hours/calendar logic that doesn't exist anywhere in the codebase today.
- Recommendation: Option A for a thesis-scope first pass; Option B as a documented, explicit follow-up if desired later.

## Risks

- `MAX_ASSETS=25` is already 96% consumed by crypto (24/24 non-cap symbols); any approach that shares one payload with crypto needs either a cap increase or per-market caps (favors Q1 Option B).
- The single global cache (`src/cycle/latest.ts`) is a real correctness bug waiting to happen the moment a second independent push exists — must be resolved (Q1) before any stock push goes live, not after.
- External free-tier data sources (Alpha Vantage, Yahoo unofficial, Twelve Data, FMP, IOL, BYMA) all carry meaningfully different risk/coverage/friction profiles (Q3) — whichever is chosen should be spot-checked for actual Argentine-ticker coverage (or accepted as US-listed-only) before implementation starts, since documentation/marketing claims don't always reflect exact symbol universe.
- Cold-start time for stock indicators (Q4) could be weeks if daily EOD candles are used with the current 50-candle MACD/SMA window — worth flagging to the user as a UX expectation (empty/NO_RECOMMENDATION cards for an extended startup period) regardless of which option is chosen.
- `BETA_MS`'s current 8h TTL will misfire into `ServiceUnavailable('no-data')` on ordinary market-closed weekends unless explicitly widened (Q5) before shipping.

## Ready for Proposal

Not yet — per explicit user instruction, Open Questions 1-5 above should be walked through and resolved in conversation, one at a time, roughly in the listed order, before `sdd-propose` is run. Once Q1 and Q2 (the two most foundational, tightly coupled together) are resolved, Q3/Q4 (data source + granularity) and Q5 (market-closed UX) can follow.

## Key Learnings

1. `src/cycle/latest.ts` holds exactly one module-scope cache entry that is unconditionally overwritten by every `POST /api/cycle` call, with no per-market partitioning today.
2. `MAX_ASSETS=25` in `src/cycle/constants.ts` is already 24/25 consumed by the current crypto symbol list, leaving almost no headroom to append stock symbols to the same payload.
3. The L1-L4 reasoning core (`window.ts`, `evidence.ts`, `graph.ts`, `policy.ts`, all indicator functions) is fully asset-agnostic and needs zero changes to support a second market; all cost lives at the ingestion/cache/API boundary.
4. `src/domain/types.ts`'s `Asset` type and every downstream shape (`Decision`, `AssetKlines`, `DecisionReport`) carry no market/type discriminator field anywhere in the codebase today.
5. `app/(dashboard)/lib/i18n.ts` and all Tier 1/Tier 2 presentation components (`OverviewClient`, `DecisionCard`, `RecommendationBadge`, `ScoreGauge`, `Sparkline`) are already fully market-agnostic — no crypto-specific formatting or literals were found in any of them.
