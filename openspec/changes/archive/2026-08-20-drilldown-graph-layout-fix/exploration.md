# Exploration: drilldown-graph-layout-fix

## Current State

`DrilldownPanel.tsx` (`app/(dashboard)/components/DrilldownPanel.tsx:53`) renders its dialog as a single `flex flex-col ... max-h-[90vh] overflow-y-auto` container with three direct flex-item children, in order: `<ArgumentGraph decision={decision} />`, `<ThesisScores decision={decision} />`, `<NarrativePanel asset={decision.asset} />`. None of the three children (nor the parent) sets `shrink-0` or an explicit/min height on any item.

`ArgumentGraph.tsx` (`app/(dashboard)/components/ArgumentGraph.tsx:34`) renders a root `<svg viewBox={layout.viewBox} preserveAspectRatio="xMidYMid meet" className="h-auto w-full text-zinc-700">` using the fixed `GRAPH_VIEWBOX = '0 0 720 380'` (`app/(dashboard)/lib/graphLayout.ts:11`) — purely CSS/viewBox-sized, no JS measurement. `ThesisScores.tsx` root is a `<dl>`; `NarrativePanel.tsx` root is a `<section>`.

Bug confirmed via the user's screen recording (frames extracted with ffmpeg and visually reviewed by the orchestrator): the argument graph (nodes R1-R8 converging to σ+/σ-) progressively compresses to an illegible cluster, then disappears entirely, as the narrative text streams in and grows. The ALCISTA/BAJISTA (`ThesisScores`) summary boxes stay stable throughout.

## Root Cause (confirmed from source — single mechanism, not two bugs)

1. Per the CSS Flexbox spec, a flex item's automatic `min-height: auto` resolves to its content-based minimum size, **unless** the item's own computed `overflow` is not `visible`, in which case the automatic minimum resolves to **0**.
2. `<svg>` root elements carry a UA-stylesheet default of `overflow: hidden`. So `ArgumentGraph`'s `<svg>` has an automatic min-height of **0** as a flex-col child.
3. `ThesisScores`'s `<dl>` and `NarrativePanel`'s `<section>` are ordinary elements with default `overflow: visible`, so their automatic min-height stays content-based — they effectively refuse to shrink.
4. As `NarrativePanel`'s SSE-streamed text grows, total content height exceeds `max-h-[90vh]`. Since only the SVG has a floor of 0, **all** the negative free space lands on it: its rendered box is squeezed progressively toward 0, and `preserveAspectRatio="xMidYMid meet"` scales the 720×380 viewBox content down proportionally — this is the "compressed to a tiny illegible cluster" phase. As the narrative keeps growing, the box keeps shrinking toward ~0px, visually indistinguishable from full disappearance. No unmount, no remount, no conditional fallback is involved — it's the same rendered `<svg>`, just squeezed to near-zero height.
5. `ThesisScores` staying stable in the video is fully consistent: it's a `<dl>`, never participates in the shrink.

This is the classic Flexbox "min-height:auto" trap, triggered here because the graph is an `<svg>` (implicit `overflow:hidden`) sharing a flex-col with non-shrinking block-element siblings, with no `shrink-0` anywhere.

## Affected Areas

- `app/(dashboard)/components/ArgumentGraph.tsx:40` — the actual fix site (`className="h-auto w-full text-zinc-700"` needs `shrink-0`).
- `app/(dashboard)/components/DrilldownPanel.tsx:53,69-71` — the flex-col container where the shrink competition occurs.
- `app/(dashboard)/components/ThesisScores.tsx`, `NarrativePanel.tsx` — currently protected only by browser `overflow:visible` defaults; worth hardening explicitly.
- `tests/e2e/dashboard.spec.ts` — "Tier 2 — drill-down graph" (task 6.4, line 388) and narrative tests exist, but none exercise the graph concurrently with a growing/streaming narrative (`stubNarrativeSuccess` at line 210 resolves content directly, not incrementally) — this is the coverage gap that let the bug ship.
- `openspec/specs/decision-dashboard/spec.md` (lines 30, 33-46) and `openspec/specs/decision-narrative/spec.md` (lines 45, 50, 55) — require the graph to render correctly and survive narrative *failure*, but have no requirement pinning layout stability while the narrative *streams concurrently*. This was an implicit, never-pinned expectation — pure bugfix, no spec conflict. An optional additive scenario could be proposed later but isn't required.
- Convention: codebase consistently uses Tailwind's `shrink-0` utility (not `flex-shrink-0`) — see `Sidebar.tsx:45`. Tailwind v4 confirmed (`package.json`: `"tailwindcss": "^4"`).

## Approaches

1. **Add `shrink-0` to the ArgumentGraph SVG's className.**
   - Pros: 1-line fix, directly targets the mechanism, matches the user's own diagnosis (panel should scroll, not squeeze), zero risk, matches existing convention.
   - Cons: none of substance.
   - Effort: Low.

2. **Approach 1 + defensive `shrink-0` on `ThesisScores` and `NarrativePanel` roots** — removes reliance on implicit browser overflow defaults.
   - Pros: same as (1) plus closes the underlying fragility rather than papering over today's specific failure mode.
   - Cons: marginally larger diff (3 lines).
   - Effort: Low.

3. **Pin graph+scores, give only NarrativePanel its own internal scroll region.**
   - Pros: nicer UX for very long narratives (graph/scores always visible).
   - Cons: needs a new height-budget decision, more design surface, scope creep beyond the bug fix.
   - Effort: Medium.

## Recommendation

Approach 2. Minimal, precise, follows existing `shrink-0` convention, no design decisions required, and closes the fragility (not just today's symptom). Also add one e2e test to `tests/e2e/dashboard.spec.ts` that streams a long narrative via a chunked route stub while asserting `graph-node-*` elements stay visible/non-zero-height — this is the exact coverage gap that let the bug ship. Approach 3 can be proposed later as a separate UX enhancement, not bundled here.

## Risks

- Regression-test gap: without the new concurrent-streaming assertion, any future sibling added to this flex-col without `shrink-0` could silently reintroduce the same class of bug.
- SVG bounding-box assertions in Playwright can be flaky across browsers if scoped too tightly — assert testid visibility/non-zero height rather than pixel-perfect boxes.
- No other risk identified: pure CSS/Tailwind class change, no state or API impact.

## Ready for Proposal

Yes.
