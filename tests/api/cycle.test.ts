import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Threat matrix (design.md): T-1 untrusted inbound payload (schema + format
// validation via isWellFormedAsset, no enumerated list), T-2 shared-secret
// auth on the public inbound endpoint. Both RED tests below assert
// 400/401/403 WITHOUT `runCycle` ever being invoked.

const runCycleMock = vi.fn((..._args: unknown[]) => ({
  cycleId: 'cycle_test',
  computedAt: 0,
  decisions: [],
}));
vi.mock('@/src/cycle/runCycle', () => ({
  runCycle: (...args: unknown[]) => runCycleMock(...args),
}));

const SHARED_SECRET_HEADER = 'x-faf-shared-secret';
const SECRET = 'test-shared-secret';

function makeRequest(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request('http://localhost/api/cycle', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.stubEnv('FAF_CYCLE_SHARED_SECRET', SECRET);
  runCycleMock.mockClear();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('POST /api/cycle — T-1 payload validation', () => {
  it('rejects malformed (non-JSON) payloads with 400 and never calls runCycle', async () => {
    const { POST } = await import('@/app/api/cycle/route');
    const request = new Request('http://localhost/api/cycle', {
      method: 'POST',
      headers: { 'content-type': 'application/json', [SHARED_SECRET_HEADER]: SECRET },
      body: '{not valid json',
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
    expect(runCycleMock).not.toHaveBeenCalled();
  });

  it('rejects oversized payloads (too many klines for one asset) with 400 and never calls runCycle', async () => {
    const { POST } = await import('@/app/api/cycle/route');
    const hugeKlines = Array.from({ length: 5000 }, (_, i) => ({
      openTime: i,
      open: 1,
      high: 1,
      low: 1,
      close: 1,
      volume: 1,
    }));
    const request = makeRequest(
      { assets: [{ symbol: 'BTCUSDT', klines: hugeKlines }] },
      { [SHARED_SECRET_HEADER]: SECRET },
    );

    const response = await POST(request);

    expect(response.status).toBe(400);
    expect(runCycleMock).not.toHaveBeenCalled();
  });

  it('rejects a malformed symbol (eth-usdt) with 400 and never calls runCycle', async () => {
    const { POST } = await import('@/app/api/cycle/route');
    const request = makeRequest(
      { assets: [{ symbol: 'eth-usdt', klines: [] }] },
      { [SHARED_SECRET_HEADER]: SECRET },
    );

    const response = await POST(request);

    expect(response.status).toBe(400);
    expect(runCycleMock).not.toHaveBeenCalled();
  });

  it('rejects malformed candle entries within klines with 400 and never calls runCycle', async () => {
    const { POST } = await import('@/app/api/cycle/route');
    const request = makeRequest(
      { assets: [{ symbol: 'BTCUSDT', klines: [{ openTime: 'not-a-number' }] }] },
      { [SHARED_SECRET_HEADER]: SECRET },
    );

    const response = await POST(request);

    expect(response.status).toBe(400);
    expect(runCycleMock).not.toHaveBeenCalled();
  });

  it('rejects a payload where "assets" is not an array with 400', async () => {
    const { POST } = await import('@/app/api/cycle/route');
    const request = makeRequest({ assets: 'BTCUSDT' }, { [SHARED_SECRET_HEADER]: SECRET });

    const response = await POST(request);

    expect(response.status).toBe(400);
    expect(runCycleMock).not.toHaveBeenCalled();
  });
});

describe('POST /api/cycle — T-2 shared-secret auth', () => {
  it('rejects a request with no shared-secret header with 401 and never calls runCycle', async () => {
    const { POST } = await import('@/app/api/cycle/route');
    const request = makeRequest({ assets: [{ symbol: 'BTCUSDT', klines: [] }] });

    const response = await POST(request);

    expect(response.status).toBe(401);
    expect(runCycleMock).not.toHaveBeenCalled();
  });

  it('rejects a request with a wrong shared-secret header with 403 and never calls runCycle', async () => {
    const { POST } = await import('@/app/api/cycle/route');
    const request = makeRequest(
      { assets: [{ symbol: 'BTCUSDT', klines: [] }] },
      { [SHARED_SECRET_HEADER]: 'wrong-secret' },
    );

    const response = await POST(request);

    expect(response.status).toBe(403);
    expect(runCycleMock).not.toHaveBeenCalled();
  });
});

describe('POST /api/cycle — happy paths', () => {
  it('accepts a valid pushed-klines payload, calls runCycle once, and returns 200 with the report', async () => {
    const { POST } = await import('@/app/api/cycle/route');
    const request = makeRequest(
      { assets: [{ symbol: 'BTCUSDT', klines: [] }] },
      { [SHARED_SECRET_HEADER]: SECRET },
    );

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(runCycleMock).toHaveBeenCalledTimes(1);
    expect(body.cycleId).toBe('cycle_test');
  });

  it('accepts a well-formed, previously-unseen symbol (ADAUSDT) and calls runCycle once — no enumerated list gates it', async () => {
    const { POST } = await import('@/app/api/cycle/route');
    const request = makeRequest(
      { assets: [{ symbol: 'ADAUSDT', klines: [] }] },
      { [SHARED_SECRET_HEADER]: SECRET },
    );

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(runCycleMock).toHaveBeenCalledTimes(1);
  });

  it('accepts a payload with exactly MAX_ASSETS (25) well-formed symbols', async () => {
    const { POST, MAX_ASSETS } = await import('@/app/api/cycle/route');
    const assets = Array.from({ length: MAX_ASSETS }, (_, i) => ({
      symbol: `ASSET${i}USDT`,
      klines: [],
    }));
    const request = makeRequest({ assets }, { [SHARED_SECRET_HEADER]: SECRET });

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(runCycleMock).toHaveBeenCalledTimes(1);
  });

  it('rejects a payload with MAX_ASSETS + 1 (26) well-formed symbols with 400 and never calls runCycle', async () => {
    const { POST, MAX_ASSETS } = await import('@/app/api/cycle/route');
    const assets = Array.from({ length: MAX_ASSETS + 1 }, (_, i) => ({
      symbol: `ASSET${i}USDT`,
      klines: [],
    }));
    const request = makeRequest({ assets }, { [SHARED_SECRET_HEADER]: SECRET });

    const response = await POST(request);

    expect(response.status).toBe(400);
    expect(runCycleMock).not.toHaveBeenCalled();
  });

  it('rejects an empty body with 400, never calls runCycle, never calls fetch (push-only ingestion)', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const { POST } = await import('@/app/api/cycle/route');
    const request = new Request('http://localhost/api/cycle', {
      method: 'POST',
      headers: { [SHARED_SECRET_HEADER]: SECRET },
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
    expect(runCycleMock).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
