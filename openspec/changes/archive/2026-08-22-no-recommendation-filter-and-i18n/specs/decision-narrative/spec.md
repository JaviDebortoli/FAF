# Delta for decision-narrative

## MODIFIED Requirements

### Requirement: Spanish-language output
The generated narrative MUST be written in Spanish and MUST NOT echo the literal English recommendation tokens "BUY" or "SELL" anywhere in the generated prose, even though the JSON payload passed to the model contains those literal English tokens as data.
(Previously: required Spanish output only; did not explicitly forbid echoing the English "BUY"/"SELL" tokens present in the model's input JSON payload.)

#### Scenario: Narrative language
- GIVEN a narrative is generated for any asset's decision
- WHEN the response text is inspected
- THEN it MUST be in Spanish

#### Scenario: Narrative never echoes literal English recommendation tokens
- GIVEN the model's input JSON payload contains `"recommendation": "BUY"` or `"recommendation": "SELL"` as data
- WHEN the generated narrative text is inspected
- THEN it MUST NOT contain the literal English tokens "BUY" or "SELL"
