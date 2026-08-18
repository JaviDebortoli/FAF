# Design: dashboard-shell-branding — sidebar branding + shared footer

## Technical Approach

Small, surgical gap-closing change across 3 files, no new components, no new
routes, no new Tailwind tokens. `Sidebar.tsx` gets a branding block inserted
as the first child of both nav surfaces (desktop `<nav>` and mobile drawer
`<nav>`), reusing the existing `flex-col gap-6` spacing already on both
`<nav>` elements — no extra margin utility needed on the new block itself.
`app/dashboard/layout.tsx` gets one shared `<footer>` (fixed, `md:left-64`)
plus a `pb-28` reservation on its single content wrapper div, so all ~10
`/dashboard/*` routes inherit both for free without touching page files.
`crypto/page.tsx` loses its old per-page footer. All copy is verbatim per
`proposal.md`; no new `@theme` tokens — matches `market-nav-redesign`'s
"Adapt, not Replace" precedent.

## Architecture Decisions

### Decision: Bottom-padding placement — layout wrapper vs. per-page `<main>`

**Choice**: Add `pb-28` to `layout.tsx`'s existing content wrapper
(`<div className="flex-1 md:pl-64">`), not to each page's `<main>`.
**Alternatives considered**: Add `pb-28` (or equivalent) to `crypto/page.tsx`'s
and `[market]/page.tsx`'s `<main>` elements individually.
**Rationale**: The wrapper is the single shared ancestor of every route
(same reason the footer itself lives in `layout.tsx`, not per-page — see
`exploration.md` "Mechanics"). One touch point avoids drift as new
placeholder-market pages are added later, and keeps the DRY symmetry between
"one footer" and "one padding reservation." Padding on the wrapper (rather
than on `<main>`, which is `min-h-screen`) still works: it adds space *after*
`<main>`'s rendered content, so the page's total scrollable height grows by
112px and the fixed footer never overlaps real content once scrolled to the
bottom.

### Decision: Bottom-padding value — `pb-28` (112px)

**Choice**: `pb-28` (7rem / 112px).
**Alternatives considered**: `pb-16` (64px, assumes a strict 2-line footer);
no padding (rejected — confirmed real overlap risk per `exploration.md`).
**Rationale**: Footer vertical chrome is `py-4` (32px). Text is `text-xs`
(12px) with `leading-relaxed` (~1.625 line-height, ~20px/line). The mockup's
`<br class="hidden md:block">` only forces a break at `md:`+ (2 lines
there); below `md:` the `<br>` is `display:none` so the disclaimer sentence
and the bold attribution line wrap naturally and can reflow to 3-4 lines on
a narrow (375px) viewport with `px-4` gutters. Budgeting for up to 4 lines:
`32px + 4 × 20px = 112px = pb-28` — exact match, with slack. Desktop's
forced 2-line layout (~32 + 40 = 72px) is comfortably inside this. The exact
value is empirically verified, not just computed — see the Playwright
overlap assertion below, which is the actual gate.

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `app/(dashboard)/components/Sidebar.tsx` | Modify | Add `sidebar-branding` block as first child of desktop `<nav>` and mobile drawer `<nav>` |
| `app/dashboard/layout.tsx` | Modify | Add shared `<footer data-testid="dashboard-footer">` + `pb-28` on content wrapper |
| `app/dashboard/crypto/page.tsx` | Modify | Delete old `<footer>` block (lines 43-45) |
| `openspec/specs/market-navigation/spec.md` | Modify (by `sdd-spec`, parallel) | New sidebar-branding + shared-footer requirements |
| `tests/e2e/market-nav.spec.ts` | Modify | New `describe` blocks: branding (desktop+mobile), shared footer (crypto+placeholder), old footer removal, overlap check |

## Exact Code Changes

### `Sidebar.tsx` — desktop `<nav>` (current lines 85-91)

Before:
```tsx
<nav
  aria-label="Mercados"
  data-testid="sidebar-desktop-nav"
  className="hidden md:fixed md:inset-y-0 md:left-0 md:flex md:w-64 md:flex-col md:gap-6 md:overflow-y-auto md:border-r md:border-zinc-800 md:bg-zinc-950 md:px-4 md:py-6"
>
  <MarketLinkGroups activeSlug={activeSlug} />
</nav>
```

After:
```tsx
<nav
  aria-label="Mercados"
  data-testid="sidebar-desktop-nav"
  className="hidden md:fixed md:inset-y-0 md:left-0 md:flex md:w-64 md:flex-col md:gap-6 md:overflow-y-auto md:border-r md:border-zinc-800 md:bg-zinc-950 md:px-4 md:py-6"
>
  <div data-testid="sidebar-branding" className="px-3">
    <h1 className="text-lg font-bold tracking-tight text-zinc-50">Plataforma FAF</h1>
    <p className="mt-1 text-xs text-muted">Recomendaciones financieras explicables en tiempo real</p>
  </div>
  <MarketLinkGroups activeSlug={activeSlug} />
</nav>
```

### `Sidebar.tsx` — mobile drawer `<nav>` (current lines 111-128)

Before:
```tsx
<nav
  aria-label="Mercados"
  className="absolute inset-y-0 left-0 flex w-64 flex-col gap-6 overflow-y-auto border-r border-zinc-800 bg-zinc-950 px-4 py-6"
>
  <div className="flex items-center justify-between px-3">
    <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">Mercados</span>
    <button /* ... unchanged ... */>
      <Icons.Close className="h-4 w-4" aria-hidden="true" />
    </button>
  </div>
  <MarketLinkGroups activeSlug={activeSlug} onLinkClick={() => setMobileOpen(false)} />
</nav>
```

After (branding inserted as new first child, above the "Mercados" close-row):
```tsx
<nav
  aria-label="Mercados"
  className="absolute inset-y-0 left-0 flex w-64 flex-col gap-6 overflow-y-auto border-r border-zinc-800 bg-zinc-950 px-4 py-6"
>
  <div data-testid="sidebar-branding" className="px-3">
    <h1 className="text-lg font-bold tracking-tight text-zinc-50">Plataforma FAF</h1>
    <p className="mt-1 text-xs text-muted">Recomendaciones financieras explicables en tiempo real</p>
  </div>
  <div className="flex items-center justify-between px-3">
    <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">Mercados</span>
    <button /* ... unchanged ... */>
      <Icons.Close className="h-4 w-4" aria-hidden="true" />
    </button>
  </div>
  <MarketLinkGroups activeSlug={activeSlug} onLinkClick={() => setMobileOpen(false)} />
</nav>
```

Note: `data-testid="sidebar-branding"` (and `aria-label="Mercados"`) appears
on both nav surfaces, same as every other sidebar testid today
(`sidebar-desktop-nav` vs `sidebar-mobile-drawer` already disambiguate them).
Tests MUST scope through the parent testid, exactly like the existing group
and link assertions do.

### `app/dashboard/layout.tsx` (full file)

Before:
```tsx
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 md:pl-64">{children}</div>
    </div>
  );
}
```

After:
```tsx
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 pb-28 md:pl-64">{children}</div>
      <footer
        data-testid="dashboard-footer"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-zinc-800 bg-zinc-950 py-4 md:left-64"
      >
        <div className="mx-auto max-w-6xl px-6 text-center font-mono text-xs leading-relaxed text-muted">
          <p>
            Las recomendaciones emitidas por este sistema son de carácter informativo y educativo. Los resultados
            se basan en el Marco Argumentativo Financiero (FAF) y no constituyen asesoría financiera personalizada.
          </p>
          <p className="mt-2 font-bold text-zinc-50">
            FAF - Marco Argumentativo Financiero - Desarrollado por Javier M. Debórtoli.
          </p>
        </div>
      </footer>
    </div>
  );
}
```

### `app/dashboard/crypto/page.tsx` (current lines 41-46)

Before:
```tsx
      <OverviewClient />

      <footer className="border-t border-zinc-800 pt-6 font-mono text-xs text-muted">
        Trabajo de tesis — FAF Platform. σ, γ, ρ computados por el motor de decisión determinístico; θ = 0.67.
      </footer>
    </main>
```

After:
```tsx
      <OverviewClient />
    </main>
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| E2E — branding | "Plataforma FAF" + subtitle visible above market groups, desktop + mobile | New `describe('Sidebar branding')` in `market-nav.spec.ts` |
| E2E — shared footer | Identical footer copy on `crypto` and a placeholder route | New `describe('Shared dashboard footer')` in `market-nav.spec.ts` |
| E2E — old footer removed | "Trabajo de tesis" text absent everywhere | Same describe block |
| E2E — layout safety | Fixed footer never overlaps content, desktop + 375px viewport | Same describe block, `getBoundingClientRect()`-based assertion |
| Unit/Integration | None needed — pure JSX/copy/CSS change, no new logic | N/A |

Concrete additions to `tests/e2e/market-nav.spec.ts`:

```ts
test.describe('Sidebar branding', () => {
  test('desktop nav shows "Plataforma FAF" + subtitle above the market groups', async ({ page }) => {
    await gotoCrypto(page);
    const branding = page.getByTestId('sidebar-desktop-nav').getByTestId('sidebar-branding');
    await expect(branding).toBeVisible();
    await expect(branding.getByRole('heading', { name: 'Plataforma FAF' })).toBeVisible();
    await expect(branding).toContainText('Recomendaciones financieras explicables en tiempo real');
  });
});
```

Inside the existing `Mobile navigation drawer` > `below md breakpoint` block:
```ts
    test('drawer also shows the "Plataforma FAF" branding block', async ({ page }) => {
      await gotoCrypto(page);
      await page.getByTestId('sidebar-mobile-toggle').click();
      const branding = page.getByTestId('sidebar-mobile-drawer').getByTestId('sidebar-branding');
      await expect(branding).toBeVisible();
      await expect(branding).toContainText('Plataforma FAF');
    });
```

```ts
test.describe('Shared dashboard footer', () => {
  test('renders identical footer copy on /dashboard/crypto and a placeholder-market route', async ({ page }) => {
    await gotoCrypto(page);
    const footer = page.getByTestId('dashboard-footer');
    await expect(footer).toContainText('carácter informativo y educativo');
    await expect(footer).toContainText('Desarrollado por Javier M. Debórtoli.');
    const cryptoFooterText = await footer.innerText();

    await page.goto('/dashboard/acciones');
    await expect(page.getByTestId('dashboard-footer')).toHaveText(cryptoFooterText);
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
  }
});
```

No changes needed in `dashboard.spec.ts` — its scenarios are Tier 1/Tier 2
decision-data behavior, orthogonal to shell branding/footer.

## Threat Matrix

N/A — no routing, shell command, subprocess, VCS/PR automation,
executable-file classification, or process-integration boundary. This
change is JSX/Tailwind-only inside three already-trusted React components
under `app/`.

## Migration / Rollout

No data migration, no feature flag, no schema change. Single small PR
(3 source files + spec + one test file, well under the 400-line review
budget per `proposal.md`'s own estimate). Fully revertible: reverting the PR
restores the old per-page footer and the branding-less sidebar with no
follow-up cleanup required.

## Open Questions

- [ ] None blocking. Two non-blocking product questions from `proposal.md`
      (attribution-line linking, final-copy sign-off) remain open per that
      document's stated defaults (plain text, copy treated as final).
