import type { Asset, Candle, Decision, DecisionReport, Market, Millis } from '@/src/domain/types';
import { mapCandles } from '@/src/rdf/mapCandles';
import { createStore, toTurtle } from '@/src/rdf/store';
import { extractEvidence } from '@/src/stream/evidence';
import { evaluateGraph } from '@/src/laf/graph';
import { decide } from '@/src/decision/policy';

/** One asset's raw klines, as pushed by n8n or pulled server-side (design.md D-C). */
export interface AssetKlines {
  asset: Asset;
  market: Market;
  candles: Candle[];
}

/**
 * Deterministic latest-candle timestamp for `candles` — the "now" at which
 * this asset's evidence/decision is evaluated. Derived from the input data
 * itself (never `Date.now()`), which is what makes `runCycle` a pure
 * function (design.md D-B / sequence (a): "Same input => same report").
 */
function latestTimestamp(candles: Candle[]): Millis {
  let max = -Infinity;
  for (const candle of candles) {
    if (candle.openTime > max) max = candle.openTime;
  }
  return max;
}

/**
 * Composes one asset's raw klines through L1 (mapCandles -> RDF quads) ->
 * L2 (extractEvidence over the per-cycle store) -> L3 (evaluateGraph) -> L4
 * (decide), assembling the full trace (candles, Turtle serialization,
 * evidences) required for §5 traceability. `market` is attached to
 * `decide()`'s result here, at the composition layer, rather than threaded
 * into `DecisionContext`/`decide()` itself (design.md D-A task A.2): it is
 * an identity field, not reasoning input, so L4 (src/decision/policy.ts)
 * stays untouched in its decision algebra and fully asset-agnostic
 * (proposal Out of Scope) while `decide()` returns `Omit<Decision,
 * 'market'>` — the resulting `Decision.market` is still correctly set.
 */
function decideForAsset(asset: Asset, market: Market, candles: Candle[]): Decision {
  const now = latestTimestamp(candles);
  const quads = mapCandles(asset, candles);
  const store = createStore(quads);
  const evidences = extractEvidence(store, asset, now);
  const { bullish, bearish } = evaluateGraph(evidences);
  const turtle = toTurtle(quads);
  const decision = decide(bullish, bearish, { asset, t: now, candles, turtle, evidences });
  return { ...decision, market };
}

/** Deterministic cycle identity derived from the resulting decisions' own timestamps. */
function computeCycleId(decisions: Decision[]): string {
  if (decisions.length === 0) return 'cycle_empty';
  const latest = decisions.reduce((max, d) => Math.max(max, d.t), -Infinity);
  return `cycle_${latest}`;
}

/**
 * Pure L1->L4 composition (design.md "Technical Approach"): `runCycle`
 * itself performs no I/O and reads no wall clock — every timestamp in its
 * output is derived from the input `rawKlines`. Same input always produces
 * a byte-identical `DecisionReport` (tests/cycle/idempotency.test.ts),
 * which is what makes the presentation-only cache in `src/cycle/latest.ts`
 * safe: a cache miss simply recomputes an identical report.
 *
 * Assets with zero candles are skipped entirely (no Decision emitted) —
 * "failed/delayed fetch -> emit nothing, no error" (semantic-ingestion
 * spec, FAF §2.1). An asset with SOME candles but below an indicator's own
 * window size still produces a Decision (typically NO_RECOMMENDATION /
 * NO_EVIDENCE) rather than being silently dropped, since that is genuine
 * signal, not a fetch failure.
 */
export function runCycle(rawKlines: AssetKlines[]): DecisionReport {
  const decisions: Decision[] = [];

  for (const { asset, market, candles } of rawKlines) {
    if (candles.length === 0) continue;
    decisions.push(decideForAsset(asset, market, candles));
  }

  // One push = one market (design.md D-A/D-C): every `rawKlines` item shares
  // the same `market`, so the first item is authoritative. Falls back to
  // 'crypto' only for the degenerate empty-input case, which no caller
  // exercises today (app/api/cycle/route.ts always passes >=1 asset).
  const market: Market = rawKlines[0]?.market ?? decisions[0]?.market ?? 'crypto';

  return {
    cycleId: computeCycleId(decisions),
    market,
    computedAt: decisions.reduce((max, d) => Math.max(max, d.t), 0),
    decisions,
  };
}
