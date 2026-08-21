# Exploration: dashboard-content-polish

Bundles 4 related UI/content changes into one SDD flow, following directly on `inicio-home-section` (archived at `openspec/changes/archive/2026-08-21-inicio-home-section/`).

## Point 1+2 — Inicio page: heading redundancy + placeholder content replacement

### Current State (`app/dashboard/inicio/page.tsx`, 48 lines, Server Component)
```tsx
<header className="flex flex-col gap-2 border-b border-zinc-800 pb-6">
  <span className="font-mono text-xs uppercase tracking-[0.3em] text-muted">Plataforma FAF</span>
  <h1 className="text-2xl font-semibold text-zinc-50">Bienvenido a la Plataforma FAF</h1>
</header>
<div className="flex max-w-2xl flex-col gap-4 text-sm text-zinc-400">
  <p>FAF (Marco Argumentativo Financiero) es un framework de decisión determinístico: cada recomendación BUY/SELL se deriva combinando evidencia técnica (γ, ρ) sobre un umbral fijo θ = 0.67, sin texto generado por IA en el cálculo central de la decisión.</p>
  <p>Actualmente el único mercado con datos reales en producción es Criptomonedas — el resto de los mercados listados en el menú lateral son vistas "próximamente".</p>
</div>
<Link href="/dashboard/crypto" className="w-fit rounded-md border border-buy bg-buy/10 px-4 py-2 text-sm font-semibold text-buy transition-colors hover:bg-buy/20">Ver panel de Criptomonedas →</Link>
```
Eyebrow `<span>` = "Plataforma FAF". `<h1>` = "Bienvenido a la Plataforma FAF" — repeats "Plataforma FAF" from the eyebrow directly above it, and `Sidebar.tsx`'s branding block already shows "Plataforma FAF" as its title, so the phrase appears 3x on screen simultaneously.

`DecisionCard.tsx`'s own doc comment establishes the card aesthetic to reuse: "Instrument-panel visual language: hairline border, flat `rounded-md`, no shadow/gradient" → `border border-zinc-800 bg-zinc-950 rounded-md`, `p-4`/`p-5` padding, `text-zinc-400`/`text-zinc-300` body text. `DrilldownPanel.tsx` root uses the identical pattern (`rounded-md border border-zinc-800 bg-zinc-950 p-5`).

### Test impact
`tests/e2e/market-nav.spec.ts:231` — `await expect(page.getByRole('heading', { name: /Bienvenido/ })).toBeVisible();` — asserts the `<h1>` matches `/Bienvenido/`. If the new heading text does not contain "Bienvenido", this test breaks and MUST be updated as part of this change (test-impact item, not a spec conflict — the test targets implementation text, not a spec requirement).

### Spec check
No `openspec/specs/*.md` requirement pins the exact Inicio `<h1>` text or body copy. `decision-dashboard/spec.md` only requires bare `/dashboard` to land on `/dashboard/inicio` (route-level, unaffected). This is an unconstrained implementation detail — no spec delta needed for the copy itself.

### Recommendation — concrete draft copy
New `<h1>` (drop "Plataforma FAF", keep it a welcome message):
> "Bienvenido"

(simplest fix — literally the word the e2e test already regex-matches on, zero test churn beyond confirming the match still passes; if a fuller phrase is preferred: "Bienvenido — así funciona la plataforma" also satisfies `/Bienvenido/` and adds context without repeating the branding phrase).

New body: replace the flat `<div className="max-w-2xl">` list of two `<p>` with the `DecisionCard`/`DrilldownPanel` card pattern:
```tsx
<div className="flex flex-col gap-4 rounded-md border border-zinc-800 bg-zinc-950 p-5 text-sm text-zinc-400">
  <p>
    FAF es una plataforma de recomendaciones de trading que no usa un modelo de lenguaje para decidir
    qué comprar o vender. Cada recomendación BUY/SELL surge de un pipeline determinístico de 4 capas
    (ingesta de datos de mercado → indicadores técnicos → reglas argumentativas → agregación de
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
```
Grounded against real code: γ/ρ (`Label` interface, `src/domain/types.ts`), θ=0.67 (`Decision.thresholds.theta`, `src/domain/types.ts` + `openspec/specs/decision-policy/spec.md`), σ⁺/σ⁻ and `gap = |σ⁺ − σ⁻|` (`lib/scores.ts:28`, already displayed with this exact notation in `ThesisScores.tsx:39` — `gap |σ⁺ − σ⁻|`), 4 indicators RSI/MACD/SMA/BOLLINGER (`EvidencePredicate` type), AI-narrative-has-its-own-disclaimer (`decision-narrative/spec.md` "Visible AI-generated disclaimer" requirement + `narrative-ai-disclaimer` testid in `dashboard.spec.ts`). Nothing above contradicts the "no AI in the core decision" claim already established by the existing disclaimer copy in `DashboardHeader.tsx`.

## Point 3A — Market header disclaimer width

### Current State
`DashboardHeader.tsx` (shared by crypto view + every placeholder market view):
```tsx
{showDisclaimer && (
  <p className="max-w-2xl text-sm text-zinc-400">
    Cada tarjeta muestra una recomendación BUY/SELL derivada de forma determinística por el
    framework argumentativo. Esta vista no contiene texto generado por IA.
  </p>
)}
```
`max-w-2xl` = 672px, hardcoded on the `<p>` only (not on the `<header>`). The card grid below, in `OverviewClient.tsx:131`, has no max-width of its own:
```tsx
<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
```
It inherits the width of the page's `<main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-8 px-6 py-10">` (both `crypto/page.tsx` and `[market]/page.tsx` use this exact `<main>` className). So on any viewport wider than ~672px + page padding, the disclaimer paragraph visibly stops short of the grid's right edge — confirmed mismatch.

### Spec check
`market-navigation/spec.md` "Determinism disclaimer appears on every market view" pins the disclaimer's **text** byte-for-byte identical across every market view, and it's e2e-tested (`market-nav.spec.ts` "crypto view shows the determinism disclaimer" / "placeholder-market page shows the determinism disclaimer, identical to crypto"). Neither the spec nor the tests assert anything about the `<p>`'s CSS class or width — only `toContainText`/copy equality. Removing/widening `max-w-2xl` is therefore a pure implementation detail, no spec delta required, no text change, no test risk (tests check copy, not layout).

### Recommendation
Drop `max-w-2xl` from the `<p>` entirely (let it inherit the full `<header>`/`<main>` width, same as the eyebrow/h1 above it and the grid below it) — simplest, zero new constants, matches "everything else on the page has no per-element max-width, only the outer `<main>` does" precedent.

## Point 3B — Gauge legend (ScoreGauge / DecisionCard elements explained)

### Current State — exact rendered elements (grounded in full file reads)
`DecisionCard.tsx` per card: `RecommendationBadge` (BUY/SELL text badge, buy=green `#22c55e`/`border-buy`, sell=rose `#f43f5e`/`border-sell`) → `ScoreGauge` → a line with `gap {gap.toFixed(3)}` (left) and `θ {theta.toFixed(2)}` (right) → `Sparkline`.

`ScoreGauge.tsx` renders, inside one semicircular `<svg>` (`GAUGE_VIEWBOX = '0 0 200 110'`, `lib/gauge.ts`):
- A static background arc (0..1 semicircle, always the same, `stroke-zinc-200`).
- One amber tick (`stroke="var(--color-threshold)"`, `#eab308`) at the angle corresponding to `theta` (always 0.67 currently — `Decision.thresholds.theta` is typed as the literal `0.67`).
- Two needles from the same center point: `needleMinusPath` in `var(--color-sell)` (`#f43f5e`, rose/pink, `strokeWidth 2.5`, `opacity 0.85`) at the angle for `sigmaMinus` (σ⁻/bearish score), and `needlePlusPath` in `var(--color-buy)` (`#22c55e`, green, `strokeWidth 3`, drawn on top / fully opaque) at the angle for `sigmaPlus` (σ⁺/bullish score). Both needles use the identical 0→1 mapping (`angleForValue`): value 0 = leftmost, value 1 = rightmost.
- `aria-label` already states this verbatim: `"sigma+ {X}, sigma- {Y}, theta {Z}"`.

Below the gauge, the card already labels `gap {gap.toFixed(3)}` — `lib/scores.ts:28` computes `gap = Math.abs(sigmaPlus - sigmaMinus)`, i.e. the numeric distance between the two needles. `ThesisScores.tsx` (Tier 2 only) already uses the exact notation `gap |σ⁺ − σ⁻|` for this same value — a precedent to reuse.

`Sparkline.tsx` is a plain line chart of `decision.trace.candles[].close` — no legend-worthy elements beyond "price trend", not gauge-specific.

### Placement — confirmed
Since this concerns elements repeated identically on every Tier 1 card, a one-time page-level explanation (not per-card) is correct — placing it in the market view header area alongside the (now full-width, per 3A) disclaimer paragraph in `DashboardHeader.tsx` avoids repeating the same text N times per grid and keeps it in the one place already established for view-level explanatory copy (`showDisclaimer`).

### Recommendation — concrete draft copy (append as a 2nd paragraph under the existing disclaimer, gated by the same `showDisclaimer` prop — do not create a second boolean prop)
> "El indicador semicircular de cada tarjeta muestra dos agujas: la verde (σ⁺) mide la evidencia a favor de comprar y la roja (σ⁻) la evidencia a favor de vender, ambas entre 0 y 1. La marca ámbar indica el umbral de decisión θ = 0.67: la aguja que lo supera y aventaja a la otra define la recomendación. El valor "gap" es la distancia entre ambas agujas (|σ⁺ − σ⁻|) — cuanto mayor, más clara es la señal."

Every claim is grounded in the real component: green=σ⁺/buy, rose=σ⁻/sell (`--color-buy`/`--color-sell` in `globals.css`), amber tick=θ (`--color-threshold`), θ=0.67 (`Decision.thresholds.theta`), gap=|σ⁺−σ⁻| (`lib/scores.ts:28`, matches existing `ThesisScores.tsx` notation). Does not duplicate the "gap 0.xxx" / "θ 0.67" numeric labels already on the card — only explains what they mean, once, at the page level.

### Spec check
No spec pins gauge-legend copy — new/optional. `decision-policy/spec.md` should be checked for the exact θ=0.67 canonical wording before finalizing the sentence (not yet read in this pass — flag for `sdd-spec` phase to cross-check formula wording matches the FAF paper per `openspec/config.yaml`'s "Formulas and thresholds... must match the FAF paper exactly" rule).

## Point 4 — Drilldown panel width + graph size

### Current State
`DrilldownPanel.tsx` dialog root:
```tsx
className="flex max-h-[90vh] w-full max-w-2xl flex-col gap-4 overflow-y-auto rounded-md border border-zinc-800 bg-zinc-950 p-5"
```
Outer overlay: `<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" ...>` — the dialog is centered with `w-full max-w-2xl` (672px cap) inside a `p-4`-padded full-viewport flex container.

`ArgumentGraph.tsx` SVG root:
```tsx
<svg role="img" viewBox={layout.viewBox} preserveAspectRatio="xMidYMid meet" ... className="h-auto w-full shrink-0 text-zinc-700">
```
`layout.viewBox` = `GRAPH_VIEWBOX = '0 0 720 380'` (fixed constant, `graphLayout.ts:11`), a fixed 720:380 (≈1.89:1) aspect ratio. With `w-full` + `h-auto` + `preserveAspectRatio="xMidYMid meet"`, the SVG's rendered pixel size is a pure function of its container's width — there is no independent sizing logic, no JS measurement, and no other file touches the graph's rendered size. **Confirmed single-lever fix**: widening `DrilldownPanel`'s `max-w-2xl` proportionally enlarges everything inside the SVG (node circles, rule-id labels, edges) because it's all defined in the fixed 720×380 coordinate space and scaled uniformly by the browser.

### Viewport/overflow risk — confirmed safe
`playwright.config.ts` uses a single `chromium`/`Desktop Chrome` project (no explicit `viewport` override → Playwright's Desktop Chrome default, 1280×720). `tests/e2e/market-nav.spec.ts` additionally runs explicit mobile-width assertions at `375×812` ("Mobile navigation drawer" suite) and a responsive sweep at `[{1280,800}, {375,812}]` — but none of those tests target `DrilldownPanel` or assert on its width class; they cover the sidebar/hamburger drawer only.

Crucially, the dialog root already combines `w-full` with `max-w-2xl` — `w-full` means the dialog's actual width is `min(100% of the p-4-padded overlay, max-w value)`. On a 375px-wide viewport the dialog is already constrained to ~343px (375 − 2×16px padding) regardless of whether `max-w-2xl` (672px) or a larger `max-w-4xl` (896px)/`max-w-5xl` (1024px) is used — the `max-w-*` class only becomes the binding constraint once the viewport is wider than that value. So raising `max-w-2xl` → `max-w-4xl`/`max-w-5xl` cannot cause new horizontal overflow on any tested or plausible viewport; it only takes effect on desktop-width screens, which is exactly the "rules not legible" case being fixed.

### Recommendation
`max-w-2xl` (672px) → `max-w-4xl` (896px). Reasoning: `max-w-4xl` stays safely under the 1280px baseline Playwright desktop viewport (896px + 2×16px overlay padding + typical scrollbar = well under 1280px, no risk of horizontal scroll on the tested desktop size), roughly a +33% width increase vs. today — if the "rules not legible" complaint needs more, `max-w-5xl` (1024px) is the next step and is still safely under 1280px. Given the user's stated priority (legibility) plus the secondary ask (less vertical scrolling once narrative streams in — a wider panel lets `ArgumentGraph` occupy proportionally less vertical space for the same width, leaving more of the `max-h-[90vh]` budget for `NarrativePanel` text), recommend `max-w-4xl` as the balanced first choice, `max-w-5xl` as an explicit alternative if the reviewer wants a larger jump.

No other file needs to change for the graph to visibly enlarge — confirmed single-lever fix (just the one className on `DrilldownPanel.tsx`'s dialog root).

### Test impact
`tests/e2e/dashboard.spec.ts`'s "graph-node-* must stay visible / bounding box > 4px during narrative streaming" test does not assert on `max-w-2xl` or any pixel-width value — only that graph nodes remain visible with `boundingBox().height > 4`. Widening the panel only increases available space, so this test should still pass (very likely to pass more comfortably) — flagged as a regression-risk test to explicitly re-run after the width change, not one that needs editing.

### Spec check
No spec pins `DrilldownPanel`'s `max-w-2xl` value or the graph's rendered pixel size — implementation detail, no spec delta needed.

## Affected Areas (all 4 points)

- `app/dashboard/inicio/page.tsx` — new `<h1>` text, new card-wrapped body content (points 1, 2).
- `app/(dashboard)/components/DashboardHeader.tsx` — remove/widen `max-w-2xl` on disclaimer `<p>`, add gauge-legend paragraph (points 3A, 3B).
- `app/(dashboard)/components/DrilldownPanel.tsx` — `max-w-2xl` → `max-w-4xl` (or `max-w-5xl`) on dialog root className (point 4).
- `tests/e2e/market-nav.spec.ts` — line 231 heading regex `/Bienvenido/` needs re-verification against new copy (point 2); disclaimer copy-equality tests unaffected by width/legend changes since they check `toContainText`/exact copy, not layout — but the NEW gauge-legend paragraph text, once finalized, could optionally get its own new assertion.
- `tests/e2e/dashboard.spec.ts` — graph-node visibility/bounding-box test to re-run as regression check post-width-change (point 4); no edit expected, but explicitly flagged.
- No `openspec/specs/*/spec.md` requires a MODIFIED delta for any of the 4 points — all 4 are unconstrained implementation/copy details, not spec-pinned behavior. (Exception to double-check in `sdd-spec`: `decision-policy/spec.md`'s exact θ=0.67 wording, for point 3B's legend copy accuracy per `openspec/config.yaml`'s "match the FAF paper exactly" rule.)

## Risks

- Point 2's heading change breaks `market-nav.spec.ts:231`'s `/Bienvenido/` regex unless the new heading retains that word (mitigated by recommending "Bienvenido" as the literal new heading, or any phrase containing it).
- Point 3B's legend copy must stay consistent with `decision-policy/spec.md`'s canonical θ/σ wording — not yet cross-checked against that spec file in this pass; flag for `sdd-spec`.
- Point 4's `max-w-4xl` vs `max-w-5xl` choice is a judgment call with no hard viewport-test lower bound found beyond the 1280px desktop default and the 375px mobile suite (both confirmed safe) — no viewport between 672px and 1280px is explicitly tested, so a manual/visual check at common in-between widths (e.g. 768px tablet) is advisable during apply, though `w-full` already bounds the practical risk.
- All 4 points touch existing tested surfaces (`DashboardHeader`, `DrilldownPanel`, Inicio page) with real e2e coverage — no untested blast radius, but copy-content assertions (`toContainText` for the disclaimer) must remain byte-for-byte correct if the paragraph is only widened, not reworded.

## Ready for Proposal

Yes. All 4 points have confirmed current-state readings, concrete before/after code, draft copy grounded in real component data, spec-conflict checks (none require MODIFIED spec deltas except optionally cross-checking θ wording), and a test-impact catalog. Recommend `sdd-propose` next, carrying forward: the "Bienvenido" heading recommendation, the card-wrapped Inicio body draft, the `max-w-2xl` removal on the disclaimer, the gauge-legend paragraph draft (co-located with the disclaimer via the existing `showDisclaimer` prop), and `max-w-4xl` (with `max-w-5xl` as an explicit alternative) for `DrilldownPanel`.
