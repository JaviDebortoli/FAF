import { score } from '@/src/decision/policy';
import type { Asset, Decision, EvidencePredicate, RuleId, ThesisState, WindowSpec } from '@/src/domain/types';

/**
 * design.md "Grounding — how the narrative is kept honest": buildNarrativeFacts
 * is a WHITELIST projection, never the raw Decision. Every byte of the
 * narrative prompt must be either a static constant (src/narrative/prompt.ts)
 * or a server-derived value from this closed enumeration (T-4). `trace.turtle`
 * and `trace.candles` are deliberately excluded here (large, costly, and the
 * Turtle serialization would leak the internal IRI scheme into a third-party
 * prompt for no explanatory gain) — proven by tests/narrative/facts.test.ts.
 * `ThesisState.score` is likewise never copied: src/domain/types.ts documents
 * it as non-authoritative, so sigma+/sigma- here are always recomputed via
 * the canonical score() from src/decision/policy.ts (same trap as
 * app/(dashboard)/lib/scores.ts's "sigma MUST be recomputed, never read").
 */
export interface NarrativeSupporterFact {
  rule: RuleId;
  predicate: EvidencePredicate;
  indicator: WindowSpec['indicator'];
  omega: number;
  gamma: number;
  rho: number;
  rawValue: number;
}

export interface ThesisFacts {
  aggregated: { gamma: number; rho: number };
  net: { gamma: number; rho: number };
  supporters: NarrativeSupporterFact[];
}

export interface NarrativeFacts {
  asset: Asset;
  at: string; // ISO of decision.t
  recommendation: 'BUY' | 'SELL';
  thresholds: { theta: number; delta: number };
  scores: { sigmaPlus: number; sigmaMinus: number; gap: number };
  bullish: ThesisFacts;
  bearish: ThesisFacts;
}

function buildThesisFacts(thesis: ThesisState): ThesisFacts {
  return {
    aggregated: { gamma: thesis.aggregated.gamma, rho: thesis.aggregated.rho },
    net: { gamma: thesis.net.gamma, rho: thesis.net.rho },
    supporters: thesis.supporters.map((arg) => ({
      rule: arg.rule,
      predicate: arg.evidence.predicate,
      indicator: arg.evidence.window.indicator,
      omega: arg.evidence.window.omega,
      gamma: arg.label.gamma,
      rho: arg.label.rho,
      rawValue: arg.evidence.provenance.rawValue,
    })),
  };
}

/**
 * Read-only whitelist projection of a Decision into the exact JSON payload
 * the narrative model receives (see prompt.ts's buildUserMessage). The
 * caller (the narrative route, PR2b) is responsible for only invoking this
 * for BUY/SELL decisions — NO_RECOMMENDATION is short-circuited upstream
 * with a 409 before any Decision reaches this function.
 */
export function buildNarrativeFacts(decision: Decision): NarrativeFacts {
  const sigmaPlus = score(decision.bullish.net);
  const sigmaMinus = score(decision.bearish.net);

  return {
    asset: decision.asset,
    at: new Date(decision.t).toISOString(),
    recommendation: decision.recommendation as 'BUY' | 'SELL',
    thresholds: { theta: decision.thresholds.theta, delta: decision.thresholds.delta },
    scores: { sigmaPlus, sigmaMinus, gap: Math.abs(sigmaPlus - sigmaMinus) },
    bullish: buildThesisFacts(decision.bullish),
    bearish: buildThesisFacts(decision.bearish),
  };
}
