# Archive Report: inicio-content-polish

**Archived**: 2026-08-21
**Artifact store**: hybrid (filesystem + Engram)

## Change Summary

`inicio-content-polish` bundled 4 Inicio (landing page) content/visual polish points, no new capability, no architecture change:

1. Removed the redundant `/dashboard/crypto` CTA `<Link>` block from `app/dashboard/inicio/page.tsx` (already reachable via direct URL and the sidebar's Criptomonedas link).
2. Recolored `app/(dashboard)/components/PipelineDiagram.tsx` to the platform's signature green (`var(--color-buy)`) via literal SVG props (nodes, connectors, labels), mirroring the proven mechanism from `ArgumentGraph.tsx`; rewrote the stale "avoids `--color-buy`" header comment.
3. Bumped both info-card paragraphs from `text-sm` to `text-base` (Inicio's sole content block, deliberate isolated divergence from the app's otherwise uniform `text-sm` body scale).
4. Replaced the bare `<h1>Bienvenido</h1>` with `<h1>Bienvenido! Recomendaciones determinísticas y explicables</h1>` — copy confirmed with the user via an `AskUserQuestion` round during `sdd-explore`.

No `design.md` — deliberately skipped (pure copy/CSS/color polish, no new components or architecture decisions). This omission was confirmed appropriate independently by `sdd-verify`.

## Task Completion Gate

Read `openspec/changes/inicio-content-polish/tasks.md` (pre-move) before any merge/move. 9/9 applicable implementation tasks (Phases 1-3) were checked `[x]`. Task 4.1 (Phase 4, spec-delta merge) was the sole intentionally-deferred task, explicitly scoped to `sdd-archive` by this repo's established convention (same pattern as `inicio-home-section` and other MODIFIED-requirement changes this session) — not a gap. `sdd-verify`'s report independently confirmed: "9/9 applicable tasks complete. Task 4.1 correctly out of scope for apply/verify." Task 4.1 has now been completed by this archive phase (spec merge below) and the archived `tasks.md` was updated to `[x]` with a completion note. Gate: PASS.

## Native Review Receipt Gate

No `reviewGate` was present in structured status for this candidate — receipt-driven development review was not discovered for this change. Archive proceeds under ordinary repository policy, per the gate's absent-key rule.

## Verify Verdict (Final State)

Per `verify-report.md` (Engram observation #1740, filesystem `openspec/changes/inicio-content-polish/verify-report.md` pre-move): **PASS — unconditional**.

- **CRITICAL**: 0
- **WARNING**: 0
- **SUGGESTION**: 0

All 9 applicable tasks independently re-confirmed by source inspection (not trusting apply-progress.md). Build/test evidence independently re-run: `npx tsc --noEmit` clean; `npx vitest run` 224/224 passed (37 files); `npx playwright test` full suite 45/45 passed. Both MODIFIED-requirement scenarios ("Overview mounts at the canonical crypto route", "Bare /dashboard lands on Inicio, not the overview directly") have passing runtime coverage. No live-production dependency, no unresolved risk from proposal.md's risk table. No later commit or evidence contradicts this snapshot; it is treated as the final state.

Code was already committed and pushed to `main` as commit `e635c27` prior to this archive phase — confirmed by the orchestrator's launch prompt (higher-ranked than the verify-report snapshot for delivery-state facts, though both agree here: no contradiction found).

## Specs Synced

| Domain | Action | Details |
|--------|--------|---------|
| `decision-dashboard` | Modified | 1 MODIFIED requirement ("Crypto dashboard route under market navigation") merged into `openspec/specs/decision-dashboard/spec.md`. Removed the stale "via the Inicio route's CTA" reachability wording from both the requirement body and the "Bare /dashboard lands on Inicio" scenario's final line (was "via its CTA or the sidebar link", now "via the sidebar link"). Direct-URL and sidebar-link reachability paths preserved unchanged. Single `(Previously: ...)` line overwritten with the new prior-state summary, per this repo's established convention (the existing `(Previously: bare /dashboard MUST redirect...)` line from the prior change was replaced, not appended to). |

Merge verified via `git diff -- openspec/specs/decision-dashboard/spec.md`:

```diff
@@ -91,8 +91,8 @@
 ### Requirement: Crypto dashboard route under market navigation

-The Tier 1 card overview MUST mount under the canonical crypto market route (`/dashboard/crypto`), reachable directly, via the Inicio route's CTA, or via the sidebar's Criptomonedas link. Bare `/dashboard` MUST land the user on the Inicio route (`/dashboard/inicio`) rather than directly on the Tier 1 overview, so the existing bookmark keeps working without a 404.
-(Previously: bare `/dashboard` MUST redirect or alias directly to the canonical crypto route so the existing bookmark keeps working.)
+The Tier 1 card overview MUST mount under the canonical crypto market route (`/dashboard/crypto`), reachable directly or via the sidebar's Criptomonedas link. Bare `/dashboard` MUST land the user on the Inicio route (`/dashboard/inicio`) rather than directly on the Tier 1 overview, so the existing bookmark keeps working without a 404.
+(Previously: reachable directly, via the Inicio route's CTA, or via the sidebar's Criptomonedas link — the Inicio route's CTA to `/dashboard/crypto` has been removed, so it is no longer a reachability path.)

 #### Scenario: Overview mounts at the canonical crypto route
 - GIVEN a user navigates to `/dashboard/crypto`
@@ -103,7 +103,7 @@
 - GIVEN a user has `/dashboard` bookmarked
 - WHEN they navigate to `/dashboard`
 - THEN they MUST land on `/dashboard/inicio`, not directly on the Tier 1 card overview, and never a 404
-- AND from there, navigating to `/dashboard/crypto` (via its CTA or the sidebar link) MUST still show the same Tier 1 card overview, unchanged
+- AND from there, navigating to `/dashboard/crypto` (via the sidebar link) MUST still show the same Tier 1 card overview, unchanged
```

No other requirements in `decision-dashboard/spec.md` were touched; all other requirements preserved verbatim.

## Archive Move

Change folder moved via `git mv openspec/changes/inicio-content-polish openspec/changes/archive/2026-08-21-inicio-content-polish`.

**Mandatory `diff -r` readback** (pre-move recursive snapshot vs. archived folder, archive-report.md excluded since additive-only):

```
=== DIFF -r source vs archived (must be empty) ===
diff exit status: 0
```

Empty diff — byte-identical move confirmed. Source directory (`openspec/changes/inicio-content-polish`) confirmed absent after move.

## Archive Contents

- `proposal.md` ✅
- `exploration.md` ✅
- `specs/decision-dashboard/spec.md` ✅ (delta, now merged into main spec)
- `tasks.md` ✅ (9/9 implementation tasks + 4.1 all now `[x]`, updated post-move with a completion note)
- `apply-progress.md` ✅
- `verify-report.md` ✅
- `design.md` — deliberately absent (copy/CSS-only change, no architecture decision; confirmed appropriate by `sdd-verify`)

## Source of Truth Updated

The following spec now reflects the new behavior:
- `openspec/specs/decision-dashboard/spec.md`

## Observation IDs (Engram, traceability)

| Artifact | Observation ID |
|---|---|
| proposal | #1736 |
| spec (delta) | #1737 |
| tasks | #1738 |
| verify-report | #1740 |

(No design observation — deliberately skipped for this change.)

## Not Committed by This Phase

Per explicit orchestrator instruction, this archive phase made filesystem changes only (spec merge + `git mv` folder move) and did NOT run `git add`/`git commit`/`git push`. The underlying code fix (page.tsx + PipelineDiagram.tsx) was already committed and pushed as `e635c27` prior to this phase. The spec merge and archive-folder move remain uncommitted in the working tree pending orchestrator review and a separate commit.

## SDD Cycle Complete

The change has been fully planned, implemented, verified, and archived. Ready for the next change.
