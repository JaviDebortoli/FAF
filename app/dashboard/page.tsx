import { redirect } from 'next/navigation';

/**
 * `market-nav-redesign` design.md "Bare `/dashboard` resolves via `redirect()`,
 * not route-group index or alias" (Phase 1, task 1.4). Satisfies
 * `specs/market-navigation/spec.md`'s "Bare /dashboard never 404s" scenario and
 * `specs/decision-dashboard/spec.md`'s "Bare /dashboard redirects to the
 * canonical route" scenario literally at the URL `/dashboard`.
 *
 * Lives under the real (non-parenthesized) `app/dashboard/` segment — see the
 * routing note in `app/dashboard/crypto/page.tsx` for why the route group
 * `app/(dashboard)/` cannot host this URL.
 *
 * `inicio-home-section` design.md — retargeted from `/dashboard/crypto` to
 * `/dashboard/inicio`: bare `/dashboard` now lands on the new Inicio landing
 * page first, not directly on the Tier 1 overview
 * (specs/decision-dashboard/spec.md "Crypto dashboard route under market
 * navigation" — "Bare /dashboard lands on Inicio, not the overview directly").
 */
export default function DashboardIndexPage() {
  redirect('/dashboard/inicio');
}
