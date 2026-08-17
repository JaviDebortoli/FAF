import { describe, expect, it } from 'vitest';
import {
  computeGauge,
  GAUGE_ARC_RADIUS,
  GAUGE_CX,
  GAUGE_CY,
  GAUGE_NEEDLE_RADIUS,
  GAUGE_TICK_INNER_RADIUS,
  GAUGE_TICK_OUTER_RADIUS,
} from '@/app/(dashboard)/lib/gauge';

// design.md "SVG Argumentation Graph" / "Tailwind Adoption": semicircular
// gauge, two needles (sigma+, sigma-) plus a theta tick read from
// decision.thresholds.theta. Value 0 maps to the leftmost point of the
// semicircle, value 1 to the rightmost point, value 0.5 to the top-center —
// these are the only angles with exact (non-irrational) trig results, so
// they anchor the assertions below without floating-point noise.
//
// Path formats produced by computeGauge (asserted by index below):
//   arcPath        = "M x0 y0 A r r 0 0 1 x1 y1"  -> 9 numbers [x0,y0,r,r,0,0,1,x1,y1]
//   needlePlusPath  = "M cx cy L x y"               -> 4 numbers [cx,cy,x,y]
//   needleMinusPath = "M cx cy L x y"               -> 4 numbers [cx,cy,x,y]

function parseNumbers(path: string): number[] {
  return (path.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);
}

describe('computeGauge — background arc', () => {
  it('renders a fixed semicircular arc from the leftmost (value=0) to the rightmost (value=1) point, independent of sigma inputs', () => {
    const a = computeGauge(0, 0, 0.67);
    const b = computeGauge(0.9, 0.1, 0.5);

    expect(a.arcPath).toBe(b.arcPath);

    const nums = parseNumbers(a.arcPath);
    expect(nums).toHaveLength(9);
    const [startX, startY, , , , , , endX, endY] = nums;
    expect(startX).toBeCloseTo(GAUGE_CX - GAUGE_ARC_RADIUS, 2);
    expect(startY).toBeCloseTo(GAUGE_CY, 2);
    expect(endX).toBeCloseTo(GAUGE_CX + GAUGE_ARC_RADIUS, 2);
    expect(endY).toBeCloseTo(GAUGE_CY, 2);
  });
});

describe('computeGauge — sigma+ needle', () => {
  it('points at the rightmost point of the arc when sigmaPlus = 1', () => {
    const { needlePlusPath } = computeGauge(1, 0, 0.67);
    const nums = parseNumbers(needlePlusPath);
    expect(nums).toHaveLength(4);
    const [cx, cy, endX, endY] = nums;

    expect(cx).toBeCloseTo(GAUGE_CX, 2);
    expect(cy).toBeCloseTo(GAUGE_CY, 2);
    expect(endX).toBeCloseTo(GAUGE_CX + GAUGE_NEEDLE_RADIUS, 2);
    expect(endY).toBeCloseTo(GAUGE_CY, 2);
  });

  it('points straight up (top-center) when sigmaPlus = 0.5', () => {
    const { needlePlusPath } = computeGauge(0.5, 0, 0.67);
    const [, , endX, endY] = parseNumbers(needlePlusPath);

    expect(endX).toBeCloseTo(GAUGE_CX, 2);
    expect(endY).toBeCloseTo(GAUGE_CY - GAUGE_NEEDLE_RADIUS, 2);
  });
});

describe('computeGauge — sigma- needle', () => {
  it('points at the leftmost point of the arc when sigmaMinus = 0', () => {
    const { needleMinusPath } = computeGauge(0, 0, 0.67);
    const [, , endX, endY] = parseNumbers(needleMinusPath);

    expect(endX).toBeCloseTo(GAUGE_CX - GAUGE_NEEDLE_RADIUS, 2);
    expect(endY).toBeCloseTo(GAUGE_CY, 2);
  });
});

describe('computeGauge — theta tick', () => {
  it('places the tick at top-center (inner/outer radii) when theta = 0.5', () => {
    const { thetaTick } = computeGauge(0, 0, 0.5);

    expect(thetaTick.x1).toBeCloseTo(GAUGE_CX, 2);
    expect(thetaTick.y1).toBeCloseTo(GAUGE_CY - GAUGE_TICK_INNER_RADIUS, 2);
    expect(thetaTick.x2).toBeCloseTo(GAUGE_CX, 2);
    expect(thetaTick.y2).toBeCloseTo(GAUGE_CY - GAUGE_TICK_OUTER_RADIUS, 2);
  });
});

describe('computeGauge — boundary sigma = theta', () => {
  it('the sigma+ needle points in exactly the same direction as the theta tick when sigmaPlus === theta (both = 0.5, top-center)', () => {
    const { needlePlusPath, thetaTick } = computeGauge(0.5, 0, 0.5);
    const nums = parseNumbers(needlePlusPath);
    expect(nums).toHaveLength(4);
    const [cx, cy, needleX, needleY] = nums as [number, number, number, number];

    // Same angle (top-center), different radius: needle endpoint and tick
    // both lie on the vertical ray straight up from the gauge center.
    expect(needleX).toBeCloseTo(cx, 2);
    expect(needleY).toBeCloseTo(cy - GAUGE_NEEDLE_RADIUS, 2);
    expect(thetaTick.x1).toBeCloseTo(cx, 2);
    expect(thetaTick.x2).toBeCloseTo(cx, 2);
    expect(needleY < cy).toBe(true);
    expect(thetaTick.y1 < cy).toBe(true);
    expect(thetaTick.y2 < cy).toBe(true);
  });

  it('the sigma- needle diverges from the theta tick x-position when sigmaMinus !== theta', () => {
    const { needleMinusPath, thetaTick } = computeGauge(0, 0.1, 0.5);
    const [, , needleX] = parseNumbers(needleMinusPath);

    expect(needleX).not.toBeCloseTo(thetaTick.x1, 1);
  });
});
