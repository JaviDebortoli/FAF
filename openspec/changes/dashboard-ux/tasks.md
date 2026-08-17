# Tasks: dashboard-ux — two-tier explainable decision dashboard

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | ~2900-3200 total (6 work units, ~30 new/modified files: Tailwind setup, 4 pure lib modules, 7 Tier-1 components, 4 narrative core modules, 1 route, 4 Tier-2 components, 1 graph-layout lib, full e2e rewrite) |
| 400-line budget risk | High (total), Low-Medium per individual work unit once split into 6 |
| Chained PRs recommended | Yes |
| Suggested split | PR1a Tailwind+pure lib -> PR1b Tier1 UI -> PR2a narrative core -> PR2b narrative route+docs -> PR3 Tier2 UI -> PR4 e2e rewrite |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending — recommend stacked-to-main (matches this repo's prior `faf-platform` change), needs user confirmation |

### Forecast disagreement with design's default 4-slice shape

The design's slice 1 ("Tailwind + Tier 1" as one unit) estimates to **~1000-1250 lines** by itself
(Tailwind entry files + 4 pure geometry/selection modules with RED/GREEN unit tests + 7 components +
page rewrite + 3 deleted legacy components), which risks exceeding the 800-line session budget alone.
Applying the same cut design already proposed for slice 2 (pure modules vs. network-touching code) to
slice 1 keeps every resulting unit under budget:

- **1a** = Tailwind v4 CSS-first entry (`globals.css`, `postcss.config.mjs`, `layout.tsx`) + the 4 pure
  `app/(dashboard)/lib/*` modules (`gauge`, `sparkline`, `scores`, `select`) with full RED/GREEN unit
  coverage — ~400 lines, no component code yet.
- **1b** = the 7 Tier-1 components + `page.tsx` rewrite + deleting the 3 legacy components — ~600-650
  lines, consumes 1a's token/lib layer. Components are thin mappers (design's own framing) and are
  verified holistically by e2e (Phase 6), not per-component unit tests — matching this repo's own
  precedent (`archive/2026-08-16-faf-platform/tasks.md` Phase 7: components built GREEN-only, verified
  by a Playwright smoke test, no RTL/component-test layer was ever introduced).

Design's own 2a/2b cut for the narrative route is kept as-is. Result: 6 work units, each independently
under 800 lines, replacing the original 4-slice (or 5, counting 2a/2b) shape. Slice 1 (Tailwind+Tier1)
still lands first; slice 4 (e2e) still chains last — both design constraints preserved.

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|---|---|---|---|---|---|
| 1a | Tailwind v4 entry + pure `lib/{gauge,sparkline,scores,select}.ts` | PR1a | `vitest run tests/dashboard/lib` | N/A — pure functions, no I/O | Revert `app/globals.css`, `postcss.config.mjs`, `app/(dashboard)/lib/`; no consumer yet |
| 1b | Tier 1 UI: card grid, badge, gauge/sparkline components, direction filter, empty state | PR1b | `vitest run tests/dashboard/lib` (regression) + manual render | `next dev` + open `/` | Revert `app/(dashboard)/page.tsx`, `app/(dashboard)/components/{OverviewClient,DecisionCard,RecommendationBadge,ScoreGauge,Sparkline,DirectionFilter,EmptyState}.tsx`; PR1a lib layer unaffected |
| 2a | Narrative core: `src/narrative/{facts,prompt,cache,rateLimit}.ts`, no network | PR2a | `vitest run tests/narrative/facts.test.ts tests/narrative/prompt.test.ts tests/narrative/cache.test.ts tests/narrative/rateLimit.test.ts` | N/A — pure functions, no network | Revert `src/narrative/{facts,prompt,cache,rateLimit}.ts`; unimported by anything yet |
| 2b | Narrative route: `src/narrative/client.ts`, `app/api/decisions/[asset]/narrative/route.ts`, `.env.example`, `docs/PRD.md` D7 | PR2b | `vitest run tests/narrative/client.test.ts tests/api/narrative.test.ts tests/api/decisions.test.ts` | `next dev` + `curl localhost:3000/api/decisions/BTCUSDT/narrative` against fixture-backed cycle | Revert `src/narrative/client.ts`, `app/api/decisions/[asset]/`, `.env.example`, `docs/PRD.md` D7 entry; PR1a/1b UI unaffected |
| 3 | Tier 2 UI: `lib/graphLayout.ts`, `ArgumentGraph`, `ThesisScores`, `DrilldownPanel`, `NarrativePanel`, wired to PR2b's route | PR3 | `vitest run tests/dashboard/lib/graphLayout.test.ts` | `next dev` + open `/` + click a BUY/SELL card | Revert `app/(dashboard)/lib/graphLayout.ts`, `app/(dashboard)/components/{ArgumentGraph,ThesisScores,DrilldownPanel,NarrativePanel}.tsx`; Tier 1 unaffected |
| 4 | `tests/e2e/dashboard.spec.ts` full rewrite | PR4 | `playwright test tests/e2e/dashboard.spec.ts` | `playwright test` against fixture-backed cycle, narrative route stubbed via Playwright route interception | Revert `tests/e2e/dashboard.spec.ts`; no production code touched |

## Phase 1: Tailwind v4 Setup + Pure Tier-1 Geometry/Selection (PR1a)

- [x] 1.1 `package.json`: add `tailwindcss@^4`, `@tailwindcss/postcss` devDependencies.
- [x] 1.2 Create `postcss.config.mjs` wiring `@tailwindcss/postcss`.
- [x] 1.3 Create `app/globals.css`: `@import "tailwindcss";` + `@theme` block with `--color-buy`, `--color-sell`, `--color-inactive`, `--color-muted` tokens; dark theme only, no toggle.
- [x] 1.4 `app/layout.tsx`: import `./globals.css`, add dark base classes.
- [x] 1.5 RED `tests/dashboard/lib/scores.test.ts`: asserts `computeScores(decision)` uses canonical `score()` from `src/decision/policy.ts` on `decision.bullish.net`/`decision.bearish.net`, never `.score`; θ/δ read from `decision.thresholds`.
- [x] 1.6 GREEN `app/(dashboard)/lib/scores.ts`.
- [x] 1.7 RED `tests/dashboard/lib/select.test.ts`: `selectActionable(report)` filters out `NO_RECOMMENDATION`; direction filter (`ALL|BUY|SELL`) table over BUY/SELL/NO_RECOMMENDATION mixes incl. all-`NO_RECOMMENDATION`.
- [x] 1.8 GREEN `app/(dashboard)/lib/select.ts`.
- [x] 1.9 RED `tests/dashboard/lib/gauge.test.ts`: semicircular arc `d` string for σ⁺/σ⁻ needle angles + θ tick position; boundary σ=θ case.
- [x] 1.10 GREEN `app/(dashboard)/lib/gauge.ts`.
- [x] 1.11 RED `tests/dashboard/lib/sparkline.test.ts`: `sparklinePath(closes, w, h)` path string over normalized closes; flat-series guard (`max===min`→mid-line, no div-by-zero); empty-candles guard.
- [x] 1.12 GREEN `app/(dashboard)/lib/sparkline.ts`.

## Phase 2: Tier 1 UI — Card Grid, Filter, Empty State (PR1b)

- [x] 2.1 Create `app/(dashboard)/components/RecommendationBadge.tsx`: BUY/SELL badge, semantic color tokens.
- [x] 2.2 Create `app/(dashboard)/components/ScoreGauge.tsx`: thin mapper over `lib/gauge.ts` output to `<svg role="img">`.
- [x] 2.3 Create `app/(dashboard)/components/Sparkline.tsx`: thin mapper over `lib/sparkline.ts` output.
- [x] 2.4 Create `app/(dashboard)/components/DecisionCard.tsx`: composes badge + gauge + sparkline for one actionable asset; `data-testid="decision-card-{asset}"`.
- [x] 2.5 Create `app/(dashboard)/components/DirectionFilter.tsx`: BUY/SELL segmented control (no `NO_RECOMMENDATION` option).
- [x] 2.6 Create `app/(dashboard)/components/EmptyState.tsx`: two copies — "no active recommendations right now" (nothing actionable) vs. "no BUY recommendations right now" (filter excluded everything).
- [x] 2.7 Create `app/(dashboard)/components/OverviewClient.tsx`: client island — fetch/poll `GET /api/decisions`, owns direction filter + selected-asset state via `lib/select.ts`; session-only "changed since last poll" diff state.
- [x] 2.8 Rewrite `app/(dashboard)/page.tsx` as a Server Component: static chrome (title, thesis framing, footer) + `<OverviewClient/>`.
- [x] 2.9 Delete `app/(dashboard)/components/{DecisionTable,AssetFilter,ArgumentTrace}.tsx` (superseded).

## Phase 3: Narrative Core Modules — Pure, No Network (PR2a)

- [x] 3.1 RED `tests/narrative/facts.test.ts`: `buildNarrativeFacts(decision)` snapshot excludes `trace.turtle`/`trace.candles`/any unlisted key (T-4); read-only projection proof, no mutation of input `Decision` (D7 clause 2/6).
- [x] 3.2 GREEN `src/narrative/facts.ts`: `NarrativeFacts`/`ThesisFacts` whitelist projection.
- [x] 3.3 RED `tests/narrative/staticImport.test.ts`: static-import assertion that no module under `src/{rdf,stream,laf,decision,cycle}/` imports `src/narrative/*` (D7 clause 6).
- [x] 3.4 GREEN: add the assertion utility if needed (no production code — invariant already holds by construction).
- [x] 3.5 RED `tests/narrative/prompt.test.ts`: system-prompt golden snapshot (static, zero interpolation); `buildUserMessage(facts)` embeds only whitelisted fields as JSON.
- [x] 3.6 GREEN `src/narrative/prompt.ts`: `NARRATIVE_SYSTEM_PROMPT` constant + user-message builder.
- [x] 3.7 RED `tests/narrative/cache.test.ts`: key `` `${asset}:${decision.t}` ``, TTL `BETA_MS`, 16-entry bounded with oldest-eviction, only clean completions stored, new `t` invalidates stale entry.
- [x] 3.8 GREEN `src/narrative/cache.ts` (mirrors `src/cycle/latest.ts` shape).
- [x] 3.9 RED `tests/narrative/rateLimit.test.ts`: fixed-window 10 req/60s per client key; N+1 in window → deny; hourly per-instance circuit breaker; window-boundary edge cases.
- [x] 3.10 GREEN `src/narrative/rateLimit.ts`.

## Phase 4: Narrative Route, Docs (PR2b)

- [x] 4.1 `package.json`: add `@anthropic-ai/sdk` dependency.
- [x] 4.2 RED `tests/narrative/client.test.ts` (mocked SDK): `Anthropic` client constructed inside call, not at module scope (T-5); thinking deltas discarded, only `text_delta` forwarded.
- [x] 4.3 GREEN `src/narrative/client.ts`.
- [x] 4.4 RED `tests/api/narrative.test.ts` (mocked `@anthropic-ai/sdk`), full failure table: disallowed symbol→400 `BAD_ASSET` no client constructed (T-3); no `Decision`→404 `NO_DECISION`; `NO_RECOMMENDATION`→409 `NOT_APPLICABLE` zero tokens (T-3); missing key→503 `NARRATIVE_DISABLED`; `RateLimitError`/`APIConnectionError`→503 `UPSTREAM_BUSY`; other `Anthropic.APIError`→502 `UPSTREAM_ERROR`; unknown throw→500 `INTERNAL`; rate-limit exceeded→429 `Retry-After` (T-3); repeated request same `(asset,t)`→cache hit, exactly one upstream call total (T-3); crafted body/query→byte-identical prompt (T-4); `APIError` embedding secret-shaped string not present in response body (T-5); mocked never-yielding stream aborts at 45s deadline, closes with `[NARRATIVE_INCOMPLETE]`, cache not written (T-6).
- [x] 4.5 RED `tests/api/decisions-invariance.test.ts`: `GET /api/decisions` output byte-identical with and without `ANTHROPIC_API_KEY` set (D7 clause 4).
- [x] 4.6 GREEN `app/api/decisions/[asset]/narrative/route.ts`: `runtime='nodejs'`, `dynamic='force-dynamic'`, `maxDuration=60`, awaited Promise `params`, streamed `text/plain`, `x-faf-narrative-source` header.
- [x] 4.7 `.env.example`: document `ANTHROPIC_API_KEY` + Anthropic console spend-cap note.
- [x] 4.8 `docs/PRD.md`: add D7 row to "Desvíos aprobados" table (spec delta already encodes D7; this task only updates the PRD doc).

## Phase 5: Tier 2 UI — Argument Graph, Drill-Down, Narrative Panel (PR3)

- [x] 5.1 RED `tests/dashboard/lib/graphLayout.test.ts`: all 8 leaves present at fixed `y=i*ROW_H` in `RULES` order regardless of fired set; AP/AN centroid columns; fired vs. non-fired partition by set-difference against `trace.evidences`; non-fired never carries ⟨γ,ρ⟩.
- [x] 5.2 GREEN `app/(dashboard)/lib/graphLayout.ts`: `layoutArgumentGraph(evidences)`, fixed `viewBox="0 0 720 380"`.
- [x] 5.3 Create `app/(dashboard)/components/ArgumentGraph.tsx`: `<svg role="img">` + `<title>/<desc>`, fired nodes solid/thesis-colored, non-fired dashed muted "no activada en este ciclo", `data-testid="graph-node-R{n}"` + `data-state="fired|inactive"`.
- [x] 5.4 Create `app/(dashboard)/components/ThesisScores.tsx`: renders `aggregated`/`net`/σ/θ tick from `lib/scores.ts` output; highlights side matching `decision.recommendation`.
- [x] 5.5 Create `app/(dashboard)/components/NarrativePanel.tsx`: client island, state machine `idle→loading→streaming→done|unavailable|failed`; reads `response.body.getReader()`+`TextDecoder`; visible "generado por IA" disclaimer, visually separated from deterministic scores; retry button only in `failed` states.
- [x] 5.6 Create `app/(dashboard)/components/DrilldownPanel.tsx`: dialog rendering graph+scores immediately from already-fetched `Decision`; mounts `NarrativePanel` lazily only on first open, never prefetched.
- [x] 5.7 Wire `OverviewClient.tsx`: clicking a `DecisionCard` opens `DrilldownPanel` for that asset.

## Phase 6: E2E Rewrite (PR4)

- [x] 6.1 Rewrite `tests/e2e/dashboard.spec.ts`: card grid renders a card only for actionable (BUY/SELL) assets, none for `NO_RECOMMENDATION`.
- [x] 6.2 Scenario: all-`NO_RECOMMENDATION` fixture → explicit empty state, not blank page.
- [x] 6.3 Scenario: direction filter narrows visible cards to BUY or SELL only.
- [x] 6.4 Scenario: opening a card's drill-down renders the 8/2/1 argument graph matching the asset's trace, with `data-state` fired/inactive partition correct.
- [x] 6.5 Scenario: no `GET /api/decisions/[asset]/narrative` request fires until a drill-down is opened (network assertion).
- [x] 6.6 Scenario: narrative disclaimer element present whenever narrative text is rendered (D7 clause 5).
- [x] 6.7 Scenario: narrative route stubbed to 503 → drill-down still renders graph+scores, narrative section shows "no disponible" (D7 clause 4, graceful degradation).
- [x] 6.8 Scenario: no narrative/graph `data-testid` present anywhere in the Tier 1 view (D7 clause 1).
- [x] 6.9 Remove obsolete assertions coupled to deleted `<table>` markup, `getByLabel('Asset filter')`, `'View trace'`, `'Argument trace'`.

## Implementation Order

Phase 1 (1a) → Phase 2 (1b) → Phase 3 (2a) → Phase 4 (2b) → Phase 5 (3) → Phase 6 (4), per the
work-unit table above. Phase 1 must land first (Tier 2's gauge/sparkline reuse Tier 1's token/lib
layer). Phase 3 (narrative core) has no dependency on Phase 1/2 and could theoretically run in
parallel, but is sequenced after Tier 1 to keep the PR chain linear per `stacked-to-main`. Phase 6
(e2e) must chain last — its assertions target markup that exists only after Phase 5.
