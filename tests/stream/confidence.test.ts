import { describe, expect, it } from 'vitest';
import {
  confidenceRsiBullish,
  confidenceRsiBearish,
  confidenceMacdBullish,
  confidenceMacdBearish,
  confidenceSmaBullish,
  confidenceSmaBearish,
  confidenceBollingerBullish,
  confidenceBollingerBearish,
} from '@/src/stream/confidence';

// FAF paper Cuadro 2, §3.3 p.7-8 — gamma confidence formulas, one per
// evidence predicate. Direct paper worked-example assertions plus
// clamp-at-1 and divide-by-zero guard cases.

describe('confidenceRsiBullish/Bearish ((30-RSI)/30, (RSI-70)/30)', () => {
  it('RSI=15 -> gamma=0.50 (paper §3.3 worked example)', () => {
    expect(confidenceRsiBullish(15)).toBeCloseTo(0.5, 9);
  });

  it('RSI=5 -> gamma=0.83 (more extreme oversold -> higher confidence)', () => {
    expect(confidenceRsiBullish(5)).toBeCloseTo(25 / 30, 9);
  });

  it('RSI=85 -> gamma=0.50 for rsi_bearish (mirror of the bullish worked example)', () => {
    expect(confidenceRsiBearish(85)).toBeCloseTo(0.5, 9);
  });
});

describe('confidenceMacdBullish/Bearish (min(H/sigmaH,1), min(|H|/sigmaH,1))', () => {
  it('reuses the hand-derived MACD fixture: H=5/7, sigmaH=6/7 -> gamma=5/6', () => {
    expect(confidenceMacdBullish(5 / 7, 6 / 7)).toBeCloseTo(5 / 6, 9);
  });

  it('clamps at 1 when the histogram exceeds sigmaH', () => {
    expect(confidenceMacdBullish(10, 2)).toBe(1);
  });

  it('uses the absolute value of a negative histogram for macd_bearish', () => {
    expect(confidenceMacdBearish(-1, 2)).toBeCloseTo(0.5, 9);
  });

  it('returns 0 without dividing by zero when sigmaH=0 (guard)', () => {
    expect(confidenceMacdBullish(5, 0)).toBe(0);
    expect(confidenceMacdBearish(-5, 0)).toBe(0);
  });
});

describe('confidenceSmaBullish/Bearish (min((SMA20-SMA50)/SMA50,1), mirror)', () => {
  it('SMA20=110, SMA50=100 -> gamma=0.10', () => {
    expect(confidenceSmaBullish(110, 100)).toBeCloseTo(0.1, 9);
  });

  it('clamps at 1 when the SMA20/SMA50 gap exceeds SMA50', () => {
    expect(confidenceSmaBullish(250, 100)).toBe(1);
  });

  it('mirrors for sma_bearish: SMA20=90, SMA50=100 -> gamma=0.10', () => {
    expect(confidenceSmaBearish(90, 100)).toBeCloseTo(0.1, 9);
  });

  it('returns 0 without dividing by zero when SMA50=0 (guard)', () => {
    expect(confidenceSmaBullish(10, 0)).toBe(0);
    expect(confidenceSmaBearish(10, 0)).toBe(0);
  });
});

describe('confidenceBollingerBullish/Bearish (min((Linf-P)/(Lsup-Linf),1), mirror)', () => {
  it('P=85 below Linf=90 (Lsup=110) -> gamma=0.25', () => {
    expect(confidenceBollingerBullish(85, 90, 110)).toBeCloseTo(0.25, 9);
  });

  it('clamps at 1 when the price is far below the lower band', () => {
    expect(confidenceBollingerBullish(50, 90, 110)).toBe(1);
  });

  it('mirrors for bollinger_bearish: P=115 above Lsup=110 (Linf=90) -> gamma=0.25', () => {
    expect(confidenceBollingerBearish(115, 90, 110)).toBeCloseTo(0.25, 9);
  });

  it('returns 0 without dividing by zero when Lsup=Linf (guard, zero-volatility bands)', () => {
    expect(confidenceBollingerBullish(50, 50, 50)).toBe(0);
    expect(confidenceBollingerBearish(50, 50, 50)).toBe(0);
  });
});
