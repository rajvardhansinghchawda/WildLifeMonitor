# Phase 3 — Vegetation vertical slice

Paste the block below into a coding agent as its task. The agent should also read, at the repo root (`D:\firebox\CodeNiti`): `systemdesign.md`, `backendhandoverfile.md`, `spec.md`, `skill.md`, `rules.md` — these are the authoritative contracts; this file only points to the relevant sections.

Depends on: Phase 2 merged (job lifecycle, leases, artifact key scheme all working).
Blocks: Phase 4 onward.

```text
Task ID: P3-VEGETATION-SLICE
Objective: Replace the orchestration-only fixture with a real, scientifically defensible vegetation-change method, running (for now) against a labeled synthetic data provider that mimics real provider output shape — plus artifact publication and event extraction. This proves the full AOI→job→layer→artifact→event chain for one real analysis method.

Read first (in full): systemdesign.md ("Vegetation-change method" section, "Layer states"), backendhandoverfile.md ("Provider interface", "Layer-result contract"), spec.md ("Change-event contract", "Metric semantics" table), skill.md ("Remote-sensing fundamentals", "Coordinate and geometry rules"), rules.md ("Scientific integrity" section in full).
Depends on: Phase 2 merged (job lifecycle, leases, artifact key scheme all working).

Deliverables:
1. `app/providers/base.py`: the ChangeProvider Protocol exactly as specified in backendhandoverfile.md:
   class ChangeProvider(Protocol):
       async def check_capability(self, request: AnalysisRequest) -> CapabilityResult: ...
       async def analyze(self, context: AnalysisContext) -> LayerResult: ...
   Define AnalysisRequest, AnalysisContext, CapabilityResult, and LayerResult as typed dataclasses/Pydantic models. LayerResult must contain: status + optional classified error, metrics with explicit units, quality (including valid coverage), artifact references (not embedded large payloads), events or an event-extraction artifact, provenance and source attribution, warnings, and method_version — per backendhandoverfile.md's "Layer-result contract".
2. `app/providers/fixture_vegetation_provider.py`: implements the Protocol, returns deterministic synthetic per-pixel arrays/composites shaped like what a real Sentinel-2 NDVI provider would return (so downstream code never needs to change when swapped for real GEE). Its provenance/attribution fields must say "synthetic fixture — not real observations" explicitly.
3. `app/analysis/vegetation.py`: a pure domain module (no HTTP, no provider-specific imports beyond the typed contracts) implementing systemdesign.md's documented steps in order:
   - select approved inputs → mask clouds/shadows/invalid/inappropriate observations → compute per-observation NDVI with safe zero-denominator handling → build comparable temporal composites → align both periods to the same analysis grid → compute comparison-minus-baseline NDVI restricted to pixels valid in both periods → apply a versioned change threshold → filter undersized connected components → emit event geometries.
   Record: mean_ndvi_change, vegetation_loss_area_ha (from area passing the configured candidate rule, not raw NDVI delta), valid_pixel_fraction. A decrease in mean NDVI must never be labeled "percentage vegetation loss" anywhere (rules.md) — keep those two concepts in clearly separate fields.
4. Artifact publication (`app/services/artifact_service.py`): writes the change raster (COG) and a manifest (provenance, checksums, method_version, source dataset ids/bands even if synthetic) to object storage under `{analysis_id}/{attempt_id}/...` keys. Artifact references are only written to the durable AnalysisLayer/Artifact rows AFTER the object is confirmed written and checksummed (systemdesign.md: "Publish metadata only after artifact validation").
5. Event extraction (`app/services/event_extraction_service.py`): connected components → ChangeEvent rows matching spec.md's change-event contract exactly: geometry, analysis_id, change_type ("vegetationlosscandidate"), affected_area_ha, mean_ndvi_change, valid_pixel_fraction, quality_label, source_confidence (null unless applicable), priority_score (null — priority scoring is Phase 5), priority_method_version (null for now), status="pendingfieldverification", method_version ("vegetation-v1" or similar), record_version=1. Worker retries must not create duplicate published events for the same attempt (use attempt-scoped idempotent writes, e.g. a unique constraint on (analysis_id, method_version, a stable per-component key)).
6. Endpoints:
   - GET /api/v1/analyses/{id}/results — result manifest per spec.md's required fields (identity, input snapshot, layers with status/metrics/quality/artifact refs, provenance, warnings, attribution, event counts + navigation URL). A partial analysis returns available results with status "partial".
   - GET /api/v1/analyses/{id}/events — paginated (default page size 50, max 100 per spec.md's limits table).
   - GET /api/v1/events/{id} — full event detail.

Constraints:
- Computed area (affected_area_ha) must come from the analysis output/grid, never a manually entered estimate (spec.md).
- Distinguish native source resolution from analysis-grid resolution wherever resolution is recorded (rules.md).
- Context-layer or optional-source failures must not invalidate an otherwise-usable vegetation output — but this phase only has one layer, so this rule mainly constrains the LayerResult contract's shape for Phase 4.
- No route may directly construct the vegetation expression — all of it lives in app/analysis/vegetation.py, invoked by the worker/service layer.

Acceptance criteria:
- Submitting a real (small, well-formed) AOI through the full pipeline from Phase 2 produces: a ready vegetation AnalysisLayer, a published artifact with checksum, at least one ChangeEvent (or zero events with a clear "no detected change in valid observations" outcome for a flat/no-change fixture scenario), and a result manifest whose reported metrics match what's in the published artifact (spec.md acceptance criterion: "Map overlays and reported metrics originate from the same analysis artifacts").
- Running the same AOI/period/config twice does not duplicate events (idempotent event publication).
- The manifest and event fields use exactly the field names/units from spec.md's metric semantics table.

Required tests: NDVI zero-denominator handling, valid-pixel-fraction computation, threshold-boundary behavior, connected-component filtering (undersized components dropped), duplicate-run idempotency (no duplicate events), artifact-checksum validation failure path (corrupted write → layer failed, not silently published), result-manifest field-completeness test against spec.md's required-fields list.

Expected handover: explicit statement that vegetation-v1 currently runs against the fixture provider only, the exact synthetic dataset/scenario used for the reproducibility test, and a named follow-up task ("swap in gee_vegetation_provider.py behind the same Protocol once Phase 0's verification record shows Result: working") — do not claim real-data validation occurred.
```

Previous: [Phase 2 — Asynchronous execution core](phase-2-async-execution-core.md)
Next: [Phase 4 — Additional change layers](phase-4-additional-layers.md)
