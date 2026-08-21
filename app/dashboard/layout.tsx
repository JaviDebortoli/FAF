import { Sidebar } from '@/app/(dashboard)/components/Sidebar';

/**
 * `market-nav-redesign` design.md "Route Structure" (Phase 2, task 2.6) —
 * renders the desktop `<Sidebar/>` alongside `{children}`, with a `md:pl-64`
 * content offset matching the sidebar's fixed `md:w-64` width (see
 * `Sidebar.tsx`). Sidebar is hidden below the `md:` breakpoint in this PR
 * (Phase 2/PR2 is desktop-only per `tasks.md` task 2.5); Phase 4/PR4 adds the
 * mobile hamburger/drawer without changing this layout shell.
 *
 * Lives under the real (non-parenthesized) `app/dashboard/` segment — this is
 * the corrected wiring target from PR1's routing-correction advisory (see
 * `app/dashboard/crypto/page.tsx`'s header comment and PR1's apply-progress):
 * `app/(dashboard)/layout.tsx` only wraps the root `/` redirect shim and is
 * NOT where `<Sidebar/>` belongs, since it contributes no `/dashboard/*` URL
 * segment.
 *
 * `inicio-home-section` design.md "Footer exclusion mechanism" — the shared
 * `<footer>` and its `pb-48` spacing were moved out of this layout into
 * `app/dashboard/(with-footer)/layout.tsx`, a nested route group wrapping
 * `crypto/` and `[market]/` only. This file now stays a plain Server
 * Component shell (`<Sidebar/>` + a content wrapper) shared by every
 * `/dashboard/*` route including the new Inicio route, which intentionally
 * sits outside `(with-footer)/` and therefore never renders the footer
 * (specs/market-navigation/spec.md "Shared shell footer" — Inicio exception).
 */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 md:pl-64">{children}</div>
    </div>
  );
}
