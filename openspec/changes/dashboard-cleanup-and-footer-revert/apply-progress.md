# Apply Progress: dashboard-cleanup-and-footer-revert

**Mode**: Strict TDD (Phase 3 is a genuine RED→GREEN cycle; Phases 1-2 are GREEN-only mechanical edits per the change's own scope; Phase 5 is an explicit regression-proof).

## Completed Tasks

- [x] 1.1 Punctuation fix in `app/dashboard/inicio/page.tsx`.
- [x] 2.1-2.5 `ThesisScores.tsx` θ/gap removal; `DecisionCard.tsx` confirmed untouched.
- [x] 3.1-3.4 RED: inverted/added 3 e2e tests, confirmed 2/3 fail pre-move (see Deviations).
- [x] 4.1-4.6 GREEN: atomic route move + mandatory `<main>` className fix + 3 comment rewrites; confirmed all 3 tests pass post-move.
- [x] 5.1-5.2 Regression-proof: temporarily reverted the className fix, confirmed the phantom-scroll test fails with the exact `+192px` bug signature; restored the fix, confirmed pass again.
- [x] 6.1-6.5 Verification: `tsc --noEmit` clean, focused e2e pass, full e2e suite pass (48/48), full Vitest suite pass (224/224), manual screenshot confirms punctuation/footer/no-scroll.

## Files Changed

| File | Action | What Was Done |
|------|--------|----------------|
| `app/dashboard/inicio/page.tsx` → `app/dashboard/(with-footer)/inicio/page.tsx` | Moved + Modified | `git mv` into `(with-footer)/`; punctuation fix (arrow → comma+"y"); `<main>` className `min-h-screen` → `min-h-[calc(100vh-12rem)]`; header comment rewritten to describe footer inclusion instead of exclusion |
| `app/(dashboard)/components/ThesisScores.tsx` | Modified | Deleted gap `<div>` row and θ `<dd>` inside `ThesisColumn`; removed `theta` from `ThesisColumnProps`/destructure/both call sites; narrowed `computeScores(decision)` destructure to `{ sigmaPlus, sigmaMinus }` |
| `app/dashboard/layout.tsx` | Modified (comment only) | Rewrote header comment: dropped "Inicio exception" claim |
| `app/dashboard/(with-footer)/layout.tsx` | Modified (comment only) | Rewrote header comment: now also wraps Inicio |
| `tests/e2e/market-nav.spec.ts` | Modified | Inverted `'Inicio route — no dashboard footer'` → `'Inicio route — shared dashboard footer'` (asserts presence + exact shared copy); extended the footer-overlap viewport loop to add Inicio at both 1280px/375px; added a new Inicio-specific phantom-scroll regression test |

## TDD Cycle Evidence

| Task | RED (command + result) | GREEN (command + result) | REFACTOR |
|------|--------------------------|----------------------------|----------|
| 3.1/4.1-4.3 footer-presence test | `npx playwright test tests/e2e/market-nav.spec.ts` pre-move → `Inicio route — shared dashboard footer` FAILED: `getByTestId('dashboard-footer')` not found (timeout) | Same command post-`git mv`+comment rewrites → test PASSED (2.4-2.5s) | Comment rewrites in 3 files were the refactor step, folded into 4.3-4.5 |
| 3.2/4.1-4.2 footer-overlap-on-Inicio (1280px, 375px) | Pre-move: both FAILED with `TypeError: Cannot read properties of null (reading 'getBoundingClientRect')` (no footer element existed on Inicio at all) | Post-move: both PASSED | N/A |
| 3.3/4.2/5.1-5.2 phantom-scroll-on-Inicio | Pre-move: PASSED — but not proof of a fix (see Deviations); real RED for this test came from Phase 5's temporary revert: with `min-h-screen` restored post-move, test FAILED (`scrollHeight` 1192 > `innerHeight+1` 1001) | Phase 5.2: className fix re-applied, test PASSED again (`scrollHeight` within bound) | N/A |

## Deviations from Design

1. **Phase 3.3/3.4 — phantom-scroll test viewport (1280x800 → 1280x1000)**: `tasks.md` suggested mirroring the crypto test's 1280x800 viewport. Empirically, Inicio's real content (heading + prose card + `PipelineDiagram` SVG) plus the 192px reserved footer space totals ~894px, genuinely taller than crypto's `EmptyState` — an 800px-tall viewport would show real (non-phantom) scroll even with the fix correctly applied, failing the test for the wrong reason. Used 1280x1000 instead, which gives headroom above real content (~894px) while remaining far short of what the reintroduced bug would force (~1142px at that viewport), so the test still isolates the double-counting bug specifically. Documented inline in the test file.
2. **Phase 3.4 — "confirm 3.1-3.3 FAIL pre-move"**: only 3.1 and 3.2 failed pre-move; 3.3 (phantom-scroll) passed pre-move by coincidence, because pre-move Inicio sits outside `(with-footer)/` and has no `pb-48` reservation at all, so no double-counting exists yet to trigger it. This is expected and consistent with the user's own explicit framing of Phase 5 as "an explicit regression-proof phase... this is what proves the new test is a real guard, not tautological" — the genuine RED for the phantom-scroll test happens in Phase 5 (temporarily reverting the className fix post-move), not in Phase 3. Phase 5 confirmed the test does fail with the exact `+192px` bug signature (`scrollHeight` = `innerHeight` + 192, matching the fixed-offset pattern `inicio-visual-and-scroll-fix` originally found on crypto) and passes again once the fix is restored.

No other deviations — implementation otherwise matches design/tasks exactly.

## Issues Found

None.

## Remaining Tasks

- [ ] 7.1 Merge `market-navigation/spec.md`'s MODIFIED "Shared shell footer" delta — deliberately deferred to `sdd-archive` per repo convention and explicit instruction. Not touched in this apply batch.

## Workload / PR Boundary

- Mode: single PR (Review Workload Forecast: Low risk, no chaining recommended)
- Current work unit: all 3 points as one atomic change, Point 3 as one atomic commit unit (route move + className fix + comment rewrites + test inversion/extension, per proposal's explicit atomicity requirement)
- Boundary: this apply batch covers Phases 1-6 in full (implementation + verification). Phase 7 (spec delta merge) is explicitly out of scope for apply, deferred to archive.
- Estimated review budget impact: within the ~150-220 line forecast; no exception needed.

## Status

26/26 in-scope tasks complete (Phases 1-6). 1 task (7.1) intentionally deferred to `sdd-archive` per proposal/tasks convention — not a blocker. Ready for verify.
