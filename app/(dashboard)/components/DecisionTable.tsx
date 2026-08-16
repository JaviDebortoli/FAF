import type { Decision } from '@/src/domain/types';
import { score } from '@/src/decision/policy';

interface DecisionTableProps {
  decisions: Decision[];
  selectedAsset: string | null;
  onSelect: (decision: Decision) => void;
}

/**
 * Minimal tabular decision list (design.md decision-dashboard spec):
 * asset, timestamp, recommendation, sigma+, sigma-, gap. Deliberately NO
 * narrative text and NO graph visualization (deviation D3, deferred to v2).
 */
export function DecisionTable({ decisions, selectedAsset, onSelect }: DecisionTableProps) {
  if (decisions.length === 0) {
    return <p>No decisions available yet.</p>;
  }

  return (
    <table>
      <thead>
        <tr>
          <th>Asset</th>
          <th>Timestamp</th>
          <th>Recommendation</th>
          <th>sigma+</th>
          <th>sigma-</th>
          <th>Gap</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {decisions.map((decision) => {
          const sigmaPlus = score(decision.bullish.net);
          const sigmaMinus = score(decision.bearish.net);
          const isSelected = decision.asset === selectedAsset;
          return (
            <tr key={decision.asset} aria-selected={isSelected}>
              <td>{decision.asset}</td>
              <td>{new Date(decision.t).toISOString()}</td>
              <td>{decision.recommendation}</td>
              <td>{sigmaPlus.toFixed(4)}</td>
              <td>{sigmaMinus.toFixed(4)}</td>
              <td>{decision.gap.toFixed(4)}</td>
              <td>
                <button type="button" onClick={() => onSelect(decision)}>
                  {isSelected ? 'Selected' : 'View trace'}
                </button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
