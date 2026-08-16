import type { Store } from 'n3';
import type { Asset, Evidence, EvidencePredicate, Millis, WindowSpec } from '@/src/domain/types';
import { window } from './window';
import { computeRSI } from './indicators/rsi';
import { computeMACD } from './indicators/macd';
import { computeSMA } from './indicators/sma';
import { computeBollingerBands } from './indicators/bollinger';
import {
  confidenceRsiBullish,
  confidenceRsiBearish,
  confidenceMacdBullish,
  confidenceMacdBearish,
  confidenceSmaBullish,
  confidenceSmaBearish,
  confidenceBollingerBullish,
  confidenceBollingerBearish,
} from './confidence';
import { computeSigmaOmega, computeRisk } from './risk';
import { mintEventIri } from '@/src/rdf/ontology';

/** Fixed window configurations (paper Cuadro 1: RSI 14/1, MACD 26/1, SMA 50/1, Bollinger 20/1). */
const RSI_SPEC: WindowSpec = { indicator: 'RSI', omega: 14, beta: 1 };
/**
 * DEVIATION D5 (see design.md / docs/PRD.md "Desvíos aprobados"): Cuadro 1
 * literally declares MACD's window as omega=26 candles ("26 velas (período
 * lento)"). At exactly 26 candles, `computeEMASeries(closes, 26)` only ever
 * produces its SEED value — the recursive step `for (i = period; i <
 * values.length; i++)` needs `values.length > period`, and 26 is not > 26 —
 * so the slow-EMA series (and therefore the MACD-line series derived from
 * it) has length 1. With a single-point series, `effectiveSignalPeriod =
 * min(9, 1) = 1`, the signal EMA degenerates to that same point, histogram
 * = macdLine - signal = 0, and sigma_H = populationStdDev([one value]) = 0
 * — ALWAYS, independent of real market data. `evidence.ts`'s activation
 * check (`histogram > 0` / `histogram < 0`) can therefore never fire, so
 * macd_bullish/macd_bearish (rules R2/R6) would be permanently silent at
 * runtime. Fix: widen the RSP-QL window RANGE this call draws from to 50
 * candles — matching the system's uniform per-cycle kline fetch (already
 * required by SMA's own Cuadro-1 window of 50) — so the EMA(26)/EMA(9)
 * chain inside `computeMACD` has enough history to produce a non-degenerate
 * multi-point series. `computeMACD`'s own fast/slow/signal periods
 * (12/26/9) are UNCHANGED and still match Cuadro 1's indicator formula
 * exactly; only the caller's window size changed.
 */
const MACD_SPEC: WindowSpec = { indicator: 'MACD', omega: 50, beta: 1 };
const SMA_SPEC: WindowSpec = { indicator: 'SMA', omega: 50, beta: 1 };
const BOLLINGER_SPEC: WindowSpec = { indicator: 'BOLLINGER', omega: 20, beta: 1 };

/**
 * REFACTOR (task 4.2): IRI minting now delegates to the canonical
 * src/rdf/ontology.ts#mintEventIri (design.md: `faf:event_{asset}_{kind}_{t}`)
 * instead of a locally duplicated string template, now that Phase 4 exists.
 */
function mintIndicatorIri(asset: Asset, kind: string, t: Millis): string {
  return mintEventIri(asset, kind, t).value;
}

function mintPriceIris(asset: Asset, timestamps: Millis[]): string[] {
  return timestamps.map((t) => mintEventIri(asset, 'price', t).value);
}

function makeEvidence(
  predicate: EvidencePredicate,
  gamma: number,
  rho: number,
  t: Millis,
  asset: Asset,
  windowSpec: WindowSpec,
  indicatorEventIri: string,
  priceEventIris: string[],
  rawValue: number,
  sigmaOmega: number,
): Evidence {
  return {
    predicate,
    label: { gamma, rho },
    t,
    asset,
    window: windowSpec,
    provenance: { indicatorEventIri, priceEventIris, rawValue, sigmaOmega },
  };
}

/**
 * R2S operator (RSP-QL, design.md D-A): evaluates all four indicator
 * windows for `asset` as of `now` and emits the Evidence[] whose activation
 * condition currently holds (0..8). Rebuilt from scratch every call — zero
 * persisted state, so a condition that lapses simply is not re-emitted on
 * the next call (non-monotonic retraction by construction, no explicit
 * retraction message; paper §2.1/§3.3).
 */
export function extractEvidence(store: Store, asset: Asset, now: Millis): Evidence[] {
  const evidences: Evidence[] = [];

  const rsiWindow = window(store, asset, now, RSI_SPEC);
  if (rsiWindow.sufficientHistory) {
    const rsi = computeRSI(rsiWindow.closes);
    const sigmaOmega = computeSigmaOmega(rsiWindow.closes);
    const rho = computeRisk(sigmaOmega);
    const iri = mintIndicatorIri(asset, 'rsi', now);
    const priceIris = mintPriceIris(asset, rsiWindow.timestamps);
    if (rsi < 30) {
      evidences.push(
        makeEvidence('rsi_bullish', confidenceRsiBullish(rsi), rho, now, asset, RSI_SPEC, iri, priceIris, rsi, sigmaOmega),
      );
    } else if (rsi > 70) {
      evidences.push(
        makeEvidence('rsi_bearish', confidenceRsiBearish(rsi), rho, now, asset, RSI_SPEC, iri, priceIris, rsi, sigmaOmega),
      );
    }
  }

  const macdWindow = window(store, asset, now, MACD_SPEC);
  if (macdWindow.sufficientHistory) {
    const { histogram, sigmaH } = computeMACD(macdWindow.closes);
    const sigmaOmega = computeSigmaOmega(macdWindow.closes);
    const rho = computeRisk(sigmaOmega);
    const iri = mintIndicatorIri(asset, 'macd', now);
    const priceIris = mintPriceIris(asset, macdWindow.timestamps);
    if (histogram > 0) {
      evidences.push(
        makeEvidence(
          'macd_bullish',
          confidenceMacdBullish(histogram, sigmaH),
          rho,
          now,
          asset,
          MACD_SPEC,
          iri,
          priceIris,
          histogram,
          sigmaOmega,
        ),
      );
    } else if (histogram < 0) {
      evidences.push(
        makeEvidence(
          'macd_bearish',
          confidenceMacdBearish(histogram, sigmaH),
          rho,
          now,
          asset,
          MACD_SPEC,
          iri,
          priceIris,
          histogram,
          sigmaOmega,
        ),
      );
    }
  }

  const smaWindow = window(store, asset, now, SMA_SPEC);
  if (smaWindow.sufficientHistory) {
    const sma20 = computeSMA(smaWindow.closes, 20);
    const sma50 = computeSMA(smaWindow.closes, 50);
    const sigmaOmega = computeSigmaOmega(smaWindow.closes);
    const rho = computeRisk(sigmaOmega);
    const iri = mintIndicatorIri(asset, 'sma', now);
    const priceIris = mintPriceIris(asset, smaWindow.timestamps);
    if (sma20 > sma50) {
      evidences.push(
        makeEvidence(
          'sma_bullish',
          confidenceSmaBullish(sma20, sma50),
          rho,
          now,
          asset,
          SMA_SPEC,
          iri,
          priceIris,
          sma20 - sma50,
          sigmaOmega,
        ),
      );
    } else if (sma50 > sma20) {
      evidences.push(
        makeEvidence(
          'sma_bearish',
          confidenceSmaBearish(sma20, sma50),
          rho,
          now,
          asset,
          SMA_SPEC,
          iri,
          priceIris,
          sma50 - sma20,
          sigmaOmega,
        ),
      );
    }
  }

  const bbWindow = window(store, asset, now, BOLLINGER_SPEC);
  if (bbWindow.sufficientHistory) {
    const { upper, lower } = computeBollingerBands(bbWindow.closes);
    const price = bbWindow.closes[bbWindow.closes.length - 1]!;
    const sigmaOmega = computeSigmaOmega(bbWindow.closes);
    const rho = computeRisk(sigmaOmega);
    const iri = mintIndicatorIri(asset, 'bollinger', now);
    const priceIris = mintPriceIris(asset, bbWindow.timestamps);
    if (price <= lower) {
      evidences.push(
        makeEvidence(
          'bollinger_bullish',
          confidenceBollingerBullish(price, lower, upper),
          rho,
          now,
          asset,
          BOLLINGER_SPEC,
          iri,
          priceIris,
          price,
          sigmaOmega,
        ),
      );
    } else if (price >= upper) {
      evidences.push(
        makeEvidence(
          'bollinger_bearish',
          confidenceBollingerBearish(price, lower, upper),
          rho,
          now,
          asset,
          BOLLINGER_SPEC,
          iri,
          priceIris,
          price,
          sigmaOmega,
        ),
      );
    }
  }

  return evidences;
}
