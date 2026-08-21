/**
 * `inicio-home-section` design.md "Footer exclusion mechanism" — carries the
 * `pb-48` content-spacing wrapper and the shared `<footer>`, moved verbatim
 * (same copy, className, `data-testid="dashboard-footer"`) out of
 * `app/dashboard/layout.tsx`. Wraps `crypto/` and `[market]/` only — Inicio
 * (`app/dashboard/inicio/page.tsx`) stays outside this route group and never
 * renders the footer. Route groups contribute no URL segment, so this split
 * is fully URL-neutral: `/dashboard/crypto` and `/dashboard/{market-slug}`
 * resolve exactly as before.
 *
 * `pb-48` moves here from the parent layout's content wrapper because its
 * only purpose — reserving space above the fixed-position footer — is now
 * scoped to routes that actually render that footer.
 */
export default function WithFooterLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="pb-48">{children}</div>
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
    </>
  );
}
