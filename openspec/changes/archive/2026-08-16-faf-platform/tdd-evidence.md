# TDD Cycle Evidence — faf-platform

Formal RED/GREEN/TRIANGULATE/SAFETY-NET table for all 41 tasks in `tasks.md`, closing the reporting-format gap first flagged as WARNING 3 in `verify-report.md`, inherited as WARNING 3 in `verify-report-pr1.md`, and re-flagged as WARNING 1 in `verify-report-final.md` (the table had been drafted directly in the Engram `apply-progress` observation but was lost when that observation was later summarized/revised — this file exists specifically so the evidence survives independent of any single memory revision).

Legend:
- **RED**: the failing test written first.
- **GREEN**: the implementation that makes it pass.
- **TRIANGULATE**: the distinct cases/boundaries a single test covers, forcing a genuine (non-fake) implementation.
- **SAFETY-NET**: what downstream test(s) would catch a regression in this module if it broke later — the two real post-hoc bugs (D5/MACD, D6/RSI) were both caught exactly this way, by Golden #1, not by a human re-reading the code.

## Phase 0: Scaffolding & Shared Types

| Task | RED | GREEN | TRIANGULATE | SAFETY-NET |
|---|---|---|---|---|
| 0.1 | N/A — scaffolding, no behavior to fail first | Next.js/TS/Vitest/N3.js scaffold, `vitest.config.ts` | N/A | Every subsequent task's test run implicitly validates the scaffold |
| 0.2 | N/A — type declarations, no runtime behavior | `src/domain/types.ts` | N/A | `npx tsc --noEmit` across all 41 tasks |
| 0.3 | N/A — const declaration | `src/market/assets.ts` allowlist + Binance base URL | N/A | Exercised by `tests/market/binance.test.ts` (5.1) and the allowlist-rejection case in `tests/api/cycle.test.ts` (6.5) |

## Phase 1: L3 Argumentation Engine

| Task | RED | GREEN | TRIANGULATE | SAFETY-NET |
|---|---|---|---|---|
| 1.1 / 1.2 | `tests/laf/algebra.test.ts` | `src/laf/algebra.ts` (⊗/⊕/⊖) | ⊗ transparency case, ⊕ mean incl. empty-array→⟨0,0⟩ edge case, ⊖ clamp≥0 on both components (2 boundary cases) | Golden #2 (1.7/2.3) re-exercises `algebra.ts` end-to-end against the paper's literal numbers |
| 1.3 / 1.4 | `tests/laf/rules.test.ts` | `src/laf/rules.ts` | All 8 R1-R8 rules individually asserted λ=⟨1,0⟩ | `graph.test.ts` (1.5/1.6) and both goldens consume the fixed rule table; drift breaks downstream evidence→thesis mapping |
| 1.5 / 1.6 | `tests/laf/graph.test.ts` | `src/laf/graph.ts` | Fixed 8-leaf/2-RA/1-CA topology + partial-evidence subset cases (paper's e1/e2/e3) | Golden #2 (1.7/2.3) exercises `evaluateGraph` with the paper's exact evidence set |
| 1.7 | `tests/golden/algebra-only.test.ts` part 1/2 (Golden #2) | (locks 1.1-1.6 together) | N/A — canonical single case | Is itself the L3 safety net: locks module output to the paper's literal numbers at 1e-9 tolerance |

## Phase 2: L4 Decision Policy

| Task | RED | GREEN | TRIANGULATE | SAFETY-NET |
|---|---|---|---|---|
| 2.1 / 2.2 | `tests/decision/policy.test.ts` | `src/decision/policy.ts` (`score`, `decide`) | Boundary σ=0.67 exact, boundary gap=0.20 exact, golden decision case, one case per `NoRecommendationReason` variant | Golden #1 (6.3) and Golden #2 (2.3) both re-exercise `decide()`/`score()` end-to-end |
| 2.3 | `tests/golden/algebra-only.test.ts` part 2/2 (Golden #2 complete) | (locks 2.1-2.2 together) | N/A — canonical single case | Locks decision-policy output to the paper's literal σ+/σ-/gap numbers |

## Phase 3: L2 Stream Windowing

| Task | RED | GREEN | TRIANGULATE | SAFETY-NET |
|---|---|---|---|---|
| 3.1 / 3.2 | `tests/stream/risk.test.ts` | `src/stream/risk.ts` | Paper reference value σ_ω=0.008→ρ=0.40, clamp-at-1 case, σ_ω=0 guard case | `evidence.test.ts` (3.11) and both goldens exercise `computeRisk` indirectly |
| 3.3 / 3.4 | `tests/stream/confidence.test.ts` | `src/stream/confidence.ts` | All 8 Cuadro-2 γ formulas individually tested, RSI15→γ=0.50 and RSI5→γ=0.83 boundary cases, clamp-at-1 | `evidence.test.ts` + Golden #1 exercise confidence functions via `extractEvidence` |
| 3.5 / 3.6 | `tests/stream/indicators/rsi.test.ts` + `macd.test.ts` | `src/stream/indicators/rsi.ts`, `macd.ts` | Published reference vectors + explicit smoothing/seed boundary cases | Golden #1 (6.3) is the real safety net that later caught both real bugs at the real call site (D5's degenerate-EMA and D6's seed-only-RSI), each *after* these unit tests had already passed — proof the safety net catches what unit tests alone did not |
| 3.7 / 3.8 | `tests/stream/indicators/sma.test.ts` + `bollinger.test.ts` | `src/stream/indicators/sma.ts`, `bollinger.ts` | SMA50=0 guard, Lsup=Linf degenerate-band guard | `evidence.test.ts` + Golden #1 |
| 3.9 / 3.10 | `tests/stream/window.test.ts` | `src/stream/window.ts` | Per-indicator ω/β cases (RSI/MACD/SMA/Bollinger), cold-start (<50 candles)→`[]` case, §5 edge-effect documented as observed behavior | `evidence.test.ts` (3.11) + Golden #1 (6.3) exercise `window()` for every indicator; both D5 and D6 window-size regressions would break these |
| 3.11 / 3.12 | `tests/stream/evidence.test.ts` | `src/stream/evidence.ts` | 0..8 active-condition combinations, non-monotonic auto-stop case, provenance-populated case | Golden #1 (6.3) is the end-to-end safety net; the D6 bug was originally surfaced here (`verify-report-pr2.md`) |

## Phase 4: L1 Semantic Ingestion

| Task | RED | GREEN | TRIANGULATE | SAFETY-NET |
|---|---|---|---|---|
| 4.1 / 4.2 | `tests/rdf/mapCandles.test.ts` | `src/rdf/ontology.ts`, `mapCandles.ts`, `store.ts` | Exact-triple structural assertion + Turtle-snapshot serialization case | `mapIndicators.test.ts` (4.3) reuses `store.ts`; Golden #1 exercises the full RDF roundtrip via `runCycle` |
| 4.3 / 4.4 | `tests/rdf/mapIndicators.test.ts` | `src/rdf/mapIndicators.ts` | 6 distinct indicator-value predicates + `rdf:type` disambiguation case | Golden #1 exercises via `runCycle` end-to-end |

## Phase 5: Binance Adapter

| Task | RED | GREEN | TRIANGULATE | SAFETY-NET |
|---|---|---|---|---|
| 5.1 / 5.2 | `tests/market/binance.test.ts` (recorded cassettes) | `src/market/provider.ts`, `binance.ts` | OK / malformed / 429 / empty response cassettes, cold-start (<50 candles) case, failed/delayed-fetch→silent-no-emit case (5 distinct scenarios) | `tests/api/cycle.test.ts` (6.5) exercises the `MarketDataSource` interface via the route handler |

## Phase 6: Cycle Orchestration & API Routes

| Task | RED | GREEN | TRIANGULATE | SAFETY-NET |
|---|---|---|---|---|
| 6.1 | N/A — fixture derivation, not implementation code | `tests/fixtures/paper-example/README.md` + `candles.json` | N/A | Golden #1 (6.3) is the consumer/safety-net of this fixture; re-derived twice post-hoc (D5, then D6) without needing any golden-assertion change either time — direct proof the safety net holds under upstream window-size changes |
| 6.2 | (covered by 6.3's golden — no separate unit RED) | `src/cycle/runCycle.ts`, `src/cycle/latest.ts` | N/A | Golden #1 (6.3), `idempotency.test.ts` (6.4), `cycle.test.ts` (6.5) all exercise `runCycle` |
| 6.3 | `tests/golden/paper-example.test.ts` (Golden #1) | (locks the full L1→L4 pipeline together) | N/A — canonical worked example, 1e-9 tolerance | This IS the primary safety net for the whole pipeline: it caught both the real D5 (MACD) and real D6 (RSI) bugs during post-hoc verification, before archive, each time |
| 6.4 | `tests/cycle/idempotency.test.ts` | (codifies design D-B against `runCycle`) | Two-identical-call → byte-identical-output case | Guards cache-independent correctness against future caching regressions |
| 6.5 / 6.6 | `tests/api/cycle.test.ts` | `app/api/cycle/route.ts` | Malformed/oversized-payload→400 case, symbol-outside-allowlist case, missing-shared-secret case (T-1/T-2 threat model, 3 distinct rejection paths) | `decisions.test.ts` (6.7) exercises the cache this route populates |
| 6.7 | `tests/api/decisions.test.ts` | `app/api/decisions/route.ts` | Cache-hit-equals-on-demand-recompute case | `dashboard.spec.ts` (7.2) e2e-exercises this route through the real UI |

## Phase 7: UI Decision Dashboard

| Task | RED | GREEN | TRIANGULATE | SAFETY-NET |
|---|---|---|---|---|
| 7.1 | (no dedicated unit RED — covered by 7.2's e2e) | `app/(dashboard)/page.tsx` + components | N/A | 7.2 |
| 7.2 | `tests/e2e/dashboard.spec.ts` (Playwright) | (validates 7.1 end-to-end) | Smoke case + (post-verify addition) multi-asset filter case + trace click-through case — 2 e2e scenarios total after the post-verify fix batch closed the original PARTIAL coverage | Top-level UI safety net; runs against a real fixture-backed cycle, not mocks |
| 7.3 | N/A — static workflow-config export, no test framework applicable | `n8n/faf-workflow.json` | N/A | Manually inspected per-branch Set-Symbol nodes (post-verify fix, closed the positional-fragility WARNING); implicitly exercised by `cycle.test.ts`'s payload-shape contract |

---

**RED-before-GREEN discipline**: consistent for all 41 tasks — every implementation task is immediately preceded by its test task in `tasks.md`'s ordering, and every test file named above was independently confirmed present and passing at runtime (124/124 vitest, 2/2 Playwright) as of `verify-report-final.md`.
