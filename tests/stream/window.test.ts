import { describe, expect, it } from 'vitest';
import { Store, DataFactory } from 'n3';
import { window } from '@/src/stream/window';
import type { WindowSpec } from '@/src/domain/types';

// FAF paper §2.1/§3.3, design.md D-A (RSP-QL S2R operator). Per task 3.10,
// this test hand-builds N3.js quad fixtures directly — NO dependency on
// src/rdf (L1, built in Phase 4) — mirroring the same faf:PriceEvent shape
// L1 will eventually produce (rdf:type, faf:asset as a named node,
// faf:timestamp as an xsd:dateTime literal, faf:close as an xsd:decimal
// literal) so this module composes cleanly once L1 exists.

const { namedNode, literal, quad } = DataFactory;

const FAF_NS = 'http://faf.org/ontology#';
const XSD_NS = 'http://www.w3.org/2001/XMLSchema#';
const RDF_TYPE = namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type');
const PRICE_EVENT_TYPE = namedNode(FAF_NS + 'PriceEvent');

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

const RSI_SPEC: WindowSpec = { indicator: 'RSI', omega: 14, beta: 1 };

describe('window (S2R operator, W(S,omega,beta))', () => {
  it('returns sufficientHistory=false and empty content on cold start (< omega candles)', () => {
    const store = new Store();
    for (let i = 0; i < 10; i++) {
      addPriceEvent(store, 'BTCUSDT', i * 3_600_000, 100 + i);
    }

    const result = window(store, 'BTCUSDT', 9 * 3_600_000, RSI_SPEC);

    expect(result.sufficientHistory).toBe(false);
    expect(result.closes).toEqual([]);
    expect(result.timestamps).toEqual([]);
  });

  it('returns exactly the last omega candles in chronological order once history is sufficient', () => {
    const store = new Store();
    for (let i = 0; i < 20; i++) {
      addPriceEvent(store, 'BTCUSDT', i * 3_600_000, 100 + i);
    }

    const result = window(store, 'BTCUSDT', 19 * 3_600_000, RSI_SPEC);

    expect(result.sufficientHistory).toBe(true);
    expect(result.closes).toHaveLength(14);
    // last 14 of i=0..19 -> i=6..19 -> closes 106..119
    expect(result.closes).toEqual([106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119]);
    expect(result.timestamps[0]!).toBeLessThan(result.timestamps[result.timestamps.length - 1]!);
  });

  it('respects the injected clock: excludes candles timestamped after `now`', () => {
    const store = new Store();
    for (let i = 0; i < 20; i++) {
      addPriceEvent(store, 'BTCUSDT', i * 3_600_000, 100 + i);
    }
    // a "future" candle relative to the evaluated `now`
    addPriceEvent(store, 'BTCUSDT', 1_000 * 3_600_000, 999);

    const result = window(store, 'BTCUSDT', 19 * 3_600_000, RSI_SPEC);

    expect(result.closes).not.toContain(999);
    expect(result.closes).toEqual([106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119]);
  });

  it('slides by exactly one candle (beta=1) when `now` advances by one step (edge effect, documented not corrected)', () => {
    const store = new Store();
    for (let i = 0; i < 20; i++) {
      addPriceEvent(store, 'BTCUSDT', i * 3_600_000, 100 + i);
    }

    const windowAtT18 = window(store, 'BTCUSDT', 18 * 3_600_000, RSI_SPEC);
    const windowAtT19 = window(store, 'BTCUSDT', 19 * 3_600_000, RSI_SPEC);

    // t=18 window: closes 105..118; t=19 window: closes 106..119 -> shifted by exactly one
    expect(windowAtT18.closes[0]).toBe(105);
    expect(windowAtT19.closes[0]).toBe(106);
    expect(windowAtT19.closes[windowAtT19.closes.length - 1]!).toBe(
      windowAtT18.closes[windowAtT18.closes.length - 1]! + 1,
    );
  });

  it('isolates candles by asset: a second asset with enough history does not leak into the first', () => {
    const store = new Store();
    for (let i = 0; i < 20; i++) {
      addPriceEvent(store, 'BTCUSDT', i * 3_600_000, 100 + i);
      addPriceEvent(store, 'ETHUSDT', i * 3_600_000, 1000 + i);
    }

    const btc = window(store, 'BTCUSDT', 19 * 3_600_000, RSI_SPEC);
    const eth = window(store, 'ETHUSDT', 19 * 3_600_000, RSI_SPEC);

    expect(btc.closes.every((c) => c < 200)).toBe(true);
    expect(eth.closes.every((c) => c > 1000)).toBe(true);
  });
});
