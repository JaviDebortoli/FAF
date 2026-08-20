# Delta for decision-narrative — Narrative Model Haiku 4.5 Swap

## ADDED Requirements

### Requirement: Narrative quality manual verification (Haiku 4.5 swap)

Because the Tier 2 narrative model changed from Claude Opus 5 to Haiku 4.5
(cost-driven restatement-tier swap), this change MUST NOT be marked PASS at
archive until a human has manually confirmed the Haiku 4.5 Spanish narrative
output is acceptable relative to the prior Opus 5 baseline. Automated tests
can verify the call succeeds and forwards `text_delta` text, but cannot judge
narrative quality.

#### Scenario: [MANUAL-VERIFICATION-ONLY] Haiku 4.5 narrative quality confirmed against Opus 5 baseline

- GIVEN `src/narrative/client.ts` now calls `claude-haiku-4-5` instead of `claude-opus-5`
- WHEN a Spanish narrative is generated for a live asset decision
- THEN the user MUST manually read the generated narrative and confirm it reads acceptably compared to the prior Opus 5 baseline
- (Not automatable — no automated rubric exists in this repo to judge Spanish prose quality. If this scenario is not explicitly confirmed by the user before archive, `sdd-verify`/`sdd-archive` MUST NOT mark this change PASS, per this project's manual-verification-gate norm.)
