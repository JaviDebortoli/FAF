interface ServiceUnavailableProps {
  /** Drives ONLY the `data-reason` attribute for test/observability purposes —
   * never visible copy. Both reasons render the identical user-facing,
   * architecture-agnostic message; the end user has no concept of "no data
   * yet" vs. "the read failed" and must not be shown internal mechanics. */
  reason: 'no-data' | 'error';
}

/**
 * design.md "Decision: new `ServiceUnavailable` component, not a third
 * `EmptyState` variant" — a distinct sibling to `EmptyState`. `EmptyState` is
 * about *selection* producing zero cards from data that exists; this is about
 * *data absence* (no cached report at all). Same visual language and Spanish
 * register as `EmptyState`, deliberately structurally separate so
 * `getByTestId('empty-state')` (asserted in existing e2e tests) never matches
 * this condition.
 */
export function ServiceUnavailable({ reason }: ServiceUnavailableProps) {
  return (
    <div
      data-testid="service-unavailable"
      data-reason={reason}
      role="status"
      className="flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-zinc-800 px-6 py-16 text-center"
    >
      <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">SERVICIO NO DISPONIBLE</span>
      <p className="max-w-sm text-sm text-zinc-400">Servicio momentáneamente no disponible</p>
      <p className="max-w-sm text-xs text-zinc-500">Vuelve a intentarlo en unos minutos.</p>
    </div>
  );
}
