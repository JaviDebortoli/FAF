# Tasks: Dynamic Asset Count (n8n payload as sole asset source)

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | ~950-1000 total (4 work units, 9 modified/created/deleted app files + 7 modified/created test files) |
| 400-line budget risk | High (total); Low-Medium per individual work unit once split into 4 |
| Chained PRs recommended | Yes |
| Suggested split | PR1 ingestion validation (+n8n doc) -> PR2a decisions read-path push-only -> PR2b narrative route push-only -> PR3 dashboard no-data UX |
| Delivery strategy | ask-on-risk |
| Chain strategy | stacked-to-main (recommended — see Delivery Route Recommendation) |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|---|---|---|---|---|---|
| 1 | Validation boundary swap: `assets.ts` predicate, `cycle/route.ts` gate+cap, `binance.ts` guard, `provider.ts` doc, n8n `notes` doc edit | PR1 | `vitest run tests/market/assets.test.ts tests/market/binance.test.ts tests/api/cycle.test.ts` | N/A — pure/HTTP-boundary unit tests cover it; no live n8n harness exists | Revert `src/market/{assets,binance,provider}.ts`, `app/api/cycle/route.ts`, `n8n/faf-workflow.json` notes edit; no downstream consumer changed yet |
| 2a | Push-only `GET /api/decisions`: 503 NO_DATA, drop `pullAllAssets`, delete `pullAssets.ts`, seeding helper | PR2a | `vitest run tests/api/pushOnly.test.ts tests/api/decisions.test.ts tests/api/decisions-invariance.test.ts` | `next dev` + `curl localhost:3000/api/decisions` against seeded/unseeded cache | Revert `app/api/decisions/route.ts`, restore `src/cycle/pullAssets.ts`, `src/cycle/latest.ts` doc fix, `tests/helpers/seedCycleCache.ts`; PR1 unaffected |
| 2b | Push-only narrative route: format gate, delete `getDecisionForAsset` | PR2b | `vitest run tests/api/narrative.test.ts` | `next dev` + `curl localhost:3000/api/decisions/BTCUSDT/narrative` against seeded cache | Revert `app/api/decisions/[asset]/narrative/route.ts`; PR2a's `seedCycleCache` helper unaffected |
| 3 | Dashboard no-data UX: `ServiceUnavailable`, `OverviewClient` view-state machine | PR3 | `playwright test tests/e2e/dashboard.spec.ts` | `playwright test` (config spawns `next dev` on :3100, API stubbed offline) | Revert `app/(dashboard)/components/{ServiceUnavailable,OverviewClient}.tsx`, e2e addition; `EmptyState.tsx` untouched |

## Phase 1: Ingestion Validation Boundary (PR1)

- [x] 1.1 RED `tests/market/assets.test.ts` full rewrite: `isWellFormedAsset` truth table (accepts `BTCUSDT`/`ETHUSDT`/`SOLUSDT`/`ADAUSDT`/`1000PEPEUSDT`; rejects `eth-usdt`, `btcusdt`, `BTCUSD`, `USDT`, `''`, 21+-char prefix); regression guards — no `ASSET_ALLOWLIST`/`isAllowedAsset` export, `ASSET_SYMBOL_PATTERN.flags` has no `g`.
- [x] 1.2 GREEN `src/market/assets.ts`: remove `ASSET_ALLOWLIST`/`AllowedAsset`/`isAllowedAsset`; add `ASSET_SYMBOL_PATTERN = /^[A-Z0-9]{2,20}USDT$/` (no `/g`) + `isWellFormedAsset(asset): boolean`; `BINANCE_KLINES_BASE_URL` unchanged.
- [x] 1.3 RED `tests/market/binance.test.ts`: re-aim the "never fetches for a malformed symbol" T-2 test to `DOGE-USDT` (was `DOGEUSDT`, now well-formed).
- [x] 1.4 GREEN `src/market/binance.ts`: swap guard `isAllowedAsset` → `isWellFormedAsset`. Deviation: the "not on any runtime path" doc-comment was deliberately NOT added — `BinanceHttpSource` is still reachable in Phase 1 (via the `pullAssets.ts`/narrative-route compatibility shims below), so that claim is not yet true; deferred to whichever phase removes its last caller.
- [x] 1.5 Doc-comment fix `src/market/provider.ts:12-18`: correct the superseded "two data sources" claim (no test — doc-only).
- [x] 1.6 RED `tests/api/cycle.test.ts`: re-aim `rejects a symbol outside the allowlist` → `rejects a malformed symbol (eth-usdt) with 400`; add `ADAUSDT` (previously-unseen) accepted, `runCycle` called once; add 25-symbols-accepted / 26-symbols-rejected boundary; replace `accepts an empty body, pulls candles server-side` with `rejects an empty body with 400, never calls runCycle, never calls fetch`.
- [x] 1.7 GREEN `app/api/cycle/route.ts`: standalone `export const MAX_ASSETS = 25`; `parseCyclePayload` format gate via `isWellFormedAsset` (static `'Malformed symbol'`, no echo); empty-body branch → `400 { error: 'Request body is required' }`; doc-comment fix `:9-14`.
- [x] 1.8 Update `n8n/faf-workflow.json` Symbols Code node `notes`: remove the reference to the now-nonexistent `ASSET_ALLOWLIST` duplication check (doc-only JSON edit, no functional node change).
- [x] 1.9 Verify: `npx vitest run tests/market/assets.test.ts tests/market/binance.test.ts tests/api/cycle.test.ts` + `npx tsc --noEmit`. Also ran full suite (`npx vitest run`, 34 files/215 tests) and repo-wide `npx tsc --noEmit` — both clean.

**Unplanned but forced ripple (not in original 9 tasks)**: removing `ASSET_ALLOWLIST`/`AllowedAsset`/`isAllowedAsset` from `assets.ts` breaks `npx tsc --noEmit` repo-wide, because `src/cycle/pullAssets.ts` and `app/api/decisions/[asset]/narrative/route.ts` (both explicitly Phase 2a/2b scope) import those symbols directly — a dependency this task list's Unit 1 rollback-boundary note ("no downstream consumer changed yet") did not account for. Applied a minimal, behavior-preserving compatibility shim in both files (inlines the exact same 3-symbol list/predicate locally, zero functional change, verified via the full untouched test suite for those files) so the mandatory tsc gate passes without implementing any Phase 2a/2b business logic. Both shims are self-cleaning: Phase 2a's task 2a.6 deletes `pullAssets.ts` outright; Phase 2b's task 2b.2 replaces the narrative guard with `isWellFormedAsset` and deletes `getDecisionForAsset`, removing the shim naturally.

## Phase 2a: Push-Only Decisions Read Path (PR2a)

- [x] 2a.1 Create `tests/helpers/seedCycleCache.ts`: `buildReport(decisions: Decision[] = []): DecisionReport` + `seedCycleCache(report, ttlMs = 60_000): void` (thin `cache.put` wrapper), generalizing `narrative.test.ts`'s local `primeReport`.
- [x] 2a.2 RED `tests/api/pushOnly.test.ts`: static-import guard asserting `app/api/decisions/route.ts` imports no `src/market/binance`/`src/cycle/pullAssets` (same mechanism as `tests/narrative/staticImport.test.ts`). Scoped to `route.ts` specifically, not the whole `app/api/decisions/**` subtree — see 2a.6 deviation below.
- [x] 2a.3 RED `tests/api/decisions.test.ts` full rewrite: cache hit → 200 + report; cache miss → 503 + `code:'NO_DATA'` + `Retry-After` header present; expired entry → 503; `fetch` spy never called on either path; delete the cache-hit-equals-recompute test (premise no longer exists).
- [x] 2a.4 RED `tests/api/decisions-invariance.test.ts`: drop `pullAllAssets`, reseed via `seedCycleCache`; D7 clause 4 byte-identity (with/without `ANTHROPIC_API_KEY`) asserted on both the 200 and the 503 path.
- [x] 2a.5 GREEN `app/api/decisions/route.ts`: rewrite `GET` handler — cache miss returns `503 { error: 'Service temporarily unavailable', code: 'NO_DATA' }` + `Retry-After: 30`; drop `runCycle`/`pullAllAssets`/`BETA_MS` imports.
- [x] 2a.6 **Deviation — deletion deferred to Phase 2b, not performed here.** `src/cycle/pullAssets.ts` was NOT deleted: the narrative route (`app/api/decisions/[asset]/narrative/route.ts`) also imports `pullAllAssets` from it (its `getDecisionForAsset()` cache-miss fallback), and that route is explicitly Phase 2b's scope (task 2b.2). Deleting the file now would break `npx tsc --noEmit` on a file outside this PR's authorized edit scope. Task narrowed to: removed `app/api/decisions/route.ts`'s usage (2a.5) and updated `pullAssets.ts`'s shim doc-comment to record that its last remaining caller is now the narrative route and that deletion is deferred to Phase 2b task 2b.2. See tasks.md/design.md note below.
- [x] 2a.7 Doc-comment fix `src/cycle/latest.ts:3-25`: correct the superseded "recompute is the common serverless path" claim.
- [x] 2a.8 Verify: `npx vitest run tests/api/pushOnly.test.ts tests/api/decisions.test.ts tests/api/decisions-invariance.test.ts` (6/6 passing) + `npx tsc --noEmit` (clean). Also ran full suite (`npx vitest run`, 35 files/216 tests) and repo-wide `npx tsc --noEmit` — both clean.

**Deviation note (cross-PR ordering conflict, discovered during apply):** design.md's File Changes table labels `src/cycle/pullAssets.ts` as a flat "Delete" action attributed to this phase, and tasks.md's Phase 1 completion note assumed this file would have zero callers once Phase 2a lands. Neither accounted for the narrative route (Phase 2b scope) importing `pullAllAssets` directly for its own cache-miss fallback — a second caller that PR1's apply-progress already flagged existed (`getDecisionForAsset`'s shim), but the deletion sequencing in tasks.md did not resolve. Resolved by narrowing 2a.6 to "remove this route's own usage" and deferring physical deletion to Phase 2b's task 2b.2, which deletes `getDecisionForAsset()` — the file's true last caller. `pushOnly.test.ts`'s guard (2a.2) was scoped to `app/api/decisions/route.ts` only for the same reason, per this phase's explicit launch-prompt instruction to prioritize a passing `npx tsc --noEmit` over the literal file-action label when a genuine cross-phase ordering conflict exists. No `size:exception` or scope creep involved — zero Phase 2b business logic was touched.

## Phase 2b: Push-Only Narrative Route (PR2b)

- [x] 2b.1 RED `tests/api/narrative.test.ts`: re-aim `disallowed symbol -> 400 BAD_ASSET` to `DOGE-USDT`; add well-formed never-pushed `DOGEUSDT` → 404 `NO_DECISION`, no Anthropic client constructed, no `fetch` call.
- [x] 2b.2 GREEN `app/api/decisions/[asset]/narrative/route.ts`: format gate via `isWellFormedAsset` → `400 BAD_ASSET` static `'Malformed asset symbol'` (no echo); delete `getDecisionForAsset()`, collapse to `cycleCache.getForAsset(asset)` (no await, `ErrorCode` union unchanged) → `404 NO_DECISION` static `'No decision available for this asset'`; doc-comment fix `:49-57`. **Carried over from Phase 2a (see its 2a.6 deviation note): once `getDecisionForAsset()` is deleted, `src/cycle/pullAssets.ts` has zero remaining callers — delete it in this same PR** (design.md's original attribution of that deletion to "Phase 2a" was a sequencing error; Phase 2a's own `GET /api/decisions` stopped needing it, but the narrative route did not until now). DONE: `src/cycle/pullAssets.ts` deleted.
- [x] 2b.3 Verify: `npx vitest run tests/api/narrative.test.ts` + `npx tsc --noEmit`. Also confirm `tests/api/pushOnly.test.ts` can be widened back to the full `app/api/decisions/**` subtree now that `pullAssets.ts` is gone and the narrative route no longer imports it (restores the guard's originally-designed scope). DONE: widened to walk the full `app/api/decisions/**` subtree (directory-walk, same mechanism as `tests/narrative/staticImport.test.ts`). Full suite `npx vitest run` → 35 files/217 tests passing (up from 216). Repo-wide `npx tsc --noEmit` → clean.

## Phase 3: Dashboard No-Data UX (PR3)

- [x] 3.1 Create `app/(dashboard)/components/ServiceUnavailable.tsx` per design's exact snippet: prop `reason: 'no-data' | 'error'` (drives only `data-reason`, never visible copy), `data-testid="service-unavailable"`, copy "SERVICIO NO DISPONIBLE" / "Servicio momentáneamente no disponible" / "Vuelve a intentarlo en unos minutos."
- [x] 3.2 RED `tests/e2e/dashboard.spec.ts`: add "Tier 1 — no-data state" — `page.route('**/api/decisions', r => r.fulfill({status:503, json:{error:'Service temporarily unavailable', code:'NO_DATA'}}))`; assert `service-unavailable` visible, `empty-state` absent, rendered text matches none of `/n8n|cache|pull|cycle/i`.
- [x] 3.3 GREEN `app/(dashboard)/components/OverviewClient.tsx`: introduce `ViewState` union (`loading | unavailable{reason} | ready{report}`); `poll()` maps `503` → `unavailable/no-data`, other failure → `unavailable/error` (detail to `console.error` only, never DOM), `200` → `ready`; a failed refresh after a successful load keeps the last `ready` state (no blanking on transient 503); render `ServiceUnavailable` only when `unavailable` with no prior `ready`; loading copy `Cargando ciclo…` → `Cargando…`.
- [x] 3.4 Confirm `app/(dashboard)/components/EmptyState.tsx` has zero diff (explicit no-op check — it stays the "selection is empty" state, distinct from `ServiceUnavailable`'s "no data exists" state).
- [x] 3.5 Verify: `npx playwright test tests/e2e/dashboard.spec.ts` + `npx tsc --noEmit` (no React component-test harness exists for this unit, per design).

## Phase 4: Final Verification — Delta Spec Scenario Self-Check

| Spec | Scenario | Confirmed by |
|---|---|---|
| semantic-ingestion | Well-formed, previously-unseen symbol accepted | `tests/api/cycle.test.ts` — `ADAUSDT` accepted, `runCycle` called once |
| semantic-ingestion | Malformed symbol rejected | `tests/api/cycle.test.ts` — `eth-usdt` → 400 |
| semantic-ingestion | Payload exceeding MAX_ASSETS rejected | `tests/api/cycle.test.ts` — 26 symbols → 400, 25 → accepted |
| semantic-ingestion | Missing/invalid shared secret still rejected | `tests/api/cycle.test.ts` — existing 401/403 tests, unchanged |
| semantic-ingestion | Cache miss does not trigger independent pull | `tests/api/pushOnly.test.ts` static guard + `tests/api/decisions.test.ts`/`narrative.test.ts` fetch-never-called spies |
| semantic-ingestion | POST /api/cycle is sole ingestion entry point | `tests/api/pushOnly.test.ts` import walk of `app/api/decisions/**` |
| semantic-ingestion | Symbol-list-to-allowlist duplication check retired | Structural readback of `n8n/faf-workflow.json` Symbols node `notes` (no n8n JSON test harness, per project precedent) |
| decision-narrative | Malformed symbol rejected | `tests/api/narrative.test.ts` — `DOGE-USDT` → 400 `BAD_ASSET` |
| decision-narrative | Well-formed unknown symbol yields no-decision, not format error | `tests/api/narrative.test.ts` — `DOGEUSDT` → 404 `NO_DECISION`, distinct from `BAD_ASSET` |
| decision-narrative | Valid asset streams narrative | `tests/api/narrative.test.ts` existing test, unchanged |
| decision-dashboard | No cached report shows architecture-agnostic message | `tests/e2e/dashboard.spec.ts` "Tier 1 — no-data state" — `service-unavailable` visible, no banned words |
| decision-dashboard | No-data state distinct from empty-filter state | `tests/e2e/dashboard.spec.ts` — no-data test + existing `no-active`/`filtered` empty-state tests assert different `data-testid`s |
| decision-dashboard | Multiple active assets shown | `tests/e2e/dashboard.spec.ts` existing multi-asset test, unchanged |
| decision-dashboard | Card count follows n8n's last push, not source code | `tests/market/assets.test.ts` regression guard (no allowlist export) + `tests/api/cycle.test.ts` `ADAUSDT` acceptance prove no source-code list gates identity |

- [ ] 4.1 Run full suite: `npx vitest run` + `npx tsc --noEmit` + `npx playwright test`.
- [ ] 4.2 Grep repo for `ASSET_ALLOWLIST`/`isAllowedAsset`/`AllowedAsset` — MUST return zero matches under `src/`, `app/` (proposal Success Criteria).
- [ ] 4.3 Confirm no GET read-path code path imports `src/market/binance` or `src/cycle/pullAssets` (already enforced by `tests/api/pushOnly.test.ts`, restated here as the human-facing check).

## Delivery Route Recommendation

**Recommendation: stacked-to-main**, matching this repo's `dashboard-ux` precedent (PR1a→1b→2a→2b→3→4, all merged sequentially to `main`). This change is smaller (4 units vs. 6) and each unit is independently revertable, so a feature-tracker branch adds coordination overhead without a matching benefit here.

**Explicit mitigation for the known gotcha**: GitHub does not reliably auto-retarget an open stacked PR's base branch when the PR it was stacked on merges to `main`. Do not rely on GitHub's automatic base-branch update. After each unit merges (PR1 → PR2a → PR2b → PR3), the orchestrator/apply step MUST manually rebase (or recreate) the next branch onto the freshly-updated `main` and re-verify the diff shows only that unit's changes before requesting review — this is a required manual step in the chain, not optional cleanup.

## Implementation Order

Phase 1 → Phase 2a → Phase 2b → Phase 3 → Phase 4. Phase 1 must land first — Phase 2a's `parseCyclePayload`/`isWellFormedAsset` reuse and Phase 3's e2e test both assume the validation boundary already accepts arbitrary well-formed symbols. Phase 2b depends on Phase 2a's `seedCycleCache` helper. Phase 3 depends on Phase 2a's 503 contract existing at the API layer for its e2e stub to be meaningful, though `page.route` interception means it could technically run in isolation — sequenced last per design's own stated order. Phase 4 is the terminal cross-spec check.
