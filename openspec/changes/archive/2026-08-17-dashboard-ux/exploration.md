# Exploration: dashboard-ux — redesigning the FAF decision dashboard

## Current State

The v1 dashboard (`app/(dashboard)/page.tsx` + 3 components) is a client component that fetches `GET /api/decisions` once on mount and renders:
- `app/(dashboard)/components/AssetFilter.tsx` — a plain `<select>` over `ASSET_ALLOWLIST` (BTCUSDT, ETHUSDT, SOLUSDT).
- `app/(dashboard)/components/DecisionTable.tsx` — a raw HTML `<table>`: asset, ISO timestamp, recommendation text, sigma+/sigma- (via `score()` from `src/decision/policy.ts`), gap, "View trace" button.
- `app/(dashboard)/components/ArgumentTrace.tsx` — a second raw `<table>` per selected decision: predicate, rule id, thesis, argument label, net thesis label. Only fired evidences shown.

There is **zero styling anywhere in the repo**: `app/layout.tsx` has no CSS import, no `globals.css`, no Tailwind, no CSS Modules, no design tokens, no color-coding. `package.json` deps are only `n3`, `next`, `react`, `react-dom` — no styling or charting library at all. This objectively confirms the user's verdict; it's not just unpolished, it's entirely unstyled semantic HTML.

The canonical spec (`openspec/specs/decision-dashboard/spec.md`, mirrored from the archived `faf-platform` change) has 4 requirements, and Requirement 3 explicitly forbids "LLM-authored text and graph/node-edge visualization" in v1 (PRD deviation D3).

## Affected Areas

- `app/(dashboard)/page.tsx`, `app/(dashboard)/components/{DecisionTable,AssetFilter,ArgumentTrace}.tsx` — the entire current UI surface, likely all rewritten.
- `app/layout.tsx` — currently has no global stylesheet import; any design-system choice touches this.
- `src/domain/types.ts`, `src/decision/policy.ts` (`score()`), `src/laf/rules.ts` (`RULES`) — the only data/vocabulary a new UI can draw on without a backend change.
- `openspec/specs/decision-dashboard/spec.md` — canonical spec; Requirement 3 (no LLM narrative / graph viz) is the central open question for this change.
- `tests/e2e/dashboard.spec.ts` — tightly coupled to current `<table>` markup, `getByLabel('Asset filter')`, exact button text `'View trace'`, and table caption text `'Argument trace'`; any structural redesign breaks it and requires a rewrite in the same change.
- `docs/PRD.md` (deviation D3 table) — the archived rationale that must be explicitly revisited or reaffirmed.

## Data Available (no backend change needed)

- `Decision`: asset, t, recommendation (BUY/SELL/NO_RECOMMENDATION), reason, bullish/bearish `ThesisState` (supporters, aggregated/net labels, score), gap, thresholds {theta:0.67, delta:0.2}, `trace: {candles, turtle, evidences}`.
- `trace.candles` carries the full raw OHLCV window (up to 50 candles/asset, `MAX_KLINES_PER_ASSET` in `app/api/cycle/route.ts`) — a real price sparkline is buildable client-side with zero backend change.
- `Evidence` carries predicate, label, window spec, and provenance (raw indicator value) — but **only for fired predicates**, not neutral/inactive ones.
- `BETA_MS = 1h` (`src/cycle/constants.ts`) bounds how "live" the data genuinely needs to be.

**Backend gaps to flag** (out of scope for a UI-only change unless the user wants them): no emission of inactive/neutral predicate states (so a "full 8-indicator status board" isn't renderable as-is), and no decision-history endpoint (only the latest single cycle is ever returned — trend/"change since last poll" would be client-session-only, lost on refresh).

## "Market Type" Segmentation — Likely Doesn't Map Literally

v1's `ASSET_ALLOWLIST` (`src/market/assets.ts`) is 3 crypto pairs only — there is no second market type in the data model. Concrete reinterpretations, all zero-backend-change: (1) by recommendation direction (BUY/SELL/NO_RECOMMENDATION), (2) by confidence/conviction tier (derived from `gap`/`score()`), (3) by asset (already exists), (4) literal crypto-vs-other market type — doesn't exist in v1, would need a real allowlist expansion. This needs explicit user confirmation, not an assumption.

## Approaches Compared

### 1. Restyled tables (minimal-risk polish)
Keep table structure, add a design system, semantic BUY/SELL/NO_RECOMMENDATION color-coding, responsive layout, segment/filter controls using recommendation direction or confidence tier.
- **Pros**: lowest risk to the e2e suite, no new data needed, fastest, clearly inside Requirement 3's boundary.
- **Cons**: may not clear the "genuinely interesting, interactive" bar.
- **Effort**: Low.

### 2. Card-based view with lightweight SVG encodings
One card per asset: BUY/SELL/HOLD badge, SVG gauge for sigma+/sigma- vs. theta=0.67, SVG price sparkline from `trace.candles`, expandable compact evidence chips (fired predicates as small badges, not a graph) instead of the flat trace table. Segmentation tabs = recommendation direction or confidence tier.
- **Pros**: visualizes the paper's own math directly, adds real interactivity, no new npm dependency needed (hand-rolled SVG), stays serverless-friendly.
- **Cons**: evidence-chip breakdown sits close to Requirement 3's "no graph/node-edge visualization" line — needs explicit sign-off. Breaks current e2e locators; e2e rewrite must be part of this change.
- **Effort**: Medium.

### 3. Full graph visualization + LLM narrative
Effectively un-defers D3 for the dashboard specifically.
- **Pros**: closest to the original PRD Capa 4 vision.
- **Cons**: new LLM dependency (key, cost, latency, new route, new threat-matrix entry per the existing T-1/T-2 pattern), non-determinism injected into a system whose selling point is deterministic label algebra, graph-rendering dependency, directly contradicts the still-canonical Requirement 3 and archived D3 rationale ("la narrativa LLM es no determinística"). Highest risk of blowing the 800-line review budget in one PR.
- **Effort**: High.

## Recommendation

Approach 2 (card-based, lightweight SVG encodings, no new dependency, segmentation by recommendation direction/confidence tier) best fits a solo-thesis MVP audience (committee + potential end users): a genuine step up without importing Approach 3's cost, risk, and non-determinism — but its evidence-chip breakdown is a judgment call against the letter of D3 and needs explicit user sign-off before `sdd-propose` locks it in.

## Risks

- **Scope creep**: subjective "interesting/interactive" bar could balloon into a full redesign near a thesis deadline; apply `review_budget_lines=800` and `delivery_strategy=ask-on-risk` deliberately in `sdd-tasks`.
- **D3 boundary ambiguity**: any evidence-breakdown visual risks conflicting with the still-canonical Requirement 3; the proposal must explicitly state whether it's kept, modified, or superseded — no silent reinterpretation.
- **e2e coupling**: `tests/e2e/dashboard.spec.ts` is tightly coupled to literal table markup and exact text; a structural redesign requires an e2e rewrite in the same change.
- **No existing design system**: introducing one (Tailwind/CSS Modules/hand-rolled CSS) is itself a real architectural decision with build-size/dependency implications.
- **Backend gaps** (no inactive-predicate data, no decision history) bound what a UI-only change can honestly promise.

## Ready for Proposal

Yes, with 5 open questions surfaced to the user first — especially #1, since it determines which of the three approaches the proposal should target.

1. Is D3 (LLM narrative + graph viz) still deferred, or is this change effectively "v2 for the dashboard piece"?
2. What does "segmented by market type" concretely mean given v1 is crypto-only — recommendation direction, confidence tier, asset, or a forward-looking placeholder?
3. Is a compact per-asset evidence-chip breakdown acceptable as non-graph, or does it already cross into "graph visualization" per Requirement 3?
4. Should this change also pick a design system (Tailwind vs. CSS Modules vs. hand-rolled), since none exists today?
5. Is client-session-only "change since last poll" acceptable, or does the user want real decision history (a backend change, out of this UI-only change's stated scope)?
