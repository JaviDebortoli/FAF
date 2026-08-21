# Proposal: Fix Drill-down Argument Graph Collapsing During Narrative Streaming

## Intent

In production, the drill-down panel's argument graph (R1-R8 rules converging to σ+/σ-) visually compresses to an illegible cluster and then disappears as the LLM narrative streams in below it — confirmed by the user's screen recording and root-caused to source. This misleads users into thinking the reasoning graph failed or vanished, undermining trust in the decision evidence right when they're inspecting it most closely. Root cause: a classic CSS Flexbox `min-height:auto` trap — `ArgumentGraph`'s root `<svg>` has a browser-default `overflow:hidden`, giving it an automatic flex-item min-height of 0, while its siblings (`ThesisScores`, `NarrativePanel`) keep a content-based minimum. As the narrative grows past `max-h-[90vh]`, all negative free space lands on the only item with a 0 floor — the graph.

## Scope

### In Scope
- Add `shrink-0` to `ArgumentGraph.tsx`'s root `<svg>` className — the actual fix.
- Add `shrink-0` defensively to `ThesisScores.tsx` and `NarrativePanel.tsx` root elements, so layout correctness no longer depends on implicit browser `overflow:visible` defaults.
- Add one new e2e test in `tests/e2e/dashboard.spec.ts` using a chunked/streaming narrative route stub (not the direct-resolve `stubNarrativeSuccess`), asserting graph node elements stay visible with non-zero height throughout streaming.

### Out of Scope
- Giving `NarrativePanel` its own internal scroll region while pinning graph+scores (exploration Approach 3) — a separate UX enhancement, not bundled here.
- Any spec delta pinning "layout stability during concurrent narrative streaming" as a formal requirement — see Approach below.

## Capabilities

### New Capabilities
None.

### Modified Capabilities
None. No spec-level requirement changes — `decision-dashboard` and `decision-narrative` already require the graph to render and to survive narrative *failure*; layout behavior during concurrent streaming was never a pinned requirement, so this is a pure bugfix, not a behavior change.

## Approach

Exploration's recommended Approach 2: minimal Tailwind class fix at the confirmed mechanism, plus defensive hardening on siblings, plus the missing streaming e2e coverage. Decision: do NOT add a spec delta scenario for this. The fix is precise and cheap, and the new e2e test already pins the regression at the test layer; adding a formal spec requirement would over-scope a 3-line CSS fix into spec-authoring overhead disproportionate to the change size. This can be revisited later as a standalone spec-hardening pass if similar layout bugs recur elsewhere.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `app/(dashboard)/components/ArgumentGraph.tsx` | Modified | Add `shrink-0` to root `<svg>` className |
| `app/(dashboard)/components/ThesisScores.tsx` | Modified | Add `shrink-0` to root `<dl>` |
| `app/(dashboard)/components/NarrativePanel.tsx` | Modified | Add `shrink-0` to root `<section>` |
| `tests/e2e/dashboard.spec.ts` | Modified | New streaming-narrative test asserting graph stays visible/non-zero height |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| New e2e SVG assertion flaky across browsers | Low | Assert testid visibility/non-zero height, not pixel-perfect boxes |
| Future new flex-col sibling omits `shrink-0`, reintroducing the bug class | Low | New streaming e2e test guards the current three; convention documented in proposal |

## Rollback Plan

Revert the `shrink-0` class additions (3 one-line diffs) and remove the new e2e test. No state, API, or data changes involved — pure CSS/Tailwind class revert.

## Dependencies

None.

## Success Criteria

- [ ] Argument graph remains fully visible and legible (non-zero, non-shrinking height) while the narrative streams and grows past panel height
- [ ] New e2e test passes and fails on the pre-fix code (regression-proven)
- [ ] No visual regression to `ThesisScores` or `NarrativePanel` layout
