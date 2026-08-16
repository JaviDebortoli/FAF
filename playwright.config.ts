import { defineConfig, devices } from '@playwright/test';

const PORT = 3100;
const BASE_URL = `http://127.0.0.1:${PORT}`;

/**
 * Task 7.2 — minimal Playwright config for the dashboard smoke test
 * (tests/e2e/dashboard.spec.ts). Spawns `next dev` on a dedicated port. The
 * test stubs `GET /api/decisions` via `page.route`, so the whole run stays
 * fully offline — no live Binance calls and no shared-secret plumbing
 * needed (see the doc comment in tests/e2e/dashboard.spec.ts for why POSTing
 * a live-seeded cycle was rejected in favor of stubbing).
 */
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/*.spec.ts',
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: BASE_URL,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `npx next dev -p ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
