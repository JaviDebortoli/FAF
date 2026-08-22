import { beforeEach, describe, expect, it } from 'vitest';
import * as cache from '@/src/cycle/latest';
import type { Decision, DecisionReport, Market } from '@/src/domain/types';

// semantic-ingestion spec "Market-keyed presentation cache" (ADDED
// requirement): src/cycle/latest.ts moves from a single global CacheEntry
// to a Map<Market, CacheEntry> (design.md D-B) so a POST /api/cycle push
// for one market can never overwrite, clear, or otherwise affect another
// market's cached entry — the cross-market overwrite hazard the pre-change
// single-entry cache had by construction.

const T1 = 1_700_000_000_000;

function makeDecision(market: Market, asset: string): Decision {
  return {
    asset,
    market,
    t: T1,
    recommendation: 'NO_RECOMMENDATION',
    reason: 'NO_EVIDENCE',
    bullish: { thesis: 'bullish', supporters: [], aggregated: { gamma: 0, rho: 0 }, net: { gamma: 0, rho: 0 }, score: 0 },
    bearish: { thesis: 'bearish', supporters: [], aggregated: { gamma: 0, rho: 0 }, net: { gamma: 0, rho: 0 }, score: 0 },
    gap: 0,
    thresholds: { theta: 0.67, delta: 0.2 },
    trace: { candles: [], turtle: '', evidences: [] },
  };
}

function makeReport(market: Market, cycleId: string, decisions: Decision[] = []): DecisionReport {
  return { cycleId, market, computedAt: T1, decisions };
}

beforeEach(() => {
  cache.clear();
});

describe('market-keyed cache isolation (semantic-ingestion: Market-keyed presentation cache)', () => {
  it('an acciones push does not affect the crypto cache entry', () => {
    const cryptoReport = makeReport('crypto', 'cycle_crypto');
    cache.put('crypto', cryptoReport, 60_000, 0);

    const accionesReport = makeReport('acciones', 'cycle_acciones');
    cache.put('acciones', accionesReport, 60_000, 0);

    expect(cache.get('crypto', 0)).toEqual(cryptoReport);
    expect(cache.get('acciones', 0)).toEqual(accionesReport);
  });

  it('a crypto push does not affect the acciones cache entry', () => {
    const accionesReport = makeReport('acciones', 'cycle_acciones');
    cache.put('acciones', accionesReport, 60_000, 0);

    const cryptoReport = makeReport('crypto', 'cycle_crypto');
    cache.put('crypto', cryptoReport, 60_000, 0);

    expect(cache.get('acciones', 0)).toEqual(accionesReport);
    expect(cache.get('crypto', 0)).toEqual(cryptoReport);
  });

  it('each market cache entry expires independently of the other market TTL', () => {
    cache.put('crypto', makeReport('crypto', 'cycle_crypto'), 1_000, 0);
    cache.put('acciones', makeReport('acciones', 'cycle_acciones'), 60_000, 0);

    // crypto's shorter TTL has expired by atMs=1_000 (boundary exclusive, same
    // semantics as src/narrative/cache.ts); acciones has not.
    expect(cache.get('crypto', 1_000)).toBeNull();
    expect(cache.get('acciones', 1_000)?.cycleId).toBe('cycle_acciones');
  });

  it('getForAsset(market, asset) reads only its own market — a symbol present in both markets never crosses over', () => {
    const cryptoDecision = makeDecision('crypto', 'AAPL');
    const accionesDecision = makeDecision('acciones', 'AAPL');
    cache.put('crypto', makeReport('crypto', 'cycle_crypto', [cryptoDecision]), 60_000, 0);
    cache.put('acciones', makeReport('acciones', 'cycle_acciones', [accionesDecision]), 60_000, 0);

    expect(cache.getForAsset('crypto', 'AAPL', 0)).toEqual(cryptoDecision);
    expect(cache.getForAsset('acciones', 'AAPL', 0)).toEqual(accionesDecision);
  });

  it('getForAsset(market, asset) is a miss when the asset only exists under the other market', () => {
    cache.put('crypto', makeReport('crypto', 'cycle_crypto', [makeDecision('crypto', 'BTCUSDT')]), 60_000, 0);

    expect(cache.getForAsset('acciones', 'BTCUSDT', 0)).toBeNull();
  });

  it('clear() clears the whole map — both markets miss afterward', () => {
    cache.put('crypto', makeReport('crypto', 'cycle_crypto'), 60_000, 0);
    cache.put('acciones', makeReport('acciones', 'cycle_acciones'), 60_000, 0);

    cache.clear();

    expect(cache.get('crypto', 0)).toBeNull();
    expect(cache.get('acciones', 0)).toBeNull();
  });
});
