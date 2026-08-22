# Apply Progress: acciones-market-integration

**Phase A of 6 — domain type + market-keyed cache only.** Downstream callers
NOT yet updated (Phase B+); `tsc --noEmit` is expected to show errors in
those files until Phase B lands. This matches the chained-PR delivery
strategy (`stacked-to-main`) confirmed for this change: PR1 = Phase A only.

## Mode: Strict TDD

## Completed Tasks (Phase A, PR1)

- [x] A.1 `src/domain/types.ts`: added `export type Market = 'crypto' | 'acciones';`; added `market: Market` to `Decision` and `DecisionReport`.
- [x] A.2 `src/cycle/runCycle.ts`: added `market: Market` to `AssetKlines`; `decideForAsset` gained a `market` param and attaches it to `decide()`'s result (see Deviations below for the exact mechanism).
- [x] A.3 RED `tests/cycle/latest.test.ts` (new file): market-keyed cache isolation, independent TTL expiry, `getForAsset` per-market scoping, `clear()` whole-map behavior.
- [x] A.4 GREEN `src/cycle/latest.ts`: single `CacheEntry` replaced with `const entries = new Map<Market, CacheEntry>();`; `put(market, report, ttlMs, atMs?)`, `get(market, atMs?)`, `getForAsset(market, asset, atMs?)`, `clear()` (whole map).
- [x] A.5 GREEN `tests/helpers/seedCycleCache.ts`: `buildDecision` defaults `market: 'crypto'` (overridable); `buildReport(decisions, market = 'crypto')`; `seedCycleCache(report, market, ttlMs = 60_000)` passes `market` to `cache.put`.
- [x] A.6 GREEN `tests/cycle/idempotency.test.ts`: added `market: 'crypto' as const` to every `AssetKlines` literal.
- [x] A.7 GREEN `tests/golden/paper-example.test.ts`: added `market: 'crypto'` to every `AssetKlines` literal; added real assertions (`decision.market`, `report.market` both `'crypto'`) proving the plumbing, without altering any existing golden numeric assertion.
- [x] A.8 Verify GREEN: `npx vitest run tests/cycle tests/golden/paper-example.test.ts` — 11/11 pass. `npx tsc --noEmit` — zero errors in any Phase A file; all remaining errors confined to Phase B/C/D downstream callers (listed below), as expected for this chained-PR delivery strategy.

## Files Changed

| File | Action | What Was Done |
|------|--------|---------------|
| `src/domain/types.ts` | Modified | Added `Market` type; `market: Market` on `Decision`, `DecisionReport` |
| `src/cycle/runCycle.ts` | Modified | `AssetKlines` gains `market`; `decideForAsset` threads it through; `runCycle` derives `DecisionReport.market` from `rawKlines[0]?.market` (fallback `decisions[0]?.market ?? 'crypto'` for the degenerate empty-input case, untested/unreached today) |
| `src/decision/policy.ts` | Modified (deviation, see below) | `decide()`'s return type changed from `Decision` to `Omit<Decision, 'market'>`; zero change to `DecisionContext`, THETA/DELTA, or any decision logic |
| `src/cycle/latest.ts` | Modified | Market-keyed cache: `Map<Market, CacheEntry>`; `put`/`get`/`getForAsset` all take `market` as first param; `clear()` unchanged contract (whole map) |
| `tests/cycle/latest.test.ts` | Created | New RED->GREEN test: market isolation, independent TTL, per-market `getForAsset`, `clear()` |
| `tests/helpers/seedCycleCache.ts` | Modified | `buildDecision`/`buildReport` default `market: 'crypto'`; `seedCycleCache(report, market, ttlMs)` |
| `tests/cycle/idempotency.test.ts` | Modified | `market: 'crypto'` added to every `AssetKlines` literal |
| `tests/golden/paper-example.test.ts` | Modified | `market: 'crypto'` added to every `AssetKlines` literal; added `decision.market`/`report.market` assertions |
| `openspec/changes/acciones-market-integration/tasks.md` | Modified | Marked A.1-A.8 `[x]` |

## TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| A.1 | N/A (type-only) | N/A | N/A (new) | ➖ Structural (type export) — Triangulation skipped: purely structural field addition, checked by tsc across all Phase A call sites | ➖ | ➖ Skipped: purely structural, no branching | ➖ None needed |
| A.2 | `tests/cycle/idempotency.test.ts`, `tests/golden/paper-example.test.ts` (existing, safety net) | Unit | ✅ 5/5 (baseline run before edit) | N/A — plumbing change verified via A.6/A.7's new assertions + A.3's cache isolation test | ✅ Passed (24/24 after full Phase A + `tests/decision/policy.test.ts`/`tests/golden/algebra-only.test.ts` safety-net run) | ➖ Covered by A.3/A.6/A.7 | ✅ Clean — see Deviations |
| A.3 | `tests/cycle/latest.test.ts` (new) | Unit | N/A (new file) | ✅ Written — 6 scenarios (crypto->acciones isolation, acciones->crypto isolation, independent TTL, `getForAsset` hit both markets, `getForAsset` miss cross-market, `clear()` whole-map). Ran against unmodified `latest.ts`: 4/6 failed for the right reason (cache not yet market-keyed) | ✅ Passed — 6/6 after A.4 | ✅ 6 cases across isolation/TTL/getForAsset/clear — well beyond minimum 2 | ➖ None needed — implementation directly mirrors `src/narrative/cache.ts`'s established Map-per-key pattern |
| A.4 | `tests/cycle/latest.test.ts` | Unit | ✅ (A.3's RED run was the safety net) | ✅ (A.3) | ✅ 6/6 | ✅ (A.3) | ➖ None needed |
| A.5 | Exercised transitively by every Phase A test using the helper (no direct unit test in Phase A scope; consumers are Phase B+ API tests) | Unit (helper) | ✅ — helper only used by out-of-scope Phase B+ test files today | N/A — mechanical signature update matching A.1/A.4's new required fields | ✅ — compiles clean, no Phase A test regression | ➖ Skipped: purely structural default-param addition | ➖ None needed |
| A.6 | `tests/cycle/idempotency.test.ts` | Unit | ✅ 3/3 baseline | N/A — literal update only, required by A.2's `AssetKlines.market` | ✅ 3/3 passing after edit | ➖ Skipped: purely structural literal addition | ➖ None needed |
| A.7 | `tests/golden/paper-example.test.ts` | Unit | ✅ 2/2 baseline | N/A for literal update; ✅ Written for the new `decision.market`/`report.market` assertions (would fail against pre-A.2 code) | ✅ 2/2 passing, all existing golden numeric assertions unchanged | ➖ Single scenario (one fixture, one market) — no second market fixture exists in this golden test | ➖ None needed |

### Test Summary
- **Total tests written**: 6 new (`tests/cycle/latest.test.ts`) + 2 new assertions added to existing golden test
- **Total tests passing**: 24/24 in Phase A's owned scope (`tests/cycle/*`, `tests/golden/paper-example.test.ts`, `tests/golden/algebra-only.test.ts`, `tests/decision/policy.test.ts` safety net)
- **Layers used**: Unit (24)
- **Approval tests** (refactoring): None — no refactoring tasks; `src/cycle/latest.ts`/`src/decision/policy.ts` edits are new-behavior changes, not behavior-preserving refactors
- **Pure functions created**: 0 new (existing `runCycle`/`decideForAsset`/`decide` all remain pure; cache functions remain intentionally impure module-scope state, matching `src/narrative/cache.ts`'s established pattern)

## Deviations from Design

1. **`src/decision/policy.ts` touched, contradicting proposal/design.md's "L1-L4 stays fully asset-agnostic, zero changes needed" claim and Phase F task F.2's "zero diff vs. pre-PR1 baseline" check.** This is unavoidable, not optional: `Decision` (A.1) requires `market: Market` as a non-optional field, and `decide()` in `policy.ts` constructs and returns a full `Decision`-shaped object literal — so once `Decision.market` becomes required, `decide()`'s own return statement fails to typecheck regardless of any change to `DecisionContext` or call sites. I resolved this with the smallest possible touch: changed `decide()`'s return-type annotation from `Decision` to `Omit<Decision, 'market'>` (one line, doc-commented), leaving `DecisionContext`, `THETA`, `DELTA`, `score()`, and every line of decision logic byte-for-byte unchanged. `market` is attached one layer up, in `src/cycle/runCycle.ts`'s `decideForAsset`, via `{ ...decide(...), market }`. I initially tried the literal reading of task A.2 ("thread market through decideForAsset into the decide(...) call's context object", i.e. widening `DecisionContext` and setting `market: ctx.market` inside `decide()`'s return) — that also works and is arguably a more literal reading of A.2 — but it additionally breaks `tests/decision/policy.test.ts` (8 call sites) and `tests/golden/algebra-only.test.ts` (1 call site), neither of which design.md's Testing Strategy table lists as needing changes. The `Omit`-return approach avoids that unlisted blast radius entirely while still literally satisfying A.2's stated *outcome* ("so the resulting `Decision.market` is set"). **Flagging for `sdd-verify`/orchestrator**: confirm whether this satisfies the intent of F.2's zero-diff check (it is a 1-line, non-logic, type-signature-only diff) or whether F.2 needs updating to acknowledge this file must have *some* minimal diff given A.1's required-field design.
2. **`DecisionReport.market` derivation not specified anywhere in tasks.md A.1-A.8.** A.1 requires the field (type-level); A.2 never mentions how `runCycle` sets it. I derived it as `rawKlines[0]?.market ?? decisions[0]?.market ?? 'crypto'` (one push = one market, per D-A/D-C), with an untested/unreached fallback to `'crypto'` only for the degenerate `runCycle([])` case (no test or real caller exercises this — `app/api/cycle/route.ts` always passes >=1 asset). Flagging in case `sdd-verify` wants an explicit scenario for this edge case.

## Issues Found

None beyond the two deviations above, both of which are pre-existing gaps/tensions in tasks.md's own task descriptions (A.2 vs. F.2), not implementation mistakes.

## Remaining Tasks (Phase B onward — NOT started)

- [ ] Phase B: `POST /api/cycle` market discriminator + `GET /api/decisions` market-scoping (PR2)
- [ ] Phase C: narrative route market-scoping (PR3)
- [ ] Phase D: `BETA_MS` widening + dashboard wiring (PR4)
- [ ] Phase E: n8n workflow — Acciones branch via Twelve Data (PR5, manual-verification gate)
- [ ] Phase F: final full-suite verification (after PR1-PR5 merge)

## Workload / PR Boundary

- Mode: chained PR slice (`stacked-to-main`, per tasks.md's Delivery Route Recommendation)
- Current work unit: Unit 1 / PR1 (Phase A only)
- Boundary: starts from `src/domain/types.ts`'s `Market` type addition, ends at A.8's verify command. Touches exactly the 8 files listed in "Files Changed" above (matches tasks.md's Suggested Work Units rollback boundary for Unit 1, plus the necessary `src/decision/policy.ts` addition — see Deviation 1).
- Estimated review budget impact: within PR1's forecasted slice; small, self-contained diff (8 files, no downstream API/route/n8n changes)

## `npx tsc --noEmit` — Expected Downstream Errors (Phase B/C/D scope, NOT fixed in this PR)

Zero errors in any Phase A file. All remaining errors are exactly the callers of the signatures Phase A changed (`AssetKlines.market`, `cache.put`/`get`/`getForAsset`'s new `market` param, `Decision`/`DecisionReport`'s new required `market` field), confined to:

- `app/api/cycle/route.ts`
- `app/api/decisions/route.ts`
- `app/api/decisions/[asset]/narrative/route.ts`
- `tests/api/decisions.test.ts`
- `tests/api/decisions-invariance.test.ts`
- `tests/api/narrative.test.ts`
- `tests/dashboard/components/ArgumentGraph.test.ts`
- `tests/dashboard/components/DecisionCard.test.ts`
- `tests/dashboard/lib/scores.test.ts`
- `tests/dashboard/lib/select.test.ts`
- `tests/e2e/dashboard.spec.ts`
- `tests/e2e/market-nav.spec.ts`
- `tests/narrative/facts.test.ts`

`npx vitest run` (full suite, informational — vitest transpiles without typechecking) confirms this isolation at runtime too: only `tests/api/narrative.test.ts` (10 tests, all in the narrative route Phase C touches) actually fails at runtime; the other 235 tests across 40 files still pass despite the TS signature changes, because JS's loose positional-arg behavior happens not to break their specific code paths.

## Status (superseded by Phase B section below — kept for history)

8/8 Phase A tasks complete (A.1-A.8). 37 total tasks remain across Phases B-F. Ready for `sdd-verify` on Phase A's scope, or `sdd-apply` again for Phase B.

---

# Phase B of 6 — `POST /api/cycle` Market Discriminator + `GET /api/decisions` Market Scoping (PR2)

**Scope**: tasks B.1-B.9 only (tasks.md's own Phase B task list). Phase C
(narrative route market-scoping), Phase D (`BETA_MS` + dashboard wiring),
Phase E (n8n workflow), and Phase F (final full-suite verification) are
**NOT** started. Several files flagged in Phase A's "Expected Downstream
Errors" list (`app/api/decisions/[asset]/narrative/route.ts`,
`tests/api/narrative.test.ts`, `tests/dashboard/components/*.test.ts`,
`tests/dashboard/lib/*.test.ts`, `tests/e2e/*.spec.ts`,
`tests/narrative/facts.test.ts`) are **intentionally untouched** in this
batch — tasks.md's Phase B task list (B.1-B.9) does not assign them to
Phase B; they belong to Phase C/D per tasks.md's own phase boundaries, even
though a subset of them would only need a mechanical `market: 'crypto'`
literal added. Followed tasks.md's exact assignment rather than fixing them
opportunistically.

## Mode: Strict TDD

## Completed Tasks (Phase B, PR2)

- [x] B.1 `src/market/assets.ts`: added `export const ACCIONES_SYMBOL_PATTERN = /^[A-Z]{1,5}(\.[A-Z])?$/;`; `isWellFormedAsset` signature changed to `(market: Market, asset: string): boolean`, dispatching via `market === 'crypto' ? ASSET_SYMBOL_PATTERN : ACCIONES_SYMBOL_PATTERN`.
- [x] B.2 GREEN `src/market/binance.ts`: updated the lone call site to `isWellFormedAsset('crypto', asset)` (with a comment noting this adapter is crypto-only, per design.md D-C "Callers touched").
- [x] B.3 RED `tests/market/assets.test.ts`: updated every existing `isWellFormedAsset(...)` call to pass `'crypto'` first; added the full acciones truth table (`AAPL`/`BRK.B` accepted; `''`/`aapl`/`AAAAAA`/`AAP1`/`BRK.BB`/`BRK.`/`BRK.1` rejected) plus a cross-market rejection case (`BTCUSDT` rejected under `'acciones'`, `AAPL` rejected under `'crypto'`) and an `ACCIONES_SYMBOL_PATTERN` no-`/g`-flag check. Ran against unmodified `assets.ts`: 5/23 failed for the right reason (production not yet dispatching by market; `ACCIONES_SYMBOL_PATTERN` undefined).
- [x] B.4 GREEN: confirmed B.1-B.2 make B.3 pass — 23/23.
- [x] B.5 RED `tests/api/cycle.test.ts`: added `market: 'crypto'` to every existing payload literal; added scenarios — well-formed acciones symbol (`AAPL`) accepted, unknown `market` (`'forex'`) rejected 400, missing `market` field rejected 400, acciones symbol shaped like a crypto symbol (`BTCUSDT`) rejected 400, `MAX_ASSETS+1` (26) well-formed acciones symbols rejected 400 (cap applies independent of market). Ran against unmodified route: 4/17 failed for the right reason (all 200-expected happy-path cases got 400, because the pre-Phase-B route called `isWellFormedAsset(symbol)` with the old 1-arg call shape, which post-B.1 always resolves false for every real symbol).
- [x] B.6 GREEN `app/api/cycle/route.ts`: `parseCyclePayload` now validates `market` is `'crypto' | 'acciones'` first (400 `"market" must be "crypto" or "acciones"` otherwise, via a `VALID_MARKETS`/`isMarket` guard), passes `market` into `isWellFormedAsset(market, symbol)`, and attaches `market` onto each built `AssetKlines`; `POST` now calls `cache.put(report.market, report, BETA_MS)`.
- [x] B.7 RED `tests/api/decisions.test.ts` + `tests/api/decisions-invariance.test.ts`: updated every `GET()` call to pass a `Request` with `?market=crypto` (via a shared `makeGetRequest(market?)` helper); updated `seedCycleCache(...)` calls to pass the now-required `market` positional arg; added scenarios — missing `market` param 400, invalid `market` param (`'forex'`) 400, acciones-scoped read never returns a crypto decision (seeds both markets, reads `?market=acciones`, asserts no `BTCUSDT` in the response and `AAPL` is present). Ran against unmodified route: 4/6 (`decisions.test.ts`) failed for the right reason (route ignored the `Request` param entirely and called `cache.get()` with no market, always 503).
- [x] B.8 GREEN `app/api/decisions/route.ts`: `GET(request: Request)` now parses `new URL(request.url).searchParams.get('market')` via the same `VALID_MARKETS`/`isMarket` guard pattern as B.6, 400s (`"market" query param must be "crypto" or "acciones"`) on missing/invalid before any cache lookup, else `cache.get(market)`.
- [x] B.9 Verify GREEN: `npx vitest run tests/market/assets.test.ts tests/market/binance.test.ts tests/api/cycle.test.ts tests/api/decisions.test.ts tests/api/decisions-invariance.test.ts` — 57/57 pass. `npx tsc --noEmit` — zero errors in any Phase B file (`src/market/assets.ts`, `src/market/binance.ts`, `app/api/cycle/route.ts`, `app/api/decisions/route.ts`, `tests/market/assets.test.ts`, `tests/api/cycle.test.ts`, `tests/api/decisions.test.ts`, `tests/api/decisions-invariance.test.ts`); all remaining errors confined to Phase C/D downstream callers (listed below). Full `npx vitest run` (informational, no typecheck): 251/264 pass across 40/41 files — the only failing file is `tests/api/narrative.test.ts` (13 failures, Phase C's exact scope), matching Phase A's isolation note.

## Files Changed (Phase B)

| File | Action | What Was Done |
|------|--------|---------------|
| `src/market/assets.ts` | Modified | Added `ACCIONES_SYMBOL_PATTERN`; `isWellFormedAsset(market, asset)` dispatches per market |
| `src/market/binance.ts` | Modified | Call site updated to `isWellFormedAsset('crypto', asset)` |
| `app/api/cycle/route.ts` | Modified | `market` discriminator validated first (`isMarket` guard); threaded into `isWellFormedAsset`/`AssetKlines`/`cache.put` |
| `app/api/decisions/route.ts` | Modified | `GET(request: Request)` parses required `?market=` query param, 400s on missing/invalid, else `cache.get(market)` |
| `tests/market/assets.test.ts` | Modified | All calls updated to 2-arg signature; full acciones truth table + cross-market rejection added |
| `tests/api/cycle.test.ts` | Modified | All payload literals gained `market: 'crypto'`; 5 new scenarios (acciones accept, unknown/missing market reject, cross-market symbol reject, per-market MAX_ASSETS cap) |
| `tests/api/decisions.test.ts` | Modified | `GET()` calls now pass a `Request` with `?market=`; `seedCycleCache` calls pass `market`; 3 new scenarios (missing param, invalid param, acciones-scoped isolation) |
| `tests/api/decisions-invariance.test.ts` | Modified | `GET()` calls now pass a `Request` with `?market=crypto`; `seedCycleCache` call passes `market` |
| `openspec/changes/acciones-market-integration/tasks.md` | Modified | Marked B.1-B.9 `[x]` |

## TDD Cycle Evidence (Phase B)

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| B.1/B.3/B.4 | `tests/market/assets.test.ts` | Unit | ✅ 21/21 (baseline before edit) | ✅ Written — 23 total assertions incl. 9 new acciones-scoped cases; ran against unmodified `assets.ts`: 5/23 failed for the right reason | ✅ Passed — 23/23 after B.1 | ✅ 9 acciones cases (accept x2, reject x7) + 1 cross-market case — well beyond minimum 2 | ➖ None needed — dispatch is a one-line ternary, no duplication to extract |
| B.2 | `tests/market/binance.test.ts` (existing, safety net) | Unit | ✅ 9/9 (baseline; file itself needed no edit — internal call, not directly asserted) | N/A — mechanical call-site update, verified by B.9's full binance.test.ts run | ✅ 9/9 passing after edit | ➖ Skipped: single call site, no branching introduced | ➖ None needed |
| B.5/B.6 | `tests/api/cycle.test.ts` | Unit (route handler) | ✅ 13/13 (baseline before edit) | ✅ Written — 5 new scenarios; ran against unmodified route: 4/17 failed for the right reason (all previously-200 happy paths returned 400) | ✅ Passed — 17/17 after B.6 | ✅ acciones-accept + unknown-market-reject + missing-market-reject + cross-market-reject + per-market-MAX_ASSETS-reject — 5 distinct new code paths | ➖ None needed — `isMarket` guard is a single small helper, no duplication |
| B.7/B.8 | `tests/api/decisions.test.ts`, `tests/api/decisions-invariance.test.ts` | Unit (route handler) | ✅ 5/5 (3+2, baseline before edit) | ✅ Written — 3 new scenarios in `decisions.test.ts`; ran against unmodified route: 4/6 failed for the right reason (route ignored the `Request` param, always 503) | ✅ Passed — 6/6 + 2/2 after B.8 | ✅ missing-param + invalid-param + cross-market-isolation — 3 distinct new code paths, plus the existing hit/miss/expiry cases now market-scoped | ➖ None needed — reused the exact `isMarket`/`VALID_MARKETS` pattern from B.6, no new duplication |

### Test Summary (Phase B)

- **Total tests written**: 9 new (`tests/market/assets.test.ts` acciones truth table) + 5 new (`tests/api/cycle.test.ts`) + 3 new (`tests/api/decisions.test.ts`) = 17 new
- **Total tests passing**: 57/57 in Phase B's owned scope (`tests/market/assets.test.ts`, `tests/market/binance.test.ts`, `tests/api/cycle.test.ts`, `tests/api/decisions.test.ts`, `tests/api/decisions-invariance.test.ts`)
- **Layers used**: Unit (57)
- **Approval tests** (refactoring): None — no refactoring tasks; all edits are new-behavior changes
- **Pure functions created**: 1 (`isMarket`/`isWellFormedAsset`'s dispatch remains pure; the two `isMarket` guards in `app/api/cycle/route.ts` and `app/api/decisions/route.ts` are duplicated by design — each route file may only export HTTP handlers and fixed route-segment config fields, so a shared helper would need to live in a third module; deferred as a minor, non-blocking duplication, not extracted to keep this PR's diff minimal)

## Deviations from Design

None — Phase B matches design.md D-C/D-D exactly: `market` validated before per-symbol checks, `isWellFormedAsset(market, asset)` dispatch, `cache.put(market, report, BETA_MS)`, `GET /api/decisions` required `?market=` query param with 400 on missing/invalid.

One minor implementation-detail note (not a deviation from any documented decision): the `VALID_MARKETS`/`isMarket` guard is duplicated verbatim in both `app/api/cycle/route.ts` and `app/api/decisions/route.ts` rather than extracted to a shared helper, because Next.js route files may only export HTTP method handlers and route-segment config (the same constraint documented in `app/api/cycle/route.ts`'s existing file-level comment for why `MAX_ASSETS` lives in `src/cycle/constants.ts`). Extracting `isMarket` to `src/domain/types.ts` or a new small module is a reasonable Phase C/D/F cleanup candidate if `sdd-verify` flags it, but was left as-is here to keep this PR's diff minimal and scoped strictly to B.1-B.9.

## Issues Found

Two small bugs caught and fixed within my own new Phase B test code before it reached tsc-clean/GREEN (not production bugs — both were in `tests/api/cycle.test.ts` and `tests/api/decisions.test.ts`, caught by `tsc --noEmit`, part of B.9's verify step):
1. `tests/api/cycle.test.ts`'s new MAX_ASSETS-independent-per-market test indexed a string with `letters[i % letters.length]` under `noUncheckedIndexedAccess`, which types as `string | undefined`; changed to `letters.charAt(...)` (always returns `string`).
2. `tests/api/decisions.test.ts`'s new acciones-isolation test spread `buildReport().decisions[0]` (also `Decision | undefined` under `noUncheckedIndexedAccess`); changed to `buildDecision({ asset: 'AAPL', market: 'acciones' })`, the helper already designed for this exact purpose.

## Remaining Tasks (Phase C onward — NOT started)

- [ ] Phase C: narrative route market-scoping (PR3) — `app/api/decisions/[asset]/narrative/route.ts`, `tests/api/narrative.test.ts`
- [ ] Phase D: `BETA_MS` widening + dashboard wiring (PR4) — `src/cycle/constants.ts`, `app/(dashboard)/lib/markets.ts`, `app/(dashboard)/components/OverviewClient.tsx`, `app/dashboard/(with-footer)/crypto/page.tsx`, new `acciones/page.tsx`, `tests/unit/markets.test.ts`, `tests/dashboard/crypto/page.test.ts` (and, per the note at the top of this section, the mechanical `market: 'crypto'` literal fixes still owed to `tests/dashboard/components/ArgumentGraph.test.ts`, `tests/dashboard/components/DecisionCard.test.ts`, `tests/dashboard/lib/scores.test.ts`, `tests/dashboard/lib/select.test.ts`, `tests/e2e/dashboard.spec.ts`, `tests/e2e/market-nav.spec.ts`, `tests/narrative/facts.test.ts` — none of these appear in tasks.md's Phase B-D task lists explicitly, but they are all downstream of Phase A's `Decision`/`DecisionReport.market` field and MUST be resolved before `npx tsc --noEmit` is clean, so `sdd-verify`/the next `sdd-apply` batch should confirm which phase's task list is meant to own them if tasks.md itself doesn't say so by the time Phase D starts)
- [ ] Phase E: n8n workflow — Acciones branch via Twelve Data (PR5, manual-verification gate)
- [ ] Phase F: final full-suite verification (after PR1-PR5 merge)

## Workload / PR Boundary (Phase B)

- Mode: chained PR slice (`stacked-to-main`, per tasks.md's Delivery Route Recommendation)
- Current work unit: Unit 2 / PR2 (Phase B only)
- Boundary: starts from `src/market/assets.ts`'s `ACCIONES_SYMBOL_PATTERN`/dispatch addition, ends at B.9's verify command. Touches exactly the 8 files listed in "Files Changed (Phase B)" above plus `tasks.md` — matches tasks.md's Suggested Work Unit 2 rollback boundary exactly (`src/market/assets.ts`, `src/market/binance.ts`, `app/api/cycle/route.ts`, `app/api/decisions/route.ts` + their test files).
- Estimated review budget impact: within PR2's forecasted slice; self-contained diff, no Phase C/D/E files touched

## `npx tsc --noEmit` — Still-Expected Downstream Errors (Phase C/D scope, NOT fixed in this PR)

Zero errors in any Phase A or Phase B file. All remaining errors are exactly the callers of `Decision`/`DecisionReport`'s `market` field and `isWellFormedAsset`/`cache.getForAsset`'s changed signatures that Phase C/D own:

- `app/api/decisions/[asset]/narrative/route.ts` (Phase C — C.2)
- `tests/api/narrative.test.ts` (Phase C — C.1)
- `tests/dashboard/components/ArgumentGraph.test.ts` (not explicitly listed in any Phase B-D task; mechanical `market` literal fix, needs an owning task before `tsc --noEmit` is fully clean)
- `tests/dashboard/components/DecisionCard.test.ts` (same as above)
- `tests/dashboard/lib/scores.test.ts` (same as above)
- `tests/dashboard/lib/select.test.ts` (same as above)
- `tests/e2e/dashboard.spec.ts` (same as above)
- `tests/e2e/market-nav.spec.ts` (same as above)
- `tests/narrative/facts.test.ts` (same as above)

**Resolved in this PR** (no longer in the error list): `app/api/cycle/route.ts`, `app/api/decisions/route.ts`, `tests/api/decisions.test.ts`, `tests/api/decisions-invariance.test.ts`.

## Status

**Phase A**: 8/8 tasks complete (A.1-A.8).
**Phase B**: 9/9 tasks complete (B.1-B.9). 57/57 focused tests pass; `tsc --noEmit` zero errors in Phase A+B files.
**Cumulative (superseded by Phase C section below — kept for history)**: 17/46 total tasks complete across Phases A-F. Ready for `sdd-verify` on Phase A+B's scope, or `sdd-apply` again for Phase C.

---

# Phase C of 6 — Narrative Route Market-Scoping (PR3)

**Scope**: tasks C.1-C.3 only (tasks.md's own Phase C task list). Phase D
(`BETA_MS` widening + dashboard wiring), Phase E (n8n workflow), and
Phase F (final full-suite verification) are **NOT** started. The mechanical
`market: 'crypto'` literal fixes still owed to
`tests/dashboard/components/ArgumentGraph.test.ts`,
`tests/dashboard/components/DecisionCard.test.ts`,
`tests/dashboard/lib/scores.test.ts`, `tests/dashboard/lib/select.test.ts`,
`tests/e2e/dashboard.spec.ts`, `tests/e2e/market-nav.spec.ts` are
**intentionally untouched** — they remain Phase D's scope per Phase B's
apply-progress note (`tests/narrative/facts.test.ts` turned out to already
carry `market: 'crypto'` and needed no fix — verified clean under this
phase's `tsc --noEmit` run).

## Mode: Strict TDD

## Completed Tasks (Phase C, PR3)

- [x] C.1 RED `tests/api/narrative.test.ts`: updated every existing `GET` call to route through a `market`-aware `makeRequest()` (default URL now carries `?market=crypto`); updated `buildDecision`/`buildReport`/`primeReport` to the shared `market: Market = 'crypto'` shape Phase A/B established (this file's own fixtures were still on the pre-Phase-A shape — `Decision`/`DecisionReport` had no `market` field, `seedCycleCache` was called with the old 2-arg `(report, ttlMs)` signature); appended a new "market scoping (decision-narrative spec delta)" `describe` block with 5 new scenarios — missing `market` query param 400 (`BAD_MARKET`, using the spec's own "AAPL, no market" GIVEN), invalid `market` value 400 (`BAD_MARKET`), malformed acciones symbol 400 (`BAD_ASSET`, proving per-declared-market dispatch), a full acciones happy-path stream (proving `getForAsset('acciones', ...)` actually resolves, not just rejects), and the "symbol well-formed for one market never resolves through another market's cache" scenario (seeds only the acciones cache for AAPL, requests `?market=crypto`, asserts 400 `BAD_ASSET` — the acciones decision never leaks). Ran against the unmodified route: 16/20 failed for the right reason (route still called `isWellFormedAsset(asset)`/`cycleCache.getForAsset(asset)` with the stale 1-arg shape, so `market` positionally received the asset string and `asset` was `undefined`, making almost every request 400 `BAD_ASSET` regardless of intent).
- [x] C.2 GREEN `app/api/decisions/[asset]/narrative/route.ts`: added `BAD_MARKET` to the route's `ErrorCode` union; added the same `VALID_MARKETS`/`isMarket` guard pattern Phase B established in `app/api/cycle/route.ts`/`app/api/decisions/route.ts` (duplicated per the same documented Next.js route-file-export constraint, not extracted); `GET` now parses `market` from `new URL(request.url).searchParams.get('market')` and 400s (`BAD_MARKET`) before any other check, including the `[asset]` path segment's own format validation; `isWellFormedAsset(market, asset)` and `cycleCache.getForAsset(market, asset)` now receive the two-arg market-scoped signatures Phase A/B established; updated the file's own T-4 doc comment — it no longer claims to "ignore the request body and query string entirely," since `market` is now a required, functionally-used query parameter (every *other* query parameter is still ignored, which is what T-4's crafted-query-string test actually verifies).
- [x] C.3 Verify GREEN: `npx vitest run tests/api/narrative.test.ts` — 20/20 pass. `npx tsc --noEmit` — **zero errors in the narrative route or its test file** (and zero errors in any Phase A/B file, confirmed still clean). All remaining repo-wide `tsc` errors are confined to Phase D's dashboard-wiring scope: `tests/dashboard/components/ArgumentGraph.test.ts`, `tests/dashboard/components/DecisionCard.test.ts`, `tests/dashboard/lib/scores.test.ts`, `tests/dashboard/lib/select.test.ts`, `tests/e2e/dashboard.spec.ts`, `tests/e2e/market-nav.spec.ts` — all missing the `market` field on ad-hoc `Decision`/`DecisionReport` literals, exactly the "mechanical literal fix" set flagged (but not owned) at the end of Phase B. Full `npx vitest run` (informational, no typecheck): 269/269 pass across all 41 files — zero regressions anywhere in the suite.

## Files Changed (Phase C)

| File | Action | What Was Done |
|------|--------|---------------|
| `app/api/decisions/[asset]/narrative/route.ts` | Modified | Added `BAD_MARKET` error code + `VALID_MARKETS`/`isMarket` guard; `GET` requires `?market=`, 400s before any other validation; `isWellFormedAsset(market, asset)`/`cycleCache.getForAsset(market, asset)` two-arg calls; T-4 doc comment updated |
| `tests/api/narrative.test.ts` | Modified | `makeRequest()` defaults to `?market=crypto`; `buildDecision`/`buildReport`/`primeReport` updated to the shared `market`-aware shape; malformed-symbol/never-pushed test URLs gained `?market=crypto`; crafted-query-string test gained `&market=crypto`; new "market scoping" `describe` block with 5 new scenarios (missing param, invalid param, malformed acciones symbol, acciones happy path, cross-market cache isolation) |
| `openspec/changes/acciones-market-integration/tasks.md` | Modified | Marked C.1-C.3 `[x]` |

## TDD Cycle Evidence (Phase C)

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| C.1/C.2 | `tests/api/narrative.test.ts` | Unit (route handler) | ✅ N/A — file did not compile/pass under the pre-Phase-C fixture shape before this batch (Decision/DecisionReport `market` field + `seedCycleCache`'s 3-arg signature); this batch's own RED run (below) is the baseline | ✅ Written — 5 new scenarios + every pre-existing test's URL/fixture updated; ran against unmodified route: 16/20 failed for the right reason (stale 1-arg `isWellFormedAsset`/`getForAsset` calls made `market` silently receive the asset string) | ✅ Passed — 20/20 after C.2 | ✅ 5 distinct new code paths (missing param, invalid param, malformed-acciones-reject, acciones-accept, cross-market-isolation) — well beyond minimum 2, and specifically exercises BOTH branches of `isWellFormedAsset`'s market dispatch (crypto reject already covered by the pre-existing malformed test, acciones reject + accept both new) | ➖ None needed — `isMarket`/`VALID_MARKETS` guard is a verbatim reuse of Phase B's established one-line pattern, no duplication introduced beyond the already-accepted per-route-file duplication documented in Phase B |

### Test Summary (Phase C)

- **Total tests written**: 5 new (`tests/api/narrative.test.ts` "market scoping" describe block)
- **Total tests passing**: 20/20 in Phase C's owned scope (`tests/api/narrative.test.ts`)
- **Layers used**: Unit (20)
- **Approval tests** (refactoring): None — no refactoring tasks; all edits are new-behavior changes
- **Pure functions created**: 0 new (`isMarket` is a straight copy of Phase B's established guard shape, not a new abstraction)

## Deviations from Design

1. **Added a new `BAD_MARKET` error code**, not explicitly specified in design.md D-E or tasks.md C.2. Design.md D-E says only "same `?market=` query param as D-D... Validate, then...", and D-D's route (`GET /api/decisions`) returns a plain `{ error }` body with no `code` field on its 400. The narrative route, unlike `GET /api/decisions`, already has an established `ErrorCode`-tagged `jsonError(status, code, message)` convention for every other 400/404/409/429/5xx it returns (`BAD_ASSET`, `NO_DECISION`, etc.) — leaving the new market-validation 400 as a bare untagged error would have been the only response on this route without a `code`, breaking that file's own internal consistency and its test suite's existing `expect(body.code).toBe(...)` pattern. Adding `BAD_MARKET` to the `ErrorCode` union and using the existing `jsonError` helper was the smaller, more consistent choice. Flagging for `sdd-verify`: confirm this is acceptable, since it's an addition beyond what D-E/C.2 literally specify (though it does not change `GET /api/decisions`' own D-D-specified untagged-error shape, which is left untouched).
2. **Added an "invalid market value" test/behavior** (`?market=forex` → 400) beyond the 3 scenarios tasks.md C.1 lists by name (missing param, malformed-per-market, cross-market-isolation). Design.md D-E explicitly says "same `?market=` query param as D-D," and D-D's own implementation (`app/api/decisions/route.ts`, Phase B) 400s on both missing AND invalid values via the same `isMarket` guard — so an invalid-value 400 is a direct, already-precedented consequence of "same mechanism as D-D," not a freelanced addition. Implemented for consistency with the existing `GET /api/decisions` behavior; not calling this a deviation from intent, just flagging it was not one of the 3 explicitly-named scenarios.
3. **Added an "acciones happy path" test** (full stream, 200, `getForAsset('acciones', ...)` resolving) beyond the 3 named scenarios. This is decision-narrative spec's own "Valid acciones asset streams narrative" scenario (spec.md, not just tasks.md's narrower summary), and without it the acciones branch of `isWellFormedAsset`/`getForAsset` would only ever be exercised via rejection paths (malformed-symbol-reject, cross-market-reject) — never proven to actually resolve correctly. Added to satisfy Strict TDD's triangulation requirement (real GREEN, not just a rejection-only fake-it) and to close a spec scenario the task summary didn't explicitly call out but the underlying `decision-narrative` spec delta does.

## Issues Found

None. No regressions: full `npx vitest run` (all 41 files, 269 tests) passes with zero failures after this batch's changes, and `tsc --noEmit` shows zero new errors introduced by Phase C — the error set shrank by exactly the 2 files (`app/api/decisions/[asset]/narrative/route.ts`, `tests/api/narrative.test.ts`) this phase owned, per Phase B's own "still-expected downstream errors" list.

## Remaining Tasks (Phase D onward — NOT started)

- [ ] Phase D: `BETA_MS` widening + dashboard wiring (PR4) — `src/cycle/constants.ts`, `app/(dashboard)/lib/markets.ts`, `app/(dashboard)/components/OverviewClient.tsx`, `app/dashboard/(with-footer)/crypto/page.tsx`, new `acciones/page.tsx`, `tests/unit/markets.test.ts`, `tests/dashboard/crypto/page.test.ts` (plus the still-owed mechanical `market: 'crypto'` literal fixes to `tests/dashboard/components/ArgumentGraph.test.ts`, `tests/dashboard/components/DecisionCard.test.ts`, `tests/dashboard/lib/scores.test.ts`, `tests/dashboard/lib/select.test.ts`, `tests/e2e/dashboard.spec.ts`, `tests/e2e/market-nav.spec.ts` — confirmed by this phase's `tsc --noEmit` run as the complete remaining error set, all attributable to Phase D)
- [ ] Phase E: n8n workflow — Acciones branch via Twelve Data (PR5, manual-verification gate)
- [ ] Phase F: final full-suite verification (after PR1-PR5 merge)

## Workload / PR Boundary (Phase C)

- Mode: chained PR slice (`stacked-to-main`, per tasks.md's Delivery Route Recommendation)
- Current work unit: Unit 3 / PR3 (Phase C only)
- Boundary: starts from `tests/api/narrative.test.ts`'s fixture/query-param updates, ends at C.3's verify command. Touches exactly the 2 files listed in "Files Changed (Phase C)" above plus `tasks.md` — matches tasks.md's Suggested Work Unit 3 rollback boundary exactly (`app/api/decisions/[asset]/narrative/route.ts` + `tests/api/narrative.test.ts`, independent of PR4/PR5).
- Estimated review budget impact: within PR3's forecasted slice; small, self-contained diff (2 files + tasks.md), no Phase D/E files touched

## `npx tsc --noEmit` — Still-Expected Downstream Errors (Phase D scope, NOT fixed in this PR)

Zero errors in any Phase A, Phase B, or Phase C file. All remaining errors are exactly the ad-hoc `Decision`/`DecisionReport` object literals across Phase D's owned test files, still missing the `market` field:

- `tests/dashboard/components/ArgumentGraph.test.ts`
- `tests/dashboard/components/DecisionCard.test.ts`
- `tests/dashboard/lib/scores.test.ts`
- `tests/dashboard/lib/select.test.ts`
- `tests/e2e/dashboard.spec.ts`
- `tests/e2e/market-nav.spec.ts`

**Resolved in this PR** (no longer in the error list): `app/api/decisions/[asset]/narrative/route.ts`, `tests/api/narrative.test.ts`. **Also no longer in the list, confirmed already-clean** (was flagged uncertain in Phase B's apply-progress): `tests/narrative/facts.test.ts` — it already carried `market: 'crypto'` on its fixture.

## Status

**Phase A**: 8/8 tasks complete (A.1-A.8).
**Phase B**: 9/9 tasks complete (B.1-B.9).
**Phase C**: 3/3 tasks complete (C.1-C.3). 20/20 focused tests pass; full suite 269/269 pass; `tsc --noEmit` zero errors in Phase A+B+C files — narrative route and its test are the LAST TS-compile-blocking files outside Phase D's dashboard/e2e scope.
**Cumulative**: 20/46 total tasks complete across Phases A-F. Ready for `sdd-verify` on Phase A+B+C's scope, or `sdd-apply` again for Phase D.
