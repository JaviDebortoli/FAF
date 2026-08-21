# Proposal: Inicio Pipeline Diagram + Phantom Scroll Fix

## Intent

Two small, related UX defects on the dashboard: (1) `/dashboard/inicio` has a visually empty gap below its info card with nothing explaining the product's data→decision flow, and (2) `/dashboard/crypto` and `/dashboard/{market}` show a phantom vertical scrollbar even on near-empty routes (`EmptyState`, `MarketPlaceholder`), because `<main>`'s `min-h-screen` double-stacks with `(with-footer)/layout.tsx`'s `pb-48` (192px), always rendering ≥ `100vh + 192px` regardless of content.

## Scope

### In Scope
- New static SVG `PipelineDiagram` component illustrating Datos → Indicadores → Reglas → Recomendación on Inicio.
- Insert `PipelineDiagram` between the info card and CTA in `app/dashboard/inicio/page.tsx`.
- Fix `<main>` sizing in `crypto/page.tsx` and `[market]/page.tsx`: `min-h-screen` → `min-h-[calc(100vh-12rem)]`.
- Cross-referencing comments at both `<main>` touch points and `(with-footer)/layout.tsx`'s `pb-48` documenting the coupling.
- New e2e test asserting no phantom scroll on a short-content market route.

### Out of Scope
- Dynamic/data-driven diagram layout (no `lib/pipelineLayout.ts` — matches `icons.tsx` precedent, not `graphLayout.ts`).
- Unit tests for `PipelineDiagram` (static markup, mirrors `icons.tsx`).
- Any change to `pb-48`'s value or footer layout itself.
- `app/dashboard/inicio/page.tsx`'s own `min-h-screen` (confirmed unaffected — not wrapped by `(with-footer)/`).

## Capabilities

### New Capabilities
None — no spec pins Inicio's visual content.

### Modified Capabilities
None — `market-navigation` spec's "footer MUST NOT overlap content" requirement is preserved unchanged; the fix removes only the double-counted `min-h-screen`, not `pb-48`.

## Approach

**Diagram**: Hardcode a static `viewBox="0 0 960 200"` SVG directly in `app/(dashboard)/components/PipelineDiagram.tsx` (no separate layout module — mirrors `icons.tsx`'s precedent for non-data-driven SVG). 4 rounded-rect nodes (~140×64) labeled Datos/Indicadores/Reglas/Recomendación, connected by lines + chevron arrowheads. Strictly zinc/monochrome (`stroke-zinc-700` boxes, `fill-zinc-300` labels, `stroke-zinc-600` connectors at ~0.8-0.9 opacity) — more visually present than `ArgumentGraph`'s muted edges since this is Inicio's hero visual, and deliberately avoids buy/sell colors since it illustrates a generic process. `role="img"` + `<title>/<desc>` matching `ArgumentGraph`'s a11y pattern.

**Scroll fix**: Replace `min-h-screen` with `min-h-[calc(100vh-12rem)]` in both `<main>` elements, reusing the exact `12rem` literal already in `pb-48` (not re-derived). Preserves "fill the screen" intent on short-content routes while eliminating the double-count.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `app/(dashboard)/components/PipelineDiagram.tsx` | New | Static 4-node SVG pipeline diagram |
| `app/dashboard/inicio/page.tsx` | Modified | Insert `<PipelineDiagram/>` between card and CTA |
| `app/dashboard/(with-footer)/crypto/page.tsx` | Modified | `<main>` className: `min-h-screen` → `min-h-[calc(100vh-12rem)]` |
| `app/dashboard/(with-footer)/[market]/page.tsx` | Modified | Identical className change |
| `app/dashboard/(with-footer)/layout.tsx` | Modified (comment only) | Document `pb-48` ↔ `calc(100vh-12rem)` coupling |
| `tests/e2e/market-nav.spec.ts` | Modified | New "no phantom scroll" assertion on a short-content route |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| `calc(100vh-12rem)` coupled to `pb-48`'s literal value across sibling files, no compile-time enforcement | Low | Cross-referencing comments at all 3 touch points |
| Existing "footer never overlaps content" e2e test could already be borderline/failing independent of this change | Low | `sdd-verify` confirms pass/fail before and after to isolate any pre-existing issue |

## Rollback Plan

Both changes are isolated and independently revertible: drop the `<PipelineDiagram/>` import/JSX line to restore Inicio, or revert the two `<main>` className edits to restore prior (buggy) scroll behavior. No data migrations, no spec changes, no shared state.

## Dependencies

None.

## Success Criteria

- [ ] Inicio page shows the 4-node pipeline diagram between the info card and CTA, matching the hand-drawn zinc/monochrome style.
- [ ] `/dashboard/crypto` and `/dashboard/{market}` no longer show a phantom vertical scrollbar on short-content states (`EmptyState`/`MarketPlaceholder`).
- [ ] Existing "footer never overlaps content" e2e test still passes.
- [ ] New "no phantom scroll" e2e test passes on a short-content market route.

## Proposal question round

None. Both points were fully resolved during exploration via a user-confirmed `AskUserQuestion` round (diagram style, placement, color treatment, and the `calc(100vh-12rem)` fix approach). No open product/business questions remain for this proposal.
