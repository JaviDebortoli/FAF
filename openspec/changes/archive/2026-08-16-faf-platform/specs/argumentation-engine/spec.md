# Delta for argumentation-engine (Layer 3)

## ADDED Requirements

### Requirement: Fixed R1-R8 inference rule graph
The system MUST wire exactly these 8 inference rules mapping evidence predicates to theses, per paper §3.4 and Cuadro 3; R1-R4 support μ⁺ (bullish), R5-R8 support μ⁻ (bearish):

| Rule | Predicate → thesis |
|---|---|
| R1 | rsi_bullish(X,t) → bullish(X,t) |
| R2 | macd_bullish(X,t) → bullish(X,t) |
| R3 | sma_bullish(X,t) → bullish(X,t) |
| R4 | bollinger_bullish(X,t) → bullish(X,t) |
| R5 | rsi_bearish(X,t) → bearish(X,t) |
| R6 | macd_bearish(X,t) → bearish(X,t) |
| R7 | sma_bearish(X,t) → bearish(X,t) |
| R8 | bollinger_bearish(X,t) → bearish(X,t) |

Each rule MUST have fixed label λ(Ri) = ⟨1,0⟩ (max confidence, zero risk), per paper §3.4.

#### Scenario: Rule activation
- GIVEN evidence `rsi_bullish(X,t)` is active in the stream
- WHEN R1 evaluates
- THEN an argument supporting `bullish(X,t)` MUST be added to the active argument set

### Requirement: Support operator ⊗
The system MUST compute λ(a_k) = λ(e_k) ⊗ λ(R_i) = ⟨min(γe,γR), max(ρe,ρR)⟩, per paper eq. 4. Because λ(Ri) = ⟨1,0⟩ for all rules, ⊗ MUST be transparent: λ(a_k) = ⟨γk, ρk⟩, identical to the originating evidence label.

#### Scenario: Transparent propagation
- GIVEN evidence e₁ with λ(e₁) = ⟨0.50,0.40⟩ triggers R1
- WHEN ⊗ is applied
- THEN the resulting argument label MUST equal ⟨min(0.50,1), max(0.40,0)⟩ = ⟨0.50,0.40⟩

### Requirement: Aggregation operator ⊕
The system MUST aggregate all active arguments supporting the same thesis via unweighted arithmetic mean: λ(μ⁺) = ⟨Σγk/|A⁺|, Σρk/|A⁺|⟩ over active supporters A⁺ (symmetrically for μ⁻), per paper eq. 5/7. All 4 indicators MUST be weighted equally (no regime-based weighting in v1, per paper §2.3/§5).

#### Scenario: Two bullish, one bearish argument
- GIVEN λ(a₁)=⟨0.50,0.40⟩ and λ(a₂)=⟨0.80,0.10⟩ support μ⁺, and λ(a₃)=⟨0.15,0.30⟩ supports μ⁻
- WHEN ⊕ aggregates
- THEN λ(μ⁺) MUST equal ⟨0.65,0.25⟩ and λ(μ⁻) MUST equal ⟨0.15,0.30⟩ (paper eq. 7)

### Requirement: Conflict operator ⊖
The system MUST resolve the net label of each thesis as λ*(μ⁺) = λ(μ⁺) ⊖ λ(μ⁻) = ⟨max(0,γ⁺−γ⁻), max(0,ρ⁺−ρ⁻)⟩, and symmetrically for λ*(μ⁻), per paper eq. 6. This bounded difference MUST NOT invert a thesis's sign.

#### Scenario: Conflict resolution (simultaneous opposing signals)
- GIVEN λ(μ⁺)=⟨0.65,0.25⟩ and λ(μ⁻)=⟨0.15,0.30⟩
- WHEN ⊖ resolves both directions
- THEN λ*(μ⁺) MUST equal ⟨0.50,0.00⟩ and λ*(μ⁻) MUST equal ⟨0.00,0.05⟩ (paper eq. 8-9)

### Requirement: Golden worked example (paper §3, end-to-end)
The system MUST reproduce the paper's controlled example exactly, given e₁=rsi_bullish with λ=⟨0.50,0.40⟩, e₂=macd_bullish with λ=⟨0.80,0.10⟩, e₃=sma_bearish with λ=⟨0.15,0.30⟩.

#### Scenario: Golden trace
- GIVEN the three evidences above are active in one cycle
- WHEN the full L3 pipeline (⊗ → ⊕ → ⊖) runs
- THEN λ(μ⁺) MUST equal ⟨0.65,0.25⟩, λ(μ⁻) MUST equal ⟨0.15,0.30⟩, λ*(μ⁺) MUST equal ⟨0.50,0.00⟩, λ*(μ⁻) MUST equal ⟨0.00,0.05⟩

### Requirement: Zero persisted argumentative state
The system MUST rebuild the argument graph from scratch every cycle from the current evidence stream; no argument, label, or graph state MUST persist between cycles, per proposal Scope/L3.

#### Scenario: Stateless recompute
- GIVEN cycle N produced λ*(μ⁺)=⟨0.50,0.00⟩
- WHEN cycle N+1 runs with different evidence
- THEN the L3 computation MUST NOT reference any value retained from cycle N
