# Archive Report: no-recommendation-filter-and-i18n

**Archived**: 2026-08-22
**Status**: Complete — unconditional PASS, fully archived
**Code delivery**: Already committed and pushed to `main` prior to this archive phase — 5 commits: `b25938c`, `b0e19a8`, `214a0a5`, `b75deef`, `a1217c0`. This phase performed no code commits, only spec-merge + archive-folder filesystem operations.

## Summary

Two bundled asks, both in scope, both implemented and verified across a 4-PR stacked-to-main delivery (Phases 1-4) plus a post-verify test-only fix commit (`a1217c0`):

1. **NO_RECOMMENDATION visibility restored (D1)** — Tier 1 previously hid every `NO_RECOMMENDATION` asset outright (a prior explicit product decision, now reversed). All assets now render a card in ALL/BUY/SELL/NO_RECOMMENDATION states; `NO_RECOMMENDATION` cards use the muted `--color-inactive` styling with a "Sin recomendación" badge instead of a BUY/SELL-style badge. A new 4th `DirectionFilter` tab ("Sin recomendación") isolates them. `EmptyState`'s `no-active` variant is rescoped to fire only when `report.decisions.length === 0` (not on an all-inactive report).
2. **Two coercion-bug fixes exposed by D1 (D2)** — `DecisionCard.tsx`'s `recommendation === 'BUY' ? 'BUY' : 'SELL'` and `ArgumentGraph.tsx`/`ThesisScores.tsx`'s `recommendation === 'BUY' ? 'bullish' : 'bearish'` both silently mislabeled `NO_RECOMMENDATION` as SELL/bearish. Fixed: `DecisionCard` passes `decision.recommendation` straight through; `winningThesis` now derives from `sigmaPlus >= sigmaMinus` directly, generalizing correctly below threshold.
3. **Spanish UI translation, domain layer untouched (D3)** — New `app/(dashboard)/lib/i18n.ts` (`translateRecommendation`, `translateDirection`, `Record`-backed lookup tables) is the single display-mapping surface consumed by `RecommendationBadge`, `EmptyState`, `DirectionFilter`. Remaining Spanish prose swept across `DashboardHeader.tsx`, `app/dashboard/(with-footer)/inicio/page.tsx`, `PipelineDiagram.tsx`, and the pinned "Determinism disclaimer" copy. `src/narrative/prompt.ts` gained a new anti-English-token rule forbidding literal "BUY"/"SELL"/"NO_RECOMMENDATION" in generated narrative prose. `Decision.recommendation`'s literal English values, `src/decision/policy.ts`, LAF rules, API contracts, and golden tests remain fully untouched, confirmed by a re-run zero-diff self-check across all 5 commits.

## Task Completion

**32/32 tasks complete at archive time** (Phases 1-5). Phases 1-4 (29 tasks) were checked at apply time across 4 separate apply batches (`apply-progress.md`). **Phase 5's 3 final-verification tasks (5.1-5.3) were still unchecked (`- [ ]`) in the persisted `tasks.md` when this archive phase began**, even though `apply-progress.md`'s own cumulative status line already read "29/32... not yet ready for `sdd-verify` on the full change — Phase 5 remains" — i.e. Phase 5 was never `sdd-apply`'s responsibility to check, it is `sdd-verify`'s final-suite gate.

This archive phase applied the Task Completion Gate's exceptional-reconciliation allowance: `sdd-verify`'s independent re-verification pass (Engram `sdd/no-recommendation-filter-and-i18n/verify-report`, observation #1757, `evidence_revision sha256:0afb91520efbade90331d22970aed177a90fe7d4b0118b127baac5b6be777a09`, 2026-08-22 00:58:54) explicitly states: *"Tasks complete | 32 (Phases 1-5, including 5.1-5.3 previously open, now satisfied; 5.3 gap is closed by `a1217c0`)"* — backed by a fresh independent full-suite run (`npx tsc --noEmit`: 0 errors; `npx vitest run`: 239/239; `npx playwright test`: 52/52), a re-run D3 zero-diff self-check spanning all 5 commits, and a 17/17 spec-scenario compliance matrix covering exactly the scenarios 5.3 asks to self-check. Tasks 5.1-5.3 were checked off in `tasks.md` by this phase, with the reconciliation reason and the cited evidence recorded inline as an HTML comment immediately below them, before the archive folder move.

## Verify Verdict (per `verify-report.md`, Engram observation #1757)

**Verdict**: PASS — unconditional, second/re-verification pass, superseding a first FAIL report (Engram observation, `evidence_revision sha256:11c876ed98d7ac81340226d456e9057b6adfff4e88282413f53264e52fe09465`, same topic key, now superseded in-place).

**What changed between the two passes**: the first pass found exactly one CRITICAL gap — the "NO_RECOMMENDATION card opens its drill-down" scenario had no test coverage. Commit `a1217c0` (`test(e2e): cover NO_RECOMMENDATION card drill-down click-through`) added one new Playwright test (36 lines, test-only, zero production code touched) closing it. `sdd-verify` re-ran the full suite fresh and independently (not reused from the first pass) and re-confirmed D1/D2/D3 with no regression, since only that one test file changed.

**CRITICAL**: 0
**WARNING**: 0
**SUGGESTION**: 2 (both carried forward unchanged from the first pass, both explicitly non-blocking):
1. The two "Spanish-language output" scenarios are verified only via static golden-prompt-content assertions (byte-identity + `toContain` checks on `NARRATIVE_SYSTEM_PROMPT`), not live-model output inspection — a pre-existing repo convention (no live LLM calls in the test suite), not a gap introduced by this change.
2. An unrelated, pre-existing uncommitted working-tree diff to `n8n/faf-workflow.json` (a cron cadence tweak, predates this SDD session) is present and should be handled separately by the user; it does not affect this change's committed-history evidence.

**Build**: `npx tsc --noEmit` — PASSED, 0 errors.
**Tests**: 291/291 passed (239 Vitest + 52 Playwright), 0 failed, 0 skipped — fresh independent run, exit code 0 for all three commands.
**Spec compliance**: 17/17 scenarios compliant across all 3 domains (decision-dashboard 11/11, market-navigation 4/4, decision-narrative 2/2), up from 16/17 in the first pass.
**D1/D2/D3 re-confirmation**: all three re-confirmed by direct source re-read (not just diff inspection), unregressed since only a test-only commit was added between passes. D3's zero-diff self-check (`git diff c34a955..HEAD --stat` across `src/domain/types.ts`, `src/decision/policy.ts`, `src/laf/`, `src/stream/`, `src/cycle/`, `app/api/`, `tests/golden/`, `tests/decision/policy.test.ts`, `n8n/faf-workflow.json`) is empty across all 5 commits.

## Spec Sync

Three delta specs, all MODIFIED requirements, merged verbatim from the delta's own final wording into the live main specs (target-end-state text matched by requirement-name lookup, not reinterpreted):

| Domain | Main spec | Requirement | Action | Details |
|---|---|---|---|---|
| decision-dashboard | `openspec/specs/decision-dashboard/spec.md` | Card overview (Tier 1) | MODIFIED | 4-way visibility (all assets render), 3-way Spanish badge state, `--color-inactive` muted styling for NO_RECOMMENDATION, 4-way direction filter |
| decision-dashboard | `openspec/specs/decision-dashboard/spec.md` | Tier 2 drill-down | MODIFIED | `winningThesis` now derived from real σ⁺/σ⁻ comparison, not the recommendation label; NO_RECOMMENDATION cards remain clickable |
| decision-dashboard | `openspec/specs/decision-dashboard/spec.md` | Multi-asset display | MODIFIED | Card count follows n8n's push regardless of recommendation direction, filterable across all four states |
| market-navigation | `openspec/specs/market-navigation/spec.md` | Determinism disclaimer appears on every market view | MODIFIED | Pinned copy translated: "recomendación BUY/SELL" → "recomendación Compra/Venta/Sin recomendación" |
| decision-narrative | `openspec/specs/decision-narrative/spec.md` | Spanish-language output | MODIFIED | Added the anti-English-token constraint (narrative MUST NOT echo literal "BUY"/"SELL") and its scenario |

**One cross-domain-file resolution required, recorded here for traceability**: the delta spec (Engram `sdd/no-recommendation-filter-and-i18n/spec`, observation #1752) filed its "DirectionFilter wiring unchanged by the navigation redesign" MODIFIED requirement under `## Domain: market-navigation`. However, `openspec/specs/market-navigation/spec.md` does not — and never did — contain a requirement with that name; the actual live requirement with that exact heading exists in `openspec/specs/decision-dashboard/spec.md` (a pre-existing filing quirk that predates this change; likely a filed-under-the-wrong-domain artifact from an earlier `market-nav-redesign`-era spec session, not introduced by this change). Following the skill's "match requirements by name" merge rule over the delta's stated domain label, this archive phase merged the "DirectionFilter wiring" MODIFIED content into `openspec/specs/decision-dashboard/spec.md`'s existing requirement of that name (4-way state, Spanish labels, new "Sin recomendación filter isolates muted cards" scenario), and left `openspec/specs/market-navigation/spec.md` untouched for that requirement name, since no matching requirement exists there to modify. This is a pre-existing spec organization inconsistency, not a defect introduced by this change or this archive — flagged under Risks below for a future cleanup change to consider consolidating.

All other requirements in `decision-dashboard/spec.md` (LLM narrative and graph visualization confined to Tier 2, No-data UX, Crypto dashboard route under market navigation, Dual-needle gauge, Card-grid breakpoints, Crypto view heading, Presentation-cache TTL) and `market-navigation/spec.md` (Sidebar navigation shell, Shared shell footer, Per-market routing, Placeholder-market page, Mobile navigation drawer, Sidebar accessibility baseline, No new third-party CDN/font dependency, Dashboard eyebrow copy) and `decision-narrative/spec.md` (Narrative endpoint contract, Visible AI-generated disclaimer, Graceful degradation on failure, Cost-mitigation caching, Narrative quality manual verification) were preserved unchanged — not touched by this change's delta.

## Mechanical Copy / Move Verification

Per the Mechanical Copy Contract, all filesystem operations used `git mv`/`cp -R` only; no artifact content passed through Read→Write. Text-merge edits (spec MODIFIED-requirement replacement, `tasks.md` checkbox reconciliation) used targeted `Edit` on exact matched blocks, not full-file copies, per the skill's merge workflow (a text-merge operation, distinct from mechanical file copy).

**`tasks.md` checkbox reconciliation**: tasks 5.1-5.3 checked via targeted `Edit`, with the reconciliation reason and cited evidence recorded inline as an HTML comment, before the archive move.

**Archive folder move**: `git mv openspec/changes/no-recommendation-filter-and-i18n openspec/changes/archive/2026-08-22-no-recommendation-filter-and-i18n`, preceded by a recursive `cp -R` snapshot to a scratch directory for independent readback.

**`diff -r` readback (source snapshot vs. archived destination, archive-report.md excluded since it did not exist pre-move)**:
```
$ diff -r "$snapshot_root/source" "openspec/changes/archive/2026-08-22-no-recommendation-filter-and-i18n"
(no output)
$ echo $?
0
```
Empty diff — byte-identical move confirmed. Source directory `openspec/changes/no-recommendation-filter-and-i18n/` no longer exists. Scratch snapshot removed after readback.

**Main spec merges**: applied via 6 targeted `Edit` calls (block replacement of exact matched requirement sections, by heading) across `decision-dashboard/spec.md` (3 requirements), `market-navigation/spec.md` (1 requirement), `decision-narrative/spec.md` (1 requirement). Replacement text copied verbatim from the delta specs' own final wording (read directly, not paraphrased). `git diff --stat` confirms additive, targeted changes only: `decision-dashboard/spec.md` +34/-21, `decision-narrative/spec.md` +7/-1, `market-navigation/spec.md` +2/-1. A post-merge grep for leftover untranslated `BUY/SELL`/`ALL/BUY/SELL` tokens across all 3 files found only intentional occurrences: `Decision.recommendation` literal-value references, doc-level "MUST show ... badge treatment" phrasing, and `(Previously: ...)` historical trailers — no live user-facing English string was left behind.

## Archive Contents

- `proposal.md` ✅
- `design.md` ✅
- `exploration.md` ✅
- `specs/decision-dashboard/spec.md` ✅ (delta, now merged into main spec)
- `specs/market-navigation/spec.md` ✅ (delta, now merged into main spec)
- `specs/decision-narrative/spec.md` ✅ (delta, now merged into main spec)
- `tasks.md` ✅ (32/32 tasks complete, including 5.1-5.3 reconciled during this phase)
- `apply-progress.md` ✅ (4 phase batches recorded)
- `verify-report.md` ✅ (re-verification pass, unconditional PASS)
- `archive-report.md` ✅ (this file, written during archive)

## Source of Truth Updated

- `openspec/specs/decision-dashboard/spec.md` now reflects: all 4 recommendation states visible as cards with the 3-way Spanish badge state (Compra/Venta/Sin recomendación) and `--color-inactive` muted styling; the fixed `winningThesis` derivation from real score comparison; the 4-way `DirectionFilter` wiring (including "Sin recomendación filter isolates muted cards"); card count following n8n's push regardless of direction.
- `openspec/specs/market-navigation/spec.md` now reflects the translated "Determinism disclaimer" pinned copy (Compra/Venta/Sin recomendación, not BUY/SELL).
- `openspec/specs/decision-narrative/spec.md` now reflects the anti-English-token constraint on generated narrative prose.

## Traceability — Engram Observation IDs Read

- `sdd/no-recommendation-filter-and-i18n/proposal` — observation #1751
- `sdd/no-recommendation-filter-and-i18n/spec` — observation #1752
- `sdd/no-recommendation-filter-and-i18n/design` — observation #1753
- `sdd/no-recommendation-filter-and-i18n/tasks` — observation #1754
- `sdd/no-recommendation-filter-and-i18n/verify-report` — observation #1757 (second/re-verification pass; supersedes a first FAIL pass at the same topic key, `evidence_revision sha256:11c876ed98d7ac81340226d456e9057b6adfff4e88282413f53264e52fe09465`)

(`exploration.md`, delta `specs/{decision-dashboard,market-navigation,decision-narrative}/spec.md`, `apply-progress.md`, and `tasks.md` were read directly from the filesystem, since this change's artifacts already existed on disk under hybrid mode.)

## Native Review Receipt Gate

No `reviewGate` was reported for this candidate in the launch context (structurally absent — no populated value to check). Archive proceeded under ordinary repository policy, consistent with the gate's "kill switch off / no review ever started for this candidate" branch. No review transaction/ledger/receipt/gate-context topics were read, since none exist for this candidate.

## Risks / Open Items

None blocking archive. Carried forward for visibility only:

1. **Pre-existing spec cross-domain-file filing quirk** (see Spec Sync above): the "DirectionFilter wiring unchanged by the navigation redesign" requirement physically lives in `decision-dashboard/spec.md` rather than `market-navigation/spec.md`, despite this and prior changes' delta specs filing it under the `market-navigation` domain label. Not introduced by this change; recommend a future cleanup change to either move the requirement to `market-navigation/spec.md` or correct the domain convention documentation, so future delta authors file against the requirement's actual location.
2. The 2 non-blocking SUGGESTIONs from `verify-report.md` (static-only Spanish-narrative-quality test coverage; unrelated pre-existing `n8n/faf-workflow.json` working-tree diff) remain open as optional future hardening, not defects.

## SDD Cycle Complete

The change has been fully planned (proposal, spec, design), implemented (apply, 4 phase batches, 5 commits on `main`), verified (re-verification pass, unconditional PASS, 0 CRITICAL/0 WARNING, 17/17 scenarios compliant), and archived (3 spec deltas merged across 2 domains — with one cross-file requirement resolved by name-match, folder moved, byte-identical `diff -r` confirmed, Phase 5 tasks reconciled with cited evidence). Code was already committed and pushed to `main` prior to this archive phase. This phase's filesystem changes (spec merges in `openspec/specs/{decision-dashboard,market-navigation,decision-narrative}/spec.md`, `tasks.md` checkbox reconciliation, and the archive folder move) are uncommitted and left for the orchestrator to review and commit separately.
