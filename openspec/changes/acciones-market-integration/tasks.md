# Tasks: Acciones Market Integration (US stocks via Twelve Data)

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | ~850-1050 total (domain type, market-keyed cache, 2 API routes + narrative route, new symbol pattern, n8n workflow w/ 2 branches, new dashboard route, BETA_MS retune, 4 spec deltas, 8+ test files) |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR1 domain type + market-keyed cache -> PR2 POST /api/cycle + GET /api/decisions market-scoping -> PR3 narrative route market-scoping -> PR4 BETA_MS + dashboard wiring -> PR5 n8n workflow (config, manual-verification gate) |
| Delivery strategy | ask-on-risk |
| Chain strategy | stacked-to-main (recommended, pending user confirmation) |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|---|---|---|---|---|---|
| 1 | `Market` type + `market` threaded through `AssetKlines`/`Decision`/`DecisionReport`; `src/cycle/latest.ts` becomes `Map<Market,CacheEntry>` | PR1 | `npx vitest run tests/cycle tests/golden/paper-example.test.ts` | `npx tsc --noEmit` | Revert `src/domain/types.ts`, `src/cycle/runCycle.ts`, `src/cycle/latest.ts`, `tests/cycle/latest.test.ts`, `tests/cycle/idempotency.test.ts`, `tests/golden/paper-example.test.ts`, `tests/helpers/seedCycleCache.ts`; restores single global cache |
| 2 | `POST /api/cycle` market discriminator + per-market symbol validation (`ACCIONES_SYMBOL_PATTERN`); `GET /api/decisions` market-scoped via `?market=` | PR2 | `npx vitest run tests/market/assets.test.ts tests/api/cycle.test.ts tests/api/decisions.test.ts tests/api/decisions-invariance.test.ts` | `npx tsc --noEmit` | Revert `src/market/assets.ts`, `src/market/binance.ts`, `app/api/cycle/route.ts`, `app/api/decisions/route.ts` + their test files; PR1's cache stays market-keyed but unreached by any real caller |
| 3 | Narrative route market-scoping (`?market=` param, per-market `isWellFormedAsset`/`getForAsset`) | PR3 | `npx vitest run tests/api/narrative.test.ts` | `npx tsc --noEmit` | Revert `app/api/decisions/[asset]/narrative/route.ts` + `tests/api/narrative.test.ts`; independent of PR4/PR5 |
| 4 | `BETA_MS` widened to 5 days; `MARKETS.acciones.isReal` -> true; `OverviewClient` gains `market` prop; new `acciones/page.tsx` | PR4 | `npx vitest run tests/unit/markets.test.ts tests/dashboard tests/narrative/cache.test.ts` | `npx playwright test tests/e2e/dashboard.spec.ts tests/e2e/market-nav.spec.ts` | Revert `src/cycle/constants.ts`, `app/(dashboard)/lib/markets.ts`, `app/(dashboard)/components/OverviewClient.tsx`, `app/dashboard/(with-footer)/crypto/page.tsx`, new `acciones/page.tsx`, `tests/unit/markets.test.ts`; `MARKETS.acciones.isReal` reverts to `false`, route falls back to `MarketPlaceholder` |
| 5 | `n8n/faf-workflow.json`: crypto branch `1h`->`1d` (D1), new Acciones branch (Twelve Data) | PR5 | N/A — config JSON, no unit test harness (design.md Testing Strategy) | `[MANUAL-VERIFICATION-ONLY]` — live n8n import + Twelve Data credential + first successful acciones push, confirmed by the user before archive | Revert `n8n/faf-workflow.json` + `n8n/POST_IMPORT_STEPS.md`; independently revertible from PR1-4 per proposal's Rollback Plan |

## Phase A: Domain Type + Market-Keyed Cache (PR1)

- [x] A.1 `src/domain/types.ts`: add `export type Market = 'crypto' | 'acciones';`; add `market: Market` to `Decision` and `DecisionReport`.
- [x] A.2 `src/cycle/runCycle.ts`: add `market: Market` to `AssetKlines`; thread `market` through `decideForAsset` (new param) into the `decide(...)` call's context object so the resulting `Decision.market` is set; `runCycle` passes each item's `market` through. (Implemented as attach-after-`decide()`/`Omit<Decision,'market'>` rather than widening `DecisionContext` — see apply-progress Deviations.)
- [x] A.3 RED `tests/cycle/latest.test.ts` (new): market-keyed cache isolation — an `acciones` push does not affect the `crypto` cache entry and vice versa (per `semantic-ingestion` spec's "Market-keyed presentation cache" ADDED requirement); each market's TTL expires independently; `getForAsset(market, asset)` reads only its own market.
- [x] A.4 GREEN `src/cycle/latest.ts`: replace the single `entry: CacheEntry | null` with `const entries = new Map<Market, CacheEntry>();`; `put(market, report, ttlMs, atMs?)`, `get(market, atMs?)`, `getForAsset(market, asset, atMs?)` each key off `market`; `clear()` clears the whole map (test-only, unchanged contract).
- [x] A.5 GREEN `tests/helpers/seedCycleCache.ts`: `buildDecision`/`buildReport` accept/default `market: Market = 'crypto'`; `seedCycleCache(report, market, ttlMs)` passes `market` to `cache.put`.
- [x] A.6 GREEN `tests/cycle/idempotency.test.ts`: add `market: 'crypto'` to every `AssetKlines` literal.
- [x] A.7 GREEN `tests/golden/paper-example.test.ts`: add `market: 'crypto'` to every `AssetKlines` literal; confirm golden `Decision`/`DecisionReport` fixtures gain `market: 'crypto'` without altering any other golden value.
- [x] A.8 Verify GREEN: `npx vitest run tests/cycle tests/golden/paper-example.test.ts` (11/11 pass) + `npx tsc --noEmit` (zero errors in any Phase A file; errors confined to Phase B/C/D downstream callers — expected per chained-PR strategy, see apply-progress).

## Phase B: `POST /api/cycle` Market Discriminator + `GET /api/decisions` Market Scoping (PR2)

- [x] B.1 `src/market/assets.ts`: add `export const ACCIONES_SYMBOL_PATTERN = /^[A-Z]{1,5}(\.[A-Z])?$/;`; change `isWellFormedAsset` signature to `(market: Market, asset: string): boolean`, dispatching to `ASSET_SYMBOL_PATTERN` (crypto) or `ACCIONES_SYMBOL_PATTERN` (acciones).
- [x] B.2 GREEN `src/market/binance.ts:40`: update the lone call site to `isWellFormedAsset('crypto', asset)`.
- [x] B.3 RED `tests/market/assets.test.ts`: update every existing `isWellFormedAsset(...)` call to pass `'crypto'` as the first arg; add the acciones truth table from the spec delta — `AAPL` accepted, `BRK.B` accepted, `''`/`aapl`/`AAAAAA`/`AAP1`/`BRK.BB`/`BRK.`/`BRK.1` rejected.
- [x] B.4 GREEN: confirm B.1-B.2 make B.3 pass.
- [x] B.5 RED `tests/api/cycle.test.ts`: update every payload literal to include a top-level `market: 'crypto'` field; add scenarios — well-formed acciones symbol accepted, unknown `market` value (`'forex'`) rejected with 400, `MAX_ASSETS=25` enforced independently per market (26 acciones symbols rejected regardless of a separate crypto count).
- [x] B.6 GREEN `app/api/cycle/route.ts`: `parseCyclePayload` validates `market` is `'crypto' | 'acciones'` first (400 otherwise), passes `market` into `isWellFormedAsset(market, symbol)` and attaches `market` onto each built `AssetKlines`; `cache.put(market, report, BETA_MS)`.
- [x] B.7 RED `tests/api/decisions.test.ts` + `tests/api/decisions-invariance.test.ts`: update every `GET()` call to `GET(new Request('http://x/api/decisions?market=crypto'))`; add scenarios — missing `market` param 400, invalid `market` value 400, acciones-scoped read never returns a crypto decision.
- [x] B.8 GREEN `app/api/decisions/route.ts`: `GET(request: Request)` parses `new URL(request.url).searchParams.get('market')`, 400s on missing/invalid, else `cache.get(market)`.
- [x] B.9 Verify GREEN: `npx vitest run tests/market/assets.test.ts tests/market/binance.test.ts tests/api/cycle.test.ts tests/api/decisions.test.ts tests/api/decisions-invariance.test.ts` + `npx tsc --noEmit`.

## Phase C: Narrative Route Market-Scoping (PR3)

- [x] C.1 RED `tests/api/narrative.test.ts`: update every `GET` call to append `?market=crypto` (or `acciones` where relevant); add scenarios per `decision-narrative` spec delta — missing `market` param 400, malformed symbol rejected per its declared market's pattern, a well-formed-for-one-market symbol never resolves through another market's cache (the "AAPL scoped to crypto never returns the acciones decision" scenario).
- [x] C.2 GREEN `app/api/decisions/[asset]/narrative/route.ts`: parse `?market=` from `request.url`, 400 on missing/invalid before any other validation; `isWellFormedAsset(market, asset)`; `cycleCache.getForAsset(market, asset)`; update the file's T-4 comment (no longer "ignores query string entirely").
- [x] C.3 Verify GREEN: `npx vitest run tests/api/narrative.test.ts` + `npx tsc --noEmit`.

## Phase D: `BETA_MS` Widening + Dashboard Wiring (PR4)

- [x] D.1 `src/cycle/constants.ts`: `BETA_MS = 5 * 24 * 60 * 60 * 1000` (120h); replace the 8h-derivation comment with design.md's 120h/96h weekend-gap-plus-margin formula.
- [x] D.2 Verify `tests/narrative/cache.test.ts` needs no edits — every assertion is parametrized on the imported `BETA_MS` symbol, not a hardcoded duration; run it as a regression check only (design.md's Testing Strategy table calls for an update, but the on-disk file already reads `BETA_MS` symbolically, so this is a verify-only task, not a GREEN edit).
- [x] D.3 GREEN `app/(dashboard)/lib/markets.ts:33`: flip `MARKETS.acciones.isReal` from `false` to `true`.
- [x] D.4 GREEN `tests/unit/markets.test.ts`: update the "marks crypto as the only real market" assertion to also accept `acciones` as real (both `isReal: true`; every other slug still `false`).
- [x] D.5 GREEN `app/(dashboard)/components/OverviewClient.tsx`: add a required `market: Market` prop; thread it into `` fetch(`/api/decisions?market=${market}`) ``.
- [x] D.6 GREEN `app/dashboard/(with-footer)/crypto/page.tsx`: pass `market="crypto"` to `<OverviewClient />`.
- [x] D.7 Create `app/dashboard/(with-footer)/acciones/page.tsx`: mechanical clone of `crypto/page.tsx` — `MARKETS.acciones`, `<OverviewClient market="acciones" />` (no new RED test required, per design.md's Testing Strategy — mechanical clone, no branching logic).
- [x] D.8 GREEN `tests/dashboard/crypto/page.test.ts`: update for `OverviewClient`'s new required `market` prop (assert `market="crypto"` is passed).
- [x] D.9 Verify GREEN: `npx vitest run tests/unit/markets.test.ts tests/dashboard tests/narrative/cache.test.ts` + `npx tsc --noEmit` + `npx playwright test tests/e2e/dashboard.spec.ts tests/e2e/market-nav.spec.ts`. (Also closed the Phase B/C-flagged `tsc --noEmit` blast radius — see apply-progress Phase D section — and fixed two e2e route-stub glob patterns + rewrote one now-superseded placeholder-scenario e2e test, both required for D.9's playwright run to pass now that `OverviewClient` appends `?market=` and `MARKETS.acciones.isReal` is `true`.)

## Phase E: n8n Workflow — Acciones Branch via Twelve Data (PR5) — [MANUAL-VERIFICATION-ONLY] gate at verify/archive

- [x] E.1 `n8n/faf-workflow.json` `Fetch Klines` node: change `interval` query param from `'1h'` to `'1d'` (D1).
- [x] E.2 `n8n/faf-workflow.json` `Aggregate (build /api/cycle payload)` node: output becomes `{ market: 'crypto', assets }`.
- [x] E.3 Add `Acciones Symbols` (Code) node emitting 24 items: `AAPL, MSFT, GOOGL, AMZN, NVDA, META, TSLA, BRK.B, JPM, V, UNH, XOM, JNJ, WMT, PG, MA, HD, CVX, MRK, ABBV, KO, PEP, AVGO, COST`.
- [x] E.4 Add `Fetch Acciones Candles` (HTTP Request) node: GET `https://api.twelvedata.com/time_series`, query `symbol={{$json.symbol}}&interval=1day&outputsize=50`, `apikey` via a dedicated n8n Query-Auth credential (never inline, matching the existing shared-secret credential pattern).
- [x] E.5 Add `Set Acciones Symbol` (Set) node: `symbol = $('Acciones Symbols').item.json.symbol`, `klines = $json.values`.
- [x] E.6 Add `Aggregate Acciones Payload` (Code) node: maps `values[].{datetime,open,high,low,close,volume}` (strings) -> `Candle` (`openTime = Date.parse(datetime)`, rest `Number(...)`); outputs `{ market: 'acciones', assets }`. No explicit re-sort needed — `src/stream/window.ts:64` already sorts by `openTime` before building the candle window (closes design.md Open Question 3).
- [x] E.7 Add `POST /api/cycle (Acciones)` (HTTP Request) node: same shared-secret credential as the existing POST node, independent call.
- [x] E.8 `Schedule Trigger` node: fan out `connections` to both `Symbols` and `Acciones Symbols`.
- [x] E.9 `n8n/POST_IMPORT_STEPS.md`: document the Twelve Data API key provisioning step (credential name/type) alongside the existing shared-secret credential steps.
- [x] E.10 `[MANUAL-VERIFICATION-ONLY]` Confirm Twelve Data's live `time_series` response is a single top-level JSON object (`{meta, values, status}`), not a top-level array, before activating the branch — verify the branch does NOT need the `fullResponse: true` fix Binance required (design.md's "Implementation-time verification item"). **CONFIRMED live** (`twelvedata-rate-limit-batching`): a 24-item run produced exactly 24 output items (8 success + 16 error, never exploded) — no `fullResponse: true` needed.
- [x] E.12 `twelvedata-rate-limit-batching`: the same live run surfaced a real bug — Twelve Data's free Basic plan caps requests at 8/minute, and `Fetch Klines Acciones` fired all 24 items with no pacing, producing 8 successes + 16 `429` errors. Fixed by adding `options.batching.batch = {batchSize: 8, batchInterval: 60000}` to that node (n8n applies `batchInterval` between batches, confirmed against n8n's own docs); `n8n/POST_IMPORT_STEPS.md` M4b updated with the root cause, the fix, and a note that the branch now takes ~2 minutes (expected pacing, not a hang). Also synced `POST_IMPORT_STEPS.md`'s node-name references to the user's own live rename of every node (`Symbols`→`Cripto Symbols`, `Fetch Klines`→`Fetch Klines Cripto`, etc. — see this file's commit for the full mapping).
- [ ] E.11 `[MANUAL-VERIFICATION-ONLY]` Live import into the user's n8n instance, Twelve Data credential provisioned, first successful `market: 'acciones'` push to `/api/cycle` confirmed end-to-end (`/dashboard/acciones` shows real data) — same gate this session used for `n8n-cadence-6h`/`cycle-cache-ttl-6h`/`narrative-model-haiku`. Re-run needed after E.12's batching fix (the prior attempt only got 8/24 tickers through due to the rate-limit bug). Requires explicit user confirmation before this change can archive as PASS.

## Phase F: Final Full-Suite Verification (after PR1-PR5 merge)

- [ ] F.1 Run `npx vitest run` + `npx tsc --noEmit` + `npx playwright test` — all green across the full 5-PR stack.
- [ ] F.2 Confirm `src/stream/`, `src/laf/`, `src/decision/policy.ts` have zero diff vs. pre-PR1 baseline (`git diff <base> --stat` across those paths, empty output) — proposal's "L1-L4 stays fully asset-agnostic" claim.
- [ ] F.3 Self-check spec scenarios: `semantic-ingestion` (Market-data fetch contract, n8n scheduler-only role, POST /api/cycle symbol validation, Market-keyed presentation cache), `decision-dashboard` (Multi-asset display, Crypto/Acciones routes, TTL survives inter-run gap), `market-navigation` (Per-market routing), `decision-narrative` (Narrative endpoint contract) each map to a passing test from Phases A-D; E's 2 `[MANUAL-VERIFICATION-ONLY]` scenarios (E.10/E.11) stay open pending user confirmation and do not block the automated-suite portion of this gate.

## Delivery Route Recommendation

**stacked-to-main** (pending user confirmation), matching this repo's precedent (`no-recommendation-filter-and-i18n`, `market-nav-redesign`). Phase B depends on Phase A's `Market` type and market-keyed cache signatures; Phase C depends on Phase A/B's `isWellFormedAsset`/`getForAsset` signature changes; Phase D depends on Phase A (types) and Phase B (`GET /api/decisions?market=`); Phase E (n8n) is architecturally independent of A-D at the code level (n8n calls the deployed API, not the source tree directly) but functionally requires A-D deployed first for `market: 'acciones'` pushes to be accepted. Phase F runs only after all 5 PRs merge. GitHub does not auto-retarget stacked PR bases on merge — rebase each subsequent branch onto `main` after the prior PR merges (known repo gotcha, per `n8n-cadence-6h`/`no-recommendation-filter-and-i18n` precedent).

## Implementation Order

Phase A -> Phase B -> Phase C -> Phase D -> Phase E -> Phase F. A is the hard foundation (domain type + cache signatures every other phase's `put`/`get`/`getForAsset`/`isWellFormedAsset` calls depend on). B must land before C (narrative route calls the same changed `isWellFormedAsset`/`getForAsset`). D's dashboard wiring needs both A (types) and B (`GET /api/decisions?market=`) live. E is config-only and can technically be prepared in parallel, but its `[MANUAL-VERIFICATION-ONLY]` live push against `/api/cycle` requires A-D already deployed to accept `market: 'acciones'` payloads — sequencing it last avoids a live push against a not-yet-market-aware endpoint.
