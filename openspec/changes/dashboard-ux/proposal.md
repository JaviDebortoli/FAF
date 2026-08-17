# Proposal: dashboard-ux — two-tier explainable decision dashboard

## Intent

The v1 dashboard is unstyled raw HTML: zero CSS anywhere in the repo, no design system, no charting. User verdict: *"sumamente deficiente. No podemos desplegar esto."* It is not defensible for a thesis demo. After this change: a styled two-tier UI — a card overview per asset, and a per-asset drill-down that renders the argumentation graph plus an LLM narrative explaining the decision in plain language (the PRD's own Capa 4 promise).

## Scope

### In Scope

- **Tailwind CSS** adopted as the design system (`app/globals.css` + import in `app/layout.tsx`); none exists today.
- **Tier 1 — overview**: one card **only for assets with an active BUY or SELL recommendation** (BTCUSDT/ETHUSDT/SOLUSDT are candidates; `NO_RECOMMENDATION` assets render no card at all — decided explicitly by the user, not the exploration's original "always show all 3" framing), each with a BUY/SELL badge, a hand-rolled SVG gauge (σ⁺/σ⁻ against θ=0.67), and an SVG price sparkline from `trace.candles`. Segmented/filterable **by recommendation direction** (BUY / SELL only, since `NO_RECOMMENDATION` never produces a card). If all three assets are currently `NO_RECOMMENDATION`, the overview shows an explicit "no active recommendations right now" empty state rather than a blank page. Zero backend change.
- **Tier 2 — per-asset drill-down**: bounded SVG render of the *fixed* topology already in the system (8 evidence leaves → 2 RA groups → 1 CA, `src/laf/graph.ts`; R1–R8 from `src/laf/rules.ts`) for that asset's current decision, plus an LLM narrative.
- **New route** `GET /api/decisions/[asset]/narrative` — server-side Claude API call (`claude-opus-5`, adaptive thinking, streamed), `runtime='nodejs'`, `dynamic='force-dynamic'`, following existing `app/api/*` conventions. `ANTHROPIC_API_KEY` server-only env var, documented in `.env.example` like `FAF_CYCLE_SHARED_SECRET`.
- **Deviation D7** recorded in `docs/PRD.md` and reflected in the spec (see below).
- **Full rewrite of `tests/e2e/dashboard.spec.ts`** — it is coupled to `<table>` markup, `getByLabel('Asset filter')`, `'View trace'`, and `'Argument trace'`. Explicit scope item, not a footnote.

### Out of Scope (Non-Goals)

- Decision-history **backend persistence**. "Change since last poll" is client-session state only, lost on refresh. A real history backend is a candidate future SDD change.
- Non-crypto "market type" segmentation or allowlist expansion.
- Real-time push/WebSockets — polling `GET /api/decisions` remains the primitive.
- Generic graph editor, multi-decision graphing, or emitting inactive/neutral predicates.
- LLM narrative anywhere in Tier 1.

## Capabilities

### New Capabilities
- `decision-narrative`: server-side LLM narrative generation for a single asset's current decision (endpoint contract, key handling, failure/degradation behavior).

### Modified Capabilities
- `decision-dashboard`: Requirement 3 ("No LLM narrative or graph visualization in v1") is **narrowed, not reversed**; Requirement 1 (tabular decision view) is superseded by the card overview; Requirement 2 (trace detail) is restated as the Tier 2 drill-down.

## Deviation D7 (proposed — supersedes part of D3)

| D3 said | What changes | Why | Explicit boundary |
|---|---|---|---|
| LLM narrative and argumentative graph deferred to v2; v1 ships decision + trace as JSON/table | Both are allowed **in the per-asset drill-down view only** | The v1 UI is undeployable, and explainability is the thesis's central claim; the data needed already exists in `DecisionReport` | Tier 1 overview stays inside the original D3 line: deterministic, no LLM text, no node-edge graph. D3 remains in force everywhere except Tier 2. |

## Approach

The client keeps its single `GET /api/decisions` fetch; Tier 1 and Tier 2 are client-side views over the same `DecisionReport`. The L1–L4 reasoning core (`src/**`) is untouched. The narrative route receives the `Decision` trace (evidences, rule IDs, argument labels, thesis scores — structured symbolic/numeric data, not free text) and streams back prose. If the narrative call fails or the key is absent, the drill-down degrades gracefully to graph + scores.

## Affected Areas

| Area | Impact |
|---|---|
| `app/(dashboard)/page.tsx` + `components/{DecisionTable,AssetFilter,ArgumentTrace}.tsx` | Rewritten |
| `app/layout.tsx`, `app/globals.css`, Tailwind config, `package.json` | New / Modified |
| `app/api/decisions/[asset]/narrative/route.ts` | New |
| `tests/e2e/dashboard.spec.ts` | Rewritten |
| `openspec/specs/decision-dashboard/spec.md`, `docs/PRD.md` | Modified (D7) |
| `.env.example`, design Threat Matrix (new entries: narrative-endpoint cost/abuse; API-key handling) | Modified |
| `src/**` (L1–L4 core) | Unchanged |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| LLM cost abuse on a public endpoint | High | Rate-limit, cache narrative per `(asset, t)` within β, cap output tokens, server-only key |
| Non-determinism in a system sold on deterministic label algebra | Med | Narrative is presentation-only; no score/label is ever LLM-derived; label it as a generated explanation in the UI |
| 800-line review budget overrun (design system + route + UI + e2e in one change) | High | Chained PRs strongly recommended to `sdd-tasks`: (1) Tailwind + Tier 1, (2) narrative route, (3) Tier 2 graph + narrative UI, (4) e2e rewrite |
| D3/D7 boundary drift | Med | D7 states the exemption scope literally; spec delta must encode it |
| Narrative latency on Vercel serverless | Med | Streaming response + explicit `maxDuration` |

## Rollback

Revert the branch — no schema, persistence, or reasoning-core change is involved. Per-slice: unsetting `ANTHROPIC_API_KEY` disables the narrative (drill-down degrades to graph-only); Tailwind is reverted by dropping the `globals.css` import and the dependency.

## Dependencies

- `@anthropic-ai/sdk`, `tailwindcss` (+ PostCSS/Autoprefixer).
- `ANTHROPIC_API_KEY` provisioned in the deployment environment.

## Success Criteria

- [ ] No unstyled raw table remains in the dashboard
- [ ] Tier 1 renders a card (badge + gauge + sparkline) only for assets with an active BUY/SELL recommendation; direction filter works across BUY/SELL; an all-`NO_RECOMMENDATION` state shows an explicit empty state, not a blank page
- [ ] Tier 2 renders the R1–R8 → RA → CA graph and a Spanish-language, visibly AI-labeled narrative for the selected asset, generated lazily on drill-down open
- [ ] Narrative endpoint is server-only; key never reaches the client bundle
- [ ] `npx vitest run`, `npx tsc --noEmit`, `npx playwright test` all green
- [ ] D7 recorded in `docs/PRD.md` and reflected in the `decision-dashboard` spec

## Proposal question round — resolved

Assumptions locked from user decisions: hybrid two-tier UI, direction segmentation, Tailwind, Claude API server-side, session-only history, D7 scoped to drill-down. All open product questions are now resolved:

1. **Narrative generation timing**: lazy, on drill-down open (per click). Cheaper — avoids paying for narratives on assets the user never inspects in detail.
2. **`NO_RECOMMENDATION` handling**: resolved upstream, not at the drill-down level — Tier 1 renders **no card at all** for a `NO_RECOMMENDATION` asset (user's explicit decision, see Scope above), so there is no entry point into a Tier 2 drill-down for it in the first place. No empty-state or narrative-call decision needed at Tier 2 for this case.
3. **AI-disclaimer**: yes, visible. The drill-down must clearly mark the narrative text as an AI-generated explanation, distinct from the deterministic σ/label values (which are never LLM-derived) — reinforces the thesis's central claim under committee scrutiny.
4. **Narrative language**: Spanish, matching the PRD's own worked example ("se recomienda comprar porque...") and this thesis's language.
5. **Claude API outage behavior**: defaulted (not explicitly reconfirmed) to graceful degradation — drill-down still renders the graph and scores; only the narrative section is replaced with a "no disponible" state. Revisit only if the user objects.
