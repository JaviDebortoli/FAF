import { DataFactory } from 'n3';
import type { Quad } from 'n3';
import type { Asset, Candle } from '@/src/domain/types';
import { RDF_TYPE, TERMS, assetNode, decimalLiteral, dateTimeLiteral, mintEventIri } from './ontology';

const { quad } = DataFactory;

/**
 * L1: Candle[] -> Quad[] (FAF paper §3.2, semantic-ingestion spec
 * "OHLCV to RDF price-event mapping"). One faf:PriceEvent resource per
 * candle, carrying all five OHLCV properties, faf:asset (a named node),
 * and faf:timestamp.
 */
export function mapCandles(asset: Asset, candles: Candle[]): Quad[] {
  const quads: Quad[] = [];

  for (const candle of candles) {
    const subject = mintEventIri(asset, 'price', candle.openTime);
    quads.push(
      quad(subject, RDF_TYPE, TERMS.PriceEvent),
      quad(subject, TERMS.open, decimalLiteral(candle.open)),
      quad(subject, TERMS.high, decimalLiteral(candle.high)),
      quad(subject, TERMS.low, decimalLiteral(candle.low)),
      quad(subject, TERMS.close, decimalLiteral(candle.close)),
      quad(subject, TERMS.volume, decimalLiteral(candle.volume)),
      quad(subject, TERMS.asset, assetNode(asset)),
      quad(subject, TERMS.timestamp, dateTimeLiteral(candle.openTime)),
    );
  }

  return quads;
}
