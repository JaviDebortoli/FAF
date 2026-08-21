# Exploration: inicio-content-polish

## Current State
- **Point 1 (CTA):** `app/dashboard/inicio/page.tsx`'s CTA `className` is byte-identical in its green treatment to `Sidebar.tsx`'s active-link state (`border-buy bg-buy/10 ... text-buy`), confirming the precedent behind point 2.
- **Point 2 (diagram):** `app/(dashboard)/components/PipelineDiagram.tsx` is currently strictly zinc (`stroke-zinc-600`/`fill-zinc-900/50`/`stroke-zinc-700`/`fill-zinc-300`) by explicit prior design comment, now being deliberately reversed. **Mechanism confirmed empirically**: `stroke-buy`/`fill-buy` Tailwind classes have **zero usage anywhere in the codebase**; the only other SVG-coloring component, `ArgumentGraph.tsx`, uses `var(--color-buy)`/`var(--color-sell)` as literal strings passed to `fill`/`stroke` **JSX props** (not Tailwind classes, not `style={{}}`). That is the proven, safe mechanism to reuse — guessing at `stroke-buy`/`fill-buy` would be unverified.
- **Point 3 (text size):** Info card paragraphs are `text-sm`. Grepped all `app/(dashboard)/components/*.tsx` body copy (`DashboardHeader`, `EmptyState`, `MarketPlaceholder`, `ServiceUnavailable`, `NarrativePanel`) — **all uniformly `text-sm`**, zero `text-base` body-copy precedent anywhere (only non-body usage is an `<h2>` heading in `DrilldownPanel.tsx`).
- **Point 4 (heading):** Sidebar branding already establishes "Recomendaciones financieras explicables en tiempo real"; info card prose already establishes "determinístico", "Marco Argumentativo Financiero (FAF)", non-AI-core-decision framing.

## Affected Areas
- `app/dashboard/inicio/page.tsx` — remove CTA block, bump paragraph size, rewrite `<h1>`.
- `app/(dashboard)/components/PipelineDiagram.tsx` — recolor via SVG props; update stale header comment.
- `openspec/specs/decision-dashboard/spec.md` — **genuine spec dependency found, not previously flagged** (see below) — needs a delta.
- `tests/e2e/market-nav.spec.ts` — no forced change, but heading text must stay compatible with the existing loose regex.

## Approaches

**Point 2 (mechanism):**
1. `var(--color-buy)` as literal SVG props, mirroring `ArgumentGraph.tsx` — proven, low risk.
2. `stroke-buy`/`fill-buy` Tailwind classes — shorter, but zero precedent, unverified whether Tailwind v4's `@theme` generator emits `stroke-*`/`fill-*` for a custom color; a silent no-op would only surface visually with no test to catch it.

**Recommend (1).**

**Point 3 (size):**
1. `text-base` (16px) — genuine, visible step; only diverges from the app's otherwise 100%-consistent `text-sm` scale.
2. `text-[15px]` — marginal, easy-to-miss, arbitrary one-off with no anchor elsewhere.

**Recommend (1)**, flagged explicitly as an intentional isolated exception (Inicio's info card is the page's sole content block, unlike `DashboardHeader`'s secondary disclaimer).

## Recommendation

1. **CTA:** delete the `<Link href="/dashboard/crypto">` block outright, single-file mechanical change.
2. **Diagram:** node `<rect>` → `fill="var(--color-buy)" fillOpacity={0.1} stroke="var(--color-buy)"` (reproduces `bg-buy/10` via the SVG-native opacity prop, since Tailwind's `/10` suffix doesn't apply to raw `var()` values); connectors → `stroke="var(--color-buy)"`, drop the current `opacity={0.85}` muting for full-opacity "más llamativo"; labels → recommend `fill="var(--color-buy)"` too (fully mirrors sidebar's `text-buy`), flagged as the one sub-choice worth a quick post-implementation legibility check. Update the component's stale "deliberately avoids --color-buy" header comment.
3. **Text size:** `text-base` for both info-card paragraphs.
4. **Heading**, 3 candidates (all keep "Bienvenido" as literal first word, so the existing e2e regex needs no change):
   1. **(Primary)** "Bienvenido a FAF: recomendaciones determinísticas y explicables"
   2. "Bienvenido — recomendaciones financieras explicables, sin IA en la decisión"
   3. "Bienvenido al pipeline determinístico de FAF"

## Spec-conflict check

**Not clean — a real, previously-unflagged dependency.** `openspec/specs/decision-dashboard/spec.md` line 94 (Requirement "Crypto dashboard route under market navigation"): *"...reachable directly, **via the Inicio route's CTA**, or via the sidebar's Criptomonedas link."* And line 106 (Scenario): *"...navigating to `/dashboard/crypto` (**via its CTA** or the sidebar link)..."* Removing the CTA doesn't break actual reachability (direct URL + sidebar link remain intact), but the spec's descriptive text becomes stale. **This change must carry a spec delta** to `decision-dashboard/spec.md` removing the CTA references — should not be silently skipped in `sdd-propose`/`sdd-spec`. No other spec file references the diagram's colors, paragraph size, or the exact heading text — those are confirmed unconstrained.

## Test-impact catalog

- `tests/e2e/market-nav.spec.ts:263` — loose `/Bienvenido/` regex, compatible with all 3 heading candidates, no change needed.
- Full `tests/` grep: no test asserts CTA existence/click, diagram colors, or paragraph size class — points 1-3 confirmed test-safe.
- Phantom-scroll test exercises `/dashboard/crypto` only (`gotoCrypto()` helper), never `/dashboard/inicio` — unaffected.
- `PipelineDiagram` has no unit test by design (mirrors `icons.tsx`), e2e-visibility-covered only.

## Risks

- Spec staleness in `decision-dashboard/spec.md` must be addressed via delta, not skipped.
- `text-base` is a deliberate, isolated divergence from the app's otherwise uniform `text-sm` body-copy scale — flag as intentional in review, not an oversight.
- Diagram label recolor (green text vs. keeping zinc) is a minor open sub-choice needing a quick visual check post-implementation.
- Point 4's heading is a genuine copy decision the user explicitly invited suggestions on — confirm the primary candidate (or pick an alternative) before `sdd-propose` locks it in.

## Ready for Proposal

Yes for points 1-3 (root cause/mechanism confirmed, concrete recommendations, spec delta scoped). Point 4 has a clear primary recommendation but should be explicitly confirmed with the user first, since the request was open-ended by design.
