import { test, expect } from '@playwright/test';
import type { DecisionReport } from '../../src/domain/types';

/**
 * Task 7.2 — dashboard smoke test (design.md Testing Strategy). Runs fully
 * offline against a fixture-backed decision: this `DecisionReport` mirrors
 * Golden #1's asserted output (tests/golden/paper-example.test.ts, over
 * tests/fixtures/paper-example/candles.json) — BTCUSDT, net bullish
 * <gamma=0.50, rho=0>, net bearish <gamma=0, rho=0.05>, gap=0.275 -> BUY.
 *
 * Rather than seeding via a live POST /api/cycle round-trip (which relies on
 * the dev server sharing the `src/cycle/latest.ts` in-memory cache module
 * instance across the `/api/cycle` and `/api/decisions` route bundles — not
 * guaranteed under Next.js's dev-mode per-route compilation, and observed to
 * fall through to a live Binance pull in this environment), this test stubs
 * the dashboard's read path (`GET /api/decisions`) directly with
 * `page.route`. This is the "stub GET /api/decisions" alternative named in
 * task 7.2 — simplest and most reliable given the cache is documented
 * (src/cycle/latest.ts, design.md D-B) as presentation-latency-only and
 * never load-bearing for correctness.
 */
const FIXTURE_REPORT: DecisionReport = {
  cycleId: 'cycle_e2e_smoke_fixture',
  computedAt: 1700176400000,
  decisions: [
    {
      asset: 'BTCUSDT',
      t: 1700176400000,
      recommendation: 'BUY',
      bullish: {
        thesis: 'bullish',
        supporters: [],
        aggregated: { gamma: 0.5, rho: 0 },
        net: { gamma: 0.5, rho: 0 },
        score: 0.75,
      },
      bearish: {
        thesis: 'bearish',
        supporters: [],
        aggregated: { gamma: 0, rho: 0.05 },
        net: { gamma: 0, rho: 0.05 },
        score: 0.475,
      },
      gap: 0.275,
      thresholds: { theta: 0.67, delta: 0.2 },
      trace: { candles: [], turtle: '', evidences: [] },
    },
  ],
};

test.describe('Dashboard smoke test', () => {
  test('renders the BTCUSDT BUY decision from a fixture-backed cycle', async ({ page }) => {
    await page.route('**/api/decisions', async (route) => {
      await route.fulfill({ json: FIXTURE_REPORT });
    });

    await page.goto('/');

    const row = page.locator('tbody tr', { hasText: 'BTCUSDT' });
    await expect(row).toBeVisible();
    await expect(row).toContainText('BUY');
  });
});

/**
 * Two-asset fixture for the asset-filter and argument-trace tests below.
 * BTCUSDT reuses Golden #1's exact numbers (as above); ETHUSDT is a distinct
 * SELL decision with one real bearish evidence (R6 macd_bearish) so the
 * argument-trace detail view has concrete, asset-specific content to assert
 * on.
 */
const BTCUSDT_DECISION = FIXTURE_REPORT.decisions.find((d) => d.asset === 'BTCUSDT')!;

const MULTI_ASSET_REPORT: DecisionReport = {
  cycleId: 'cycle_e2e_multi_asset_fixture',
  computedAt: 1700176400000,
  decisions: [
    BTCUSDT_DECISION,
    {
      asset: 'ETHUSDT',
      t: 1700176400000,
      recommendation: 'SELL',
      bullish: {
        thesis: 'bullish',
        supporters: [],
        aggregated: { gamma: 0, rho: 0 },
        net: { gamma: 0, rho: 0 },
        score: 0.5,
      },
      bearish: {
        thesis: 'bearish',
        supporters: [],
        aggregated: { gamma: 0.8, rho: 0.1 },
        net: { gamma: 0.8, rho: 0.1 },
        score: 0.85,
      },
      gap: 0.35,
      thresholds: { theta: 0.67, delta: 0.2 },
      trace: {
        candles: [],
        turtle: '',
        evidences: [
          {
            predicate: 'macd_bearish',
            label: { gamma: 0.8, rho: 0.1 },
            t: 1700176400000,
            asset: 'ETHUSDT',
            window: { indicator: 'MACD', omega: 50, beta: 1 },
            provenance: {
              indicatorEventIri: 'faf:event_ETHUSDT_macdHistogram_1700176400000',
              priceEventIris: ['faf:event_ETHUSDT_price_1700176400000'],
              rawValue: -12.5,
              sigmaOmega: 0.01,
            },
          },
        ],
      },
    },
  ],
};

test.describe('Dashboard asset filter and argument trace', () => {
  test('filters by asset and renders the selected decision trace', async ({ page }) => {
    await page.route('**/api/decisions', async (route) => {
      await route.fulfill({ json: MULTI_ASSET_REPORT });
    });

    await page.goto('/');

    // Default filter ("All assets") shows both rows.
    const btcRow = page.locator('tbody tr', { hasText: 'BTCUSDT' });
    const ethRow = page.locator('tbody tr', { hasText: 'ETHUSDT' });
    await expect(btcRow).toBeVisible();
    await expect(ethRow).toBeVisible();

    // Filtering to ETHUSDT hides the BTCUSDT row and keeps only ETHUSDT's.
    await page.getByLabel('Asset filter').selectOption('ETHUSDT');
    await expect(ethRow).toBeVisible();
    await expect(btcRow).not.toBeVisible();
    await expect(ethRow).toContainText('SELL');

    // Clicking "View trace" on the remaining row renders the argument-trace
    // detail table with content matching ETHUSDT's specific decision.
    await ethRow.getByRole('button', { name: 'View trace' }).click();

    const traceTable = page.locator('table', { hasText: 'Argument trace' });
    await expect(traceTable).toBeVisible();
    await expect(traceTable).toContainText('macd_bearish');
    await expect(traceTable).toContainText('R6');
    await expect(traceTable).toContainText('bearish');
  });
});
