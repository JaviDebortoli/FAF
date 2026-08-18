/**
 * `market-nav-redesign` design.md "Route Structure" (Phase 1, task 1.5) —
 * bare passthrough for this PR only. Establishes the real `/dashboard`
 * segment's layout so `/dashboard/crypto` and future `/dashboard/{market}`
 * routes share a layout boundary; renders no navigation UI yet. PR2 (Phase 2,
 * task 2.6) replaces the inner wrapper with `<Sidebar/>` and a `md:pl-64`
 * content offset — do not add that here.
 *
 * Lives under the real (non-parenthesized) `app/dashboard/` segment — see the
 * routing note in `app/dashboard/crypto/page.tsx`.
 */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <div className="flex-1">{children}</div>
    </div>
  );
}
