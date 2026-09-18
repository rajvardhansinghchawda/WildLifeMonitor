# Phase 2 — Asynchronous execution core

Paste the block below into a coding agent as its task. The agent should also read, at the repo root (`D:\firebox\CodeNiti`): `systemdesign.md`, `spec.md`, `dsabackendoptimisation.md`, `rules.md`, `backendhandoverfile.md` — these are the authoritative contracts; this file only points to the relevant sections.

Depends on: Phase 1 merged (models, config, auth, DB/Redis connectivity all working).
Blocks: Phase 3 onward.

```text
Task ID: P2-ASYNC-EXECUTION-CORE
Objective: Implement the full asynchronous job lifecycle — validated submission, transactional-outbox persistence, queue dispatch, leased worker execution against a labeled deterministic fixture, heartbeat/reconciliation recovery, DB-authoritative status, and cooperative cancellation. This phase must be provable with NO external provider (GEE/GFW) access.

Read first (in full): systemdesign.md ("Request lifecycle", "Job state machine", "Worker reliability" sections), spec.md ("Submission request/response", "Status response", error codes table), dsabackendoptimisation.md ("Retry policy", "Concurrency strategy"), rules.md, backendhandoverfile.md ("Service entry points").
Depends on: Phase 1 merged (models, config, auth, DB/Redis connectivity all working).

Deliverables:
1. Validation layer (`app/schemas/` + `app/services/analysis_validation.py`):
   - Geometry: parse GeoJSON Polygon/MultiPolygon, enforce WGS84 lon/lat ordering, reject invalid/self-intersecting geometry with a useful message, reject antimeridian-crossing AOIs with UNSUPPORTEDGEOMETRY, enforce MAX_AOI_VERTICES and MAX_AOI_KM2 (area computed via an appropriate projected CRS or geodesic method — document which).
   - Dates: start-inclusive/end-exclusive semantics, reject baseline/comparison overlap (INVALIDDATERANGE), warn (not reject) on substantially different seasonal windows, enforce the 180-day max observation window.
   - Idempotency-Key: reusing a key with an identical body replays the original 202 response and analysis_id; reusing a key with a different body returns 409.
   - Enforce MAX_ACTIVE_JOBS_PER_WORKSPACE by counting the workspace's non-terminal analyses.
   Map every rejection to the exact error codes in spec.md: INVALIDGEOMETRY, AOITOOLARGE, TOOMANYVERTICES, INVALIDDATERANGE, UNSUPPORTEDGEOMETRY.
2. `app/services/analysis_service.py`: orchestrates authenticate → validate → snapshot AOI + processing configuration → resolve idempotency → persist Analysis + Outbox row in ONE database transaction (systemdesign.md's "Request lifecycle" steps 1–5). Response matches spec.md's submission response shape exactly, plus a Location header.
3. `app/workers/dispatcher.py` (separate process role): polls unpublished Outbox rows and publishes them to the Redis/Celery queue, then marks published_at in the same logical operation (at-least-once delivery is acceptable — downstream must be idempotent).
4. `app/workers/analysis_worker.py` (Celery worker): consumes a queue message, creates/updates a JobAttempt row with a lease (expiry) and a fencing token, heartbeats periodically while running. For this phase, "processing" means running a clearly-labeled deterministic FIXTURE processor (e.g. `app/providers/fixture_processor.py`) that produces a trivial, reproducible, synthetic AnalysisLayer result purely to prove orchestration — label it unmistakably as a fixture in logs, metadata, and any persisted method_version string (e.g. "fixture-orchestration-v0"), per rules.md's "Never fabricate observations. Synthetic fixtures must be labeled."
5. Reconciliation (Celery beat scheduled task, `app/workers/scheduler.py`): finds JobAttempts whose lease/heartbeat has expired, requeues or fails them. A worker finalizing with an expired fencing token must be rejected (systemdesign.md: "Reject finalization from a worker with an expired token"). The database is authoritative — Redis holds only dispatch/coordination state, never the source of truth for job status.
6. `GET /api/v1/analyses/{id}` (`app/api/v1/analyses.py`): status/stage/completed_layers/total_layers/layers[]/warnings/updated_at derived from the database, matching spec.md's status response shape exactly. Do not infer percent completion from elapsed time.
7. `POST /api/v1/analyses/{id}/cancel`: sets a cancel-requested flag; returns 202 if accepted or 409 if the analysis is already terminal. Cancellation is cooperative — the worker must check the flag and transition to `cancelled` via the state machine in systemdesign.md (queued→cancelrequested / running→cancelrequested→cancelled).
8. `app/repositories/`: workspace-scoped repository classes for analyses, outbox, job_attempts — no ad hoc queries in routes or services.

Job/layer state machine to implement exactly as in systemdesign.md:
- Job states: queued → running → {succeeded, partial, failed, cancelrequested → cancelled}.
- Layer states: pending, running, ready, insufficientdata, unsupported, failed, cancelled (independent of job state).
- Job resolution: succeeded = all requested layers ready; partial = at least one ready and one not; failed = no requested layer ready; cancelled = cancellation took effect before terminal publication.
- Terminal analyses are never silently restarted — an explicit retry creates a new execution request linked to the original.

Constraints:
- Do not run blocking work on the FastAPI event loop; worker execution is a separate process.
- Retry policy (dsabackendoptimisation.md): exponential backoff + jitter for transient failures only; never auto-retry invalid credentials, invalid geometry, or unsupported coverage.
- Write artifacts/state under attempt-specific keys (even though this phase's fixture won't write real artifacts yet, design the JobAttempt/Artifact key scheme now so Phase 3 doesn't need a rework).

Acceptance criteria:
- Submitting a valid AOI returns 202 with analysis_id, status=queued, statusurl, resultsurl, and a Location header within the P95 target from dsabackendoptimisation.md (sub-500ms on a warm API, excluding actual processing).
- Replaying the same Idempotency-Key + identical body returns the original analysis_id and does not create a second row; a different body with the same key returns 409.
- A submitted analysis transitions queued → running → succeeded through the fixture worker, observable via polling GET /api/v1/analyses/{id}.
- Killing/pausing a worker mid-attempt (simulate by not sending heartbeats) causes reconciliation to detect the expired lease and requeue or fail it WITHOUT the original (now-recovered) attempt being able to finalize a duplicate result — this must be an actual integration test that kills a worker and asserts single-publication.
- Cancellation: a queued or running analysis can be cancel-requested and eventually reaches cancelled; cancelling an already-terminal analysis returns 409.
- MAX_ACTIVE_JOBS_PER_WORKSPACE is enforced with a clear error when exceeded.

Required tests: geometry validation edge cases (self-intersecting, antimeridian, oversized, too many vertices), date validation edge cases (overlap, >180 days, season-mismatch warning), idempotency replay vs conflict, transactional outbox (kill process between persist and dispatch — message must not be lost or duplicated beyond at-least-once), worker crash/lease-expiry/fencing-token rejection, cancellation state transitions, active-job-limit enforcement.

Expected handover: proof (test output) of the crash-recovery scenario specifically, current queue/lease timing constants used, and confirmation the fixture processor's output is unambiguously labeled synthetic everywhere it's surfaced.
```

Previous: [Phase 1 — Repository foundation](phase-1-repo-foundation.md)
Next: [Phase 3 — Vegetation vertical slice](phase-3-vegetation-slice.md)
