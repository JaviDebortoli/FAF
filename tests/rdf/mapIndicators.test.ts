import { describe, expect, it } from 'vitest';
import { Store } from 'n3';
import { mapIndicators } from '@/src/rdf/mapIndicators';
import { mapCandles } from '@/src/rdf/mapCandles';
import { RDF_TYPE, TERMS } from '@/src/rdf/ontology';
import type { Candle } from '@/src/domain/types';

// FAF paper §3.2 (worked RSI example: faf:event_AAPL_rsi_001) —
// faf:IndicatorValue mapping + rdf:type disambiguation from faf:PriceEvent.

describe('mapIndicators', () => {
  it('maps an RSI reading to faf:IndicatorValue with faf:indicator faf:RSI and faf:rsiValue', () => {
    const quads = mapIndicators({ kind: 'RSI', asset: 'AAPL', t: 1_700_000_000_000, values: { rsiValue: 15 } });
    const typeQuad = quads.find((q) => q.predicate.equals(RDF_TYPE))!;
    const indicatorQuad = quads.find((q) => q.predicate.value === TERMS.indicator.value)!;
    const rsiQuad = quads.find((q) => q.predicate.value === TERMS.rsiValue.value)!;

    expect(typeQuad.object.value).toBe(TERMS.IndicatorValue.value);
    expect(indicatorQuad.object.value).toBe(TERMS.RSI.value);
    expect(Number(rsiQuad.object.value)).toBe(15);
    expect((rsiQuad.object as { datatype: { value: string } }).datatype.value).toContain('decimal');
  });

  it('maps a MACD reading with faf:macdHistogram', () => {
    const quads = mapIndicators({ kind: 'MACD', asset: 'AAPL', t: 1_700_000_000_000, values: { macdHistogram: 0.75 } });
    const indicatorQuad = quads.find((q) => q.predicate.value === TERMS.indicator.value)!;
    const histogramQuad = quads.find((q) => q.predicate.value === TERMS.macdHistogram.value)!;

    expect(indicatorQuad.object.value).toBe(TERMS.MACD.value);
    expect(Number(histogramQuad.object.value)).toBe(0.75);
  });

  it('maps an SMA reading carrying both sma20 and sma50 on one IndicatorValue resource', () => {
    const quads = mapIndicators({
      kind: 'SMA',
      asset: 'AAPL',
      t: 1_700_000_000_000,
      values: { sma20: 110, sma50: 100 },
    });
    const subjects = new Set(quads.map((q) => q.subject.value));
    const sma20Quad = quads.find((q) => q.predicate.value === TERMS.sma20.value)!;
    const sma50Quad = quads.find((q) => q.predicate.value === TERMS.sma50.value)!;

    expect(subjects.size).toBe(1); // one shared resource for both properties
    expect(Number(sma20Quad.object.value)).toBe(110);
    expect(Number(sma50Quad.object.value)).toBe(100);
  });

  it('maps a Bollinger reading carrying both bollingerUpper and bollingerLower', () => {
    const quads = mapIndicators({
      kind: 'BOLLINGER',
      asset: 'AAPL',
      t: 1_700_000_000_000,
      values: { bollingerUpper: 110, bollingerLower: 90 },
    });
    const upperQuad = quads.find((q) => q.predicate.value === TERMS.bollingerUpper.value)!;
    const lowerQuad = quads.find((q) => q.predicate.value === TERMS.bollingerLower.value)!;

    expect(Number(upperQuad.object.value)).toBe(110);
    expect(Number(lowerQuad.object.value)).toBe(90);
  });

  it('disambiguates faf:PriceEvent from faf:IndicatorValue via rdf:type alone in a mixed store', () => {
    const candle: Candle = { openTime: 1_700_000_000_000, open: 1, high: 2, low: 0.5, close: 1.5, volume: 10 };
    const store = new Store();
    store.addQuads(mapCandles('AAPL', [candle]));
    store.addQuads(mapIndicators({ kind: 'RSI', asset: 'AAPL', t: 1_700_000_000_000, values: { rsiValue: 15 } }));

    const priceEvents = store.getQuads(null, RDF_TYPE, TERMS.PriceEvent, null);
    const indicatorValues = store.getQuads(null, RDF_TYPE, TERMS.IndicatorValue, null);

    expect(priceEvents).toHaveLength(1);
    expect(indicatorValues).toHaveLength(1);
    expect(priceEvents[0]!.subject.value).not.toBe(indicatorValues[0]!.subject.value);
  });
});
