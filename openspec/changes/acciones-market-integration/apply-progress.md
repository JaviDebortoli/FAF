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

## Status

8/8 Phase A tasks complete (A.1-A.8). 37 total tasks remain across Phases B-F. Ready for `sdd-verify` on Phase A's scope, or `sdd-apply` again for Phase B.
