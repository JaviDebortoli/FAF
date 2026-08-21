import { describe, expect, it, vi } from 'vitest';
import { renderToString } from 'react-dom/server';

/**
 * `dashboard-header-copy-consistency` sdd-verify follow-up (pass 2 CRITICAL
 * finding, closed) — the delta spec's "Heading updates if the catalog label
 * changes" scenario (specs/decision-dashboard/spec.md) has no runtime test:
 * apply-progress and verify-report.md both confirm by source read that
 * `app/dashboard/crypto/page.tsx` passes `cryptoMarket.label` (a genuine
 * `MARKETS.crypto` property read) to `<DashboardHeader title={...}>`, not a
 * hardcoded literal — but that data-flow claim was never runtime-exercised.
 *
 * E2E (Playwright) cannot exercise "edit lib/markets.ts, re-render" inside
 * one test run without disproportionate new infrastructure (see
 * verify-report.md's Analysis section). This unit test closes the gap at
 * the layer that CAN exercise it cheaply: `vi.mock` the `markets` module
 * with a distinct test label, render `CryptoDashboardPage()` server-side via
 * `react-dom/server`'s `renderToString`, and assert the mocked label
 * actually reaches the rendered HTML. If the page ever regressed to a
 * hardcoded literal (like the pre-fix `"Recomendaciones activas"`), this
 * test would fail because the mocked label would never appear.
 *
 * Zero new npm dependencies (`react-dom` is already a dependency, `vitest`
 * is already configured). Follows this repo's existing `vi.mock()` +
 * dynamic-`import()` convention (see `tests/api/cycle.test.ts`,
 * `tests/api/narrative.test.ts`, `tests/narrative/client.test.ts`).
 *
 * `CryptoDashboardPage` is a synchronous (non-async) Server Component — it
 * returns a plain JSX element tree with no `await`/`use()` inside the
 * component function itself, so calling it directly and passing the
 * returned element to `renderToString` works with plain `react-dom/server`,
 * the same way Next.js's own RSC-to-HTML server rendering does for a
 * non-async Server Component. No test-only overrides of `OverviewClient`
 * (the client-island child) were needed — it renders its `loading` state
 * fine under plain `renderToString` in a Node environment (no `window`/
 * `document` access outside of `useEffect`, which SSR never runs).
 */

const TEST_LABEL = 'Test Crypto Label';

vi.mock('@/app/(dashboard)/lib/markets', () => ({
  MARKETS: {
    crypto: { slug: 'crypto', label: TEST_LABEL, icon: 'Coins', isReal: true },
  },
  MARKET_GROUPS: [],
}));

describe('CryptoDashboardPage — heading is data-driven from MARKETS.crypto.label', () => {
  it('renders the mocked MARKETS.crypto.label in the output HTML, not a hardcoded string', async () => {
    // `inicio-home-section` design.md "Import-path note" — `crypto/page.tsx`
    // moved under the `(with-footer)` route group (footer-exclusion split for
    // the new Inicio route). Route groups affect only the URL, not the
    // on-disk path this `@/` alias resolves, so the import must follow the
    // physical move.
    const { default: CryptoDashboardPage } = await import('@/app/dashboard/(with-footer)/crypto/page');

    const html = renderToString(CryptoDashboardPage());

    expect(html).toContain(TEST_LABEL);
  });
});
