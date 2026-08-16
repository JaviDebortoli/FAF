import { describe, expect, it } from 'vitest';
import { Store, DataFactory } from 'n3';
import { extractEvidence } from '@/src/stream/evidence';

// FAF paper §2.1/§3.3 — R2S operator: active conditions -> Evidence[] (0..8).
// Composes window.ts + indicators + confidence.ts + risk.ts. Hand-built N3
// fixtures mirror src/rdf's eventual output shape (no L1 dependency, same
// rationale as tests/stream/window.test.ts).

const { namedNode, literal, quad } = DataFactory;
const FAF_NS = 'http://faf.org/ontology#';
const XSD_NS = 'http://www.w3.org/2001/XMLSchema#';
const RDF_TYPE = namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type');
const PRICE_EVENT_TYPE = namedNode(FAF_NS + 'PriceEvent');
const HOUR = 3_600_000;

function addPriceEvent(store: Store, asset: string, t: number, close: number): void {
  const subject = namedNode(`${FAF_NS}event_${asset}_price_${t}`);
  store.addQuad(quad(subject, RDF_TYPE, PRICE_EVENT_TYPE));
  store.addQuad(quad(subject, namedNode(FAF_NS + 'asset'), namedNode(FAF_NS + asset)));
  store.addQuad(
    quad(
      subject,
      namedNode(FAF_NS + 'timestamp'),
      literal(new Date(t).toISOString(), namedNode(XSD_NS + 'dateTime')),
    ),
  );
  store.addQuad(
    quad(subject, namedNode(FAF_NS + 'close'), literal(String(close), namedNode(XSD_NS + 'decimal'))),
  );
}

describe('extractEvidence (R2S operator)', () => {
  it('emits no evidence at all on cold start (fewer candles than any indicator omega)', () => {
    const store = new Store();
    for (let i = 0; i < 5; i++) {
      addPriceEvent(store, 'BTCUSDT', i * HOUR, 100 + i);
    }

    const evidences = extractEvidence(store, 'BTCUSDT', 4 * HOUR);

    expect(evidences).toEqual([]);
  });

  it('emits rsi_bullish (deep oversold) and sma_bearish (structural downtrend) for a 60-candle decline; no macd/bollinger fire', () => {
    // 60 strictly decreasing closes: 200, 199, ..., 141 (i=0..59, close=200-i)
    const store = new Store();
    for (let i = 0; i < 60; i++) {
      addPriceEvent(store, 'BTCUSDT', i * HOUR, 200 - i);
    }
    const now = 59 * HOUR;

    const evidences = extractEvidence(store, 'BTCUSDT', now);
    const predicates = evidences.map((e) => e.predicate).sort();

    // RSI: all-losses in every sub-window -> RSI=0 -> rsi_bullish (oversold reversal signal)
    // SMA: SMA20 (mean of the 20 most recent/lowest closes) < SMA50 (mean of all 50,
    //   including older/higher closes) in a monotonic decline -> sma_bearish
    // MACD: omega=26 exactly equals the default slowPeriod -> degenerate single-point
    //   series -> histogram always 0 -> neither macd_bullish nor macd_bearish fires
    //   (documented finding, see apply-progress Deviations)
    // Bollinger: last close (141) sits between the computed +-2sigma bands of the
    //   trailing 20 closes (142..160) -> neither bollinger_bullish nor bollinger_bearish fires
    expect(predicates).toEqual(['rsi_bullish', 'sma_bearish']);

    const rsiEvidence = evidences.find((e) => e.predicate === 'rsi_bullish')!;
    expect(rsiEvidence.label.gamma).toBeCloseTo(1, 9); // RSI=0 -> (30-0)/30=1
    expect(rsiEvidence.label.rho).toBeGreaterThanOrEqual(0);
    expect(rsiEvidence.label.rho).toBeLessThanOrEqual(1);
    expect(rsiEvidence.window).toEqual({ indicator: 'RSI', omega: 14, beta: 1 });
    expect(rsiEvidence.provenance.priceEventIris).toHaveLength(14);
    expect(rsiEvidence.provenance.indicatorEventIri).toContain('BTCUSDT');
    expect(rsiEvidence.provenance.rawValue).toBeCloseTo(0, 9);

    const smaEvidence = evidences.find((e) => e.predicate === 'sma_bearish')!;
    expect(smaEvidence.label.gamma).toBeGreaterThan(0);
    expect(smaEvidence.label.gamma).toBeLessThanOrEqual(1);
    expect(smaEvidence.provenance.priceEventIris).toHaveLength(50);
  });

  it('auto-retracts rsi_bullish (no explicit signal) once RSI returns to the neutral 30-70 range', () => {
    // Same 60-candle decline, then 14 alternating +1/-1 candles (roughly
    // balanced gains/losses) push RSI back toward ~50 (neutral).
    const store = new Store();
    for (let i = 0; i < 60; i++) {
      addPriceEvent(store, 'BTCUSDT', i * HOUR, 200 - i);
    }
    let last = 200 - 59; // 141
    for (let i = 60; i < 74; i++) {
      last += i % 2 === 0 ? 1 : -1;
      addPriceEvent(store, 'BTCUSDT', i * HOUR, last);
    }

    const beforePredicates = extractEvidence(store, 'BTCUSDT', 59 * HOUR).map((e) => e.predicate);
    const afterPredicates = extractEvidence(store, 'BTCUSDT', 73 * HOUR).map((e) => e.predicate);

    expect(beforePredicates).toContain('rsi_bullish');
    expect(afterPredicates.some((p) => p.startsWith('rsi_'))).toBe(false);
  });
});
