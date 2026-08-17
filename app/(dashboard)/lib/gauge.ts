/**
 * design.md "SVG Argumentation Graph" / "Tailwind Adoption": pure geometry
 * for the σ⁺/σ⁻ semicircular gauge. Value 0 maps to the leftmost point of
 * the semicircle, value 1 to the rightmost point — same normalization
 * convention as `sparkline.ts`. Fixed viewBox so a component just drops the
 * returned path strings into `<svg>`, no runtime measurement.
 */
export const GAUGE_VIEWBOX = '0 0 200 110';
export const GAUGE_CX = 100;
export const GAUGE_CY = 100;
export const GAUGE_ARC_RADIUS = 80;
export const GAUGE_NEEDLE_RADIUS = 70;
export const GAUGE_TICK_INNER_RADIUS = 72;
export const GAUGE_TICK_OUTER_RADIUS = 88;

export interface GaugeTick {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface GaugeGeometry {
  arcPath: string;
  needlePlusPath: string;
  needleMinusPath: string;
  thetaTick: GaugeTick;
}

function clamp01(value: number): number {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

/** value=0 -> PI (leftmost), value=1 -> 0 (rightmost), value=0.5 -> PI/2 (top-center). */
function angleForValue(value: number): number {
  return Math.PI * (1 - clamp01(value));
}

function pointOnArc(angle: number, radius: number): { x: number; y: number } {
  return {
    x: GAUGE_CX + radius * Math.cos(angle),
    y: GAUGE_CY - radius * Math.sin(angle),
  };
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

function needlePath(angle: number): string {
  const { x, y } = pointOnArc(angle, GAUGE_NEEDLE_RADIUS);
  return `M ${GAUGE_CX} ${GAUGE_CY} L ${round(x)} ${round(y)}`;
}

/** Fixed semicircular background arc, independent of sigma+/sigma-/theta. */
function backgroundArcPath(): string {
  const start = pointOnArc(angleForValue(0), GAUGE_ARC_RADIUS);
  const end = pointOnArc(angleForValue(1), GAUGE_ARC_RADIUS);
  return `M ${round(start.x)} ${round(start.y)} A ${GAUGE_ARC_RADIUS} ${GAUGE_ARC_RADIUS} 0 0 1 ${round(end.x)} ${round(end.y)}`;
}

export function computeGauge(sigmaPlus: number, sigmaMinus: number, theta: number): GaugeGeometry {
  const thetaAngle = angleForValue(theta);
  const inner = pointOnArc(thetaAngle, GAUGE_TICK_INNER_RADIUS);
  const outer = pointOnArc(thetaAngle, GAUGE_TICK_OUTER_RADIUS);

  return {
    arcPath: backgroundArcPath(),
    needlePlusPath: needlePath(angleForValue(sigmaPlus)),
    needleMinusPath: needlePath(angleForValue(sigmaMinus)),
    thetaTick: {
      x1: round(inner.x),
      y1: round(inner.y),
      x2: round(outer.x),
      y2: round(outer.y),
    },
  };
}
