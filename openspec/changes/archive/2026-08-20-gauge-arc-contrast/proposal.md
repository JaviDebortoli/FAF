# Proposal: Gauge Arc Contrast

## Intent

The `ScoreGauge` arc — the dashboard's signature analog instrument element — renders at ~1.34:1 contrast (`stroke="currentColor"` resolving to `zinc-800` over `#09090b`, full opacity, no own class), below the WCAG 1.4.11 floor of 3:1 for non-text graphics. This is the same defect class already fixed for the argument graph's edges in `graph-scrollbar-theming`; the gauge arc was missed in that pass and is worse (full opacity vs. the edges' prior `0.35`).

## Scope

### In Scope
- Give the arc `<path>` (`ScoreGauge.tsx:27`) its own explicit `className="stroke-zinc-200"` and `opacity={0.5}`, raising contrast to ~4.4:1.

### Out of Scope
- SVG root `text-zinc-800` class (line 25) — left untouched, same precedent as the edges fix; grep confirms no other element depends on it post-fix.
- Pivot `<circle>` (line 42) — already has its own `text-zinc-500` override, unaffected.
- Threshold tick, sell/buy needles — already use explicit `var(--color-*)` tokens, no contrast issue.
- New contrast/color tokens in `@theme` — reuse existing `zinc-*` scale only.

## Capabilities

### New Capabilities
None.

### Modified Capabilities
None — no pinned color/contrast requirement exists in `decision-dashboard/spec.md`; this is implementation-level, not spec-level.

## Approach

`app/(dashboard)/components/ScoreGauge.tsx:27`: add `className="stroke-zinc-200"` and `opacity={0.5}` to the arc `<path>`. Exact parity with the `graph-scrollbar-theming` edges fix (`ArgumentGraph.tsx`). SVG root and pivot circle remain untouched.

## Affected Areas

| Area | Impact | Description |
|------|--------|--------------|
| `app/(dashboard)/components/ScoreGauge.tsx:27` | Modified | Arc `<path>` gets explicit `stroke-zinc-200` class + `opacity={0.5}` |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| `zinc-200` @ 0.5 reads too bright given `strokeWidth={10}` (10x the edges' width) | Low | Independently recomputed at ~4.4:1; visual weight is a width effect, not a color/opacity one — same color/opacity values already validated on the thinner edges |

## Rollback Plan

Single-file, single-element attribute edit with no state or API impact. Revert via `git revert` of the commit, or manually remove `className="stroke-zinc-200"` and the `opacity={0.5}` prop.

## Dependencies

None.

## Success Criteria

- [ ] Gauge arc visibly distinguishable against the dashboard background in a manual screenshot check.
- [ ] SVG root class and pivot circle styling unchanged.
- [ ] No existing test regressions (`tests/dashboard/lib/gauge.test.ts`, `tests/e2e/dashboard.spec.ts` — verified neither asserts arc color/opacity/class; both are safe to leave unmodified).

## Proposal question round

Both open design questions from exploration were resolved by explicit user instruction before this phase ran — no re-litigation needed:
1. Fix approach: exact parity with the `graph-scrollbar-theming` edges precedent — own `stroke-zinc-200` class + `opacity={0.5}`, root class untouched.
2. `design.md`/`spec.md`: skipped, same precedent — pure 1-file CSS/SVG-attribute change, no new behavior or requirement.

No further proposal-shaping questions are needed for this change.
