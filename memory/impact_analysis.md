# CodeNiti Backend — Impact Analysis

This document records the architectural, data model, security, and operational impacts introduced in each phase, along with verified mitigation strategies and regression controls.

---

## Phase 0: Provider Verification Track

### Architectural Impact
- **Decoupling Real Compute from Infrastructure**: Established clear separation between provider capability verification and application code. Prevents unverified provider assumptions from polluting the code base.

### Security & Operational Impact
- **Zero Secrets Exposure**: Clarified that GCP Service Account keys and GFW API tokens must never be checked into git. Documented environment contracts (`GEE_PROJECT_ID`, `GOOGLE_APPLICATION_CREDENTIALS`, `GFW_ENABLED=false`).
- **Quota & Cost Controls**: Set baseline understanding that unregistered or misconfigured GCP projects will hit billing/quota limits, requiring verification before production rollout.

---

## Phase 1: Repository Foundation

### Architectural & System Impact
- **Modular Monolith Foundation**: Established the repository layout separating HTTP concerns (`app/api/`), domain services (`app/services/`), geospatial algorithms (`app/analysis/`), external providers (`app/providers/`), and background workers (`app/workers/`).
- **Standardized Error Contract**: Every HTTP error is channeled through the canonical `spec.md` error envelope (`{"error": {"code", "message", "details", "request_id", "retryable"}}`), standardizing error handling for the upcoming frontend.
- **Traceability & Observability**: Every request and worker task can be correlated through `request_id`, `analysis_id`, and `attempt_id` propagated via async context variables and emitted in JSON logs.

### Data Model & Persistence Impact
- **PostGIS Spatial Engine**: PostGIS 4326 is now the official geometry engine for `AOI` and `ChangeEvent`. Spatial queries benefit from native GiST indexing (`events_geom_gist_idx`).
- **Analysis Input Immutability**: The `analyses` table snapshots `aoi_snapshot`, observation windows, and requested layers. Edits or configuration changes must generate new analyses rather than mutating existing records in place.
- **Outbox Pattern Preparation**: The `outbox` table incorporates `published_at` (`TIMESTAMP WITH TIME ZONE`, nullable) and composite index `(published_at, created_at)` allowing high-throughput polling (`WHERE published_at IS NULL`) without locking contention in Phase 2.
- **Migration Reversibility**: Confirmed that `alembic upgrade head` and `alembic downgrade base` apply and revert cleanly without orphaned database artifacts.

### Security & Access Boundaries Impact
- **Workspace Isolation Guarantee**: Multi-tenancy is enforced at the database level. An authenticated principal can only query or mutate resources within workspaces where an active `Membership` record exists. Cross-workspace access returns 404/403.
- **Defense in Depth against Client Headers**: The `X-Workspace-ID` header is treated purely as an ambiguous-intent disambiguator, never as an authority claim.
- **Production Misconfiguration Protection**: Hard startup validator prevents `AUTH_MODE=development` when `APP_ENV=production`.

### Regression Controls & Verification
- **Automated CI**: GitHub Actions workflow and Docker compose test environment ensure any future PR breaks will be caught before merging.
- **Test Suite**: 11 automated tests covering configuration, migrations, health probes, RBAC, persistence, and workspace isolation.

---

## Phase 2: Asynchronous Execution Core

### Architectural & System Impact
- **Decoupled Execution Topology**: FastAPI HTTP process is completely decoupled from heavy analytical processing via the Transactional Outbox pattern. Enqueuing occurs within the primary database transaction boundary.
- **Fail-Safe Dispatcher**: The dispatcher worker operates with at-least-once delivery semantics (`published_at` recorded post-dispatch). Downstream workers are idempotent.
- **Leasing & Zombie Mitigation**: Active heartbeat renewal prevents premature job expiration while strictly protecting against split-brain execution via monotonically increasing fencing tokens.

### Data Model & Persistence Impact
- **Atomic Persistence**: Analysis and Outbox records commit in a single PostgreSQL transaction.
- **Relationship Eager Loading**: Configured `lazy="selectin"` on `Analysis.layers` and `JobAttempt` relationships, preventing `MissingGreenlet` errors in asynchronous ORM query execution.
- **Distributed Attempt Tracking**: Every analysis execution attempt is assigned a durable `JobAttempt` row tracking worker ID, attempt number, lease expiration, heartbeat timestamps, and fencing tokens.

### Security & Operational Impact
- **Strict Input Sanitization**: Rejection of self-intersecting geometries (`INVALIDGEOMETRY`), antimeridian crossings (`UNSUPPORTEDGEOMETRY`), oversized AOIs (`AOITOOLARGE`), and vertex flooding (`TOOMANYVERTICES`) guards compute infrastructure from denial-of-service.
- **Active Job Throttling**: Workspace concurrency limit (`MAX_ACTIVE_JOBS_PER_WORKSPACE=2`) prevents single-tenant quota monopolization.
- **Cooperative Cancellation**: Immediate responsiveness (`cancel_requested` flag) enables rapid resource reclamation without orphan process leaks.

### Regression Controls & Verification
- **Test Coverage**: 30 automated tests in PostgreSQL 16 + PostGIS + Redis Docker environment covering input validation, idempotency, lifecycle transitions, heartbeat lease extensions, worker crash recovery, and fencing token rejection.

---

## Phase 3: Vegetation Vertical Slice

### Architectural & Scientific Impact
- **Decoupled Geospatial Core**: Algorithms for NDVI computation, cloud filtering, compositing, and connected components (`app/analysis/vegetation.py`) are pure numeric Python functions decoupled from FastAPI, database, and specific cloud providers.
- **Strict Scientific Integrity (Zero-Data Fabrication)**: Prohibited default zeros for corrupt/unobserved satellite pixels. Zero-denominator pixels ($(B4+B8) < 1e-4$) are explicitly masked out of the valid observation mask rather than smoothed or imputed as "no change".
- **Storage-First Artifact Publication**: Invariant enforced in `ArtifactService`: object storage writes and SHA256 integrity verification must succeed prior to any database row persistence.

### Data Model & Persistence Impact
- **PostGIS Polygon Persistence**: Change events store polygon boundaries in WGS84 (`SRID=4326`) with GiST index support.
- **Idempotent Attempt-Scoped Persistence**: Event extraction clears prior attempt artifacts and commits events in a single transaction, preventing duplication across re-runs.
- **Artifact Convenience Properties**: `Artifact` model exposes `checksum`, `artifact_type`, and `storage_uri` properties while preserving underlying column schemas (`checksum_sha256`, `metadata`).

### Security & Operational Impact
- **Object Storage Isolation**: Artifacts are scoped to `analysis_id/attempt_id/filename` in MinIO/S3, eliminating namespace collisions.
- **Contractual Integrity**: `GET /analyses/{id}/results` returns 409 Conflict (`ANALYSISNOTREADY`) if polled prior to terminal completion.

### Regression Controls & Verification
- **Test Coverage**: 41 consolidated automated tests in Docker covering SCL masking, zero-denominator exclusion, temporal compositing, 8-connected polygonization, MinIO SHA256 verification, corrupt artifact write rejection, idempotent event extraction, and result manifest spec compliance.

---

## Phase 4: Additional Change Layers

### Architectural & Scientific Impact
- **Independent Layer Fault Isolation**: Multi-sensor layer execution is decoupled. A failure or unsupported state in one layer (e.g., GFW or water) does not abort or invalidate other successful layers; the job resolves to `partial`.
- **Zero-Baseline Water Null Invariant**: Relative percentage change calculation mathematically asserts `None` when baseline water area is 0.0, avoiding division-by-zero or misleading 0.0% / 100% reports.
- **Physical Reality vs Spectral Probability**: Built-up layer strictly surfaces "probability change" rather than making unsubstantiated physical "construction area" claims.
- **Batched Spatial Tree Optimization**: Infrastructure proximity uses `shapely.STRtree` to batch nearest-feature queries once per analysis AOI ($O(1)$ query count), preventing $N$ expensive database or external API lookups.
- **Epistemic Clarity in Context**: Clear distinction between "nearest known feature in cached dataset" and absolute absence in the real world. Context failures emit warnings and never invalidate change layers.

### Data Model & Persistence Impact
- **Layer Error Classification**: `AnalysisLayer` stores structured `error_code` and `error_details` (JSONB) exposed through `GET /analyses/{id}` to facilitate debugging.
- **Multi-Method ChangeEvents**: Supports `watergaincandidate`, `waterlosscandidate`, and `builtupprobabilitychangecandidate` alongside vegetation events.

### Security & Operational Impact
- **Provider Access Gating**: External GFW alerts provider is securely disabled (`GFW_ENABLED=false`) until Phase 0 credentials verification. In-flight requests receive transparent `unsupported` responses rather than unhandled connection exceptions.

### Regression Controls & Verification
- **Test Coverage**: 52 consolidated automated tests in Docker covering water gain/loss/ambiguity, zero-baseline water null relative change, builtup probability labeling, multi-layer independent failure isolation (`partial` resolution), GFW explicit unsupported reporting, and spatial-tree batching query counts.

---

## Phase 5: Investigation Workflow & Verification Loop

### Architectural & Scientific Impact
- **Investigation Priority Heuristic (superpower.md)**: Product ranking combines magnitude (0.50), conservation zone sensitivity (0.30), and pressure context (0.20) normalized to 0–100. Explicitly designated as a review triage heuristic, NOT an ecologically validated "Habitat Health" metric.
- **Strict Null Propagation on Missing Context**: If workspace conservation zones or pressure indicators are unconfigured, `priority_score` strictly returns `null` (None in Python). The system NEVER defaults missing context to zero pressure, upholding scientific epistemic humility.
- **Verification Workflow Semantics**: Reviewer confirmation (`verifiedchange`) verifies the presence of change under the monitoring workflow; it does NOT confirm illegal activity, causality, or specific species impact.

### Data Model & Persistence Impact
- **Optimistic Concurrency Control**: `ChangeEvent.record_version` incremented on each status mutation; concurrent updates with stale `expected_record_version` are rejected with `409 Conflict` (`VERSIONCONFLICT`).
- **Verifications and Audit Trails**: Every status transition atomically writes a row to `verifications` (decision, actor, from/to status, reviewer notes, version) and `audit_logs` (actor, action, target_type, target_id, payload) in a single transaction.
- **Keyset Cursor-Based Pagination**: `GET /analyses/{id}/events` utilizes composite index `events_priority_idx` (`workspace_id, analysis_id, priority_score DESC NULLS LAST, id DESC`), completely eliminating database offset scans and client/application-side sorting.

### Security & Multi-Tenancy Impact
- **Workspace Scoping**: Every Phase 5 endpoint enforces strict workspace authorization (`VIEWER` for read/export/access, `ANALYST` for verification). Negative tests confirm cross-workspace data access returns 404 (preventing resource existence leakage).
- **Temporary Display Artifact Credentials**: Tile access generates time-bounded (900s) presigned MinIO/S3 URLs; durable internal storage URLs are never exposed as permanent identifiers.
- **Authorized Provenance Export**: GeoJSON export endpoint carries full scientific provenance (method_version, baseline/comparison periods, attribution) bound to the requesting tenant.

### Regression Controls & Verification
- **Test Coverage**: 63 consolidated automated tests in Docker covering verification state transitions, mandatory notes on dismissal/inconclusive, optimistic locking conflicts (409), priority calculation and null propagation, keyset pagination stability and ordering over 120 synthetic events, layer access readiness (409 vs 200), and cross-workspace isolation.

---

## Phase 6: Reliability & Hardening

### Architectural & Scientific Impact
- **Dual Redis Caching Mechanisms**: Clear separation between `IdempotencyStore` (`idem:{workspace_id}:{idempotency_key}`) which acts as a transient request gate, and `ScientificCache` (`sci:{composite_hash}`) which caches reusable analysis layer outputs across identical scientific parameters.
- **Canonical Polygon Ring Normalization**: Exterior rings are canonically oriented counter-clockwise (CCW) and interior holes clockwise (CW) with starting vertex rotated to the lexicographically minimum coordinate. Eliminates hashing divergence caused by arbitrary coordinate winding without destructive coordinate rounding.
- **Scientific Variance Integrity**: The scientific cache key strictly binds all 13 variance factors: workspace scope, canonical AOI hash, baseline/comparison dates, requested layers, dataset revision, method version, threshold config, mask config, CRS, and resolution.
- **Deployment-Wide Concurrency Limiting**: `ProviderRateLimiter` enforces provider-level execution caps cluster-wide using Redis sorted sets rather than local in-process semaphores, preventing API throttling from distributed workers.
- **Single-Flight Token Refresh**: Shared Redis lock prevents credential refresh storms when tokens expire under heavy concurrent load.
- **Fast-Fail on Non-Retryable Errors**: Immediate termination without retry for `INVALIDCREDENTIALS`, `INVALIDGEOMETRY`, `UNSUPPORTEDCOVERAGE`, preventing resource waste and log spam.

### Data Model & Persistence Impact
- **In-Flight Concurrency Synchronization**: `IdempotencyStore` utilizes atomic `SET ... NX` reservation combined with bounded polling on in-flight status, ensuring exactly one background analysis is created when duplicate requests arrive simultaneously.
- **Automated Abandoned Artifact Cleanup**: `ArtifactCleanupService` queries and purges failed/cancelled attempt artifacts older than the retention grace period (24 hours) from object storage and database while strictly preserving published artifacts of succeeded analyses.

### Security & Operational Impact
- **Observability**: Prometheus `/metrics` endpoint exports all 8 metric families from `backendhandoverfile.md` (HTTP requests/duration, queue depth/age, job duration, provider latency/throttles, valid coverage fraction, cache hits/misses, worker heartbeat age, artifact publication failures).
- **Secret Redaction**: Logging pipeline and test assertions verify sensitive credentials and bearer tokens never leak into captured logs.
- **Disaster Recovery Validation**: Rehearsed and documented cold-restore drill (`docs/backup-restore-drill.md`) proving database snapshot and MinIO artifact restore readability.

### Regression Controls & Verification
- **Test Coverage**: 80 consolidated automated tests in Docker with PostgreSQL 16 + PostGIS + Redis + MinIO:
  - Phase 6 unit tests (8 tests): ring canonicalization, hash stability, scientific cache storage, idempotency replay/conflict, provider semaphore/lock, non-retryable error handling, artifact cleanup, `/metrics` exposition.
  - Benchmarks (5 tests): submission latency, cold/warm cache, concurrent duplicate submissions, status reads, cancellations.
  - Security regressions (3 tests): secret redaction, attribution display, CORS policies.



