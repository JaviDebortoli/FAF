# Tasks: Gauge Arc Contrast

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~2-4 |
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
| 1 | Arc contrast fix, single file | PR 1 | `npx tsc --noEmit` | `npx playwright test tests/e2e/dashboard.spec.ts` | `git revert` the commit, or remove `className="stroke-zinc-200"`/`opacity={0.5}` from the arc `<path>` |

## Phase 1: Implementation (GREEN-only — no existing test asserts arc color/opacity/class; no RED test applicable)

- [x] 1.1 `app/(dashboard)/components/ScoreGauge.tsx:27`: on the arc `<path>` element, add `className="stroke-zinc-200"` and `opacity={0.5}`. Keep `stroke="currentColor"`, `strokeWidth={10}`, `strokeLinecap="round"` unchanged. Do NOT touch the SVG root's `text-zinc-800` (line 25) or the pivot `<circle>`'s `text-zinc-500` (line 42).

## Phase 2: Verification

- [x] 2.1 Run `npx tsc --noEmit` — confirm no type errors introduced by the JSX attribute change.
- [x] 2.2 Run full `npx playwright test` suite — confirm zero regressions (`tests/dashboard/lib/gauge.test.ts` and `tests/e2e/dashboard.spec.ts` do not assert arc color/opacity/class, per proposal Success Criteria).
- [x] 2.3 Manual visual confirmation (dev-environment screenshot check, completable by sdd-apply — not a `[MANUAL-VERIFICATION-ONLY]` production gate): with the dev server running, open the crypto dashboard (`ScoreGauge` renders inside `DecisionCard`, mounted in `OverviewClient.tsx`'s Tier 1 grid — not just the drill-down panel), take a screenshot, and visually confirm the gauge arc is now clearly visible against the dark background. CONFIRMED — screenshot of `/dashboard/crypto` Tier 1 grid (BTCUSDT BUY + ETHUSDT SELL cards, stubbed `/api/decisions`) shows the arc as a clearly visible light-gray semicircle against the dark card background on both cards; needles, pivot dot, and text labels unaffected.

## Rules Applied

- Apply any `rules.tasks` from `openspec/config.yaml`.
