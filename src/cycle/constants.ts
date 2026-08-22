/**
 * Presentation-cache TTL for `src/cycle/latest.ts`'s market-keyed cache —
 * consumed by `app/api/cycle/route.ts`'s `cache.put(market, report, BETA_MS)`
 * and reused as `src/narrative/cache.ts`'s default `ttlMs` param. NOT the
 * paper's Cuadro 1 β (that is `WindowSpec.beta: 1`, a dimensionless
 * candle-count wired into `src/domain/types.ts` — unrelated to this
 * millisecond duration; the two share only a name).
 *
 * Set to 5 days (120h), one shared constant for both markets
 * (acciones-market-integration D-F): crypto's normal EOD gap is ~24h (D1:
 * daily candles, trades every day). Acciones' longest **normal** gap is a
 * 4-day holiday long weekend (Friday close -> Tuesday open) ~= 96h. 120h
 * exceeds 96h with a 24h (~25%) margin — enough to also absorb one missed 6h
 * cron tick after a holiday reopen (96h + 6h = 102h < 120h) — while staying
 * bounded, not "unboundedly large". A per-market TTL map was considered and
 * rejected: it adds a second axis of complexity for a value that only needs
 * to be "large enough for the larger market"; crypto simply gets a
 * wider-than-strictly-needed window, which is safe (asymmetry favors the
 * larger margin, same rationale as the prior 8h/6h derivation this replaces).
 */
export const BETA_MS = 5 * 24 * 60 * 60 * 1000;

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
