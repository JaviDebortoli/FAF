import { Store, Writer } from 'n3';
import type { Quad } from 'n3';
import { FAF_NS, XSD_NS } from './ontology';

/** Per-cycle N3.Store factory (design.md: "no store retains reasoning state between cycles"). */
export function createStore(quads: Quad[] = []): Store {
  const store = new Store();
  store.addQuads(quads);
  return store;
}

/**
 * Turtle serialization for the trace payload (Decision.trace.turtle, §5
 * traceability). N3.Writer buffers entirely in memory (no real I/O), so its
 * callback fires synchronously; this wrapper turns that into a plain
 * synchronous return, matching every other layer's pure-function contract.
 */
export function toTurtle(quads: Quad[]): string {
  let output: string | undefined;
  let error: Error | undefined;

  const writer = new Writer({ prefixes: { faf: FAF_NS, xsd: XSD_NS } });
  writer.addQuads(quads);
  writer.end((err, result) => {
    error = err ?? undefined;
    output = result;
  });

  if (error) {
    throw error;
  }
  if (output === undefined) {
    throw new Error('toTurtle: N3.Writer#end did not resolve synchronously');
  }
  return output;
}
