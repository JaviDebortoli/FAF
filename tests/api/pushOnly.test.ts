import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// design.md "delete pullAssets.ts, retain binance.ts + provider.ts" + the
// semantic-ingestion delta's "POST /api/cycle is the sole ingestion entry
// point": GET /api/decisions must never import a Binance-fetching module,
// proven structurally (not just behaviorally via a fetch spy). Same
// mechanism as the existing tests/narrative/staticImport.test.ts.
//
// Scope note (deviation from design.md/tasks.md's literal "walk
// app/api/decisions/**"): the narrative route
// (app/api/decisions/[asset]/narrative/route.ts) still imports
// src/cycle/pullAssets.ts as of this PR — migrating it off that import is
// Phase 2b's own scope (task 2b.2), which is also what makes
// src/cycle/pullAssets.ts's deletion safe (it deletes the narrative route's
// getDecisionForAsset() fallback, its last caller). Guarding the whole
// app/api/decisions/** subtree here would fail on a file this PR does not
// own. This test therefore scopes to app/api/decisions/route.ts only; Phase
// 2b's own work restores full-subtree coverage once its migration lands.

const BANNED_SPECIFIER_SEGMENTS = ['src/market/binance', 'src/cycle/pullAssets'];
const GUARDED_FILE = join('app', 'api', 'decisions', 'route.ts');

// Matches `from '...'`, `import '...'`, and dynamic `import('...')` specifiers.
const IMPORT_SPECIFIER_RE = /(?:from|import)\s*\(?\s*['"]([^'"]+)['"]/g;

function importSpecifiersIn(filePath: string): string[] {
  const content = readFileSync(filePath, 'utf-8');
  const specifiers: string[] = [];
  IMPORT_SPECIFIER_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = IMPORT_SPECIFIER_RE.exec(content)) !== null) {
    if (match[1]) specifiers.push(match[1]);
  }
  return specifiers;
}

describe('GET /api/decisions is push-only: no import of a Binance-fetching module', () => {
  it('app/api/decisions/route.ts imports no market-data fetch module', () => {
    const specifiers = importSpecifiersIn(GUARDED_FILE);
    // Sanity: prove the checker actually scanned real imports, not an empty/missing file.
    expect(specifiers.length).toBeGreaterThan(0);

    const offenders = specifiers.filter((specifier) =>
      BANNED_SPECIFIER_SEGMENTS.some((banned) => specifier.includes(banned)),
    );

    expect(offenders).toEqual([]);
  });
});
