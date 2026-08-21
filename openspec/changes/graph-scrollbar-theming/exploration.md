# Exploration: graph-scrollbar-theming

## Current State

**Edges**: `app/(dashboard)/components/ArgumentGraph.tsx:34-63` — SVG root `<svg className="h-auto w-full shrink-0 text-zinc-700">` (line 40). Edges: `<line stroke="currentColor" strokeWidth={1} opacity={0.35} />` (lines 52-61), so `currentColor` = `zinc-700` (#3f3f46) over body background `#09090b` (`app/globals.css:31`). Computed WCAG contrast ratio directly: effective composited color ≈ rgb(28,28,32), contrast ≈ **1.17:1** — far below the 3:1 WCAG 1.4.11 floor for non-text graphical objects. This confirms the reported near-invisibility is a genuine, measurable defect, not just subjective.

The conflict node (⊖, lines 114-122) also uses `stroke="currentColor"`/`fill="currentColor"`, resolving via the same SVG-root `text-zinc-700` class — the only other element sharing that source (leaf/aggregate/net nodes use explicit `THESIS_COLOR`/`var(--color-*)` fills already).

`app/globals.css` `@theme` defines only `--color-buy`, `--color-sell`, `--color-inactive` (#52525b), `--color-muted` (#a1a1aa), `--color-threshold` — no white/foreground token. Body text `#f4f4f5` is exactly Tailwind's `zinc-100` hex.

**Scrollbar**: `app/globals.css` has zero scrollbar CSS. Grep confirmed exactly 3 `overflow-y-auto`/`overflow-auto` sites app-wide: `DrilldownPanel.tsx:53`, `Sidebar.tsx:88` (desktop nav), `Sidebar.tsx:117` (mobile drawer). All three share the identical root cause and would show the same unstyled light-track/gray-thumb browser default whenever their content overflows. `package.json` confirms no scrollbar plugin (only `tailwindcss: ^4`, `@tailwindcss/postcss`); `postcss.config.mjs` confirms CSS-first Tailwind v4, no `tailwind.config.js`. Current (2026) support for standard `scrollbar-color`/`scrollbar-width`: Chrome 121+, Firefox (long-standing), Safari 26.2+ — safe as the primary mechanism, with `::-webkit-scrollbar-*` as fallback/refinement.

No pinned color/contrast requirements exist in `openspec/specs/decision-dashboard/spec.md` or `openspec/specs/decision-narrative/spec.md` (only topology/behavior requirements) — no spec conflict.

`tests/e2e/dashboard.spec.ts` and `tests/dashboard/lib/graphLayout.test.ts` grepped — no assertions on edge color/opacity/class or scrollbar presence/styling anywhere. No test updates required for either fix.

## Affected Areas

- `app/(dashboard)/components/ArgumentGraph.tsx:52-61` — edge `<line>` elements, fix site for issue 1.
- `app/(dashboard)/components/ArgumentGraph.tsx:40` — SVG root `text-zinc-700` class; decision point (touching it affects the conflict node too).
- `app/globals.css` — fix site for scrollbar theming (currently empty of scrollbar rules).
- `app/(dashboard)/components/DrilldownPanel.tsx:53`, `Sidebar.tsx:88`, `Sidebar.tsx:117` — the 3 scroll containers; a global CSS fix covers all three, no per-component edits needed.
- No test files affected. No spec conflicts.

## Design Questions

**Q1 — Edge color and opacity.** Recommendation: give `<line>` an explicit `stroke-zinc-200` (own class, not `currentColor`) and raise opacity 0.35 → **0.5**. Rationale: (a) explicit stroke leaves the conflict node's shared `text-zinc-700` untouched — user's complaint was "aristas" specifically, not nodes; (b) `zinc-200` (#e4e4e7) reads as near-white (honors "blanco") while staying one step below pure-white/body-text `zinc-100`, preserving the component's own documented intent that edges are secondary to nodes; (c) computed: zinc-200 @ 0.5 opacity over `#09090b` ≈ **4.45:1** contrast (vs 1.17:1 today), comfortably clearing 3:1 while staying visually subordinate to the saturated buy/sell fills. Pure `#ffffff` at the same opacity is a valid literal-compliance alternative — flagging as the one open call for the user, not silently resolved.

**Q2 — Scrollbar scope: global vs. DrilldownPanel-only.** Recommendation: global fix in `app/globals.css`. Same root cause (zero scrollbar CSS) affects the Sidebar identically on overflow; a narrow fix would leave the same jarring artifact elsewhere, and mirrors this session's established pattern of fixing shared root causes once (e.g. the `DashboardHeader` extraction) rather than one-off patches. Flagged explicitly as a scope decision — the user's screenshot only showed the drill-down panel.

**Q3 — Scrollbar mechanism/colors.** Recommendation: standard `scrollbar-color` + `scrollbar-width: thin` as primary (broad support confirmed), `::-webkit-scrollbar*` pseudo-elements as fallback/refinement. Colors from existing tokens only: thumb `zinc-700`/`zinc-600`, track `zinc-900`/transparent, consistent with `border-zinc-800` used across Sidebar/DrilldownPanel/footer chrome. No Tailwind v4 built-in utility exists (confirmed, no plugin) — plain CSS required in `globals.css`.

## Test-Impact Catalog

- No existing test asserts edge color/opacity/class or scrollbar styling — none require updates.
- No visual-regression tooling exists in this project; recommend manual/screenshot verification (as originally used to report the bug) rather than adding new automated coverage for a pure CSS/contrast change.

## Risks

- Q1 ("how white") and Q2 (fix scope) are subjective/scope design calls with no pinned spec requirement — recommendations backed by computed contrast numbers, but final tone/scope need explicit user sign-off.
- Otherwise very low risk: no state/API/topology impact, pure CSS/SVG-attribute change confined to 2 files.

## Ready for Proposal

Yes, pending the two open design-question confirmations (Q1 edge tone, Q2 scrollbar scope).
