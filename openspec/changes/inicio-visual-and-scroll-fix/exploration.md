# Exploration: inicio-visual-and-scroll-fix

## Current State

**Point 1 (diagram):** `app/dashboard/inicio/page.tsx` is header → info card → CTA `<Link>`, nothing else, inside a `min-h-screen` `<main>` — hence the visible empty space below the CTA. The established fixed-topology SVG pattern is `app/(dashboard)/lib/graphLayout.ts` (pure function `layoutArgumentGraph(evidences)` — layout as a function of *dynamic* fired-evidence input) + `app/(dashboard)/components/ArgumentGraph.tsx` (thin mapper: `<svg viewBox={layout.viewBox} preserveAspectRatio="xMidYMid meet">`, edges as `<line stroke-zinc-200 opacity=0.5>`, nodes as `<circle>+<text>`). By contrast, `icons.tsx` is 100% static hand-drawn SVG with a flat `DEFAULTS` object and **no** separate layout module, and correspondingly **no unit test file** — while `graphLayout.ts` *does* have one (`tests/dashboard/lib/graphLayout.test.ts`), precisely because it's a genuine pure function worth testing. e2e coverage of Inicio (`tests/e2e/market-nav.spec.ts:231`) only checks the "Bienvenido" heading is visible — no structural assertion blocks a diagram insertion between the card and CTA.

**Point 2 (scroll):** confirmed root cause exactly as briefed. `crypto/page.tsx` (line 47) and `[market]/page.tsx` (line 34) have **byte-for-byte identical** `<main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-8 px-6 py-10">`, both wrapped by `(with-footer)/layout.tsx`'s `<div className="pb-48">` (12rem = 192px, confirmed current). Result: rendered height ≥ `100vh + 192px` always, regardless of content — reproduced by `EmptyState`/`MarketPlaceholder`, both confirmed short (`py-16` dashed-border blocks). `app/dashboard/inicio/page.tsx` is confirmed genuinely clean: it sits under `app/dashboard/layout.tsx` only, outside `(with-footer)/`, so no `pb-48` stacks on its own `min-h-screen` — sizes correctly to `max(100vh, content)`.

## Affected Areas

- `app/dashboard/inicio/page.tsx` — insert new `<PipelineDiagram/>` between the info card and the CTA.
- NEW `app/(dashboard)/components/PipelineDiagram.tsx` — new static SVG component, no new `lib/` file.
- `app/dashboard/(with-footer)/crypto/page.tsx` — `<main>` className: `min-h-screen` → `min-h-[calc(100vh-12rem)]`.
- `app/dashboard/(with-footer)/[market]/page.tsx` — identical className change.
- `app/dashboard/(with-footer)/layout.tsx` — no code change, but add a cross-referencing comment noting the `pb-48` ↔ `calc(100vh-12rem)` coupling.

## Approaches

**Point 1 — diagram construction**
1. **Hardcode coordinates directly in `PipelineDiagram.tsx`** (mirrors `icons.tsx`, not `graphLayout.ts`)
   - Pros: matches the actual precedent for *static, non-data-driven* SVG (icons.tsx has zero dynamic behavior and no separate layout file); avoids indirection for 4 fixed nodes; no unit-test debt.
   - Cons: would need retrofitting into a `graphLayout.ts`-style split if the diagram ever became state-driven.
   - Effort: Low.
2. **Extract into `lib/pipelineLayout.ts`** mirroring `graphLayout.ts`'s constants+function+typed-nodes shape.
   - Pros: perfect shape-consistency with `ArgumentGraph`.
   - Cons: `graphLayout.ts`'s stated rationale ("layout is a pure function of ... the fired evidence set") doesn't apply — a `layoutPipeline()` taking no arguments and always returning the same object is indirection without benefit.
   - Effort: Low-Medium.

**Point 2 — scroll fix**
1. **Remove `min-h-screen` entirely.**
   - Pros: simplest diff.
   - Cons: outer shell's `min-h-screen` lives on the flex row, not on `<main>` — removing `<main>`'s own floor makes short-content routes (`EmptyState`/`MarketPlaceholder`) visually collapse to a cramped block near the top, disconnected from the fixed footer below. Trades one visual complaint for another, on exactly the routes already flagged as feeling sparse.
   - Effort: Low.
2. **Replace with `min-h-[calc(100vh-12rem)]`** (reuses the exact `12rem` already in `pb-48`).
   - Pros: preserves "fill the screen" intent on short-content routes while eliminating the double-count; no drift risk (same literal constant, not independently re-derived); Tailwind v4 confirmed to support arbitrary `calc()` values.
   - Cons: implicit cross-file coupling to `pb-48`'s literal value, needs a documenting comment.
   - Effort: Low.

## Recommendation

**Point 1:** Approach 1 (hardcode in `PipelineDiagram.tsx`, no `lib/` split) — `icons.tsx` is the correct precedent for a purely static diagram, not `graphLayout.ts`, whose separation exists specifically to isolate a *data-dependent* pure function.

Design: `viewBox="0 0 960 200"`, 4 rounded-rect nodes (~140×64, `rx=8`) at x = 120/360/600/840, y=100, labeled "Datos" → "Indicadores" → "Reglas" → "Recomendación" (concise, matching the card prose's own 4-step order without duplicating full sentences), connected by horizontal lines + small chevron arrowheads (same construction as the `TrendingUp` icon's arrow). Insert between the info card and the CTA. `role="img"` + `<title>/<desc>`, matching `ArgumentGraph`'s a11y pattern. Recommended `data-testid="inicio-pipeline-diagram"`.

Color: do NOT reuse `ArgumentGraph`'s muted `stroke-zinc-200 opacity:0.5` verbatim — that was deliberately subdued for a Tier-2 supporting detail. This is the page's primary hero visual, so recommend `stroke-zinc-700` boxes, `fill-none`/`fill-zinc-900/50`, `fill-zinc-300` labels, `stroke-zinc-600 opacity:0.8-0.9` connectors — more present than ArgumentGraph, but staying strictly in the zinc/monochrome family (no `--color-buy`/`--color-sell`) since this illustrates a generic deterministic process, not a directional BUY/SELL signal.

**Point 2:** Approach 2 (`min-h-[calc(100vh-12rem)]`) on both `crypto/page.tsx` and `[market]/page.tsx`. Preserves the actual product intent (full-looking page even with short content) while precisely removing the double-count. Add cross-referencing comments at all 3 touch points (both `<main>` classNames + `(with-footer)/layout.tsx`'s `pb-48`) per this codebase's existing convention of documenting cross-file structural coupling in header comments.

## Spec-conflict check

`openspec/specs/market-navigation/spec.md` ("The footer MUST NOT visually overlap any page content") is preserved unchanged — the fix removes only the *additional*, double-counted `min-h-screen`, not `pb-48` itself. No spec anywhere pins `min-h-screen`/scroll behavior (confirmed via repo-wide grep of `openspec/specs/` — no matches) — implementation detail only. Nothing in specs conflicts with adding the pipeline diagram (purely additive, no spec references Inicio's exact visual content).

## Test-impact catalog

- `tests/e2e/market-nav.spec.ts:231` — "Bienvenido" heading check unaffected by diagram insertion.
- `tests/e2e/market-nav.spec.ts` — "footer never overlaps content" test (1280px + 375px, crypto route only) — must be re-verified post-fix as the direct regression guard; should be unaffected since the fix doesn't touch `pb-48`'s value.
- No existing "no phantom scroll" assertion exists (`document.documentElement.scrollHeight` vs `window.innerHeight`) — recommend adding one in `sdd-tasks`/`sdd-apply` for a short-content market route as the actual regression test for this bug.
- `PipelineDiagram` has no unit test by design (mirrors `icons.tsx`); coverage via e2e visibility assertion only.

## Risks

- `calc(100vh-12rem)` is coupled to `pb-48`'s literal value across sibling files with no compile-time enforcement — mitigated by cross-referencing comments, but still a manual-sync risk.
- Footer's actual rendered height was not measured in a live browser during exploration; if it exceeds 192px on some viewport, the existing "footer never overlaps" e2e test would already be failing today, independent of this change — `sdd-verify` should confirm pass/fail status both before and after to isolate any pre-existing issue.

## Ready for Proposal

Yes. Both points have a confirmed root cause / concrete design direction with a single clear recommendation, no open design ambiguity, and no spec conflicts.
