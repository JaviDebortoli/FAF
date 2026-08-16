/**
 * beta (paper Cuadro 1): the 1h candle re-evaluation step. Reused as the
 * presentation-cache TTL in `src/cycle/latest.ts` (design.md D-B) — a
 * separate module so route handlers and tests can import it without
 * pulling in (or needing to mock) `src/cycle/runCycle.ts`.
 */
export const BETA_MS = 60 * 60 * 1000;
