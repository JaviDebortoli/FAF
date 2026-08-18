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
 */
export default function DashboardIndexPage() {
  redirect('/dashboard/crypto');
}
