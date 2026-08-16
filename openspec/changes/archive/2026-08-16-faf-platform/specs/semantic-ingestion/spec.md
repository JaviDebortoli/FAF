# Delta for semantic-ingestion (Layer 1)

## ADDED Requirements

### Requirement: Market-data fetch contract
The system MUST fetch the last 50 OHLCV candles per configured asset from Binance's public klines endpoint without an API key, per proposal Scope/D4 and PRD §"Requerimientos de Implementación" (Automatización).

#### Scenario: Successful fetch
- GIVEN a configured crypto asset symbol
- WHEN a cycle fetch runs
- THEN the system MUST retrieve at least 50 candles with OHLCV fields (open, high, low, close, volume)

#### Scenario: Failed or delayed fetch
- GIVEN the Binance endpoint fails or times out
- WHEN a cycle fetch is attempted
- THEN the system MUST emit nothing for that cycle (no stale carry-forward)
- AND MUST NOT surface this as an error state (non-monotonic retraction per FAF §2.1, proposal Edge Cases)

#### Scenario: Cold start
- GIVEN fewer than 50 candles are returned
- WHEN the ingestion cycle completes
- THEN the system MUST mark the cycle as insufficient history so downstream layers emit "no evidence", not a neutral/zero label (proposal Edge Cases)

### Requirement: n8n scheduler-only role (D2)
n8n MUST act only as a Schedule Trigger (1-5 min) that performs a raw HTTP fetch and POSTs unmodified data to the ingestion route. n8n MUST NOT perform RDF-ification, per PRD deviation D2 and openspec/config.yaml `rules.proposal` (RDF modeling stays under Strict TDD in TypeScript).

#### Scenario: n8n forwards raw data
- GIVEN the Schedule Trigger fires
- WHEN n8n calls the market-data source
- THEN n8n MUST POST raw OHLCV JSON to the Next.js ingestion route
- AND MUST NOT construct any RDF triples

### Requirement: OHLCV to RDF price-event mapping
The system MUST map each candle to a `faf:PriceEvent` RDF resource carrying `faf:open`, `faf:high`, `faf:low`, `faf:close`, `faf:volume`, `faf:asset`, and `faf:timestamp`, per paper §3.2 and the `faf:` ontology example.

#### Scenario: Candle mapped to RDF
- GIVEN a fetched candle for asset X at time t
- WHEN the mapping runs
- THEN it MUST produce one `faf:PriceEvent` triple set with all five OHLCV properties, `faf:asset = X`, and `faf:timestamp = t`

### Requirement: Indicator value RDF mapping
The system MUST represent each computed indicator reading as a `faf:IndicatorValue` resource with `faf:indicator`, `faf:asset`, `faf:timestamp`, and the indicator-specific property: `faf:rsiValue` (0-100 scalar), `faf:macdHistogram`, `faf:sma20`/`faf:sma50`, or `faf:bollingerUpper`/`faf:bollingerLower`, per paper §3.2 (ontology description and worked RSI example).

#### Scenario: RSI value mapped to RDF
- GIVEN a computed RSI of 15.0 for asset X at time t
- WHEN the mapping runs
- THEN it MUST produce a `faf:IndicatorValue` with `faf:indicator faf:RSI`, `faf:rsiValue "15.0"^^xsd:decimal`, `faf:asset faf:X`, `faf:timestamp t`

#### Scenario: Type disambiguation
- GIVEN a mixed stream of price and indicator events
- WHEN a downstream consumer queries by `rdf:type`
- THEN `faf:PriceEvent` and `faf:IndicatorValue` MUST be distinguishable via `rdf:type` alone (paper §3.2)
