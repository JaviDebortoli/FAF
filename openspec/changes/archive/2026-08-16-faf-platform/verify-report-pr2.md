# Verification Report - faf-platform PR2 scope (deep pass)

**Scope**: Phase 3 (L2 Stream Windowing, tasks 3.1-3.12), Phase 4 (L1 Semantic Ingestion, tasks 4.1-4.4), Phase 5 (Binance Adapter, tasks 5.1-5.2). Follow-up deep-scrutiny pass on top of the already-PASSed full verify-report.md (0 CRITICAL). This report is a separate artifact and does not modify the prior one.

**Mode**: Full spec-driven verification (specs semantic-ingestion, stream-windowing + design.md + tasks.md), with runtime test evidence and hand-recomputation of formulas against docs/papers/Financial_Argumentation_Framework.pdf (Cuadro 1, Cuadro 2, eq. 1-3, section 3.2).

## Test Execution Evidence

- `npx vitest run tests/stream tests/rdf tests/market` -> 12 files, 75/75 tests passed, exit 0.
- `npx vitest run` (full suite) -> 21 files, 123/123 tests passed, exit 0 (no regressions from PR3 work in progress).
- `npx tsc --noEmit` -> clean, 0 errors.

## Task Completion (Phase 3-5)

All 18 tasks (3.1-3.12, 4.1-4.4, 5.1-5.2) are marked [x] in tasks.md and each has a corresponding, real, non-trivial implementation file and RED test file. Verified by direct source inspection - no stub/placeholder files.

## Spec Compliance Matrix

### semantic-ingestion

| Requirement | Scenario | Status | Evidence |
|---|---|---|---|
| Market-data fetch contract | Successful fetch | PASS | src/market/binance.ts fetches limit=50; tests/market/binance.test.ts OK cassette asserts 50 candles, OHLCV fields correct |
| Market-data fetch contract | Failed or delayed fetch | PASS | network-reject, 429, malformed-body all resolve to null (never throw); binance.test.ts covers all 3 |
| Market-data fetch contract | Cold start | PASS | sufficientHistory = candles.length >= MIN_CANDLES(50); insufficient-cassette test asserts false for 10 candles |
| n8n scheduler-only role (D2) | forwards raw data | PASS (out of TS scope) | n8n/faf-workflow.json (PR3) has no RDF-ification nodes; not part of PR2's TS surface |
| OHLCV to RDF price-event mapping | Candle mapped to RDF | PASS | mapCandles.ts emits all 5 OHLCV + asset + timestamp; mapCandles.test.ts asserts each triple and datatype |
| Indicator value RDF mapping | RSI value mapped | PASS | mapIndicators.ts + mapIndicators.test.ts; exact faf:rsiValue/xsd:decimal shape matches paper section 3.2 worked example |
| Indicator value RDF mapping | Type disambiguation | PASS | mapIndicators.test.ts "disambiguates ... via rdf:type alone" - mixed-store test |

### stream-windowing

| Requirement | Scenario | Status | Evidence |
|---|---|---|---|
| Fixed sliding-window config (Cuadro 1) | Window sized per indicator | PASS | evidence.ts: RSI omega=14, MACD omega=50 (D5, see below), SMA omega=50, Bollinger omega=20, all beta=1; window.test.ts + evidence.test.ts cover boundary sizes |
| Evidence confidence (gamma) formulas (Cuadro 2) | RSI oversold evidence | PASS | Hand-verified against PDF Cuadro 2 (page 8) - all 8 formulas in confidence.ts are byte-exact transcriptions; RSI=15 -> gamma=0.50, RSI=5 -> gamma=0.83 both hand-confirmed |
| Evidence risk (rho) computation | Moderate volatility / zero-volatility guard | PASS | risk.ts eq. 1-2 hand-verified against PDF page 8; sigma_omega=0.008 -> rho=0.40 confirmed; guard confirmed (mathematically redundant but harmless - see SUGGESTION) |
| Non-monotonic evidence lifecycle | Condition clears | PASS | evidence.test.ts "auto-retracts rsi_bullish ... once RSI returns to neutral range" |
| Cold start / window edge behavior | Insufficient history | PASS | window.ts: events.length < spec.omega -> sufficientHistory=false, no evidence fabricated; evidence.test.ts cold-start test |

## Deep Source Scrutiny - Hand-Recomputation Results

1. **src/stream/risk.ts** (eq. 1-2): computeReturns = (P_i-P_i-1)/P_i-1 exactly matches eq.1. computeSigmaOmega uses population standard deviation (N divisor). The paper (p.8) says only "se calcula la desviacion estandar de los retornos" without disambiguating population vs. sample, and its own worked example (sigma_omega=0.008) does not supply the underlying price series, so the population-vs-sample choice cannot be independently falsified against the paper - it is a defensible, internally consistent interpretation (also used consistently for sigma_H in macd.ts and the band stddev in bollinger.ts). SIGMA_REF=0.02 fixed, matches eq.2/3.3. sigma_omega=0.008 -> rho=0.40 hand-confirmed against eq.3. The sigmaOmega===0 guard is mathematically redundant (0/0.02=0 regardless) but harmless.

2. **src/stream/confidence.ts** (Cuadro 2): all 8 formulas transcribed byte-exact from the PDF's Cuadro 2 (rsi_bullish (30-RSI)/30, rsi_bearish (RSI-70)/30, macd_bullish min(H/sigma_H,1), macd_bearish min(|H|/sigma_H,1), sma_bullish min((SMA20-SMA50)/SMA50,1), sma_bearish mirror, bollinger_bullish min((Linf-P)/(Lsup-Linf),1), bollinger_bearish mirror). Every division guard present and correctly returns 0 without NaN: sigmaH===0, sma50===0, range(Lsup-Linf)===0.

3. **src/stream/indicators/macd.ts**: MACD_SPEC.omega===50 in evidence.ts confirmed still correctly wired (line 44). Re-derived D5 by hand: computeEMASeries(closes,26)'s recursive loop for(i=period;i<values.length;i++) requires values.length>26; at the literal Cuadro-1 omega=26 this is 26<26=false, so emaSlow has length 1, macdSeries has length 1, effectiveSignalPeriod=min(9,1)=1, signal = that same single point, histogram=0, sigmaH=populationStdDev([x])=0 - always, confirmed independently by hand-tracing the code (not just trusting design.md's prose) and by macd.test.ts's own "degrades gracefully to a single-point ... at omega=26" test (asserts histogram=0, sigmaH=0 exactly). At omega=50, the loop runs 50-26=24 times, producing a 25-point non-degenerate series - confirmed by hand-tracing computeEMASeries and cross-checked against macd.test.ts's scaled-down (fast=3/slow=6/signal=2) hand-derived reference vectors, independently re-derived here digit-by-digit (both the linear-input histogram=0/sigmaH=0 case and the histogram=5/7, sigmaH=6/7 jump case reproduce exactly - RS=145/34 confirmed algebraically). computeMACD's own periods (12/26/9) are unchanged from Cuadro 1 - confirmed at macd.ts:58-63 (defaults) and evidence.ts:114 (computeMACD(macdWindow.closes), no period overrides).

4. **src/stream/indicators/rsi.ts** - see WARNING 1 below; this is the highest-risk area and contains a real, previously-undocumented deviation analogous in kind (though not in severity) to D5.

5. **src/stream/indicators/sma.ts / bollinger.ts**: SMA is a plain arithmetic mean over the trailing period closes - closed-form, hand-verified via the discrete-uniform-variance identity in bollinger.test.ts (variance({1..n})=(n^2-1)/12). Bollinger bands = SMA(period) +/- 2*populationStdDev(period), k=2 matches paper section 2.3. Both guards present (SMA50===0, Lsup===Linf).

6. **src/stream/window.ts**: window() rebuilds fully from the passed-in Store on every call (no module-level state, no cache) - genuinely stateless per the "no accumulated static state" requirement. Cold start: events.length < spec.omega -> {closes:[], timestamps:[], sufficientHistory:false}, no fabricated evidence. Exactly spec.omega most-recent (by timestamp, filtered to t<=now) candles are returned in chronological order - confirmed via window.test.ts's exact-slice and sliding-by-one (beta=1 edge-effect) assertions.

7. **src/stream/evidence.ts**: each of the 4 indicator blocks gates evidence emission on its real activation condition (rsi<30/rsi>70, histogram>0/<0, sma20>sma50/sma50>sma20, price<=lower/price>=upper) - confirmed no unconditional/always-true emission. The D5 "MACD and SMA share rho" consequence documented in tests/fixtures/paper-example/README.md was verified directly against this file: SMA_SPEC.omega===50 (line 45) and MACD_SPEC.omega===50 (line 44) are identical, and window() is a pure function of (store, asset, now, spec) - since both calls pass the same asset/now/store and identical omega, the returned closes arrays are byte-identical, so computeSigmaOmega (a pure function of closes) yields numerically identical sigma_omega/rho for MACD and SMA evidence in any single cycle. This is an accurate characterization of the file's actual behavior, not merely an assumption - confirmed by direct code reading, not just trusting the README's claim.

8. **src/rdf/{ontology,mapCandles,mapIndicators,store}.ts**: triple shapes hand-checked against paper section 3.2 (page 6-7 of the PDF) term-by-term. faf:PriceEvent carries all 5 OHLCV properties + faf:asset (NamedNode) + faf:timestamp (xsd:dateTime) - confirmed. faf:IndicatorValue carries faf:indicator + the correct specialized property per kind (rsiValue/macdHistogram/sma20+sma50/bollingerUpper+bollingerLower), all xsd:decimal. IRI minting faf:event_{asset}_{kind}_{t} matches design.md and is the single canonical source (mintEventIri) - window.ts and evidence.ts both consume it, no duplicated/divergent minting logic remains.

9. **src/market/{provider,binance,assets}.ts**: grepped for any live fetch/http usage in test files - tests/market/binance.test.ts exclusively uses vi.stubGlobal('fetch', ...), no real network call is reachable in tests. ASSET_ALLOWLIST (assets.ts) is checked via isAllowedAsset() before the URL is constructed or fetch is called (binance.ts:39-41) - confirmed by the explicit "T-2: never calls fetch for an asset outside the allowlist" test (asserts fetchSpy not called). Failed/delayed (network reject), malformed (non-array body, non-JSON body), and rate-limited (429/non-2xx) responses all resolve to null via distinct try/catch/.ok branches - none throw, none fabricate data; confirmed by 4 distinct cassette-driven tests plus the network-reject test.

10. **Test quality**: reviewed all PR2 test files for tautologies/single-case coverage. All formula tests assert numeric values independently hand-derived (shown in comments) rather than copy-pasted from the implementation; RSI/MACD test suites include both boundary (all-gain/all-loss/degenerate) and general (multi-step continuation, non-trivial histogram) cases; RDF mapping tests assert exact triple predicates/datatypes/subject IRIs, not just "quads.length > 0"; Binance adapter tests cover 7 distinct response shapes (OK, insufficient, empty, malformed, partially-malformed, 429, network-reject) plus 2 allowlist-enforcement tests. No tautological assertions found.

## Issues

### CRITICAL
None.

### WARNING

**W1 - RSI never performs genuine Wilder continuation smoothing at the systems actual runtime window size; the "documented elsewhere" cross-reference in the code is inaccurate.**

src/stream/indicators/rsi.ts's computeRSI(closes, period?) defaults period to diffs.length when the caller omits it. src/stream/evidence.ts (line 96) calls computeRSI(rsiWindow.closes) with no period argument, and RSI_SPEC.omega=14 (Cuadro 1's literal value, unlike MACD which was widened under D5). At runtime this means: closes.length=14 -> diffs.length=13 -> p=13 -> the continuation loop for(i=p;i<diffs.length;i++) (i starts at 13, diffs.length is 13) never executes. The RSI value the system actually emits is therefore always the seed step only - a single simple average of the window's 13 gains/losses - never the recursively-smoothed value that is Wilder's (1978) defining characteristic. This is functionally closer to "Cutler's RSI" (SMA-based) than genuine Wilder smoothing, even though the module is headed "Wilder RSI" and cites Wilder 1978 throughout, and even though docs/PRD.md (line 140) explicitly states, as the stated rationale for hand-rolling indicators instead of using a library: "Traceability is the deliverable: Wilder vs. simple RSI smoothing and EMA seeding must be visible and cited, not hidden behind a library default."

This is not functionally broken - the seed-only RSI value is still a legitimate, bounded [0,100] figure that meaningfully responds to real market data (confirmed: it does NOT degenerate to a constant, unlike the pre-D5 MACD bug), and the gamma formulas still apply correctly to whatever RSI value results. So this does not violate the literal wording of the stream-windowing spec (which specifies only omega/beta and the gamma formula, not the smoothing method) - hence WARNING, not CRITICAL, per the "design deviation unless it breaks a spec" gate.

However: (a) it is a genuine, structurally analogous case to D5 (window size exactly matching/undercutting the period a smoothing algorithm needs to actually smooth) that was never raised to a formal, approved deviation the way D5 was (no "D6" entry exists in design.md's Deviations section or docs/PRD.md's "Desvios aprobados" table - both list only D1-D5, none referencing RSI or omega=14); and (b) rsi.ts's own docstring (line 13) says "see apply-progress Deviations for the Cuadro-1 omega=14 implication" - this cross-reference was checked directly against the current sdd/faf-platform/apply-progress Engram artifact and it contains no RSI/omega=14 deviation entry (only the D5 MACD bugfix is documented there). The citation is currently inaccurate.

Recommendation: either (1) add a formal deviation entry (design.md + docs/PRD.md, same rigor as D5) documenting that RSI's smoothing is effectively seed-only under the system's zero-persisted-state architecture and why that's an accepted tradeoff, or (2) fix the false cross-reference in rsi.ts's docstring, or (3) reconsider whether RSI's period should have an explicit default (e.g., the paper's own 14, requiring the caller to supply extra pre-window history) so genuine continuation smoothing can occur. None of these block the current tests, but the current state is a documentation/traceability gap the project's own PRD explicitly calls out as important.

### SUGGESTION

**S1** - computeRisk's sigmaOmega===0 guard (risk.ts:34) is mathematically redundant: 0/0.02 already evaluates to 0 in floating point, so the explicit early-return changes no observable behavior. Harmless (and arguably valuable as an explicit, testable statement of the spec's "Zero-volatility guard" scenario), not a defect - no action required, noted for completeness only.

**S2** - The population-vs-sample standard deviation choice for sigma_omega (risk.ts) and sigma_H (macd.ts) cannot be independently verified against the paper, since neither the paper's worked example nor Cuadro 2 gives a raw price series to reverse-derive N vs. N-1. The code is internally consistent (population stddev used everywhere: risk, MACD histogram stddev, Bollinger bands) and the paper's own prose does not disambiguate. No action required; documented here for traceability in case a more precise upstream source later resolves the ambiguity.

## Verdict

**PASS WITH WARNINGS** - 0 CRITICAL, 1 WARNING (RSI Wilder-smoothing/documentation gap), 2 SUGGESTIONS. All 75 PR2-scoped tests and all 123 full-suite tests pass at runtime; tsc --noEmit is clean. Every spec requirement/scenario in semantic-ingestion and stream-windowing maps to a passing covering test. All Cuadro 2 gamma formulas and eq. 1-3 risk formulas were hand-verified byte-exact against the source PDF. The one WARNING is a documentation/traceability gap (an undocumented deviation, not a functional break) and does not block delivery; recommend closing it before archive by adding a formal deviation entry or correcting the inaccurate docstring cross-reference in src/stream/indicators/rsi.ts.
