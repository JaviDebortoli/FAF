# Exploration: dashboard-cleanup-and-footer-revert

## Current State

**Point 1 (Inicio punctuation).** `app/dashboard/inicio/page.tsx` lines 37-38 contain exactly the arrow-separated fragment the user quoted, confirmed via direct read — trivial, single occurrence in source. `app/(dashboard)/components/PipelineDiagram.tsx`'s `<desc>` already uses the target comma+"y" phrasing style, so the requested replacement is consistent with an established convention.

**Point 2 (ThesisScores θ/gap).** `app/(dashboard)/components/ThesisScores.tsx` matches the pasted 85-line content exactly (verified via codegraph). After deleting the θ `<dd>` and the gap `<div>`, `theta` and `gap` become fully unused in this file — both must be dropped from the `computeScores(decision)` destructure (narrow to `{ sigmaPlus, sigmaMinus }`). `computeScores`'s own signature/return type in `app/(dashboard)/lib/scores.ts` stays unchanged: it has 7 call sites, and `DecisionCard.tsx` (Tier-1 card, a separate/out-of-scope location) still needs `theta`/`gap` for its own footer row and `<ScoreGauge>` prop. `tests/e2e/dashboard.spec.ts` references `thesis-scores` testid 3× but only asserts visibility/count, never content — no test or spec pins θ/gap rendering inside `ThesisScores`.

**Point 3 (footer revert) — substantial.** Confirmed route-group structure: `app/dashboard/layout.tsx` (universal shell, no footer) → `app/dashboard/(with-footer)/layout.tsx` (nested group with `pb-48` + shared `<footer data-testid="dashboard-footer">`, wraps `crypto/` and `[market]/` only today). `app/dashboard/inicio/page.tsx` currently sits outside `(with-footer)/` and still uses `min-h-screen` on its `<main>` (never touched by `inicio-visual-and-scroll-fix` since it was outside the footer group at the time). Route groups are URL-neutral (confirmed by existing header comments and grep for `dashboard/inicio` — all references are URL strings, `redirect()`/`href`, unaffected by a physical file move).

**Mandatory companion risk, confirmed real**: moving `inicio/page.tsx` into `(with-footer)/` without changing its `<main>` className from `min-h-screen` to `min-h-[calc(100vh-12rem)]` (matching `crypto/page.tsx`/`[market]/page.tsx` byte-for-byte) reintroduces the exact double-counted-height phantom-scroll bug `inicio-visual-and-scroll-fix` fixed elsewhere.

## Affected Areas
- `app/dashboard/inicio/page.tsx` — Point 1 text edit; Point 3 `git mv` target → `app/dashboard/(with-footer)/inicio/page.tsx` + `<main>` className fix + stale header comment rewrite.
- `app/(dashboard)/components/ThesisScores.tsx` — Point 2: delete gap `<div>`, delete θ `<dd>`, drop `theta` from `ThesisColumnProps`/call sites, narrow destructure.
- `app/dashboard/layout.tsx`, `app/dashboard/(with-footer)/layout.tsx` — stale header comments asserting Inicio's footer exclusion.
- `openspec/specs/market-navigation/spec.md` — "Shared shell footer" requirement needs a MODIFIED delta (exact text below); its "Inicio route renders no footer" scenario needs inverting.
- `tests/e2e/market-nav.spec.ts` — invert `'Inicio route — no dashboard footer'` describe block (lines 253-267); recommend adding Inicio to the crypto-only "footer never overlaps content" (104-115) and "no phantom vertical scroll" (134-147) coverage.

## Approaches (Point 3)

1. **Move `inicio/page.tsx` into `(with-footer)/`** — mirrors the existing `crypto/`/`[market]/` mechanism exactly, URL-neutral, minimal diff. Cons: requires the mandatory scroll-fix + 2 spec/test touches. Effort: Medium.
2. **Duplicate a footer instance directly inside `inicio/page.tsx`** — avoids the move but directly violates the still-standing "exactly one footer... MUST NOT be duplicated per-page" requirement wording. Architecturally regressive. Effort: Medium.

## Recommendation

Approach 1 for Point 3, plus the straightforward mechanical edits for Points 1-2, executed as one atomic change (see Risks — a partial apply would leave the tree silently broken).

## Spec-conflict check

`openspec/specs/market-navigation/spec.md`, "Shared shell footer" requirement, current text: *"The system MUST render exactly one footer, shared across every `/dashboard/*` route except `/dashboard/inicio`... The Inicio route (`/dashboard/inicio`) MUST NOT render the `dashboard-footer` element at all. (Previously: the footer was shared across every `/dashboard/*` route with no exception.)"* — needs a MODIFIED delta reverting to universal coverage with a new "(Previously: ... except `/dashboard/inicio`...)" trailer. The `#### Scenario: Inicio route renders no footer` needs replacing with an inverted footer-presence scenario. Checked "Sidebar navigation shell," "Per-market routing," and `decision-dashboard/spec.md`'s redirect-target requirement — none reference the footer exception; only this one requirement needs updating (confirmed via repo-wide grep of `openspec/specs/`).

## Test-impact catalog

- `tests/e2e/market-nav.spec.ts:253-267` — invert to assert footer presence + exact shared copy (mirror lines 74-90's pattern).
- `tests/e2e/market-nav.spec.ts:104-115` — recommend adding Inicio to the footer-overlap viewport loop.
- `tests/e2e/market-nav.spec.ts:134-147` — currently crypto-only; recommend an Inicio-specific "no phantom scroll" regression test as direct coverage for the mandatory companion fix.
- `tests/e2e/dashboard.spec.ts:483,649,668` and `tests/dashboard/lib/scores.test.ts` — unaffected by Point 2.
- No unit test imports `inicio/page.tsx` or `ThesisScores.tsx` directly — no import-path fixups needed for the `git mv`.

## Risks

- **Phantom-scroll reintroduction** if the `<main>` className fix is forgotten — current e2e coverage is crypto-only and would NOT catch this regression on Inicio unless the new test is added in this same change.
- `pb-48` ↔ `min-h-[calc(100vh-12rem)]` coupling has no compile-time enforcement, now applies to a third file.
- Three files carry stale doc comments asserting the now-reversed footer exclusion; all must be corrected together.
- Genuine architecture reversal — `sdd-tasks`/`sdd-apply` should treat the spec delta, route move, and scroll-fix as one atomic unit, not separable slices.

## Ready for Proposal

Yes — all three points have a confirmed root cause / exact current text / concrete fix with no open design ambiguity.
