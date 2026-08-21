# Proposal: Inicio Content Polish

## Proposal question round

A proposal-shaping question round already ran during exploration (`sdd-explore`) via `AskUserQuestion`: the heading copy was explicitly open-ended by design, and the user confirmed the final text ("Bienvenido! Recomendaciones determinísticas y explicables") in response. All 4 bundled points are now resolved with no outstanding product ambiguity — no further round needed before finalizing this proposal.

## Intent

Inicio (the platform's landing page) currently under-sells its own identity: its pipeline diagram is generic zinc/monochrome despite the app already having an established "signature" green (`--color-buy`) for active/here-you-are UI state, its info-card body text sits at the same density as secondary disclaimer copy elsewhere even though it's the page's sole content block, its `<h1>` is a bare "Bienvenido" with no differentiating value proposition, and it duplicates a navigation path (CTA) that the sidebar already covers. This is a bundled content/visual polish pass — no new capability, no architecture change.

## Scope

### In Scope
- Remove the `/dashboard/crypto` CTA block from `app/dashboard/inicio/page.tsx`.
- Recolor `PipelineDiagram.tsx` to `var(--color-buy)` (nodes, connectors at full opacity, labels) via literal SVG props; rewrite the stale "avoids `--color-buy`" header comment.
- Bump both info-card paragraphs from `text-sm` to `text-base`.
- Replace `<h1>Bienvenido</h1>` with `<h1>Bienvenido! Recomendaciones determinísticas y explicables</h1>` (verbatim, exclamation mark kept).
- Spec delta: `openspec/specs/decision-dashboard/spec.md` — "Crypto dashboard route under market navigation" requirement/scenario, removing CTA-reachability references (CTA removed; direct URL + sidebar link remain intact reachability paths).

### Out of Scope
- Diagram topology, layout module, or new nodes.
- Any change to `/dashboard/crypto` or sidebar navigation itself.
- Test file edits (existing loose `/Bienvenido/` e2e regex stays compatible; no test asserts CTA, colors, or paragraph size class).

## Capabilities

### New Capabilities
None.

### Modified Capabilities
- `decision-dashboard`: "Crypto dashboard route under market navigation" requirement/scenario text updated to drop CTA-reachability references, following the repo's MODIFIED-requirement `(Previously: ...)` convention.

## Approach

Mechanical edits in 2 files plus 1 spec delta. Diagram recolor reuses the proven `var(--color-buy)` literal-SVG-prop mechanism from `ArgumentGraph.tsx` (Tailwind `stroke-buy`/`fill-buy` utilities have zero precedent and are unverified for SVG). Text-size bump is a deliberate, isolated divergence from the app's uniform `text-sm` body scale, justified by Inicio's single-content-block layout. No design.md needed — copy/CSS-only, no new components or architecture decisions.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `app/dashboard/inicio/page.tsx` | Modified | Remove CTA, `text-base` paragraphs, new `<h1>` |
| `app/(dashboard)/components/PipelineDiagram.tsx` | Modified | Recolor to `--color-buy`, comment rewrite |
| `openspec/specs/decision-dashboard/spec.md` | Modified | Drop CTA-reachability references |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Green label text may be low-legibility on `fill-zinc-900/50` box | Low | Quick post-implementation visual check |
| `text-base` divergence read as inconsistency in review | Low | Flag explicitly as intentional in PR description |

## Rollback Plan

Revert the 2-file diff and the spec delta; no data/migration involved.

## Dependencies

None.

## Success Criteria

- [ ] CTA removed; sidebar/direct-URL routes to `/dashboard/crypto` still work
- [ ] Diagram renders in `--color-buy` green with legible labels
- [ ] Info-card paragraphs render at `text-base`
- [ ] New `<h1>` text matches exactly
- [ ] `decision-dashboard/spec.md` delta applied following `(Previously: ...)` convention
- [ ] `tests/e2e/market-nav.spec.ts` passes unchanged
