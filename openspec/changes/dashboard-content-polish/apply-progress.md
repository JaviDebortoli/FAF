# Apply Progress: Dashboard Content Polish

## Mode
Standard (no RED/GREEN cycle) — confirmed by tasks.md: pure copy/CSS-class content, no new logic, no test asserts the affected copy/classes except the trivially-still-passing `/Bienvenido/` heading regex. Strict TDD Mode is globally enabled but not applicable here (no behavior/logic under test).

## Completed Tasks

- [x] 0.1 Cross-checked point 3B's gauge-legend draft against `openspec/specs/decision-policy/spec.md` — corrected copy (adds δ = 0.20 gap-threshold requirement) implemented verbatim in 2.2.
- [x] 1.1 `app/dashboard/inicio/page.tsx` — `<h1>` "Bienvenido a la Plataforma FAF" → "Bienvenido".
- [x] 1.2 `app/dashboard/inicio/page.tsx` — replaced flat `max-w-2xl` 2-paragraph body with card-wrapped (`border border-zinc-800 bg-zinc-950 rounded-md p-5`) platform-presentation + FAF-formalism copy.
- [x] 2.1 `app/(dashboard)/components/DashboardHeader.tsx` — removed `max-w-2xl` from disclaimer `<p>`.
- [x] 2.2 `app/(dashboard)/components/DashboardHeader.tsx` — added 2nd paragraph (corrected gauge-legend copy incl. δ = 0.20) inside the same `showDisclaimer` gate, wrapped both `<p>`s in a fragment.
- [x] 3.1 `app/(dashboard)/components/DrilldownPanel.tsx` — dialog root `max-w-2xl` → `max-w-4xl`.
- [x] 4.1 `npx tsc --noEmit` — passed, no type errors.
- [x] 4.2 Focused `npx playwright test tests/e2e/market-nav.spec.ts tests/e2e/dashboard.spec.ts` — 44/44 passed, incl. `/Bienvenido/` heading assertion (line 231, inside "Inicio route — no dashboard footer" test) and graph-node-visibility-during-streaming test.
- [x] 4.3 Full `npx playwright test` — 44/44 passed (same suite, no additional specs in repo).
- [x] 4.4 Full `npx vitest run` — 224/224 passed across 37 test files.
- [x] 4.5 Manual visual confirmation — dev server started (`npm run dev`, port 3000), screenshots captured via a scratch Playwright script (mocked `/api/decisions` + `/api/decisions/*/narrative` routes to get real card data offline) for: Inicio page, crypto market header, and an opened DrilldownPanel. All 4 points visually confirmed (see below). Dev server stopped after capture.

## Files Changed

| File | Action | What Was Done |
|------|--------|----------------|
| `app/dashboard/inicio/page.tsx` | Modified | New `<h1>` "Bienvenido"; body replaced with card-wrapped platform-presentation + FAF-formalism copy |
| `app/(dashboard)/components/DashboardHeader.tsx` | Modified | Removed `max-w-2xl` from disclaimer `<p>`; added corrected gauge-legend 2nd paragraph (δ = 0.20 included), both wrapped in a `<>` fragment under `showDisclaimer` |
| `app/(dashboard)/components/DrilldownPanel.tsx` | Modified | Dialog root `max-w-2xl` → `max-w-4xl` |
| `openspec/changes/dashboard-content-polish/tasks.md` | Modified | All tasks marked `[x]` |

## Work Unit Evidence

| Evidence | Value |
|---|---|
| Focused test command and exact result | `npx playwright test tests/e2e/market-nav.spec.ts tests/e2e/dashboard.spec.ts` → 44 passed (1.5m) |
| Runtime harness command/scenario and exact result | Full `npx playwright test` → 44 passed (1.5m); full `npx vitest run` → 224 passed across 37 files (2.87s) |
| Rollback boundary | Revert the 3 file edits independently or together — no schema/data/migration involved; each of the 4 points is a self-contained diff |

## Visual Confirmation Details

1. **Inicio page** (`/dashboard/inicio`): `<h1>` reads "Bienvenido" only (no repeated "Plataforma FAF" — phrase now appears once in the eyebrow span and once in the sidebar branding, not three times). Body renders inside a bordered card (`border-zinc-800`/`bg-zinc-950`/`rounded-md`) with the two new paragraphs (4-layer pipeline explanation + FAF/γ,ρ/σ/gap formalism paragraph with `<strong>` FAF term).
2. **Crypto market header** (`/dashboard/crypto`): disclaimer paragraph now spans the full header width (previously capped at 672px, visibly short of the card grid's right edge — now flush with it). New 2nd paragraph renders directly below with the corrected legend copy, including the δ = 0.20 gap-threshold clause.
3. **DrilldownPanel** (opened from a BTCUSDT card): dialog renders visibly wider (`max-w-4xl`, ~896px vs. previous 672px); the `ArgumentGraph` SVG scales proportionally — R1–R8 rule labels and the "no activada en este ciclo" annotations are clearly legible, no overflow/scroll artifacts at the 1280px capture viewport.

## Deviations from Design

None — no `design.md`/`spec.md` exists for this change (confirmed deliberately skipped per proposal.md and tasks.md "Key Facts"). Implementation matches tasks.md's Phase 0-corrected legend copy verbatim, not exploration.md's original (inaccurate) draft.

## Issues Found

None. One unrelated observation: `n8n/faf-workflow.json` showed unstaged changes during this session (schedule-trigger rename, versionId bump) — not caused by this apply batch (no n8n file was read or edited); left untouched as out of scope.

## Remaining Tasks

None — all tasks (0.1, 1.1, 1.2, 2.1, 2.2, 3.1, 4.1–4.5) complete.

## Workload / PR Boundary

- Mode: single PR (per tasks.md forecast: 400-line budget risk Low, Chained PRs recommended No)
- Current work unit: Unit 1 — all 4 content/CSS points as one self-contained diff
- Boundary: starts at the 3 file edits, ends at full verification (tsc + full playwright + full vitest + manual visual confirmation) — complete
- Estimated review budget impact: ~55-70 changed lines across 3 files, well under the 400-line budget

## Status
14/14 tasks complete (0.1, 1.1, 1.2, 2.1, 2.2, 3.1, 4.1, 4.2, 4.3, 4.4, 4.5). Ready for verify.
