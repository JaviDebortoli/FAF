import type { EvidencePredicate, Label, RuleId, Thesis } from '@/src/domain/types';

/** L3 inference rule: predicate -> thesis, fixed label lambda(Ri) = <1,0>. */
export interface Rule {
  id: RuleId;
  predicate: EvidencePredicate;
  thesis: Thesis;
  label: Label;
}

/** Every rule fires at max confidence, zero risk (paper §3.4). */
const RULE_LABEL: Label = { gamma: 1, rho: 0 };

/**
 * Fixed R1-R8 inference rule table (paper §3.4, Cuadro 3).
 * R1-R4 support bullish; R5-R8 support bearish.
 */
export const RULES: Rule[] = [
  { id: 'R1', predicate: 'rsi_bullish', thesis: 'bullish', label: RULE_LABEL },
  { id: 'R2', predicate: 'macd_bullish', thesis: 'bullish', label: RULE_LABEL },
  { id: 'R3', predicate: 'sma_bullish', thesis: 'bullish', label: RULE_LABEL },
  { id: 'R4', predicate: 'bollinger_bullish', thesis: 'bullish', label: RULE_LABEL },
  { id: 'R5', predicate: 'rsi_bearish', thesis: 'bearish', label: RULE_LABEL },
  { id: 'R6', predicate: 'macd_bearish', thesis: 'bearish', label: RULE_LABEL },
  { id: 'R7', predicate: 'sma_bearish', thesis: 'bearish', label: RULE_LABEL },
  { id: 'R8', predicate: 'bollinger_bearish', thesis: 'bearish', label: RULE_LABEL },
];
