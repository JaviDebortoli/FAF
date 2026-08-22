# Proposal: Fix Narrative Panel `market` Param Regression

## Intent

The just-archived `acciones-market-integration` change (commit `8ff3407`) made `GET /api/decisions/[asset]/narrative` require `?market=crypto|acciones`, but never updated the browser-side caller. Every narrative request, for both markets, now 400s with `BAD_MARKET` before reaching real logic — a total outage of the Tier 2 AI-narrative feature, reported by the user as "la narración dejó de funcionar." This is a **regression fix restoring already-shipped functionality**, not new feature work.

## Scope

### In Scope
- Thread `decision.market` from `DrilldownPanel.tsx` into `NarrativePanel.tsx` and append `?market=${market}` to its fetch URL.
- Widen `stubNarrativeSuccess`/`stubNarrativeError` globs in `tests/e2e/dashboard.spec.ts` to tolerate a query string (`'**/api/decisions/*/narrative?**'` pattern, mirroring the existing `stubDecisions` fix), and add a RED→GREEN e2e assertion that would have caught this exact regression.
- Add `'BAD_MARKET'` to `NarrativePanel.tsx`'s `UNAVAILABLE_CODES` so a future recurrence degrades to the calm "narrativa no disponible" state instead of an infinite retry loop (confirmed by user).

### Out of Scope
- Any change to `app/api/decisions/[asset]/narrative/route.ts` or `tests/api/narrative.test.ts` — already correct.
- Broader e2e stub audit beyond the two narrative-specific globs.
- Extracting a reusable `narrativeUrlFor()` helper (deferred; inconsistent with existing `OverviewClient` precedent).

## Capabilities

### New Capabilities
None.

### Modified Capabilities
None — this is a bugfix restoring the intended contract of the already-specified market-scoping behavior; no requirement text changes.

## Approach

Minimal prop/URL wiring: `decision.market` is already present on the `Decision` type and already reaches `DrilldownPanel` — zero new data fetching required. Pair the fix with the e2e glob correction so the regression is provable via a real failing test first (TDD), reusing the exact `'**/path?**'` pattern already established this session for `stubDecisions`.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `app/(dashboard)/components/NarrativePanel.tsx` | Modified | Add `market` prop, include in fetch URL, add `BAD_MARKET` to `UNAVAILABLE_CODES` |
| `app/(dashboard)/components/DrilldownPanel.tsx` | Modified | Pass `market={decision.market}` to `NarrativePanel` |
| `tests/e2e/dashboard.spec.ts` | Modified | Widen narrative stub globs; add RED test proving the regression |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Widened e2e globs surface other currently-masked narrative assertions | Low-Med | Treat as in-scope, matching the sibling `/api/decisions` Phase D precedent |
| No live test run performed pre-proposal | Low | `sdd-apply` must capture a real RED run before the fix |

**Process lesson (for the record)**: the archived `acciones-market-integration` change's Phase C scoped work to exactly the route file and its direct API test, with no task covering the browser-side caller — unlike its sibling Phase D for `/api/decisions`, which correctly threaded `market` end-to-end. A backend contract change shipped with 100% green tests while silently breaking every real request. Future task breakdowns for query-param/contract changes should include an explicit "update all callers" task alongside the route change.

## Rollback Plan

Revert the three modified files (`NarrativePanel.tsx`, `DrilldownPanel.tsx`, `tests/e2e/dashboard.spec.ts`). No schema, API contract, or data migration involved — a plain `git revert` is sufficient.

## Dependencies

None — self-contained client-side fix against an already-correct, already-archived API contract.

## Success Criteria

- [ ] Narrative panel loads successfully for both crypto and acciones assets in the dashboard.
- [ ] New/updated e2e test fails (RED) against the unpatched globs/wiring, then passes (GREEN) after the fix.
- [ ] `BAD_MARKET` no longer triggers the infinite "Reintentar" loop.
- [ ] Existing 52/52 e2e suite and `tests/api/narrative.test.ts` remain green.
