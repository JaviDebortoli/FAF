# Design: NO_RECOMMENDATION visibility + Spanish UI

## Technical Approach

Two independent, additive changes sharing one file set. (1) Widen the Tier 1
selector from a 2-step hide+filter to a single 4-way filter (`selectByDirection`),
and fix the two BUY/SELL coercion bugs this exposes. (2) Add one pure
display-mapping module (`lib/i18n.ts`) consumed by every presentational
component; `src/domain/types.ts`/`src/decision/policy.ts`/API/golden tests are
untouched (D3). No new runtime dependency, no framework, no schema change.

## Architecture Decisions

### Decision: Rename + widen the selector, no deprecated alias

**Choice**: `selectActionable` → `selectByDirection`; `Direction` widens to
`'ALL'|'BUY'|'SELL'|'NO_RECOMMENDATION'`; drop the pre-filter step entirely.
**Alternatives considered**: Keep the old name with new semantics.
**Rationale**: Grep confirms exactly one real caller (`OverviewClient.tsx`,
2 call sites) plus one doc-comment mention in `DecisionCard.tsx` (not an
import) and the test file (rewritten anyway). No deprecated re-export is
needed — clean rename, zero blast radius beyond the confirmed set.

### Decision: One i18n module, presentational-only, lookup tables not switch statements

**Choice**: New `app/(dashboard)/lib/i18n.ts` exporting `translateRecommendation`
and `translateDirection`, each backed by a `Record<T, string>` constant.
**Alternatives considered**: Inline ternaries per component (current pattern for
buy/sell coloring); a full i18n framework (`next-intl`).
**Rationale**: `lib/` already holds flat, pure, single-purpose modules
(`gauge.ts`, `scores.ts`, `select.ts`) with no prior text-mapping precedent —
this is the smallest addition consistent with that shape. A `Record` is
exhaustively type-checked by TS against the union (missing a key is a compile
error), which a ternary chain is not. A framework is explicitly out of scope
(proposal "Out of Scope").

### Decision: `winningThesis` derives from scores, not the recommendation literal

**Choice**: Replace `decision.recommendation === 'BUY' ? 'bullish' : 'bearish'`
with `sigmaPlus >= sigmaMinus ? 'bullish' : 'bearish'` in both `ArgumentGraph.tsx`
and `ThesisScores.tsx`, using the `sigmaPlus`/`sigmaMinus` already returned by
each file's existing `computeScores(decision)` call.
**Alternatives considered**: Add a 3rd `Thesis` value; branch UI on
`recommendation === 'NO_RECOMMENDATION'`.
**Rationale**: Mathematically equivalent to the old ternary for BUY/SELL
(policy.ts's threshold logic already implies `sigmaPlus >= sigmaMinus` when
`recommendation === 'BUY'`), and generalizes correctly below threshold — the
graph still highlights the "leading" side for NO_RECOMMENDATION instead of
defaulting to bearish.

## File Changes

| File | Action | Change |
|------|--------|--------|
| `app/(dashboard)/lib/select.ts` | Modify | Rename, widen `Direction`, drop pre-filter |
| `app/(dashboard)/lib/i18n.ts` | Create | `translateRecommendation`, `translateDirection` |
| `app/(dashboard)/components/DirectionFilter.tsx` | Modify | 4th `OPTIONS` entry, translated labels |
| `app/(dashboard)/components/OverviewClient.tsx` | Modify | Drop `allActionable` pre-filter call; rescope `EmptyState` branching |
| `app/(dashboard)/components/DecisionCard.tsx` | Modify | Drop 2-way coercion, pass real `recommendation` |
| `app/(dashboard)/components/RecommendationBadge.tsx` | Modify | Widen prop to `Recommendation`, 3rd visual branch |
| `app/(dashboard)/components/EmptyState.tsx` | Modify | Widen `direction` prop, translated copy |
| `app/(dashboard)/components/ArgumentGraph.tsx`, `ThesisScores.tsx` | Modify | `winningThesis` fix |
| `app/(dashboard)/components/DashboardHeader.tsx`, `app/dashboard/(with-footer)/inicio/page.tsx`, `PipelineDiagram.tsx` | Modify | Spanish prose (below) |
| `src/narrative/prompt.ts` | Modify | New anti-English-token rule |
| `tests/dashboard/lib/select.test.ts`, `tests/e2e/dashboard.spec.ts`, `tests/e2e/market-nav.spec.ts`, `tests/narrative/prompt.test.ts` | Modify | Assertions for new semantics/text |
| `openspec/specs/decision-dashboard/spec.md`, `openspec/specs/market-navigation/spec.md` | Modify | Deltas (owned by `sdd-spec`) |

## Interfaces / Contracts

```ts
// lib/select.ts
export type Direction = 'ALL' | 'BUY' | 'SELL' | 'NO_RECOMMENDATION';
export function selectByDirection(report: DecisionReport, direction: Direction = 'ALL'): Decision[] {
  if (direction === 'ALL') return report.decisions;
  return report.decisions.filter((d) => d.recommendation === direction);
}

// lib/i18n.ts
const RECOMMENDATION_ES: Record<Recommendation, string> = {
  BUY: 'Compra', SELL: 'Venta', NO_RECOMMENDATION: 'Sin recomendación',
};
const DIRECTION_ES: Record<Direction, string> = { ALL: 'Todos', ...RECOMMENDATION_ES };
export function translateRecommendation(r: Recommendation): string { return RECOMMENDATION_ES[r]; }
export function translateDirection(d: Direction): string { return DIRECTION_ES[d]; }
```

- `RecommendationBadge`: prop widens `Extract<Recommendation,'BUY'|'SELL'>` →
  `Recommendation`. Variant selection: `recommendation === 'BUY' ? 'buy' :
  recommendation === 'SELL' ? 'sell' : 'inactive'`. The `inactive` branch uses
  `border-inactive/40 bg-inactive/10 text-inactive` (Tailwind v4 auto-generates
  these utilities from `@theme`'s `--color-inactive`, same mechanism already
  producing `border-buy/40`/`text-muted`/`ring-threshold/50`) and renders
  `translateRecommendation(recommendation)` as the label instead of the raw
  literal (all three branches now translate, not just the new one).
- `DecisionCard.tsx`: delete the coercion line; pass `decision.recommendation`
  straight through to `RecommendationBadge`.
- `EmptyState.tsx`: `direction?: Exclude<Direction, 'ALL'>` (import from
  `lib/select`) — `'ALL'` can never reach the `filtered` variant, since an
  empty `ALL` result means `report.decisions.length === 0`, which is the
  `no-active` case. Headline/status interpolate `translateDirection(direction)`
  instead of the raw literal.
- `OverviewClient.tsx`: `selectByDirection(report,'ALL')` call is dropped;
  `EmptyState variant="no-active"` fires only on `report.decisions.length === 0`;
  `variant="filtered"` fires whenever `visible.length === 0` and the report is
  non-empty, passing `direction` directly (now typed to match, no more
  `direction === 'BUY' ? 'BUY' : 'SELL'` coercion needed either).
- `DirectionFilter.tsx`: `OPTIONS` becomes `['ALL','BUY','SELL','NO_RECOMMENDATION']`;
  button label is `translateDirection(option)`; `data-testid` keeps the raw
  English enum value (`direction-filter-NO_RECOMMENDATION`) as a stable
  machine identifier, independent of display text.

### Prose edits (exact before → after)

| File | Before | After |
|---|---|---|
| `DashboardHeader.tsx:26` | "una recomendación BUY/SELL derivada..." | "una recomendación de Compra, Venta o Sin recomendación derivada..." |
| `inicio/page.tsx:43` | "Cada recomendación BUY/SELL surge de un pipeline..." | "Cada recomendación —Compra, Venta o Sin recomendación— surge de un pipeline..." |
| `inicio/page.tsx:55` | "la decisión BUY/SELL nunca lo es" | "la decisión de Compra, Venta o Sin recomendación nunca lo es" |
| `PipelineDiagram.tsx:56` (`<desc>`) | "agregación en una recomendación BUY/SELL" | "agregación en una recomendación de Compra, Venta o Sin recomendación" |

`DashboardHeader.tsx:26` text is also pinned in
`openspec/specs/market-navigation/spec.md:173` and duplicated in
`tests/e2e/market-nav.spec.ts:235,442` — both need the identical new string.

### `src/narrative/prompt.ts`

New bullet appended to the existing `Reglas estrictas:` list (same style/dash
prefix as the other 6 rules):

```
- Nunca uses las palabras en inglés "BUY", "SELL" ni "NO_RECOMMENDATION" en tu texto: usa siempre "comprar"/"vender", o "sin recomendación" cuando corresponda.
```

`tests/narrative/prompt.test.ts`'s `GOLDEN_SYSTEM_PROMPT` literal must be
updated in lockstep (byte-identical equality check) — required task, not a
design decision.

## Data Flow

    OverviewClient (direction state)
         │
         ▼
    selectByDirection(report, direction) ──▶ visible: Decision[]
         │
         ▼
    DecisionCard ──▶ RecommendationBadge(recommendation) ──▶ translateRecommendation()
         │
         ▼ (on click)
    DrilldownPanel ──▶ ArgumentGraph / ThesisScores (winningThesis via sigmaPlus>=sigmaMinus)
                   ──▶ NarrativePanel (unchanged — existing 409 NOT_APPLICABLE path)

## Testing Strategy

| Change | Boundary | Approach |
|---|---|---|
| `selectByDirection` widening | RED→GREEN | Rewrite `select.test.ts`: 4-way filter, NO_RECOMMENDATION now included, no more hide behavior |
| `DecisionCard`/`RecommendationBadge` coercion fix | RED→GREEN | New unit test: NO_RECOMMENDATION decision renders `data-recommendation="NO_RECOMMENDATION"`, not `"SELL"` |
| `ArgumentGraph`/`ThesisScores` `winningThesis` fix | RED→GREEN | Regression test asserting agreement with old behavior on existing BUY/SELL golden fixtures + new correct behavior for a NO_RECOMMENDATION fixture |
| `OverviewClient` `EmptyState` rescoping | RED→GREEN | New test: `no-active` fires only at `decisions.length === 0`; `filtered` fires when `visible.length === 0` with a non-empty report |
| `prompt.ts` anti-English-token rule | RED→GREEN | Update `GOLDEN_SYSTEM_PROMPT` + add `.toContain('en inglés')` assertion before adding the line |
| `i18n.ts` new module | RED→GREEN (thin) | One assertion per `Record` key — cheap, catches missing-key typos TS might not (string content, not type) |
| DirectionFilter 4th tab, Spanish labels/prose, EmptyState copy | GREEN-only | Pure copy/CSS; covered by e2e text assertions per this repo's convention (no new logic branch) |

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file
classification, or process-integration boundary.

## Migration / Rollout

No migration required. Revert restores prior hide-invariant and English text;
no data/schema/cache change (per proposal's Rollback Plan).

## Open Questions

None — all sign-offs (D1–D3) and open questions (terminology, visual
treatment, drill-down behavior) were confirmed with the proposal's default
options before this design was drafted.
