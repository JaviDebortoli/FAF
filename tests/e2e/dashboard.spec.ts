import { test, expect } from '@playwright/test';
import type { Candle, Decision, DecisionReport, Evidence } from '../../src/domain/types';

/**
 * Phase 6 (PR4, tasks 6.1-6.9) — full rewrite of the dashboard e2e suite for
 * the two-tier explainable decision dashboard (dashboard-ux change). Replaces
 * the PR7 (`faf-platform`) table-based smoke test entirely: the `<table>`,
 * `getByLabel('Asset filter')`, and `'View trace'`/`'Argument trace'`
 * surfaces it exercised were deleted in PR1b (`DecisionTable`, `AssetFilter`,
 * `ArgumentTrace` components removed).
 *
 * Follows this repo's established e2e convention (kept from the prior
 * revision of this file, see git history): stub the dashboard's read path
 * (`GET /api/decisions`) directly via `page.route`, never a live
 * `POST /api/cycle` round-trip — the cycle cache module instance is not
 * guaranteed to be shared across route bundles under Next.js dev-mode
 * per-route compilation, and this keeps the whole run fully offline.
 * `GET /api/decisions/[asset]/narrative` is stubbed the same way per this
 * phase's explicit instruction — no test may depend on a real
 * `ANTHROPIC_API_KEY` or a real network call to Claude.
 */

// ---------------------------------------------------------------------------
// Fixture data
// ---------------------------------------------------------------------------

const T = 1700176400000;

function makeCandles(trend: 'up' | 'down' | 'flat'): Candle[] {
  const base = 100;
  return Array.from({ length: 6 }, (_, i) => {
    const delta = trend === 'up' ? i * 2 : trend === 'down' ? -i * 2 : 0;
    const close = base + delta;
    return {
      openTime: T - (6 - i) * 3_600_000,
      open: close - 1,
      high: close + 1,
      low: close - 2,
      close,
      volume: 1000,
    };
  });
}

function makeEvidence(
  predicate: Evidence['predicate'],
  asset: string,
  overrides?: Partial<Evidence['label']>,
): Evidence {
  const indicator = predicate.startsWith('rsi')
    ? 'RSI'
    : predicate.startsWith('macd')
      ? 'MACD'
      : predicate.startsWith('sma')
        ? 'SMA'
        : 'BOLLINGER';
  return {
    predicate,
    label: { gamma: 0.6, rho: 0.1, ...overrides },
    t: T,
    asset,
    window: { indicator, omega: 14, beta: 1 },
    provenance: {
      indicatorEventIri: `faf:event_${asset}_${predicate}_${T}`,
      priceEventIris: [`faf:event_${asset}_price_${T}`],
      rawValue: 42,
      sigmaOmega: 0.01,
    },
  };
}

/**
 * BTCUSDT BUY decision. Fires R1 (rsi_bullish), R2 (macd_bullish) — both
 * bullish — and R6 (macd_bearish) — one bearish counter-evidence — so the
 * 8-leaf graph partition (task 6.4) has a non-trivial fired/inactive split
 * across both theses: fired = {R1, R2, R6}, inactive = {R3, R4, R5, R7, R8}.
 * Net scores are hand-picked so sigma+ (0.85) clears theta (0.67) and
 * gap (0.4) clears delta (0.2), matching an actual BUY per L4's dominance
 * rule (design.md/policy.ts) — not load-bearing for any assertion below
 * (the route is fully stubbed), but keeps the fixture internally honest.
 */
const BTC_DECISION: Decision = {
  asset: 'BTCUSDT',
  t: T,
  recommendation: 'BUY',
  bullish: {
    thesis: 'bullish',
    supporters: [],
    aggregated: { gamma: 0.65, rho: 0.08 },
    net: { gamma: 0.75, rho: 0.05 },
    score: 0.85,
  },
  bearish: {
    thesis: 'bearish',
    supporters: [],
    aggregated: { gamma: 0.25, rho: 0.25 },
    net: { gamma: 0.2, rho: 0.3 },
    score: 0.45,
  },
  gap: 0.4,
  thresholds: { theta: 0.67, delta: 0.2 },
  trace: {
    candles: makeCandles('up'),
    turtle: '',
    evidences: [
      makeEvidence('rsi_bullish', 'BTCUSDT', { gamma: 0.6, rho: 0.05 }),
      makeEvidence('macd_bullish', 'BTCUSDT', { gamma: 0.7, rho: 0.1 }),
      makeEvidence('macd_bearish', 'BTCUSDT', { gamma: 0.3, rho: 0.2 }),
    ],
  },
};

/** ETHUSDT SELL decision. Fires only R7 (sma_bearish). */
const ETH_DECISION: Decision = {
  asset: 'ETHUSDT',
  t: T,
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
    candles: makeCandles('down'),
    turtle: '',
    evidences: [makeEvidence('sma_bearish', 'ETHUSDT', { gamma: 0.8, rho: 0.1 })],
  },
};

/** SOLUSDT NO_RECOMMENDATION decision — MUST produce no card anywhere. */
const SOL_NO_RECOMMENDATION: Decision = {
  asset: 'SOLUSDT',
  t: T,
  recommendation: 'NO_RECOMMENDATION',
  reason: 'NO_EVIDENCE',
  bullish: {
    thesis: 'bullish',
    supporters: [],
    aggregated: { gamma: 0, rho: 0 },
    net: { gamma: 0, rho: 0 },
    score: 0,
  },
  bearish: {
    thesis: 'bearish',
    supporters: [],
    aggregated: { gamma: 0, rho: 0 },
    net: { gamma: 0, rho: 0 },
    score: 0,
  },
  gap: 0,
  thresholds: { theta: 0.67, delta: 0.2 },
  trace: { candles: makeCandles('flat'), turtle: '', evidences: [] },
};

/** BTCUSDT + ETHUSDT + SOLUSDT — one BUY, one SELL, one inactive. */
const MULTI_ASSET_REPORT: DecisionReport = {
  cycleId: 'cycle_e2e_multi_asset',
  computedAt: T,
  decisions: [BTC_DECISION, ETH_DECISION, SOL_NO_RECOMMENDATION],
};

/** Every configured asset is NO_RECOMMENDATION this cycle. */
const ALL_NO_RECOMMENDATION_REPORT: DecisionReport = {
  cycleId: 'cycle_e2e_all_inactive',
  computedAt: T,
  decisions: [
    { ...SOL_NO_RECOMMENDATION, asset: 'BTCUSDT' },
    { ...SOL_NO_RECOMMENDATION, asset: 'ETHUSDT' },
  ],
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function stubDecisions(page: import('@playwright/test').Page, report: DecisionReport) {
  await page.route('**/api/decisions', async (route) => {
    await route.fulfill({ json: report });
  });
}

/** `dynamic-asset-count` PR3 — stubs the real cache-miss contract
 * (`app/api/decisions/route.ts`'s `503 { error, code: 'NO_DATA' }`) so the
 * dashboard's no-data state can be exercised without a live n8n push. */
async function stubDecisionsUnavailable(page: import('@playwright/test').Page) {
  await page.route('**/api/decisions', async (route) => {
    await route.fulfill({
      status: 503,
      json: { error: 'Service temporarily unavailable', code: 'NO_DATA' },
    });
  });
}

/** Success stub for `GET /api/decisions/[asset]/narrative` — matches the
 * real route's contract exactly (`NarrativePanel.tsx` reads
 * `response.body?.getReader()` on 200s): `text/plain` body, 200 status. The
 * browser always exposes a `ReadableStream` for `response.body` regardless
 * of whether Playwright delivered the body in one chunk. */
async function stubNarrativeSuccess(page: import('@playwright/test').Page, text: string) {
  await page.route('**/api/decisions/*/narrative', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'text/plain; charset=utf-8',
      headers: { 'x-faf-narrative-source': 'llm' },
      body: text,
    });
  });
}

/** Failure stub matching the real route's `jsonError()` shape exactly:
 * `Response.json({ error, code }, { status })` — `NarrativePanel.tsx` does
 * `response.json()` on non-2xx and reads `body.code`. */
async function stubNarrativeError(page: import('@playwright/test').Page, status: number, code: string) {
  await page.route('**/api/decisions/*/narrative', async (route) => {
    await route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'stubbed failure', code }),
    });
  });
}

const RULE_IDS = ['R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7', 'R8'] as const;

// ---------------------------------------------------------------------------
// Task 6.1 — card grid renders actionable assets only
// ---------------------------------------------------------------------------

test.describe('Tier 1 — card grid', () => {
  test('renders a card only for BUY/SELL assets, none for NO_RECOMMENDATION', async ({ page }) => {
    await stubDecisions(page, MULTI_ASSET_REPORT);
    // Safety net per the phase instruction: never let a stray drilldown open
    // during this test reach a real Claude call.
    await stubNarrativeError(page, 503, 'NARRATIVE_DISABLED');

    await page.goto('/');

    const btcCard = page.getByTestId('decision-card-BTCUSDT');
    const ethCard = page.getByTestId('decision-card-ETHUSDT');
    await expect(btcCard).toBeVisible();
    await expect(ethCard).toBeVisible();
    await expect(btcCard).toContainText('BUY');
    await expect(ethCard).toContainText('SELL');

    await expect(page.getByTestId('decision-card-SOLUSDT')).toHaveCount(0);
  });
});

// ---------------------------------------------------------------------------
// Task 6.2 — all-NO_RECOMMENDATION fixture -> explicit empty state
// ---------------------------------------------------------------------------

test.describe('Tier 1 — empty states', () => {
  test('shows an explicit empty state, not a blank page, when nothing is actionable', async ({ page }) => {
    await stubDecisions(page, ALL_NO_RECOMMENDATION_REPORT);
    await stubNarrativeError(page, 503, 'NARRATIVE_DISABLED');

    await page.goto('/');

    const empty = page.getByTestId('empty-state');
    await expect(empty).toBeVisible();
    await expect(empty).toHaveAttribute('data-variant', 'no-active');

    await expect(page.locator('[data-testid^="decision-card-"]')).toHaveCount(0);
  });
});

// ---------------------------------------------------------------------------
// `dynamic-asset-count` PR3 — no-data state (cache-miss, distinct from the
// selection-based EmptyState above; must never leak architecture terms)
// ---------------------------------------------------------------------------

test.describe('Tier 1 — no-data state', () => {
  test('renders the architecture-agnostic service-unavailable message on a 503 NO_DATA response', async ({
    page,
  }) => {
    await stubDecisionsUnavailable(page);

    await page.goto('/');

    const unavailable = page.getByTestId('service-unavailable');
    await expect(unavailable).toBeVisible();
    await expect(unavailable).toHaveAttribute('data-reason', 'no-data');

    // Distinct from the selection-emptiness EmptyState — must not both match.
    await expect(page.getByTestId('empty-state')).toHaveCount(0);

    // Binding UX requirement (proposal.md "Resolved: Cache-Miss / No-Data
    // UX"): the end user must never see architecture-level terms.
    const bodyText = await page.locator('body').innerText();
    expect(bodyText).not.toMatch(/n8n|cache|pull|cycle/i);
  });
});

// ---------------------------------------------------------------------------
// Task 6.3 — direction filter narrows visible cards
// ---------------------------------------------------------------------------

test.describe('Tier 1 — direction filter', () => {
  test('narrows visible cards to BUY or SELL only', async ({ page }) => {
    await stubDecisions(page, MULTI_ASSET_REPORT);
    await stubNarrativeError(page, 503, 'NARRATIVE_DISABLED');

    await page.goto('/');

    const btcCard = page.getByTestId('decision-card-BTCUSDT');
    const ethCard = page.getByTestId('decision-card-ETHUSDT');

    // ALL (default): both actionable cards visible.
    await expect(btcCard).toBeVisible();
    await expect(ethCard).toBeVisible();

    // BUY: only BTCUSDT remains.
    await page.getByTestId('direction-filter-BUY').click();
    await expect(btcCard).toBeVisible();
    await expect(ethCard).toHaveCount(0);

    // SELL: only ETHUSDT remains.
    await page.getByTestId('direction-filter-SELL').click();
    await expect(ethCard).toBeVisible();
    await expect(btcCard).toHaveCount(0);

    // Back to ALL: both visible again.
    await page.getByTestId('direction-filter-ALL').click();
    await expect(btcCard).toBeVisible();
    await expect(ethCard).toBeVisible();
  });

  test('shows the "filtered" empty state when a direction excludes every actionable card', async ({ page }) => {
    // Only a BUY asset is actionable this cycle.
    const buyOnlyReport: DecisionReport = {
      cycleId: 'cycle_e2e_buy_only',
      computedAt: T,
      decisions: [BTC_DECISION, SOL_NO_RECOMMENDATION],
    };
    await stubDecisions(page, buyOnlyReport);
    await stubNarrativeError(page, 503, 'NARRATIVE_DISABLED');

    await page.goto('/');
    await expect(page.getByTestId('decision-card-BTCUSDT')).toBeVisible();

    await page.getByTestId('direction-filter-SELL').click();

    const empty = page.getByTestId('empty-state');
    await expect(empty).toBeVisible();
    await expect(empty).toHaveAttribute('data-variant', 'filtered');
    await expect(page.getByTestId('decision-card-BTCUSDT')).toHaveCount(0);
  });
});

// ---------------------------------------------------------------------------
// Task 6.4 — drill-down renders the 8/2/1 graph matching the asset's trace
// ---------------------------------------------------------------------------

test.describe('Tier 2 — drill-down graph', () => {
  test('renders all 8 leaves with the correct fired/inactive partition for the asset', async ({ page }) => {
    await stubDecisions(page, MULTI_ASSET_REPORT);
    await stubNarrativeError(page, 503, 'NARRATIVE_DISABLED');

    await page.goto('/');
    await page.getByTestId('decision-card-BTCUSDT').click();

    const panel = page.getByTestId('drilldown-panel-BTCUSDT');
    await expect(panel).toBeVisible();

    // BTC fixture fires R1, R2, R6 — the rest are inactive.
    const expectedState: Record<(typeof RULE_IDS)[number], 'fired' | 'inactive'> = {
      R1: 'fired',
      R2: 'fired',
      R3: 'inactive',
      R4: 'inactive',
      R5: 'inactive',
      R6: 'fired',
      R7: 'inactive',
      R8: 'inactive',
    };

    for (const ruleId of RULE_IDS) {
      const node = panel.getByTestId(`graph-node-${ruleId}`);
      await expect(node).toBeVisible();
      await expect(node).toHaveAttribute('data-state', expectedState[ruleId]);
    }

    await expect(panel.getByTestId('thesis-scores')).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Task 6.5 — no narrative request fires until a drill-down is opened
// ---------------------------------------------------------------------------

test.describe('Tier 2 — lazy narrative fetch', () => {
  test('fires no narrative request before the drill-down opens, one after', async ({ page }) => {
    await stubDecisions(page, MULTI_ASSET_REPORT);

    let narrativeRequestCount = 0;
    await page.route('**/api/decisions/*/narrative', async (route) => {
      narrativeRequestCount += 1;
      await route.fulfill({
        status: 200,
        contentType: 'text/plain; charset=utf-8',
        body: 'Narrativa de prueba.',
      });
    });

    await page.goto('/');
    await expect(page.getByTestId('decision-card-BTCUSDT')).toBeVisible();

    // No drilldown opened yet — zero narrative requests.
    expect(narrativeRequestCount).toBe(0);

    await page.getByTestId('decision-card-BTCUSDT').click();
    await expect(page.getByTestId('drilldown-panel-BTCUSDT')).toBeVisible();

    // Opening the drilldown mounts NarrativePanel unconditionally, which
    // fetches immediately. Wait for the panel to settle, then assert at
    // least one request fired (React Strict Mode's dev-only double-invoked
    // effect may legitimately fire two — see NarrativePanel.tsx's
    // cancelledRef guard — so this asserts "at least one", not "exactly
    // one").
    await expect(page.getByTestId('narrative-panel')).toHaveAttribute('data-state', 'done');
    expect(narrativeRequestCount).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Task 6.6 — narrative disclaimer present whenever narrative text renders
// ---------------------------------------------------------------------------

test.describe('Tier 2 — narrative disclaimer', () => {
  test('shows the AI disclaimer alongside the rendered narrative text', async ({ page }) => {
    await stubDecisions(page, MULTI_ASSET_REPORT);
    await stubNarrativeSuccess(
      page,
      'BTCUSDT muestra un balance alcista: dos reglas de soporte compraron dominancia sobre una senal bajista aislada.',
    );

    await page.goto('/');
    await page.getByTestId('decision-card-BTCUSDT').click();

    const panel = page.getByTestId('narrative-panel');
    await expect(panel).toHaveAttribute('data-state', 'done');

    await expect(panel.getByTestId('narrative-text')).toBeVisible();
    await expect(panel.getByTestId('narrative-text')).toContainText('BTCUSDT muestra un balance alcista');

    const disclaimer = panel.getByTestId('narrative-ai-disclaimer');
    await expect(disclaimer).toBeVisible();
    await expect(disclaimer).toContainText('Generado por IA');
  });
});

// ---------------------------------------------------------------------------
// Task 6.7 — narrative failure degrades gracefully, graph/scores unaffected
// ---------------------------------------------------------------------------

test.describe('Tier 2 — graceful degradation', () => {
  test('503 NARRATIVE_DISABLED still renders graph + scores; narrative shows unavailable', async ({ page }) => {
    await stubDecisions(page, MULTI_ASSET_REPORT);
    await stubNarrativeError(page, 503, 'NARRATIVE_DISABLED');

    await page.goto('/');
    await page.getByTestId('decision-card-BTCUSDT').click();

    const panel = page.getByTestId('drilldown-panel-BTCUSDT');
    await expect(panel).toBeVisible();

    // Graph and scores remain fully functional.
    await expect(panel.getByTestId('graph-node-R1')).toHaveAttribute('data-state', 'fired');
    await expect(panel.getByTestId('graph-node-R3')).toHaveAttribute('data-state', 'inactive');
    await expect(panel.getByTestId('thesis-scores')).toBeVisible();

    // Narrative section shows the "no disponible" unavailable state.
    const narrative = page.getByTestId('narrative-panel');
    await expect(narrative).toHaveAttribute('data-state', 'unavailable');
    const unavailable = narrative.getByTestId('narrative-unavailable');
    await expect(unavailable).toBeVisible();
    await expect(unavailable).toContainText('no está disponible');
  });

  test('502 UPSTREAM_ERROR still renders graph + scores; narrative shows failed with retry', async ({ page }) => {
    await stubDecisions(page, MULTI_ASSET_REPORT);
    await stubNarrativeError(page, 502, 'UPSTREAM_ERROR');

    await page.goto('/');
    await page.getByTestId('decision-card-BTCUSDT').click();

    const panel = page.getByTestId('drilldown-panel-BTCUSDT');
    await expect(panel.getByTestId('graph-node-R2')).toHaveAttribute('data-state', 'fired');
    await expect(panel.getByTestId('thesis-scores')).toBeVisible();

    const narrative = page.getByTestId('narrative-panel');
    await expect(narrative).toHaveAttribute('data-state', 'failed');
    await expect(narrative.getByTestId('narrative-failed')).toBeVisible();
    await expect(narrative.getByRole('button', { name: 'Reintentar' })).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Task 6.8 — no narrative/graph testid anywhere in Tier 1 before a click
// ---------------------------------------------------------------------------

test.describe('Tier 1/2 boundary', () => {
  test('Tier 1 contains zero graph or narrative surfaces before any drill-down opens', async ({ page }) => {
    await stubDecisions(page, MULTI_ASSET_REPORT);
    await stubNarrativeError(page, 503, 'NARRATIVE_DISABLED');

    await page.goto('/');
    await expect(page.getByTestId('decision-card-BTCUSDT')).toBeVisible();

    await expect(page.locator('[data-testid^="graph-node-"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="narrative-panel"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="narrative-ai-disclaimer"]')).toHaveCount(0);
    await expect(page.locator('[data-testid^="drilldown-panel-"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="thesis-scores"]')).toHaveCount(0);

    // Opening and closing a drill-down must not leak these surfaces back
    // into the Tier 1 view once closed (decision-dashboard spec: "Tier 2
    // exemption is scoped, not global").
    await page.getByTestId('decision-card-BTCUSDT').click();
    await expect(page.locator('[data-testid^="graph-node-"]')).not.toHaveCount(0);

    await page.getByRole('button', { name: 'Cerrar detalle' }).click();
    await expect(page.locator('[data-testid^="graph-node-"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="narrative-panel"]')).toHaveCount(0);
  });
});
