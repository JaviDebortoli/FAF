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
 */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 pb-48 md:pl-64">{children}</div>
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
