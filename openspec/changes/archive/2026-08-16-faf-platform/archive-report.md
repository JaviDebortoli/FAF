# Archive Report — faf-platform

**Change Name**: faf-platform
**Archived Date**: 2026-08-16
**Archive Location**: `openspec/changes/archive/2026-08-16-faf-platform/`

## Change Summary

Explainable financial recommendation engine built on Soft Decision Framework (SDF) with streaming evidence composition, Wilder-smoothed indicators (RSI, MACD, SMA, Bollinger), soft-logic algebra, and decision-policy scoring. Implemented as a stacked 3-PR delivery chain (core algebra → ingestion/adapter → delivery/UI) following strict TDD with 41 distinct RED→GREEN→TRIANGULATE→SAFETY-NET tasks and 2 post-hoc deviations (D5: MACD window correction, D6: RSI window correction).

## Verification Status

**Final Verdict**: PASS — all findings closed, zero CRITICAL, zero open WARNING, zero open SUGGESTION

**Source**: `verify-report-final.md` (final independent full re-verify run)
- Verdict: `pass_with_warnings` at verification time
- Critical findings: 0
- Test count: 124/124 vitest passing, 2/2 Playwright passing
- Build: `npx tsc --noEmit` clean
- Requirements: 24/24 met
- Scenarios: 31/31 covered

**Closure Evidence**:
- `verify-report-final.md` reported 1 WARNING (closure-bookkeeping gap: missing formal TDD Cycle Evidence table)
- That WARNING was closed by commit 41646d7 adding `tdd-evidence.md` with formal RED/GREEN/TRIANGULATE/SAFETY-NET table for all 41 tasks
- State authority per `state.yaml`: "all findings from verify-report.md, verify-report-pr1.md, verify-report-pr2.md, and verify-report-final.md now closed — 0 CRITICAL, 0 open WARNING, 0 open SUGGESTION"

**Pre-archive Confirmation**:
- Working tree clean at archive time
- 124/124 vitest tests passing
- 2/2 Playwright e2e tests passing
- `npx tsc --noEmit` zero type errors
- All 41 tasks marked complete (checked) in `tasks.md`

## Implemented Features

### L3 Argumentation Engine (Phases 1-2)
- Soft-logic algebra operators (⊗, ⊕, ⊖) with label-transparency and clamp semantics
- Fixed rule table R1-R8 mapping evidence predicates to labeled theses
- Evidence graph evaluator (8 leaves → 2 RAs → 1 CA, partial-evidence handling)
- Decision policy scoring (σ calibration, gap detection, 3-way recommendation logic)

### L2 Stream Windowing & Indicators (Phase 3)
- Risk coefficient ρ from intra-window volatility (σ_ω)
- Confidence coefficient γ from Cuadro-2 formulas (dependent on RSI window state)
- **Deviation D5** (approved): MACD RSP-QL window corrected 26→50 candles (omega=26 degenerates EMA(slow) to 1 point, silencing histogram/sigma_H; 50 enables genuine sliding-window evidence)
- **Deviation D6** (approved): RSI RSP-QL window corrected 14→20 candles (omega=14 prevents Wilder continuation loop execution, emitting only seed simple-average; 20 enables genuine Wilder(1978) smoothing and avoids structural rho-collision)
- Wilder-smoothed RSI (period 14), EMA-based MACD (12/26/9), simple SMA (20/50), Bollinger bands (20±2σ)
- Window operator S2R composing quad stream + indicator computation + confidence/risk

### L1 Semantic Ingestion (Phases 4-5)
- N3 RDF triple mapping for price events (PriceEvent, OHLCV predicates, xsd datatypes)
- Indicator value quads with full disambiguation (rsiValue, macdHistogram, sma20/50, bollingerUpper/Lower)
- Binance HTTP adapter with cassette-recorded responses (OK, malformed, 429, empty, delayed)
- Cold-start <50-candle detection and insufficient-history flagging
- Allowlist enforcement (BTCUSDT, ETHUSDT, SOLUSDT only) — satisfies trustworthiness requirement T-2

### L0 Cycle Orchestration & API Routes (Phase 6)
- `runCycle(rawKlines): DecisionReport` pure function composing L1→L4 layers
- Cache-backed `/api/cycle` POST route (schema validation, shared-secret enforcement)
- `/api/decisions` GET route (cache-hit equals on-demand recompute, idempotent by design)
- Golden #1 (`paper-example.test.ts`) — synthetic 1h-candle fixture validating end-to-end output against paper's literal evidence set

### UI & Orchestration (Phase 7)
- Dashboard component with tabular decision list (asset, timestamp, decision, σ+, σ-, gap)
- Multi-asset filter and argument-trace detail table (predicates→rules→labels→net)
- n8n workflow export with Schedule Trigger + HTTP POST (1-5min cadence, safe per idempotent-recompute design D-B)
- E2E smoke tests (Playwright) validating fixture-backed cycle rendering and multi-asset filtering

## Approved Deviations

Per `docs/PRD.md` "Desvíos aprobados" and `design.md`:

| ID | Summary | Reason | Status |
|----|---------|--------|--------|
| D1 | Soft-label algebra instead of hard Boolean logic | Explicit soft-label framing in paper; enables gradual confidence | Approved |
| D2 | Indicator windows measured in candles, not time | Constraint: n8n runs 1-5min cron against 1h candles; window-size varies with clock drift | Approved |
| D3 | No D3 graph visualization in v1 | Feature deferred to v2 (UI complexity; d3 integration out of scope) | Approved (defer to v2) |
| D4 | Fixed v1 asset allowlist instead of dynamic | v1 feasibility; dynamic allowlist requires real-time Binance symbols endpoint | Approved |
| D5 | MACD RSP-QL window 26→50 candles | Post-hoc bug fix: omega=26 degenerates histogram/sigma_H to always 0 | Approved |
| D6 | RSI RSP-QL window 14→20 candles | Post-hoc bug fix: omega=14 prevents Wilder continuation loop (13<13 false), forcing simple-average only | Approved |

## Artifact Summary

### Synced to Main Specs
Five new domain specs merged into `openspec/specs/`:
- `argumentation-engine/spec.md` — Soft-logic operators, rule table, graph evaluation, scoring
- `decision-policy/spec.md` — Decision policy thresholds (σ=0.67, δ=0.20), recommendation reasons
- `stream-windowing/spec.md` — Window operators, indicator specifications, window-size constraints
- `semantic-ingestion/spec.md` — RDF ontology, triple mapping, indicator value quads
- `decision-dashboard/spec.md` — Dashboard UI, filtering, argument-trace rendering

**Diff Verification**: All five specs copied with byte-identical diff (empty diff output)

### Archived in `openspec/changes/archive/2026-08-16-faf-platform/`
- `proposal.md` — Original change proposal with scope and rollback plan
- `design.md` — Detailed design including deviations D1-D6, layer architecture, TDD order
- `tasks.md` — 41 tasks (Phase 0-7), all marked complete [x]
- `tdd-evidence.md` — Formal RED/GREEN/TRIANGULATE/SAFETY-NET table for all 41 tasks (closure evidence for WARNING 3/1)
- `specs/` — Five delta specs (now also in main `openspec/specs/`)
- `verify-report.md` — Original whole-change pass (all findings now closed)
- `verify-report-pr1.md` — PR1 deep-scrutiny pass (core-algebra scope, all findings closed)
- `verify-report-pr2.md` — PR2 deep-scrutiny pass (ingestion scope, D5/D6 bugfixes tested, all findings closed)
- `verify-report-final.md` — Final independent full re-verify pass (PASS WITH WARNINGS; the 1 WARNING now closed by tdd-evidence.md)
- `state.yaml` — Full change state record
- `archive-report.md` — This archive report

## Delivery Status

**Implementation**: Complete
- PR1 (core algebra, L3+L4): committed @ a4e31ac + f3c9c6c
- PR2 (ingestion, L2+L1+adapter): committed @ ac78520 + ec9e210 + d102b0c (D6 fix)
- PR3 (delivery, routes+UI): committed @ 9f55b71 + 5f80800 (cycle+API+UI+e2e)

**Verification**: Complete
- 124/124 vitest tests passing (21 test files)
- 2/2 Playwright e2e tests passing
- Build clean (npx tsc --noEmit)
- All findings closed

**Git State**
- Branch: faf-platform/pr3-delivery (3 stacked PRs, all committed, working tree clean)
- Not pushed to remote (local archive only, per user directive)
- Deviations D5/D6 committed on branches as bugfixes with explicit closure tracking in state.yaml

## Archive Integrity

**Mechanical Copy Operations**:
1. All five domain specs copied from `openspec/changes/faf-platform/specs/{domain}/` to `openspec/specs/{domain}/` via shell `cp`
   - Diff verification: PASS (empty diff for all five)
2. Entire change folder moved from `openspec/changes/faf-platform/` to `openspec/changes/archive/2026-08-16-faf-platform/` via `git mv`
   - Pre-move snapshot created and verified
   - Post-move diff verification: PASS (byte-identical, empty diff)
3. Archive completeness verified: all 15 artifacts present and accounted for

**Final State Authority**:
Per the archive-report hierarchy in sdd-archive/SKILL.md:
- Native review authority: Not applicable (no review launched for this candidate — receipt-driven development disabled)
- Persisted tasks artifact: `tasks.md` shows 41/41 tasks complete (all checked [x])
- Explicit final-state facts from user/orchestrator: Verify warnings fixed by D5/D6 commits and tdd-evidence.md; working tree clean; tests/build pass
- Snapshots (verify-report, apply-progress): All intermediate snapshots confirm completion with intermediate findings closed separately

## Closure Confirmation

✓ Specs merged to main  
✓ Change folder archived with date prefix  
✓ Archive verified byte-identical to source  
✓ All artifacts present  
✓ All tasks complete  
✓ All verification findings closed  
✓ No CRITICAL issues blocking archive  
✓ Working tree clean at archive time  

**SDD Cycle Complete**: The faf-platform change has been fully planned, implemented, verified, and archived. Ready for next change.
