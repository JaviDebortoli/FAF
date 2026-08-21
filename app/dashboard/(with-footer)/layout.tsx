/**
 * `inicio-home-section` design.md "Footer exclusion mechanism" — carries the
 * `pb-48` content-spacing wrapper and the shared `<footer>`, moved verbatim
 * (same copy, className, `data-testid="dashboard-footer"`) out of
 * `app/dashboard/layout.tsx`. Route groups contribute no URL segment, so this
 * split is fully URL-neutral: `/dashboard/crypto`, `/dashboard/{market-slug}`,
 * and `/dashboard/inicio` all resolve exactly as before.
 *
 * `pb-48` moves here from the parent layout's content wrapper because its
 * only purpose — reserving space above the fixed-position footer — is now
 * scoped to routes that actually render that footer.
 *
 * `dashboard-cleanup-and-footer-revert` — now also wraps
 * `inicio/page.tsx`, which moved into this route group so `/dashboard/inicio`
 * shares the same footer as `crypto/` and `[market]/` (previously it stayed
 * outside this group and rendered no footer at all).
 */
export default function WithFooterLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* `inicio-visual-and-scroll-fix` — this `pb-48` (12rem = 192px) is
          coupled to the `min-h-[calc(100vh-12rem)]` classNames on
          `crypto/page.tsx`'s and `[market]/page.tsx`'s `<main>` elements: both
          reuse this exact `12rem` literal so their content floor stays in
          sync with the space reserved here for the fixed footer below. No
          compile-time enforcement of this coupling — if `pb-48` ever changes,
          update both `<main>` classNames to match (same convention as
          `BETA_MS`'s cross-file coupling comment, `cycle-cache-ttl-6h`). */}
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
