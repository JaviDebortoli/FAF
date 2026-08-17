import type { Decision, DecisionReport } from '@/src/domain/types';

/** Direction filter over the Tier 1 overview — `NO_RECOMMENDATION` never produces a filterable card. */
export type Direction = 'ALL' | 'BUY' | 'SELL';

/**
 * design.md "Tier 1 selection rule": actionable decisions are those with an
 * active BUY or SELL recommendation, then narrowed by direction. Assets with
 * `NO_RECOMMENDATION` never appear regardless of the direction filter.
 */
export function selectActionable(report: DecisionReport, direction: Direction = 'ALL'): Decision[] {
  const actionable = report.decisions.filter((d) => d.recommendation !== 'NO_RECOMMENDATION');
  if (direction === 'ALL') return actionable;
  return actionable.filter((d) => d.recommendation === direction);
}
