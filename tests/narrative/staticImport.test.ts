import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

// design.md D7 clause 6 / "Grounding": src/{rdf,stream,laf,decision,cycle}
// (L1-L4, the reasoning core) MUST be unmodified and MUST NEVER import
// src/narrative/* — dependency direction is narrative -> domain/types and
// nothing else, so "the core is untouched" stays literally true. This is an
// enforced static-import check, not a comment: it walks every .ts file under
// each guarded directory and greps its import/export/dynamic-import
// specifiers for a "narrative" segment.
//
// Note on TDD phase: this invariant already holds by construction (no L1-L4
// module has ever imported src/narrative — that module tree did not exist
// before this phase). There is no way to observe a genuine RED state for a
// pre-existing invariant; writing this checker/test IS both 3.3 and 3.4 (no
// separate production code is needed — see tasks.md's own parenthetical).

const GUARDED_DIRS = ['src/rdf', 'src/stream', 'src/laf', 'src/decision', 'src/cycle'];

// Matches `from '...'`, `import '...'`, and dynamic `import('...')` specifiers.
const IMPORT_SPECIFIER_RE = /(?:from|import)\s*\(?\s*['"]([^'"]+)['"]/g;

function walkTsFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      files.push(...walkTsFiles(full));
    } else if (entry.endsWith('.ts') && !entry.endsWith('.d.ts')) {
      files.push(full);
    }
  }
  return files;
}

function narrativeImportsIn(filePath: string): string[] {
  const content = readFileSync(filePath, 'utf-8');
  const hits: string[] = [];
  IMPORT_SPECIFIER_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = IMPORT_SPECIFIER_RE.exec(content)) !== null) {
    const specifier = match[1];
    if (specifier && specifier.includes('narrative')) hits.push(specifier);
  }
  return hits;
}

describe('reasoning core (L1-L4) never imports src/narrative/* (design.md D7 clause 6)', () => {
  it.each(GUARDED_DIRS)('%s contains no static or dynamic import of src/narrative/*', (dir) => {
    const files = walkTsFiles(dir);
    // Sanity: prove the checker actually scanned real files, not an empty/missing dir.
    expect(files.length).toBeGreaterThan(0);

    const offenders = files.flatMap((file) => narrativeImportsIn(file).map((specifier) => `${file} -> ${specifier}`));

    expect(offenders).toEqual([]);
  });
});
