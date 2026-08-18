import { redirect } from 'next/navigation';

/**
 * `market-nav-redesign` design.md "Bare `/dashboard` resolves via `redirect()`,
 * not route-group index or alias" (Phase 1, task 1.4). The Tier 1 overview now
 * lives at `/dashboard/crypto` (`app/dashboard/crypto/page.tsx`) — the
 * canonical route for the one market with real backend data.
 *
 * Routing note (deviation from design.md — see apply-progress "Deviations from
 * Design"): `app/(dashboard)` is a Next.js *route group* (parenthesized folder
 * name), so it contributes NO URL segment — this file has always mapped to `/`
 * (root), never to a literal `/dashboard` path. It is kept as a redirect too
 * (rather than deleted) purely so the pre-existing bookmarked `/` URL keeps
 * working — the actual `/dashboard` and `/dashboard/crypto` URLs the spec
 * requires are served by the real (non-parenthesized) `app/dashboard/` segment
 * added alongside this route group.
 */
export default function DashboardIndexPage() {
  redirect('/dashboard/crypto');
}
