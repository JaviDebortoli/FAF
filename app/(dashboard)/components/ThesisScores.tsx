import type { Decision, Label, Thesis } from '@/src/domain/types';
import { computeScores } from '../lib/scores';

interface ThesisScoresProps {
  decision: Decision;
}

/**
 * design.md "SVG Argumentation Graph": renders `aggregated`/`net`/sigma/theta
 * from `lib/scores.ts`'s canonical recompute — never `ThesisState.score`.
 * Highlights whichever side matches `decision.recommendation`. Tier-2-only
 * per D7 — imported exclusively by `DrilldownPanel`.
 */
export function ThesisScores({ decision }: ThesisScoresProps) {
  const { sigmaPlus, sigmaMinus, theta, gap } = computeScores(decision);
  const winningThesis: Thesis = decision.recommendation === 'BUY' ? 'bullish' : 'bearish';

  return (
    <dl className="grid grid-cols-2 gap-3" data-testid="thesis-scores">
      <ThesisColumn
        label="Alcista"
        aggregated={decision.bullish.aggregated}
        net={decision.bullish.net}
        sigma={sigmaPlus}
        theta={theta}
        color="var(--color-buy)"
        active={winningThesis === 'bullish'}
      />
      <ThesisColumn
        label="Bajista"
        aggregated={decision.bearish.aggregated}
        net={decision.bearish.net}
        sigma={sigmaMinus}
        theta={theta}
        color="var(--color-sell)"
        active={winningThesis === 'bearish'}
      />
      <div className="col-span-2 flex items-center justify-between border-t border-zinc-800 pt-2 font-mono text-xs tabular-nums text-zinc-500">
        <span>gap |{'σ⁺'} {'−'} {'σ⁻'}|</span>
        <span>{gap.toFixed(3)}</span>
      </div>
    </dl>
  );
}

interface ThesisColumnProps {
  label: string;
  aggregated: Label;
  net: Label;
  sigma: number;
  theta: number;
  color: string;
  active: boolean;
}

function ThesisColumn({ label, aggregated, net, sigma, theta, color, active }: ThesisColumnProps) {
  return (
    <div
      data-active={active}
      className={'flex flex-col gap-1 rounded-md border px-3 py-2 ' + (active ? 'border-current bg-current/10' : 'border-zinc-800')}
      style={active ? { color } : undefined}
    >
      <dt className="font-sans text-[11px] uppercase tracking-wide text-muted">{label}</dt>
      <dd className="font-mono text-xs tabular-nums text-zinc-300">
        {'λ(μ) = ⟨'}
        {aggregated.gamma.toFixed(2)}, {aggregated.rho.toFixed(2)}
        {'⟩'}
      </dd>
      <dd className="font-mono text-xs tabular-nums text-zinc-300">
        {'λ*(μ) = ⟨'}
        {net.gamma.toFixed(2)}, {net.rho.toFixed(2)}
        {'⟩'}
      </dd>
      <dd className="font-mono text-sm font-semibold tabular-nums" style={{ color }}>
        {'σ = '}
        {sigma.toFixed(3)}
      </dd>
      <dd className="font-mono text-xs tabular-nums text-muted">
        {'θ '}
        {theta.toFixed(2)}
      </dd>
    </div>
  );
}
