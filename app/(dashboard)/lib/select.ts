import type { Decision, DecisionReport } from '@/src/domain/types';

/** Direction filter over the Tier 1 overview — all four recommendation states are filterable. */
export type Direction = 'ALL' | 'BUY' | 'SELL' | 'NO_RECOMMENDATION';

/**
 * design.md "Rename + widen the selector, no deprecated alias"
 * (no-recommendation-filter-and-i18n): a single 4-way filter over the full
 * report, no pre-filter step. `NO_RECOMMENDATION` decisions are included in
 * `ALL` and directly selectable — the prior hide-invariant is reversed (D1).
 */
export function selectByDirection(report: DecisionReport, direction: Direction = 'ALL'): Decision[] {
  if (direction === 'ALL') return report.decisions;
  return report.decisions.filter((d) => d.recommendation === direction);
}
