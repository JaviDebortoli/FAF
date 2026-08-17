import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as cache from '@/src/cycle/latest';

// D7 clause 4 (design.md, proposal.md Deviation D7): "Narrative absence
// never changes a decision: GET /api/decisions output is byte-identical
// with and without ANTHROPIC_API_KEY." app/api/decisions/route.ts is
// unmodified by this change and never reads ANTHROPIC_API_KEY at all, so
// this is a regression guard proving that invariant holds by construction,
// not merely by convention.

function klinesResponse(): Response {
  const klines = Array.from({ length: 60 }, (_, i) => [
    1_700_000_000_000 + i * 3_600_000, // openTime
    100 + i, // open
    100 + i, // high
    100 + i, // low
    100 + i, // close
    1000, // volume
  ]);
  return new Response(JSON.stringify(klines), { status: 200 });
}

beforeEach(() => {
  cache.clear();
  delete process.env.ANTHROPIC_API_KEY;
  vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(klinesResponse())));
});

afterEach(() => {
  cache.clear();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  delete process.env.ANTHROPIC_API_KEY;
});

describe('GET /api/decisions — D7 clause 4 invariance', () => {
  it('produces byte-identical output whether or not ANTHROPIC_API_KEY is set in the environment', async () => {
    const { GET } = await import('@/app/api/decisions/route');

    delete process.env.ANTHROPIC_API_KEY;
    cache.clear();
    const withoutKeyResponse = await GET();
    const withoutKeyBody = await withoutKeyResponse.text();

    process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';
    cache.clear();
    const withKeyResponse = await GET();
    const withKeyBody = await withKeyResponse.text();

    expect(withoutKeyResponse.status).toBe(withKeyResponse.status);
    expect(withKeyBody).toBe(withoutKeyBody);
  });

  it('produces byte-identical output on a cache-hit path too, regardless of ANTHROPIC_API_KEY', async () => {
    const { runCycle } = await import('@/src/cycle/runCycle');
    const { pullAllAssets } = await import('@/src/cycle/pullAssets');
    const { GET } = await import('@/app/api/decisions/route');

    const assets = await pullAllAssets();
    const primed = runCycle(assets);

    delete process.env.ANTHROPIC_API_KEY;
    cache.clear();
    cache.put(primed, 60_000);
    const withoutKeyBody = await (await GET()).text();

    process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';
    cache.clear();
    cache.put(primed, 60_000);
    const withKeyBody = await (await GET()).text();

    expect(withKeyBody).toBe(withoutKeyBody);
  });
});
