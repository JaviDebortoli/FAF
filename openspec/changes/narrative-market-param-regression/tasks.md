# Tasks: Fix Narrative Panel `market` Param Regression

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~40-60 (3 files: 2 tiny component edits, 1 e2e glob/test addition) |
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
| 1 | Restore `market` param wiring + closing e2e regression test | PR 1 | `npx playwright test tests/e2e/dashboard.spec.ts -g "market"` | Real Playwright browser run against `npm run dev`-served dashboard | `git revert` on the 3 modified files; no schema/API/data migration involved |

## Phase 1: RED — Prove the Regression (`tests/e2e/dashboard.spec.ts`)

- [x] 1.1 Widen `stubNarrativeSuccess`'s `page.route` glob (line 235) from `'**/api/decisions/*/narrative'` to `'**/api/decisions/*/narrative?**'`, matching the existing `stubDecisions` (`'**/api/decisions?**'`) pattern.
- [x] 1.2 Widen `stubNarrativeError`'s `page.route` glob (line 249) to the same `'**/api/decisions/*/narrative?**'` pattern.
- [x] 1.3 Add a new test in the `Tier 2 — narrative disclaimer` `describe` block (near line 688) that stubs `page.route('**/api/decisions/*/narrative?**', ...)` with a handler mirroring the real route's contract: reads `market` from the request URL's query string, `route.fulfill`s `400`/`{code: 'BAD_MARKET'}` when it is missing/invalid, and `200`/narrative text when it is `'crypto'` or `'acciones'`. Assert the narrative panel reaches `data-state="done"` and its `narrative-text` testid shows the stubbed text — this fails against current unfixed `NarrativePanel.tsx`/`DrilldownPanel.tsx` because no `market` param is ever sent.
- [x] 1.4 (Deviation, in-scope per proposal risk mitigation) Widen the inline `page.route('**/api/decisions/*/narrative', ...)` glob in the `Tier 2 — lazy narrative fetch` test (line 655) to the same query-tolerant pattern — this stub predates the `stubNarrativeSuccess`/`stubNarrativeError` helpers and has the identical bug; left unwidened it would silently break after the Phase 3 fix (uninterecepted request falls through to the real dev server).

## Phase 2: Confirm RED

- [x] 2.1 Ran `npx playwright test tests/e2e/dashboard.spec.ts -g "market"` against current (unfixed) code. Confirmed it fails for the right reason: the panel is stuck at `data-state="failed"` because the stubbed handler 400s with `BAD_MARKET` — not an unrelated selector/timeout error. Widening the globs (1.1/1.2/1.4) additionally turned 4 previously-passing tests RED for the same root cause (exactly the "widened globs surface other currently-masked narrative assertions" risk the proposal flagged) — see apply-progress.md for full RED evidence.

## Phase 3: GREEN — Apply the Wiring Fix

- [x] 3.1 In `app/(dashboard)/components/NarrativePanel.tsx`: imported `type { Market } from '@/src/domain/types'` and added `market: Market` to `NarrativePanelProps`.
- [x] 3.2 In the same file, destructured `market` from props and changed the fetch call from `` fetch(`/api/decisions/${asset}/narrative`) `` to `` fetch(`/api/decisions/${asset}/narrative?market=${market}`) ``; added `market` to the effect's dependency array (alongside `asset`, `attempt`).
- [x] 3.3 In `app/(dashboard)/components/DrilldownPanel.tsx`, changed `<NarrativePanel asset={decision.asset} />` to `<NarrativePanel asset={decision.asset} market={decision.market} />`.

## Phase 4: Optional Hardening

- [x] 4.1 In `app/(dashboard)/components/NarrativePanel.tsx`, added `'BAD_MARKET'` to the `UNAVAILABLE_CODES` set: `new Set(['BAD_ASSET', 'NO_DECISION', 'NOT_APPLICABLE', 'NARRATIVE_DISABLED', 'BAD_MARKET'])`.

## Phase 5: Verify

- [x] 5.1 Ran `npx playwright test tests/e2e/dashboard.spec.ts -g "market"` — confirmed the Phase 1 test now passes (GREEN).
- [x] 5.2 Ran `npx vitest run` — 270/270 passing, including `tests/api/narrative.test.ts` (20/20, untouched per proposal's out-of-scope).
- [x] 5.3 Ran `npx tsc --noEmit` — zero output, no type errors from the new `Market` prop.
- [x] 5.4 Ran full `npx playwright test` — 53/53 passing (52 pre-existing + 1 new), including all `stubNarrativeError`/`stubNarrativeSuccess` callers across both `dashboard.spec.ts` and `market-nav.spec.ts`, stayed green after the glob widening.
