import type { Candle } from '@/src/domain/types';
import { sparklinePath } from '../lib/sparkline';

interface SparklineProps {
  candles: Candle[];
  width?: number;
  height?: number;
}

const DEFAULT_WIDTH = 200;
const DEFAULT_HEIGHT = 48;

/**
 * design.md "SVG Argumentation Graph" / "Sparkline": thin mapper over
 * `lib/sparkline.ts`'s pure path builder. No coordinate math here — the
 * component only extracts `close` values and renders the returned `d`
 * string. `lib/sparkline.ts`'s public API (fixed in PR1a) returns a path
 * string only, not per-point coordinates, so a last-close marker dot is
 * intentionally omitted here rather than duplicating the normalization
 * inline (would contradict "geometry lives in pure functions, not JSX").
 */
export function Sparkline({ candles, width = DEFAULT_WIDTH, height = DEFAULT_HEIGHT }: SparklineProps) {
  const closes = candles.map((c) => c.close);
  const d = sparklinePath(closes, width, height);

  return (
    <svg role="img" aria-label="price sparkline" viewBox={`0 0 ${width} ${height}`} className="h-12 w-full text-zinc-400">
      {d && <path d={d} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinejoin="round" />}
    </svg>
  );
}
