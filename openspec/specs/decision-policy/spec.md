# Delta for decision-policy (Layer 4)

## ADDED Requirements

### Requirement: Score function σ
The system MUST compute σ(μ) = 0.5·γ + 0.5·(1−ρ) for each net thesis label λ*(μ) = ⟨γ,ρ⟩, per paper eq. 10.

#### Scenario: Score from golden example
- GIVEN λ*(μ⁺)=⟨0.50,0.00⟩ and λ*(μ⁻)=⟨0.00,0.05⟩
- WHEN σ is computed for both theses
- THEN σ(μ⁺) MUST equal 0.5·0.50+0.5·(1−0.00) = 0.75
- AND σ(μ⁻) MUST equal 0.5·0.00+0.5·(1−0.05) = 0.475

### Requirement: Activation threshold θ and gap threshold δ
The system MUST use θ = 0.67 as the minimum dominant-thesis score and δ = 0.20 as the minimum score gap between dominant and opposing theses, per paper eq. 11 and §3.5.

#### Scenario: Threshold values fixed
- GIVEN any decision cycle
- WHEN thresholds are applied
- THEN θ MUST equal 0.67 and δ MUST equal 0.20 unless the proposal explicitly authorizes a change (openspec/config.yaml `rules.specs`)

### Requirement: Three-way decision rule
The system MUST emit BUY iff σ(μ⁺) ≥ θ AND σ(μ⁺)−σ(μ⁻) ≥ δ; SELL iff σ(μ⁻) ≥ θ AND σ(μ⁻)−σ(μ⁺) ≥ δ; otherwise NO-RECOMMENDATION, per paper eq. 11.

#### Scenario: Golden example decision
- GIVEN σ(μ⁺)=0.75, σ(μ⁻)=0.475
- WHEN the decision rule evaluates
- THEN 0.75 ≥ 0.67 is true AND 0.75−0.475=0.275 ≥ 0.20 is true
- AND the system MUST emit BUY

#### Scenario: SELL path
- GIVEN σ(μ⁻) ≥ 0.67 AND σ(μ⁻)−σ(μ⁺) ≥ 0.20
- WHEN the decision rule evaluates
- THEN the system MUST emit SELL

### Requirement: Distinguishable no-recommendation cases
The system MUST distinguish and label three semantically distinct NO-RECOMMENDATION cases in its response, per paper §3.5 and proposal Edge Cases: (a) no active evidence for either thesis, (b) dominant score below θ, (c) gap below δ.

#### Scenario: No evidence case
- GIVEN neither μ⁺ nor μ⁻ has any active argument (e.g. cold start)
- WHEN the decision runs
- THEN the response MUST report NO-RECOMMENDATION with reason "no evidence"

#### Scenario: Below-threshold case
- GIVEN σ(μ⁺)=0.55 (< θ) and no thesis reaches θ
- WHEN the decision runs
- THEN the response MUST report NO-RECOMMENDATION with reason "score below threshold"

#### Scenario: Insufficient gap case
- GIVEN σ(μ⁺)=0.70 and σ(μ⁻)=0.60 (gap 0.10 < δ)
- WHEN the decision runs
- THEN the response MUST report NO-RECOMMENDATION with reason "insufficient dominance gap"

### Requirement: Full trace payload
Every emitted decision MUST carry a trace resolvable end-to-end from the originating RDF events through active evidence predicates, triggered rules (R1-R8), argument labels, aggregated/net thesis labels, both scores, and the gap, per paper §3.5 ("trazabilidad estructural") and proposal Success Criteria.

#### Scenario: Trace completeness
- GIVEN a BUY decision was emitted
- WHEN the trace is inspected
- THEN it MUST include the originating `faf:PriceEvent`/`faf:IndicatorValue` references, active predicates, fired rule IDs, per-argument λ, λ(μ⁺)/λ(μ⁻), λ*(μ⁺)/λ*(μ⁻), σ(μ⁺), σ(μ⁻), and the computed gap
