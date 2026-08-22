# Design: Acciones Market Integration

## Technical Approach

Thread an explicit `Market` discriminator from n8n's push through `AssetKlines` -> `Decision` -> `DecisionReport` -> the cache -> both read APIs, replacing the single global cache/report with a market-keyed one. Reuse every existing pattern verbatim (`Map`-keyed cache mirrors `src/narrative/cache.ts`; per-market symbol regex mirrors `ASSET_SYMBOL_PATTERN`; new dashboard route mirrors `crypto/page.tsx`). L1-L4 (`src/stream/`, `src/laf/`, `src/decision/policy.ts`) stay untouched — confirmed asset-agnostic in exploration.

## Architecture Decisions

### D-A: `Market` type and attachment points
**Choice**: `export type Market = 'crypto' | 'acciones';` in `src/domain/types.ts`. Add `market: Market` to `AssetKlines` (`src/cycle/runCycle.ts`), `Decision`, and `DecisionReport`. `POST /api/cycle`'s payload gets a **top-level** `market: Market` field (one push = one market); `parseCyclePayload` copies it onto every `AssetKlines` item it builds.
**Alternatives considered**: infer market from symbol shape (rejected — proposal already ruled this out, US tickers and malformed crypto symbols don't reliably distinguish); wrap the whole payload as `{market, assets}` without touching `AssetKlines`/`Decision` (rejected — proposal explicitly requires `market` threaded through `Decision`/`DecisionReport` too, needed so `getForAsset` and any future per-decision processing stay self-describing).
**Rationale**: matches proposal's confirmed scope; minimal diff since `AssetKlines` already exists as the L1 input seam.

### D-B: `src/cycle/latest.ts` becomes market-keyed
**Choice**: `const entries = new Map<Market, CacheEntry>();` with signatures `put(market, report, ttlMs, atMs?)`, `get(market, atMs?)`, `getForAsset(market, asset, atMs?)`, `clear()` (clears whole map). Stays pure in-memory, module-scope — no persistence change.
**Alternatives considered**: `Record<Market, CacheEntry | null>` (rejected — `Map` is the pattern already established by `src/narrative/cache.ts`'s per-key cache; consistent, not invented).
**Rationale**: eliminates the cross-market overwrite hazard by construction; each market's `put` only ever touches its own key.

### D-C: `POST /api/cycle` payload + per-market validation
**Choice**: Payload shape `{ market: 'crypto' | 'acciones', assets: [{symbol, klines}] }`. `parseCyclePayload` first validates `market` is one of the two literals (400 `"market" must be "crypto" or "acciones"` otherwise), then validates each symbol via `isWellFormedAsset(market, symbol)`. `isWellFormedAsset`'s signature becomes `(market: Market, asset: string): boolean`, dispatching to `ASSET_SYMBOL_PATTERN` (crypto, unchanged) or new `ACCIONES_SYMBOL_PATTERN = /^[A-Z]{1,5}(\.[A-Z])?$/` (acciones). `cache.put(market, report, BETA_MS)`.
**Callers touched** (all 3, verified via codegraph): `app/api/cycle/route.ts` (as above), `src/market/binance.ts`'s `fetchCandles` (`isWellFormedAsset('crypto', asset)` — this class is crypto-only), `app/api/decisions/[asset]/narrative/route.ts` (see D-E).
**Rationale**: explicit discriminator, not shape-inference (D-A rationale); `MAX_ASSETS=25` stays unchanged — each market's push is independently capped (proposal Out of Scope), acciones' 24-ticker list fits with 1 slot to spare.

### D-D: `GET /api/decisions` market-scoping
**Choice**: required query param `?market=crypto|acciones`. `GET(request: Request)` parses `new URL(request.url).searchParams.get('market')`, 400s on missing/invalid value, else `cache.get(market)`. `OverviewClient` gains a required `market: Market` prop, threads it into `` fetch(`/api/decisions?market=${market}`) ``. `crypto/page.tsx` passes `market="crypto"`; new `acciones/page.tsx` passes `market="acciones"`.
**Alternatives considered**: new route segment `[market]/decisions` (rejected — heavier diff, moves an existing route file, no benefit over a query param for a same-origin same-app fetch); inferring market from `Referer`/page context (rejected — implicit, fragile).
**Rationale**: minimal diff; `OverviewClient`/`DecisionCard`/etc. need zero further changes (exploration confirmed they're market-agnostic).

### D-E: narrative route (necessary consequence, not in proposal's Affected Areas)
**Finding**: `app/api/decisions/[asset]/narrative/route.ts` calls `isWellFormedAsset(asset)` and `cycleCache.getForAsset(asset)` — both signatures change under D-C/D-B, so this file MUST change even though the proposal's Affected Areas table omits it.
**Choice**: same `?market=` query param as D-D. Validate, then `isWellFormedAsset(market, asset)` and `cycleCache.getForAsset(market, asset)`. Update the file's own T-4 comment ("ignores query string entirely") since it no longer does.
**Rationale**: consistent mechanism with D-D; avoids a third market-identification scheme.

### D-F: `BETA_MS` widening
**Choice**: `BETA_MS = 5 * 24 * 60 * 60 * 1000` (5 days = 120h), one shared constant for both markets (applied via `cache.put(market, report, BETA_MS)` in both n8n branches).
**Derivation**: crypto's normal EOD gap is ~24h (D1: daily candles, trades every day). Acciones' longest **normal** gap is a 4-day holiday long weekend (Friday close -> Tuesday open) ≈ 96h. 120h exceeds 96h with a 24h (~25%) margin — enough to also absorb one missed 6h cron tick after a holiday reopen (96h + 6h = 102h < 120h) — while staying bounded, not "unboundedly large" (proposal's stated risk-mitigation requirement). Comment in `src/cycle/constants.ts` documents this formula, matching the existing TTL-formula-in-comment convention.
**Alternatives considered**: per-market TTL map (rejected — adds a second axis of complexity for a value that only needs to be "large enough for the larger market"; crypto simply gets a wider-than-strictly-needed window, which is safe, matching the existing BETA_MS comment's own "asymmetry favors the larger margin" precedent).

### D-G: `src/market/twelvedata.ts` — NOT created
**Finding**: `openspec/specs/semantic-ingestion/spec.md`'s "Market-data fetch contract" requirement, and `src/market/provider.ts`'s own comment, confirm `BinanceHttpSource`/`MarketDataSource` are retained only to satisfy a spec-level contract — they are **not called by any live route** (`POST /api/cycle` is push-only; n8n's HTTP Request node fetches Binance directly, bypassing this class entirely).
**Choice**: do not create `src/market/twelvedata.ts` for this change. n8n's HTTP Request node calls Twelve Data's `time_series` endpoint directly, mirroring how it calls Binance directly today.
**Rationale**: creating a TS client that nothing invokes is dead code; if `sdd-spec` extends the "Market-data fetch contract" requirement per-market and wants symmetric TS-level coverage, that is a follow-up, not a blocker for this change (flagged in Open Questions).

## Data Flow

    Schedule Trigger (6h, shared)
      ├─> Symbols (crypto) ─> Fetch Klines (Binance, 1d) ─> Set Symbol ─> Aggregate{market:'crypto'} ─> POST /api/cycle
      └─> Acciones Symbols  ─> Fetch Acciones Candles (Twelve Data, 1day) ─> Set Acciones Symbol ─> Aggregate{market:'acciones'} ─> POST /api/cycle
                                                                                                              │
                                                                          parseCyclePayload (market + per-market symbol check)
                                                                                                              │
                                                                                runCycle -> cache.put(market, report, BETA_MS)
                                                                                                              │
                                        GET /api/decisions?market=X <──── OverviewClient (crypto/page.tsx | acciones/page.tsx)

## n8n Workflow Plan (`n8n/faf-workflow.json`)

| Node (new unless noted) | Change |
|---|---|
| `Fetch Klines` (existing, crypto) | `interval` query param `'1h'` -> `'1d'` (D1) |
| `Aggregate (build /api/cycle payload)` (existing, crypto) | output becomes `{ market: 'crypto', assets }` |
| `Acciones Symbols` (Code) | emits 24 items: `AAPL, MSFT, GOOGL, AMZN, NVDA, META, TSLA, BRK.B, JPM, V, UNH, XOM, JNJ, WMT, PG, MA, HD, CVX, MRK, ABBV, KO, PEP, AVGO, COST` |
| `Fetch Acciones Candles` (HTTP Request) | GET `https://api.twelvedata.com/time_series`, query `symbol={{$json.symbol}}&interval=1day&outputsize=50`, `apikey` via n8n Query-Auth credential (never inline) |
| `Set Acciones Symbol` (Set) | `symbol = $('Acciones Symbols').item.json.symbol`, `klines = $json.values` |
| `Aggregate Acciones Payload` (Code) | maps `values[].{datetime,open,high,low,close,volume}` (strings) -> `Candle` (`openTime = Date.parse(datetime)`, rest `Number(...)`), outputs `{ market: 'acciones', assets }` |
| `POST /api/cycle` (Acciones) (HTTP Request) | second POST node, same shared-secret credential as the existing one, independent call |
| `Schedule Trigger` (existing) | fans out to both `Symbols` and `Acciones Symbols` |

**Implementation-time verification item**: Twelve Data's `time_series` response is a single top-level JSON **object** (`{meta, values, status}`), not a top-level array — n8n only explodes top-level arrays into multiple items, so this should NOT need the `fullResponse: true` fix Binance required. Must be confirmed against a live response before going active, given this exact workflow's prior item-explosion incident.

## File Changes

| File | Action | Description |
|---|---|---|
| `src/domain/types.ts` | Modify | add `Market`, `market` on `AssetKlines`/`Decision`/`DecisionReport` |
| `src/cycle/latest.ts` | Modify | `Map<Market, CacheEntry>`; market param on `put`/`get`/`getForAsset` |
| `src/cycle/constants.ts` | Modify | `BETA_MS` -> 5 days, formula comment |
| `src/market/assets.ts` | Modify | add `ACCIONES_SYMBOL_PATTERN`; `isWellFormedAsset(market, asset)` |
| `src/market/binance.ts` | Modify | `isWellFormedAsset('crypto', asset)` call-site update |
| `app/api/cycle/route.ts` | Modify | `market` field validation + dispatch |
| `app/api/decisions/route.ts` | Modify | `?market=` query param, 400 on missing/invalid |
| `app/api/decisions/[asset]/narrative/route.ts` | Modify | `?market=` query param (D-E) |
| `app/(dashboard)/lib/markets.ts` | Modify | `MARKETS.acciones.isReal -> true` |
| `app/dashboard/(with-footer)/acciones/page.tsx` | Create | clone of `crypto/page.tsx`, `MARKETS.acciones`, `market="acciones"` |
| `app/dashboard/(with-footer)/crypto/page.tsx` | Modify | pass `market="crypto"` to `OverviewClient` |
| `app/(dashboard)/components/OverviewClient.tsx` | Modify | required `market: Market` prop, threaded into fetch URL |
| `n8n/faf-workflow.json` | Modify | per table above |
| `src/market/twelvedata.ts` | Not created | D-G |

## Interfaces / Contracts

```typescript
// src/domain/types.ts
export type Market = 'crypto' | 'acciones';
// AssetKlines, Decision, DecisionReport each gain: market: Market;

// src/market/assets.ts
export const ACCIONES_SYMBOL_PATTERN = /^[A-Z]{1,5}(\.[A-Z])?$/;
export function isWellFormedAsset(market: Market, asset: string): boolean;

// src/cycle/latest.ts
export function put(market: Market, report: DecisionReport, ttlMs: Millis, atMs?: Millis): void;
export function get(market: Market, atMs?: Millis): DecisionReport | null;
export function getForAsset(market: Market, asset: Asset, atMs?: Millis): Decision | null;
```

## Testing Strategy

| Category | Files | Needs RED->GREEN? |
|---|---|---|
| Market-keyed cache isolation | `tests/cycle/latest.test.ts` (new — currently zero coverage) | Yes — genuine behavior change |
| Per-market symbol dispatch | `tests/market/assets.test.ts` (add `ACCIONES_SYMBOL_PATTERN`/`BRK.B` truth table) | Yes |
| `parseCyclePayload` market field | `tests/api/cycle.test.ts` | Yes |
| Market-scoped `GET /api/decisions` | `tests/api/decisions.test.ts`, `tests/api/decisions-invariance.test.ts` | Yes |
| Narrative route market param | `tests/api/narrative.test.ts` | Yes |
| `BETA_MS` widened value | `tests/narrative/cache.test.ts` (update expectations) | Yes |
| New `acciones/page.tsx` | mirrored smoke test, if one exists for `crypto/page.tsx` | No — mechanical clone, no branching logic |
| `n8n/faf-workflow.json` | manual smoke test per `POST_IMPORT_STEPS.md` convention | No — config JSON, not unit-testable |
| Ticker list, `MARKETS.acciones.isReal` flip | none beyond existing pattern truth table | No — pure data/config |

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary introduced. Existing T-1 (malformed payload)/T-2 (shared secret) in `app/api/cycle/route.ts` extend to cover the new `market` field without new attack surface (Twelve Data URL, like Binance's, is built only from a pre-validated symbol; no injection path).

## Migration / Rollout

No data migration (cache is in-memory, TTL-bound). Rollback reverts the branch/PR(s); D1 (crypto interval) is independently revertible per proposal.

## Open Questions

- [ ] Confirm with `sdd-spec` whether "Market-data fetch contract" gets a per-market TS-implementation requirement (would resurrect `src/market/twelvedata.ts`, D-G).
- [ ] Verify Twelve Data's `time_series` response shape against a live call before activating the n8n branch (item-explosion risk, see n8n plan note).
- [ ] Confirm whether `window.ts`/indicator functions require pre-sorted `candles` — Twelve Data returns `values[]` most-recent-first; verify no explicit re-sort is needed in `Aggregate Acciones Payload`.
