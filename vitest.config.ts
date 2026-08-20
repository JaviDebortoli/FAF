import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  // `tsconfig.json`'s `jsx: "preserve"` is for Next.js's own compiler, not
  // Vite/esbuild's test transform. Without an explicit `esbuild.jsx` mode
  // here, esbuild falls back to the classic transform (requires a `React`
  // global in scope) — only relevant for `tests/dashboard/crypto/page.test.ts`
  // (`dashboard-header-copy-consistency` follow-up), this repo's first
  // component-render unit test. `automatic` matches React 19 + Next.js's
  // actual JSX runtime, zero new dependency (esbuild ships with Vite).
  esbuild: {
    jsx: 'automatic',
  },
});
