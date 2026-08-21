import { PipelineDiagram } from '@/app/(dashboard)/components/PipelineDiagram';

/**
 * `inicio-home-section` design.md — new default landing page for the FAF
 * platform. Static Server Component sibling of `app/dashboard/(with-footer)/crypto/page.tsx`,
 * intentionally NOT routed through `[market]/page.tsx` (Inicio is absent from
 * `MARKETS`/`MARKET_GROUPS` — it is not a market). Both redirect shims
 * (`app/dashboard/page.tsx`, `app/(dashboard)/page.tsx`) now land here first,
 * so a first-time visitor is oriented ("deterministic, non-AI argumentative
 * framework") before navigating into live market data via the sidebar
 * (`inicio-content-polish` — the former on-page CTA to `/dashboard/crypto`
 * was removed as a duplicate of the sidebar's Criptomonedas link).
 *
 * Uses a page-local heading (eyebrow `<span>` + `<h1>`), not `DashboardHeader`
 * — `DashboardHeader` is purpose-built for market views ("Panel de
 * decisiones" eyebrow + market-label `<h1>`); reusing it here would
 * misrepresent Inicio as a market panel (design.md "Architecture Decisions").
 *
 * `dashboard-cleanup-and-footer-revert` — moved into the
 * `app/dashboard/(with-footer)/` route group (URL-neutral) so the shared
 * `dashboard-footer` renders here identically to `crypto/`/`[market]/`
 * (specs/market-navigation/spec.md "Shared shell footer", reverting the
 * `inicio-home-section`-era exclusion). `<main>` uses
 * `min-h-[calc(100vh-12rem)]`, not `min-h-screen` — matching
 * `crypto/page.tsx`/`[market]/page.tsx` byte-for-byte — because this route is
 * now wrapped by `(with-footer)/layout.tsx`'s `pb-48` (12rem = 192px); using
 * `min-h-screen` here would double-count that spacing and reintroduce the
 * phantom-scroll bug `inicio-visual-and-scroll-fix` already fixed on the
 * other two routes.
 */
export default function InicioPage() {
  return (
    <main className="mx-auto flex min-h-[calc(100vh-12rem)] max-w-6xl flex-col gap-8 px-6 py-10">
      <header className="flex flex-col gap-2 border-b border-zinc-800 pb-6">
        <span className="font-mono text-xs uppercase tracking-[0.3em] text-muted">Plataforma FAF</span>
        <h1 className="text-2xl font-semibold text-zinc-50">
          Bienvenido! Recomendaciones determinísticas y explicables
        </h1>
      </header>
      <div className="flex flex-col gap-4 rounded-md border border-zinc-800 bg-zinc-950 p-5 text-base text-zinc-400">
        <p>
          FAF es una plataforma de recomendaciones de trading que no usa un modelo de lenguaje para decidir
          qué comprar o vender. Cada recomendación BUY/SELL surge de un pipeline determinístico de 4 capas
          (ingesta de datos de mercado, indicadores técnicos, reglas argumentativas y agregación de
          puntajes) que combina evidencia técnica (RSI, MACD, SMA, Bandas de Bollinger) sobre un umbral fijo
          θ = 0.67. El mismo dato de entrada siempre produce la misma recomendación.
        </p>
        <p>
          Este comportamiento se apoya en el <strong className="text-zinc-300">Marco Argumentativo Financiero
          (FAF)</strong>: cada regla técnica activada aporta un argumento a favor de la tesis alcista o
          bajista, con una etiqueta &lt;γ, ρ&gt; que mide certeza y refutación. Los argumentos de cada tesis
          se agregan en un puntaje σ (sigma); la tesis con mayor σ por encima del umbral θ gana, y la
          diferencia entre ambos puntajes (gap = |σ⁺ − σ⁻|) indica qué tan clara es la señal. El texto
          narrativo que acompaña cada recomendación sí puede ser generado por IA, pero se muestra siempre
          con su propio aviso — la decisión BUY/SELL nunca lo es.
        </p>
      </div>
      <PipelineDiagram />
    </main>
  );
}
