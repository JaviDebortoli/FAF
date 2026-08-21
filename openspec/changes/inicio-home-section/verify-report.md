```yaml
schema: gentle-ai.verify-result/v1
evidence_revision: sha256:6261cda0919e8e18aa4b8fd36913966858969cce85bafba78001cca8fdb996df
verdict: pass
blockers: 0
critical_findings: 0
requirements: 4/4
scenarios: 15/15
test_command: npx vitest run && npx playwright test
test_exit_code: 0
test_output_hash: sha256:9067215a01061b62fdb4eb2607715d364b6aae8c994ca319e4dd35b841198a32
build_command: npx tsc --noEmit
build_exit_code: 0
build_output_hash: sha256:d19b7590b5971f5ca63f3c361b087093373d1322c1a6aa8354fa63463d57b553
```

## Verification Report

**Change**: inicio-home-section
**Version**: N/A
**Mode**: Strict TDD, full artifact set. Independently re-verified; apply-progress.md claims not trusted.

### Completeness
| Metric | Value |
|--------|-------|
| Tasks total | 15 |
| Tasks complete | 14 |
| Tasks incomplete | 1 (4.1, deferred to sdd-archive per convention) |

### Build and Tests

Build: PASS - npx tsc --noEmit, exit 0, zero output.

Tests: PASS
npx vitest run: 37 files / 224 tests passed.
npx playwright test: 44 passed.

### Spec Compliance Matrix

market-navigation - Sidebar navigation shell (MODIFIED)
| Scenario | Test | Result |
|---|---|---|
| Branding header renders above market groups, desktop and mobile | market-nav.spec.ts "Sidebar branding" (desktop) + "drawer also shows the branding block" (mobile) | COMPLIANT |
| Inicio link renders between branding and market groups | market-nav.spec.ts "Sidebar - group order" (desktop) + mobile-drawer group-order test | COMPLIANT |
| All markets listed in the correct groups | market-nav.spec.ts "Sidebar - group order" | COMPLIANT |
| Active market visually indicated | market-nav.spec.ts "Sidebar - accessibility baseline" | COMPLIANT |

market-navigation - Shared shell footer (MODIFIED)
| Scenario | Test | Result |
|---|---|---|
| Footer renders exact copy on crypto route | market-nav.spec.ts "Shared dashboard footer" | COMPLIANT |
| Footer renders same exact copy on placeholder-market route | market-nav.spec.ts "Shared dashboard footer" (crypto vs /dashboard/acciones innerText comparison) | COMPLIANT |
| Old footer copy fully absent | market-nav.spec.ts "old crypto-only thesis footer text is gone everywhere" | COMPLIANT |
| Footer does not overlap page content | market-nav.spec.ts "footer never overlaps content" (1280px + 375px) | COMPLIANT |
| Inicio route renders no footer | market-nav.spec.ts "Inicio route - no dashboard footer" | COMPLIANT - verified the FINAL test genuinely requires response.status() less than 400 AND a visible Bienvenido heading BEFORE asserting zero dashboard-footer elements, closing the exact false-pass-against-404 gap apply-progress.md self-reported |

market-navigation - Per-market routing (MODIFIED)
| Scenario | Test | Result |
|---|---|---|
| Crypto route hosts the real dashboard | dashboard.spec.ts "Direct /dashboard/crypto visit" + "Tier 1 - card grid" | COMPLIANT |
| Non-crypto market route renders the placeholder | market-nav.spec.ts "Placeholder-market pages" | COMPLIANT |
| Bare /dashboard never 404s | dashboard.spec.ts "Bare /dashboard redirect" (asserts status less than 400 AND final URL /dashboard/inicio) | COMPLIANT |
| Root path lands on Inicio, never a 404 | dashboard.spec.ts "Root / redirect" | COMPLIANT |

decision-dashboard - Crypto dashboard route under market navigation (MODIFIED)
| Scenario | Test | Result |
|---|---|---|
| Overview mounts at the canonical crypto route | dashboard.spec.ts "Direct /dashboard/crypto visit" | COMPLIANT |
| Bare /dashboard lands on Inicio, not the overview directly | dashboard.spec.ts "Bare /dashboard redirect" (lands on Inicio, not 404) plus "Direct /dashboard/crypto visit" and sidebar Link-click navigation tests (Placeholder-market pages, accessibility baseline) jointly proving the crypto-route half, plus source-verified static CTA href in inicio/page.tsx | COMPLIANT (aggregate evidence across multiple passing tests, not one single connected test - see SUGGESTION below) |

Compliance summary: 15/15 scenarios COMPLIANT.

### Correctness (Static Evidence - full file reads, not diffs)
| Requirement | Status | Notes |
|------------|--------|-------|
| app/dashboard/inicio/page.tsx | Implemented | Server Component (no use client), page-local heading (not DashboardHeader), sigma/gamma/rho/theta=0.67 deterministic framing present verbatim, CTA Link href=/dashboard/crypto present - matches design.md byte-for-byte |
| app/dashboard/page.tsx, app/(dashboard)/page.tsx | Implemented | Both redirect('/dashboard/inicio'), confirmed by direct read |
| Sidebar.tsx InicioLink | Implemented | Reuses MarketLinkGroups exact className string (character-for-character compared), rendered in both desktop nav and mobile drawer between branding and MarketLinkGroups, data-testid=sidebar-link-inicio, href=/dashboard/inicio; activeSlug fallback is now ?? 'inicio' |
| icons.tsx Home | Implemented | Same DEFAULTS-spread SVG style as every other icon, exported via Icons.Home |
| app/dashboard/(with-footer)/layout.tsx | Implemented | Footer copy/className/data-testid=dashboard-footer byte-identical to the original, plus pb-48 |
| app/dashboard/layout.tsx | Implemented | Footer and pb-48 genuinely removed; now only Sidebar + flex-1 md:pl-64 wrapper |
| crypto/page.tsx, [market]/page.tsx moves | Implemented | git status confirms both as R (rename-detected, zero content diff); old paths confirmed GONE on disk, new (with-footer)/ paths confirmed EXISTS |
| tests/dashboard/crypto/page.test.ts | Implemented | Import updated to @/app/dashboard/(with-footer)/crypto/page; re-run independently, 1/1 passed |
| Live specs untouched | Correct | git status shows zero modification to openspec/specs/market-navigation/spec.md or openspec/specs/decision-dashboard/spec.md - matches this repo's convention that MODIFIED-requirement merges happen at sdd-archive, not sdd-apply |

### Coherence (Design)
| Decision | Followed? | Notes |
|----------|-----------|-------|
| Route placement - static sibling of crypto/, not routed through [market] | Yes | inicio/page.tsx is a standalone directory, not a dynamic-segment match |
| Footer exclusion via route-group split | Yes | (with-footer)/layout.tsx created exactly as specified, inicio/ correctly lives outside it |
| Inicio heading treatment - page-local, not DashboardHeader | Yes | Confirmed by source read - no DashboardHeader import in inicio/page.tsx |
| InicioLink extraction mirroring MarketLinkGroups | Yes | Same active-state class logic, separate function per design.md's stated rationale |

### Issues Found

CRITICAL: None.

WARNING: None.

SUGGESTION:
1. decision-dashboard spec scenario "Bare /dashboard lands on Inicio, not the overview directly" - the second AND-clause (CTA/sidebar-link navigation from Inicio still shows the unchanged Tier 1 overview) is proven by aggregate evidence across multiple passing tests rather than one single connected Playwright test that clicks the Inicio CTA specifically. Recommend adding one chained e2e test (goto /dashboard, click CTA, assert crypto card content) for tighter literal scenario coverage. Non-blocking: functionally low-risk, this is a test-shape improvement, not a compliance gap.
2. Two pre-existing doc comments became stale as a side effect of this change's file moves: app/(dashboard)/layout.tsx (line 5) and app/dashboard/(with-footer)/[market]/page.tsx (line 10) both still reference app/dashboard/crypto/page.tsx as a path pointer; the file now physically lives at app/dashboard/(with-footer)/crypto/page.tsx. Purely cosmetic (comment-only, no functional impact), but worth a follow-up touch-up for accuracy.

### Manual Smoke-Check Judgment

Considered but judged unnecessary before archive: this change's own Playwright suite already boots a real Next.js dev server (webServer in playwright.config.ts) and independently re-ran green in this phase (44/44), directly exercising the full Inicio to sidebar to crypto to footer-absence flow via real browser navigation, real DOM assertions, and real route resolution - not mocked routing. This is materially equivalent to a manual click-through (arguably stronger, since it also covers keyboard focus, aria-current, and cross-viewport behavior a manual pass would likely skip). Unlike graph-scrollbar-theming (genuine cross-browser CSS risk with no automated coverage) or gauge-arc-contrast (a visual-only contrast fix with zero test coverage by design), this change's every scenario has direct automated E2E coverage against a live-rendered page. No MANUAL-VERIFICATION-ONLY gate applies (no live-production/external-API dependency). A manual smoke-check was not additionally performed and is not judged necessary.

### Verdict
PASS
Zero CRITICAL findings, zero WARNING findings; two cosmetic/non-blocking SUGGESTIONs (a test-shape improvement opportunity and stale doc comments in unrelated pre-existing files). All 224 vitest + 44 Playwright tests and tsc --noEmit independently re-confirmed green, including tests/dashboard/crypto/page.test.ts's post-move import path. Safe to proceed to sdd-archive.
