import { describe, expect, it } from 'vitest';
import { buildNarrativeFacts } from '@/src/narrative/facts';
import { score } from '@/src/decision/policy';
import type { Argument, Decision, Evidence, Label, ThesisState } from '@/src/domain/types';

// design.md "Grounding" section: buildNarrativeFacts(decision) is a WHITELIST
// projection, never the raw Decision. trace.turtle/trace.candles are
// explicitly excluded (large, costly, and the Turtle serialization would
// leak the internal IRI scheme into a third-party prompt — T-4). This test
// proves the exclusion by exhaustive shape equality (toEqual fails on any
// unlisted extra key, not just missing ones) plus explicit substring checks,
// and proves buildNarrativeFacts never mutates its input (D7 clause 2/6:
// the reasoning core's own Decision object must come back untouched).

function evidence(predicate: Evidence['predicate'], gamma: number, rho: number, rawValue: number): Evidence {
  return {
    predicate,
    label: { gamma, rho },
    t: 1_700_000_000_000,
    asset: 'BTCUSDT',
    window: { indicator: 'RSI', omega: 20, beta: 1 },
    provenance: {
      indicatorEventIri: `faf:event_BTCUSDT_${predicate}_1700000000000`,
      priceEventIris: ['faf:event_BTCUSDT_price_1700000000000'],
      rawValue,
      sigmaOmega: 0,
    },
  };
}

function argument(rule: Argument['rule'], thesis: Argument['thesis'], ev: Evidence): Argument {
  return { rule, thesis, label: ev.label, evidence: ev };
}

function thesisState(thesis: 'bullish' | 'bearish', supporters: Argument[], aggregated: Label, net: Label): ThesisState {
  return { thesis, supporters, aggregated, net, score: -999 }; // stale .score trap, must never leak
}

// A unique marker embedded in trace.turtle/trace.candles so the test can
// prove — by substring search over the serialized facts — that neither ever
// reaches the model payload.
const TURTLE_MARKER = '@prefix faf: <http://faf.example/ontology#> . faf:SECRET_IRI_MARKER_998877';
const CANDLE_OPEN_TIME_MARKER = 1_699_999_999_999; // distinctive, unlikely to collide with any whitelisted number

function decisionFixture(): Decision {
  const bullEv1 = evidence('rsi_bullish', 0.8, 0.1, 72.5);
  const bullEv2 = evidence('macd_bullish', 0.6, 0.2, 1.3);
  const bearEv1 = evidence('rsi_bearish', 0.3, 0.4, 28.1);

  const bullish = thesisState(
    'bullish',
    [argument('R1', 'bullish', bullEv1), argument('R2', 'bullish', bullEv2)],
    { gamma: 0.5, rho: 0 },
    { gamma: 0.5, rho: 0 },
  );
  const bearish = thesisState('bearish', [argument('R5', 'bearish', bearEv1)], { gamma: 0, rho: 0.05 }, { gamma: 0, rho: 0.05 });

  return {
    asset: 'BTCUSDT',
    t: 1_700_000_000_000,
    recommendation: 'BUY',
    bullish,
    bearish,
    gap: 0.275,
    thresholds: { theta: 0.67, delta: 0.2 },
    trace: {
      candles: [
        { openTime: CANDLE_OPEN_TIME_MARKER, open: 1, high: 2, low: 0.5, close: 1.5, volume: 100 },
      ],
      turtle: TURTLE_MARKER,
      evidences: [bullEv1, bullEv2, bearEv1],
    },
  };
}

describe('buildNarrativeFacts', () => {
  it('produces exactly the whitelisted shape — no trace.turtle, trace.candles, or any unlisted key (T-4)', () => {
    const decision = decisionFixture();

    const facts = buildNarrativeFacts(decision);

    const sigmaPlus = score(decision.bullish.net);
    const sigmaMinus = score(decision.bearish.net);

    expect(facts).toEqual({
      asset: 'BTCUSDT',
      at: new Date(decision.t).toISOString(),
      recommendation: 'BUY',
      thresholds: { theta: 0.67, delta: 0.2 },
      scores: { sigmaPlus, sigmaMinus, gap: Math.abs(sigmaPlus - sigmaMinus) },
      bullish: {
        aggregated: { gamma: 0.5, rho: 0 },
        net: { gamma: 0.5, rho: 0 },
        supporters: [
          { rule: 'R1', predicate: 'rsi_bullish', indicator: 'RSI', omega: 20, gamma: 0.8, rho: 0.1, rawValue: 72.5 },
          { rule: 'R2', predicate: 'macd_bullish', indicator: 'RSI', omega: 20, gamma: 0.6, rho: 0.2, rawValue: 1.3 },
        ],
      },
      bearish: {
        aggregated: { gamma: 0, rho: 0.05 },
        net: { gamma: 0, rho: 0.05 },
        supporters: [
          { rule: 'R5', predicate: 'rsi_bearish', indicator: 'RSI', omega: 20, gamma: 0.3, rho: 0.4, rawValue: 28.1 },
        ],
      },
    });
  });

  it('never emits the turtle serialization or candle data, even as a substring (T-4 exfiltration proof)', () => {
    const decision = decisionFixture();

    const facts = buildNarrativeFacts(decision);
    const serialized = JSON.stringify(facts);

    expect(serialized).not.toContain('faf:SECRET_IRI_MARKER_998877');
    expect(serialized).not.toContain('@prefix');
    expect(serialized).not.toContain(String(CANDLE_OPEN_TIME_MARKER));
    expect(serialized).not.toContain('openTime');
    expect(serialized).not.toContain('turtle');
    expect(serialized).not.toContain('candles');
  });

  it('never leaks ThesisState.score (non-authoritative, must always be recomputed via canonical score())', () => {
    const decision = decisionFixture();

    const facts = buildNarrativeFacts(decision);

    expect(facts.bullish).not.toHaveProperty('score');
    expect(facts.bearish).not.toHaveProperty('score');
    expect(JSON.stringify(facts)).not.toContain('-999');
  });

  it('is a pure read-only projection — never mutates the input Decision (D7 clause 2/6)', () => {
    const decision = decisionFixture();
    const before = structuredClone(decision);

    buildNarrativeFacts(decision);

    expect(decision).toEqual(before);
  });
});
