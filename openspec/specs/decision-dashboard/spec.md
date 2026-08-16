# Delta for decision-dashboard

## ADDED Requirements

### Requirement: Tabular decision view
The system MUST render a table of emitted decisions (asset, timestamp, decision: BUY/SELL/NO-RECOMMENDATION, σ(μ⁺), σ(μ⁻), gap) in a single React UI within the same Next.js app, per proposal Scope ("Minimal React UI") and PRD D1/D3.

#### Scenario: Decisions listed
- GIVEN one or more decision cycles have completed
- WHEN the dashboard loads
- THEN it MUST display each decision's asset, timestamp, decision label, both thesis scores, and the score gap

### Requirement: Argument trace detail view
For a selected decision, the system MUST render its full argument trace as structured tabular data: active evidence predicates with γ/ρ, the rule(s) each triggered (R1-R8), the resulting argument labels, aggregated λ(μ⁺)/λ(μ⁻), and net λ*(μ⁺)/λ*(μ⁻), per proposal Scope and decision-policy's trace payload requirement.

#### Scenario: Trace inspection
- GIVEN a user selects a listed decision
- WHEN the detail view opens
- THEN it MUST show the complete chain from active predicates through net thesis labels as tabular data, not free narrative text

### Requirement: No LLM narrative or graph visualization in v1
The dashboard MUST NOT include an LLM-generated explanatory narrative or an interactive argumentation-graph visualization in v1, per PRD deviation D3 (both deferred to v2).

#### Scenario: Deferred features absent
- GIVEN the v1 dashboard is rendered
- WHEN a user inspects any decision
- THEN no LLM-authored text and no graph/node-edge visualization component MUST be present

### Requirement: Multi-asset display
The dashboard MUST display decisions for all configured crypto assets from a single view, per proposal Scope ("multiple crypto assets").

#### Scenario: Multiple assets shown
- GIVEN cycles have run for 2+ configured assets
- WHEN the dashboard loads
- THEN decisions for every configured asset MUST be visible or filterable within the same table
