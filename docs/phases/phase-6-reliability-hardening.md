# Phase 6 — Reliability & hardening

Paste the block below into a coding agent as its task. The agent should also read, at the repo root (`D:\firebox\CodeNiti`): `dsabackendoptimisation.md`, `rules.md`, `tasks.md`, `backendhandoverfile.md` — these are the authoritative contracts; this file only points to the relevant sections.

Depends on: Phase 5 merged (full API surface exists to load-test and secure).
Blocks: Phase 7.

```text
Task ID: P6-RELIABILITY-HARDENING
Objective: Make the system survive real operating conditions — provider throttling, retries, concurrent duplicate submissions, database pool exhaustion — and prove the release-blocking test list from tasks.md passes.

Read first (in full): dsabackendoptimisation.md (entire document), rules.md ("Security rules", "Merge gate"), tasks.md ("Reliability backlog" and "Release-blocking tests" sections), backendhandoverfile.md ("Observability", "Operations runbook").
Depends on: Phase 5 merged (full API surface exists to load-test and secure).

Deliverables:
1. `app/services/idempotency_store.py` and `app/services/scientific_cache.py` kept as two distinct Redis-backed mechanisms (dsabackendoptimisation.md: "Separate idempotency keys from scientific cache keys"). Scientific cache key composition must include every input listed in dsabackendoptimisation.md's "Cache-key construction" section: workspace scope, canonical AOI hash, baseline/comparison start/end, requested layers, dataset revision or freshness bucket, method version, threshold configuration, mask configuration, analysis CRS, analysis resolution. Canonical geometry hashing must normalize ring orientation/ordering and must not round coordinates unless a documented precision policy exists.
2. `app/services/provider_rate_limiter.py`: a deployment-wide (Redis-based, not in-process) concurrency limiter per provider. Exponential backoff with jitter for retryable failures; honor Retry-After; never auto-retry invalid-credential, invalid-geometry, or unsupported-coverage failures (same rule as Phase 2, now enforced consistently across all providers). Token-refresh must go through one controlled shared path to avoid refresh storms.
3. Benchmark suite (`backend/tests/benchmarks/` or a scripts/ folder, whichever your tooling prefers) exercising dsabackendoptimisation.md's "Benchmark suite" list: small/medium/max-permitted AOIs, cold vs warm cache, concurrent duplicate submissions, dense event results, simulated provider throttling, simulated worker crashes, low-coverage imagery (insufficient-data path), tile-credential expiry, large-but-valid geometries, DB connection-pool exhaustion. Record API latency separately from queue delay and processing duration, and compare against the p95 targets table (submission <500ms, status read <200ms, event page <500ms, cached result metadata <300ms, cancellation <300ms) — report actual numbers, do not claim targets were met without measurement.
4. Security regression tests (`backend/tests/security/`): cross-workspace denial across every resource type (analyses, events, artifacts, tile access — consolidate the per-phase isolation tests here plus add any gaps), confirm all DB access is parameterized (static check or code review note, not just tests), confirm CORS only allows ALLOWED_ORIGINS, confirm MAX_AOI_KM2/MAX_AOI_VERTICES/rate limits/MAX_ACTIVE_JOBS_PER_WORKSPACE are enforced, confirm secrets and tokens never appear in captured logs (assert on log output in a test).
5. Observability (`app/core/metrics.py` or equivalent): emit the exact signal list from backendhandoverfile.md's "Observability" table — HTTP duration/error rate, queue age, job duration by method, provider latency/throttles, valid-data coverage, cache reuse rate, worker heartbeat age, artifact publication failures — all correlated by request_id/analysis_id/attempt_id. Wire to whatever metrics backend the deployment target expects (state your choice explicitly, e.g. Prometheus exposition format on a /metrics endpoint).
6. Backup/restore rehearsal: a documented, executed drill (`docs/backup-restore-drill.md`) that actually restores a database backup plus its referenced object-storage artifacts and confirms a previously-completed analysis is fully readable afterward.
7. Artifact cleanup job: a scheduled task deleting abandoned (non-published, past-grace-period) attempt artifacts, while never deleting published outputs before the workspace's retention policy and source-license conditions allow it.

Constraints:
- A semaphore inside one process is not a deployment-wide limit — the provider rate limiter must coordinate across all worker processes via Redis.
- Do not increase retry aggressiveness as a response to throttling (backendhandoverfile.md's runbook explicitly warns against this) — reduce concurrency instead.

Acceptance criteria — all of tasks.md's release-blocking tests pass and are automated:
- No-data handling (insufficient observations surfaced, never presented as zero change).
- Metric/overlay consistency (manifest metrics match published artifact).
- Geometry and area correctness.
- Workspace isolation (consolidated cross-cutting test suite).
- Retry deduplication (no duplicate published events/layers from redelivered messages).
- Artifact authorization (no unauthorized artifact/tile access).
- Attribution display (every layer/result carries required attribution).
- Worker recovery (crash mid-attempt recovers cleanly — reuse/extend Phase 2's test).
- Secret redaction (no secrets in logs, verified by test).

Required tests: everything listed above as automated tests, plus the benchmark suite runs and produces a recorded report (even if numbers don't yet hit target — record actuals and flag gaps).

Expected handover: full benchmark report with actual p50/p95 numbers per operation, list of any release-blocking test not yet automated (if any) with rationale, confirmation the backup/restore drill was actually executed (not just documented), and current values of all rate-limit/concurrency constants.
```

Previous: [Phase 5 — Investigation workflow](phase-5-investigation-workflow.md)
Next: [Phase 7 — Documentation & handover](phase-7-handover.md)
