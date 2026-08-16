# Proposal: FAF Platform — Explainable Streaming Financial Recommendations

## Intent

ML recommenders are accurate but opaque; classic rule/expert systems are traceable but resolve
indicator conflict with ad-hoc heuristics; existing argumentation frameworks assume static data
(FAF paper §1, §4). FAF closes that gap: continuous argumentative reasoning over RDF market
streams producing recommendations traceable from raw candle → RDF event → windowed evidence →
inference rule → algebraic conflict resolution → decision (§5 "trazabilidad estructural").
This change implements that 4-layer pipeline as running software.

## Business Rules (traceable to the papers — non-negotiable)

| Rule | Definition | Source |
|---|---|---|
| Label | `λ = ⟨γ,ρ⟩`, γ=confidence, ρ=`min(σ_ω/σ_ref,1)`, σ_ref=0.02 | FAF Cuadro 2 |
| Windows | RSI 14/1, MACD 26/1, SMA 50/1, Bollinger 20/1 (RANGE/STEP, candles) | FAF Cuadro 1 |
| Rules | R1–R4 → μ⁺, R5–R8 → μ⁻; `λ(Ri)=⟨1,0⟩` so ⊗ is transparent | FAF Cuadro 3 |
| ⊗ | `⟨min(γe,γR), max(ρe,ρR)⟩` | FAF §3.4 / LAF (Budán 2017) |
| ⊕ | arithmetic mean over active supporters (deliberately unweighted) | FAF eq. 5, 7 |
| ⊖ | `⟨max(0,γ⁺−γ⁻), max(0,ρ⁺−ρ⁻)⟩` (bounded, cannot invert a thesis) | FAF eq. 6 |
| σ, θ, δ | `σ=0.5γ+0.5(1−ρ)`; BUY/SELL iff `σ≥0.67` AND gap `≥0.20` | FAF eq. 10–11 |
| No-rec | three distinct cases: no evidence / σ<θ / gap<δ — must stay distinguishable | FAF §3.5 |

L3's graph is the simplest LAF conflict shape (Budán Fig. 5(a)): 8 leaves → 2 aggregations →
1 conflict, acyclic. Direct ⊗→⊕→⊖ evaluation is sufficient; the general system-of-equations
solver (Budán Alg. 1) is NOT required.

## Scope

### In Scope (v1)
- L1: Next.js API route maps raw OHLCV → RDF (`faf:PriceEvent`, `faf:IndicatorValue`) via N3.js.
- L2: hand-built sliding-window engine (RDF/JS in, evidence out) — fixed Cuadro 1 windows.
- L3: LAF label algebra, in-memory, rebuilt every cycle. Zero persisted state.
- L4: score/threshold policy + emitted decision with full argument trace (JSON).
- All 4 indicators, all 8 rules, multiple crypto assets (Binance public klines, no API key).
- n8n Schedule Trigger (1–5 min) → raw HTTP fetch → POST to ingestion route.
- Minimal React UI in the same Next.js app (tabular trace + decision).

### Out of Scope (v1)
- LLM explainability narrative (PRD §"Feature de IA") — **deferred, needs sign-off**.
- Rich argumentation-graph visualization (PRD line 42) — **deferred, needs sign-off**.
- RSP-QL query-language interpreter; general LAF cycle solver; equity/AAPL data.
- Adaptive ω, regime-weighted ⊕, empirical calibration of δ — the paper's own future work (§5).
- Any database, Redis, or triple store.

**Deferral rationale**: the LLM narrative is non-deterministic (hostile to Strict TDD), adds a
paid API dependency, and adds zero formal content — it re-renders a trace L4 already emits.
The graph has a fixed 11-node topology, so a table conveys the same traceability at a fraction
of the cost. Both are presentation-only and can ship in v2 over an unchanged reasoning core.

## Capabilities

### New Capabilities
- `semantic-ingestion`: market-data fetch contract + OHLCV → RDF mapping (L1).
- `stream-windowing`: sliding windows, indicator math, evidence + label emission (L2).
- `argumentation-engine`: ⊗/⊕/⊖ label algebra over the fixed R1–R8 graph (L3).
- `decision-policy`: σ, θ, δ, three-way no-recommendation semantics, trace payload (L4).
- `decision-dashboard`: single-app UI rendering decisions and their argument trace.

### Modified Capabilities
None (greenfield).

## Approach

One Next.js app on Vercel. Each cycle is a pure function: fetch the last 50 klines per asset →
RDF-ify → window → evidences → arguments → theses → decision → respond. Because Binance serves
history on demand, no state survives between invocations by design.

## Deviations from `docs/PRD.md` — SIGN-OFF REQUIRED

| # | PRD says | Proposal does | Rationale |
|---|---|---|---|
| D1 | "Frontend: Angular" (L42) | Next.js + React, single app | Solo-thesis timeline; one deploy topology; React graph-viz is equally capable |
| D2 | n8n sends webhooks "en formato RDF" (L11) | n8n = scheduler + raw fetch; RDF-ification in TS | Keeps academically load-bearing RDF modeling under Strict TDD; n8n Code nodes are untestable |
| D3 | LLM narrative + graph viz required | deferred to v2 | See deferral rationale above — recommendation, not a decision |
| D4 | (asset unspecified) | crypto via Binance, not the paper's AAPL | RSI/MACD/SMA/Bollinger and R1–R8 are asset-agnostic; only the narrative example asset changes, formal fidelity intact |

## Affected Areas

| Area | Impact | Description |
|---|---|---|
| `app/api/ingest/` | New | L1 RDF-ification + cycle orchestration |
| `src/stream/` | New | L2 windowing + indicator math |
| `src/laf/` | New | L3 label algebra |
| `src/decision/` | New | L4 policy |
| `app/(dashboard)/` | New | React UI |
| `n8n/` | New | exported workflow JSON |
| `docs/PRD.md` | Modified | record D1–D4 after sign-off |

## Edge Cases

- **Window edge effect / β latency / rigid ω** — inherent to the windowing paradigm (FAF §5);
  v1 documents and tests observable behavior, does not attempt to fix.
- **Cold start (<50 candles)** — emit no evidence; result is "no evidence", not neutral.
- **Simultaneous opposing signals** — resolved by ⊖; if gap < δ, emit "insufficient dominance".
- **Failed/delayed fetch** — cycle emits nothing; no stale carry-forward (correct non-monotonic
  retraction per FAF §2.1, not an error state).
- **σ_ω = 0** — ρ = 0; guard indicator normalizations against division by zero.

## Tradeoffs

| Axis | Choice | Cost accepted |
|---|---|---|
| RSP-QL fidelity | window *semantics* in TS, real RDF at L1→L2 | not a literal RSP-QL interpreter |
| Asset domain | crypto | diverges from paper's AAPL narrative |
| Topology | single app | PRD deviation D1 |
| L3 state | none | full recompute cost each cycle |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Per-cycle recompute too slow/costly at N assets | Med | 1 klines call per asset per cycle serves all 4 indicators; see rollback ladder |
| Binance rate limits / geo-blocking | Med | stagger assets across cycles; provider adapter behind an interface |
| Vercel serverless statelessness | **Resolved** | fresh fetch per cycle means nothing needs to survive invocations — exploration gap 4 is no longer a blocker |
| Hand-built L2 questioned at defense | Med | design.md must justify semantics-vs-syntax fidelity against FAF §2.1 |

## Rollback Plan

The zero-persistence design makes rollback trivial: no schema, no migration, no state to unwind —
`git revert` restores any prior state exactly.

If per-cycle full recomputation proves too slow or too expensive, escalate in order:
1. Lower cadence to 5 min; stagger assets so each cycle processes a subset.
2. Coalesce to exactly one klines request per asset per cycle (all indicators share one candle array).
3. Move the cycle to a single long-lived Node process (Railway/Fly) — a **hosting** change that
   permits in-memory retention without touching the formalism.
4. Last resort: reintroduce an external TTL store holding only the *current* window snapshot with
   TTL = ω·β (exploration gap 4, option B). This weakens the "no accumulated static state" claim
   and MUST be re-authorized by the user before adoption.

D1/D2 are reversible in isolation: re-adding an Angular SPA or moving RDF-ification into n8n
requires no change to L2/L3/L4.

## Dependencies

- Binance public market-data (klines) endpoint availability.
- n8n instance reachable by, and able to reach, the deployed Vercel app.
- User sign-off on D1–D4 before `sdd-apply`.

## Success Criteria

- [ ] Golden test reproduces the paper's §3 worked example exactly: λ(μ⁺)=⟨0.65,0.25⟩,
      λ*(μ⁺)=⟨0.50,0.00⟩, λ*(μ⁻)=⟨0.00,0.05⟩, σ(μ⁺)=0.75, σ(μ⁻)=0.475 → COMPRAR.
- [ ] Every emitted decision carries a trace resolvable to its originating RDF events.
- [ ] All 8 rules and 4 indicators active; multi-asset cycle completes within the n8n interval.
- [ ] No process, file, or external store retains reasoning state between cycles.
- [ ] All three no-recommendation cases are distinguishable in the API response.
- [ ] Full TDD coverage on L1–L4 pure functions (Strict TDD Mode, `rules.apply.tdd: true`).
