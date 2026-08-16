import { DataFactory } from 'n3';
import type { NamedNode, Literal } from 'n3';

/**
 * faf: domain ontology (FAF paper §3.2). Minimal vocabulary shared by
 * mapCandles.ts (faf:PriceEvent) and mapIndicators.ts (faf:IndicatorValue).
 * Canonical source of truth for the namespace, terms, and IRI-minting
 * convention `faf:event_{asset}_{kind}_{t}` referenced (and locally
 * duplicated ahead of this file's existence) by src/stream/window.ts and
 * src/stream/evidence.ts, per tasks.md's L2-before-L1 build order.
 */

const { namedNode, literal } = DataFactory;

export const FAF_NS = 'http://faf.org/ontology#';
export const XSD_NS = 'http://www.w3.org/2001/XMLSchema#';

export const RDF_TYPE: NamedNode = namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type');

function faf(term: string): NamedNode {
  return namedNode(FAF_NS + term);
}

export const TERMS = {
  PriceEvent: faf('PriceEvent'),
  IndicatorValue: faf('IndicatorValue'),
  open: faf('open'),
  high: faf('high'),
  low: faf('low'),
  close: faf('close'),
  volume: faf('volume'),
  asset: faf('asset'),
  timestamp: faf('timestamp'),
  indicator: faf('indicator'),
  rsiValue: faf('rsiValue'),
  macdHistogram: faf('macdHistogram'),
  sma20: faf('sma20'),
  sma50: faf('sma50'),
  bollingerUpper: faf('bollingerUpper'),
  bollingerLower: faf('bollingerLower'),
  RSI: faf('RSI'),
  MACD: faf('MACD'),
  SMA: faf('SMA'),
  BOLLINGER: faf('BOLLINGER'),
} as const;

/** `faf:{asset}` as a named node (paper §3.2 example: `faf:asset faf:AAPL`). */
export function assetNode(asset: string): NamedNode {
  return faf(asset);
}

/** IRI minting convention (design.md Module Structure): `faf:event_{asset}_{kind}_{t}`. */
export function mintEventIri(asset: string, kind: string, t: number): NamedNode {
  return faf(`event_${asset}_${kind}_${t}`);
}

export function decimalLiteral(value: number): Literal {
  return literal(String(value), namedNode(XSD_NS + 'decimal'));
}

export function dateTimeLiteral(t: number): Literal {
  return literal(new Date(t).toISOString(), namedNode(XSD_NS + 'dateTime'));
}
