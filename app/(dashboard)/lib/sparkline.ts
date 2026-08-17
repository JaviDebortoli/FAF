/**
 * design.md "SVG Argumentation Graph" section, "Sparkline": a pure SVG path
 * builder over `trace.candles` closes, min/max-normalized into [0,h]
 * (0 = lowest close -> bottom, h = highest close -> top), spread evenly
 * across [0,w]. Flat-series guard mirrors `confidence.ts`'s `sigma_H === 0`
 * discipline: when `max === min` there is no trend to show, so every point
 * renders on the mid-line instead of dividing by zero.
 */
export function sparklinePath(closes: number[], w: number, h: number): string {
  if (closes.length === 0) return '';

  if (closes.length === 1) {
    const y = h / 2;
    return `M 0 ${y} L ${w} ${y}`;
  }

  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const range = max - min;
  const stepX = w / (closes.length - 1);

  const points = closes.map((close, i) => {
    const x = i * stepX;
    const y = range === 0 ? h / 2 : h - ((close - min) / range) * h;
    return { x, y };
  });

  return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
}
