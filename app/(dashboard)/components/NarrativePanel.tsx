'use client';

import { useEffect, useRef, useState } from 'react';

type NarrativeState = 'idle' | 'loading' | 'streaming' | 'done' | 'unavailable' | 'failed';

interface NarrativePanelProps {
  asset: string;
}

const INCOMPLETE_MARKER = '\n\n[NARRATIVE_INCOMPLETE]';

/**
 * Error codes design.md's client state machine groups as "not applicable /
 * not configured" — calm copy, no retry offered (a retry cannot change these
 * outcomes). 400/404 are defensive: they should not normally occur, since
 * only actionable assets ever get a drill-down, but are handled the same way
 * rather than surfaced as alarming errors.
 */
const UNAVAILABLE_CODES = new Set(['BAD_ASSET', 'NO_DECISION', 'NOT_APPLICABLE', 'NARRATIVE_DISABLED']);

/**
 * design.md "Client state machine": idle -> loading -> streaming ->
 * done | unavailable | failed. Mounted lazily by `DrilldownPanel` on first
 * open only — never prefetched, never rendered on Tier 1 (D7 clause 1/3).
 *
 * Decision: re-mounting (close + reopen the drill-down) re-triggers this
 * fetch rather than reusing an in-memory client-side result.
 * `DrilldownPanel` unmounts this component on close, so there is no
 * client-side cache to invalidate; the backend's own `(asset, decision.t)`
 * cache (`src/narrative/cache.ts`) already absorbs a same-window reopen
 * without a second Claude call, so duplicating that cache on the client
 * would be a second source of truth for no benefit.
 */
export function NarrativePanel({ asset }: NarrativePanelProps) {
  const [state, setState] = useState<NarrativeState>('idle');
  const [text, setText] = useState('');
  const [attempt, setAttempt] = useState(0);
  const cancelledRef = useRef(false);

  useEffect(() => {
    cancelledRef.current = false;
    setState('loading');
    setText('');

    async function run() {
      let response: Response;
      try {
        response = await fetch(`/api/decisions/${asset}/narrative`);
      } catch {
        if (!cancelledRef.current) setState('failed');
        return;
      }

      if (cancelledRef.current) return;

      if (!response.ok) {
        let code: string | undefined;
        try {
          const body = (await response.json()) as { code?: string };
          code = body.code;
        } catch {
          code = undefined;
        }
        if (!cancelledRef.current) {
          setState(code && UNAVAILABLE_CODES.has(code) ? 'unavailable' : 'failed');
        }
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        if (!cancelledRef.current) setState('failed');
        return;
      }

      const decoder = new TextDecoder();
      let full = '';
      let firstChunk = true;

      for (;;) {
        const { done, value } = await reader.read();
        if (cancelledRef.current) return;
        if (done) break;

        full += decoder.decode(value, { stream: true });
        if (firstChunk) {
          firstChunk = false;
          setState('streaming');
        }
        setText(full.endsWith(INCOMPLETE_MARKER) ? full.slice(0, -INCOMPLETE_MARKER.length) : full);
      }

      if (cancelledRef.current) return;

      if (full.endsWith(INCOMPLETE_MARKER)) {
        setText(full.slice(0, -INCOMPLETE_MARKER.length));
        setState('failed');
      } else {
        setText(full);
        setState('done');
      }
    }

    void run();

    return () => {
      cancelledRef.current = true;
    };
  }, [asset, attempt]);

  return (
    <section
      aria-label="Narrativa generada por IA"
      data-testid="narrative-panel"
      data-state={state}
      className="flex shrink-0 flex-col gap-2 rounded-md border border-zinc-800 bg-zinc-950 p-3"
    >
      {/* design-narrative spec "Visible AI-generated disclaimer": directly
          attached header, never a distant footnote — present for every
          state so the disclaimer and the narrative text can never be
          visually separated. */}
      <div className="flex flex-wrap items-center gap-2 border-b border-zinc-800 pb-2">
        <span
          data-testid="narrative-ai-disclaimer"
          className="inline-flex items-center gap-1 rounded-md border border-threshold/40 bg-threshold/10 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide text-threshold"
        >
          Generado por IA
        </span>
        <span className="font-sans text-[11px] text-muted">no reemplaza los valores deterministas de arriba</span>
      </div>

      {state === 'idle' || state === 'loading' ? <p className="font-sans text-sm text-muted">Generando narrativa…</p> : null}

      {(state === 'streaming' || state === 'done') && (
        <p className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-zinc-200" data-testid="narrative-text">
          {text}
          {state === 'streaming' && <span aria-hidden="true">▍</span>}
        </p>
      )}

      {state === 'unavailable' && (
        <p className="font-sans text-sm text-muted" data-testid="narrative-unavailable">
          La narrativa no está disponible para esta decisión.
        </p>
      )}

      {state === 'failed' && (
        <div className="flex flex-col gap-2" data-testid="narrative-failed">
          {text && <p className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-zinc-200">{text}</p>}
          <p className="font-sans text-sm text-muted">La narrativa no está disponible en este momento.</p>
          <button
            type="button"
            onClick={() => setAttempt((n) => n + 1)}
            className="self-start rounded-md border border-zinc-700 px-3 py-1 font-mono text-xs text-zinc-300 transition-colors hover:border-zinc-500 motion-reduce:transition-none"
          >
            Reintentar
          </button>
        </div>
      )}
    </section>
  );
}
