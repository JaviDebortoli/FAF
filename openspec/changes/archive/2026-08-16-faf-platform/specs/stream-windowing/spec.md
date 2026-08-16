# Delta for stream-windowing (Layer 2)

## ADDED Requirements

### Requirement: Fixed sliding-window configuration (Cuadro 1)
The system MUST evaluate each indicator over a sliding window `W(S,ω,β)` using exactly these RANGE (ω) / STEP (β) values, per paper Cuadro 1:

| Indicator | RANGE ω | STEP β |
|---|---|---|
| RSI (14) | 14 candles | 1 candle |
| MACD (12/26/9) | 26 candles | 1 candle |
| SMA (20/50) | 50 candles | 1 candle |
| Bollinger (20) | 20 candles | 1 candle |

#### Scenario: Window sized per indicator
- GIVEN a stream with ≥50 candles for an asset
- WHEN each indicator's window is evaluated
- THEN each MUST use its exact ω/β pair from the table above, independently per indicator

### Requirement: Evidence confidence (γ) formulas (Cuadro 2)
The system MUST compute γ for each of the 8 evidence predicates using exactly these formulas, per paper Cuadro 2:

| Predicate | γ formula |
|---|---|
| rsi_bullish | (30 − RSI) / 30 |
| rsi_bearish | (RSI − 70) / 30 |
| macd_bullish | min(H / σ_H, 1) |
| macd_bearish | min(\|H\| / σ_H, 1) |
| sma_bullish | min((SMA20 − SMA50) / SMA50, 1) |
| sma_bearish | min((SMA50 − SMA20) / SMA50, 1) |
| bollinger_bullish | min((Linf − P) / (Lsup − Linf), 1) |
| bollinger_bearish | min((P − Lsup) / (Lsup − Linf), 1) |

#### Scenario: RSI oversold evidence
- GIVEN RSI = 15 for asset X in the active window
- WHEN the RSI window evaluates FILTER(?rsi < 30)
- THEN it MUST emit `rsi_bullish(X,t)` with γ = (30−15)/30 = 0.50 (paper §3.3 worked example)

### Requirement: Evidence risk (ρ) computation
The system MUST compute ρ = min(σ_ω / σ_ref, 1), σ_ref = 0.02, where σ_ω is the standard deviation of consecutive-close returns rᵢ = (Pᵢ − Pᵢ₋₁)/Pᵢ₋₁ within the active window, per paper eq. 1-2.

#### Scenario: Moderate volatility
- GIVEN σ_ω = 0.008 for the active window
- WHEN ρ is computed
- THEN ρ MUST equal min(0.008/0.02, 1) = 0.40 (paper eq. 3)

#### Scenario: Zero-volatility guard
- GIVEN σ_ω = 0 (all consecutive closes identical)
- WHEN ρ is computed
- THEN the system MUST return ρ = 0 without dividing by zero (proposal Edge Cases)

### Requirement: Non-monotonic evidence lifecycle
Evidence MUST be emitted only while its condition holds in the active window and MUST stop emitting automatically when the condition ceases, without an explicit retraction message, per paper §2.1 and §3.3.

#### Scenario: Condition clears
- GIVEN `rsi_bullish(X,t)` was active and RSI rises above 30
- WHEN the window re-evaluates
- THEN the evidence MUST NOT be emitted in the new cycle

### Requirement: Cold start and window edge behavior
The system MUST emit no evidence when fewer than the window's ω candles are available, and MUST NOT fabricate a neutral/default label (proposal Edge Cases). Window edge effects and β-latency (delay ≤1 candle between condition change and detection) are inherent to the windowing paradigm and MUST be documented, not corrected, per paper §5.

#### Scenario: Insufficient history
- GIVEN fewer than 14 candles are available for the RSI window
- WHEN evaluation runs
- THEN no `rsi_bullish`/`rsi_bearish` evidence MUST be emitted for that cycle
