# Tasks: FAF Platform — Explainable Streaming Financial Recommendations

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | ~3000-4500 (7 phases, ~50 files: 4 indicators w/ reference-vector tables, RDF mapping, algebra, window engine, adapter+cassettes, routes, UI, 2 goldens) |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR1 core-algebra -> PR2 stream-windowing -> PR3 ingestion+adapter -> PR4 delivery -> PR5 UI |
| Delivery strategy | ask-on-risk |
| Chain strategy | **RESOLVED: stacked-to-main** |

### RESOLVED: 3-PR split (user decision, overrides the 5-unit suggestion above)

| PR | Units | Target | Est. lines | Note |
|---|---|---|---|---|
| PR1 | Core algebra: L3 (Phase 1) + L4 (Phase 2) | `main` | ~600-900 | Within/near budget |
| PR2 | Ingestion: L2 (Phase 3) + L1 (Phase 4) + Binance adapter (Phase 5) | PR1 branch | ~1800-2500 | **Exceeds 800-line budget on its own — accepted as `size:exception` by explicit user choice, informed of the overage before deciding** |
| PR3 | Delivery: orchestration/routes (Phase 6) + UI (Phase 7) | PR2 branch | ~600-1100 | Near/slightly over budget |

Chain strategy: stacked-to-main — each PR targets the previous PR's branch (PR1 -> main, PR2 -> PR1, PR3 -> PR2), mergeable independently as each is approved.

Decision needed before apply: No (resolved)
Chained PRs recommended: Yes — 3 PRs, stacked-to-main
400-line budget risk: High (PR2 explicitly accepted as size:exception)

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|---|---|---|---|---|---|
| 1 | L3+L4 pure algebra: rules/algebra/graph/policy + Golden #2 (algebra-only) | PR1 | `vitest run tests/laf tests/decision tests/golden/algebra-only.test.ts` | N/A — pure functions, no I/O | Revert `src/laf/`, `src/decision/`, algebra-only golden |
| 2 | L2 indicators/window/confidence/risk/evidence | PR2 | `vitest run tests/stream` | N/A — pure functions | Revert `src/stream/`; PR1 unaffected |
| 3 | L1 RDF mapping + Binance adapter + cassettes | PR3 | `vitest run tests/rdf tests/market` | N/A — adapter tested via recorded cassettes, no live network | Revert `src/rdf/`, `src/market/`, `tests/fixtures/binance/` |
| 4 | runCycle composition, /api/cycle, /api/decisions, Golden #1, idempotency, T-1/T-2 | PR4 | `vitest run tests/cycle tests/api tests/golden/paper-example.test.ts` | `next dev` + `curl -X POST localhost:3000/api/cycle` against fixture payload | Revert `src/cycle/`, `app/api/`; layers PR1-3 unaffected |
| 5 | Dashboard UI + n8n workflow export | PR5 | `vitest run tests/e2e` (Playwright) | `playwright test tests/e2e/dashboard.spec.ts` against fixture-backed cycle | Revert `app/(dashboard)/`, `n8n/faf-workflow.json` |

Alternative coarser 3-slice split (user example): (a) L3+L4 "core algebra" = Unit 1; (b) L1+L2+adapter "ingestion" = Units 2+3 merged (~1800-2500 lines, exceeds 800-line session budget alone — not recommended); (c) routes+UI "delivery" = Units 4+5 merged. The 5-unit split above stays closer to the 800-line cached budget per slice.

## Phase 0: Scaffolding & Shared Types

- [x] 0.1 Scaffold Next.js (App Router, TS); add Vitest + N3.js deps; `vitest.config.ts`.
- [x] 0.2 `src/domain/types.ts`: Candle, Label, Evidence, Argument, ThesisState, Decision, DecisionReport, WindowSpec (no imports).
- [x] 0.3 `src/market/assets.ts`: v1 allowlist `['BTCUSDT','ETHUSDT','SOLUSDT']` + Binance klines base URL const.

## Phase 1: L3 Argumentation Engine (mandatory first — TDD)

- [x] 1.1 RED `tests/laf/algebra.test.ts`: ⊗ transparency (label⊗⟨1,0⟩=label), ⊕ mean incl. empty→⟨0,0⟩, ⊖ clamp≥0 both components (eq 4-6).
- [x] 1.2 GREEN+REFACTOR `src/laf/algebra.ts`: otimes/oplus/ominus, JSDoc cites eq 4-6.
- [x] 1.3 RED `tests/laf/rules.test.ts`: fixed R1-R8 predicate→thesis table, λ(Ri)=⟨1,0⟩ for all 8.
- [x] 1.4 GREEN `src/laf/rules.ts`.
- [x] 1.5 RED `tests/laf/graph.test.ts`: fixed topology (8 leaves→2 RA→1 CA); partial-evidence cases incl. paper's e1/e2/e3 subset.
- [x] 1.6 GREEN `src/laf/graph.ts`: `evaluateGraph(evidences): {bullish, bearish}`.
- [x] 1.7 RED `tests/golden/algebra-only.test.ts` (part 1/2, Golden #2): hand-built Evidence[] w/ paper labels (rsi_bullish⟨0.50,0.40⟩, macd_bullish⟨0.80,0.10⟩, sma_bearish⟨0.15,0.30⟩) → assert λ(μ+)=⟨0.65,0.25⟩, λ(μ−)=⟨0.15,0.30⟩, λ*(μ+)=⟨0.50,0.00⟩, λ*(μ−)=⟨0.00,0.05⟩, tol 1e-9. Isolates L3 from indicator math.

## Phase 2: L4 Decision Policy (TDD)

- [x] 2.1 RED `tests/decision/policy.test.ts`: boundary σ=0.67 exact, gap=0.20 exact, golden σ+=0.75/σ-=0.475→BUY, one case per NoRecommendationReason.
- [x] 2.2 GREEN+REFACTOR `src/decision/policy.ts`: `score()`, `decide()` (eq 10-11, θ=0.67, δ=0.20 fixed, 3-way reason logic).
- [x] 2.3 Extend `tests/golden/algebra-only.test.ts` (part 2/2): `decide()` over Phase-1 evidence → σ(μ+)=0.75, σ(μ−)=0.475, gap=0.275, BUY. Golden #2 complete.

## Phase 3: L2 Stream Windowing (TDD; timeframe=1h candles, SMA50 window spans ~50h history)

- [x] 3.1 RED `tests/stream/risk.test.ts`: eq(1)(2) returns/σ_ω; paper value σ_ω=0.008→ρ=0.40; clamp at 1; σ_ω=0 guard→ρ=0.
- [x] 3.2 GREEN `src/stream/risk.ts`.
- [x] 3.3 RED `tests/stream/confidence.test.ts`: 8 Cuadro-2 γ formulas incl. RSI15→γ=0.50, RSI5→γ=0.83; clamp at 1.
- [x] 3.4 GREEN `src/stream/confidence.ts`.
- [x] 3.5 RED `tests/stream/indicators/rsi.test.ts` + `macd.test.ts`: Wilder RSI14 + EMA12/26/9 MACD vs published reference vectors, explicit smoothing/seed cases.
- [x] 3.6 GREEN `src/stream/indicators/rsi.ts`, `macd.ts`.
- [x] 3.7 RED `tests/stream/indicators/sma.test.ts` + `bollinger.test.ts`: SMA20/50 + BB20±2σ vs reference vectors; SMA50=0 and Lsup=Linf guards.
- [x] 3.8 GREEN `src/stream/indicators/sma.ts`, `bollinger.ts`.
- [x] 3.9 RED `tests/stream/window.test.ts`: W(S,ω,β) per Cuadro1 in 1h-candle units (RSI 14/1, MACD 26/1, SMA 50/1, Bollinger 20/1); injected clock; content size=ω; cold start (<50 candles)→[]; §5 edge-effect documented as observed behavior.
- [x] 3.10 GREEN `src/stream/window.ts` (S2R operator over quad stream; fixtures use hand-built N3 Store, no L1 dependency).
  - **Post-hoc correction (bug fix, post-PR2)**: `src/stream/evidence.ts`'s `MACD_SPEC.omega` was corrected from the Cuadro-1 literal 26 to 50 — at omega=26 the MACD-line series degenerates to a single point, making histogram/sigma_H always 0 and macd_bullish/macd_bearish permanently unreachable. Documented as **deviation D5**; see `design.md`'s "Deviation D5" section and `docs/PRD.md`'s "Desvíos aprobados" table.
- [x] 3.11 RED `tests/stream/evidence.test.ts`: R2S — active conditions→Evidence[] (0..8), non-monotonic auto-stop, provenance populated.
- [x] 3.12 GREEN `src/stream/evidence.ts`: `extractEvidence(store, asset, now): Evidence[]` composing window+indicators+confidence+risk.

## Phase 4: L1 Semantic Ingestion (TDD)

- [x] 4.1 RED `tests/rdf/mapCandles.test.ts`: exact triples (`faf:event_{asset}_{kind}_{t}`, rdf:type PriceEvent, OHLCV predicates, xsd datatypes), Turtle snapshot.
- [x] 4.2 GREEN `src/rdf/ontology.ts`, `mapCandles.ts`, `store.ts` (N3.Store factory + Turtle writer).
- [x] 4.3 RED `tests/rdf/mapIndicators.test.ts`: IndicatorValue quads (rsiValue/macdHistogram/sma20/50/bollingerUpper/Lower), rdf:type disambiguation.
- [x] 4.4 GREEN `src/rdf/mapIndicators.ts`.

## Phase 5: Binance Adapter (TDD)

- [x] 5.1 RED `tests/market/binance.test.ts` over recorded cassettes `tests/fixtures/binance/*.json` (OK, malformed, 429, empty; ≥50 candles/asset D4; cold start <50→insufficient-history flag; failed/delayed fetch→emit nothing, no error).
- [x] 5.2 GREEN `src/market/provider.ts` (MarketDataSource interface), `src/market/binance.ts` (BinanceHttpSource; URLs built only from `assets.ts` allowlist — satisfies T-2).

## Phase 6: Cycle Orchestration & API Routes

- [x] 6.1 Derive synthetic 1h-candle fixtures yielding RSI=15 (γ=0.50), a MACD histogram giving γ=0.80, a bearish SMA giving γ=0.15, and σ_ω values reproducing ρ=0.40/0.10/0.30; document derivation math in `tests/fixtures/paper-example/README.md`. Prerequisite for 6.3.
- [x] 6.2 GREEN `src/cycle/runCycle.ts`: pure `runCycle(rawKlines): DecisionReport` (L1→L4 + trace assembly); `src/cycle/latest.ts` module-scope cache.
- [x] 6.3 `tests/golden/paper-example.test.ts` (Golden #1) using 6.1 fixtures through `runCycle`: assert λ*(μ+)=⟨0.50,0.00⟩, σ+=0.75, σ-=0.475, gap=0.275→BUY, tol 1e-9.
- [x] 6.4 RED `tests/cycle/idempotency.test.ts`: two `runCycle` calls with identical klines (same in-progress hourly candle within n8n's 1-5min cron) → byte-identical `DecisionReport`. Codifies design D-B: correctness never depends on cache, recompute is safe/idempotent by construction — no cron-cadence alignment needed. Add note to `docs/` explaining this explicitly (chosen over aligning cadence to candle-close).
- [x] 6.5 RED `tests/api/cycle.test.ts`: malformed/oversized payload→400, no `runCycle` call (T-1); symbol outside allowlist rejected; missing shared-secret header rejected (T-2).
- [x] 6.6 GREEN `app/api/cycle/route.ts`: POST — schema validation, shared-secret check, PushedKlinesSource/BinanceHttpSource, calls `runCycle`, `cache.put(ttl=β)`.
- [x] 6.7 RED+GREEN `tests/api/decisions.test.ts` + `app/api/decisions/route.ts`: GET — cache-hit equals on-demand-recompute output.

## Phase 7: UI Decision Dashboard

- [x] 7.1 `app/(dashboard)/page.tsx` + components: tabular decision list (asset, timestamp, decision, σ+, σ-, gap), multi-asset filter, argument-trace detail table (predicates→rules→labels→net; no narrative text, no graph viz — D3 deferred).
- [x] 7.2 `tests/e2e/dashboard.spec.ts` (Playwright): smoke test against fixture-backed cycle.
- [x] 7.3 `n8n/faf-workflow.json`: export Schedule Trigger + HTTP fetch + POST /api/cycle workflow; cadence 1-5min is safe per 6.4 (idempotent recompute against in-progress candle is expected, not a bug).

## Implementation Order

L3 → L4 → L2 → L1 → Binance adapter → routes/cycle orchestration → UI, per design.md's mandatory TDD order. Each pure-function module (Phases 1-4) follows RED (failing test) → GREEN (implementation) → REFACTOR before the next module starts; no layer is implemented before its dependency-free predecessor in this order is test-covered.
