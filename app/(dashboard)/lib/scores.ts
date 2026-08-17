import { score } from '@/src/decision/policy';
import type { Decision } from '@/src/domain/types';

/**
 * design.md "Correctness trap — σ MUST be recomputed, never read":
 * `ThesisState.score` is non-authoritative (src/domain/types.ts). This
 * module wraps the canonical `score()` (src/decision/policy.ts) applied to
 * `decision.bullish.net`/`decision.bearish.net` — no component may read
 * `.score`. θ and δ always come from `decision.thresholds`.
 */
export interface ComputedScores {
  sigmaPlus: number;
  sigmaMinus: number;
  theta: number;
  delta: number;
  gap: number;
}

export function computeScores(decision: Decision): ComputedScores {
  const sigmaPlus = score(decision.bullish.net);
  const sigmaMinus = score(decision.bearish.net);

  return {
    sigmaPlus,
    sigmaMinus,
    theta: decision.thresholds.theta,
    delta: decision.thresholds.delta,
    gap: Math.abs(sigmaPlus - sigmaMinus),
  };
}
