import { GAUGE_CX, GAUGE_CY, GAUGE_VIEWBOX, computeGauge } from '../lib/gauge';

interface ScoreGaugeProps {
  sigmaPlus: number;
  sigmaMinus: number;
  theta: number;
}

/**
 * design.md "SVG Argumentation Graph" / "Gauge": thin mapper from
 * `lib/gauge.ts`'s pure geometry to markup — no geometry computed here. This
 * is the dashboard's signature element: a real analog instrument-needle
 * gauge (not a generic progress ring), with the theta tick rendered in
 * `--color-threshold` (amber) so the framework's own decision threshold is
 * physically visible, distinct from the buy/sell needle colors.
 */
export function ScoreGauge({ sigmaPlus, sigmaMinus, theta }: ScoreGaugeProps) {
  const { arcPath, needlePlusPath, needleMinusPath, thetaTick } = computeGauge(sigmaPlus, sigmaMinus, theta);

  return (
    <svg
      role="img"
      aria-label={`sigma+ ${sigmaPlus.toFixed(2)}, sigma- ${sigmaMinus.toFixed(2)}, theta ${theta.toFixed(2)}`}
      viewBox={GAUGE_VIEWBOX}
      className="h-20 w-full text-zinc-800"
    >
      <path d={arcPath} fill="none" stroke="currentColor" strokeWidth={10} strokeLinecap="round" />

      <line
        x1={thetaTick.x1}
        y1={thetaTick.y1}
        x2={thetaTick.x2}
        y2={thetaTick.y2}
        stroke="var(--color-threshold)"
        strokeWidth={2.5}
        strokeLinecap="round"
      />

      <path d={needleMinusPath} fill="none" stroke="var(--color-sell)" strokeWidth={2.5} strokeLinecap="round" opacity={0.85} />
      <path d={needlePlusPath} fill="none" stroke="var(--color-buy)" strokeWidth={3} strokeLinecap="round" />

      <circle cx={GAUGE_CX} cy={GAUGE_CY} r={3.5} fill="currentColor" className="text-zinc-500" />
    </svg>
  );
}
