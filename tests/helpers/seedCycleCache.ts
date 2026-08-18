import * as cycleCache from '@/src/cycle/latest';
import type { Argument, Decision, DecisionReport, Evidence, Label, ThesisState } from '@/src/domain/types';

/**
 * Shared cache-seeding seam (design.md "Testing Strategy" / tasks.md 2a.1):
 * replaces pull-mode + stubbed-`fetch` as the way API tests produce a
 * `DecisionReport` to read back. Generalizes the local `buildReport`/
 * `primeReport` pair already used in `tests/api/narrative.test.ts` — same
 * shape, promoted to a shared helper so `tests/api/decisions.test.ts` and
 * `tests/api/decisions-invariance.test.ts` (push-only, no `runCycle`/
 * `pullAllAssets` call) can seed the cache directly too.
 */

const DEFAULT_ASSET = 'BTCUSDT';
const DEFAULT_T = 1_700_000_000_000;

function defaultEvidence(): Evidence {
  return {
    predicate: 'rsi_bullish',
    label: { gamma: 0.8, rho: 0.1 },
    t: DEFAULT_T,
    asset: DEFAULT_ASSET,
    window: { indicator: 'RSI', omega: 20, beta: 1 },
    provenance: {
      indicatorEventIri: `faf:event_${DEFAULT_ASSET}_rsi_bullish_${DEFAULT_T}`,
      priceEventIris: [`faf:event_${DEFAULT_ASSET}_price_${DEFAULT_T}`],
      rawValue: 72.5,
      sigmaOmega: 0,
    },
  };
}

function thesisState(thesis: 'bullish' | 'bearish', supporters: Argument[], label: Label): ThesisState {
  return { thesis, supporters, aggregated: label, net: label, score: -999 };
}

/** Builds a minimal-but-valid `Decision` for `DEFAULT_ASSET`/`DEFAULT_T` when no overrides are given. */
export function buildDecision(overrides: Partial<Decision> = {}): Decision {
  const ev = defaultEvidence();
  const bullish = thesisState('bullish', [{ rule: 'R1', thesis: 'bullish', label: ev.label, evidence: ev }], {
    gamma: 0.5,
    rho: 0,
  });
  const bearish = thesisState('bearish', [], { gamma: 0, rho: 0.05 });

  return {
    asset: DEFAULT_ASSET,
    t: DEFAULT_T,
    recommendation: 'BUY',
    bullish,
    bearish,
    gap: 0.275,
    thresholds: { theta: 0.67, delta: 0.2 },
    trace: { candles: [], turtle: '', evidences: [ev] },
    ...overrides,
  };
}

/** Wraps `decisions` (defaulting to one synthetic decision) in a `DecisionReport`. */
export function buildReport(decisions: Decision[] = [buildDecision()]): DecisionReport {
  return { cycleId: 'cycle_test', computedAt: DEFAULT_T, decisions };
}

/** Thin wrapper around `cache.put` — the shared seam every push-only API test seeds through. */
export function seedCycleCache(report: DecisionReport, ttlMs = 60_000): void {
  cycleCache.put(report, ttlMs);
}
