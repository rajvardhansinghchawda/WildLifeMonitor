# Phase 4 — Additional change layers

Paste the block below into a coding agent as its task. The agent should also read, at the repo root (`D:\firebox\CodeNiti`): `systemdesign.md`, `rules.md`, `dsabackendoptimisation.md`, `tasks.md` — these are the authoritative contracts; this file only points to the relevant sections.

Depends on: Phase 3 merged (Protocol, artifact service, event extraction service, result-manifest shape all reusable).
Blocks: Phase 5 onward.

```text
Task ID: P4-ADDITIONAL-LAYERS
Objective: Add water-change and built-up-change methods as independent layers using the same Protocol/fixture pattern from Phase 3, plus context enrichment, without letting any one layer's failure affect another's.

Read first (in full): systemdesign.md ("Water-change method", "Built-up-change method", "Forest-alert method", "Context enrichment", "Layer states" — read again carefully), rules.md ("Scientific integrity"), dsabackendoptimisation.md ("Algorithm choices" table, especially spatial-tree nearest-feature search and batching), tasks.md (T16–T19 rows).
Depends on: Phase 3 merged (Protocol, artifact service, event extraction service, result-manifest shape all reusable).

Deliverables:
1. `app/providers/fixture_water_provider.py` + `app/analysis/water.py`: matched-period water-probability composites (fixture-provided) with configured classification and ambiguity thresholds. Compute separate gain and loss masks; ambiguous pixels stay unclassified (not silently assigned to either). Report: baseline classified water area, comparison classified water area, gross gain, gross loss, net change, valid comparison area. If baseline water area is zero, relative percentage change must be null (not divide-by-zero, not zero-as-default).
2. `app/providers/fixture_builtup_provider.py` + `app/analysis/builtup.py`: aggregate built-class probabilities over comparable windows; require configured baseline/comparison class conditions to produce a built-up-change candidate; retain ambiguous pixels separately. Any probability-difference raster surfaced must be labeled "probability change," never "construction area."
3. `app/providers/gfw_provider.py`: implement against the Protocol but gate it entirely behind `GFW_ENABLED` (default false). If disabled, check_capability must return an explicit "unsupported/disabled" capability result rather than silently omitting the layer with no explanation. Preserve GFW's own source confidence categories verbatim — never translate them into invented percentages (systemdesign.md: "Do not translate them into arbitrary percentages").
4. `app/services/context_enrichment_service.py`: cached Overpass-derived road/settlement features; compute nearest-feature distance per event using a spatial-tree structure (dsabackendoptimisation.md), batched across all of an analysis's events (not one query per event). Field naming/response must clearly distinguish "nearest known feature in our cached source" from any implication that no closer real-world feature exists — an empty source response is not proof of absence (systemdesign.md). Do not claim "new road" from this data; that requires a historical-change method this project doesn't implement in V1.
5. Update AnalysisLayer handling so each requested layer (vegetation, water, builtup, plus optional forestalerts) resolves its own state (pending/running/ready/insufficientdata/unsupported/failed/cancelled) independently, and the parent Analysis job state follows systemdesign.md's resolution rule (succeeded/partial/failed/cancelled) based on the combination of requested-layer outcomes. A context-layer (roads/settlements, forest alerts if used contextually) failure must produce a warning, never invalidate an otherwise-ready change layer.

Constraints:
- Do not implement two equivalent vegetation pipelines (architecture.md) — this phase must not duplicate Phase 3's vegetation logic.
- Every reported metric must state its denominator/definition inline in code comments or docstrings only where genuinely non-obvious — but the API response field semantics must match spec.md's metric-semantics table exactly, including for the new water/builtup fields (watergainareaha, waterlossareaha, builtupgainareaha, forestalertcount if enabled).

Acceptance criteria:
- Requesting layers=["vegetation","water","builtup"] on one analysis produces three independent AnalysisLayer outcomes; forcing one layer's fixture provider to fail (e.g. via a test-only failure injection) leaves the other two layers' results intact and the job resolves to "partial."
- Water layer correctly reports a null relative-change percentage when baseline water area is zero in the test fixture.
- Built-up layer's probability-difference output is labeled as probability change in both the manifest and any exposed field name/description.
- GFW layer, with GFW_ENABLED=false, reports an explicit "unsupported" state with a human-readable reason — not a silent omission.
- Context enrichment adds distances to events using one batched query per analysis, not N queries for N events (verify via a test asserting query/call count).

Required tests: water gain/loss/ambiguous classification, zero-baseline-water null-percentage case, builtup probability-vs-area labeling, per-layer independent-failure test (one layer down, others unaffected, job resolves "partial"), GFW-disabled explicit-unsupported test, context-enrichment batching test, "nearest known vs nearest real" wording/field test.

Expected handover: which layers were exercised against fixtures vs never run, confirmation GFW remains disabled pending Phase 0's real verification record, and the exact failure-injection mechanism used for the independent-failure test (so it can be reused later).
```

Previous: [Phase 3 — Vegetation vertical slice](phase-3-vegetation-slice.md)
Next: [Phase 5 — Investigation workflow](phase-5-investigation-workflow.md)
