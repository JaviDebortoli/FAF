/**
 * src/domain/types.ts — the only shared vocabulary between layers.
 * No imports (design.md "Type Contracts"). Pure type definitions only.
 */

export type Asset = string; // "BTCUSDT"
export type Millis = number; // t in T (epoch ms)

export interface Candle {
  openTime: Millis;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/** lambda = <gamma, rho>, both in [0,1]. Constructed via makeLabel() which asserts range. */
export interface Label {
  readonly gamma: number;
  readonly rho: number;
}

export type EvidencePredicate =
  | 'rsi_bullish'
  | 'macd_bullish'
  | 'sma_bullish'
  | 'bollinger_bullish'
  | 'rsi_bearish'
  | 'macd_bearish'
  | 'sma_bearish'
  | 'bollinger_bearish';

export interface WindowSpec {
  indicator: 'RSI' | 'MACD' | 'SMA' | 'BOLLINGER';
  omega: number;
  beta: 1;
}

/** L2 output tuple <e_k, gamma_k, rho_k, t_k> (paper 3.3) + asset + provenance. */
export interface Evidence {
  predicate: EvidencePredicate;
  label: Label;
  t: Millis;
  asset: Asset;
  window: WindowSpec;
  provenance: {
    indicatorEventIri: string;
    priceEventIris: string[];
    rawValue: number;
    sigmaOmega: number;
  };
}

export type Thesis = 'bullish' | 'bearish';
export type RuleId = 'R1' | 'R2' | 'R3' | 'R4' | 'R5' | 'R6' | 'R7' | 'R8';

/** L3 node: label = otimes(evidence.label, <1,0>) === evidence.label (transparent). */
export interface Argument {
  rule: RuleId;
  thesis: Thesis;
  label: Label;
  evidence: Evidence;
}

export interface ThesisState {
  thesis: Thesis;
  supporters: Argument[];
  aggregated: Label; // lambda(mu)  — oplus; <0,0> when supporters is empty
  net: Label; // lambda*(mu) — ominus
  // sigma(mu) = 0.5*gamma + 0.5*(1-rho). Populated by L3 (src/laf/graph.ts's
  // private scoreOf) for L3 self-containment ONLY, per the mandated
  // L3-before-L4 build order (which forbids an L3 -> L4 import of the
  // canonical score()). NOT authoritative: must never be read by L4
  // (src/decision/policy.ts) or presentation code. Both correctly ignore
  // this field and recompute independently from `.net` via the canonical
  // exported score() in src/decision/policy.ts.
  score: number;
}

export type Recommendation = 'BUY' | 'SELL' | 'NO_RECOMMENDATION'; // COMPRAR / VENDER / SIN RECOMENDACION
export type NoRecommendationReason =
  | 'NO_EVIDENCE'
  | 'BELOW_ACTIVATION'
  | 'INSUFFICIENT_DOMINANCE';

export interface Decision {
  asset: Asset;
  t: Millis;
  recommendation: Recommendation;
  reason?: NoRecommendationReason;
  bullish: ThesisState;
  bearish: ThesisState;
  gap: number;
  thresholds: { theta: 0.67; delta: 0.2 };
  trace: { candles: Candle[]; turtle: string; evidences: Evidence[] }; // raw candle -> RDF -> evidence -> argument -> decision
}

export interface DecisionReport {
  cycleId: string;
  computedAt: Millis;
  decisions: Decision[];
}
