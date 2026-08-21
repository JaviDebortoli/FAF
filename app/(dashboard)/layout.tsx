/**
 * `market-nav-redesign` design.md "Route Structure" (Phase 1, task 1.5) —
 * bare passthrough for this PR only. This route group only wraps the root `/`
 * redirect shim now (see the routing note in `page.tsx` in this same folder,
 * and `app/dashboard/(with-footer)/crypto/page.tsx`, for why the real
 * `/dashboard/*` routes live in the sibling `app/dashboard/` segment with
 * their own layout instead).
 */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <div className="flex-1">{children}</div>
    </div>
  );
}
