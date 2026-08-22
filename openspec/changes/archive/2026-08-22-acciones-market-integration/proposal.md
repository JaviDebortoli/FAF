# Proposal: acciones-market-integration — second real market (US stocks via Twelve Data)

## Intent

Today exactly one market (crypto) has real backend data; `MARKETS.acciones.isReal` is `false` and renders `MarketPlaceholder`. This change makes Acciones (US-listed stocks) the platform's second real market, proving the architecture generalizes beyond a single always-on 24/7 feed. Exploration confirmed the L1-L4 reasoning core is fully asset-agnostic — all cost lives at the ingestion/cache/API boundary, which today silently assumes exactly one market ever pushes data (`src/cycle/latest.ts` holds one global, unconditionally-overwritten cache entry).

## Decisions Requiring Sign-Off

Five architectural questions were raised in exploration and already resolved through direct conversation with the user (not open for re-litigation here — see Approach/Scope for the settled outcomes). One of those resolutions reaches back into already-shipped, previously-verified behavior and needs explicit re-confirmation before `sdd-spec`:

**D1 — Crypto's candle interval migrates from `1h` to `1d`.** For cross-market consistency, `n8n/faf-workflow.json`'s `Fetch Klines` node (Binance `klines?interval=1h`) changes to `interval=1d`, matching Acciones' EOD granularity. This is a deliberate, accepted change to crypto's existing LIVE pipeline — not a bug fix, not new functionality. **Real consequence**: RSI/MACD/SMA/Bollinger for crypto now compute over daily closes instead of hourly closes, changing what technical signal the framework reads for an asset class that has been live and archived multiple times this session (`n8n-cadence-6h`, `cycle-cache-ttl-6h`, `n8n-dynamic-asset-list`, etc.). No cold-start regression: `klines?interval=1d&limit=50` returns 50 complete real historical daily candles in one call, same non-incremental "always fetch last 50" pattern already in use — independently verified by the orchestrator. Poll cadence (Schedule Trigger, 6h, shared by both branches) is unchanged; granularity and poll frequency are decoupled by this fetch-last-50 pattern.

## Scope

### In Scope
- `market: 'crypto' | 'acciones'` field threaded through `AssetKlines`, `Decision`, `DecisionReport`, `POST /api/cycle` payload, and `GET /api/decisions`.
- `src/cycle/latest.ts`: single `CacheEntry` becomes market-keyed (map, one entry per market) — no more cross-market overwrite hazard.
- `POST /api/cycle`: payload carries a `market` discriminator; validation becomes market-specific (crypto keeps `ASSET_SYMBOL_PATTERN = /^[A-Z0-9]{2,20}USDT$/`; acciones gets a new US-ticker pattern, draft `^[A-Z]{1,5}$`, exact regex confirmed in design).
- `GET /api/decisions`: becomes market-scoped (query param or route param — exact shape decided in design).
- `n8n/faf-workflow.json`: one shared `Schedule Trigger` fans out to two branches — existing `Symbols` (crypto/Binance) branch, tagged `market: 'crypto'`, migrated to `interval=1d` (D1); new `Acciones` (Twelve Data) branch, tagged `market: 'acciones'`, `interval=1day`, each independently fetching -> aggregating -> POSTing to `/api/cycle`.
- New Twelve Data integration: `time_series` endpoint, free-tier anonymous-friendly API key, US-listed ticker universe (first pass).
- `src/cycle/constants.ts`: `BETA_MS` (currently 8h) widened so a normal Friday-close-to-Monday-open weekend gap does not spuriously trigger `ServiceUnavailable('no-data')`; exact value derived in design from the longer of both markets' normal EOD gaps.
- New `app/dashboard/(with-footer)/acciones/page.tsx`, mechanical clone of `crypto/page.tsx` per exploration; flip `MARKETS.acciones.isReal` to `true`.
- `tests/market/assets.test.ts`: new truth-table cases for the market-specific pattern.
- Spec deltas for `semantic-ingestion` (market discriminator, per-market cache/validation) and `decision-dashboard`/`market-navigation` (Acciones route goes live).

### Out of Scope
- Argentine/BYMA equities (GGAL, YPFD, PAMP local listings) — Twelve Data targets US-listed tickers only; this is a deliberate first-pass boundary, not an oversight.
- Any new "market closed" UI state or market-hours/calendar logic — `ServiceUnavailable`'s existing 2-reason model (`'no-data' | 'error'`) stays exactly as-is; the TTL widening (not new UI) absorbs the weekend gap.
- Any change to the L1-L4 reasoning core (`src/stream/`, `src/laf/`, `src/decision/policy.ts`) — confirmed fully asset-agnostic, zero changes needed.
- Any market other than crypto/acciones — renta-fija, forex, commodities, indices, etfs, cedears, dolar, plazo-fijo stay `isReal: false` placeholders.
- Raising or restructuring `MAX_ASSETS` beyond what per-market independent payloads already require (each market's push is capped independently; no shared-payload collision to solve).

## Capabilities

### New Capabilities
None — Acciones reuses the existing `decision-dashboard`/`market-navigation` capabilities with a new market's data, not new UI capability surface.

### Modified Capabilities
- `semantic-ingestion`: `POST /api/cycle` payload gains a `market` discriminator; per-market symbol validation; `src/cycle/latest.ts` becomes market-keyed instead of single-entry.
- `decision-dashboard`: `GET /api/decisions` becomes market-scoped; `/dashboard/acciones` goes live with real data instead of `MarketPlaceholder`.
- `market-navigation`: `MARKETS.acciones.isReal` flips to `true`.

## Approach

Mirror the architecture the codebase already assumes (`MARKETS` catalog, one route per market) at the ingestion/cache/API boundary, which is the only place today's single-market assumption is hardcoded. Add an explicit `market` field rather than inferring market from symbol shape (US tickers and malformed crypto symbols don't reliably distinguish by regex alone). Partition the cache and read API by market so one market's push can never silently corrupt or overwrite another's view. Source Acciones candles from Twelve Data's `time_series` (EOD, `interval=1day`), reachable from n8n's HTTP Request node with no brokerage-credential friction. Migrate crypto to the same EOD granularity for consistency (D1, sign-off required). Widen the cache TTL so both markets' normal EOD gaps (including weekends) read as fresh data, not service failure.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/domain/types.ts` | Modified | `Asset`/`Decision`/`DecisionReport` gain `market` field |
| `src/cycle/runCycle.ts` (`AssetKlines`) | Modified | Carries `market` through L1-L4 composition input |
| `src/cycle/latest.ts` | Modified | Single `CacheEntry` -> market-keyed cache |
| `src/cycle/constants.ts` | Modified | `BETA_MS` widened (exact value in design) |
| `app/api/cycle/route.ts` | Modified | Payload validation gains `market` field + per-market symbol check |
| `app/api/decisions/route.ts` | Modified | Market-scoped read (query/route param, decided in design) |
| `src/market/assets.ts` | Modified | New market-specific `ASSET_SYMBOL_PATTERN` (acciones), existing crypto pattern unchanged |
| New `src/market/twelvedata.ts` (or similar) | New | Twelve Data client, mirrors `src/market/binance.ts` shape |
| `n8n/faf-workflow.json` | Modified | New `Acciones` branch (Twelve Data, `market: 'acciones'`); existing `Symbols`/`Fetch Klines` branch tagged `market: 'crypto'`, interval `1h` -> `1d` (D1) |
| `app/(dashboard)/lib/markets.ts` | Modified | `MARKETS.acciones.isReal` -> `true` |
| New `app/dashboard/(with-footer)/acciones/page.tsx` | New | Mechanical clone of `crypto/page.tsx` |
| `tests/market/assets.test.ts` | Modified | New truth-table cases for acciones pattern |
| `tests/narrative/cache.test.ts`, `tests/cycle/*` | Modified | Cover market-keyed cache, widened `BETA_MS` |
| `openspec/specs/semantic-ingestion/spec.md`, `decision-dashboard/spec.md`, `market-navigation/spec.md` | Modified | Deltas per Capabilities section |
| `src/stream/`, `src/laf/`, `src/decision/policy.ts` | Unchanged | Confirmed fully asset-agnostic |
| `app/(dashboard)/lib/i18n.ts`, `OverviewClient`, `DecisionCard`, `RecommendationBadge`, `ScoreGauge`, `Sparkline`, `DrilldownPanel`, `NarrativePanel` | Unchanged | Already market-agnostic per exploration; no generalization needed |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| D1's interval change alters crypto's live technical signal (RSI/MACD/SMA/Bollinger over daily vs. hourly closes) | High (accepted) | Explicit sign-off callout above; must be confirmed before `sdd-spec` touches the crypto branch |
| Twelve Data free tier (800 calls/day, 8/min) exhausted if ticker universe grows | Low | 6h cadence x small first-pass ticker list stays well under budget; revisit if universe expands |
| Widened `BETA_MS` masks a genuine stale/broken feed for longer before `ServiceUnavailable('error')` would otherwise show | Low-Med | TTL sized to the longest NORMAL gap (long weekend/holiday), not unboundedly large; design must show the calculation |
| Market-keyed cache/API restructuring touches shared code (`latest.ts`, both API routes) used by the already-live crypto path | Med | Existing crypto tests (`tests/cycle/*`, `tests/api/*`) must stay green throughout; no behavior change to crypto's read path beyond market-scoping |
| PR review budget — large surface (domain type, cache, 2 API routes, n8n workflow with 2 branches, new market client, new route, spec deltas) | High | `sdd-tasks` must phase into chained PRs, same pattern as the 5-phase `no-recommendation-filter-and-i18n` change |
| New US-ticker regex (`^[A-Z]{1,5}$` draft) may collide with malformed input in ways not yet truth-tabled | Low | Exact regex finalized and truth-tabled in design/spec before implementation, per existing `assets.test.ts` convention |

## Rollback Plan

Revert the branch/PR(s). No destructive data migration: the cache is in-memory and TTL-bound (never persisted), so a rollback simply reverts to the single global `CacheEntry` and crypto's `1h` Binance interval. If only D1 (crypto interval) needs reverting independently, `n8n/faf-workflow.json`'s `Fetch Klines` node interval can be reverted alone without touching the market-keyed cache/API work, since the two are architecturally independent.

## Dependencies

- Twelve Data free-tier API key (external, anonymous-friendly signup) — must be provisioned as an n8n credential/env var before the new branch can run live.

## Success Criteria

- [ ] `/dashboard/acciones` shows real, market-scoped decision cards sourced from Twelve Data, independent of and never overwritten by crypto's push.
- [ ] `/dashboard/crypto` continues to work exactly as today, now explicitly tagged `market: 'crypto'` and on daily candles (D1).
- [ ] A stock push can never silently replace or corrupt the crypto cache entry, or vice versa (per-market cache verified).
- [ ] `POST /api/cycle` rejects malformed symbols per the correct market-specific pattern; `tests/market/assets.test.ts` covers both patterns exhaustively.
- [ ] A normal weekend gap in EOD candles does not flip either market's dashboard to `ServiceUnavailable('no-data')`.
- [ ] `npx vitest run`, `npx tsc --noEmit`, `npx playwright test` all green (Strict TDD Mode).

## Proposal question round

All 5 architectural questions (data partitioning, market discriminator, data source, candle granularity, market-closed UX) were already resolved through direct conversation before this proposal was drafted — see Approach/Scope above for the settled outcomes. The one open item requiring explicit sign-off is D1 (crypto interval migration) above. Two smaller, non-blocking items remain for `sdd-design` or the user to confirm:

1. Is `^[A-Z]{1,5}$` an acceptable draft pattern for US tickers, or should it be tightened/widened (e.g. allow a `.` for share classes like `BRK.B`)?
2. Is there a specific first-pass ticker list for Acciones (e.g. a fixed set of large-cap names), or should `sdd-design` propose a reasonable default list sized similarly to crypto's current 24 symbols?

If unanswered, this proposal proceeds with the draft regex as-is and `sdd-design` proposing a comparable-sized default ticker list.
