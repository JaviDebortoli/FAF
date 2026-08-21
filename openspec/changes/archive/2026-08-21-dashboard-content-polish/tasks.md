# Tasks: Dashboard Content Polish

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~55-70 (3 files, content/className only) |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | All 4 content/CSS points (single self-contained diff) | PR 1 | `npx playwright test tests/e2e/market-nav.spec.ts tests/e2e/dashboard.spec.ts` | Full `npx playwright test` + `npx vitest run` | Revert the 3 file edits; each point independently revertible |

## Phase 0: Copy Accuracy Investigation

- [x] 0.1 Cross-check point 3B's gauge-legend draft against `openspec/specs/decision-policy/spec.md` (done in this planning pass — see finding below). **Finding**: the draft sentence "la aguja que lo supera y aventaja a la otra define la recomendación" omits the spec's gap threshold δ = 0.20 (`Requirement: Three-way decision rule` — BUY/SELL requires BOTH σ ≥ θ AND gap ≥ δ; omitting δ implies any lead suffices, which is inaccurate). Corrected 2-paragraph legend text to implement verbatim in task 2.2:
  > "El indicador semicircular de cada tarjeta muestra dos agujas: la verde (σ⁺) mide la evidencia a favor de comprar y la roja (σ⁻) la evidencia a favor de vender, ambas entre 0 y 1. La marca ámbar indica el umbral de decisión θ = 0.67, el puntaje mínimo que una tesis debe alcanzar. La recomendación solo se emite si la aguja dominante supera θ y además la distancia con la otra aguja — el "gap" (|σ⁺ − σ⁻|) que se muestra debajo del indicador — alcanza al menos δ = 0.20; si no, la plataforma no recomienda."

## Phase 1: Inicio Page (points 1+2)

- [x] 1.1 `app/dashboard/inicio/page.tsx` line 27: change `<h1>` text from "Bienvenido a la Plataforma FAF" to "Bienvenido".
- [x] 1.2 `app/dashboard/inicio/page.tsx` lines 29-39: replace the `<div className="flex max-w-2xl ...">` two-paragraph block with the card-wrapped `<div className="flex flex-col gap-4 rounded-md border border-zinc-800 bg-zinc-950 p-5 text-sm text-zinc-400">` containing exploration.md's platform-presentation + FAF-formalism paragraphs verbatim (γ/ρ, θ=0.67, σ⁺/σ⁻, gap notation, AI-narrative-has-own-disclaimer).

## Phase 2: DashboardHeader (points 3A+3B)

- [x] 2.1 `app/(dashboard)/components/DashboardHeader.tsx` line 24: remove `max-w-2xl` from the disclaimer `<p>` className (keep `text-sm text-zinc-400`).
- [x] 2.2 `app/(dashboard)/components/DashboardHeader.tsx`: add a second `<p className="text-sm text-zinc-400">` inside the same `showDisclaimer &&` block, after the existing disclaimer paragraph, with the corrected gauge-legend copy from Phase 0.1 (no new prop; same gate).

## Phase 3: DrilldownPanel (point 4)

- [x] 3.1 `app/(dashboard)/components/DrilldownPanel.tsx` line 53: change dialog root className `max-w-2xl` to `max-w-4xl`.

## Phase 4: Verification (no test edits expected — copy/CSS only)

- [x] 4.1 Run `npx tsc --noEmit` — confirm no type errors.
- [x] 4.2 Run `npx playwright test tests/e2e/market-nav.spec.ts tests/e2e/dashboard.spec.ts` — confirm line 231's `getByRole('heading', { name: /Bienvenido/ })` still matches the new "Bienvenido" `<h1>`, disclaimer `toContainText` assertions still pass (copy unchanged, only className), and no assertion depends on the removed `max-w-2xl`/added legend paragraph.
- [x] 4.3 Run full `npx playwright test` — confirm `dashboard.spec.ts`'s graph-node-visibility-during-streaming test (bounding box > 4px) still passes after the `DrilldownPanel` `max-w-4xl` change (regression check, no edit expected).
- [x] 4.4 Run full `npx vitest run` — confirm no unit test depends on the edited copy/classNames.
- [x] 4.5 Manual visual confirmation (dev environment, `npm run dev`): screenshot `/dashboard/inicio` (new "Bienvenido" heading + card body), a market view header e.g. `/dashboard/crypto` (full-width disclaimer + new gauge-legend paragraph), and an opened `DrilldownPanel` (wider `max-w-4xl` dialog, legible graph). Confirm all 4 points render as intended.

## Key Facts

- No `design.md`/`spec.md` for this change — all 4 points are unconstrained implementation/copy details (confirmed by exploration + proposal); no spec deltas required.
- Point 3B's legend copy was corrected in Phase 0 to include the δ = 0.20 gap threshold, matching `decision-policy/spec.md`'s "Three-way decision rule" requirement exactly (per `openspec/config.yaml`'s formula-accuracy rule).
- `market-nav.spec.ts:231`'s `/Bienvenido/` regex is unaffected — the new `<h1>` text "Bienvenido" still matches.
