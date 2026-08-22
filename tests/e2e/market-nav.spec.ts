import { test, expect, type Page } from '@playwright/test';
import type { Decision, DecisionReport, ThesisState } from '../../src/domain/types';

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

/** Phase 2 (task 2.7) — minimal fixtures for the DirectionFilter's 4th tab,
 * per specs/market-navigation/spec.md's "DirectionFilter wiring unchanged by
 * the navigation redesign" requirement. No candle/evidence detail needed —
 * this suite only exercises the filter's own wiring, not the card/graph
 * rendering already covered by `tests/e2e/dashboard.spec.ts`. */
const EMPTY_THESIS: ThesisState = {
  thesis: 'bullish',
  supporters: [],
  aggregated: { gamma: 0, rho: 0 },
  net: { gamma: 0, rho: 0 },
  score: 0,
};

function directionFixture(asset: string, recommendation: Decision['recommendation']): Decision {
  return {
    asset,
    t: T,
    recommendation,
    bullish: EMPTY_THESIS,
    bearish: EMPTY_THESIS,
    gap: 0,
    thresholds: { theta: 0.67, delta: 0.2 },
    trace: { candles: [], turtle: '', evidences: [] },
  };
}

const DIRECTION_FILTER_REPORT: DecisionReport = {
  cycleId: 'cycle_e2e_direction_filter',
  computedAt: T,
  decisions: [
    directionFixture('BTCUSDT', 'BUY'),
    directionFixture('ETHUSDT', 'SELL'),
    directionFixture('SOLUSDT', 'NO_RECOMMENDATION'),
  ],
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

// ---------------------------------------------------------------------------
// `dashboard-shell-branding` — sidebar branding block + shared shell footer.
// specs/market-navigation/spec.md "Sidebar navigation shell" (MODIFIED) +
// "Shared shell footer" (ADDED): a branding header ("Plataforma FAF" +
// subtitle) renders as the first element above the market groups in both
// the desktop nav and the mobile drawer; one shared footer (exact copy)
// renders on every `/dashboard/*` route, the old "Trabajo de tesis" footer
// is fully removed, and the fixed footer never overlaps page content.
// ---------------------------------------------------------------------------

test.describe('Sidebar branding', () => {
  test('desktop nav shows "Plataforma FAF" + subtitle above the market groups', async ({ page }) => {
    await gotoCrypto(page);
    const branding = page.getByTestId('sidebar-desktop-nav').getByTestId('sidebar-branding');
    await expect(branding).toBeVisible();
    await expect(branding.getByRole('heading', { name: 'Plataforma FAF' })).toBeVisible();
    await expect(branding).toContainText('Recomendaciones financieras explicables en tiempo real');
  });
});

test.describe('Shared dashboard footer', () => {
  test('renders identical footer copy on /dashboard/crypto and a placeholder-market route', async ({ page }) => {
    await gotoCrypto(page);
    const footer = page.getByTestId('dashboard-footer');
    await expect(footer).toContainText('carácter informativo y educativo');
    await expect(footer).toContainText('Desarrollado por Javier M. Debórtoli.');
    const cryptoFooterText = await footer.innerText();

    await page.goto('/dashboard/acciones');
    // `toHaveText()` compares against `textContent` (whitespace-collapsed,
    // no line breaks between block-level <p> elements), while `innerText()`
    // reflects rendering and inserts a line break between paragraphs — the
    // two are not directly comparable via `toHaveText`. Compare two
    // `innerText()` reads directly instead to prove the footer is byte-
    // identical across routes.
    await expect.poll(() => page.getByTestId('dashboard-footer').innerText()).toBe(cryptoFooterText);
  });

  test('old crypto-only thesis footer text is gone everywhere', async ({ page }) => {
    await gotoCrypto(page);
    await expect(page.getByText(/Trabajo de tesis/)).toHaveCount(0);
    await page.goto('/dashboard/acciones');
    await expect(page.getByText(/Trabajo de tesis/)).toHaveCount(0);
  });

  // NOTE: `.boundingBox()` on a `position:fixed` element adds scroll offset
  // in Playwright and is unreliable across scroll. Compare
  // `getBoundingClientRect()` (viewport-relative) for both elements inside
  // one `page.evaluate`, after scrolling to the bottom, instead.
  for (const viewport of [{ width: 1280, height: 800 }, { width: 375, height: 812 }]) {
    test(`footer never overlaps content at ${viewport.width}px`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await gotoCrypto(page);
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      const overlaps = await page.evaluate(() => {
        const main = document.querySelector('main')!;
        const footer = document.querySelector('[data-testid="dashboard-footer"]')!;
        return main.getBoundingClientRect().bottom > footer.getBoundingClientRect().top;
      });
      expect(overlaps).toBe(false);
    });

    // `dashboard-cleanup-and-footer-revert` — Inicio now shares the same
    // footer as crypto/placeholder-market routes, so the overlap guard must
    // cover it too, at the same viewports.
    test(`footer never overlaps content on /dashboard/inicio at ${viewport.width}px`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto('/dashboard/inicio');
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      const overlaps = await page.evaluate(() => {
        const main = document.querySelector('main')!;
        const footer = document.querySelector('[data-testid="dashboard-footer"]')!;
        return main.getBoundingClientRect().bottom > footer.getBoundingClientRect().top;
      });
      expect(overlaps).toBe(false);
    });
  }

  // `inicio-visual-and-scroll-fix` — root cause: `<main>`'s `min-h-screen`
  // double-stacks with `(with-footer)/layout.tsx`'s `pb-48` (12rem = 192px),
  // always rendering >= `100vh + 192px` regardless of content, which shows a
  // phantom vertical scrollbar even on short-content routes. `gotoCrypto`'s
  // `EMPTY_REPORT` triggers `EmptyState` (a short, dashed-border block), the
  // shortest realistic content on `/dashboard/crypto`.
  //
  // Explicit 1280x800 viewport (same as the "footer never overlaps content"
  // 1280px case above), not Playwright's default 1280x720 project viewport:
  // diagnosed directly against the fixed code, the real (non-phantom) content
  // height of header + EmptyState on this route is ~549.5px, which alone
  // already exceeds a 720px-tall viewport once the 192px reserved footer
  // space is added (549.5 + 192 = 741.5 > 720) — genuine content overflow,
  // not the double-counted `min-h-screen` artifact this test guards against
  // (which forced exactly 912px regardless of content, a fixed +192px over
  // ANY viewport height). 800px is representative of a real desktop and
  // matches this suite's existing viewport convention.
  test('no phantom vertical scroll on a short-content route (EmptyState)', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await gotoCrypto(page);
    await expect(page.getByTestId('empty-state')).toBeVisible();

    const { scrollHeight, innerHeight } = await page.evaluate(() => ({
      scrollHeight: document.documentElement.scrollHeight,
      innerHeight: window.innerHeight,
    }));

    // 1px tolerance for scrollbar-width/subpixel rounding quirks across
    // browsers, not a meaningful slack on the ~192px bug this guards against.
    expect(scrollHeight).toBeLessThanOrEqual(innerHeight + 1);
  });

  // `dashboard-cleanup-and-footer-revert` — same phantom-scroll root cause as
  // the crypto test above, now guarding `/dashboard/inicio` after its move
  // into `(with-footer)/`: without the `<main>` className fix (`min-h-screen`
  // -> `min-h-[calc(100vh-12rem)]`), the new `pb-48` wrapper double-stacks
  // with `min-h-screen` and reintroduces the same >=100vh+192px overflow.
  //
  // Deviation from tasks.md's suggested 1280x800 (matching the crypto
  // EmptyState test above): measured directly against the fixed code,
  // Inicio's real content (heading + prose card + `PipelineDiagram` SVG) plus
  // the 192px reserved footer space totals ~894px — genuinely taller than
  // crypto's `EmptyState`, so an 800px-tall viewport would show real
  // (non-phantom) scroll even with the fix correctly applied and fail this
  // test for the wrong reason. 1000px gives headroom above that real content
  // height while still being far short of the ~1142px+ the reintroduced bug
  // would force (real content ~894 - 192 reserved + 1000 viewport = 1142),
  // so this test isolates the double-counting bug specifically, same intent
  // as the crypto test.
  test('no phantom vertical scroll on /dashboard/inicio', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 1000 });
    await page.goto('/dashboard/inicio');
    await expect(page.getByRole('heading', { name: /Bienvenido/ })).toBeVisible();

    const { scrollHeight, innerHeight } = await page.evaluate(() => ({
      scrollHeight: document.documentElement.scrollHeight,
      innerHeight: window.innerHeight,
    }));

    // Same 1px tolerance as the crypto test above.
    expect(scrollHeight).toBeLessThanOrEqual(innerHeight + 1);
  });
});

// ---------------------------------------------------------------------------
// `dashboard-header-copy-consistency` — shared `DashboardHeader` eyebrow +
// disclaimer, closing the sdd-verify coverage gap (verify-report.md CRITICAL
// finding): specs/market-navigation/spec.md "Dashboard eyebrow copy is
// consistent across market views" + "Determinism disclaimer appears on every
// market view" both require exact/byte-for-byte copy on EVERY /dashboard/*
// view, not a substring match — a `toContainText('Criptomonedas')` check
// elsewhere would still pass even if the old "FAF · " prefix silently
// returned, so these assert the eyebrow's exact text via `toHaveText` (whole
// element content, not substring) plus a negative `FAF` check for defense in
// depth. Mirrors the "Shared dashboard footer" describe block above (same
// cross-route consistency pattern: crypto vs. a placeholder-market route).
// ---------------------------------------------------------------------------

test.describe('Dashboard header — eyebrow & disclaimer', () => {
  test('crypto view eyebrow reads exactly "Panel de decisiones", no "FAF" prefix', async ({ page }) => {
    await gotoCrypto(page);

    const eyebrow = page.locator('main header span');
    await expect(eyebrow).toHaveText('Panel de decisiones');
    await expect(eyebrow).not.toContainText('FAF');
  });

  test('placeholder-market view eyebrow matches crypto — exactly "Panel de decisiones"', async ({ page }) => {
    await gotoCrypto(page);

    const nav = page.getByRole('navigation', { name: 'Mercados' });
    await nav.getByTestId('sidebar-link-forex').click();
    await expect(page).toHaveURL(/\/dashboard\/forex$/);

    const eyebrow = page.locator('main header span');
    await expect(eyebrow).toHaveText('Panel de decisiones');
    await expect(eyebrow).not.toContainText('FAF');
  });

  test('crypto view shows the determinism disclaimer', async ({ page }) => {
    await gotoCrypto(page);

    await expect(page.locator('main')).toContainText(
      'Cada tarjeta muestra una recomendación Compra/Venta/Sin recomendación derivada de forma determinística por el framework argumentativo. Esta vista no contiene texto generado por IA.',
    );
  });
});

// ---------------------------------------------------------------------------
// no-recommendation-filter-and-i18n Phase 2 (task 2.7) —
// specs/market-navigation/spec.md "DirectionFilter wiring unchanged by the
// navigation redesign": the 4th "Sin recomendación" control isolates only
// NO_RECOMMENDATION (muted) cards, with correct `aria-pressed` state.
// ---------------------------------------------------------------------------

test.describe('DirectionFilter wiring', () => {
  test('Sin recomendación filter isolates muted cards', async ({ page }) => {
    await stubDecisions(page, DIRECTION_FILTER_REPORT);
    await stubNarrativeError(page, 503, 'NARRATIVE_DISABLED');

    await page.goto('/dashboard/crypto');

    const btcCard = page.getByTestId('decision-card-BTCUSDT');
    const ethCard = page.getByTestId('decision-card-ETHUSDT');
    const solCard = page.getByTestId('decision-card-SOLUSDT');
    await expect(btcCard).toBeVisible();
    await expect(ethCard).toBeVisible();
    await expect(solCard).toBeVisible();

    const noRecommendationControl = page.getByTestId('direction-filter-NO_RECOMMENDATION');
    await noRecommendationControl.click();

    await expect(solCard).toBeVisible();
    await expect(btcCard).toHaveCount(0);
    await expect(ethCard).toHaveCount(0);

    await expect(noRecommendationControl).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('direction-filter-ALL')).toHaveAttribute('aria-pressed', 'false');
    await expect(page.getByTestId('direction-filter-BUY')).toHaveAttribute('aria-pressed', 'false');
    await expect(page.getByTestId('direction-filter-SELL')).toHaveAttribute('aria-pressed', 'false');
  });
});

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

    // Order within each group must match the spec exactly, not just
    // membership. `inicio-home-section` prepends the Inicio link, above and
    // outside both market groups, to the expected order
    // (specs/market-navigation/spec.md "Inicio link renders between branding
    // and market groups").
    const allSlugs = ['inicio', ...MERCADOS_PRINCIPALES, ...MERCADO_ARGENTINO];
    const testIds = await nav.locator('[data-testid^="sidebar-link-"]').evaluateAll((els) =>
      els.map((el) => el.getAttribute('data-testid')),
    );
    expect(testIds).toEqual(allSlugs.map((slug) => `sidebar-link-${slug}`));
  });
});

// ---------------------------------------------------------------------------
// `inicio-home-section` — Inicio sidebar link active-state and footer
// exclusion. specs/market-navigation/spec.md "Inicio link renders between
// branding and market groups" (aria-current) + "Inicio route renders no
// footer".
// ---------------------------------------------------------------------------

test.describe('Sidebar — Inicio link', () => {
  test('Inicio link has aria-current="page" on /dashboard/inicio; no market link does', async ({ page }) => {
    await page.goto('/dashboard/inicio');

    const nav = page.getByRole('navigation', { name: 'Mercados' });
    await expect(nav.getByTestId('sidebar-link-inicio')).toHaveAttribute('aria-current', 'page');

    for (const slug of [...MERCADOS_PRINCIPALES, ...MERCADO_ARGENTINO]) {
      await expect(nav.getByTestId(`sidebar-link-${slug}`)).not.toHaveAttribute('aria-current', 'page');
    }
  });

  test('Criptomonedas link stays active on /dashboard/crypto; Inicio link is not active there', async ({
    page,
  }) => {
    await gotoCrypto(page);

    const nav = page.getByRole('navigation', { name: 'Mercados' });
    await expect(nav.getByTestId('sidebar-link-crypto')).toHaveAttribute('aria-current', 'page');
    await expect(nav.getByTestId('sidebar-link-inicio')).not.toHaveAttribute('aria-current', 'page');
  });
});

test.describe('Inicio route — shared dashboard footer', () => {
  test('renders the same dashboard-footer element and exact copy as /dashboard/crypto', async ({ page }) => {
    await gotoCrypto(page);
    const cryptoFooterText = await page.getByTestId('dashboard-footer').innerText();

    const response = await page.goto('/dashboard/inicio');

    // Guard against a vacuous pass: a nonexistent route (404) would also
    // have zero `dashboard-footer` elements, so this must first prove the
    // route actually rendered real Inicio content before asserting the
    // footer's presence (see strict-tdd's "GREEN that passes trivially"
    // warning).
    expect(response?.status()).toBeLessThan(400);
    await expect(page.getByRole('heading', { name: /Bienvenido/ })).toBeVisible();

    const footer = page.getByTestId('dashboard-footer');
    await expect(footer).toContainText('carácter informativo y educativo');
    await expect(footer).toContainText('Desarrollado por Javier M. Debórtoli.');
    await expect.poll(() => footer.innerText()).toBe(cryptoFooterText);
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
    await expect(page.locator('main')).toContainText('Criptomonedas');
  });

  test('an unknown market slug resolves to a 404, not a crash or a placeholder', async ({ page }) => {
    const response = await page.goto('/dashboard/not-a-real-market');

    expect(response?.status()).toBe(404);
    await expect(page.getByTestId('market-placeholder')).toHaveCount(0);
  });

  test('placeholder-market page shows the determinism disclaimer, identical to crypto', async ({ page }) => {
    await gotoCrypto(page);

    const nav = page.getByRole('navigation', { name: 'Mercados' });
    await nav.getByTestId('sidebar-link-forex').click();
    await expect(page).toHaveURL(/\/dashboard\/forex$/);

    await expect(page.locator('main')).toContainText(
      'Cada tarjeta muestra una recomendación Compra/Venta/Sin recomendación derivada de forma determinística por el framework argumentativo. Esta vista no contiene texto generado por IA.',
    );
  });
});

// ---------------------------------------------------------------------------
// `market-nav-redesign` Phase 4 (PR4), tasks 4.1-4.3 — mobile navigation
// drawer. specs/market-navigation/spec.md "Mobile navigation drawer"
// requirement: below `md`, a hamburger control opens a drawer overlay
// listing the SAME markets, groups, and order as the desktop sidebar
// (`Sidebar.tsx`'s `MarketLinkGroups`, not a duplicate); the drawer must be
// closeable (close button and/or backdrop click); the existing mobile
// single-column `/dashboard/crypto` view must not regress with the drawer
// closed. Desktop sidebar (`sidebar-desktop-nav`) is `hidden md:flex` per
// Phase 2 — this suite asserts the exact inverse for the hamburger trigger.
// ---------------------------------------------------------------------------

test.describe('Mobile navigation drawer', () => {
  test.describe('below md breakpoint', () => {
    test.use({ viewport: { width: 375, height: 812 } });

    test('hamburger is visible and the desktop nav is hidden (inverse of desktop sidebar visibility)', async ({
      page,
    }) => {
      await gotoCrypto(page);

      await expect(page.getByTestId('sidebar-mobile-toggle')).toBeVisible();
      await expect(page.getByTestId('sidebar-desktop-nav')).toBeHidden();
    });

    test('drawer also shows the "Plataforma FAF" branding block', async ({ page }) => {
      await gotoCrypto(page);
      await page.getByTestId('sidebar-mobile-toggle').click();
      const branding = page.getByTestId('sidebar-mobile-drawer').getByTestId('sidebar-branding');
      await expect(branding).toBeVisible();
      await expect(branding).toContainText('Plataforma FAF');
    });

    test('clicking the hamburger opens the drawer listing the same groups/markets/order as desktop', async ({
      page,
    }) => {
      await gotoCrypto(page);

      await page.getByTestId('sidebar-mobile-toggle').click();

      const drawer = page.getByTestId('sidebar-mobile-drawer');
      await expect(drawer).toBeVisible();
      await expect(drawer.getByText('MERCADOS PRINCIPALES')).toBeVisible();
      await expect(drawer.getByText('MERCADO ARGENTINO')).toBeVisible();

      // `inicio-home-section` — the Inicio link renders in the mobile drawer
      // too (specs/market-navigation/spec.md "Inicio link renders between
      // branding and market groups": "the desktop sidebar or the mobile
      // drawer"), so it's prepended here exactly as in the desktop "Sidebar —
      // group order" test above.
      const allSlugs = ['inicio', ...MERCADOS_PRINCIPALES, ...MERCADO_ARGENTINO];
      const testIds = await drawer.locator('[data-testid^="sidebar-link-"]').evaluateAll((els) =>
        els.map((el) => el.getAttribute('data-testid')),
      );
      expect(testIds).toEqual(allSlugs.map((slug) => `sidebar-link-${slug}`));
    });

    test('closing the drawer via the close button hides it again', async ({ page }) => {
      await gotoCrypto(page);

      await page.getByTestId('sidebar-mobile-toggle').click();
      await expect(page.getByTestId('sidebar-mobile-drawer')).toBeVisible();

      await page.getByTestId('sidebar-mobile-close').click();
      await expect(page.getByTestId('sidebar-mobile-drawer')).toHaveCount(0);
    });

    test('closing the drawer via a backdrop click hides it again', async ({ page }) => {
      await gotoCrypto(page);

      await page.getByTestId('sidebar-mobile-toggle').click();
      await expect(page.getByTestId('sidebar-mobile-drawer')).toBeVisible();

      // Click outside the drawer panel's own bounds (w-64 = 256px) so the
      // backdrop, not the nav panel stacked above it, receives the click.
      await page.getByTestId('sidebar-mobile-backdrop').click({ position: { x: 320, y: 10 } });
      await expect(page.getByTestId('sidebar-mobile-drawer')).toHaveCount(0);
    });

    test('clicking a drawer link closes the drawer and navigates', async ({ page }) => {
      await gotoCrypto(page);

      await page.getByTestId('sidebar-mobile-toggle').click();
      const drawer = page.getByTestId('sidebar-mobile-drawer');
      await drawer.getByTestId('sidebar-link-acciones').click();

      await expect(page).toHaveURL(/\/dashboard\/acciones$/);
      await expect(page.getByTestId('sidebar-mobile-drawer')).toHaveCount(0);
    });

    test('/dashboard/crypto still renders correctly at mobile viewport with the drawer closed (no regression)', async ({
      page,
    }) => {
      await gotoCrypto(page);

      await expect(page.getByTestId('sidebar-mobile-drawer')).toHaveCount(0);
      await expect(page.locator('main')).toContainText('Criptomonedas');
      await expect(page.getByTestId('direction-filter-ALL')).toBeVisible();
    });
  });

  test.describe('at/above md breakpoint (default desktop viewport)', () => {
    test('hamburger is hidden and the desktop nav is visible', async ({ page }) => {
      await gotoCrypto(page);

      await expect(page.getByTestId('sidebar-mobile-toggle')).toBeHidden();
      await expect(page.getByTestId('sidebar-desktop-nav')).toBeVisible();
    });
  });
});
