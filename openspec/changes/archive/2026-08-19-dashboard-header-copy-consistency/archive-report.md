# Archive Report: Dashboard Header Copy Consistency (dashboard-header-copy-consistency)

**Change**: dashboard-header-copy-consistency
**Archived**: 2026-08-19
**Status**: COMPLETE — SDD cycle closed, artifacts archived, Strict TDD verification PASS (pass 3)

---

## Intent

Dashboard market views showed inconsistent, redundant header copy: the eyebrow repeated "FAF · " (already implied by app chrome), crypto's `<h1>` ("Recomendaciones activas") did not follow the "show market name" pattern every other market view already used, and the "not AI-generated" determinism disclaimer appeared only on the crypto view. This change aligned header copy across all `/dashboard/*` views per explicit user request.

## What Was Built

- Created `app/(dashboard)/components/DashboardHeader.tsx` — a shared, pure-markup server component with a `title: string` and `showDisclaimer?: boolean` (default `false`) prop contract. It renders the fixed eyebrow literal "Panel de decisiones" (no "FAF · " prefix), the `title` as `<h1>`, and the determinism disclaimer paragraph verbatim when `showDisclaimer` is true. Extraction (rather than inline duplication) was design's deliberate choice: the disclaimer had already silently diverged between the two page files once — that drift is the root cause this change fixes — and `MarketPlaceholder.tsx` was the repo's existing DRY precedent for shared dashboard chrome.
- `app/dashboard/crypto/page.tsx`: replaced the inline `<header>` with `<DashboardHeader title={cryptoMarket.label} showDisclaimer />`; the heading is now data-driven from `MARKETS.crypto.label` instead of a hardcoded literal.
- `app/dashboard/[market]/page.tsx`: replaced the inline `<header>` with `<DashboardHeader title={market.label} showDisclaimer />`, extending the disclaimer to every placeholder-market view.
- Tests: updated 2 e2e assertions in `tests/e2e/market-nav.spec.ts` ("Recomendaciones activas" → "Criptomonedas"); added 4 new e2e assertions (exact-text eyebrow ×2, crypto-route disclaimer ×1, placeholder-route disclaimer ×1); created `tests/dashboard/crypto/page.test.ts` — this repo's first component-render unit test (`vi.mock` the markets module, `renderToString` the synchronous Server Component, assert the mocked catalog label reaches the output HTML); added `esbuild: { jsx: 'automatic' }` to `vitest.config.ts` (the classic JSX transform failed with `ReferenceError: React is not defined`). Zero new dependencies.

## Final Verification State

Per `verify-report.md` (RE-VERIFY pass 3, 2026-08-19, evidence_revision sha256:bbf9f3de71f271df3dd00c7869fdbf0c4ed93a20e377b29a05ee9bad8f04f652; Engram observation 1606), independently re-executed:

- **Verdict**: PASS
- **Blockers**: 0 — **Critical findings**: 0 — **Warnings**: 0
- **Requirements**: 3/3 COMPLIANT — **Scenarios**: 6/6 COMPLIANT (up from 2/6 at pass 1, 5/6 at pass 2)
- **Build**: `npx tsc --noEmit` — clean, exit 0
- **Unit tests**: `npx vitest run` — 224/224 passing across 37/37 files (223 pre-existing + 1 new)
- **E2E tests**: `npx playwright test` — 38/38 passing
- **TDD compliance**: 6/6 mechanics checks; assertion quality audit clean (no tautologies); mutation trip-wires confirmed for both follow-up batches

The pass-2 CRITICAL ("Heading updates if the catalog label changes" was inspection-only) is CLOSED by follow-up batch 2: the new unit test was scrutinized hard in pass 3 and proven to really intercept the markets module (mock supplies `'Test Crypto Label'` where the real catalog value is `'Criptomonedas'` — interception demonstrated by the passing assertion, not assumed) and to really exercise the `MARKETS.crypto.label → h1` data flow (mutation trip-wire: hardcoded title → test failed → reverted).

## Deviations from Design

1. **Guarded local in `crypto/page.tsx`** (task 2.2): `tsconfig.json` sets `"noUncheckedIndexedAccess": true`, so `MARKETS.crypto.label` inline failed `tsc` with TS18048. Fixed with a guarded `const cryptoMarket = MARKETS.crypto; if (!cryptoMarket) throw ...` local, mirroring `Sidebar.tsx`'s existing defensive-guard convention (no `!.` non-null assertion precedent exists under `app/`). Functionally identical to design; documented in apply-progress and re-validated in verify pass 3.
2. **Line-number drift in tasks.md references**: task 1.2's `market-nav.spec.ts:348` citation moved to `:360` after the new disclaimer test was inserted above it; further drift after follow-up batch 1 (see Follow-up Suggestions below). Documentation-only, no functional impact.

## Follow-up Suggestions Carried Forward (non-blocking, open by decision)

From verify pass 3 — three SUGGESTIONs, deliberately not fixed in this change:

1. `tasks.md`'s Phase 5 table cites `market-nav.spec.ts:246,360` for the crypto h1 assertions; current locations after follow-up batch 1 insertions are lines 290 and 404 (documentation drift only).
2. The new unit test asserts `html.toContain('Test Crypto Label')` on the whole document rather than an h1-scoped match — functionally equivalent here (the h1 is the only consumer of `cryptoMarket.label` in the render tree), but scoping to the h1 markup would be marginally more precise.
3. (Carried from pass 2) The two pre-existing `toContainText('Criptomonedas')` e2e assertions check `page.locator('main')` for a substring rather than `main h1` with exact text — tightening would match the exact-text rigor applied elsewhere. Not part of this change's scope; not a regression.

## Delivery Route

Per `tasks.md`'s Review Workload Forecast and Delivery Recommendation: **single PR, no chaining**, ~100-140 estimated changed lines, comfortably under the 400-line review budget. This archive phase performed only the spec merge and mechanical folder move — it did **not** commit, push, or open any PR. Git delivery belongs to the orchestrator's next step.

---

## Delta Specs Merged

| Domain | Action | Details |
|---|---|---|
| decision-dashboard | Updated (delta merged) | 1 ADDED requirement ("Crypto view heading reflects market catalog label", 2 scenarios) appended to `openspec/specs/decision-dashboard/spec.md`. All 9 pre-existing requirements preserved untouched. |
| market-navigation | Updated (delta merged) | 2 ADDED requirements ("Dashboard eyebrow copy is consistent across market views", 2 scenarios; "Determinism disclaimer appears on every market view", 2 scenarios) appended to `openspec/specs/market-navigation/spec.md`. All 7 pre-existing requirements preserved untouched. |

**Merge verification**: `git diff --stat -- openspec/specs/` → `openspec/specs/decision-dashboard/spec.md | 17 ++++++++++++++++` and `openspec/specs/market-navigation/spec.md | 37 +++++++++++++++++++++++++++++++++++++` — 54 insertions, 0 deletions (additive-only). Non-destructive merge; the `rules.archive` destructive-merge warning does not apply.

---

## Artifacts Archived

| Artifact | Location | Status |
|---|---|---|
| proposal.md | `openspec/changes/archive/2026-08-19-dashboard-header-copy-consistency/proposal.md` | Moved |
| exploration.md | `openspec/changes/archive/2026-08-19-dashboard-header-copy-consistency/exploration.md` | Moved |
| design.md | `openspec/changes/archive/2026-08-19-dashboard-header-copy-consistency/design.md` | Moved |
| tasks.md | `openspec/changes/archive/2026-08-19-dashboard-header-copy-consistency/tasks.md` | Moved (12/12 + FB1.1 + FB2.1 complete) |
| apply-progress.md | `openspec/changes/archive/2026-08-19-dashboard-header-copy-consistency/apply-progress.md` | Moved |
| verify-report.md | `openspec/changes/archive/2026-08-19-dashboard-header-copy-consistency/verify-report.md` | Moved (pass-3 report) |
| specs/decision-dashboard/spec.md | `openspec/changes/archive/2026-08-19-dashboard-header-copy-consistency/specs/decision-dashboard/spec.md` | Moved (delta) |
| specs/market-navigation/spec.md | `openspec/changes/archive/2026-08-19-dashboard-header-copy-consistency/specs/market-navigation/spec.md` | Moved (delta) |
| archive-report.md | `openspec/changes/archive/2026-08-19-dashboard-header-copy-consistency/archive-report.md` | Written (this file) |

**Mechanical move verification**: the change folder was untracked (`??` in `git status`), so the move used `Move-Item` (the `mv` fallback per the mechanical copy contract — `git mv` applies only to tracked paths). A recursive pre-move snapshot was copied to a temp directory; after the move the source folder was confirmed absent, and `diff -r` (snapshot vs. archived tree) produced **empty output, exit code 0** — byte-identity confirmed. Verbatim readback:

```text
DIFF_EXIT_CODE=0
```

(No diff lines emitted — an empty `diff -r` is the passing evidence.)

---

## Engram Observation IDs (for traceability)

| Artifact | Observation ID | Topic Key |
|---|---|---|
| exploration | 1596 | sdd/dashboard-header-copy-consistency/explore |
| proposal | 1599 | sdd/dashboard-header-copy-consistency/proposal |
| spec | 1600 | sdd/dashboard-header-copy-consistency/spec |
| design | 1601 | sdd/dashboard-header-copy-consistency/design |
| tasks | 1603 | sdd/dashboard-header-copy-consistency/tasks (re-synced 2026-08-19 after pass-2 flagged it stale; now matches on-disk tasks.md) |
| apply-progress | 1605 | sdd/dashboard-header-copy-consistency/apply-progress |
| verify-report | 1606 | sdd/dashboard-header-copy-consistency/verify-report (pass-3 revision) |
| archive-report | (this save) | sdd/dashboard-header-copy-consistency/archive-report |

---

## Final State Gates

**Task Completion Gate**: All 12 original implementation/verification tasks plus follow-up batches FB1.1 and FB2.1 confirmed complete via direct on-disk read of `tasks.md` at archive time — zero unchecked boxes. `sdd-verify` pass 3 independently corroborated the same count from disk.

**Spec Merge Gate**: Both delta specs merged additively into existing main specs (54 insertions, 0 deletions via `git diff --stat`); all pre-existing requirements in both domains preserved.

**Mechanical Archive Gate**: Folder moved to `openspec/changes/archive/2026-08-19-dashboard-header-copy-consistency/`; source absent post-move; empty `diff -r` against pre-move recursive snapshot (verbatim output above).

**Verification Gate**: PASS (pass 3) with 0 CRITICAL, 0 WARNING, 3 non-blocking SUGGESTIONs (carried forward above); 3/3 requirements and 6/6 scenarios COMPLIANT; `tsc` clean, vitest 224/224 (37 files), playwright 38/38 — all independently re-executed by `sdd-verify`, not copied from apply self-reports.

---

## Archive Closure

This change is **closed and archived**. Implementation and verification are complete; the working tree changes are **not yet committed and no PR has been opened** — that delivery step is intentionally out of scope for this archive phase and belongs to the orchestrator (single PR per the delivery recommendation). The delta requirements now live in `openspec/specs/decision-dashboard/spec.md` and `openspec/specs/market-navigation/spec.md`, and this report completes the SDD cycle.
