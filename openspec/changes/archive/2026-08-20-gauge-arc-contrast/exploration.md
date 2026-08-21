# Exploration: gauge-arc-contrast

## Current State

`app/(dashboard)/components/ScoreGauge.tsx` (45 lines) — SVG root `className="h-20 w-full text-zinc-800"` (line 25). The arc `<path>` (line 27) uses `stroke="currentColor"` at **full opacity** (worse than the edges bug, which at least had `opacity={0.35}`). Grep for `currentColor` in this file confirms exactly 2 hits: line 27 (arc, no own class — inherits root) and line 42 (pivot `<circle>`, which has its OWN `className="text-zinc-500"` overriding the root). Threshold tick, sell needle, buy needle all use explicit `var(--color-*)` tokens already. Independently recomputed WCAG contrast for `#27272a` @ 1.0 opacity over `#09090b`: L_fg ≈ 0.02045, L_bg ≈ 0.002777, ratio ≈ **1.335:1** — confirms the carried-over figure from `graph-scrollbar-theming`'s verify phase, well below the 3:1 WCAG 1.4.11 floor.

## Affected Areas

- `app/(dashboard)/components/ScoreGauge.tsx:27` — the arc `<path>`, sole fix site.
- `app/(dashboard)/components/ScoreGauge.tsx:25` — SVG root `text-zinc-800` class; decision point, recommend leaving untouched.

## Design Questions

**Q1 — Root class vs. own class on the arc.** Recommend (a): give the arc its own `stroke-zinc-*` className, don't touch the root. Exact parity with the `graph-scrollbar-theming` precedent (`ArgumentGraph.tsx` edges fix), matches the user's explicit "same way as the edges" ask, and is strictly the smaller/safer diff even though nothing else in this file depends on the root's `currentColor` post-fix (verified by grep — only the arc used it unqualified).

**Q2 — Target color/opacity.** Recommend `stroke-zinc-200` + `opacity={0.5}` — identical treatment to the edges fix, landing at the same independently-recomputed ≈4.42:1. The component's own doc comment calls this "the dashboard's signature element," which could argue for a stronger treatment, but `strokeWidth={10}` (vs. edges' `1`) already delivers 10x the visual weight at the same color/opacity, so no extra opacity boost is needed. Considered alternative: `stroke-zinc-500` @ full opacity (no opacity prop) ≈ 4.12:1 — simpler code, but visibly more muted/less "signature." Flagged as the one open call for user confirmation.

**Q3 — design.md/spec.md.** Recommend skipping both, same as the precedent — 1-file, pure CSS/SVG-attribute change, no new behavior/requirement.

## Recommendation

Fix the arc exactly like the edges: `className="stroke-zinc-200"` + `opacity={0.5}` on the `<path>` at line 27, leave the SVG root's `text-zinc-800` untouched. Skip design.md/spec.md. Pending user confirmation only on Q2 (color/opacity choice).

## Risks

- Q2 is a subjective visual-hierarchy call — numerically both options clear 3:1, but "should the signature element be brighter than the edges" needs explicit user sign-off before `sdd-propose`.
- Otherwise very low risk: single file, no state/API/topology impact, identical end-to-end precedent already exists in this repo.

## Ready for Proposal

Yes, pending Q2 confirmation (color/opacity).
