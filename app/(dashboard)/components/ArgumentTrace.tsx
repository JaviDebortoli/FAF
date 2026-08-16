import type { Decision } from '@/src/domain/types';
import { RULES } from '@/src/laf/rules';

interface ArgumentTraceProps {
  decision: Decision;
}

/**
 * Argument-trace detail table (design.md decision-dashboard spec):
 * predicate -> rule -> argument label -> net thesis label. Tabular chain
 * only, no narrative text (D3, deferred to v2). Sources every value
 * straight from `decision.trace.evidences` (raw evidence) and
 * `decision.bullish/bearish.net` (post-`ominus` labels) — no recomputation.
 */
export function ArgumentTrace({ decision }: ArgumentTraceProps) {
  const { evidences } = decision.trace;

  if (evidences.length === 0) {
    return <p>No active evidence for {decision.asset} at this cycle.</p>;
  }

  return (
    <table>
      <caption>
        Argument trace — {decision.asset} @ {new Date(decision.t).toISOString()}
      </caption>
      <thead>
        <tr>
          <th>Predicate</th>
          <th>Rule</th>
          <th>Thesis</th>
          <th>Argument label (gamma, rho)</th>
          <th>Net thesis label lambda*(mu) (gamma, rho)</th>
        </tr>
      </thead>
      <tbody>
        {evidences.map((evidence) => {
          const rule = RULES.find((r) => r.predicate === evidence.predicate);
          const netLabel = rule?.thesis === 'bearish' ? decision.bearish.net : decision.bullish.net;
          return (
            <tr key={evidence.predicate}>
              <td>{evidence.predicate}</td>
              <td>{rule?.id ?? '-'}</td>
              <td>{rule?.thesis ?? '-'}</td>
              <td>
                ({evidence.label.gamma.toFixed(4)}, {evidence.label.rho.toFixed(4)})
              </td>
              <td>
                ({netLabel.gamma.toFixed(4)}, {netLabel.rho.toFixed(4)})
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
