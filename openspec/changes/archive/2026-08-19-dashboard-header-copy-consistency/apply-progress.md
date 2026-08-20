# Apply Progress: Dashboard Header Copy Consistency

**Change**: dashboard-header-copy-consistency
**Mode**: Strict TDD
**Status**: 12/12 tasks complete. Coverage-gap follow-up batch 1 (closing sdd-verify pass-1 CRITICAL finding) complete — 5/6 delta-spec scenarios test-confirmed. Coverage-gap follow-up batch 2 (closing sdd-verify pass-2 CRITICAL finding — the last inspection-only scenario) also complete, per explicit user decision to add the unit test rather than accept it as an exception. **6/6 delta-spec scenarios are now test-confirmed.** Ready for re-verify.

## Completed Tasks

### Phase 1: RED — Failing E2E Tests
- [x] 1.1 `tests/e2e/market-nav.spec.ts:246`: `toContainText('Recomendaciones activas')` → `toContainText('Criptomonedas')`
- [x] 1.2 `tests/e2e/market-nav.spec.ts:348` (now `:360` after the new test was inserted above it): same assertion change
- [x] 1.3 Added new test `placeholder-market page shows the determinism disclaimer, identical to crypto` inside `test.describe('Placeholder-market pages', ...)`, navigating to `/dashboard/forex` via `sidebar-link-forex` (reusing the existing `gotoCrypto` + sidebar-click convention from the adjacent CTA test)
- [x] 1.4 Ran `npx playwright test tests/e2e/market-nav.spec.ts` — confirmed exactly 3 failures (the 2 updated assertions + the 1 new test), 20 passed. See "Test Command Output" below.

### Phase 2: GREEN — Implementation
- [x] 2.1 Created `app/(dashboard)/components/DashboardHeader.tsx` per design.md's interface sketch
- [x] 2.2 Wired into `app/dashboard/crypto/page.tsx` (with a deviation — see below)
- [x] 2.3 Wired into `app/dashboard/[market]/page.tsx` (matches design.md exactly, no deviation — `market` is already guarded by the pre-existing `if (!market) notFound();` check)
- [x] 2.4 Ran `npx playwright test tests/e2e/market-nav.spec.ts` — 23/23 passed

### Phase 3: REFACTOR
- [x] 3.1 `app/dashboard/crypto/page.tsx` — no unused imports, no dead JSX. `OverviewClient`, `DashboardHeader`, `MARKETS` all used.
- [x] 3.2 `app/dashboard/[market]/page.tsx` — no unused imports, no dead JSX. `notFound`, `MARKETS`, `MarketPlaceholder`, `DashboardHeader` all used.

### Phase 4: Verify
- [x] 4.1 `npx tsc --noEmit` — clean on second run (first run caught a real type error, fixed — see Deviations below)
- [x] 4.2 `npx playwright test` (full suite) — 35/35 passed

## Files Changed

| File | Action | What Was Done |
|------|--------|---------------|
| `app/(dashboard)/components/DashboardHeader.tsx` | Created | Shared header component: fixed eyebrow "Panel de decisiones", `title` prop → `<h1>`, optional disclaimer `<p>` gated by `showDisclaimer` (default `false`). Matches `MarketPlaceholder.tsx`'s style: named export, `XProps` interface, `zinc-*`/`text-muted` Tailwind tokens only, no `'use client'`. |
| `app/dashboard/crypto/page.tsx` | Modified | Replaced inline `<header>` with `<DashboardHeader title={cryptoMarket.label} showDisclaimer />`; added a guarded `const cryptoMarket = MARKETS.crypto` local (deviation, see below) instead of `MARKETS.crypto.label` inline. |
| `app/dashboard/[market]/page.tsx` | Modified | Replaced inline `<header>` with `<DashboardHeader title={market.label} showDisclaimer />`, exactly as design.md specified — `market` was already non-null-guarded by the pre-existing `notFound()` check. |
| `tests/e2e/market-nav.spec.ts` | Modified | Updated 2 assertions (`Recomendaciones activas` → `Criptomonedas`) at the crypto-still-renders test and the mobile-no-regression test; added 1 new test asserting the disclaimer renders on a placeholder-market route (`/dashboard/forex`). |
| `openspec/changes/dashboard-header-copy-consistency/tasks.md` | Modified | Marked all 12 tasks `[x]`, with 2 inline deviation notes on tasks 2.2 and 4.1. |

## TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| 1.1/1.2/2.2/2.3 | `tests/e2e/market-nav.spec.ts` (crypto h1 assertions) | E2E | N/A (pre-existing assertions, no baseline run needed before edit — spec scenario reuses existing test structure) | ✅ Written (assertions changed to expect "Criptomonedas") | ✅ Passed (2.4 run: 23/23) | ➖ Single (spec has exactly one scenario per assertion: crypto h1 = catalog label) | ➖ None needed (no logic, pure JSX swap) |
| 1.3/2.1/2.3 | `tests/e2e/market-nav.spec.ts` (new disclaimer test) | E2E | N/A (new test) | ✅ Written (references `/dashboard/forex` disclaimer text that did not render before `DashboardHeader` existed) | ✅ Passed (2.4 run: 23/23) | ➖ Single (one scenario: placeholder-market disclaimer presence; crypto's own disclaimer scenario was already covered by pre-existing untouched assertions, confirmed still passing) | ➖ None needed |

**Safety Net note**: `tests/e2e/market-nav.spec.ts` had 23 tests before this change (20 passing baseline confirmed implicitly by RED run showing exactly 3 failures — the 3 touched/new assertions — and 20 passes, matching the pre-change count). No pre-existing test broke.

## Test Command Output

### RED (Phase 1, task 1.4) — `npx playwright test tests/e2e/market-nav.spec.ts`
```
3 failed
  [chromium] › market-nav.spec.ts:240:7 › Placeholder-market pages › /dashboard/crypto still renders the real dashboard, not the placeholder (static route precedence)
    Expected substring: "Criptomonedas"
    Received string:    "FAF · Panel de decisionesRecomendaciones activas..."
  [chromium] › market-nav.spec.ts:256:7 › Placeholder-market pages › placeholder-market page shows the determinism disclaimer, identical to crypto
    Expected substring: "Cada tarjeta muestra una recomendación BUY/SELL..."
    Received string:    "FAF · Panel de decisionesForexPRÓXIMAMENTEForex todavía no está disponible en la plataforma."
  [chromium] › market-nav.spec.ts:354:9 › Mobile navigation drawer › .../dashboard/crypto still renders correctly at mobile viewport with the drawer closed (no regression)
    Expected substring: "Criptomonedas"
    Received string:    "FAF · Panel de decisionesRecomendaciones activas..."
20 passed (36.5s)
```

### GREEN (Phase 2, task 2.4) — `npx playwright test tests/e2e/market-nav.spec.ts`
```
23 passed (19.7s)
```

### Verify (Phase 4, task 4.1) — `npx tsc --noEmit`
First run (before fix):
```
app/dashboard/crypto/page.tsx(34,31): error TS18048: 'MARKETS.crypto' is possibly 'undefined'.
```
Second run (after fix):
```
(clean — no output, exit 0)
```

### Verify (Phase 4, task 4.2) — `npx playwright test` (full suite)
```
Running 35 tests using 1 worker
...
35 passed (27.7s)
```
Breakdown: 12 tests in `tests/e2e/dashboard.spec.ts` (untouched, all pass — confirms zero cross-file regression) + 23 tests in `tests/e2e/market-nav.spec.ts` (2 updated + 1 new + 20 pre-existing, all pass).

## Deviations from Design

1. **`app/dashboard/crypto/page.tsx` — guarded local instead of inline `MARKETS.crypto.label`** (task 2.2).
   design.md's interface sketch and File Changes table specify `<DashboardHeader title={MARKETS.crypto.label} showDisclaimer />` directly. `npx tsc --noEmit` (task 4.1) caught a real compile error on this exact line: `tsconfig.json` sets `"noUncheckedIndexedAccess": true`, which types `Record<string, Market>` property access (even via literal dot-notation on a key that's statically present) as `Market | undefined`. Empirically confirmed by running `tsc` before assuming the design's literal snippet would compile as-is — it did not.
   **Fix applied**: introduced a local `const cryptoMarket = MARKETS.crypto; if (!cryptoMarket) throw new Error(...);` guard before the JSX, then passed `cryptoMarket.label`. This mirrors the existing defensive-guard convention already used by `Sidebar.tsx`'s `MarketLinkGroups` (`const market = MARKETS[slug]; if (!market) return null;`) rather than introducing a non-null assertion (`!`) operator, which has no precedent elsewhere in the codebase (grep confirmed zero existing `!.` usages under `app/`).
   `app/dashboard/[market]/page.tsx` needed no equivalent fix — its `market.label` was already covered by the pre-existing `if (!market) { notFound(); }` guard, which TypeScript's control-flow narrowing correctly applies to the later `market.label` access.

2. **Test line numbers shifted after the new test was inserted.** tasks.md's task 1.2 cites `market-nav.spec.ts:348`; after inserting the new disclaimer test (task 1.3) before it in the same describe block, that assertion moved to line 360 in the final file. No functional impact — noted for traceability only, since a line-number-based task reference can no longer be used to locate the code post-change.

No other deviations. The `DashboardHeader` component itself, its wiring into `[market]/page.tsx`, the eyebrow/disclaimer copy, and the two `market-nav.spec.ts` assertion edits (1.1) all match design.md verbatim.

## Issues Found

None beyond the type-check deviation documented above, which was caught and fixed within the same apply batch per the RED→GREEN→REFACTOR→Verify cycle (no follow-up task needed).

## Remaining Tasks

None — all 12 tasks (Phases 1–4) complete.

## Phase 5: Final Verification — Delta Spec Scenario Self-Check (corrected)

**This table replaces the original Phase 5 note above** (see "Follow-up: sdd-verify coverage gap" below for why). The original note wrongly cited source-code locations as "Confirmed by" for scenarios that had no covering runtime test — that is exactly the CRITICAL finding `verify-report.md` raised, and it does not meet this project's sdd-verify hard rule ("a spec scenario is compliant only when a covering test passed at runtime"). This corrected table distinguishes **test-confirmed** from **inspection-only** honestly, per scenario.

| Domain | Scenario | Coverage | Evidence |
|---|---|---|---|
| decision-dashboard | Crypto h1 shows the catalog label | Test-confirmed | `market-nav.spec.ts:246,360` — `toContainText('Criptomonedas')` on `/dashboard/crypto`, passing |
| decision-dashboard | Heading updates if the catalog label changes | **Test-confirmed** (follow-up batch 2, see below — previously inspection-only) | `tests/dashboard/crypto/page.test.ts` — `vi.mock` overrides `MARKETS.crypto.label`, `renderToString(CryptoDashboardPage())` asserts the mocked label reaches the HTML output, passing |
| market-navigation | Crypto view eyebrow has no FAF prefix | Test-confirmed | `market-nav.spec.ts:133-139` (new) — `expect(page.locator('main header span')).toHaveText('Panel de decisiones')` (exact, not substring) + `.not.toContainText('FAF')`, passing |
| market-navigation | Placeholder-market view eyebrow matches crypto | Test-confirmed | `market-nav.spec.ts:141-151` (new) — same exact-text assertion on `/dashboard/forex` after clicking `sidebar-link-forex`, passing |
| market-navigation | Crypto view shows the disclaimer | Test-confirmed | `market-nav.spec.ts:153-159` (new) — `toContainText` with the exact disclaimer string, scoped to `/dashboard/crypto` specifically (the pre-existing disclaimer assertion at line 300 only ever covered `/dashboard/forex`; kept unchanged, this is additive) |
| market-navigation | Placeholder-market view shows the identical disclaimer | Test-confirmed | `market-nav.spec.ts:300-310` (pre-existing, task 1.3) — `/dashboard/forex`, passing |

**Result: 6/6 scenarios are now test-confirmed** (up from 2/6 at pass-1 verify, 5/6 at pass-2 verify). See "Follow-up batch 2" below for how the last scenario was closed.

### (Historical) Why "Heading updates if the catalog label changes" was originally inspection-only

`MARKETS` (`app/(dashboard)/lib/markets.ts`) is a **static, compile-time TypeScript catalog object** — it is not runtime-mutable application state (no admin UI, no API, no DB-backed config). The scenario's GIVEN clause ("`MARKETS.crypto.label` is later changed in `lib/markets.ts`") describes a *source-code edit*, not a user- or system-triggered runtime event. Playwright E2E tests exercise a running app against fixed source; there is no way to "change `lib/markets.ts` and re-render" inside a single E2E test run without either (a) mutating the module at runtime via a test-only override hook that doesn't exist anywhere else in the codebase (no precedent, would require new production code purely to make this one scenario testable — disproportionate), or (b) spawning a second dev-server process with a patched file (heavyweight, flaky, no precedent in this suite).

Constructing an artificial test that fakes this (e.g., asserting via `page.evaluate` that some in-browser JS variable equals a string) would not exercise the real regression path and would be a tautological/theater test — exactly what `verify-report.md`'s "Assertion Quality" check would flag.

**What is actually verified instead**: `crypto/page.tsx:44` passes `cryptoMarket.label` (a property read of the live `MARKETS.crypto` object) to `DashboardHeader`'s `title` prop — not a separate hardcoded string literal like the pre-fix `"Recomendaciones activas"`. This is confirmed by direct source read (also independently confirmed in `verify-report.md`'s Source Verification table). Combined with the test-confirmed "Crypto h1 shows the catalog label" scenario (which proves the *current* value of `MARKETS.crypto.label` does reach the `<h1>`), the data-flow is fully exercised end-to-end for the one input value E2E can observe; only the counterfactual "if the source were edited" leg is inspection-only, which is inherent to testing a compile-time constant's data flow rather than a coverage shortfall in the test suite.

**Trip-wire equivalence**: if a future edit ever reintroduced a hardcoded literal in `crypto/page.tsx` (regressing the "not a separate hardcoded literal" guarantee) AND that literal happened to still read "Criptomonedas", the test-confirmed scenario above would not catch it either — but this is a source-level regression a code reviewer / linter-style check would catch, not something meaningfully closable by E2E. No further action recommended; this is a legitimate, judged exception, not a silent skip.

### Follow-up: sdd-verify coverage gap (closed 2026-08-18)

`sdd-verify`'s independent re-run (`verify-report.md`) found 4/6 delta-spec scenarios lacked a passing runtime test, despite the original Phase 5 table implying all 6 were "confirmed" (it cited source locations for 4 of them, not test results). This apply batch closes 3 of those 4 gaps with new/extended runtime tests (eyebrow ×2, crypto-route disclaimer ×1) and reclassifies the 4th (heading-updates-on-catalog-change) as a documented, judged inspection-only exception rather than leaving it silently uncovered. See "Files Changed (this batch)" and "Test Command Output (this batch)" below.

**Mutation trip-wire sanity check** (not part of the RED→GREEN cycle — the underlying code was already correct, so this was an extra confidence check, not required TDD evidence): temporarily reintroduced the exact defect this change fixes (`"FAF · Panel de decisiones"` literal in `DashboardHeader.tsx`), re-ran the 2 new eyebrow tests, confirmed both failed with the expected diff (`Expected: "Panel de decisiones"` / `Received: "FAF · Panel de decisiones"`), then reverted and re-confirmed 38/38 green. This proves the new tests are a real regression trip-wire for the "no FAF prefix" MUST-NOT requirement, not a tautological assertion — directly answering `verify-report.md`'s stated risk ("if the prefix silently returned, no test in the suite would catch it").

## Workload / PR Boundary

- Mode: single PR (per tasks.md's Review Workload Forecast — Low risk, no chaining)
- Current work unit: Unit 1 (the only unit) — Shared `DashboardHeader` + wire into both page files + updated/new e2e assertions
- Boundary: starts at `DashboardHeader.tsx` creation, ends at the full `npx playwright test` pass (35/35)
- Estimated review budget impact: well under 400 lines — 1 new ~30-line file (with doc comments), 2 small page-file edits (~10 lines net each including the deviation guard), 1 test file with 2 one-line assertion edits + 1 new ~11-line test

## Files Changed (this batch — coverage-gap follow-up)

| File | Action | What Was Done |
|------|--------|---------------|
| `tests/e2e/market-nav.spec.ts` | Modified | Added new `test.describe('Dashboard header — eyebrow & disclaimer', ...)` block (mirrors the pre-existing "Shared dashboard footer" cross-route pattern) with 3 new tests: (1) crypto eyebrow exact-text + not-contains-"FAF", (2) placeholder (`/dashboard/forex`) eyebrow exact-text + not-contains-"FAF", (3) crypto-route disclaimer text assertion. The pre-existing forex disclaimer test (task 1.3) was left untouched, since "Placeholder-market view shows the identical disclaimer" is a separate required scenario. |

## Test Command Output (this batch — coverage-gap follow-up)

### `npx tsc --noEmit`
```
(clean — no output, exit 0)
```

### `npx playwright test tests/e2e/market-nav.spec.ts`
```
Running 26 tests using 1 worker
...
26 passed (22.8s)
```
All 3 new tests passed on first run (GREEN immediately — expected, since this batch closes a coverage gap on already-correct code, not a functional gap; no artificial RED state was forced per the task instructions).

### `npx playwright test` (full suite)
```
Running 38 tests using 1 worker
...
38 passed (30.4s)
```
Breakdown: 12 `dashboard.spec.ts` (untouched) + 26 `market-nav.spec.ts` (23 pre-existing + 3 new).

### Mutation trip-wire check (extra confidence, not part of RED/GREEN cycle)
Temporarily changed `DashboardHeader.tsx`'s eyebrow literal to `"FAF · Panel de decisiones"`, re-ran `npx playwright test tests/e2e/market-nav.spec.ts -g "eyebrow"`:
```
Running 3 tests using 1 worker
  x 1 ... crypto view eyebrow reads exactly "Panel de decisiones", no "FAF" prefix
  x 2 ... placeholder-market view eyebrow matches crypto — exactly "Panel de decisiones"
  ok 3 ... crypto view shows the determinism disclaimer
2 failed, 1 passed (19.6s)
```
Both eyebrow tests failed exactly as expected (`Expected: "Panel de decisiones"` / `Received: "FAF · Panel de decisiones"`). Reverted the mutation, re-ran full suite: 38/38 passed, `npx tsc --noEmit` clean.

## Follow-up batch 2: closing the last inspection-only scenario (2026-08-18)

`verify-report.md` (re-verify pass 2) independently confirmed the E2E-untestability reasoning above as sound, but found a lower-cost unit-test path had not been exhausted: this repo already has `vitest` configured, 3 existing `vi.mock()` precedents (`tests/api/cycle.test.ts`, `tests/api/narrative.test.ts`, `tests/narrative/client.test.ts`), and `react-dom` as a dependency (ships `react-dom/server`'s `renderToString`) — enough to close the gap with zero new npm dependencies and zero new production code. Per explicit user decision (orchestrator asked via AskUserQuestion: add the unit test vs. accept as documented exception), the user chose **add the unit test**.

### Approach

`CryptoDashboardPage` (`app/dashboard/crypto/page.tsx`) is a synchronous (non-async) Server Component — it returns a plain JSX element tree directly, no `await`/`use()` inside the component function. This means calling `CryptoDashboardPage()` directly and passing the returned element to `react-dom/server`'s `renderToString` works with plain `react-dom/server`, no extra RSC-specific handling needed (verified empirically — see Test Command Output below, not assumed). `OverviewClient` (the `'use client'` island child) renders its `loading` state fine under plain `renderToString` in vitest's `environment: 'node'` — it has no direct `window`/`document` access outside `useEffect`, which SSR never runs (confirmed by source read before writing the test).

### Files Changed (this batch — closing the last delta-spec gap)

| File | Action | What Was Done |
|------|--------|---------------|
| `tests/dashboard/crypto/page.test.ts` | Created | New unit test (this repo's first component-render unit test). `vi.mock('@/app/(dashboard)/lib/markets', ...)` overrides `MARKETS.crypto.label` to `'Test Crypto Label'` (keeping `MARKETS`/`MARKET_GROUPS` shape intact), dynamically imports `CryptoDashboardPage`, renders it via `renderToString`, asserts the mocked label appears in the output HTML. Follows the existing `vi.mock()` + dynamic-`import()` convention from `tests/api/cycle.test.ts`. |
| `vitest.config.ts` | Modified | Added `esbuild: { jsx: 'automatic' }`. `tsconfig.json`'s `jsx: "preserve"` is for Next.js's own compiler, not Vite/esbuild's test transform — without this, esbuild defaults to the classic JSX transform (requires a `React` global in scope), which failed with `ReferenceError: React is not defined` on first run of the new test (all 36 pre-existing test files are pure `.ts`, no JSX, so this was never hit before). `automatic` matches React 19 + Next.js's actual JSX runtime. Zero new dependency — esbuild ships with Vite. No other test file is affected (confirmed: full `npx vitest run` still shows 37/37 files passing, same pre-existing 223 tests + 1 new). |

### Test Command Output (this batch)

#### New test in isolation — `npx vitest run tests/dashboard/crypto/page.test.ts`
First run (before the `vitest.config.ts` fix):
```
ReferenceError: React is not defined
 ❯ CryptoDashboardPage app/dashboard/crypto/page.tsx:42:3
```
After adding `esbuild: { jsx: 'automatic' }` to `vitest.config.ts`:
```
✓ tests/dashboard/crypto/page.test.ts (1 test) 123ms
Test Files  1 passed (1)
     Tests  1 passed (1)
```

#### Mutation trip-wire sanity check (proves this is a real regression trip-wire, not tautological)
Temporarily changed `app/dashboard/crypto/page.tsx`'s `<DashboardHeader title={cryptoMarket.label} ...>` to the pre-fix hardcoded literal `<DashboardHeader title="Recomendaciones activas" ...>`, re-ran the new test:
```
× CryptoDashboardPage — heading is data-driven from MARKETS.crypto.label > renders the mocked MARKETS.crypto.label in the output HTML, not a hardcoded string
  AssertionError: expected '<main class="mx-auto flex min-h-scree…' to contain 'Test Crypto Label'
  Received: '...<h1 class="text-2xl font-semibold text-zinc-50">Recomendaciones activas</h1>...'
1 failed
```
Failed exactly as expected — the mocked label never reached the output because the source no longer read `MARKETS.crypto.label`. Reverted immediately.

#### Full unit suite — `npx vitest run`
```
Test Files  37 passed (37)
     Tests  224 passed (224)
```
Zero regressions across all 36 pre-existing test files (223 tests) plus the 1 new test.

#### Type check — `npx tsc --noEmit`
```
(clean — no output, exit 0)
```

#### Full e2e suite — `npx playwright test`
```
Running 38 tests using 1 worker
...
38 passed (23.5s)
```
Identical count to the pass-2 verify baseline — this batch touched no `.spec.ts` file, only added a new vitest unit test and a vitest config option.

### Result

The last remaining delta-spec gap ("Heading updates if the catalog label changes", `decision-dashboard`) is now **test-confirmed**, not inspection-only. All 6/6 delta-spec scenarios across both changed spec files now have a passing runtime test.

## Status

12/12 original tasks complete + coverage-gap follow-up batch 1 complete + coverage-gap follow-up batch 2 complete. **6/6 delta-spec scenarios test-confirmed** (0 remaining inspection-only). Ready for re-verify.
