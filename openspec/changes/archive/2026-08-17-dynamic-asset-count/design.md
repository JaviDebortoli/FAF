# Design: Dynamic Asset Count (n8n payload as sole asset source)

## Technical Approach

Two seams change. (1) **Identity**: enumerated membership (`ASSET_ALLOWLIST`) is replaced by a
format predicate plus a standalone count cap, so "which assets exist" is decided entirely by the
n8n payload. (2) **Direction**: ingestion becomes strictly push-only — every server-side Binance
pull call site is removed, so both GET routes become pure cache reads. The rendering path is
already asset-count-agnostic (`Asset = string`, `report.decisions.map`) and is untouched except
for one new no-data state.

Strict TDD Mode applies to this change (real TypeScript with existing Vitest + Playwright
coverage, unlike the two prior n8n-JSON-only changes). `sdd-apply` MUST write the RED test first
per work unit and MUST run `npx vitest run` and `npx tsc --noEmit`; the dashboard work unit's RED
test lives in Playwright (`npx playwright test`) because no React component test harness exists.

## Architecture Decisions

### Decision: format predicate replaces enumerated membership

| Option | Tradeoff | Decision |
|---|---|---|
| Remove names, add `isWellFormedAsset` | Honest name; 4 call-site renames | **Chosen** |
| Keep `isAllowedAsset`/`AllowedAsset` names (exploration Approach 2) | Zero call-site churn, but the name lies — nothing is "allowed" by a list | Rejected |
| Env-configurable allowlist (Approach 3) | Second source of truth vs. n8n | Rejected by user |

**Rationale**: the proposal locks Approach 1. A predicate named after list membership would
mis-document the new boundary permanently; the rename is 4 sites and mechanical.

### Decision: `GET /api/decisions` no-data is `503 NO_DATA`, not an empty 200

| Option | Tradeoff | Decision |
|---|---|---|
| `503 {error, code:'NO_DATA'}` + `Retry-After: 30` | Client distinguishes no-data from a real 0-decision cycle by status alone; reuses the narrative route's existing `{error, code}` shape | **Chosen** |
| `200 {cycleId:'', decisions:[]}` | Indistinguishable from a genuine cycle where every asset was skipped | Rejected |
| `204` / `404` | 204 has no body/code and implies success; 404 implies a permanently absent resource | Rejected |

**Rationale**: 503 is literally "temporarily unavailable, retry" — the exact semantics of "n8n has
not pushed yet". Making the three UI states separable by HTTP status removes any heuristic on
sentinel values. The body's `error` string is a developer-facing API message and MUST NOT be
rendered to the user (see next decision).

### Decision: new `ServiceUnavailable` component, not a third `EmptyState` variant

**Choice**: new sibling `app/(dashboard)/components/ServiceUnavailable.tsx`.
**Alternatives rejected**: adding `variant: 'no-data'` to `EmptyState`.
**Rationale**: `EmptyState` is semantically about *selection* producing zero cards from data that
exists ("so the filter never *looks* broken"); no-data is about *data presence*. Overloading it
would make `getByTestId('empty-state')` (asserted in 3 existing e2e tests) match a fundamentally
different condition. The `decision-dashboard` delta requires "visibly different copy" — separate
components guarantee that structurally instead of by copy-review convention. `EmptyState` is not
modified: zero regression risk.

### Decision: delete `pullAssets.ts`, retain `binance.ts` + `provider.ts`

**Choice**: `src/cycle/pullAssets.ts` is **deleted**; `src/market/binance.ts` and
`src/market/provider.ts` are **retained**, with `BinanceHttpSource`'s guard swapped to
`isWellFormedAsset`, plus a new static-import guard test.
**Rationale**:
1. `pullAllAssets()` is *structurally* impossible to keep — its only symbol source was
   `ASSET_ALLOWLIST`. Nothing remains to iterate, and push-only forbids synthesizing a list.
   Deletion is forced, not discretionary.
2. `BinanceHttpSource` is different in kind: parameterized (`fetchCandles(asset)`), not
   list-driven. Its only coupling to the removed concept is the guard, which swaps cleanly.
3. Deleting it would **orphan an in-force spec requirement**: `openspec/specs/semantic-ingestion/spec.md`
   → "Market-data fetch contract" (fetch ≥50 OHLCV candles from Binance's public klines endpoint)
   and its three scenarios, which this change's delta does **not** retire. Removing the
   implementation of a live requirement is a spec violation `sdd-verify` would flag. Retiring that
   requirement is a separate decision (it also cross-references PRD D4) and is outside this
   change's declared scope.
4. The push-only invariant is enforced behaviorally and structurally, not by absence of the class:
   a `fetch` spy asserted never-called on both read paths, plus a static-import guard following the
   project's own existing precedent (`tests/narrative/staticImport.test.ts`).

**Accepted tradeoff**: `BinanceHttpSource` becomes app-side dead code holding a live egress path.
Mitigated by the static-import guard test (below) and a doc-comment recording that it is on no
runtime path — n8n's `Fetch Klines` HTTP Request node now satisfies the fetch requirement.

## Supersession: `faf-platform` design.md "one ingestion route, two data sources"

`openspec/changes/archive/2026-08-16-faf-platform/design.md` §"Decision: one ingestion route, two
data sources" recorded: *"`POST /api/cycle` accepts either an n8n-pushed raw klines payload or an
empty body (`BinanceHttpSource` pulls server-side)… enabling the UI's on-demand read path and
offline fixture-driven tests."* That decision, and the D-B recompute clause that depends on it
(same file, "cache-miss recomputes an identical report"), are **superseded by this design**, with
explicit user sign-off (2026-08-17, recorded in `proposal.md` Risks).

**Why superseded**: the original rationale assumed a pull path was harmless because `runCycle` is
pure. It is not harmless under the user's binding requirement — because the module-scope cache is
not reliably shared across Vercel function instances (`src/cycle/latest.ts` docstring), the
*recompute* path was the common production path, so most dashboard reads served
independently-pulled Binance data rather than n8n's payload. The original decision's two stated
benefits are replaced: the UI's on-demand read path becomes a pure cache read with a defined
no-data state, and offline fixture-driven tests are replaced by direct cache seeding (below).

Stale doc-comments asserting the superseded decision MUST be corrected in the same change:
`src/market/provider.ts:12-18`, `app/api/cycle/route.ts:9-14`, `app/api/decisions/route.ts:6-23`,
`src/cycle/latest.ts:3-25`, `app/api/decisions/[asset]/narrative/route.ts:49-57`.

## Data Flow

    BEFORE                                   AFTER
    n8n ──POST /api/cycle──┐                 n8n ──POST /api/cycle──► runCycle ──► latest cache
                           ├─► runCycle                                                  │
    Binance ◄─pullAllAssets┘        ▲        Binance ◄── n8n only            ┌───────────┘
       ▲                            │                                       ▼
       └── GET /api/decisions (miss)┘        GET /api/decisions ──► hit: 200 report
       └── GET .../narrative (miss)          GET .../narrative  ──► miss: 503 NO_DATA / 404 NO_DECISION

## File Changes

| File | Action | Description |
|---|---|---|
| `src/market/assets.ts` | Modify | Drop `ASSET_ALLOWLIST`/`AllowedAsset`/`isAllowedAsset`; add `ASSET_SYMBOL_PATTERN` + `isWellFormedAsset`. `BINANCE_KLINES_BASE_URL` unchanged |
| `app/api/cycle/route.ts` | Modify | Standalone `MAX_ASSETS = 25`; format gate in `parseCyclePayload`; empty-body pull branch → 400 |
| `src/market/binance.ts` | Modify | Guard `isAllowedAsset` → `isWellFormedAsset`; doc-comment records "not on any runtime path" |
| `src/market/provider.ts` | Modify | Doc-comment only: supersede "two data sources" |
| `src/cycle/pullAssets.ts` | **Delete** | No symbol source and no callers after this change |
| `app/api/decisions/route.ts` | Modify | Cache miss → `503 NO_DATA`; drop `runCycle`/`pullAllAssets`/`BETA_MS` imports |
| `app/api/decisions/[asset]/narrative/route.ts` | Modify | Format gate; delete `getDecisionForAsset`; static error messages |
| `app/(dashboard)/components/ServiceUnavailable.tsx` | **Create** | User-facing, architecture-agnostic no-data state |
| `app/(dashboard)/components/OverviewClient.tsx` | Modify | 5-state view machine; renders `ServiceUnavailable`; loading copy `Cargando ciclo…` → `Cargando…` |
| `app/(dashboard)/components/EmptyState.tsx` | **Unchanged** | Explicitly not modified |
| `tests/helpers/seedCycleCache.ts` | **Create** | Replaces pull-mode as the shared test data-seeding seam |
| `tests/market/assets.test.ts`, `tests/api/cycle.test.ts`, `tests/api/decisions.test.ts`, `tests/api/decisions-invariance.test.ts`, `tests/api/narrative.test.ts`, `tests/market/binance.test.ts`, `tests/e2e/dashboard.spec.ts` | Modify | See Testing Strategy |
| `tests/api/pushOnly.test.ts` | **Create** | Static-import guard for read paths |

## Interfaces / Contracts

```ts
// src/market/assets.ts — NO /g flag: .test() on a /g regex is stateful across calls.
export const ASSET_SYMBOL_PATTERN = /^[A-Z0-9]{2,20}USDT$/;
export const BINANCE_KLINES_BASE_URL = 'https://api.binance.com/api/v3/klines';
export function isWellFormedAsset(asset: string): boolean {
  return ASSET_SYMBOL_PATTERN.test(asset);
}
```

```ts
// app/api/cycle/route.ts — standalone cap, sibling to the existing payload caps.
export const MAX_ASSETS = 25;              // was: ASSET_ALLOWLIST.length
const MAX_KLINES_PER_ASSET = 500;          // unchanged
const MAX_BODY_BYTES = 1_000_000;          // unchanged

// in parseCyclePayload, replacing the isAllowedAsset branch:
if (typeof symbol !== 'string' || !isWellFormedAsset(symbol)) {
  return { ok: false, error: 'Malformed symbol' };   // no echo of unvalidated input
}

// in POST, replacing the empty-body pull-mode branch:
if (text.trim().length === 0) {
  return Response.json({ error: 'Request body is required' }, { status: 400 });
}
```

```ts
// app/api/decisions/route.ts — whole handler.
export async function GET(): Promise<Response> {
  const cached = cache.get();
  if (!cached) {
    return Response.json(
      { error: 'Service temporarily unavailable', code: 'NO_DATA' },
      { status: 503, headers: { 'Retry-After': '30' } },
    );
  }
  return Response.json(cached, { status: 200 });
}
```

```ts
// app/api/decisions/[asset]/narrative/route.ts
// 1. gate (unchanged status/code, static message, no echo):
if (!isWellFormedAsset(asset)) return jsonError(400, 'BAD_ASSET', 'Malformed asset symbol');
// 2. getDecisionForAsset() is DELETED — cycleCache.getForAsset already returns null
//    both when no report is cached and when the report lacks the asset:
const decision = cycleCache.getForAsset(asset);   // no await; ErrorCode union unchanged
if (!decision) return jsonError(404, 'NO_DECISION', 'No decision available for this asset');
```

`ErrorCode` gains no member. A well-formed, never-pushed symbol (`DOGEUSDT`) and a cached report
that simply lacks the asset are the same condition and both land on the existing `NO_DECISION`/404
path. Removing the helper also removes the `runCycle`, `pullAllAssets` and `BETA_MS` imports
(otherwise unused under `noUnusedLocals`).

```tsx
// app/(dashboard)/components/ServiceUnavailable.tsx — `reason` drives ONLY the data attribute,
// never visible copy. Matches EmptyState's visual language and Spanish register.
export function ServiceUnavailable({ reason }: { reason: 'no-data' | 'error' }) {
  return (
    <div data-testid="service-unavailable" data-reason={reason} role="status"
      className="flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-zinc-800 px-6 py-16 text-center">
      <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">SERVICIO NO DISPONIBLE</span>
      <p className="max-w-sm text-sm text-zinc-400">Servicio momentáneamente no disponible</p>
      <p className="max-w-sm text-xs text-zinc-500">Vuelve a intentarlo en unos minutos.</p>
    </div>
  );
}
```

Copy audit against the `decision-dashboard` delta's ban list (case-insensitive `n8n`, `cache`,
`pull`, `cycle`): none present. `OverviewClient`'s current loading copy `Cargando ciclo…` exposes
the same internal mechanic in Spanish and becomes `Cargando…` in the same work unit.

### `OverviewClient` view state machine

Replace `report`/`error` with one discriminated union:

```ts
type ViewState =
  | { kind: 'loading' }
  | { kind: 'unavailable'; reason: 'no-data' | 'error' }
  | { kind: 'ready'; report: DecisionReport };
```

`poll()`: `503` → `{kind:'unavailable', reason:'no-data'}`; any other non-OK or thrown/network
failure → `reason:'error'` (technical detail goes to `console.error`, never to the DOM);
`200` → `{kind:'ready', report}`. **A failed refresh after a successful load keeps the last
`ready` state** — it does not blank the dashboard on a transient blip, so `unavailable` means
"never had data". Recovery is bounded by the existing 30s poll.

| Condition | Render |
|---|---|
| first fetch unresolved | `Cargando…` |
| `unavailable` (no prior `ready`) | `<ServiceUnavailable reason={...} />` |
| `ready`, `selectActionable(report,'ALL').length === 0` | `<EmptyState variant="no-active" />` |
| `ready`, all-actionable > 0, filtered === 0 | `<EmptyState variant="filtered" direction={...} />` |
| `ready`, filtered > 0 | card grid (unchanged) |

## Testing Strategy

**New seeding seam.** Pull-mode + a stubbed global `fetch` was the shared way tests produced a
report; it is deleted. Replacement: `tests/helpers/seedCycleCache.ts` exporting
`buildReport(decisions: Decision[] = []): DecisionReport` and
`seedCycleCache(report: DecisionReport, ttlMs = 60_000): void` (a thin `cache.put` wrapper). This
generalizes the local `primeReport()` helper that `tests/api/narrative.test.ts` already uses, so
it is the project's existing pattern, not a new one. No API test stubs `fetch` to *produce* data
any more; where `fetch` is stubbed it is a never-called spy proving the push-only invariant.

| Layer | File | What changes |
|---|---|---|
| Unit | `tests/market/assets.test.ts` | Full rewrite. `isWellFormedAsset` truth table: accepts `BTCUSDT`/`ETHUSDT`/`SOLUSDT` **and previously-unseen `ADAUSDT`, `1000PEPEUSDT`**; rejects `eth-usdt`, `btcusdt`, `BTCUSD`, `USDT`, `''`, 21+-char prefix. Regression guards: module exports no `ASSET_ALLOWLIST`/`isAllowedAsset`; `ASSET_SYMBOL_PATTERN.flags` has no `g` (repeat `.test()` on the same input is stable) |
| Unit | `tests/market/binance.test.ts` | Two T-2 tests re-aimed: "never fetches for a **malformed** symbol" uses `DOGE-USDT` (was `DOGEUSDT`, now well-formed); URL-building test unchanged. 7 cassette tests unchanged |
| Integration | `tests/api/cycle.test.ts` | `rejects a symbol outside the allowlist` → `rejects a malformed symbol (eth-usdt) with 400`. ADD: previously-unseen `ADAUSDT` accepted, `runCycle` called once; 25 symbols accepted; 26 rejected 400. REPLACE `accepts an empty body, pulls candles server-side` → `rejects an empty body with 400, never calls runCycle, never calls fetch`. Auth tests unchanged |
| Integration | `tests/api/decisions.test.ts` | Full rewrite; drop `pullAllAssets` + fetch-producing stub. Cache hit → 200 + report; cache miss → 503, `code:'NO_DATA'`, `Retry-After` present; expired entry → 503; `fetch` spy never called on either path. **Delete** the cache-hit-equals-recompute test — its premise no longer exists |
| Integration | `tests/api/decisions-invariance.test.ts` | **Newly discovered affected file** (not in the proposal's list). Drop `pullAllAssets`; seed via helper. D7 clause 4 byte-identity with/without `ANTHROPIC_API_KEY` still asserted, now on both the 200 and the 503 path |
| Integration | `tests/api/narrative.test.ts` | `disallowed symbol -> 400 BAD_ASSET` re-aimed to `DOGE-USDT`. ADD: well-formed never-pushed `DOGEUSDT` → 404 `NO_DECISION`, no Anthropic client constructed, no `fetch`. Remaining ~15 failure-table tests unchanged; local `primeReport` may delegate to the shared helper |
| Structural | `tests/api/pushOnly.test.ts` (new) | Walks `app/api/decisions/**` import specifiers (same mechanism as `tests/narrative/staticImport.test.ts`) and asserts none resolves to `src/market/binance` or `src/cycle/pullAssets`. This is what makes retaining `BinanceHttpSource` safe |
| E2E | `tests/e2e/dashboard.spec.ts` | ADD `Tier 1 — no-data state`: `page.route('**/api/decisions', r => r.fulfill({status:503, json:{error:'Service temporarily unavailable', code:'NO_DATA'}}))`; assert `service-unavailable` visible, `empty-state` absent, and `innerText` matches none of `/n8n\|cache\|pull\|cycle/i`. Existing `no-active`/`filtered` empty-state tests unchanged (they still 200) |

`sdd-apply` runs `npx vitest run` + `npx tsc --noEmit` per work unit and `npx playwright test` for
the dashboard unit (config already spawns `next dev` on :3100 and stubs the API offline).

## Threat Matrix

Generic matrix (`references/threat-matrix.md`) rows — Documentation-like paths, Git repository
selection, Commit state, Push state, PR commands: **all N/A** — this change has no shell,
subprocess, VCS/PR-automation, or executable-file-classification boundary. The project's own
`faf-platform` T-numbering applies instead:

| Row | Applicability | Design response | Planned RED test |
|---|---|---|---|
| T-1 untrusted inbound payload | Applicable — the accepted symbol set widens | Format regex + `MAX_ASSETS=25` + unchanged `MAX_KLINES_PER_ASSET`/`MAX_BODY_BYTES`; error messages never echo unvalidated input | `cycle.test.ts`: `eth-usdt`→400, 26 symbols→400, empty body→400, all without `runCycle` |
| T-2 shared-secret auth | Applicable — now the *sole* enumeration-independent trust boundary | Unchanged code; explicitly re-affirmed as the boundary | `cycle.test.ts` 401/403 tests, unchanged |
| T-2 SSRF (URL from allowlist) | Applicable — guard source changes | URL still built only from `BINANCE_KLINES_BASE_URL` + a symbol that passed `^[A-Z0-9]{2,20}USDT$`; the regex is anchored and admits no `/`, `?`, `:`, `.` or whitespace, so no path/host/query injection is reachable | `binance.test.ts`: `DOGE-USDT` never reaches `fetch` |
| T-3 narrative rate limit | Applicable — an unbounded symbol space now reaches it | Unchanged: the limiter keys on client IP, not asset, so widening symbols does not weaken it. Order preserved: format gate → rate limit → decision lookup | `narrative.test.ts` rate-limit tests, unchanged |
| T-4/T-5/T-6 (client-supplied Decision, upstream echo, stream deadline) | N/A — untouched by this change | — | — |

## Migration / Rollout

No data migration, no persisted state, no feature flag, no n8n-side change. `n8n/faf-workflow.json`
is already N-capable; its Symbols Code node `notes` documenting the now-nonexistent allowlist
duplication must be updated per the `semantic-ingestion` delta. Rollback = single revert of this
change's commits.

**Deploy-order note**: after deploy, the dashboard shows `ServiceUnavailable` until n8n's next
scheduled `POST /api/cycle` lands (≤ the trigger interval). This is the intended, specified
behavior, not a regression — previously a cold instance silently self-pulled.

## Open Questions

- [ ] None blocking. Two accepted risks recorded for `sdd-tasks`: (a) `src/narrative/cache.ts`'s
  16-entry LRU is now smaller than `MAX_ASSETS=25`, so a 25-asset cycle whose narratives are all
  opened will evict early entries — a cost/latency effect only, no correctness impact, out of
  scope here; (b) `BinanceHttpSource` remains as app-side dead code, guarded by the new
  static-import test rather than by deletion.
