# Exploration: narrative-market-param-regression

## Current State

`GET /api/decisions/[asset]/narrative` (`app/api/decisions/[asset]/narrative/route.ts:186-192`) now requires a `?market=crypto|acciones` query param, added in the just-archived `acciones-market-integration` change's Phase C (commit `8ff3407`). The check runs first, before any other validation:

```ts
const market = new URL(request.url).searchParams.get('market');
if (!isMarket(market)) {
  return jsonError(400, 'BAD_MARKET', '"market" query param must be "crypto" or "acciones"');
}
```

`app/(dashboard)/components/NarrativePanel.tsx:49` calls `fetch(\`/api/decisions/${asset}/narrative\`)` — **no query string at all**, and `NarrativePanelProps` (line 7-9) has no `market` field. `app/(dashboard)/components/DrilldownPanel.tsx:71` mounts it as `<NarrativePanel asset={decision.asset} />` — `decision.market` (present on `Decision`, `src/domain/types.ts:90`) is available but never read or threaded through.

**Confirmed: every narrative request, for both markets, now 400s with `BAD_MARKET` before reaching any real logic** — a total outage matching "la narración dejó de funcionar." Secondary symptom: `UNAVAILABLE_CODES` (`NarrativePanel.tsx:20`) doesn't include `BAD_MARKET`, so the UI lands in `'failed'` state with a "Reintentar" button that retries the identical broken URL forever.

## Root Cause

`openspec/changes/archive/2026-08-22-acciones-market-integration/tasks.md` Phase C (lines 52-56) scoped work to exactly `tests/api/narrative.test.ts` + `route.ts`; `apply-progress.md` confirms this boundary explicitly ("Touches exactly the 2 files listed"). No task ever asked to update `NarrativePanel.tsx`/`DrilldownPanel.tsx`. Contrast with the sibling `/api/decisions` endpoint: that session's Phase D correctly did the full chain (D.5 threaded `market` into `OverviewClient.tsx`'s fetch, D.6/D.7 wired page components, plus a documented "Additional fixes required for D.9" e2e glob fix). Phase C never got the equivalent treatment for narrative — a task-breakdown gap in the archived change, not a coding mistake within an assigned task.

## Why 52/52 E2E Passing Didn't Catch It (verified)

`tests/e2e/dashboard.spec.ts`'s `stubNarrativeSuccess`/`stubNarrativeError` (lines 235, 249) use `page.route('**/api/decisions/*/narrative', ...)`. Per Playwright's documented glob semantics, a bare `**/path` glob does **not** match a URL with an appended query string — it only "happens" to match today because `NarrativePanel.tsx` sends none. Since `route.fulfill()` intercepts before the real handler runs, these tests never exercise `route.ts`'s actual `BAD_MARKET` check, so they can't distinguish a correct vs. broken client call. `tests/api/narrative.test.ts` tests `route.ts` directly with `?market=crypto` hard-coded in its request builder, so it never exercises the real browser caller either. One stub in the same file, `stubNarrativeStreaming` (regex `/\/api\/decisions\/[^/]+\/narrative(\?.*)?$/`), already tolerates a query string correctly — showing the fix pattern needed for the other two stubs.

## Affected Areas

- `app/(dashboard)/components/NarrativePanel.tsx` — fetch call (line 49) + `NarrativePanelProps` need a `market` param/prop; `UNAVAILABLE_CODES` (line 20) is an optional hardening target.
- `app/(dashboard)/components/DrilldownPanel.tsx` — line 71 must pass `market={decision.market}` (already available, zero extra fetch).
- `tests/e2e/dashboard.spec.ts` — `stubNarrativeSuccess`/`stubNarrativeError` globs (lines 235, 249) need the query-tolerant fix, mirroring the exact precedent already used in this file for `stubDecisions` (`'**/api/decisions?**'`); this is also where the closing RED test/assertion belongs.
- `app/api/decisions/[asset]/narrative/route.ts`, `tests/api/narrative.test.ts` — no change expected, already correct.

## Approaches

1. **Minimal wiring fix only** — thread `decision.market` → `NarrativePanel` fetch. Pros: fixes outage, zero new state. Cons: leaves the detection gap open. Effort: Low.
2. **Wiring fix + e2e glob/assertion fix (recommended)** — #1 plus widen the two `page.route()` globs and add a positive `market=` assertion. Pros: closes the actual gap with a real RED→GREEN test, reuses an established in-repo pattern. Effort: Low.
3. **#2 + defensive `BAD_MARKET` in `UNAVAILABLE_CODES`.** Pros: avoids an infinite-retry "failed" loop if this recurs. Cons: slightly masks future genuine market bugs as calm "unavailable." Effort: Low.
4. **Extract a pure `narrativeUrlFor()` helper + unit test.** Pros: cheapest isolated guard. Cons: unnecessary refactor, redundant with #2, inconsistent with how `OverviewClient` handled the identical case inline. Effort: Low, optional.

## Recommendation

Approach 2, with approach 3 offered as an easy optional addition for the orchestrator to confirm with the user. Small, sharply-scoped fix: 2 component files for wiring + 1 test-helper file for the coverage gap, no server/spec changes.

## Risks

- No live `npx vitest run`/`npx playwright test` execution was performed during exploration — root cause is confirmed via static code-path tracing and Playwright's documented glob-matching semantics; `sdd-apply`/the orchestrator must capture the actual RED run live.
- Fixing the e2e globs may surface other currently-masked narrative assertions; treat as in-scope, per the Phase D precedent for the sibling endpoint.

## Ready for Proposal

Yes — root cause pinned with file:line evidence, fix scope is small, TDD posture (real RED test, not manual-only) is established.

## Key Learnings

1. Playwright `page.route()` glob patterns without a trailing wildcard do not match URLs with an appended query string, so a stub can silently stop intercepting once a client adds query params.
2. This repo already fixed the identical glob-pattern class of bug for the `/api/decisions` endpoint's `stubDecisions` helper in the same session (Phase D), establishing `'**/path?**'` as the house pattern for query-tolerant stubs.
3. A task-breakdown that scopes a backend contract change to exactly the route file and its direct API test, without a corresponding task for the browser-side caller, can ship a total-outage regression even with 100% green test suites.
4. `Decision.market` was already threaded into `DrilldownPanel`'s props before this bug, so the fix requires zero new data fetching — only prop/URL wiring.
