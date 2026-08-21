# Apply Progress: inicio-content-polish

**Mode**: Standard (pure copy/CSS/color content — no RED/GREEN cycle per tasks.md Phase 3 header)

## Completed Tasks (all except deferred Phase 4)

### Phase 1: Content and Copy (`app/dashboard/inicio/page.tsx`)
- [x] 1.1 Removed the entire `<Link href="/dashboard/crypto">...Ver panel de Criptomonedas →</Link>` CTA block. Also removed the now-unused `import Link from 'next/link';`.
- [x] 1.2 `<h1>Bienvenido</h1>` → `<h1>Bienvenido! Recomendaciones determinísticas y explicables</h1>` (verbatim, exclamation kept). Rendered as multi-line JSX text (consistent with existing `<p>` style in the file) — JSX collapses to the exact single-space-joined string.
- [x] 1.3 Both info-card `<p>` elements' wrapping `<div>` class changed `text-sm text-zinc-400` → `text-base text-zinc-400`.
- Extra (not in tasks.md but directly caused by 1.1): rewrote the stale header doc-comment line "...before dropping into live market data via the CTA below" → "...before navigating into live market data via the sidebar (`inicio-content-polish` — the former on-page CTA to `/dashboard/crypto` was removed as a duplicate of the sidebar's Criptomonedas link)." to avoid a factually-wrong comment referencing removed code.

### Phase 2: Diagram Recolor (`app/(dashboard)/components/PipelineDiagram.tsx`)
- [x] 2.1 Rewrote the stale "Strictly zinc/monochrome... deliberately avoids `--color-buy`/`--color-sell`" header comment paragraph to explain the new rationale: reuses the platform's established "active/current" green (same treatment as `Sidebar.tsx`'s active-link state) via the proven `var(--color-buy)` literal-SVG-prop mechanism from `ArgumentGraph.tsx`'s `THESIS_COLOR`.
- [x] 2.2 Connector `<line>`: `className="stroke-zinc-600"` → `stroke="var(--color-buy)"`, removed `opacity={0.85}`.
- [x] 2.3 Arrowhead `<polyline>`: same treatment — `stroke="var(--color-buy)"`, `opacity={0.85}` removed.
- [x] 2.4 Node `<rect>`: `className="fill-zinc-900/50 stroke-zinc-700"` → literal props `fill="var(--color-buy)" fillOpacity={0.1} stroke="var(--color-buy)"`.
- [x] 2.5 Node `<text>` label: `className="fill-zinc-300 font-mono text-[13px]"` → `fill="var(--color-buy)"` literal prop + `className="font-mono text-[13px]"` (typography stays in className, color moves to literal prop — cleanest split).

### Phase 3: Verification
- [x] 3.1 `npx tsc --noEmit` — clean, zero errors.
- [x] 3.2 `npx playwright test tests/e2e/market-nav.spec.ts tests/e2e/dashboard.spec.ts` — 45/45 passed. Confirmed test #28 (`market-nav.spec.ts:254` "Inicio route — no dashboard footer") contains the `/Bienvenido/` heading regex at line 263 and it matched the new longer heading text.
- [x] 3.3 Full `npx playwright test` — same 45/45 passed (full suite = the two files above; no other e2e specs exist).
- [x] 3.4 Full `npx vitest run` — 224/224 passed across 37 test files, zero regressions.
- [x] 3.5 Manual visual confirmation via a one-off Playwright screenshot script (dev server on :3100, full-page + diagram-scoped screenshots): (a) CTA fully gone — page now ends right after `<PipelineDiagram />`; (b) diagram renders in `--color-buy` green, box fill is a very dark green tint (fillOpacity 0.1) so the bright green label text ("Datos", "Indicadores", "Reglas", "Recomendación") reads clearly and legibly — no legibility problem found, contrast is good; (c) info-card paragraphs are visibly larger than the sidebar's `text-xs`/other `text-sm` copy; (d) heading renders exactly "Bienvenido! Recomendaciones determinísticas y explicables". All 4 sub-checks pass honestly, no caveats.

### Phase 4: Spec Delta — deliberately deferred to `sdd-archive`
- [ ] 4.1 NOT done here by design. `openspec/specs/decision-dashboard/spec.md` (live main spec) was intentionally NOT touched. The MODIFIED-requirement delta lives at `openspec/changes/inicio-content-polish/specs/decision-dashboard/spec.md` and merges at archive time, per this repo's established convention (same pattern as `inicio-home-section` and prior changes).

## Work Unit Evidence

| Evidence | Value |
|---|---|
| Focused test command and exact result | `npx playwright test tests/e2e/market-nav.spec.ts tests/e2e/dashboard.spec.ts` → 45 passed, 0 failed |
| Runtime harness command/scenario and exact result | Same command (dashboard.spec.ts + market-nav.spec.ts) is also the designated runtime harness per tasks.md's Suggested Work Units table → 45 passed |
| Rollback boundary | Revert `app/dashboard/inicio/page.tsx` + `app/(dashboard)/components/PipelineDiagram.tsx` (git diff: 2 files, 28 insertions/22 deletions total) — no data/migration involved |

## Files Changed
| File | Action | What Was Done |
|------|--------|---------------|
| `app/dashboard/inicio/page.tsx` | Modified | Removed CTA + unused `Link` import, new `<h1>` text, `text-base` paragraphs, doc-comment fix |
| `app/(dashboard)/components/PipelineDiagram.tsx` | Modified | Recolored all SVG elements to `var(--color-buy)` via literal props, rewrote header doc comment |

## Deviations from Design
None — no design.md exists for this change (deliberately skipped, pure copy/CSS/color polish). Implementation matches proposal.md and tasks.md exactly, plus two small doc-comment accuracy fixes not explicitly itemized in tasks.md but directly required by the CTA-removal and recolor changes (avoiding factually stale comments), consistent with the repo's comment-accuracy convention already established by task 2.1.

## Issues Found
None.

## Status
9/10 tasks complete (all of Phase 1-3; Phase 4 intentionally deferred to sdd-archive per convention, not a gap). Ready for sdd-verify.
