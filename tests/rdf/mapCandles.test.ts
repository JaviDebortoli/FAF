import { describe, expect, it } from 'vitest';
import { mapCandles } from '@/src/rdf/mapCandles';
import { toTurtle } from '@/src/rdf/store';
import { FAF_NS, XSD_NS, RDF_TYPE, TERMS } from '@/src/rdf/ontology';
import type { Candle } from '@/src/domain/types';

// FAF paper §3.2 — OHLCV to faf:PriceEvent mapping. Assert exact triples
// (subject IRI, rdf:type, each OHLCV predicate, xsd:decimal/xsd:dateTime
// datatypes), per design.md's Testing Strategy for L1.

const candle: Candle = { openTime: 1_700_000_000_000, open: 100, high: 105, low: 98, close: 102, volume: 1234.5 };

describe('mapCandles', () => {
  it('mints the subject IRI as faf:event_{asset}_price_{openTime}', () => {
    const quads = mapCandles('BTCUSDT', [candle]);
    const subjectIris = new Set(quads.map((q) => q.subject.value));

    expect(subjectIris).toEqual(new Set([`${FAF_NS}event_BTCUSDT_price_1700000000000`]));
  });

  it('emits an rdf:type faf:PriceEvent triple', () => {
    const quads = mapCandles('BTCUSDT', [candle]);
    const typeQuad = quads.find((q) => q.predicate.equals(RDF_TYPE));

    expect(typeQuad).toBeDefined();
    expect(typeQuad!.object.value).toBe(TERMS.PriceEvent.value);
  });

  it('emits all five OHLCV properties as xsd:decimal literals with the correct values', () => {
    const quads = mapCandles('BTCUSDT', [candle]);
    const byPredicate = (predicateValue: string) => quads.find((q) => q.predicate.value === predicateValue);

    const open = byPredicate(TERMS.open.value)!;
    const high = byPredicate(TERMS.high.value)!;
    const low = byPredicate(TERMS.low.value)!;
    const close = byPredicate(TERMS.close.value)!;
    const volume = byPredicate(TERMS.volume.value)!;

    expect(Number(open.object.value)).toBe(100);
    expect(Number(high.object.value)).toBe(105);
    expect(Number(low.object.value)).toBe(98);
    expect(Number(close.object.value)).toBe(102);
    expect(Number(volume.object.value)).toBe(1234.5);
    for (const q of [open, high, low, close, volume]) {
      expect((q.object as { datatype: { value: string } }).datatype.value).toBe(XSD_NS + 'decimal');
    }
  });

  it('emits faf:asset as a named node (not a literal), per the paper §3.2 example', () => {
    const quads = mapCandles('BTCUSDT', [candle]);
    const assetQuad = quads.find((q) => q.predicate.value === TERMS.asset.value)!;

    expect(assetQuad.object.termType).toBe('NamedNode');
    expect(assetQuad.object.value).toBe(`${FAF_NS}BTCUSDT`);
  });

  it('emits faf:timestamp as an xsd:dateTime literal matching the candle openTime', () => {
    const quads = mapCandles('BTCUSDT', [candle]);
    const tsQuad = quads.find((q) => q.predicate.value === TERMS.timestamp.value)!;

    expect((tsQuad.object as { datatype: { value: string } }).datatype.value).toBe(XSD_NS + 'dateTime');
    expect(Date.parse(tsQuad.object.value)).toBe(candle.openTime);
  });

  it('produces distinct subject IRIs for multiple candles, and serializes to valid Turtle', () => {
    const candles: Candle[] = [
      candle,
      { ...candle, openTime: candle.openTime + 3_600_000, close: 103 },
    ];
    const quads = mapCandles('BTCUSDT', candles);
    const subjectIris = new Set(quads.map((q) => q.subject.value));

    expect(subjectIris.size).toBe(2);

    const turtle = toTurtle(quads);
    expect(turtle).toContain('PriceEvent');
    expect(turtle).toContain('BTCUSDT');
  });
});
