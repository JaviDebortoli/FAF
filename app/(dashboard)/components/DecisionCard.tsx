import type { Decision } from '@/src/domain/types';
import { computeScores } from '../lib/scores';
import { RecommendationBadge } from './RecommendationBadge';
import { ScoreGauge } from './ScoreGauge';
import { Sparkline } from './Sparkline';

interface DecisionCardProps {
  decision: Decision;
  onSelect: (asset: string) => void;
}

/**
 * design.md "Component Architecture": composes badge + gauge + sparkline
 * for one actionable asset (`decision.recommendation !== 'NO_RECOMMENDATION'`,
 * guaranteed by the caller via `lib/select.ts`'s `selectActionable`). No
 * `'use client'` — it is a "shared" node in the design's component diagram,
 * imported by the `OverviewClient` client island so it lands in the client
 * bundle without needing its own hydration boundary. Instrument-panel visual
 * language: hairline border, flat `rounded-md`, no shadow/gradient.
 */
export function DecisionCard({ decision, onSelect }: DecisionCardProps) {
  const { sigmaPlus, sigmaMinus, theta, gap } = computeScores(decision);
  const recommendation = decision.recommendation === 'BUY' ? 'BUY' : 'SELL';

  return (
    <button
      type="button"
      data-testid={`decision-card-${decision.asset}`}
      onClick={() => onSelect(decision.asset)}
      className="flex w-full flex-col gap-3 rounded-md border border-zinc-800 bg-zinc-950 p-4 text-left transition-colors hover:border-zinc-700 focus:outline-none focus-visible:ring-1 focus-visible:ring-zinc-500 motion-reduce:transition-none"
    >
      <div className="flex items-center justify-between">
        <span className="font-mono text-sm font-medium tracking-tight text-zinc-100">{decision.asset}</span>
        <RecommendationBadge recommendation={recommendation} />
      </div>

      <ScoreGauge sigmaPlus={sigmaPlus} sigmaMinus={sigmaMinus} theta={theta} />

      <div className="flex items-center justify-between font-mono text-xs tabular-nums text-zinc-500">
        <span>gap {gap.toFixed(3)}</span>
        <span>θ {theta.toFixed(2)}</span>
      </div>

      <Sparkline candles={decision.trace.candles} />
    </button>
  );
}
