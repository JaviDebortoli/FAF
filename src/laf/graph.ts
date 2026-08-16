import type { Argument, Evidence, Label, Thesis, ThesisState } from '@/src/domain/types';
import { ominus, oplus, otimes } from '@/src/laf/algebra';
import { RULES } from '@/src/laf/rules';

/**
 * L3 argument graph evaluation (design.md sequence diagram (b)).
 * Fixed topology (Budán Fig. 5(a)): 8 evidence leaves -> 2 RA aggregation
 * groups (AP/AN) -> 1 CA conflict resolution. Acyclic, so direct
 * otimes -> oplus -> ominus evaluation replaces a general graph solver.
 */

/**
 * Score sigma(mu) = 0.5*gamma + 0.5*(1-rho) (paper eq. 10).
 * Owned canonically by src/decision/policy.ts#score; duplicated here as a
 * private one-line helper so L3's ThesisState is self-contained without
 * introducing an L3 -> L4 import (L3 is built and tested before L4 per the
 * mandated implementation order).
 */
function scoreOf(label: Label): number {
  return 0.5 * label.gamma + 0.5 * (1 - label.rho);
}

function buildArguments(evidences: Evidence[], thesis: Thesis): Argument[] {
  const args: Argument[] = [];
  for (const evidence of evidences) {
    const rule = RULES.find((r) => r.predicate === evidence.predicate);
    if (!rule || rule.thesis !== thesis) continue;
    args.push({
      rule: rule.id,
      thesis: rule.thesis,
      label: otimes(evidence.label, rule.label),
      evidence,
    });
  }
  return args;
}

function buildThesisState(
  thesis: Thesis,
  supporters: Argument[],
  aggregated: Label,
  opposingAggregated: Label,
): ThesisState {
  const net = ominus(aggregated, opposingAggregated);
  return {
    thesis,
    supporters,
    aggregated,
    net,
    score: scoreOf(net),
  };
}

/**
 * Rebuilds the argument graph from scratch and evaluates both theses.
 * No argument, label, or graph state persists between calls (proposal
 * "zero persisted argumentative state").
 */
export function evaluateGraph(evidences: Evidence[]): { bullish: ThesisState; bearish: ThesisState } {
  const bullishArgs = buildArguments(evidences, 'bullish');
  const bearishArgs = buildArguments(evidences, 'bearish');

  const aggregatedBullish = oplus(bullishArgs.map((a) => a.label));
  const aggregatedBearish = oplus(bearishArgs.map((a) => a.label));

  return {
    bullish: buildThesisState('bullish', bullishArgs, aggregatedBullish, aggregatedBearish),
    bearish: buildThesisState('bearish', bearishArgs, aggregatedBearish, aggregatedBullish),
  };
}
