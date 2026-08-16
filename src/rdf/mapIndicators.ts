import { DataFactory } from 'n3';
import type { NamedNode, Quad } from 'n3';
import type { Asset, Millis } from '@/src/domain/types';
import { RDF_TYPE, TERMS, assetNode, decimalLiteral, dateTimeLiteral, mintEventIri } from './ontology';

const { quad } = DataFactory;

export type IndicatorKind = 'RSI' | 'MACD' | 'SMA' | 'BOLLINGER';

export interface IndicatorReading {
  kind: IndicatorKind;
  asset: Asset;
  t: Millis;
  values: Partial<{
    rsiValue: number;
    macdHistogram: number;
    sma20: number;
    sma50: number;
    bollingerUpper: number;
    bollingerLower: number;
  }>;
}

const VALUE_PROPERTY: Record<keyof IndicatorReading['values'], NamedNode> = {
  rsiValue: TERMS.rsiValue,
  macdHistogram: TERMS.macdHistogram,
  sma20: TERMS.sma20,
  sma50: TERMS.sma50,
  bollingerUpper: TERMS.bollingerUpper,
  bollingerLower: TERMS.bollingerLower,
};

/**
 * L1: indicator scalars -> faf:IndicatorValue quads (FAF paper §3.2,
 * semantic-ingestion spec "Indicator value RDF mapping"). One resource per
 * reading, carrying faf:indicator (RSI/MACD/SMA/BOLLINGER), faf:asset,
 * faf:timestamp, and the indicator-specific value property/ies.
 * rdf:type (faf:IndicatorValue vs faf:PriceEvent) disambiguates from
 * mapCandles.ts output when both are queried from the same store.
 */
export function mapIndicators(reading: IndicatorReading): Quad[] {
  const subject = mintEventIri(reading.asset, reading.kind.toLowerCase(), reading.t);

  const quads: Quad[] = [
    quad(subject, RDF_TYPE, TERMS.IndicatorValue),
    quad(subject, TERMS.indicator, TERMS[reading.kind]),
    quad(subject, TERMS.asset, assetNode(reading.asset)),
    quad(subject, TERMS.timestamp, dateTimeLiteral(reading.t)),
  ];

  for (const [key, value] of Object.entries(reading.values) as [keyof IndicatorReading['values'], number | undefined][]) {
    if (value === undefined) continue;
    quads.push(quad(subject, VALUE_PROPERTY[key], decimalLiteral(value)));
  }

  return quads;
}
