/**
 * Wilder RSI (FAF paper Cuadro 1: RSI(14) — the indicator's own defining
 * period, unchanged by DEVIATION D6 below). Reference: J. Welles Wilder
 * Jr., "New Concepts in Technical Trading Systems" (1978) — smoothing
 * method: seed = simple average of the first `period` gains/losses, then
 * continuation avg_i = (avg_{i-1}*(period-1) + value_i) / period.
 *
 * `period` defaults to `diffs.length` (i.e. the whole supplied window
 * feeds one plain SEED average, no continuation) when omitted — this
 * general-purpose default is kept for other callers/tests that pass a
 * bare closes array and expect a single-pass average, and is unrelated to
 * D6 below.
 *
 * DEVIATION D6 (design.md / docs/PRD.md "Desvíos aprobados"): the real
 * call site, `src/stream/evidence.ts`'s `extractEvidence`, now passes
 * `period=14` EXPLICITLY over a widened RSP-QL window of RSI's own 20
 * most recent candles (`RSI_SPEC.omega=20`, up from Cuadro 1's literal
 * 14). With `closes.length=20`, `diffs.length=19 > period=14`, so the
 * continuation loop below (`for (i = period; i < diffs.length; i++)`)
 * genuinely executes for `i=14..18` — 5 real Wilder recursive smoothing
 * steps beyond the seed, not just the seed's plain average. Before D6,
 * `evidence.ts` called this function with `period` omitted at
 * `omega=14`, so `diffs.length=13 === period` and the loop never ran
 * (`13 < 13` is false) — see design.md's "Deviation D6" section for the
 * full bug analysis and why 20 (not 50, matching MACD_SPEC/SMA_SPEC) was
 * chosen as the widened window size.
 */
export function computeRSI(closes: number[], period?: number): number {
  if (closes.length < 2) {
    throw new Error('computeRSI requires at least 2 closes');
  }

  const diffs: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    diffs.push(closes[i]! - closes[i - 1]!);
  }

  const p = period ?? diffs.length;
  if (p < 1 || p > diffs.length) {
    throw new Error(`computeRSI: period ${p} out of range for ${diffs.length} diffs`);
  }

  const gains = diffs.map((d) => Math.max(d, 0));
  const losses = diffs.map((d) => Math.max(-d, 0));

  let avgGain = gains.slice(0, p).reduce((a, b) => a + b, 0) / p;
  let avgLoss = losses.slice(0, p).reduce((a, b) => a + b, 0) / p;

  for (let i = p; i < diffs.length; i++) {
    avgGain = (avgGain * (p - 1) + gains[i]!) / p;
    avgLoss = (avgLoss * (p - 1) + losses[i]!) / p;
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}
