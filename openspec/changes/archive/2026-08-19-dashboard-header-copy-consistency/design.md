# Design: Dashboard Header Copy Consistency

## Technical Approach

Extract a shared `DashboardHeader` component and use it from both
`app/dashboard/crypto/page.tsx` and `app/dashboard/[market]/page.tsx`. Both
files currently render near-identical `<header>` markup that has already
drifted once (the disclaimer exists only on crypto today) — that drift is
the root cause this change fixes. Centralizing the header removes the
possibility of the two copies re-diverging, at the cost of one new ~20-line
file. Both page components stay server components (no `'use client'`
needed); `DashboardHeader` is pure markup with no state.

## Architecture Decisions

### Decision: Extract shared `DashboardHeader` component

**Choice**: Create `app/(dashboard)/components/DashboardHeader.tsx` with a
`title: string` and `showDisclaimer?: boolean` prop contract, used by both
page files.

**Alternatives considered**: Keep the ~6-line header JSX duplicated inline
in both page files (zero new files, matches "tiny change" framing).

**Rationale**: The disclaimer already silently diverged between these two
files once — that divergence is literally why this change exists. Keeping
duplication reintroduces the exact drift risk being fixed. The repo already
has a DRY precedent for shared `/dashboard/*` chrome (`MarketPlaceholder.tsx`
for the "próximamente" block), so extraction follows established
convention rather than inventing a new pattern. The cost (1 file, 2 import
edits) is low relative to the risk removed.

### Decision: `title` prop instead of a `market: Market` prop

**Choice**: `DashboardHeader` takes a plain `title: string`, not a `Market`
object.

**Alternatives considered**: Pass the full `Market` (or `market.label`)
object through, since `[market]/page.tsx` already has one in scope.

**Rationale**: `crypto/page.tsx` has no `Market` object in scope today (it
renders `OverviewClient`, not a market-driven flow) and only needs it for
the header. A `title: string` prop keeps `DashboardHeader` decoupled from
`lib/markets.ts` and lets the crypto page pass
`MARKETS.crypto.label` directly, mirroring how `[market]/page.tsx` passes
`market.label` — same call shape, no `Market`-shaped coupling in the
component itself.

## Data Flow

    MARKETS.crypto.label ──┐
                            ├──→ DashboardHeader({ title, showDisclaimer }) ──→ <header>
    market.label (route) ──┘
                                (eyebrow "Panel de decisiones" is a fixed
                                 literal inside DashboardHeader, not a prop)

## File Changes

| File | Action | Description |
|------|--------|--------------|
| `app/(dashboard)/components/DashboardHeader.tsx` | Create | Shared header: fixed eyebrow "Panel de decisiones", `title` prop → `<h1>`, optional disclaimer `<p>` gated by `showDisclaimer` |
| `app/dashboard/crypto/page.tsx` | Modify | Import `MARKETS` from `@/app/(dashboard)/lib/markets`; replace inline `<header>` with `<DashboardHeader title={MARKETS.crypto.label} showDisclaimer />` |
| `app/dashboard/[market]/page.tsx` | Modify | Replace inline `<header>` with `<DashboardHeader title={market.label} showDisclaimer />` |
| `tests/e2e/market-nav.spec.ts` | Modify | Lines 246, 348: `toContainText('Recomendaciones activas')` → `toContainText('Criptomonedas')` |

## Interfaces / Contracts

```tsx
interface DashboardHeaderProps {
  /** Rendered as the <h1>. Callers pass `MARKETS[slug].label` — no new
   * hardcoded market-name literals. */
  title: string;
  /** When true, renders the determinism disclaimer paragraph verbatim
   * below the title. Defaults to false (opt-in, not opt-out) so a future
   * caller doesn't inherit it silently. */
  showDisclaimer?: boolean;
}

export function DashboardHeader({ title, showDisclaimer = false }: DashboardHeaderProps) {
  return (
    <header className="flex flex-col gap-2 border-b border-zinc-800 pb-6">
      <span className="font-mono text-xs uppercase tracking-[0.3em] text-muted">
        Panel de decisiones
      </span>
      <h1 className="text-2xl font-semibold text-zinc-50">{title}</h1>
      {showDisclaimer && (
        <p className="max-w-2xl text-sm text-zinc-400">
          Cada tarjeta muestra una recomendación BUY/SELL derivada de forma determinística por el
          framework argumentativo. Esta vista no contiene texto generado por IA.
        </p>
      )}
    </header>
  );
}
```

Both current call sites pass `showDisclaimer` (unconditionally `true`) per
the binding scope — every market view shows the disclaimer, not just
crypto. `showDisclaimer` stays a prop (not hardcoded `true` inside the
component) so the component itself doesn't encode a policy about which
views get it.

## Testing Strategy

| Layer | What to Test | Approach |
|-------|--------------|----------|
| E2E | `/dashboard/crypto` shows "Criptomonedas" h1, not "Recomendaciones activas" | Update existing assertions at `tests/e2e/market-nav.spec.ts:246,348` |
| E2E (manual/existing coverage gap) | `/dashboard/[market]` placeholder views show the disclaimer | No existing test asserts disclaimer presence on placeholder routes; not adding new E2E coverage — out of scope per proposal (existing suite has no assertion on this paragraph today, so none breaks) |
| Visual | Eyebrow reads "Panel de decisiones" (no "FAF · ") on both route types | Covered implicitly by any test asserting header content; no dedicated assertion exists today, none required |

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file
classification, or process-integration boundary. This is a presentational
copy/component change only.

## Migration / Rollout

No migration required. Single-PR change: create `DashboardHeader.tsx`,
update both page files and the two e2e assertions together, since the
assertions and the h1 copy change are coupled (per exploration's risk
note). Revert is a straight file revert.

## Open Questions

None — proposal's two open questions are resolved: disclaimer ships
verbatim on every view (binding instruction), and this document finalizes
the shared-component decision (extraction, not duplication).
