# Tasks: Dashboard Header Copy Consistency

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | ~100-140 total (1 new ~20-line component, 2 page files with small header swaps, 1 test file with 2 assertion edits + 1 new test) |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending (single PR — no chaining decision needed) |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|---|---|---|---|---|---|
| 1 | Shared `DashboardHeader` + wire into both page files + updated/new e2e assertions | PR1 (single) | `npx playwright test tests/e2e/market-nav.spec.ts` | `npx playwright test` (config spawns `next dev`) | Revert `app/(dashboard)/components/DashboardHeader.tsx`, `app/dashboard/crypto/page.tsx`, `app/dashboard/[market]/page.tsx`, and the `tests/e2e/market-nav.spec.ts` edits — no data/schema change, no other file touched |

## Phase 1: RED — Failing E2E Tests

- [x] 1.1 `tests/e2e/market-nav.spec.ts:246`: change `toContainText('Recomendaciones activas')` → `toContainText('Criptomonedas')`.
- [x] 1.2 `tests/e2e/market-nav.spec.ts:348`: change `toContainText('Recomendaciones activas')` → `toContainText('Criptomonedas')`.
- [x] 1.3 `tests/e2e/market-nav.spec.ts`, inside `test.describe('Placeholder-market pages', ...)`: add a new test that navigates to a placeholder route (e.g. `/dashboard/forex` via `sidebar-link-forex`, matching the existing `gotoCrypto` + sidebar-click convention) and asserts `page.locator('main')` contains the exact disclaimer text "Cada tarjeta muestra una recomendación BUY/SELL derivada de forma determinística por el framework argumentativo. Esta vista no contiene texto generado por IA." — closes the coverage gap design.md flagged (no test today asserts the disclaimer on placeholder views).
- [x] 1.4 Run `npx playwright test tests/e2e/market-nav.spec.ts` and confirm all 3 touched/new assertions fail against current code (crypto h1 still reads "Recomendaciones activas"; placeholder route has no disclaimer paragraph).

## Phase 2: GREEN — Implementation

- [x] 2.1 Create `app/(dashboard)/components/DashboardHeader.tsx`: `DashboardHeaderProps { title: string; showDisclaimer?: boolean }`, renders fixed eyebrow `<span>` "Panel de decisiones" (no "FAF · " prefix), `<h1>{title}</h1>`, and — only when `showDisclaimer` is true — the exact disclaimer `<p>` verbatim, per design.md's interface sketch.
- [x] 2.2 `app/dashboard/crypto/page.tsx`: import `MARKETS` from `@/app/(dashboard)/lib/markets` and `DashboardHeader`; replace the inline `<header>` block with `<DashboardHeader title={MARKETS.crypto.label} showDisclaimer />`. (Deviation: wrapped in a guarded local `cryptoMarket` const — see apply-progress "Deviations from Design".)
- [x] 2.3 `app/dashboard/[market]/page.tsx`: import `DashboardHeader`; replace the inline `<header>` block with `<DashboardHeader title={market.label} showDisclaimer />`.
- [x] 2.4 Run `npx playwright test tests/e2e/market-nav.spec.ts` and confirm the 3 tests from Phase 1 now pass.

## Phase 3: REFACTOR

- [x] 3.1 Confirm `app/dashboard/crypto/page.tsx` has no leftover unused imports or dead inline header JSX from the pre-change version.
- [x] 3.2 Confirm `app/dashboard/[market]/page.tsx` has no leftover unused imports or dead inline header JSX from the pre-change version.

## Phase 4: Verify

- [x] 4.1 Run `npx tsc --noEmit` — confirm clean (catches any other reference to the old "Recomendaciones activas" / "FAF · " copy or a `DashboardHeader` prop mismatch). (Caught a real `noUncheckedIndexedAccess` error on first run — see apply-progress "Deviations from Design".)
- [x] 4.2 Run `npx playwright test` (full suite, not just the touched spec file) — confirm zero regressions across all pre-existing tests plus the 3 touched/new assertions. Result: 35/35 passed.

## Phase 5: Final Verification — Delta Spec Scenario Self-Check

| Requirement | Scenario | Confirmed by |
|---|---|---|
| Crypto view heading reflects market catalog label (ADDED, decision-dashboard) | Crypto h1 shows the catalog label | `market-nav.spec.ts:246,360` — `toContainText('Criptomonedas')` on `/dashboard/crypto`, passing |
| Crypto view heading reflects market catalog label (ADDED, decision-dashboard) | Heading updates if the catalog label changes | `tests/dashboard/crypto/page.test.ts` — `vi.mock` overrides `MARKETS.crypto.label`; `renderToString(CryptoDashboardPage())` asserts the mocked label reaches the output HTML (follow-up batch 2), passing |
| Dashboard eyebrow copy is consistent (ADDED, market-navigation) | Crypto view eyebrow has no FAF prefix | `market-nav.spec.ts:133-139` — exact `toHaveText('Panel de decisiones')` + `.not.toContainText('FAF')` (follow-up batch 1), passing |
| Dashboard eyebrow copy is consistent (ADDED, market-navigation) | Placeholder-market view eyebrow matches crypto | `market-nav.spec.ts:141-151` — same exact-text assertion on `/dashboard/forex` (follow-up batch 1), passing |
| Determinism disclaimer appears on every market view (ADDED, market-navigation) | Crypto view shows the disclaimer | `market-nav.spec.ts:153-159` — scoped to `/dashboard/crypto` (follow-up batch 1), passing |
| Determinism disclaimer appears on every market view (ADDED, market-navigation) | Placeholder-market view shows the identical disclaimer | `market-nav.spec.ts:300-310` — `/dashboard/forex`, passing |

## Follow-up Batches (post sdd-verify findings)

- [x] FB1.1 sdd-verify pass 1 found 4/6 delta-spec scenarios lacked a passing runtime test. Added 3 new/extended e2e assertions in `tests/e2e/market-nav.spec.ts` (exact-text eyebrow ×2 at lines 133-151, crypto-route disclaimer at 153-159); the pre-existing forex disclaimer assertion (lines 300-310) covers the 4th scenario. Full suite 38/38 passed, `tsc` clean. Mutation trip-wire confirmed (old "FAF · " prefix reintroduced → both eyebrow tests failed → reverted).
- [x] FB2.1 sdd-verify pass 2 confirmed the last inspection-only scenario ("Heading updates if the catalog label changes") had a feasible untried unit-test path. Per explicit user decision (add the test, not a documented exception), created `tests/dashboard/crypto/page.test.ts` — this repo's first component-render unit test: `vi.mock` the markets module, `renderToString` the synchronous Server Component, assert the mocked label in the HTML — and added `esbuild: { jsx: 'automatic' }` to `vitest.config.ts` (the classic transform failed with `ReferenceError: React is not defined`). Zero new dependencies. `npx vitest run` 224/224 passed (223 pre-existing + 1 new); `npx playwright test` 38/38 unchanged; `tsc` clean. Mutation trip-wire confirmed (hardcoded `"Recomendaciones activas"` title → new test failed → reverted).

## Delivery Recommendation

Single PR, delivered directly — no chaining, no tracker branch, no `size:exception` needed. 1 new ~20-line component + 2 small page-file edits + 1 test file, ~100-140 estimated changed lines, comfortably under the 400-line review budget.

## Implementation Order

Phase 1 (RED) → Phase 2 (GREEN) → Phase 3 (REFACTOR) → Phase 4 (Verify) → Phase 5 (spec self-check, terminal). Task 1.4 (confirm RED) must complete before any Phase 2 task starts. Tasks 2.2 and 2.3 are independent of each other (different files) but both depend on 2.1 (`DashboardHeader` must exist first).
