# Proposal: Dashboard Cleanup and Inicio Footer Revert

## Intent

Three small, independent-but-bundled dashboard fixes surfaced during Inicio review: (1) a punctuation inconsistency in Inicio's pipeline description that doesn't match `PipelineDiagram.tsx`'s established phrasing convention; (2) `ThesisScores.tsx`'s Tier-2 drill-down panel over-shows θ and gap values that clutter the comparison view and belong only on the Tier-1 `DecisionCard`; (3) Inicio's prior footer exclusion (`inicio-visual-and-scroll-fix`-era decision) is being reversed — Inicio should share the same footer as `crypto/` and `[market]/` for UI consistency across all dashboard routes.

## Scope

### In Scope
- Point 1: rewrite Inicio's pipeline description to comma-separated-with-"y" phrasing (matches `PipelineDiagram.tsx`'s `<desc>`).
- Point 2: remove θ and gap display from `ThesisScores.tsx`'s Tier-2 `ThesisColumn` (both Alcista/Bajista), narrow its `computeScores` destructure accordingly.
- Point 3 (atomic unit): move `inicio/page.tsx` into the `(with-footer)/` route group, apply the mandatory `<main>` className scroll-fix, rewrite 3 stale header comments, land the `market-navigation` spec delta, and invert/extend the affected e2e tests — all as one indivisible change.

### Out of Scope
- `DecisionCard.tsx`'s θ/gap display (Tier-1, separate location, unaffected).
- `computeScores()`'s signature/return type in `lib/scores.ts` (used by 6 other call sites, unchanged).
- Any change to `pb-48` or footer layout itself (only Inicio's `<main>` sizing changes).
- Any redesign of the pipeline diagram or ThesisScores' remaining fields.

## Capabilities

### New Capabilities
None.

### Modified Capabilities
- `market-navigation`: "Shared shell footer" requirement reverts from "footer excluded on `/dashboard/inicio`" back to universal footer coverage across all `/dashboard/*` routes; its "Inicio route renders no footer" scenario is replaced with an inverted footer-presence scenario.

## Approach

**Point 1**: Direct text edit in `app/dashboard/inicio/page.tsx` (arrow-separated → comma+"y"), no logic change.

**Point 2**: In `ThesisScores.tsx`, delete the θ `<dd>` and the gap `<div className="col-span-2 ...">` row inside `ThesisColumn`; remove `theta` from `ThesisColumnProps` and both call sites; narrow the local `computeScores(decision)` destructure to `{ sigmaPlus, sigmaMinus }`.

**Point 3**: `git mv app/dashboard/inicio/page.tsx app/dashboard/(with-footer)/inicio/page.tsx` (URL-neutral route group). Companion fix: `<main>` className `min-h-screen` → `min-h-[calc(100vh-12rem)]`, matching `crypto/page.tsx`/`[market]/page.tsx` byte-for-byte, preventing the phantom-scroll double-count bug `inicio-visual-and-scroll-fix` already fixed elsewhere. Rewrite stale header comments in the moved page, `app/dashboard/layout.tsx`, and `app/dashboard/(with-footer)/layout.tsx`. Update `market-navigation/spec.md`'s footer requirement and invert/extend `tests/e2e/market-nav.spec.ts` coverage (footer-presence assertion, footer-overlap loop, new phantom-scroll regression test).

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `app/dashboard/inicio/page.tsx` → `app/dashboard/(with-footer)/inicio/page.tsx` | Moved + Modified | Point 1 text edit; Point 3 route-group move, `<main>` className fix, comment rewrite |
| `app/(dashboard)/components/ThesisScores.tsx` | Modified | Point 2: remove θ/gap display, narrow destructure |
| `app/dashboard/layout.tsx` | Modified (comment only) | Point 3: stale footer-exclusion comment rewrite |
| `app/dashboard/(with-footer)/layout.tsx` | Modified (comment only) | Point 3: stale footer-exclusion comment rewrite |
| `openspec/specs/market-navigation/spec.md` | Modified | Point 3: "Shared shell footer" requirement reverted to universal coverage |
| `tests/e2e/market-nav.spec.ts` | Modified | Point 3: invert footer-absence test, extend overlap loop, add phantom-scroll regression test |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Point 3 landing partially (route move without the scroll fix) silently reintroduces the phantom-scroll bug with no test catching it | Medium if slices are separated | `sdd-tasks`/`sdd-apply` must treat route move + scroll fix + spec delta + test inversion as one atomic unit, per exploration |
| `pb-48` ↔ `min-h-[calc(100vh-12rem)]` coupling has no compile-time enforcement, now applies to a third file | Low | Cross-referencing comments at all touch points (already the established pattern) |
| Stale header comments across 3 files could be missed in review | Low | Explicitly enumerated in Affected Areas and tasks |

## Rollback Plan

All three points are independently revertible. Point 1: revert the text edit. Point 2: restore the θ `<dd>`/gap `<div>` and `theta` prop. Point 3: `git mv` the page back outside `(with-footer)/`, revert the `<main>` className, restore the prior spec text and test assertions — must be reverted as the same atomic unit it was applied in, since a partial revert reintroduces the same silent-breakage risk as a partial apply.

## Dependencies

None.

## Success Criteria

- [ ] Inicio's pipeline description uses comma+"y" phrasing, matching `PipelineDiagram.tsx`.
- [ ] `ThesisScores.tsx`'s Tier-2 panel no longer renders θ or gap; `DecisionCard.tsx`'s Tier-1 θ/gap display is unaffected.
- [ ] `/dashboard/inicio` renders the shared `dashboard-footer` element identical to `crypto/`/`[market]/`.
- [ ] `/dashboard/inicio` shows no phantom vertical scroll on short-content states.
- [ ] `market-navigation/spec.md` reflects universal footer coverage with no exception.
- [ ] All inverted/added e2e assertions in `market-nav.spec.ts` pass.

## Proposal question round

None. All three points were fully resolved during exploration with concrete recommendations and no open design ambiguity (per `exploration.md`'s "Ready for Proposal: Yes"). No product/business unknowns remain.
