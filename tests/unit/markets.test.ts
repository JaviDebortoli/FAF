import { describe, expect, it } from 'vitest';
import { MARKET_GROUPS, MARKETS } from '@/app/(dashboard)/lib/markets';

/**
 * `market-nav-redesign` Phase 1 (PR1), task 1.1 — asserts `lib/markets.ts`'s
 * grouping data matches the corrected `specs/market-navigation/spec.md`
 * exactly: "MERCADOS PRINCIPALES" (7 items, NO CEDEARs) then "MERCADO
 * ARGENTINO" (3 items, CEDEARs first) — this is the ground truth the
 * orchestrator corrected on-disk after the original spec.md transcription
 * artifact (2-item Argentino group missing CEDEARs) was flagged in design.md.
 */

describe('MARKET_GROUPS shape and order', () => {
  it('lists MERCADOS PRINCIPALES with exactly the 7 spec-mandated slugs, in order', () => {
    const principales = MARKET_GROUPS.find((group) => group.label === 'MERCADOS PRINCIPALES');
    expect(principales?.slugs).toEqual(['acciones', 'crypto', 'renta-fija', 'forex', 'commodities', 'indices', 'etfs']);
  });

  it('lists MERCADO ARGENTINO with exactly the 3 spec-mandated slugs, CEDEARs first, in order', () => {
    const argentino = MARKET_GROUPS.find((group) => group.label === 'MERCADO ARGENTINO');
    expect(argentino?.slugs).toEqual(['cedears', 'dolar', 'plazo-fijo']);
  });

  it('lists the two groups themselves in MERCADOS PRINCIPALES, MERCADO ARGENTINO order', () => {
    expect(MARKET_GROUPS.map((group) => group.label)).toEqual(['MERCADOS PRINCIPALES', 'MERCADO ARGENTINO']);
  });
});

describe('MARKETS lookup table', () => {
  it('has an entry in MARKETS for every slug referenced by MARKET_GROUPS', () => {
    const allSlugs = MARKET_GROUPS.flatMap((group) => group.slugs);
    for (const slug of allSlugs) {
      expect(MARKETS[slug], `MARKETS is missing an entry for slug "${slug}"`).toBeDefined();
    }
  });

  it('has no duplicate slugs across both groups', () => {
    const allSlugs = MARKET_GROUPS.flatMap((group) => group.slugs);
    expect(new Set(allSlugs).size).toBe(allSlugs.length);
  });

  it('marks crypto as the only real market, present with slug "crypto"', () => {
    expect(MARKETS.crypto).toBeDefined();
    expect(MARKETS.crypto?.slug).toBe('crypto');
    expect(MARKETS.crypto?.isReal).toBe(true);

    const otherSlugs = Object.keys(MARKETS).filter((slug) => slug !== 'crypto');
    expect(otherSlugs.length).toBeGreaterThan(0);
    for (const slug of otherSlugs) {
      expect(MARKETS[slug]?.isReal, `MARKETS.${slug}.isReal must be false`).toBe(false);
    }
  });
});
