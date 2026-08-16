import { describe, expect, it } from 'vitest';
import { RULES } from '@/src/laf/rules';
import type { RuleId, EvidencePredicate, Thesis } from '@/src/domain/types';

// FAF paper §3.4 / Cuadro 3 — fixed R1-R8 predicate -> thesis table.
// Every rule label is fixed at <1,0> (max confidence, zero risk).

describe('RULES (R1-R8 fixed table)', () => {
  const expected: Array<{ rule: RuleId; predicate: EvidencePredicate; thesis: Thesis }> = [
    { rule: 'R1', predicate: 'rsi_bullish', thesis: 'bullish' },
    { rule: 'R2', predicate: 'macd_bullish', thesis: 'bullish' },
    { rule: 'R3', predicate: 'sma_bullish', thesis: 'bullish' },
    { rule: 'R4', predicate: 'bollinger_bullish', thesis: 'bullish' },
    { rule: 'R5', predicate: 'rsi_bearish', thesis: 'bearish' },
    { rule: 'R6', predicate: 'macd_bearish', thesis: 'bearish' },
    { rule: 'R7', predicate: 'sma_bearish', thesis: 'bearish' },
    { rule: 'R8', predicate: 'bollinger_bearish', thesis: 'bearish' },
  ];

  it('wires exactly 8 rules', () => {
    expect(RULES).toHaveLength(8);
  });

  it.each(expected)('$rule maps $predicate -> $thesis with label <1,0>', ({ rule, predicate, thesis }) => {
    const found = RULES.find((r) => r.id === rule);

    expect(found).toBeDefined();
    expect(found?.predicate).toBe(predicate);
    expect(found?.thesis).toBe(thesis);
    expect(found?.label).toEqual({ gamma: 1, rho: 0 });
  });

  it('maps each predicate to exactly one rule (no duplicates)', () => {
    const predicates = RULES.map((r) => r.predicate);
    const unique = new Set(predicates);

    expect(unique.size).toBe(8);
  });
});
