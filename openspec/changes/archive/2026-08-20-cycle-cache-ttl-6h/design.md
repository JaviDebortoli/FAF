# Design: Raise the presentation-cache TTL to match the 6h n8n cadence

## Technical Approach

Single-constant change, no architecture impact: `BETA_MS` (`src/cycle/constants.ts:7`) moves from
`60 * 60 * 1000` (1h) to `8 * 60 * 60 * 1000` (8h) — 6h n8n cadence + ~33% safety margin. Both
production consumers (`app/api/cycle/route.ts:131`'s `cache.put(report, BETA_MS)` and
`src/narrative/cache.ts:46`'s `put(..., ttlMs: Millis = BETA_MS, ...)` default) reference the
constant, not a literal, so both inherit the new value automatically — no consumer edit needed.
The doc comment above the constant is rewritten because it misattributes the value to the paper's
Cuadro 1 β (a structurally unrelated dimensionless candle-count).

## Architecture Decisions

| Decision | Option | Tradeoff | Chosen |
|---|---|---|---|
| `narrative/cache.ts` TTL coupling | Decouple into its own constant | Adds a second value to keep in sync with zero current driving requirement (YAGNI); would also require a spec delta since `decision-narrative/spec.md`'s "Cost-mitigation caching" requirement already conceptually couples the two windows | Rejected |
| | Keep coupled via existing `= BETA_MS` default (**chosen**) | Narrative cache's primary invalidation is `decision.t` changing (confirmed via `tests/narrative/cache.test.ts` — every assertion is TTL-relative, never a literal), so TTL is a secondary backstop where a longer value is safe; zero code change | **Chosen** |
| TTL value | 7h (~17% margin) | Tighter staleness exposure, but less headroom against scheduling jitter | Rejected (no jitter data to justify the tighter bound) |
| | 8h (~33% margin) (**chosen**) | Asymmetric cost favors the larger margin: too-short TTL recurs this exact production bug (503/404 dead window); too-long TTL only adds marginal staleness to already-accepted bounded-TTL scope | **Chosen** |

Rationale for keeping `narrative/cache.ts` untouched: it is bounded independently and more tightly
in practice by `MAX_ENTRIES = 16` (oldest-eviction), and `decision-narrative/spec.md` already ties
its window conceptually to `BETA_MS` — no spec delta is needed here (owned by `sdd-spec`, not
duplicated in this design).

## File Changes

| File | Action | Description |
|---|---|---|
| `src/cycle/constants.ts` | Modify | `BETA_MS` value 1h → 8h; doc comment rewritten (exact text below) |
| `app/api/cycle/route.ts` | None (consumer) | `cache.put(report, BETA_MS)` picks up the new value automatically |
| `src/narrative/cache.ts` | None (consumer) | `ttlMs: Millis = BETA_MS` default picks up the new value automatically |
| Tests (all) | None | Every test referencing `BETA_MS` does so relatively (e.g. `BETA_MS - 1`), never the literal 1h value — confirmed in exploration.md's test-impact catalog. Verify by running the full suite (see Testing Strategy), do not assert blindly. |

## Interfaces / Contracts

### `src/cycle/constants.ts` — exact replacement for lines 1-7

```ts
/**
 * Presentation-cache TTL for `src/cycle/latest.ts`'s in-memory single-entry
 * cache — consumed by `app/api/cycle/route.ts`'s `cache.put(report, BETA_MS)`
 * and reused as `src/narrative/cache.ts`'s default `ttlMs` param. NOT the
 * paper's Cuadro 1 β (that is `WindowSpec.beta: 1`, a dimensionless
 * candle-count wired into `src/domain/types.ts` — unrelated to this
 * millisecond duration; the two share only a name).
 *
 * Set to 8h: n8n's Schedule Trigger cadence is 6h (n8n-cadence-6h), plus a
 * ~33% safety margin. A tighter 7h was considered and rejected — the cost of
 * this TTL being too short is a full recurrence of the dead-window bug this
 * change fixes (cache expires before the next push, reads 503/404 with no
 * stale data to fall back on), while the cost of it being slightly too long
 * is only marginally staler displayed data in the common case. That
 * asymmetry favors the larger margin.
 */
export const BETA_MS = 8 * 60 * 60 * 1000;
```

Lines 9-19 (`MAX_ASSETS` and its doc comment) are unchanged — not reproduced here.

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Unit | `BETA_MS` numeric value | `expect(BETA_MS).toBe(8 * 60 * 60 * 1000)` if such an assertion doesn't already exist; otherwise covered transitively by existing TTL-relative tests |
| Unit/Integration | Existing cache-timing tests (`tests/narrative/cache.test.ts`, `tests/api/decisions.test.ts`, `tests/helpers/seedCycleCache.ts`-based seeds) still pass unchanged | Run full `vitest` suite — confirms the zero-test-edit claim rather than assuming it |
| Manual (gated) | Production 503/404 dead-window symptom is actually resolved over a real 6h inter-run window | **Cannot be automated** — requires the `[MANUAL-VERIFICATION-ONLY]` scenario `sdd-spec` is adding under `decision-dashboard`/`decision-narrative` (exact wording owned by `sdd-spec`, not redefined here). `sdd-verify`/`sdd-archive` MUST NOT mark PASS without the user's explicit live confirmation. |

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or
process-integration boundary. This change is a single constant-value and doc-comment edit.

## Migration / Rollout

No migration required. Pure in-memory TTL constant, no persisted state. Rollback is `git revert`
on the `constants.ts` commit.

## Open Questions

- [ ] None blocking. TTL value (8h vs. the defensible tighter 7h alternative) was already decided
      in the binding scope handed to this executor. The live-production-symptom confirmation
      remains open until the `[MANUAL-VERIFICATION-ONLY]` gate is satisfied — blocks archive-as-PASS,
      does not block apply.
