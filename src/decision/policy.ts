import type {
  Asset,
  Candle,
  Decision,
  Evidence,
  Label,
  Millis,
  NoRecommendationReason,
  Recommendation,
  ThesisState,
} from '@/src/domain/types';

/** L4 decision policy (paper eq. 10-11, §3.5). */

/** Minimum dominant-thesis score (paper eq. 11, fixed per openspec/config.yaml). */
export const THETA = 0.67;
/** Minimum score gap between dominant and opposing theses (paper eq. 11). */
export const DELTA = 0.2;

/**
 * Tolerance absorbing IEEE-754 double rounding noise (e.g. 0.87 - 0.67 !==
 * 0.2 exactly in floating point) so boundary values documented as "exact"
 * in the spec (theta=0.67, gap=0.20) are still treated as inclusive.
 */
const EPSILON = 1e-9;

/** Trace/identity context supplied by the composition layer (src/cycle/runCycle.ts). */
export interface DecisionContext {
  asset: Asset;
  t: Millis;
  candles: Candle[];
  turtle: string;
  evidences: Evidence[];
}

/** Score function sigma(mu) = 0.5*gamma + 0.5*(1-rho) (paper eq. 10). */
export function score(label: Label): number {
  return 0.5 * label.gamma + 0.5 * (1 - label.rho);
}

function resolveNoRecommendationReason(
  bullish: ThesisState,
  bearish: ThesisState,
  sigmaPlus: number,
  sigmaMinus: number,
): NoRecommendationReason {
  if (bullish.supporters.length === 0 && bearish.supporters.length === 0) {
    return 'NO_EVIDENCE';
  }
  if (sigmaPlus < THETA - EPSILON && sigmaMinus < THETA - EPSILON) {
    return 'BELOW_ACTIVATION';
  }
  return 'INSUFFICIENT_DOMINANCE';
}

/**
 * Three-way decision rule (paper eq. 11):
 * BUY iff sigma(mu+) >= theta AND sigma(mu+) - sigma(mu-) >= delta;
 * SELL iff sigma(mu-) >= theta AND sigma(mu-) - sigma(mu+) >= delta;
 * otherwise NO_RECOMMENDATION with a distinguishing reason.
 */
export function decide(bullish: ThesisState, bearish: ThesisState, ctx: DecisionContext): Decision {
  const sigmaPlus = score(bullish.net);
  const sigmaMinus = score(bearish.net);

  let recommendation: Recommendation;
  let reason: NoRecommendationReason | undefined;

  if (sigmaPlus >= THETA - EPSILON && sigmaPlus - sigmaMinus >= DELTA - EPSILON) {
    recommendation = 'BUY';
  } else if (sigmaMinus >= THETA - EPSILON && sigmaMinus - sigmaPlus >= DELTA - EPSILON) {
    recommendation = 'SELL';
  } else {
    recommendation = 'NO_RECOMMENDATION';
    reason = resolveNoRecommendationReason(bullish, bearish, sigmaPlus, sigmaMinus);
  }

  return {
    asset: ctx.asset,
    t: ctx.t,
    recommendation,
    reason,
    bullish,
    bearish,
    gap: Math.abs(sigmaPlus - sigmaMinus),
    thresholds: { theta: THETA, delta: DELTA },
    trace: { candles: ctx.candles, turtle: ctx.turtle, evidences: ctx.evidences },
  };
}
