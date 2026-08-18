import { test, expect, type Page } from '@playwright/test';
import type { DecisionReport } from '../../src/domain/types';

/**
 * `market-nav-redesign` — new e2e suite for the multi-market navigation
 * shell. Phase 2/PR2 contributes the desktop sidebar/a11y/no-CDN scenarios
 * below; Phase 3/PR3 adds placeholder-route scenarios and Phase 4/PR4 adds
 * mobile drawer scenarios to this same file (see `tasks.md`).
 *
 * Follows `tests/e2e/dashboard.spec.ts`'s established convention: stub
 * `GET /api/decisions` via `page.route` so the whole run stays fully
 * offline. The sidebar itself does not depend on decision data, so an empty
 * report is enough to exercise `/dashboard/crypto` without hitting the
 * empty/no-data code paths' visual noise.
 */

const T = 1700176400000;

const EMPTY_REPORT: DecisionReport = {
  cycleId: 'cycle_e2e_market_nav',
  computedAt: T,
  decisions: [],
};

async function stubDecisions(page: Page, report: DecisionReport) {
  await page.route('**/api/decisions', async (route) => {
    await route.fulfill({ json: report });
  });
}

async function stubNarrativeError(page: Page, status: number, code: string) {
  await page.route('**/api/decisions/*/narrative', async (route) => {
    await route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'stubbed failure', code }),
    });
  });
}

/** MARKET_GROUPS from `app/(dashboard)/lib/markets.ts`, mirrored here as the
 * expected order per `specs/market-navigation/spec.md`'s corrected "Sidebar
 * navigation shell" requirement: 7-item MERCADOS PRINCIPALES (no CEDEARs),
 * 3-item MERCADO ARGENTINO (CEDEARs first). */
const MERCADOS_PRINCIPALES = ['acciones', 'crypto', 'renta-fija', 'forex', 'commodities', 'indices', 'etfs'];
const MERCADO_ARGENTINO = ['cedears', 'dolar', 'plazo-fijo'];

async function gotoCrypto(page: Page) {
  await stubDecisions(page, EMPTY_REPORT);
  await stubNarrativeError(page, 503, 'NARRATIVE_DISABLED');
  await page.goto('/dashboard/crypto');
}

test.describe('Sidebar — group order', () => {
  test('renders both groups with the corrected 7+3 item grouping/order', async ({ page }) => {
    await gotoCrypto(page);

    const nav = page.getByRole('navigation', { name: 'Mercados' });
    await expect(nav).toBeVisible();
    await expect(nav.getByText('MERCADOS PRINCIPALES')).toBeVisible();
    await expect(nav.getByText('MERCADO ARGENTINO')).toBeVisible();

    for (const slug of MERCADOS_PRINCIPALES) {
      await expect(nav.getByTestId(`sidebar-link-${slug}`)).toBeVisible();
    }
    for (const slug of MERCADO_ARGENTINO) {
      await expect(nav.getByTestId(`sidebar-link-${slug}`)).toBeVisible();
    }

    // Order within each group must match the spec exactly, not just membership.
    const allSlugs = [...MERCADOS_PRINCIPALES, ...MERCADO_ARGENTINO];
    const testIds = await nav.locator('[data-testid^="sidebar-link-"]').evaluateAll((els) =>
      els.map((el) => el.getAttribute('data-testid')),
    );
    expect(testIds).toEqual(allSlugs.map((slug) => `sidebar-link-${slug}`));
  });
});

test.describe('Sidebar — accessibility baseline', () => {
  test('Criptomonedas link has aria-current="page" on /dashboard/crypto; no other link does', async ({ page }) => {
    await gotoCrypto(page);

    const nav = page.getByRole('navigation', { name: 'Mercados' });
    await expect(nav.getByTestId('sidebar-link-crypto')).toHaveAttribute('aria-current', 'page');

    const otherSlugs = [...MERCADOS_PRINCIPALES, ...MERCADO_ARGENTINO].filter((slug) => slug !== 'crypto');
    for (const slug of otherSlugs) {
      await expect(nav.getByTestId(`sidebar-link-${slug}`)).not.toHaveAttribute('aria-current', 'page');
    }
  });

  test('sidebar is wrapped in a <nav aria-label> landmark', async ({ page }) => {
    await gotoCrypto(page);

    await expect(page.getByRole('navigation', { name: 'Mercados' })).toBeVisible();
  });

  test('keyboard tab to a sidebar link shows a visible focus-visible outline', async ({ page }) => {
    await gotoCrypto(page);

    let focusedTestId: string | null = null;
    for (let i = 0; i < 20; i += 1) {
      await page.keyboard.press('Tab');
      focusedTestId = await page.evaluate(() => document.activeElement?.getAttribute('data-testid') ?? null);
      if (focusedTestId?.startsWith('sidebar-link-')) break;
    }
    expect(focusedTestId).toMatch(/^sidebar-link-/);

    const focused = page.locator(':focus');
    const outlineStyle = await focused.evaluate((el) => getComputedStyle(el).outlineStyle);
    const outlineWidth = await focused.evaluate((el) => getComputedStyle(el).outlineWidth);
    expect(outlineStyle).not.toBe('none');
    expect(outlineWidth).not.toBe('0px');
  });
});

test.describe('No new CDN/font dependency', () => {
  test('rendered <head> has no new Google Fonts or third-party CDN link/script tag', async ({ page }) => {
    await gotoCrypto(page);

    const head = page.locator('head');
    await expect(head.locator('link[href*="fonts.googleapis.com"]')).toHaveCount(0);
    await expect(head.locator('link[href*="fonts.gstatic.com"]')).toHaveCount(0);
    await expect(head.locator('script[src*="fonts.googleapis.com"]')).toHaveCount(0);
    await expect(head.locator('script[src^="http"]')).toHaveCount(0);
  });
});

// ---------------------------------------------------------------------------
// `market-nav-redesign` Phase 3 (PR3), task 3.1 — placeholder-market pages.
// specs/market-navigation/spec.md "Per-market routing" + "Placeholder-market
// page" requirements: clicking a non-crypto sidebar link navigates to a real
// `/dashboard/{slug}` route rendering a shared, honest "próximamente"
// placeholder — Spanish copy, `role="status"`, no CTA/interest-capture, and a
// `data-testid` distinct from both `empty-state` and `service-unavailable`.
// `/dashboard/crypto` must keep resolving to the real dashboard (static route
// precedence over the new dynamic `[market]` segment), and an unknown slug
// must 404 via `notFound()`, never crash or silently render a placeholder.
// ---------------------------------------------------------------------------

test.describe('Placeholder-market pages', () => {
  test('clicking Acciones navigates to /dashboard/acciones and renders the placeholder', async ({ page }) => {
    await gotoCrypto(page);

    const nav = page.getByRole('navigation', { name: 'Mercados' });
    await nav.getByTestId('sidebar-link-acciones').click();

    await expect(page).toHaveURL(/\/dashboard\/acciones$/);

    const placeholder = page.getByTestId('market-placeholder');
    await expect(placeholder).toBeVisible();
    await expect(placeholder).toHaveAttribute('role', 'status');
    await expect(placeholder).toContainText('Acciones');
    await expect(placeholder).toContainText('no está disponible');

    await expect(page.getByTestId('empty-state')).toHaveCount(0);
    await expect(page.getByTestId('service-unavailable')).toHaveCount(0);
  });

  test('placeholder page has zero CTA / interest-capture affordances', async ({ page }) => {
    await gotoCrypto(page);

    const nav = page.getByRole('navigation', { name: 'Mercados' });
    await nav.getByTestId('sidebar-link-forex').click();
    await expect(page).toHaveURL(/\/dashboard\/forex$/);

    const placeholder = page.getByTestId('market-placeholder');
    await expect(placeholder).toBeVisible();

    await expect(placeholder.locator('a')).toHaveCount(0);
    await expect(placeholder.locator('button')).toHaveCount(0);
    await expect(placeholder.locator('form')).toHaveCount(0);
    await expect(placeholder.locator('input')).toHaveCount(0);
  });

  test('/dashboard/crypto still renders the real dashboard, not the placeholder (static route precedence)', async ({
    page,
  }) => {
    await gotoCrypto(page);

    await expect(page.getByTestId('market-placeholder')).toHaveCount(0);
    await expect(page.locator('main')).toContainText('Recomendaciones activas');
  });

  test('an unknown market slug resolves to a 404, not a crash or a placeholder', async ({ page }) => {
    const response = await page.goto('/dashboard/not-a-real-market');

    expect(response?.status()).toBe(404);
    await expect(page.getByTestId('market-placeholder')).toHaveCount(0);
  });
});
