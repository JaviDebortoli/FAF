# Verify Report: inicio-visual-and-scroll-fix

**Change**: inicio-visual-and-scroll-fix
**Mode**: Proposal + Exploration + Tasks only (no design.md/spec.md — deliberately skipped; confirmed appropriate: no spec pins Inicio's visual content or `min-h-screen`/scroll behavior, per exploration.md's "Spec-conflict check")
**Verdict**: **PASS**

## Completeness

All 15/15 tasks across 5 phases marked `[x]` in `tasks.md`, and independently confirmed to match the actual code state (not just trusted from `apply-progress.md`).

| Phase | Tasks | Status |
|---|---|---|
| 1 — Pipeline Diagram Component | 1.1–1.3 | Confirmed in code |
| 2 — Inicio Wiring | 2.1 | Confirmed in code |
| 3 — Phantom Scroll Fix (RED) | 3.1–3.3 | Confirmed in code + reproduced independently |
| 4 — Phantom Scroll Fix (GREEN) | 4.1–4.5 | Confirmed in code + reproduced independently |
| 5 — Verification | 5.1–5.5 | Re-run independently, all pass |

## Source Inspection (read in full, not trusted from apply-progress.md)

- `app/(dashboard)/components/PipelineDiagram.tsx` — confirmed: 4-node structure (`NODES` array), labels exactly "Datos" / "Indicadores" / "Reglas" / "Recomendación", strictly zinc/monochrome palette (`stroke-zinc-700` box borders, `fill-zinc-900/50` fill, `fill-zinc-300` labels, `stroke-zinc-600` connectors at 0.85 opacity — no `--color-buy`/`--color-sell` anywhere), `role="img"` + `<title>`/`<desc>` a11y pattern matching `ArgumentGraph.tsx`'s convention, `data-testid="inicio-pipeline-diagram"` on root `<svg>`.
- `app/dashboard/inicio/page.tsx` — confirmed: `<PipelineDiagram />` is genuinely wired in, positioned between the info-card `<div>` and the CTA `<Link>` (line 48, between lines 30–47 card and line 49 Link).
- `app/dashboard/(with-footer)/crypto/page.tsx` (line 54) and `app/dashboard/(with-footer)/[market]/page.tsx` (line 41) — confirmed `<main>` className is `min-h-[calc(100vh-12rem)]`, not `min-h-screen`. Cross-referencing comments confirmed present at both files and at `app/dashboard/(with-footer)/layout.tsx` (lines 18–25, adjacent to `pb-48`).
- No spec files touched: `git diff --stat -- openspec/specs/` returned empty output.

## e2e Test Inspection

`tests/e2e/market-nav.spec.ts:134` — "no phantom vertical scroll on a short-content route (EmptyState)" — read in full. Genuinely asserts `scrollHeight <= innerHeight + 1` (1px tolerance documented as scrollbar/subpixel-rounding only, not a weakening of intent) at an **explicit** `page.setViewportSize({ width: 1280, height: 800 })` — confirmed this matches the sibling "footer never overlaps content" test's 1280px case, not Playwright's default 1280×720 project viewport. The mid-cycle viewport correction reported in `apply-progress.md`'s "Deviations from Design" section is genuinely reflected in the final test code (explicit `setViewportSize` call present at line 135), not merely described in prose.

## Independent RED → GREEN Reproduction

Reproduced from scratch (not trusted from `apply-progress.md`'s report), using `git stash push` scoped to only the 2 `<main>` className fix files:

1. `git stash push -- "app/dashboard/(with-footer)/crypto/page.tsx" "app/dashboard/(with-footer)/[market]/page.tsx"` — confirmed via `grep` both files reverted to `min-h-screen`.
2. Ran `npx playwright test tests/e2e/market-nav.spec.ts -g "no phantom vertical scroll"` against reverted code:
   ```
   1) [chromium] › market-nav.spec.ts:134:7 › ... no phantom vertical scroll on a short-content route (EmptyState)
      Error: expect(received).toBeLessThanOrEqual(expected)
      Expected: <= 801
      Received:    992
   1 failed
   ```
   **RED confirmed** — exact match to the signature `apply-progress.md` reported (`Expected: <= 801, Received: 992`).
3. `git stash pop` — restored the fix; confirmed via `grep` both files show `min-h-[calc(100vh-12rem)]` again.
4. Ran `npx playwright test tests/e2e/market-nav.spec.ts -g "no phantom vertical scroll|footer never overlaps content"` against restored code:
   ```
   ok 1 › footer never overlaps content at 1280px (2.3s)
   ok 2 › footer never overlaps content at 375px (1.2s)
   ok 3 › no phantom vertical scroll on a short-content route (EmptyState) (1.5s)
   3 passed (19.4s)
   ```
   **GREEN confirmed**, and the "footer never overlaps content" test (both viewports) confirmed passing post-fix, matching `apply-progress.md`'s reported before/after comparison (2/2 pass both times, zero regression).

## Full Independent Test Run (re-executed from scratch, not trusted from apply-progress.md or orchestrator's spot-check)

| Command | Result | Exit Code |
|---|---|---|
| `npx tsc --noEmit` | No output, clean | 0 |
| `npx vitest run` | **224 passed / 37 files** (2.86s) | 0 |
| `npx playwright test` (full suite) | **45 passed** (1.5m) | 0 |

All 45 e2e tests pass, including task 5.2's focused subset (`market-nav.spec.ts` + `dashboard.spec.ts`), task 5.3's full suite, and task 5.4's full unit suite — matching `apply-progress.md`'s claimed counts, now independently reproduced.

## Design Coherence

No design.md exists — skipped, confirmed appropriate per proposal.md ("no spec pins Inicio's visual content", "market-navigation spec's footer requirement preserved unchanged"). Approach followed exactly as described in exploration.md's Recommendation section: `PipelineDiagram.tsx` mirrors `icons.tsx`'s static hardcoded pattern (no `lib/` layout split), scroll fix reuses the exact `12rem` literal from `pb-48` rather than re-deriving it.

## Issues

**CRITICAL**: None.

**WARNING**: None.

**SUGGESTION**: None.

One unrelated observation, not a defect in this change: `git status` shows `n8n/faf-workflow.json` modified, which is not listed in `apply-progress.md`'s "Files Changed" table and is unrelated to this change's scope — pre-existing working-tree state, not introduced by this SDD change, does not affect the verdict.

## Success Criteria (from proposal.md)

- [x] Inicio page shows the 4-node pipeline diagram between the info card and CTA, matching the hand-drawn zinc/monochrome style.
- [x] `/dashboard/crypto` and `/dashboard/{market}` no longer show a phantom vertical scrollbar on short-content states — confirmed via independent RED/GREEN reproduction.
- [x] Existing "footer never overlaps content" e2e test still passes — confirmed post-fix, both viewports.
- [x] New "no phantom scroll" e2e test passes on a short-content market route — confirmed, and confirmed it genuinely catches the regression via independent revert.

## Verdict

**PASS** — unconditional, matching `drilldown-graph-layout-fix`, `gauge-arc-contrast`, and `dashboard-content-polish` earlier this session. No live-production dependency exists for this change. Every claim in `apply-progress.md` was independently reproduced from scratch rather than trusted, including the RED→GREEN bug-fix proof, and all evidence matches exactly. Ready for `sdd-archive`.
