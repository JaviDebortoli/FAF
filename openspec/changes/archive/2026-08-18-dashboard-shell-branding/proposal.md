# Proposal: dashboard-shell-branding — sidebar branding + shared footer

## Intent

`market-nav-redesign`'s own exploration noted two mockup elements (sidebar branding block, shared disclaimer footer) as differences but never turned them into requirements — a genuine, never-specified spec gap, not a reversal of any prior decision. Today the sidebar has no title/identity block, and the footer is inconsistent: present with the wrong copy on `crypto/page.tsx` only, absent on every placeholder-market route. This change closes that gap to match the mockup.

## Scope

### In Scope — locked decisions

1. **Sidebar branding block**: insert "Plataforma FAF" + "Recomendaciones financieras explicables en tiempo real" as the first child of `Sidebar.tsx`'s desktop `<nav>`, above the market groups. Restyled with existing zinc/token utilities — no new `@theme` tokens (consistent with `market-nav-redesign`'s "Adapt, not Replace").
2. **Shared fixed footer**: add one `<footer>` to `app/dashboard/layout.tsx` (the sole shared ancestor of every `/dashboard/*` route), exact mockup copy verbatim:
   > Las recomendaciones emitidas por este sistema son de carácter informativo y educativo. Los resultados se basan en el Marco Argumentativo Financiero (FAF) y no constituyen asesoría financiera personalizada.
   >
   > FAF - Marco Argumentativo Financiero - Desarrollado por Javier M. Debórtoli.

   `fixed bottom-0 ... md:left-64`, matching `Sidebar.tsx`'s existing `md:w-64`.
3. **Remove the old crypto-only footer** ("Trabajo de tesis — FAF Platform. σ, γ, ρ computados por el motor de decisión determinístico; θ = 0.67.") from `crypto/page.tsx`. Confirmed test-safe (zero test references) and not an information loss — θ/σ/γ/ρ already surface in `DecisionCard.tsx`, `ScoreGauge.tsx`'s aria-label, `ThesisScores.tsx`, `ArgumentGraph.tsx`; the "no AI-generated text" disclaimer already lives independently in `crypto/page.tsx`'s header.
4. **Bottom-padding reservation**: content area (`layout.tsx`'s content wrapper and/or both page `<main>`s) needs bottom padding sized to the footer's rendered height, accounting for 2-line wrap on narrow viewports, so the fixed footer never overlaps the last card row / placeholder text. Real risk per exploration — must be verified, not assumed.

### In Scope — resolved (orchestrator defaults, flag if wrong)

5. **Mobile drawer branding**: mockup has no mobile sidebar reference, so this is undecided by mockup evidence alone. Default: add the same title/subtitle block to the top of `Sidebar.tsx`'s `mobileOpen` branch too, for desktop/mobile visual consistency — small, low-risk.
6. **Attribution line verbatim**: "Desarrollado por Javier M. Debórtoli" is user-supplied ground truth (not an orchestrator guess) — copied verbatim, no rewording.

### Out of Scope / Non-Goals

- No new routes, no new data, no visual-identity replacement beyond this gap (colors/fonts unchanged, per `market-nav-redesign`'s prior "Adapt" decision).
- No change to any Tier 1/Tier 2 card, gauge, or graph content — informational values already surface elsewhere.

## Capabilities

### New Capabilities
None.

### Modified Capabilities
- `market-navigation`: sidebar gains a branding header (desktop nav + mobile drawer); adds shared-footer requirement at the shell level.

## Approach

Insert the branding block as `Sidebar.tsx`'s first nav child (desktop + mobile). Add one shared `<footer>` to `app/dashboard/layout.tsx` so all ~10 routes inherit it for free. Delete `crypto/page.tsx`'s old footer. Reserve bottom padding sized to the footer's rendered height on the content wrapper.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `app/(dashboard)/components/Sidebar.tsx` | Modified | Branding block in desktop `<nav>` and mobile drawer |
| `app/dashboard/layout.tsx` | Modified | Shared fixed footer + bottom-padding reservation |
| `app/dashboard/crypto/page.tsx` | Modified | Remove old per-page footer |
| `openspec/specs/market-navigation/spec.md` | Modified | New sidebar-branding + shared-footer requirements |
| `tests/e2e/market-nav.spec.ts` / `dashboard.spec.ts` | Modified | New assertions: branding text, shared footer present on crypto + a placeholder page, old footer text absent, no footer/content overlap |
| No changes | — | `src/rdf`, `src/stream`, `src/laf`, `src/decision`, `src/cycle`, `src/market`, `app/api/*`, Tier 1/Tier 2 card/gauge/graph components |

## Risks

| Risk | Status | Mitigation |
|------|--------|------------|
| Fixed-footer overlaps card grid / placeholder text on short or narrow viewports | Open, must-verify | Size bottom padding to footer's rendered height incl. 2-line wrap; add a Playwright layout assertion (footer/last-card bounding boxes don't intersect) |
| Copy-identity shift: "Trabajo de tesis — FAF Platform" thesis framing → mockup's personal-attribution line | Accepted, not open | User-supplied ground truth; θ/σ/γ/ρ values preserved elsewhere, no information loss |
| PR review budget | Low | 3 files touched (+ spec/tests), well under 400-line budget; single PR expected, `sdd-tasks` makes the final call |

## Rollback Plan

Revert the branch/PR. No schema, persistence, or reasoning-core change is involved. If the fixed footer causes layout issues post-merge, remove it from `layout.tsx` and restore `crypto/page.tsx`'s prior footer independently — no data migration needed.

## Dependencies

- None external. No new npm packages.

## Success Criteria

- [ ] Sidebar renders "Plataforma FAF" + subtitle above market groups in both desktop nav and mobile drawer.
- [ ] Shared footer with exact mockup copy renders on `crypto/page.tsx` AND at least one placeholder-market page, proving it's genuinely shared.
- [ ] Old crypto-only footer text is fully removed and absent from the DOM.
- [ ] Fixed footer never overlaps the last card row / placeholder text on narrow viewports (Playwright layout assertion).
- [ ] `npx vitest run`, `npx tsc --noEmit`, `npx playwright test` all green (Strict TDD Mode).

## Proposal question round

Decisions 1–4 are locked from confirmed exploration; defaults 5–6 are stated above for correction, not new blocking questions. Two small product questions remain genuinely open and non-blocking for `sdd-spec`/`sdd-design` to proceed:

1. Should "Desarrollado por Javier M. Debórtoli" ever link to anything (portfolio, thesis PDF, LinkedIn), or stay plain text for this slice?
2. Is the disclaimer/attribution copy final for this slice, or does it need a later legal/advisor review pass before any public deployment?

If unanswered, this proposal proceeds with: plain-text attribution (no link), and copy treated as final for this slice (no additional review gate).
