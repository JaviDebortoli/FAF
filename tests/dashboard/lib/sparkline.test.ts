import { describe, expect, it } from 'vitest';
import { sparklinePath } from '@/app/(dashboard)/lib/sparkline';

// design.md "SVG Argumentation Graph" section, "Sparkline": sparklinePath(closes, w, h)
// over trace.candles closes with min/max normalization, a flat-series guard
// (max === min -> mid-line, no division by zero — same guard discipline as
// confidence.ts's sigma_H === 0), plus an empty-candles guard.

describe('sparklinePath — normal series', () => {
  it('normalizes closes to [0,h] against min/max, spread evenly across [0,w]', () => {
    // min=100 -> y=h (bottom), max=200 -> y=0 (top); values chosen so the
    // normalized y coordinates land on clean integers.
    const path = sparklinePath([100, 150, 200], 100, 50);

    expect(path).toBe('M 0 50 L 50 25 L 100 0');
  });

  it('produces a different path for a different series (proves it is not hardcoded)', () => {
    const path = sparklinePath([200, 100], 100, 50);

    expect(path).toBe('M 0 0 L 100 50');
  });
});

describe('sparklinePath — flat-series guard', () => {
  it('renders a mid-line without dividing by zero when max === min', () => {
    const path = sparklinePath([100, 100, 100], 90, 40);

    expect(path).toBe('M 0 20 L 45 20 L 90 20');
    expect(path).not.toContain('NaN');
    expect(path).not.toContain('Infinity');
  });

  it('renders a mid-line for a single close (no second point to derive a trend from)', () => {
    const path = sparklinePath([150], 100, 50);

    expect(path).toBe('M 0 25 L 100 25');
    expect(path).not.toContain('NaN');
  });
});

describe('sparklinePath — empty-candles guard', () => {
  it('returns an empty string when there are no closes', () => {
    const path = sparklinePath([], 100, 50);

    expect(path).toBe('');
  });
});
