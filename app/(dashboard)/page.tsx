import { OverviewClient } from './components/OverviewClient';

/**
 * design.md "Component Architecture" — Server Component: static chrome
 * (title, thesis framing, footer/AI disclaimer context) rendered server-side
 * so it is present even if hydration fails, plus the `OverviewClient` client
 * island that owns the fetch/poll/filter/selection state. Tier 1 only: zero
 * LLM text, zero node-edge graph (requirement "LLM narrative and graph
 * visualization confined to Tier 2").
 */
export default function DashboardPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-8 px-6 py-10">
      <header className="flex flex-col gap-2 border-b border-zinc-800 pb-6">
        <span className="font-mono text-xs uppercase tracking-[0.3em] text-muted">FAF · Panel de decisiones</span>
        <h1 className="text-2xl font-semibold text-zinc-50">Recomendaciones activas</h1>
        <p className="max-w-2xl text-sm text-zinc-400">
          Cada tarjeta muestra una recomendación BUY/SELL derivada de forma determinística por el
          framework argumentativo. Esta vista no contiene texto generado por IA.
        </p>
      </header>

      <OverviewClient />

      <footer className="border-t border-zinc-800 pt-6 font-mono text-xs text-muted">
        Trabajo de tesis — FAF Platform. σ, γ, ρ computados por el motor de decisión determinístico; θ = 0.67.
      </footer>
    </main>
  );
}
