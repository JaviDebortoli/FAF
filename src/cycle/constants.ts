/**
 * beta (paper Cuadro 1): the 1h candle re-evaluation step. Reused as the
 * presentation-cache TTL in `src/cycle/latest.ts` (design.md D-B) — a
 * separate module so route handlers and tests can import it without
 * pulling in (or needing to mock) `src/cycle/runCycle.ts`.
 */
export const BETA_MS = 60 * 60 * 1000;

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
