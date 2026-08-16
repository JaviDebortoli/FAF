# `paper-example` fixture — derivation (task 6.1)

`candles.json` holds 50 synthetic 1h `Candle`s for a single asset (`BTCUSDT`),
engineered so that running them through the REAL pipeline
(`mapCandles` -> `window`/`extractEvidence` -> `evaluateGraph` -> `decide`,
i.e. `runCycle`) reproduces the paper's §3 controlled example — the same
final numbers already proven algebra-only in `tests/golden/algebra-only.test.ts`
(Golden #2): `lambda*(mu+)=<0.50,0.00>`, `sigma+=0.75`, `sigma-=0.475`,
`gap=0.275` -> **BUY**, tolerance `1e-9`. This file (Golden #1,
`tests/golden/paper-example.test.ts`) is the end-to-end proof that real
OHLCV data, pushed through every layer's real formulas, lands on the exact
same decision — not just the L3/L4 algebra in isolation.

## Necessary deviation from the paper's literal e2/e3 rho values (new finding)

The paper's own §3 example uses evidence labels
`e1=rsi_bullish<0.50,0.40>`, `e2=macd_bullish<0.80,0.10>`,
`e3=sma_bearish<0.15,0.30>` — three DIFFERENT rho (risk) values. Reproducing
those exact three rho values through the real pipeline is **no longer
possible** after Deviation D5 (see `design.md` and `docs/PRD.md`): D5 widened
`MACD_SPEC.omega` from 26 to 50, making it IDENTICAL to `SMA_SPEC.omega=50`.
Both indicators now read from the exact same 50-candle window
(`src/stream/window.ts#window` always returns the last `omega` candles, and
with omega equal for both specs, both calls return the literal same close
array). `computeSigmaOmega(closes)` is a pure function of that window's
closes; identical input therefore ALWAYS produces identical `sigma_omega`,
and hence identical `rho = computeRisk(sigma_omega)`, for MACD and SMA.
Targeting `rho_macd=0.10` and `rho_sma=0.30` simultaneously is therefore
architecturally unsatisfiable post-D5.

**Resolution (verified by direct algebra, then confirmed numerically —
see "Verification" below):** pick a single shared value `rho_shared` for
both MACD's and SMA's evidence, chosen so the FINAL decision numbers are
byte-identical to the paper's, even though the individual e2/e3 rho values
differ from the paper's literal 0.10/0.30 split. Recall:

- `lambda(mu+) = mean(e1, e2)` (RSI + MACD, both bullish supporters)
- `lambda(mu-) = e3` (SMA alone, the only bearish supporter)
- `lambda*(mu+) = ominus(lambda(mu+), lambda(mu-))`, clamped >= 0 per component
- `lambda*(mu-) = ominus(lambda(mu-), lambda(mu+))`, clamped >= 0 per component

With `e1.rho = 0.40` (RSI keeps its own independent 14-candle window, still
free to hit the paper's 0.40 exactly) and `e2.rho = e3.rho = rho_shared`:

```
lambda(mu+).rho = mean(0.40, rho_shared) = (0.40 + rho_shared) / 2
lambda(mu-).rho = rho_shared
lambda*(mu+).rho = max(0, lambda(mu+).rho - rho_shared) = max(0, (0.40 - rho_shared) / 2)
```

For `lambda*(mu+).rho` to land on the paper's `0.00` (not a small positive
residual), we need `rho_shared >= 0.40` (clamped at exactly 0 for any such
value). Then:

```
lambda*(mu-).rho = max(0, rho_shared - lambda(mu+).rho) = (rho_shared - 0.40) / 2
sigma- = 0.5*lambda*(mu-).gamma + 0.5*(1 - lambda*(mu-).rho)
       = 0.5*0 + 0.5*(1 - (rho_shared - 0.40)/2)
```

Solving `sigma- = 0.475` (the paper's target): `(rho_shared - 0.40)/2 = 0.05`
=> **`rho_shared = 0.50`**. Substituting back: `lambda(mu+).rho = 0.45`,
`lambda*(mu+) = <0.50, 0.00>` (gamma side unaffected: `mean(0.50,0.80)=0.65`,
`0.65-0.15=0.50` exactly as in the paper), `lambda*(mu-) = <0.00, 0.05>`,
`sigma+ = 0.75`, `sigma- = 0.475`, `gap = 0.275` -> **BUY**. Every final
number matches the paper's own Golden #2 output exactly, using
`rho_shared = 0.50` for BOTH the MACD and SMA evidence instead of the
paper's 0.10/0.30 split. This is registered in `design.md` as an addendum to
Deviation D5 (the fixture-level consequence of the D5 window change) — see
`design.md`'s Deviation D5 section for the design-level note.

## Candle construction (how `candles.json` was actually built)

`candles.json` is one asset (BTCUSDT), 50 candles, timestamps 1h apart
starting at `openTime=1_700_000_000_000` (same base epoch used by other
fixtures in this repo, e.g. `tests/golden/algebra-only.test.ts`). Only
`close` drives every indicator in this codebase (`computeRSI`, `computeMACD`,
`computeSMA`, `computeBollingerBands`, `computeSigmaOmega` all operate on
`closes: number[]` only) — OHLC/volume have no bearing on any assertion, so
`open = previous close`, `high = max(open, close)`, `low = min(open, close)`,
`volume = 1000` (a constant placeholder) for every candle.

The 50 closes are built in two segments:

1. **Indices 0-35 (36 candles)** — a smooth decline from `100` down to a
   "window entry price" `Bstart`, in two phases: an initial FLAT run at
   `100` for a fraction `s` of the segment (no price movement — keeps
   EMA12/EMA26 anchored at exactly `100` for that many steps, since a
   converged EMA fed an unchanged value is an exact fixed point), followed
   by a power-law decline `price(t) = 100 + (Bstart-100)*t^p` for the
   remaining fraction, `t` normalized to `[0,1]` over that portion.
2. **Indices 36-49 (14 candles = the RSI window, `RSI_SPEC.omega=14`)** —
   starts at `Bstart` (index 36, connecting with a zero diff from index 35),
   then **12 consecutive down-candles** of size `Dn` each, then **1 sharp
   up-candle** of size `U`.

The up/down COUNTS (12 down, 1 up) and the magnitude ratio
`U = (36/17) * Dn` are chosen so `computeRSI`'s default period
(`= closes.length - 1 = 13`, i.e. the whole window feeds one plain average,
no Wilder smoothing recursion since `period === diffs.length`) gives
`avgGain/avgLoss = (1*U) / (12*Dn) = 3/17` EXACTLY, for ANY `Dn > 0` — which
is precisely the ratio that makes `RSI = 100 - 100/(1 + 3/17) = 15` exactly
(paper Cuadro 2: `confidenceRsiBullish(15) = (30-15)/30 = 0.50`). Placing
the lone up-candle at the very end (index 49, the most recent point) also
maximizes its influence on EMA12 (period 12, the most recency-sensitive of
the two MACD legs), which is what makes a net-declining 50-candle series
still produce a POSITIVE (bullish) MACD histogram at the end — the paper's
own example has RSI oversold (bearish-leaning short window) simultaneous
with a bullish MACD cross AND a bearish SMA cross, i.e. genuinely
conflicting evidence, which is the whole point of the argumentation
framework's conflict resolution (`ominus`).

## Solving for the 4 free parameters

Four unknowns — `Bstart` (window entry price), `Dn` (down-candle magnitude
inside the RSI window), `p` (curvature of the pre-window decline), `s`
(fraction of the pre-window segment that stays flat before the decline
starts) — were solved against four target equations using a numeric
multivariate Newton-Raphson solver (finite-difference Jacobian, backtracking
line search) implemented against a byte-for-byte copy of this repo's own
`computeRSI`/`computeMACD`/`computeSMA`/`computeSigmaOmega`/`confidence*`
formulas (so the solved parameters are guaranteed consistent with the real
`src/stream/*` implementation, not an approximation of it):

| # | Target equation | Target value |
|---|---|---|
| 1 | `confidenceSmaBearish(SMA20, SMA50)` (over the full 50-candle window) | `0.15` |
| 2 | `computeSigmaOmega(RSI window closes)` (the RSI window's OWN 14-candle sigma_omega) | `0.008` (=> `rho=0.40`) |
| 3 | `computeMACD(closes).histogram / computeMACD(closes).sigmaH` (over the full 50-candle window) | `0.80` |
| 4 | `computeSigmaOmega(full 50-candle closes)` (shared MACD/SMA sigma_omega, per the deviation above) | `0.01` (=> `rho_shared=0.50`) |

The solver converged to residuals on the order of `1e-15` (machine epsilon),
far inside the golden test's `1e-9` tolerance:

```
Bstart = 76.27366344393879
Dn     = 0.6693982737809604
p      = 0.510412307286751
s      = 0.5496924446627729
```

## Verification (recomputed directly from `candles.json`)

| Quantity | Value | Target |
|---|---|---|
| RSI (14-window) | `15.000000000000142` | `15` (=> gamma=0.50) |
| sigma_omega (RSI's own 14-window) | `0.008000000000000054` | `0.008` (=> rho=0.40) |
| MACD histogram/sigmaH ratio | `0.7999999999999966` | `0.80` (=> gamma=0.80) |
| sigma_omega (shared 50-window, MACD & SMA) | `0.010000000000000113` | `0.01` (=> rho_shared=0.50) |
| SMA20 | `73.94649513047383` | — |
| SMA50 | `86.99587662408686` | SMA50 > SMA20 (bearish cross) |
| confidenceSmaBearish(SMA20,SMA50) | `0.14999999999999997` | `0.15` (=> gamma=0.15) |
| Bollinger band (last-20-window) | `lower=66.68, upper=81.22, lastClose=69.66` | strictly inside band — no bollinger evidence fires, matching the paper's 3-evidence-only example |

Resulting evidence set (via `extractEvidence`, matching the paper's e1/e2/e3):

- `rsi_bullish<0.50, 0.40>`
- `macd_bullish<0.80, 0.50>` (rho differs from the paper's literal `0.10` — see deviation above)
- `sma_bearish<0.15, 0.50>` (rho differs from the paper's literal `0.30` — see deviation above)

Final decision (via `evaluateGraph` + `decide`), asserted by
`tests/golden/paper-example.test.ts` at `1e-9` tolerance:

- `lambda*(mu+) = <0.50, 0.00>`
- `sigma+ = 0.75`, `sigma- = 0.475`, `gap = 0.275`
- `recommendation = BUY`

No bollinger evidence is emitted (price stays inside the bands), matching
the paper's example, which only uses e1/e2/e3.
