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
**Cumulative (superseded by Phase D section below — kept for history)**: 20/46 total tasks complete across Phases A-F. Ready for `sdd-verify` on Phase A+B+C's scope, or `sdd-apply` again for Phase D.

---

# Phase D of 6 — `BETA_MS` Widening + Dashboard Wiring (PR4)

**Scope**: tasks D.1-D.9 only (tasks.md's own Phase D task list), plus the
mechanical `market: 'crypto'` literal fixes to the 6 files Phase B/C's
apply-progress explicitly flagged as owed to this phase
(`tests/dashboard/components/ArgumentGraph.test.ts`,
`tests/dashboard/components/DecisionCard.test.ts`,
`tests/dashboard/lib/scores.test.ts`, `tests/dashboard/lib/select.test.ts`,
`tests/e2e/dashboard.spec.ts`, `tests/e2e/market-nav.spec.ts`) — required for
D.9's own verify command (`npx tsc --noEmit` + the two `npx playwright test`
targets) to actually pass, even though tasks.md's D.1-D.9 prose does not name
every one of these 6 files individually. Phase E (n8n workflow) and Phase F
(final full-suite verification) are **NOT** started.

## Mode: Strict TDD

## Completed Tasks (Phase D, PR4)

- [x] D.1 `src/cycle/constants.ts`: `BETA_MS = 5 * 24 * 60 * 60 * 1000` (5 days = 120h); replaced the 8h/6h-cadence-derivation comment with design.md D-F's 120h/96h weekend-gap-plus-margin formula (crypto's daily EOD gap ~24h; acciones' longest normal gap is a 4-day holiday long weekend ~96h; 120h clears that with a 24h/~25% margin, also absorbing one missed 6h cron tick post-holiday).
- [x] D.2 Verified `tests/narrative/cache.test.ts` needs no edit — ran it standalone against the widened `BETA_MS`: 8/8 pass unchanged, confirming every assertion is parametrized on the imported `BETA_MS` symbol, not a hardcoded duration (verify-only task, exactly as tasks.md predicted).
- [x] D.3 GREEN `app/(dashboard)/lib/markets.ts:33`: flipped `MARKETS.acciones.isReal` from `false` to `true`; updated the `Market.isReal` field's doc comment (was "True only for `crypto`", now names both real markets).
- [x] D.4 GREEN `tests/unit/markets.test.ts`: rewrote the "marks crypto as the only real market" assertion to "marks crypto and acciones as the only real markets; every other slug stays false" — asserts both `isReal: true`, and every other slug (excluding both) still `false`.
- [x] D.5 GREEN `app/(dashboard)/components/OverviewClient.tsx`: added a required `market: Market` prop (imported `Market` from `@/src/domain/types`); threaded it into `` fetch(`/api/decisions?market=${market}`) ``; added `market` to the polling `useEffect`'s dependency array (was `[]`) so a market change would correctly restart the poll loop, even though no caller currently remounts `OverviewClient` with a different `market` at runtime.
- [x] D.6 GREEN `app/dashboard/(with-footer)/crypto/page.tsx`: `<OverviewClient />` -> `<OverviewClient market="crypto" />`.
- [x] D.7 Created `app/dashboard/(with-footer)/acciones/page.tsx`: mechanical clone of `crypto/page.tsx` — `MARKETS.acciones` (with the same `noUncheckedIndexedAccess` defensive-guard pattern), `<OverviewClient market="acciones" />`, identical `<main>`/`DashboardHeader` chrome and doc-comment conventions. No RED test written for this file per design.md's Testing Strategy ("mechanical clone, no branching logic") — verified GREEN via D.9's full suite run instead (both the direct-render `tests/dashboard/crypto/page.test.ts` pattern and the new e2e "Acciones route hosts its own real dashboard" scenario, see D.9 below, transitively exercise the sibling file's identical code shape).
- [x] D.8 GREEN `tests/dashboard/crypto/page.test.ts`: added a `vi.mock('@/app/(dashboard)/components/OverviewClient', ...)` stub (mirroring the file's existing `vi.mock('@/app/(dashboard)/lib/markets', ...)` convention) that renders the received `market` prop directly into a `data-testid="overview-client-market"` div, then a new test asserting `CryptoDashboardPage()`'s SSR output contains that div with `crypto` as its text content — proves `market="crypto"` is actually passed, not just that the page renders.
- [x] D.9 Verify GREEN — full command chain, run in this exact order:
  1. `npx vitest run tests/unit/markets.test.ts tests/dashboard tests/narrative/cache.test.ts` — 58/58 pass (11 files).
  2. `npx tsc --noEmit` (full repo) — **zero errors anywhere**, confirmed clean after also fixing the 6 orphaned files below.
  3. `npx playwright test tests/e2e/dashboard.spec.ts tests/e2e/market-nav.spec.ts` — **52/52 pass**, after two additional required fixes (see "Additional fixes required for D.9" below).
  4. Full-repo re-verification (beyond D.9's literal scope, done to confirm the "first fully green non-n8n suite" claim): `npx vitest run` — **270/270 pass across 41 files**; `npx tsc --noEmit` re-run clean; both e2e files re-run clean.

## Additional fixes required for D.9 (beyond tasks.md's literal D.1-D.9 text)

1. **Mechanical `market: 'crypto'` literal additions** to the 6 files Phase B/C's apply-progress explicitly flagged as "owed to Phase D" (confirmed by this phase's own `tsc --noEmit` baseline run, which reproduced exactly this error set and no others before any Phase D edit):
   - `tests/dashboard/components/ArgumentGraph.test.ts` — `decisionFixture()`'s `Decision` literal.
   - `tests/dashboard/components/DecisionCard.test.ts` — `decisionFixture()`'s `Decision` literal.
   - `tests/dashboard/lib/scores.test.ts` — `decisionFixture()`'s `Decision` literal.
   - `tests/dashboard/lib/select.test.ts` — `decisionFixture()`'s `Decision` literal AND `reportFixture()`'s `DecisionReport` literal.
   - `tests/e2e/dashboard.spec.ts` — `BTC_DECISION`, `ETH_DECISION`, `SOL_NO_RECOMMENDATION` (`Decision`), `MULTI_ASSET_REPORT`, `ALL_NO_RECOMMENDATION_REPORT`, `EMPTY_REPORT`, `buyOnlyReport` (`DecisionReport`) — 7 literals total.
   - `tests/e2e/market-nav.spec.ts` — `EMPTY_REPORT`, `directionFixture()`'s `Decision` literal, `DIRECTION_FILTER_REPORT` — 3 literals total.
   All fixed with the minimal `market: 'crypto'` addition, matching the pattern Phase A/B/C already established elsewhere (`tests/cycle/idempotency.test.ts`, `tests/golden/paper-example.test.ts`) — these are all crypto-context fixtures, no behavior change.
2. **Two e2e route-stub glob-pattern fixes — a genuine bugfix, not a mechanical literal addition.** `OverviewClient`'s D.5 change appends `?market=` to its `GET /api/decisions` fetch. Both e2e files' `stubDecisions`/`stubDecisionsUnavailable` helpers used `page.route('**/api/decisions', ...)` (no trailing wildcard) — Playwright's glob matching requires the pattern to match the full request URL including the query string, so once the fetch carried `?market=crypto`, the stub silently stopped intercepting and every card-grid assertion in `tests/e2e/dashboard.spec.ts` started failing with `element(s) not found` (confirmed by an isolated `-g "renders a card for every asset"` run against the pre-fix pattern: real failure, not a flake). Fixed by widening the pattern to `'**/api/decisions?**'` in `tests/e2e/dashboard.spec.ts` (both `stubDecisions` and `stubDecisionsUnavailable`) and `tests/e2e/market-nav.spec.ts` (`stubDecisions`); re-ran the same isolated test after the fix to confirm it now passes, then the full 52-test run.
3. **One e2e test rewritten for spec-mandated new behavior, not a mechanical fix.** `tests/e2e/market-nav.spec.ts`'s "clicking Acciones navigates to /dashboard/acciones and renders the placeholder" test directly contradicted `specs/market-navigation/spec.md`'s new "Acciones route hosts its own real dashboard" requirement (D.3's `isReal` flip + D.7's new static route mean `/dashboard/acciones` now resolves to the real Tier 1 overview via Next.js's static-over-dynamic route precedence, the same mechanism `crypto/page.tsx` already relies on — confirmed failing at runtime, not compile time, when run unmodified: `market-placeholder` testid timed out with "element(s) not found"). Rewrote the test to assert the new mandated behavior instead — `market-placeholder` has zero count, `<main>` contains "Acciones", and `direction-filter-ALL` (only present in the real `OverviewClient` shell) is visible — following the spec delta's own "Acciones route hosts its own real dashboard" scenario text almost verbatim. The remaining placeholder-behavior scenarios in the same `describe` block (CTA-free, static-route-precedence, 404-on-unknown-slug, determinism-disclaimer) already used Forex as their example market (per `specs/market-navigation/spec.md`'s own "Remaining non-real markets still render the placeholder" scenario, which explicitly names Forex) and needed no change.

## Files Changed (Phase D)

| File | Action | What Was Done |
|------|--------|---------------|
| `src/cycle/constants.ts` | Modified | `BETA_MS` widened to 5 days (120h); derivation comment replaced per design.md D-F |
| `app/(dashboard)/lib/markets.ts` | Modified | `MARKETS.acciones.isReal` -> `true`; `Market.isReal` doc comment updated |
| `tests/unit/markets.test.ts` | Modified | "only crypto is real" assertion widened to accept acciones too |
| `app/(dashboard)/components/OverviewClient.tsx` | Modified | Required `market: Market` prop; threaded into fetch URL + effect deps |
| `app/dashboard/(with-footer)/crypto/page.tsx` | Modified | Passes `market="crypto"` to `<OverviewClient />` |
| `app/dashboard/(with-footer)/acciones/page.tsx` | Created | Mechanical clone of `crypto/page.tsx` — `MARKETS.acciones`, `market="acciones"` |
| `tests/dashboard/crypto/page.test.ts` | Modified | New `vi.mock`'d `OverviewClient` + test asserting `market="crypto"` is passed |
| `tests/dashboard/components/ArgumentGraph.test.ts` | Modified | `market: 'crypto'` added to `Decision` fixture (mechanical, owed from Phase B/C) |
| `tests/dashboard/components/DecisionCard.test.ts` | Modified | `market: 'crypto'` added to `Decision` fixture (mechanical, owed from Phase B/C) |
| `tests/dashboard/lib/scores.test.ts` | Modified | `market: 'crypto'` added to `Decision` fixture (mechanical, owed from Phase B/C) |
| `tests/dashboard/lib/select.test.ts` | Modified | `market: 'crypto'` added to `Decision`/`DecisionReport` fixtures (mechanical, owed from Phase B/C) |
| `tests/e2e/dashboard.spec.ts` | Modified | `market: 'crypto'` added to 7 `Decision`/`DecisionReport` fixtures (mechanical); `stubDecisions`/`stubDecisionsUnavailable` glob pattern fixed to `'**/api/decisions?**'` (genuine bugfix) |
| `tests/e2e/market-nav.spec.ts` | Modified | `market: 'crypto'` added to 3 `Decision`/`DecisionReport` fixtures (mechanical); `stubDecisions` glob pattern fixed to `'**/api/decisions?**'` (genuine bugfix); "clicking Acciones" placeholder test rewritten for the new real-dashboard behavior (spec-mandated) |
| `openspec/changes/acciones-market-integration/tasks.md` | Modified | Marked D.1-D.9 `[x]`, with a note on the additional required fixes |

## TDD Cycle Evidence (Phase D)

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| D.1 | N/A (constant-only) | N/A | N/A | ➖ Structural (constant value + comment, no branching) — Triangulation skipped: no dedicated test asserts `BETA_MS`'s exact numeric value; every consumer test is parametrized on the symbol | ➖ | ➖ Skipped: purely structural | ➖ None needed |
| D.2 | `tests/narrative/cache.test.ts` | Unit | ✅ 8/8 (baseline before D.1) | N/A — regression-only task, no edit made | ✅ 8/8 unchanged after D.1 | ➖ N/A | ➖ None needed |
| D.3/D.4 | `tests/unit/markets.test.ts` | Unit | ✅ 6/6 (baseline before edit) | ✅ Written — widened assertion; ran against unmodified `markets.ts`: 1/6 failed for the right reason (`MARKETS.acciones?.isReal` was `false`, expected `true`) | ✅ Passed — 6/6 after D.3 | ➖ Single scenario — one boolean flip, no second market/state to triangulate against beyond the existing "every other slug still false" loop (already exercises N-1 other cases) | ➖ None needed |
| D.5/D.6/D.8 | `tests/dashboard/crypto/page.test.ts` | Unit (SSR component) | ✅ 1/1 (baseline before edit) | ✅ Written — new `vi.mock`'d `OverviewClient` + assertion test; ran against unmodified `OverviewClient.tsx`/`crypto/page.tsx`: failed for the right reason (`<OverviewClient />` called with no `market` prop, mocked stub rendered an empty div, `>crypto<` not found in output) | ✅ Passed — 2/2 after D.5+D.6 | ➖ Single scenario — one page, one market literal; `acciones/page.tsx`'s identical shape is covered transitively (D.7's own note) and by D.9's e2e "Acciones route hosts its own real dashboard" scenario, not a second unit-test case here | ➖ None needed — `market` dependency-array addition is the only refinement, verified still-green |
| D.7 | N/A (no dedicated unit test, per design.md) | N/A | N/A (new file) | ➖ N/A — design.md's Testing Strategy explicitly classifies this as GREEN-only ("mechanical clone, no branching logic") | ✅ Verified via D.9's full suite (`tests/dashboard/crypto/page.test.ts`'s pattern applies identically; e2e "Acciones route hosts its own real dashboard" scenario exercises the live route) | ➖ N/A | ➖ None needed |
| D.9 (mechanical fixture fixes) | 6 files (see "Additional fixes" above) | Unit + E2E | ✅ (each file's pre-edit state was a `tsc` compile error, not a runtime failure — vitest transpiles without typechecking, so all 6 files' tests were already passing at the *runtime* layer before this fix; the fix closes the *type* layer) | N/A — mechanical literal additions, not new behavior | ✅ All 6 files pass after the fix (confirmed via full `npx vitest run` + `npx playwright test`) | ➖ Skipped: purely structural literal additions, no branching | ➖ None needed |
| D.9 (e2e route-stub pattern fix) | `tests/e2e/dashboard.spec.ts`, `tests/e2e/market-nav.spec.ts` | E2E | ✅ N/A — this is itself the regression this batch introduced via D.5, caught by this batch's own D.9 verify step | ✅ Implicit — isolated `-g "renders a card for every asset"` run against the unfixed glob pattern failed for the right reason (`element(s) not found`, stub not intercepting) | ✅ Same isolated test passes after the `'**/api/decisions?**'` fix; then full 52-test suite passes | ➖ N/A — one root cause, one fix, verified across both files | ➖ None needed |
| D.9 (acciones-placeholder e2e rewrite) | `tests/e2e/market-nav.spec.ts` | E2E | ✅ N/A — old test ran and failed for the right reason against the new D.3/D.7 code (`market-placeholder` timed out, real dashboard rendered instead) before the rewrite | ✅ Confirmed old assertion fails against new code (proves the behavior genuinely changed, not a flake) | ✅ Rewritten test passes — `market-placeholder` count 0, `<main>` contains "Acciones", `direction-filter-ALL` visible | ➖ N/A — one scenario per spec delta's own scenario text | ➖ None needed |

### Test Summary (Phase D)

- **Total tests written/modified**: 1 new (`tests/unit/markets.test.ts`, widened) + 1 new (`tests/dashboard/crypto/page.test.ts`) + 10 mechanical fixture literal fixes (6 files) + 2 e2e helper glob-pattern fixes + 1 e2e test rewrite = 15 total touch points
- **Total tests passing**: 58/58 in D.9's own focused vitest scope; 270/270 in the full repo vitest suite (41 files); 52/52 in the full e2e suite (both `tests/e2e/*.spec.ts` files — the repo's entire e2e test surface)
- **Layers used**: Unit (58 focused / 270 full-repo), E2E (52)
- **Approval tests** (refactoring): None — no refactoring tasks; all edits are new-behavior changes or mechanical fixture fixes
- **Pure functions created**: 0 new (`OverviewClient`'s fetch-URL templating is inline, not extracted to a separate pure function — consistent with the file's existing style, no duplication to justify extraction)

## Deviations from Design

1. **Two e2e route-stub glob-pattern fixes and one e2e test rewrite, none named in tasks.md's D.1-D.9 text.** Both are direct, unavoidable consequences of D.5 (`?market=` query string) and D.3+D.7 (acciones going real) respectively — not scope creep, but the exact "verify D.9 passes" requirement tasks.md's own D.9 line states. Documented in detail under "Additional fixes required for D.9" above; flagging here per this skill's "note any deviations, don't silently deviate" rule.
2. **`market` added to `OverviewClient`'s polling `useEffect` dependency array** (was `[]`), not explicitly specified in design.md D-D. This is the technically-correct React behavior for a value now read inside the effect (avoids a stale-closure bug if any future caller ever remounts `OverviewClient` with a changed `market` prop without a full page navigation) — no current caller exercises this (both `crypto/page.tsx` and `acciones/page.tsx` pass a `market` that never changes for the lifetime of the mount), so this is defensive correctness, not a behavior change either test suite can currently observe.

## Issues Found

None beyond the two consequences of D.5/D.3+D.7 documented above (both fixed within this same batch, not deferred).

## Remaining Tasks (Phase E onward — NOT started)

- [ ] Phase E: n8n workflow — Acciones branch via Twelve Data (PR5, manual-verification gate) — `n8n/faf-workflow.json`, `n8n/POST_IMPORT_STEPS.md`
- [ ] Phase F: final full-suite verification (after PR1-PR5 merge)

## Workload / PR Boundary (Phase D)

- Mode: chained PR slice (`stacked-to-main`, per tasks.md's Delivery Route Recommendation)
- Current work unit: Unit 4 / PR4 (Phase D only)
- Boundary: starts from `src/cycle/constants.ts`'s `BETA_MS` widening, ends at D.9's verify command. Touches the 7 files tasks.md's Suggested Work Unit 4 rollback boundary names, plus the 6 orphaned test files Phase B/C's apply-progress explicitly flagged as owed to this phase, plus `tasks.md` — no Phase E (`n8n/`) files touched.
- Estimated review budget impact: within PR4's forecasted slice; larger than PR1-PR3 due to the 6 owed mechanical fixture fixes + 2 e2e bugfixes + 1 e2e rewrite, all directly required for D.9's own verify command, not optional additions

## `npx tsc --noEmit` — Full Repo Status After Phase D

**Zero errors anywhere in the repository.** This is the first phase where the complete non-n8n TypeScript surface compiles clean — Phase A/B/C each left a documented, shrinking set of downstream-caller errors (see their own apply-progress sections' "Still-Expected Downstream Errors" tables); Phase D's scope was exactly that final remaining set, now fully closed.

## Status

**Phase A**: 8/8 tasks complete (A.1-A.8).
**Phase B**: 9/9 tasks complete (B.1-B.9).
**Phase C**: 3/3 tasks complete (C.1-C.3).
**Phase D**: 9/9 tasks complete (D.1-D.9). 58/58 focused tests pass; full suite 270/270 pass; full e2e suite 52/52 pass; `npx tsc --noEmit` — **zero errors anywhere in the repo** (first fully-green non-n8n verification point in this change).
**Cumulative (superseded by Phase E section below — kept for history)**: 29/46 total tasks complete across Phases A-F. Ready for `sdd-verify` on Phase A+B+C+D's scope, or `sdd-apply` again for Phase E (n8n workflow, manual-verification gate).

---

# Phase E of 6 — n8n Workflow: Acciones Branch via Twelve Data (PR5) — `[MANUAL-VERIFICATION-ONLY]` gate

**Scope**: tasks E.1-E.9 only. This is a config-only phase — `n8n/faf-workflow.json` is a JSON
workflow definition with no TypeScript and no automated test harness (design.md's Testing Strategy
table classifies it as "manual smoke test... not unit-testable"). E.10 and E.11 are
`[MANUAL-VERIFICATION-ONLY]` gate items that require the user's live n8n instance and cannot be
self-certified by this apply batch — they are left **unchecked** below, deliberately, matching this
session's established convention for `n8n-cadence-6h`/`cycle-cache-ttl-6h`/`narrative-model-haiku`.
Phase F (final full-suite verification across all 5 merged phases) is **NOT** started.

## Mode: Standard (config-only — no TDD applicable per design.md Testing Strategy)

## Completed Tasks (Phase E, PR5)

- [x] E.1 `n8n/faf-workflow.json` `Fetch Klines` node: `interval` query param changed `'1h'` -> `'1d'` (D1). Nothing else on this node touched (limit=50, fullResponse=true, onError, notes text all byte-identical).
- [x] E.2 `n8n/faf-workflow.json` `Aggregate (build /api/cycle payload)` node: `jsCode`'s final `return` statement changed from `return [{ json: { assets } }];` to `return [{ json: { market: 'crypto', assets } }];`; `notes` field gained one clarifying sentence about the new top-level `market` discriminator. No other logic touched.
- [x] E.3 Added `Acciones Symbols` (Code) node: emits exactly the 24 tickers in the exact order given (`AAPL, MSFT, GOOGL, AMZN, NVDA, META, TSLA, BRK.B, JPM, V, UNH, XOM, JNJ, WMT, PG, MA, HD, CVX, MRK, ABBV, KO, PEP, AVGO, COST`), verified programmatically post-edit (`node -e` array-length + exact-order check, both passed). Structure mirrors `Symbols` node's own `pairedItem: { item: 0 }` convention and "DO NOT RENAME" warning verbatim.
- [x] E.4 Added `Fetch Acciones Candles` (HTTP Request) node: `method: "GET"`, `url: "https://api.twelvedata.com/time_series"`, query params `symbol={{ $json.symbol }}` / `interval=1day` / `outputsize=50`, `authentication: "genericCredentialType"` + `genericAuthType: "httpQueryAuth"` with `credentials.httpQueryAuth: { id: null, name: "Twelve Data API Key" }` — the `apikey` value is supplied ONLY via this named credential reference, never inline as a literal string anywhere in the JSON (grepped the final file to confirm no `apikey=` literal exists outside the credential-name reference).
- [x] E.5 Added `Set Acciones Symbol` (Set) node: `symbol = {{ $('Acciones Symbols').item.json.symbol }}`, `klines = {{ $json.values }}` (type `array`) — exactly as specified, no `.body` indirection (see the E.10 discussion below for why).
- [x] E.6 Added `Aggregate Acciones Payload` (Code) node: `toCandle(row)` maps `{datetime, open, high, low, close, volume}` (Twelve Data's string-typed fields) to `{ openTime: Date.parse(row.datetime), open: Number(row.open), high: Number(row.high), low: Number(row.low), close: Number(row.close), volume: Number(row.volume) }`; output is `{ market: 'acciones', assets }`. No explicit re-sort added — `notes` field cites `src/stream/window.ts` already sorting by `openTime`, closing design.md Open Question 3 per the orchestrator's independent confirmation stated in this batch's launch prompt.
- [x] E.7 Added `POST /api/cycle (Acciones)` (HTTP Request) node: byte-identical `parameters` shape to the existing crypto `POST /api/cycle` node (same `url`, same header/body config) except `name`; `credentials.httpHeaderAuth` reuses the EXACT same credential reference (`id: "LHoJc9c840UMktty"`, `name: "FAF Cycle Shared Secret"`) as the existing node — confirmed by diffing both nodes' `credentials` blocks programmatically, identical.
- [x] E.8 `Schedule Trigger (6h)` node: added a second target to its existing `connections` fan-out array (`Symbols` and `Acciones Symbols` both now receive `main[0]`'s single output). The node object itself (`id`, `name`, `parameters.rule`, `notes`) is **completely untouched** — verified programmatically post-edit that `rule.interval[0].hoursInterval === 6` and the full `notes` string (starting "Per design.md D2...") is byte-identical to the pre-edit file. Only the `connections` object's `"Schedule Trigger (6h)"` entry was touched, exactly as scoped.
- [x] E.9 `n8n/POST_IMPORT_STEPS.md`: added an M2b section ("Create the Query Auth credential (Twelve Data)") immediately after M2's shared-secret credential section, matching M2's exact structure (credential type, name, field values, "select it on node X" instruction, one-sentence "never stored in the JSON" note); updated M1's topology diagram to show both branches (11 nodes, two branches fanning from the shared trigger) and its "no Merge Assets node" note to cover both `Fetch Klines` and `Fetch Acciones Candles`'s error pins; updated M3 to note `POST /api/cycle (Acciones)` shares the same deployed origin; added a new M4b section documenting the acciones branch's own item-count verification checklist (see E.10 below — this doc section is what operationalizes that manual-verification gate for the user).

## `[MANUAL-VERIFICATION-ONLY]` — Left Open (NOT checked, by design)

- [ ] E.10 Confirm Twelve Data's live `time_series` response is a single top-level JSON object (`{meta, values, status}`), not a top-level array, before activating the branch — verify `fullResponse: true` is genuinely NOT needed.
- [ ] E.11 Live import into the user's n8n instance, Twelve Data credential provisioned, first successful `market: 'acciones'` push to `/api/cycle` confirmed end-to-end (`/dashboard/acciones` shows real data).

This change **cannot archive as PASS** until the user confirms E.10 and E.11 live. `n8n/POST_IMPORT_STEPS.md`'s new M4b section gives the user the exact 4-step checklist to run against their own n8n instance to close both gates.

## The E.10 Technical Question — What I Determined, and Why It Is Still Flagged Open

**Question**: does `Fetch Acciones Candles` need `options.response.response.fullResponse: true`, the fix `Fetch Klines` required for Binance's array response?

**My determination (implemented in the JSON as written): NO, fullResponse is NOT needed.**

**Reasoning, grounded in this exact workflow's own documented behavior** (not just general n8n docs
recall): `Fetch Klines`'s own `notes` field states the confirmed production incident precisely —
*"without [fullResponse=true], n8n splits Binance's array-of-klines response into one item PER CANDLE
ROW instead of one item per symbol... options.response.response.fullResponse=true... is REQUIRED:
without it, n8n splits [a top-level JSON **array**] response into multiple items."* Twelve Data's
`time_series` endpoint response for a single-symbol query is a top-level JSON **object**
(`{meta, values, status}`), never a top-level array — this is Twelve Data's own documented API
response shape, not something I am inferring. If n8n's item-splitting behavior is specifically
triggered by a top-level array (which is exactly what `Fetch Klines`'s own incident-fix note
describes, and is the behavior I recall as correct from n8n's HTTP Request node documentation), then a
top-level object response should yield exactly one n8n item per HTTP call, with no split — meaning
`fullResponse: true` is unnecessary here, and `Set Acciones Symbol` can read `$json.values` directly
instead of `$json.body.values`.

**Why this stays an open, unchecked gate rather than a confirmed fact**: I do not have live access to
either n8n's own instance behavior or a real Twelve Data API response in this session (no network
tool, no running n8n instance, no context7 n8n-docs lookup available in this toolset) — my reasoning
is built entirely on (a) this exact file's own prior-incident documentation of n8n's behavior and (b)
Twelve Data's documented response shape, not a live-verified test. Given this exact workflow has one
**documented prior production incident from exactly this kind of item-count-explosion assumption**
(the `n8n-fetch-klines-item-fix` change this file's own `Fetch Klines` notes reference), I am
deliberately NOT self-certifying this as done. I embedded the full reasoning, the fallback fix
(`fullResponse: true` + `$json.body.values`), and an explicit `[MANUAL-VERIFICATION-ONLY]` tag
**directly in `Fetch Acciones Candles`'s and `Set Acciones Symbol`'s own `notes` fields in the JSON
itself** (not just in this doc), and added the M4b checklist to `POST_IMPORT_STEPS.md`, so the user has
everything needed to verify and, if my determination is wrong, fix it in exactly two places (one
toggle, one expression change) with zero other blast radius.

## Files Changed (Phase E)

| File | Action | What Was Done |
|------|--------|---------------|
| `n8n/faf-workflow.json` | Modified | `Fetch Klines` interval `1h`->`1d`; `Aggregate (build /api/cycle payload)` output gains `market: 'crypto'`; added 5 new nodes (`Acciones Symbols`, `Fetch Acciones Candles`, `Set Acciones Symbol`, `Aggregate Acciones Payload`, `POST /api/cycle (Acciones)`); `Schedule Trigger (6h)`'s `connections` entry fans out to both `Symbols` and `Acciones Symbols` (node itself untouched); `connections` object gained 4 new keys wiring the acciones branch end-to-end |
| `n8n/POST_IMPORT_STEPS.md` | Modified | Added M2b (Twelve Data Query Auth credential setup); added M4b (`[MANUAL-VERIFICATION-ONLY]` acciones branch item-count + end-to-end checklist); updated M1's topology diagram and M3's URL note to cover both branches |
| `openspec/changes/acciones-market-integration/tasks.md` | Modified | Marked E.1-E.9 `[x]`; E.10-E.11 left `[ ]` (manual-verification-only gate) |

## Verification Performed (config-only phase — no vitest/tsc applicable to this file type)

Per design.md's Testing Strategy table, `n8n/faf-workflow.json` is config JSON with no unit-test
harness. Verification performed instead:

1. `node -e "JSON.parse(...)"` — file parses as valid JSON after every edit (ran after each Edit call, not just once at the end).
2. Programmatic node/connection inventory: confirmed exactly 11 nodes (6 original + 5 new), and the `connections` object has exactly the 9 expected keys (5 original topology + 4 new acciones-branch keys; `Schedule Trigger (6h)` reused, not duplicated).
3. Programmatic ticker-list check: `Acciones Symbols`'s `SYMBOLS` array extracted via regex, confirmed `length === 24` and `JSON.stringify(list) === JSON.stringify(expectedOrder)` for the exact 24-ticker list and order given in the task prompt.
4. Programmatic field-by-field spot checks: `Fetch Klines`'s `interval` value is `"1d"`; `Aggregate (build /api/cycle payload)`'s `jsCode` ends with `market: 'crypto'`; `Fetch Acciones Candles`'s `method`/`url`/query params/`credentials` match spec exactly, and its `options` object is empty (`{}` — no `fullResponse` set, per the E.10 determination above); `Set Acciones Symbol`'s two assignments match spec exactly; `Aggregate Acciones Payload`'s `jsCode` ends with `market: 'acciones'`; `POST /api/cycle (Acciones)`'s `credentials` block is byte-identical to the existing `POST /api/cycle` node's.
5. `Schedule Trigger (6h)` non-regression check: confirmed programmatically that `parameters.rule.interval[0].hoursInterval === 6` and the node's `notes` string still starts with `"Per design.md D2: n8n stays cron+fetch only..."` — i.e., byte-identical to the pre-edit file, per the launch prompt's explicit instruction not to touch this node's cadence/notes.
6. `git diff --stat n8n/faf-workflow.json` — 188 insertions / 3 deletions, consistent with "5 new nodes + wiring + 2 one-line field edits," no unexpected churn.

**No `npx tsc --noEmit` / `npx vitest run` / `npx playwright test` run for this batch** — none of Phase E's files are TypeScript or covered by any existing test file; running the full suite would only re-confirm Phase A-D's already-verified state (Phase D's apply-progress already recorded "zero errors anywhere in the repo" / "270/270 pass" / "52/52 e2e pass" as of the end of Phase D, and this batch touched no `.ts`/`.tsx` file).

## Deviations from Design

1. **Added `onError: "continueErrorOutput"` to `Fetch Acciones Candles`**, not explicitly named in design.md's n8n Workflow Plan table or tasks.md E.4's text. Design.md's Technical Approach section states "Reuse every existing pattern verbatim" as a repo-wide principle, and `Fetch Klines` (the crypto branch's direct analog) uses this exact setting to isolate a single failed-ticker fetch from aborting the whole run (matching `POST_IMPORT_STEPS.md`'s existing M5 resilience convention). Applied the same setting for symmetry and resilience; the error output pin is left unconnected, identical to `Fetch Klines`'s own convention, so this is a zero-risk, backward-compatible addition (a node either has this set and drops failed items gracefully, or doesn't and the whole execution could abort on one bad ticker — the former is strictly safer). Flagging since it was my addition, not literally specified.
2. **`fullResponse` NOT set on `Fetch Acciones Candles`** (E.10's determination) — this is the one genuine open technical question in this phase, discussed in full above. Implemented as "not needed" based on reasoning from this exact file's own documented incident plus Twelve Data's documented response shape, but explicitly left as an unchecked `[MANUAL-VERIFICATION-ONLY]` gate (E.10) rather than self-certified, with the exact two-line fallback fix documented in three places (the node's own `notes`, this apply-progress section, and `POST_IMPORT_STEPS.md`'s new M4b) in case live verification proves it wrong.
3. **`POST_IMPORT_STEPS.md`'s M4b section** goes beyond E.9's literal text ("document the Twelve Data API key provisioning step") to also include a full item-count verification checklist for the acciones branch, mirroring the existing M4 section's structure for the crypto branch. This directly operationalizes E.10/E.11's manual-verification gate for the user (who otherwise would have no written checklist for what "confirm live" actually means for this branch) — judged as in scope of E.9's spirit ("document... alongside the existing shared-secret credential steps," and M4 is exactly the kind of adjacent step M2's original doc already covers for the crypto branch).

## Issues Found

None. No regressions to Phase A-D's code — this batch touched only `n8n/faf-workflow.json`,
`n8n/POST_IMPORT_STEPS.md`, and `tasks.md`; zero `.ts`/`.tsx`/`.md`(non-n8n) files touched.

## Remaining Tasks (Phase E gate items + Phase F — NOT started)

- [ ] E.10 `[MANUAL-VERIFICATION-ONLY]` — user must confirm live Twelve Data response shape.
- [ ] E.11 `[MANUAL-VERIFICATION-ONLY]` — user must confirm live n8n import + credential + first successful acciones push end-to-end.
- [ ] Phase F: final full-suite verification (after PR1-PR5 merge) — F.1-F.3, not started, explicitly out of this batch's scope per the launch prompt.

## Workload / PR Boundary (Phase E)

- Mode: chained PR slice (`stacked-to-main`, per tasks.md's Delivery Route Recommendation)
- Current work unit: Unit 5 / PR5 (Phase E only)
- Boundary: starts from `Fetch Klines`'s interval edit, ends at E.9's `POST_IMPORT_STEPS.md` update. Touches exactly the 2 files tasks.md's Suggested Work Unit 5 rollback boundary names (`n8n/faf-workflow.json`, `n8n/POST_IMPORT_STEPS.md`) plus `tasks.md` — independently revertible from PR1-PR4, per the proposal's Rollback Plan.
- Estimated review budget impact: within PR5's forecasted slice; config-only diff (188 insertions/3 deletions in the JSON, ~40 lines in the markdown doc), no code/test files touched. Not committed by this batch — orchestrator will review and commit separately.

## Status

**Phase A**: 8/8 tasks complete (A.1-A.8).
**Phase B**: 9/9 tasks complete (B.1-B.9).
**Phase C**: 3/3 tasks complete (C.1-C.3).
**Phase D**: 9/9 tasks complete (D.1-D.9).
**Phase E**: 9/9 automatable tasks complete (E.1-E.9); 2/2 gate items (E.10-E.11) intentionally left open pending the user's live n8n confirmation.
**Cumulative**: 38/46 total tasks complete across Phases A-F (E.10/E.11 counted as "not yet completable by this agent," not as failures). Ready for `sdd-verify` on Phase A-E's automatable scope (verify should treat E.10/E.11 as an expected, documented open gate, not a defect), or `sdd-apply` again for Phase F once the user confirms E.10/E.11 live and all 5 PRs are merged.
