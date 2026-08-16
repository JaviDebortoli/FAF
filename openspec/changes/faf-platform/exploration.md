## Exploration: Implementación del Marco Argumentativo Financiero (FAF) — plataforma completa

### Current State

Repo is greenfield: only `docs/PRD.md`, `docs/papers/*.pdf`, `README.md`. No code, no package.json, no `.codegraph/` (confirmed — nothing to index). Read in full: PRD.md, `Financial_Argumentation_Framework.pdf` (15 pp, the user's own FAF paper) and the first ~19 pages of `Budán et al. 2017 LAF` (IJAR) paper covering AIF, the abstract Algebra of Argumentation Labels (6-tuple ⟨A,≤,⊙,⊕,⊖,⊤,⊥⟩), the LAF 5-tuple ⟨L,R,K,A,F⟩, argumentation graphs (I/RA/CA-nodes), and the general labeling procedure (system of equations, solved via Algorithm 1/2, worst-case O(m×t), needed because the *general* LAF graph can contain arbitrary conflict cycles including "blocking cycles").

Key formal facts confirmed from the FAF paper that matter for scoping:
- 4 layers, each stream-in/stream-out, no accumulated static state by design ("ninguna capa opera sobre datos estáticos acumulados").
- L1: RDF `faf:PriceEvent` (OHLCV) / `faf:IndicatorValue` under a minimal `faf:` ontology.
- L2: RSP-QL, `REGISTER STREAM ... FROM NAMED WINDOW ... [RANGE ω STEP β]`, fixed window configs per indicator (RSI 14/1, MACD 26/1, SMA 50/1, Bollinger 20/1, all step=1 candle). Confidence γ per indicator has closed-form normalization formulas (Cuadro 2); risk ρ = min(σ_ω/σ_ref, 1), σ_ref=0.02.
- L3: exactly 8 evidence predicates (R1–R8) supporting exactly 2 competing global theses (bullish μ+/bearish μ−). Rule labels are fixed λ(Ri)=⟨1,0⟩, making ⊗ transparent (argument label = evidence label). ⊕ is a plain arithmetic mean (paper explicitly flags this as *not* regime-weighted — future work). ⊖ is the bounded difference `⟨max(0,γ+−γ−), max(0,ρ+−ρ−)⟩`.
- L4: σ(μ)=0.5γ+0.5(1−ρ), θ=0.67 (grounded in Lento & Gradojevic supermajority literature), δ=0.20 (flagged in the paper itself as an uncalibrated initial design choice, "validación empírica ... trabajo futuro").
- The paper's own "Trabajo Futuro" section already names three unresolved gaps: adaptive window size ω, regime-weighted ⊕, and empirical validation on real market data — i.e. the author's own paper treats FAF's current form as a deliberately simplified instantiation, not a finished product.

Structural relationship FAF↔LAF (important for the "academic rigor" question below): FAF's L3 argumentation graph is topologically the *simplest* case in the Budán et al. taxonomy of conflict cycles (their Fig. 5(a) — two arguments supporting contradictory conclusions with no blocking/chained dependency). FAF therefore does not need the general system-of-equations solver (Algorithm 1, O(m×t) over arbitrary cycles); it computes ⊗→⊕→⊖ directly per window because the graph shape (8 leaves → 2 RA groups → 1 CA conflict) is fixed and acyclic beyond that single conflict pair. This is a legitimate, intentional restriction (the FAF paper is explicit that L3 "extends" LAF for a specific domain), but it means a native TS reimplementation has two possible fidelity targets: (a) implement only the closed-form FAF-specific computation (fixed shape, no general graph/solver), or (b) implement a general LAF label-algebra engine (arbitrary graph, cycle-aware system-of-equations solver per Def. 8/Algorithm 1-2) and instantiate FAF's R1-R8 as one configuration of it. This tension recurs in gap 7 (TDD) and should be flagged explicitly to the user in sdd-propose.

PRD (`docs/PRD.md`) is a compact business/requirements sketch, not an architecture spec: it fixes the layer names, the label algebra formulas (consistent with the paper), the stack list (Next.js backend / Angular frontend / n8n / GitHub+Vercel), and R1-R8 rules, but leaves the 7 gaps below fully open.

### Affected Areas
- `docs/PRD.md` — source of the stack/requirements constraints being investigated; will need a resolution note per gap in the eventual proposal/design.
- `docs/papers/Financial_Argumentation_Framework.pdf` — canonical formal spec for L1-L4; any implementation choice must stay traceable to its formulas (Cuadro 1, 2, 3, eq. 1-12).
- `docs/papers/An approach to characterize graded entailment...pdf` — canonical general LAF formalism that L3 "extends"; relevant for deciding fidelity level of the TS engine (gap discussion below and in Recommendation).
- No code exists yet — first `sdd-propose`/`sdd-design` will define the actual affected paths (backend package structure, RSP engine module, LAF engine module, ingestion pipeline, frontend app(s)).

### Approaches (per open gap)

#### 1. RSP-QL stream engine in TypeScript/Node
Current state: no mature RSP-QL engine exists for Node/TS (C-SPARQL/EP-SPARQL/RSP4J are JVM-only per the paper's own §3.3 comparison). PRD is silent on engine choice.

| Approach | Pros | Cons | Effort |
|---|---|---|---|
| A. Custom sliding-window engine on N3.js/rdf-ext (RDF/JS stack), implementing only the fixed window shapes FAF actually needs (RANGE/STEP per Cuadro 1) | Stays faithful to RDF representation end-to-end (L1→L2 boundary is real RDF); reuses a mature, spec-compliant RDF/JS toolchain (N3.js) instead of inventing a parser; scoped to exactly what FAF needs, so effort is bounded | Not a general RSP-QL implementation — no SPARQL-over-window query language, just hand-written window logic per indicator; less reusable if scope grows beyond 4 indicators | Medium |
| B. Minimal RSP-QL-subset interpreter (parse the `REGISTER STREAM...WINDOW...RANGE/STEP` subset from the paper's examples, execute against an RDF store via Comunica/N3.js as the SPARQL engine per window snapshot) | Closest fidelity to the paper's formalism (literal RSP-QL syntax executable); demonstrates the academic claim precisely; reusable if new indicators/queries are added later | Building even a query-language subset parser+windower is real interpreter work; risk of scope creep into "build an RSP-QL engine" as its own research project | High |
| C. Non-RDF streaming layer (plain TS event/array-based sliding windows over typed OHLCV objects, e.g. RxJS or a hand-rolled ring buffer) computing indicators directly; keep RDF only at L1 ingestion (rest) and L3/output (interchange) boundaries, not as the internal L2 computation substrate | Fastest to build and test (pure functions over arrays — ideal for strict TDD); no RDF/SPARQL runtime overhead in the hot path; still "RDF at rest" satisfies interoperability claim | Diverges from the paper's claim that L2 executes RSP-QL over an RDF stream — the internal computation is no longer literally SPARQL; needs an explicit justification note in the design doc for academic defensibility | Low |

Open product/academic question for sdd-propose: how much fidelity to the *specific* RSP-QL query language (vs. its semantics: windowing over a semantically-tagged stream) does the thesis defense require? This is the single highest-leverage decision in the whole exploration — it gates effort for gap 1 and materially affects gap 4 and gap 7 test strategy.

#### 2. Market data source
Current state: PRD never names a source; only says OHLCV + indicators arrive via RDF webhooks.

| Approach | Pros | Cons | Effort |
|---|---|---|---|
| A. Free-tier REST equity APIs (Alpha Vantage: 5 calls/min, delayed; Twelve Data: 800 calls/day, 4h delay; Finnhub: 60 calls/min, ~20min delay real-time-ish) | Matches the AAPL example used throughout the FAF paper directly (no domain shift); free tier is enough for a thesis demo; several providers to fall back on | Free tiers are rate-limited and delayed, which conflicts somewhat with "tiempo real" framing and n8n's 1-5 min schedule (need to confirm the tier's call budget covers polling frequency × number of assets); some require an API key/signup friction | Low |
| B. Public crypto REST APIs (e.g. Binance public market-data endpoints) — no key required, generous/no practical rate limit for OHLCV/klines, true near-real-time granularity | Removes the "is this really real-time" tension entirely; zero signup friction; ideal for demoing streaming/windowing behavior faithfully | Domain shift away from the paper's equity example (AAPL); would need to re-validate that R1-R8/indicator semantics still read naturally for crypto (they do technically, RSI/MACD/SMA/Bollinger are asset-agnostic, but the thesis narrative changes) | Low |
| C. Static/replayed historical dataset (CSV/Parquet of OHLCV, replayed through n8n on a timer to simulate a live stream) | Fully reproducible for academic evaluation/backtesting the paper's own "trabajo futuro" ask (empirical validation); no external dependency/rate-limit risk during defense | Loses the "live system" demo value; blurs the "stream reasoning over real streams" positioning the paper is built around | Low |

Product question for sdd-propose: is the deliverable framed as a live demo (favors B, maybe A) or as a reproducible academic evaluation (favors C, possibly alongside A/B for the live-demo layer)? Budget/hosting constraints (Vercel free tier, n8n hosting) also matter here and only the user can set them.

#### 3. n8n's exact role
Current state: PRD says "n8n con Schedule Trigger cada 1-5 minutos" and "Capa 1: orquestación... enviarán periódicamente mediante webhooks en formato RDF," which conflates *scheduling* with *RDF transformation* without saying which component performs the RDF-ification.

| Approach | Pros | Cons | Effort |
|---|---|---|---|
| A. n8n does both: fetch OHLCV from the market API AND build the RDF triples (via Function/Code nodes or a Set+HTTP Request node chain), then POSTs a webhook of RDF (Turtle/JSON-LD) to the Next.js ingestion endpoint | Keeps Next.js backend "dumb" (pure ingestion sink); all data-shape logic centralized in one visual pipeline, easy to demo/change without redeploying code | RDF construction logic living in n8n Code nodes is harder to unit-test (no first-class TS test harness inside n8n); couples the academic-formalism-critical RDF modeling step to a low-code tool, which sits awkwardly with "strict TDD" for L1 | Low-Medium |
| B. n8n is a pure scheduler/trigger + raw HTTP fetch; a Next.js API route receives the raw OHLCV payload and performs RDF-ification (L1) in TypeScript | RDF modeling (the part directly traceable to the paper's ontology/§3.2) lives in testable, versioned TS code — natural fit for strict TDD; n8n's role shrinks to "cron + fetch + forward," which is its sweet spot | Slightly more backend surface area (an ingestion endpoint plus its RDF-mapping logic) to build before anything else works; n8n becomes a thin trigger, which raises the question of whether n8n is worth including at all vs. a plain cron/serverless function | Low |
| C. Drop n8n from the MVP entirely; use a Vercel Cron Job / Next.js scheduled function calling the market API directly and RDF-ifying in the same TS codebase | Removes an entire infra dependency (n8n hosting/maintenance) and a moving part with no automated tests; simplest to reason about and to keep in strict TDD | Deviates from the PRD's explicit "Automatización: n8n" requirement — needs explicit user sign-off since it's a stack change, not just an implementation detail | Low |

Recommendation direction: B keeps the academically load-bearing RDF-modeling code testable while still honoring the PRD's n8n requirement; C is the pragmatic alternative if the user is open to renegotiating that PRD line. This is exactly the kind of stack question only the user can resolve in sdd-propose.

#### 4. Argumentative graph persistence (Layer 3)
Current state: PRD is silent. The FAF paper is explicit that the *architecture* has no accumulated static state ("ninguna capa opera sobre datos estáticos acumulados... la latencia total del sistema es función de la frecuencia de las ventanas deslizantes y no del volumen histórico de datos") — evidence validity is bounded by window lifetime (β cadence, ω range), and stale evidence retracts automatically. This is a strong non-monotonic/streaming semantics constraint, not just an implementation footnote.

| Approach | Pros | Cons | Effort |
|---|---|---|---|
| A. Pure in-process memory (graph rebuilt/updated every ingestion cycle, held in a JS Map/object keyed by asset+predicate, TTL'd by window validity) | Maximally faithful to the paper's "no accumulated static state" claim; simplest to reason about non-monotonicity (expiry = delete); trivially fast | No durability across server restarts/deploys (Vercel serverless functions are stateless between invocations — this is actually a *hard blocker*, not just a design preference, if deployed as serverless functions rather than a long-lived process) | Low (but see risk) |
| B. Externalized state store with TTL semantics (Redis/Upstash with per-key expiry matching window β·ω, or a KV store) holding the current graph snapshot; recomputed on each cycle but persisted between invocations | Solves the Vercel-serverless statelessness problem directly; TTL-based expiry maps naturally onto "vigencia acotada"; still doesn't accumulate history (state is always "current snapshot," not an append-only log) | Adds an infra dependency + cost; introduces a subtle correctness question (need to make sure TTL bookkeeping exactly mirrors the paper's window semantics, or the "faithful to the formalism" claim weakens) | Medium |
| C. Full history persisted (RDF triple store or relational DB logging every evidence/argument/decision state over time) | Enables replay, audit trail, and the empirical-validation future-work item the paper itself calls out; useful for a thesis defense ("here's the full trace") | Directly contradicts the "no accumulated static state" philosophy as an architectural default — would need to be explicitly framed as an *observability/audit* concern layered on top of (not replacing) the stateless reasoning core, or it undermines the paper's core claim | Medium-High |

Key tension to flag for academic rigor: this is the gap where "pragmatic shortcut" (durable DB state) can most directly contradict the paper's formal claims if not designed carefully. The likely correct framing (to validate in sdd-propose) is A/B for the *live reasoning core* plus an optional append-only *log* (C-lite) purely for traceability/demo/thesis-evidence purposes, explicitly labeled as observability rather than part of the reasoning state.

#### 5. MVP scope
Current state: PRD describes the full end-to-end system (n8n + RSP + LAF + LLM narrative + Angular dashboard with graph visualization) with no stated v1 cut line, no named pilot asset(s), and R1-R8/4 indicators as if all must ship together.

| Approach | Pros | Cons | Effort |
|---|---|---|---|
| A. Single asset (AAPL, matching the paper's worked example), all 4 indicators/8 rules, LAF engine + score/threshold decision, minimal UI (no graph viz, just JSON/table output) — cut n8n and LLM narrative from v1 | Directly reproduces the paper's own end-to-end worked example, which is strong thesis-defense value ("here is the system producing exactly Section 3's numbers"); smallest possible vertical slice through all 4 conceptual layers | "MVP" still touches L1-L4, so it's not actually small in layer count, just narrow in breadth (1 asset, no LLM, no fancy UI) | Medium |
| B. Multiple assets, subset of indicators (e.g. RSI + SMA only, 4 of 8 rules), skip Bollinger/MACD for v1 | Reduces L2 implementation surface (fewer window configs/formulas to build+test first); still demonstrates conflict resolution (⊕/⊖) since 2 indicators is already enough for bullish vs bearish tension | Loses fidelity to the paper's specific worked numeric example (which uses RSI+MACD+SMA together); may need to re-derive/re-validate a smaller example for docs | Low-Medium |
| C. Vertical-slice-per-layer sequencing (ship L1+L2 alone first — RDF ingestion + evidence stream, testable/verifiable independently — then layer in L3, then L4, then UI/LLM last) | Matches strict-TDD-friendly incremental delivery and the 400/800-line PR review budget in the SDD workflow; each slice independently verifiable | Doesn't answer "which asset/indicators" — orthogonal to A/B, would be combined with one of them | N/A (sequencing strategy, not scope choice) |

Product questions only the user can answer: which asset/asset class (ties to gap 2 choice), whether the LLM narrative and Angular graph-viz dashboard are true v1 requirements or v2, and whether thesis timeline favors "reproduce the paper's exact example" (A) over breadth.

#### 6. Frontend inconsistency (Next.js backend vs. Angular frontend)
Current state: PRD literally says "Backend: Next.js" and "Frontend: Angular," which is unusual since Next.js is normally a full-stack framework that serves its own React frontend. No mention of API contract, CORS, or deployment topology for two separate apps.

| Approach | Pros | Cons | Effort |
|---|---|---|---|
| A. Two separate apps as PRD literally states: Next.js as an API-only backend (App Router route handlers, no frontend pages) + a separate Angular SPA consuming it over REST/JSON, deployed as two Vercel projects (or Angular elsewhere, e.g. static hosting) | Honors the PRD literally without requiring user sign-off to change it; clean separation of concerns; Angular's dependency-injection/RxJS model is arguably a good fit for reactive dashboard state driven by a polling/streaming backend | Two deploy pipelines, two repos or a monorepo with two toolchains, CORS/auth surface to manage; graph-visualization libraries (mentioned in PRD) exist in both ecosystems so this isn't a blocker either way; more moving parts for a solo thesis project | Medium |
| B. Collapse to single-framework: Next.js serves both API routes and its own React (or Next-native) frontend, dropping Angular | Simplest deploy topology (one Vercel project); smallest surface area for a solo-author thesis timeline; React graph-viz libraries (react-flow, visx, d3-based) are equally capable for argumentation-graph trace visualization | Directly changes a PRD line — needs explicit user sign-off since Angular may be an intentional choice (e.g. user's own skill/expertise) | Low |
| C. Collapse to single-framework the other way: Angular full app + a lightweight Node/Express (or NestJS) API instead of Next.js, or Angular Universal for SSR if needed | Consistent single framework if Angular is the user's genuinely preferred/expert stack; avoids running two different frontend paradigms | Also changes a PRD line (drops Next.js) — same sign-off requirement as B, and loses Next.js's convenient Vercel-native deploy story the PRD explicitly names | Low-Medium |

This is a genuine PRD internal inconsistency, not just an ambiguity — it should be presented to the user as an explicit question in sdd-propose (keep as 2 apps / collapse to Next.js+React / collapse to Angular+other-backend).

#### 7. Testing/TDD implications (strict TDD is globally active)
Current state: no test tooling exists yet (greenfield). Strict TDD Mode is a fixed global constraint, not optional.

| Layer/concern | TDD realism | Notes |
|---|---|---|
| L3 label algebra (⊗, ⊕, ⊖, σ, θ/δ policy) | Highly realistic — pure functions over `⟨γ,ρ⟩` tuples, deterministic, directly testable against the paper's own worked numeric example (eq. 3, 7-9, 12 give exact expected outputs) | Should be first TDD target; the paper's Section 3 example (AAPL, RSI=15, hypothetical MACD/SMA evidences) is effectively a ready-made golden test fixture |
| L2 RSP-QL windowing (RANGE/STEP semantics, indicator formulas from Cuadro 1/2) | Realistic with synthetic time series — deterministic window boundaries, deterministic indicator math (RSI/MACD/SMA/Bollinger formulas are well-defined and testable against known reference values) | Needs care around "edge effect" the paper itself flags (§5, "efecto de borde") — good candidate for explicit edge-case tests |
| L1 RDF modeling (triple shape, ontology conformance) | Realistic — can assert exact triples/JSON-LD shape for given input, snapshot-style | Whichever component does RDF-ification (gap 3) should own these tests |
| L4 decision policy (σ, θ=0.67, δ=0.20 thresholds) | Realistic — pure function over two label pairs, easily table-tested across boundary values (exactly at θ, exactly at δ, etc.) | |
| LLM narrative generation | Impractical for strict unit TDD in the traditional sense — non-deterministic natural-language output | Adapt: test the *input contract* (does it receive DEFEATED/ADMISSIBLE argument trace correctly per the "delta=0.0 / delta>0.0" rule from PRD?) and use snapshot/golden-prompt tests or a mocked LLM in CI; reserve human/manual eval for actual narrative quality |
| Live market data integration (gap 2 API calls) | Impractical to TDD against the live network | Adapt: contract-test against recorded fixtures (VCR/cassette-style HTTP mocking) of each provider's real response shape |
| Real-time stream timing/scheduling behavior (n8n cadence, window step β) | Partially impractical live, but realistic if abstracted | Adapt: inject a fake/controllable clock into the windowing engine so β/ω timing logic is deterministically testable without waiting on real 1-5 min cycles |

Conclusion for gap 7: the formal/mathematical core (L2 indicator math, L3 algebra, L4 policy) is exceptionally strict-TDD-friendly. The two genuinely hard spots (LLM narrative, live data/timing) need explicit "adapted TDD" conventions (contract tests, fixtures, fake clocks) documented in sdd-design rather than being treated as TDD failures.

### Recommendation

No single approach is picked here — that decision belongs to sdd-propose. But the exploration surfaces one dominant sequencing insight: gap 1 (RSP-QL fidelity level) is the highest-leverage decision because it constrains gap 4 (does the "no accumulated state" claim hold if the windowing substrate isn't literally RDF/SPARQL-native?) and gap 7 (what exactly is under strict TDD). Recommend the user decide gap 1 first, informed by an explicit call on the underlying academic-rigor question: is the thesis claim "we built a system that executes RSP-QL semantics correctly" (favors 1B, full interpreter) or "we built a system faithful to RDF/stream-reasoning *principles*, implemented pragmatically in TS" (favors 1A/1C)? That framing choice should also resolve gap 5 (MVP scope) and gap 6 (single vs. dual framework).

### Risks
- PRD's n8n role (gap 3) and frontend split (gap 6) are actual internal inconsistencies/ambiguities in the source document — surfacing them as explicit questions in sdd-propose is necessary, not optional.
- Free-tier market data APIs (gap 2) may not sustain a genuinely "real-time" narrative at the PRD's 1-5 min cadence across multiple assets; needs a concrete provider+plan decision, or an explicit reframing to "near-real-time / polled."
- Vercel serverless statelessness is a *hard technical constraint* on gap 4 (Layer 3 persistence) — must be validated explicitly, not assumed.
- The paper itself (§5, Trabajo Futuro) already flags δ=0.20 and unweighted ⊕ as uncalibrated/simplified; empirical validation of these constants is a research task, out of scope for a code-only implementation.
- Fidelity-vs-pragmatism tension (gap 1/4/7) needs an explicit, written decision in sdd-propose or sdd-design.

### Ready for Proposal
Yes — all 7 gaps mapped with concrete approaches. The cross-cutting academic-rigor tension (fidelity to RSP-QL/LAF formalism vs. pragmatic TS shortcuts) is the one decision that should be made first, since it constrains several of the others.

Open decisions for sdd-propose, in recommended order:
1. RSP-QL fidelity level (constrains 4 and 7)
2. Market data source/asset class
3. n8n's exact responsibility
4. L3 persistence strategy
5. MVP cut line
6. Frontend topology (resolve the Next.js/Angular inconsistency)
