import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

// design.md "delete pullAssets.ts, retain binance.ts + provider.ts" + the
// semantic-ingestion delta's "POST /api/cycle is the sole ingestion entry
// point": no GET read path under app/api/decisions/** may ever import a
// Binance-fetching module, proven structurally (not just behaviorally via a
// fetch spy). Same mechanism as the existing tests/narrative/staticImport.test.ts.
//
// Full-subtree coverage (restored in Phase 2b, task 2b.3): PR2a had scoped
// this guard to app/api/decisions/route.ts only, because the narrative
// route (app/api/decisions/[asset]/narrative/route.ts) still imported
// src/cycle/pullAssets.ts at that point. Phase 2b migrated the narrative
// route to isWellFormedAsset and deleted src/cycle/pullAssets.ts (its last
// caller), so the whole app/api/decisions/** subtree is guarded again.

const BANNED_SPECIFIER_SEGMENTS = ['src/market/binance', 'src/cycle/pullAssets'];
const GUARDED_DIR = join('app', 'api', 'decisions');

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

describe('GET /api/decisions/** is push-only: no import of a Binance-fetching module', () => {
  it('no file under app/api/decisions/** imports a market-data fetch module', () => {
    const files = walkTsFiles(GUARDED_DIR);
    // Sanity: prove the checker actually scanned real files, not an empty/missing dir.
    expect(files.length).toBeGreaterThan(0);

    const offenders = files.flatMap((file) =>
      importSpecifiersIn(file)
        .filter((specifier) => BANNED_SPECIFIER_SEGMENTS.some((banned) => specifier.includes(banned)))
        .map((specifier) => `${file} -> ${specifier}`),
    );

    expect(offenders).toEqual([]);
  });
});
