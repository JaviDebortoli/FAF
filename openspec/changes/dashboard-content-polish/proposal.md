# Proposal: Dashboard Content Polish

## Intent

Four small UI/content gaps remain after `inicio-home-section`: the Inicio page repeats "Plataforma FAF" three times on screen and its body is placeholder-quality flat text; the market-header disclaimer stops short of the card grid's width; the `ScoreGauge`'s needles/tick/gap have no explanation anywhere despite appearing on every Tier 1 card; and `DrilldownPanel`'s argument graph is cramped at `max-w-2xl`, making rule labels hard to read. This change bundles the 4 fixes since each is small, independent, and already fully resolved by exploration.

## Scope

### In Scope
1. Inicio `<h1>`: "Bienvenido a la Plataforma FAF" → "Bienvenido" (drops the eyebrow/sidebar repeat, still matches `market-nav.spec.ts:231`'s `/Bienvenido/` regex).
2. Inicio body: replace the flat `max-w-2xl` 2-paragraph div with a card-wrapped (`border border-zinc-800 bg-zinc-950 rounded-md p-5`) platform-presentation + FAF-formalism explanation, per exploration's grounded draft copy.
3. `DashboardHeader.tsx` disclaimer `<p>`: drop `max-w-2xl` so it spans full width, matching the card grid below.
4. `DashboardHeader.tsx`: add a 2nd paragraph (same `showDisclaimer` gate, no new prop) explaining the gauge's green/rose needles (σ⁺/σ⁻), amber tick (θ=0.67), and gap (|σ⁺−σ⁻|).
5. `DrilldownPanel.tsx` dialog root: `max-w-2xl` → `max-w-4xl` (confirmed single-lever fix; `ArgumentGraph`'s fixed-viewBox SVG scales proportionally, addressing both illegibility and vertical-scroll complaints; safe on tested 1280px/375px viewports).

### Out of Scope
- `max-w-5xl` (documented alternative, not the recommendation) unless reviewer requests a larger jump.
- Any spec-level requirement changes (all 4 points are unconstrained implementation/copy details).
- Manual/visual verification at untested in-between viewports (e.g. 768px tablet) — flagged as advisable, not required.

## Capabilities

### New Capabilities
None.

### Modified Capabilities
None — exploration confirmed no `openspec/specs/*` requirement pins any of the 4 pieces of copy or CSS values touched. One cross-check flagged for `sdd-spec`/`sdd-design`: the new gauge-legend copy's θ/σ wording must be verified against `decision-policy/spec.md`'s canonical wording, per `openspec/config.yaml`'s "formulas/thresholds must match the FAF paper exactly" rule — a copy-accuracy check, not a new requirement.

## Approach

Direct copy/className edits across 3 files, no new components or props. Points 1–2 are contained to `app/dashboard/inicio/page.tsx`. Points 3–4 share `DashboardHeader.tsx`'s existing `showDisclaimer` gate. Point 5 is a single className change on `DrilldownPanel.tsx`'s dialog root, which proportionally scales the fixed-viewBox `ArgumentGraph` SVG with no other file involved.

## Affected Areas

| Area | Impact | Description |
|------|--------|--------------|
| `app/dashboard/inicio/page.tsx` | Modified | New `<h1>`, card-wrapped body copy |
| `app/(dashboard)/components/DashboardHeader.tsx` | Modified | Drop `max-w-2xl`; add gauge-legend paragraph |
| `app/(dashboard)/components/DrilldownPanel.tsx` | Modified | `max-w-2xl` → `max-w-4xl` on dialog root |
| `tests/e2e/market-nav.spec.ts` | Modified | Re-verify `/Bienvenido/` heading regex (line 231) |
| `tests/e2e/dashboard.spec.ts` | Re-verified | Graph-node visibility/bounding-box test, regression check post-width-change (no edit expected) |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Gauge-legend copy drifts from `decision-policy/spec.md`'s canonical θ/σ wording | Low | Explicit cross-check flagged for `sdd-spec`/`sdd-design` |
| `max-w-4xl` insufficient vs. `max-w-5xl` for legibility goal | Low | `max-w-5xl` documented as fallback alternative if reviewer wants a larger jump |
| Untested 672–1280px viewport range behaves unexpectedly | Low | `w-full` already bounds practical risk; manual check advisable during apply |

## Rollback Plan

Revert the 3 file edits (and the one test assertion touch) independently or together — no schema, data, or migration involved. Each of the 4 points is a self-contained diff; any one can be reverted without affecting the others.

## Dependencies

None external.

## Success Criteria

- [ ] Inicio `<h1>` reads "Bienvenido"; body shows the card-wrapped platform-presentation + FAF-formalism copy.
- [ ] Market-header disclaimer spans full grid width on `/dashboard/crypto` and placeholder market views.
- [ ] Gauge-legend paragraph renders under the disclaimer wherever `showDisclaimer` is true.
- [ ] `DrilldownPanel` opens at `max-w-4xl`, graph legible at 1280px desktop, no overflow at 375px mobile.
- [ ] `npx vitest run`, `npx tsc --noEmit`, `npx playwright test` all green (Strict TDD Mode).

## Proposal question round

No open questions remain. Exploration (`openspec/changes/dashboard-content-polish/exploration.md`) already resolved all 4 points with concrete current-state readings, grounded draft copy, spec-conflict checks, and a test-impact catalog — the user-provided bundled scope carries these forward as binding. One non-blocking item to flag: point 4's gauge-legend θ/σ wording should be cross-checked against `decision-policy/spec.md` during `sdd-spec`/`sdd-design`, which exploration did not complete.
