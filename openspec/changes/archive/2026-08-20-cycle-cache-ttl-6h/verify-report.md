# Verify Report: cycle-cache-ttl-6h

**Change**: Raise the presentation-cache TTL to match the 6h n8n cadence
**Mode**: Full artifacts (proposal + design + specs + tasks + apply-progress) - verified independently, not trusting apply-progress.md's or the orchestrator's prior claims.

## Completeness Table

| Task | Status | Verified |
|---|---|---|
| 1.1 BETA_MS 1h to 8h + doc comment rewrite | Checked | Confirmed by direct read of src/cycle/constants.ts - text matches design.md's exact replacement byte-for-byte |
| 2.1 npx tsc --noEmit | Checked | Re-run independently: exit 0, zero errors |
| 2.2 Full npx vitest run | Checked | Re-run independently: 37 files / 224 tests passed, exit 0 |
| 2.3 Grep sweep for hardcoded TTL literal | Checked | Re-run independently with fresh grep patterns; no live hardcoded 60*60*1000/3600000/3_600_000 tied to BETA_MS's purpose found |
| Phase 3 spec delta merge | Not started (by design) | Confirmed: openspec/specs/decision-dashboard/spec.md does NOT contain the new "Presentation-cache TTL survives the n8n inter-run gap" requirement - correctly deferred to sdd-archive per repo convention (matches n8n-cadence-6h, narrative-model-haiku precedent) |
| 4.1 [MANUAL-VERIFICATION-ONLY] live production confirmation | Unchecked (intentional gate) | Correctly still open - cannot be marked PASS by this or any automated phase |

4/5 automatable tasks complete, matching apply-progress.md's claim - independently confirmed, not copied.

## Build / Test Evidence (independently re-run)

**Command**: npx tsc --noEmit
**Result**: exit code 0, zero type errors.

**Command**: npx vitest run
**Result**: exit code 0.
```
Test Files  37 passed (37)
     Tests  224 passed (224)
```
Matches apply-progress.md's and the orchestrator's prior counts, but was obtained via a fresh, independent run in this phase, not copied.

## Source Inspection

### src/cycle/constants.ts (full file re-read)
Confirmed exact match to design.md's specified replacement for lines 1-17:
- `export const BETA_MS = 8 * 60 * 60 * 1000;` - value correct (8h in ms).
- Doc comment rewritten: no longer references "paper Cuadro 1 beta" as the source of the value; explicitly disambiguates from `WindowSpec.beta: 1` (the real Cuadro 1 beta, a dimensionless candle-count in src/domain/types.ts), states the real purpose (presentation-cache TTL, consumed by app/api/cycle/route.ts's `cache.put(report, BETA_MS)` and src/narrative/cache.ts's default `ttlMs` param), and documents the 8h-over-7h margin rationale (6h n8n cadence + ~33% safety margin, asymmetric cost argument).
- `MAX_ASSETS = 25` block (lines 19-29) unchanged, as expected - out of scope for this change.

### app/api/cycle/route.ts (full file re-read)
Confirmed untouched / no edit. Line 131: `cache.put(report, BETA_MS);` - still references the imported constant (line 6: `import { BETA_MS, MAX_ASSETS } from '@/src/cycle/constants';`), not a literal. Inherits the new 8h value automatically with zero code change, as proposal.md and design.md claimed.

### src/narrative/cache.ts (full file re-read)
Confirmed untouched / no edit. Line 1: `import { BETA_MS } from '@/src/cycle/constants';`. Line 46: `export function put(asset: Asset, t: Millis, text: string, ttlMs: Millis = BETA_MS, atMs: Millis = Date.now())` - default parameter still references the constant. Inherits the new value automatically, as claimed.

### tests/narrative/cache.test.ts (full file re-read, 92 lines)
Every cache.put/cache.get call passes BETA_MS (imported from @/src/cycle/constants) as an explicit argument, and every boundary assertion is TTL-relative: `BETA_MS - 1` (still-fresh boundary) and `BETA_MS` (expiry boundary, exclusive). No literal 3600000/60*60*1000/hardcoded 1h duration appears anywhere in this file. These assertions remain exactly as meaningful at the new 8h value as they were at 1h - they test relative boundary behavior around whatever BETA_MS currently is, not a fixed duration. Confirms design.md's and apply-progress.md's claim; not just trusted from the pass count.

### tests/api/decisions.test.ts (full file re-read, 71 lines)
Only 3 tests; none reference BETA_MS directly. The "expired cache entry" test seeds via `seedCycleCache(buildReport(), 1)` - an explicit 1ms TTL override (via tests/helpers/seedCycleCache.ts's ttlMs param, default 60_000), then waits 5ms and expects a 503. This test is structurally decoupled from BETA_MS's value entirely (it never uses the constant), so it is correct and unaffected by the 1h to 8h change either way. No hardcoded old-TTL literal present.

### openspec/specs/decision-dashboard/spec.md (live spec, full file re-read)
Confirmed it does NOT yet contain the change's new "Presentation-cache TTL survives the n8n inter-run gap" requirement or its [MANUAL-VERIFICATION-ONLY] scenario - those exist only under openspec/changes/cycle-cache-ttl-6h/specs/decision-dashboard/spec.md (the delta). This is correct, expected behavior per this repo's established convention: ADDED-requirement merges into the live spec happen at sdd-archive time, not sdd-apply. Not a gap in this verify pass.

## Grep Sweep - Independent Re-check

Searched the full live tree (patterns: 3600000, 3_600_000, 60 * 60 * 1000, 60*60*1000) outside node_modules. All hits fall into one of two categories:

1. **This change's own OpenSpec artifacts** (proposal.md, design.md, tasks.md, apply-progress.md, exploration.md) - expected, documentation describing the edit itself, not code.
2. **Structurally unrelated 1h/3.6M-ms literals**, confirmed by reading surrounding context:
   - tests/stream/window.test.ts, tests/stream/evidence.test.ts (HOUR = 3_600_000), tests/rdf/mapCandles.test.ts, tests/e2e/dashboard.spec.ts - all candle-spacing/RSI-window timestamp fixtures (1-hour candle intervals in synthetic test data), unrelated to the presentation-cache TTL.
   - tests/fixtures/**/*.json - raw Binance kline timestamp fixtures (epoch-ms candle open times), unrelated.
   - n8n/faf-workflow.json - the Fetch Klines node's "interval": "1h" (Binance candle-interval config) and the Schedule Trigger's "hours" field - read in full context; confirmed these are the candle-window/cadence settings, not the TTL, per proposal.md's explicit "Out of Scope" callout. Correctly left untouched.
   - openspec/specs/semantic-ingestion/spec.md - its "1h" references are the Fetch Klines candle interval (interval: "1h", limit: "50"), a live spec for a different capability (semantic-ingestion, not decision-dashboard); confirmed unrelated to BETA_MS.

No live, non-archived hardcoded literal tied to the presentation-cache-TTL concept was found outside src/cycle/constants.ts itself. This independently confirms apply-progress.md's 2.3 claim rather than trusting it.

## Spec Compliance Matrix

| Requirement / Scenario | Status | Evidence |
|---|---|---|
| BETA_MS = 8 * 60 * 60 * 1000, doc comment corrected | PASS | Direct source read, matches design.md exactly |
| All existing tests pass unchanged (zero test edits) | PASS | 224/224 tests pass on independent re-run; TTL-adjacent test files inspected line-by-line, no hardcoded-old-value assertions found |
| [MANUAL-VERIFICATION-ONLY] - live production confirmation that the dead-window symptom is resolved | BLOCKED - cannot be evaluated by this or any automated phase | Requires live user observation across a real 6h n8n inter-run window in production; no harness exists in this repo (design.md Testing Strategy, confirmed) |

## Design Coherence

No deviation from design.md found. The exact replacement text for src/cycle/constants.ts lines 1-17 matches verbatim. The "keep narrative/cache.ts coupled via = BETA_MS" decision was honored (file untouched, default param intact). The "no consumer edit needed" claim for app/api/cycle/route.ts was honored (file untouched, still references the constant).

## Issues

**CRITICAL**: None.

**WARNING**: None.

**SUGGESTION**: None.

## Verdict

**PASS WITH WARNINGS** - all automatable dimensions (source correctness, design coherence, test evidence, task completion, TTL-literal sweep) are fully verified and pass with zero issues. However, this change carries a standing, by-design manual-verification gate (task 4.1 / the [MANUAL-VERIFICATION-ONLY] spec scenario) that this phase cannot satisfy - no automated harness exists for live multi-hour n8n scheduling behavior in production.

**Overall change status: blocked-on-manual-verification, not a verify failure.** Everything this phase can independently prove is correct and complete. sdd-archive MUST NOT mark this change as full PASS until the user explicitly confirms live in production (across a real 6h n8n inter-run window, including near the end of the window) that "Servicio momentaneamente no disponible" no longer appears solely due to presentation-cache TTL expiry. This is expected, intentional gating per this repo's established manual-verification-gate norm (n8n-cadence-6h task 5.1, narrative-model-haiku task 5.1 precedent) - not a defect discovered in this verify pass.
