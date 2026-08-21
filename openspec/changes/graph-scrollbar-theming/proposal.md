# Proposal: Graph Edge Contrast & Global Scrollbar Theming

## Intent

The argument graph's edges are nearly invisible (~1.17:1 contrast, `stroke="currentColor"` resolving to `zinc-700` over `#09090b` background) — below the WCAG 1.4.11 floor of 3:1 for non-text graphics. Separately, all three scrollable containers app-wide (drill-down panel, desktop sidebar, mobile drawer) render unstyled browser-default scrollbars, clashing with the dark dashboard chrome. Both are visual-polish/accessibility defects reported by the user from screenshots; fixing them now removes a genuine contrast failure and a jarring visual inconsistency before they compound with further UI work.

## Scope

### In Scope
- Give graph edge `<line>` elements their own explicit `stroke-zinc-200` class (independent of the SVG root's `currentColor`), raising opacity from `0.35` to `0.5` (~4.45:1 contrast).
- Add global scrollbar theming (`scrollbar-color`/`scrollbar-width: thin` + `::-webkit-scrollbar*` fallback) in `app/globals.css`, covering all 3 existing `overflow-y-auto` sites via one shared rule.

### Out of Scope
- Conflict node styling (`currentColor`/`text-zinc-700` at lines 117-118 of `ArgumentGraph.tsx`) — untouched; complaint was edges only.
- Any new scrollbar/contrast tokens in `@theme` — reuse existing `zinc-*` scale only.
- Automated visual-regression tooling — none exists today; manual/screenshot verification is sufficient for this change.
- Per-component scrollbar overrides — one global rule covers all current and future `overflow-y-auto` containers.

## Capabilities

### New Capabilities
None.

### Modified Capabilities
None — no pinned color/contrast requirement exists in `decision-dashboard/spec.md` or `decision-narrative/spec.md`; this is implementation-level, not spec-level.

## Approach

1. **Edge contrast** — `app/(dashboard)/components/ArgumentGraph.tsx:52-61`: add `className="stroke-zinc-200"` to edge `<line>` elements, change `opacity={0.35}` to `opacity={0.5}`. SVG root and conflict node remain untouched.
2. **Scrollbar theming** — `app/globals.css`: add one global rule (`*` or a shared selector) using `scrollbar-color: var(--color-zinc-700 or similar) transparent` / `scrollbar-width: thin`, plus `::-webkit-scrollbar`, `::-webkit-scrollbar-thumb`, `::-webkit-scrollbar-track` fallback. Thumb ~`zinc-700`/`zinc-600`, track ~`zinc-900`/transparent, matching existing `border-zinc-800` chrome. No per-component edits.

## Affected Areas

| Area | Impact | Description |
|------|--------|--------------|
| `app/(dashboard)/components/ArgumentGraph.tsx:52-61` | Modified | Edge `<line>` gets explicit `stroke-zinc-200`, opacity 0.35 → 0.5 |
| `app/globals.css` | Modified | New global scrollbar CSS rule (scrollbar-color/width + webkit fallback) |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| `zinc-200` reads too bright relative to node fills | Low | Already validated via computed contrast (4.45:1) vs. saturated buy/sell node colors; stays visually subordinate |
| Webkit fallback selectors conflict with future component-level scroll styling | Low | Global rule only sets color/width; no layout/size properties |

## Rollback Plan

Both changes are isolated, single-file CSS/attribute edits with no state or API impact. Revert via `git revert` of the commit, or manually restore `opacity={0.35}` / remove `stroke-zinc-200` and delete the added scrollbar CSS block.

## Dependencies

None.

## Success Criteria

- [ ] Graph edges visibly distinguishable against the dashboard background in a manual screenshot check.
- [ ] All 3 scrollable containers (drill-down panel, desktop sidebar, mobile drawer) render themed scrollbars matching dashboard chrome in Chrome, Firefox, and Safari.
- [ ] Conflict node styling unchanged.
- [ ] No existing test regressions (`tests/e2e/dashboard.spec.ts`, `tests/dashboard/lib/graphLayout.test.ts`).

## Proposal question round

Both open design questions from exploration were resolved by the user before this phase ran — no re-litigation needed:
1. Edge color: `zinc-200` at 50% opacity (own `stroke-zinc-200` class, not `currentColor`), leaving the conflict node untouched.
2. Scrollbar scope: global fix in `app/globals.css` covering all 3 `overflow-y-auto` sites, using standard `scrollbar-color`/`scrollbar-width` with webkit fallback and existing `zinc-*` tokens.

No further proposal-shaping questions are needed for this change.
