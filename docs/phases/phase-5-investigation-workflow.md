# Phase 5 — Investigation workflow

Paste the block below into a coding agent as its task. The agent should also read, at the repo root (`D:\firebox\CodeNiti`): `spec.md`, `superpower.md`, `systemdesign.md`, `dsabackendoptimisation.md`, `rules.md` — these are the authoritative contracts; this file only points to the relevant sections.

Depends on: Phase 4 merged (multi-layer events exist to verify/prioritize).
Blocks: Phase 6 onward.

```text
Task ID: P5-INVESTIGATION-WORKFLOW
Objective: Let an analyst investigate and record a decision on a ChangeEvent, expose the Investigation Priority score, and provide the remaining read/access endpoints (capabilities, layer access, paginated events, export) needed for a full investigation loop.

Read first (in full): spec.md ("Verification contract", API endpoint table), superpower.md ("Priority scoring", "Scoring rules"), systemdesign.md ("Security model"), dsabackendoptimisation.md ("Algorithm choices" — keyset cursor, indexed ordering), rules.md.
Depends on: Phase 4 merged (multi-layer events exist to verify/prioritize).

Deliverables:
1. `PATCH /api/v1/events/{id}/verification`: request includes the target status plus expectedrecordversion. Allowed states exactly: pendingfieldverification, investigating, verifiedchange, dismissed, inconclusive (spec.md). Require notes for dismissed and inconclusive transitions (frontend.md's stated contract — enforce it server-side too, don't rely on the client). On version mismatch, return 409 with code VERSIONCONFLICT and do not apply the update. On success, increment record_version, write a Verification row (event, actor, notes, decision) and an AuditLog row (actor, action, target, timestamp). A verified event means the reviewer confirmed the recorded change under the workflow — it must NOT be interpreted or labeled anywhere as confirming cause, illegality, or species impact (spec.md).
2. `GET /api/v1/analyses/{id}/layers/{layerid}/access`: returns an authorized, expiry-aware tile/artifact access descriptor (e.g. a short-lived signed URL or token plus its expiry) for a ready layer's display artifact. Never return a raw durable provider URL as if it were permanent (architecture.md: "Provider-issued tile URLs may be temporary. They are not durable analysis identifiers."). Enforce workspace authorization on every call.
3. `GET /api/v1/capabilities`: enabled methods (which of vegetation/water/builtup/forestalerts are currently enabled given config/GFW_ENABLED) and the configured limits (MAX_AOI_KM2, MAX_AOI_VERTICES, max observation window, page sizes, MAX_ACTIVE_JOBS_PER_WORKSPACE) — single source of truth the frontend will later read instead of hardcoding limits.
4. `app/services/priority_service.py`: Investigation Priority score per superpower.md exactly:
   - Components: magnitude (weight 0.50), sensitivity — intersection with configured conservation zones (weight 0.30), context — proximity to configured pressure indicators (weight 0.20). Each component normalized 0–1; weighted sum × 100, rounded, exposed as priority_score alongside the individual component values and priority_method_version (e.g. "priority-v1").
   - If a required component's input is missing (e.g. no conservation-zone config for the workspace), the score must be null — never default a missing component to 0 (superpower.md: "Do not treat missing context as zero pressure").
   - Do not combine overlapping change areas from different layers into one blended score without an explicit union calculation — treat each event/layer's magnitude input independently unless a documented union method is implemented.
   Recompute/attach priority_score to ChangeEvents once their supporting layers are ready (this can run as part of job finalization or as a follow-up worker step — document which).
5. `GET /api/v1/analyses/{id}/events`: keyset (cursor-based) pagination as specified in dsabackendoptimisation.md, ordered using the events_priority_idx composite index (workspace_id, analysis_id, priority_score DESC, id) — no application-side sorting of a full result set. Default page size 50, max 100 (spec.md limits).
6. Authorized GeoJSON export endpoint (backend portion of tasks.md's T28): returns selected events as a GeoJSON FeatureCollection carrying full provenance (method_version, source periods, attribution) per feature, scoped to the requesting workspace.

Constraints:
- Workspace scoping enforced on every one of these endpoints, with a negative test proving cross-workspace denial for each.
- Threshold/config changes create a new analysis configuration rather than mutating an existing one's recorded results (superpower.md: "Threshold changes create a new analysis configuration").

Acceptance criteria:
- An analyst can PATCH an event to "investigating" then "verifiedchange" with notes, and a different authorized user (same workspace) reading GET /api/v1/events/{id} sees the updated status, record_version, and audit trail.
- A concurrent PATCH using a stale expectedrecordversion returns 409 VERSIONCONFLICT and does not corrupt the record.
- Dismissing or marking inconclusive without notes is rejected with a validation error.
- priority_score is null (not 0) for an event whose workspace has no configured conservation-zone data, and present with visible components otherwise.
- Paginating a large synthetic event set (e.g. 500+ events) via cursor returns stable, non-duplicating pages regardless of concurrent inserts.
- A user from workspace B cannot read, verify, or export workspace A's events (403/404 per your chosen convention, but consistently applied).

Required tests: full verification state-machine transitions (valid and invalid), version-conflict handling, notes-required enforcement, priority null-vs-computed cases, keyset pagination stability under concurrent writes, cross-workspace denial for every new endpoint, layer-access descriptor expiry behavior.

Expected handover: the priority formula version shipped, which conservation-zone/pressure-indicator config was used for testing (and that it's placeholder/test config, not real designations, if applicable), and confirmation every new endpoint has a passing workspace-isolation test.
```

Previous: [Phase 4 — Additional change layers](phase-4-additional-layers.md)
Next: [Phase 6 — Reliability & hardening](phase-6-reliability-hardening.md)
