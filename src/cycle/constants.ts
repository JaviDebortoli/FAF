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

/**
 * Hard cap on `POST /api/cycle`'s payload asset count (T-1, dynamic-asset-count
 * design.md). Standalone ceiling decoupled from any enumerated symbol list —
 * generous relative to normal operation but well below anything that could
 * exhaust server memory/CPU. Lives here (not in `app/api/cycle/route.ts`)
 * because Next.js route files may only export HTTP method handlers and a
 * fixed set of route-segment config fields — any other named export fails
 * `next build`'s route type-checking (`"X" is not a valid Route export
 * field`). Tests import it from here, not from the route module.
 */
export const MAX_ASSETS = 25;
