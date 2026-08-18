# Exploration: dashboard-shell-branding

## Current State

The `market-nav-redesign` change (archived `openspec/changes/archive/2026-08-18-market-nav-redesign/`) built the sidebar/market-routing shell from `new_dashboard_example/code.html` but never carried forward two mockup elements: the sidebar's top branding block and the shared fixed footer. Its own `exploration.md` (the 15-item mockup catalog) explicitly *noted* both differences at the time — item 3: "App title block 'Plataforma FAF' + tagline moves into the sidebar (was inline in current header)"; item 10: "Footer: mockup's is `fixed bottom-0` spanning `md:left-64`, adds personal attribution; current footer is static in-flow, different copy (mentions σ, γ, ρ, θ=0.67 explicitly)." Neither `design.md`'s "Architecture Decisions" nor its "Out of Scope / Non-Goals" section (`No replacement of the app's established visual identity`, `No Tier 2 UX redesign`, no backend/data-model changes) ever addresses either element — they were catalogued as a difference, then silently dropped between exploration and design. `design.md`'s Route Structure table says `crypto/page.tsx` was "moved verbatim from current page.tsx (header/OverviewClient/footer)" — i.e. the pre-existing (pre-mockup) header/footer text was preserved as-is, not reconciled with the mockup. Confirmed by direct grep: neither `openspec/specs/market-navigation/spec.md` nor `openspec/specs/decision-dashboard/spec.md` contains any requirement mentioning a sidebar title/subtitle or a footer/disclaimer/attribution — this is a genuine spec gap, not a reversal of a prior explicit decision.

### Exact mockup markup (`new_dashboard_example/code.html`)

Sidebar header (lines 130-133), sits as the first child of `<aside>`, above the `mb-6 border-t` divider and the `MERCADOS PRINCIPALES`/`MERCADO ARGENTINO` groups:
```html
<div class="mb-8 px-4">
  <h1 class="text-headline-md font-headline-md font-bold tracking-tighter text-primary">Plataforma FAF</h1>
  <p class="font-body-sm text-body-sm text-text-muted mt-1">Recomendaciones financieras explicables en tiempo real</p>
</div>
```

Footer (lines 464-466), a sibling of `<aside>`/`<main>` at the `<body>` level — one instance, not per-page:
```html
<footer class="fixed bottom-0 right-0 left-0 md:left-64 py-4 bg-surface-container-lowest dark:bg-surface-container-lowest border-t border-border-subtle z-30">
  <div class="flex flex-col md:flex-row justify-between items-center px-4 md:px-gutter w-full text-xs max-w-container-max mx-auto gap-4">
    <div class="text-text-muted font-mono-data text-mono-data text-center w-full leading-relaxed px-4">
      Las recomendaciones emitidas por este sistema son de carácter informativo y educativo. Los resultados se basan en el Marco Argumentativo Financiero (FAF) y no constituyen asesoría financiera personalizada.
      <br class="hidden md:block">
      <span class="text-primary font-bold mt-2 inline-block">FAF - Marco Argumentativo Financiero - Desarrollado por Javier M. Debórtoli.</span>
    </div>
  </div>
</footer>
```
Note `md:left-64` matches the current app's `Sidebar.tsx` fixed `md:w-64` and `layout.tsx`'s `md:pl-64` content offset exactly — no new width constant needed.

## Affected Areas

- `app/(dashboard)/components/Sidebar.tsx` — desktop `<nav>` (lines 85-91) currently renders `<MarketLinkGroups>` directly with no header block; the title/subtitle div needs to be inserted as the nav's first child, before the market groups. The mobile drawer (lines 111-128) already has its own "Mercados" label + close button — mockup has zero mobile sidebar, so whether to also inject branding there is an open design question, not dictated by the mockup.
- `app/dashboard/layout.tsx` — wraps `<Sidebar />` + `{children}` for every route under `/dashboard/*` (confirmed: both `app/dashboard/crypto/page.tsx` and `app/dashboard/[market]/page.tsx` are children of this exact layout, so a footer placed here is genuinely shared, DRY, and covers all ~10 routes in one edit). Currently renders only `<div className="flex min-h-screen"><Sidebar /><div className="flex-1 md:pl-64">{children}</div></div>` — no footer, no bottom padding reservation of any kind.
- `app/dashboard/crypto/page.tsx` (lines 43-45) — has the footer to be removed: `<footer className="border-t border-zinc-800 pt-6 font-mono text-xs text-muted">Trabajo de tesis — FAF Platform. σ, γ, ρ computados por el motor de decisión determinístico; θ = 0.67.</footer>`. This is in-flow (not fixed), scoped only to this page, and has zero test coverage referencing its text (grepped `tests/` — no matches), so removal is test-safe.
- `app/(dashboard)/components/MarketPlaceholder.tsx` / `app/dashboard/[market]/page.tsx` — confirmed no footer of any kind today; will inherit the shared layout footer for free once it's added to `layout.tsx`, with zero changes needed to these files themselves.

## Mechanics — Verified Not Assumed

- **Layout placement is correct and sufficient**: `app/dashboard/layout.tsx` is the one shared ancestor of every `/dashboard/*` route (verified via codegraph — `DashboardLayout` renders `<Sidebar/>` + `{children}`, and both `crypto/page.tsx` and `[market]/page.tsx` mount as `{children}` under it). A footer added once here reaches all ~10 routes without touching either page file.
- **Fixed-footer overlap risk is real, not hypothetical**: neither `crypto/page.tsx`'s `<main>` (`px-6 py-10`) nor `[market]/page.tsx`'s `<main>` (same classes) reserves any bottom space beyond ordinary padding. The mockup's own `<main>` only has `pb-stack-lg` (2rem) as extra bottom padding, and its footer is `py-4` with two lines of small text that can wrap further on narrow viewports — the mockup itself is not obviously over-provisioned. Since the current app's `<main>` has no bottom padding accounting for a fixed footer at all, replicating `fixed bottom-0` verbatim without adding bottom padding to the content wrapper (either on `layout.tsx`'s content div or on both page `<main>`s) risks the footer visually overlapping the last card row / placeholder text on short viewports. This must be added as part of this change, not assumed away.
- **θ/σ/γ/ρ values already have other homes in the UI** — removing the old crypto-page footer text does NOT strand this information: θ is shown per-card (`DecisionCard.tsx:41` `<span>θ {theta.toFixed(2)}</span>`) and in the gauge's `aria-label` (`ScoreGauge.tsx:23`); γ and ρ are shown in the Tier 2 drill-down (`ThesisScores.tsx:66,71` and `ArgumentGraph.tsx:82` node labels). The "esta vista no contiene texto generado por IA" / deterministic-framing disclaimer is *also* already present in `crypto/page.tsx`'s `<header>` (lines 35-38), independent of the footer. The one thing NOT preserved elsewhere is the literal phrase "Trabajo de tesis — FAF Platform" (thesis-work framing) — the mockup's footer replaces this with a different but analogous authorship line ("Desarrollado por Javier M. Debórtoli"), so authorship/provenance framing is not lost, only reworded. No test references the old footer text (confirmed via grep of `tests/`).
- **No prior explicit decision is being reversed**: `market-nav-redesign`'s `proposal.md` "Out of Scope / Non-Goals" and `design.md`'s "Architecture Decisions" never mention the sidebar title/subtitle or any footer/disclaimer/attribution concept. `specs/market-navigation/spec.md` and `specs/decision-dashboard/spec.md` (current, post-archive) contain zero requirements about either. This is a genuine, never-specified gap — the mockup catalog noted the difference but no downstream artifact ever turned it into a requirement or an explicit deferral.

## Approaches

1. **Add both elements directly, matching the mockup verbatim (copy + structure), restyled with the app's existing 5-token palette/zinc utilities (consistent with `market-nav-redesign`'s "Adapt, not Replace" visual-identity decision)** — sidebar branding block in `Sidebar.tsx`, shared footer in `app/dashboard/layout.tsx`, remove the old per-page footer from `crypto/page.tsx`, add bottom padding to prevent overlap.
   - Pros: Matches user's explicit instruction ("tal como muestra el ejemplo"); single shared footer eliminates the current inconsistency (present on crypto, absent on placeholders); small, surgical diff (3 files touched, no new routes/data).
   - Cons: None significant — this is squarely a gap-closing change with no architectural fork.
   - Effort: Low.

2. **Keep the old crypto-only footer and only add a separate new footer to placeholder pages** — rejected as it directly contradicts the user's explicit instruction that footer be shared/identical across ALL views, and perpetuates rather than fixes the current inconsistency.

There is no genuine architectural fork here — approach 1 is the only one consistent with the user's explicit direction and the verified mockup markup. No comparison table needed.

## Recommendation

Approach 1. Concretely: (a) insert the `mb-8 px-4` title/subtitle block as the first child of `Sidebar.tsx`'s desktop `<nav>`, restyled with existing tokens (`text-zinc-50`/`text-buy` or similar in place of MD3 `text-primary`, `text-muted` in place of `text-text-muted`) rather than introducing new `@theme` tokens, consistent with `market-nav-redesign`'s zero-new-tokens decision; (b) add a shared `<footer>` to `app/dashboard/layout.tsx` with the exact mockup copy (translated 1:1, no rewording), `fixed bottom-0 ... md:left-64` positioning matching the sidebar's `md:w-64`; (c) add bottom padding to the content wrapper or both page `<main>`s sized to the footer's rendered height (accounting for 2-line wrap on narrow viewports) to prevent overlap; (d) delete the old footer block from `crypto/page.tsx` entirely (its substantive content — θ/σ/γ/ρ values, determinism framing — already has other homes in the UI, per Mechanics above).

## Risks

- Fixed-footer overlap with card-grid content on short/mobile viewports if bottom padding is under-sized — must be verified visually/via a layout scenario, not just implemented and assumed correct.
- Whether the mobile drawer (`Sidebar.tsx`'s `mobileOpen` branch) should also get a branding block is undecided — the mockup has no mobile sidebar to reference, so this is a genuine open design question for `sdd-propose`/`sdd-design`, not something this exploration can resolve from mockup evidence alone.
- Losing the literal "Trabajo de tesis — FAF Platform" framing in favor of the mockup's personal-attribution line is a minor, low-risk copy change (not informational loss) but worth flagging in the proposal for explicit sign-off since it changes how the project self-identifies in the UI.

## Ready for Proposal

Yes. This is a small, well-scoped gap-closing change with exact source markup/copy identified, exact target files identified, and a confirmed-safe removal path for the old footer. Open questions for `sdd-propose`/`sdd-design` to resolve explicitly: (1) exact bottom-padding value to reserve for the fixed footer; (2) whether the mobile drawer also gets a branding block; (3) confirm the "Desarrollado por Javier M. Debórtoli" attribution line is copied verbatim (it is personally identifying — user already supplied it as part of the mockup ground truth, so this is a confirmation, not a new question).
