import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeRedis } from '@/tests/helpers/fakeRedis';
import * as cache from '@/src/cycle/latest';
import { buildReport, seedCycleCache } from '../helpers/seedCycleCache';

// presentation-cache-persistence design.md's "Test double" decision: mock
// the low-level Redis client, not the module under test.
vi.mock('@/src/lib/redis', () => ({ getRedis: () => fakeRedis }));

// D7 clause 4 (design.md, proposal.md Deviation D7): "Narrative absence
// never changes a decision: GET /api/decisions output is byte-identical
// with and without ANTHROPIC_API_KEY." app/api/decisions/route.ts never
// reads ANTHROPIC_API_KEY at all, so this is a regression guard proving
// that invariant holds by construction, not merely by convention. Checked
// on both the 200 (cache hit / has-data) and 503 (cache miss / no-data)
// paths, since push-only ingestion (dynamic-asset-count) makes 503 a real,
// reachable steady state, not just a startup transient.

beforeEach(async () => {
  fakeRedis.__reset();
  await cache.clear();
  delete process.env.ANTHROPIC_API_KEY;
});

afterEach(async () => {
  await cache.clear();
  vi.unstubAllEnvs();
  delete process.env.ANTHROPIC_API_KEY;
});

function makeGetRequest(market = 'crypto'): Request {
  return new Request(`http://x/api/decisions?market=${market}`);
}

describe('GET /api/decisions — D7 clause 4 invariance', () => {
  it('cache-miss (503) path is byte-identical whether or not ANTHROPIC_API_KEY is set', async () => {
    const { GET } = await import('@/app/api/decisions/route');

    delete process.env.ANTHROPIC_API_KEY;
    await cache.clear();
    const withoutKeyResponse = await GET(makeGetRequest());
    const withoutKeyBody = await withoutKeyResponse.text();

    process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';
    await cache.clear();
    const withKeyResponse = await GET(makeGetRequest());
    const withKeyBody = await withKeyResponse.text();

    expect(withoutKeyResponse.status).toBe(503);
    expect(withKeyResponse.status).toBe(503);
    expect(withKeyBody).toBe(withoutKeyBody);
  });

  it('cache-hit (200) path is byte-identical whether or not ANTHROPIC_API_KEY is set', async () => {
    const { GET } = await import('@/app/api/decisions/route');
    const report = buildReport();

    delete process.env.ANTHROPIC_API_KEY;
    await cache.clear();
    await seedCycleCache(report, 'crypto');
    const withoutKeyBody = await (await GET(makeGetRequest())).text();

    process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';
    await cache.clear();
    await seedCycleCache(report, 'crypto');
    const withKeyBody = await (await GET(makeGetRequest())).text();

    expect(withKeyBody).toBe(withoutKeyBody);
  });
});
