'use client';

import type { Direction } from '../lib/select';

interface DirectionFilterProps {
  value: Direction;
  onChange: (value: Direction) => void;
}

/** design.md "Tier 1 selection rule": ALL/BUY/SELL only — `NO_RECOMMENDATION`
 * never produces a filterable option. Marked `'use client'` per the design's
 * component diagram, which lists this node explicitly as "(client)". */
const OPTIONS: Direction[] = ['ALL', 'BUY', 'SELL'];

export function DirectionFilter({ value, onChange }: DirectionFilterProps) {
  return (
    <div
      role="group"
      aria-label="Direction filter"
      className="inline-flex rounded-md border border-zinc-800 font-mono text-xs uppercase tracking-wide"
    >
      {OPTIONS.map((option, i) => {
        const active = option === value;
        return (
          <button
            key={option}
            type="button"
            data-testid={`direction-filter-${option}`}
            aria-pressed={active}
            onClick={() => onChange(option)}
            className={
              'px-3 py-1.5 transition-colors motion-reduce:transition-none ' +
              (active ? 'bg-zinc-100 text-zinc-950' : 'text-zinc-400 hover:text-zinc-100') +
              (i > 0 ? ' border-l border-zinc-800' : '')
            }
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}
