```yaml
schema: gentle-ai.verify-result/v1
evidence_revision: sha256:083564a9e2cb5eb88540924a5e34e9676c19e145dbb9a8959db76271425c231c
verdict: pass
blockers: 0
critical_findings: 0
requirements: 1/1
scenarios: 5/5
test_command: npx vitest run && npx playwright test
test_exit_code: 0
test_output_hash: sha256:d23fd1657b1af07eff3b595555bc3d1b35cfa4e75fc505c3c4a9d23fcad69539
build_command: npx tsc --noEmit
build_exit_code: 0
build_output_hash: sha256:d19b7590b5971f5ca63f3c361b087093373d1322c1a6aa8354fa63463d57b553
```

## Verification Report

**Change**: dashboard-cleanup-and-footer-revert
**Version**: N/A (no version pin found)
**Mode**: Strict TDD

### Completeness
| Metric | Value |
|--------|-------|
| Tasks total | 27 |
| Tasks complete (in-scope) | 26 |
| Tasks incomplete | 1 (task 7.1, deliberately deferred to sdd-archive per repo convention) |

### Build and Tests Execution
**Build**: PASSED
```text
npx tsc --noEmit
(no output, 0 errors)
Exit code: 0
```

**Tests**: 272 passed / 0 failed / 0 skipped (224 vitest + 48 playwright)
```text
npx vitest run
 Test Files  37 passed (37)
      Tests  224 passed (224)

npx playwright test
  48 passed (1.6m)
Exit code: 0
```

**Coverage**: Not available, no coverage tool configured in this repo.

### Regression-Proof Reproduction (independent, not trusting apply-progress.md)
Reproduced Phase 5 independently by temporarily reverting ONLY the main className on app/dashboard/(with-footer)/inicio/page.tsx (min-h-[calc(100vh-12rem)] to min-h-screen), keeping the route move and all other changes intact:

```text
npx playwright test tests/e2e/market-nav.spec.ts -g "no phantom vertical scroll on /dashboard/inicio"

Error: expect(received).toBeLessThanOrEqual(expected)
Expected: <= 1001
Received:    1192
  at tests/e2e/market-nav.spec.ts:192:26
1 failed
```

Matches apply-progress.md's reported signature exactly (Expected <= 1001, Received 1192 at 1280x1000 viewport, ~192px excess consistent with the pb-48 double-count root cause). Restored the file via exact byte-restore (cp/mv round trip, confirmed via grep that min-h-[calc(100vh-12rem)] was back verbatim), re-ran the same test: PASSED (1.3s). No stray files left in the working tree.

### Spec Compliance Matrix (market-navigation - "Shared shell footer", MODIFIED)
| Requirement | Scenario | Test | Result |
|-------------|----------|------|--------|
| Shared shell footer | Footer renders with exact copy on the crypto route | market-nav.spec.ts:75 | COMPLIANT |
| Shared shell footer | Footer renders with the same exact copy on a placeholder-market route | market-nav.spec.ts:75 (same test, crypto + acciones byte-identical) | COMPLIANT |
| Shared shell footer | Footer renders with the same exact copy on the Inicio route | market-nav.spec.ts:300 | COMPLIANT |
| Shared shell footer | Old footer copy is fully absent from the DOM | market-nav.spec.ts:92 (checks crypto + acciones only, not Inicio explicitly) | PARTIAL (immaterial, see SUGGESTION) |
| Shared shell footer | Footer does not overlap page content | market-nav.spec.ts:104-115 (crypto) + market-nav.spec.ts:119-130 (Inicio, added this change) | COMPLIANT |

**Compliance summary**: 5/5 scenarios compliant (1 PARTIAL, immaterial, see SUGGESTION).

### Correctness (Static Evidence, independently re-read in full)
| Requirement | Status | Notes |
|------------|--------|-------|
| Old Inicio path removed (moved, not duplicated) | Implemented | app/dashboard/inicio/page.tsx confirmed absent; git status shows RM app/dashboard/inicio/page.tsx to app/dashboard/(with-footer)/inicio/page.tsx, a true rename |
| Point 1 punctuation fix | Implemented | Comma+y phrasing confirmed verbatim in the moved file |
| Point 3 main className fix | Implemented | min-h-[calc(100vh-12rem)] confirmed, byte-identical to crypto/page.tsx and [market]/page.tsx main className |
| Point 3 header comment rewrite (moved page) | Implemented | Genuinely rewritten, explicitly names dashboard-cleanup-and-footer-revert, describes the footer-revert rationale |
| Point 3 header comment rewrite (app/dashboard/layout.tsx) | Implemented | Genuinely rewritten, drops the Inicio exception claim |
| Point 3 header comment rewrite (app/dashboard/(with-footer)/layout.tsx) | Implemented | Genuinely rewritten, confirms Inicio is now wrapped |
| Point 2 theta display removed (Alcista + Bajista) | Implemented | ThesisScores.tsx's ThesisColumn renders only aggregated/net/sigma dd elements, no theta dd in either column |
| Point 2 gap row removed | Implemented | No gap-related JSX remains, fully deleted not hidden |
| Point 2 theta removed from props/destructure/call sites | Implemented | ThesisColumnProps has no theta field; destructure omits it; both call sites omit theta= |
| Point 2 DecisionCard.tsx untouched | Confirmed unaffected | Independently read in full; still destructures theta/gap from computeScores and renders its own gap/theta row |
| git diff --stat -- openspec/specs/ empty | Confirmed | Empty output, live main spec untouched, correctly deferred to sdd-archive (task 7.1) |

### Coherence (Design)
No design.md exists for this change, deliberately skipped per proposal (all three points fully resolved during exploration, no open design ambiguity). Design coherence check is skipped; proposal + exploration.md substitute for design intent and were cross-checked against implementation above.

### Deviation Review (apply-progress.md's 2 documented deviations)
1. Phantom-scroll test viewport 1280x1000 vs tasks.md's suggested 1280x800: independently verified as a genuine necessity, not corner-cutting. Inicio's real content is taller than crypto's EmptyState; an 800px viewport would show real (non-phantom) scroll even with the fix correctly applied. The reproduction above confirms the test still correctly isolates the double-counting bug at 1000px. Sound.
2. Task 3.4 "confirm 3.1-3.3 fail pre-move", only 3.1/3.2 did: reasoning is sound. Pre-move, Inicio sat outside (with-footer)/ with no pb-48 reservation at all, so the bug this test guards against did not exist yet on the unmoved route. Phase 5's explicit revert-and-reproduce (independently reproduced above with a matching failure signature) is the real RED for this test and genuinely closes the gap.

### Issues Found
**CRITICAL**: None.
**WARNING**: None.
**SUGGESTION**:
1. market-nav.spec.ts:92 (old thesis footer text absence check) does not explicitly check /dashboard/inicio. Immaterial today since that string was never part of Inicio's content, but adding Inicio would make the universal-coverage spec intent explicit.
2. No test asserts theta/gap are absent from ThesisScores's rendered output. Point 2 has no spec delta and was correctly scoped as a GREEN-only mechanical edit, but a negative assertion would guard against silent reintroduction.

### Verdict
PASS
All 26 in-scope tasks verified complete via direct source inspection (not apply-progress.md's claims); tsc/vitest/playwright independently re-run clean (0/224/48 failures); Phase-5 regression-proof independently reproduced with a matching failure signature; both documented deviations reasoned through and found sound; live openspec/specs/ untouched, correctly deferred to archive. No CRITICAL or WARNING findings, unconditional PASS eligible for archive.
