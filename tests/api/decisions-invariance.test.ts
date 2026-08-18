import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as cache from '@/src/cycle/latest';
import { buildReport, seedCycleCache } from '../helpers/seedCycleCache';

// D7 clause 4 (design.md, proposal.md Deviation D7): "Narrative absence
// never changes a decision: GET /api/decisions output is byte-identical
// with and without ANTHROPIC_API_KEY." app/api/decisions/route.ts never
// reads ANTHROPIC_API_KEY at all, so this is a regression guard proving
// that invariant holds by construction, not merely by convention. Checked
// on both the 200 (cache hit / has-data) and 503 (cache miss / no-data)
// paths, since push-only ingestion (dynamic-asset-count) makes 503 a real,
// reachable steady state, not just a startup transient.

beforeEach(() => {
  cache.clear();
  delete process.env.ANTHROPIC_API_KEY;
});

afterEach(() => {
  cache.clear();
  vi.unstubAllEnvs();
  delete process.env.ANTHROPIC_API_KEY;
});

describe('GET /api/decisions — D7 clause 4 invariance', () => {
  it('cache-miss (503) path is byte-identical whether or not ANTHROPIC_API_KEY is set', async () => {
    const { GET } = await import('@/app/api/decisions/route');

    delete process.env.ANTHROPIC_API_KEY;
    cache.clear();
    const withoutKeyResponse = await GET();
    const withoutKeyBody = await withoutKeyResponse.text();

    process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';
    cache.clear();
    const withKeyResponse = await GET();
    const withKeyBody = await withKeyResponse.text();

    expect(withoutKeyResponse.status).toBe(503);
    expect(withKeyResponse.status).toBe(503);
    expect(withKeyBody).toBe(withoutKeyBody);
  });

  it('cache-hit (200) path is byte-identical whether or not ANTHROPIC_API_KEY is set', async () => {
    const { GET } = await import('@/app/api/decisions/route');
    const report = buildReport();

    delete process.env.ANTHROPIC_API_KEY;
    cache.clear();
    seedCycleCache(report);
    const withoutKeyBody = await (await GET()).text();

    process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';
    cache.clear();
    seedCycleCache(report);
    const withKeyBody = await (await GET()).text();

    expect(withKeyBody).toBe(withoutKeyBody);
  });
});
