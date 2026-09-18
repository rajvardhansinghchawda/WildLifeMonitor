# CodeNiti Backend — Memory Changelog

This document maintains an append-only log of every development phase, documenting the **Prompt**, **Thinking / Architecture Analysis**, and **Result / Deliverables**.

---

## Phase 0: Provider Verification Track (`P0-PROVIDER-VERIFICATION`)

### Prompt
Produce a provider-verification record for Google Earth Engine (and GFW) following the exact template in `workflow.md`, and document concrete setup steps needed to obtain working credentials without fabricating processing access or touching application code.

### Thinking
- Scientific integrity (`rules.md`) requires never fabricating observations or claiming processing access before real capability probes are executed.
- Registration on Google Cloud / Earth Engine is distinct from compute evaluation access (EECU quota, IAM roles).
- GCP IAM role names must be accurate: `roles/earthengine.writer` (allows interactive compute reductions like `reduceRegion`) and `roles/serviceusage.serviceUsageConsumer` (quota consumption). Note that `roles/earthengine.reader` does not exist in GCP IAM.
- All Phase 0 deliverables belong strictly in `docs/` with zero modifications to application code.

### Result
1. Created `docs/provider-verification-template.md` matching all 9 required fields from `workflow.md`.
2. Created `docs/gee-setup-guide.md` with step-by-step GCP project, IAM roles, credential management, and an instructional Python capability probe.
3. Created pending verification records `docs/provider-verification-records/gee.md` (`PENDING`) and `docs/provider-verification-records/gfw.md` (`PENDING, GFW_ENABLED=false`).
4. Committed and pushed to `main` and `backend` branches on `https://github.com/rajvardhansinghchawda/WildLifeMonitor.git`.

---

## Phase 1: Repository Foundation (`P1-REPO-FOUNDATION`)

### Prompt
Scaffold the backend repository so an authenticated request reaches FastAPI and persists an authorized `Analysis` record in PostgreSQL/PostGIS. Implement configuration, structured logging with redaction, database ORM models, Alembic migrations with required indexes, security/RBAC, health checks, Docker Compose, CI workflow, and automated test suite.

### Thinking
- **Persistence & Spatial Engine**: PostGIS 16 must be tested directly; SQLite cannot execute PostGIS DDL (`CREATE EXTENSION postgis;`, `USING GIST (geom)`).
- **Test Isolation**: In asyncpg, connection pooling across asyncio event loops leads to `got Future attached to a different loop`. Using `NullPool` in test fixtures ensures each test gets a dedicated connection cleanly bound to its running event loop.
- **Production Safety**: Startup must immediately fail (`ValueError`) if `APP_ENV=production` and `AUTH_MODE=development`.
- **Workspace Scoping**: Client headers like `X-Workspace-ID` cannot be trusted blindly; they only select among verified memberships resolved from the database for the authenticated user principal.
- **Data Model Alignment**: All 11 models from `systemdesign.md` data model table must be implemented. `Outbox` requires explicit `published_at` nullable timestamp column and composite index `(published_at, created_at)` for efficient dispatcher polling. `AnalysisLayer` requires classified error fields (`error_code`, `error_details`).
- **CI Guarantee**: GitHub Actions workflow (`.github/workflows/ci.yaml`) and Docker compose test environment ensure Ruff linting, Mypy type-checking, and Pytest pass on every change.

### Result
1. **Infrastructure**: Created `compose.yaml` (PostGIS 16, Redis 7, MinIO, API, workers) and `backend/Dockerfile`.
2. **Dependencies & CI**: Pinned dependencies in `backend/pyproject.toml` and `backend/requirements.lock`. Created `.github/workflows/ci.yaml` and `scripts/ci.ps1`, `scripts/ci.sh`.
3. **Core Modules**:
   - `backend/app/core/config.py`: Pydantic Settings with production dev-auth guard.
   - `backend/app/core/logging.py`: Structured JSON logging with `request_id`/`analysis_id`/`attempt_id` correlation and secret/coordinate redaction.
   - `backend/app/core/security.py`: Dev auth + OIDC JWT validation, Viewer/Analyst/Admin RBAC, and database-verified workspace isolation.
4. **Database & Migrations**:
   - `backend/app/db/base.py` & `session.py`: Async SQLAlchemy engine and session dependency.
   - `backend/app/models/`: Implemented all 11 models (`Workspace`, `Membership`, `AOI`, `Analysis`, `AnalysisLayer`, `JobAttempt`, `ChangeEvent`, `Artifact`, `Verification`, `AuditLog`, `Outbox`).
   - `backend/migrations/versions/0001_baseline_schema.py`: Baseline Alembic migration with PostGIS and required indexes (`analyses_workspace_created_idx`, `events_geom_gist_idx`, `events_workspace_analysis_idx`, `events_priority_idx`, `outbox_published_created_idx`).
5. **API & Schemas**:
   - `backend/app/schemas/`: Error envelope, analysis, event, capability, and health schemas.
   - `backend/app/api/v1/`: `/health/live`, `/health/ready`, `/analyses` (minimal persistence stub), `/events`, `/capabilities`.
   - `backend/app/main.py`: FastAPI app with CORS, correlation ID middleware, and spec-compliant error envelope handlers.
6. **Automated Verification**:
   - 11/11 tests passing in Docker: config validation, health probes, migration apply/rollback, security RBAC, persistence round-trip, and workspace isolation.
   - Ruff lint & format: 100% clean.
   - Mypy static typing: 0 errors across 37 source files.

---

## Phase 2: Asynchronous Execution Core (`P2-ASYNC-EXECUTION-CORE`)

### Prompt
Implement the full asynchronous job lifecycle — validated submission, transactional-outbox persistence, queue dispatch, leased worker execution against a labeled deterministic fixture (`fixture-orchestration-v0`), heartbeat/reconciliation recovery with active lease renewal, DB-authoritative status, and cooperative cancellation without external provider access.

### Thinking
- **Validation Rigor**: Enforced exact `spec.md` error codes (`INVALIDGEOMETRY`, `AOITOOLARGE`, `TOOMANYVERTICES`, `INVALIDDATERANGE`, `UNSUPPORTEDGEOMETRY`). Calculated geodesic polygon area via spherical excess on the WGS84 authalic sphere ($R=6371.0088$ km). Flagged seasonal window warning (>2 months difference) as a product heuristic assumption.
- **Leasing & Zombie Recovery**: Heartbeats must actively push `lease_expires_at` forward in PostgreSQL. If a worker crashes or hangs, the reconciliation scheduler detects the expired lease, marks it `expired`, increments the fencing token, and requeues the analysis. Any stale attempt attempting finalization is rejected with `FencingTokenExpiredError`, ensuring single publication.
- **Cooperative Cancellation**: Once cancelled, the worker halts processing before or between layers, transitioning both the attempt and the analysis to `cancelled`. Terminal analyses reject cancellation with 409 Conflict.
- **Asyncpg Relationship Loading**: In async SQLAlchemy, relationship access triggers `MissingGreenlet` unless relationships are configured with `lazy="selectin"` or pre-loaded. Updated `Analysis` model to use `lazy="selectin"` for `layers` and `job_attempts`.

### Result (Official Handover Format)
```text
Task: P2-ASYNC-EXECUTION-CORE
Status: Complete and verified
Files changed:
  - backend/app/core/exceptions.py (AppException, ValidationException, ConflictException, RateLimitedException, NotFoundException, FencingTokenExpiredError)
  - backend/app/main.py (Updated http_exception_handler to preserve structured details and retryable flags)
  - backend/app/services/analysis_validation.py (Geometry parser, bounds check, spherical excess geodesic area, vertex counting, date intervals, overlap checks, seasonal mismatch heuristic)
  - backend/app/repositories/analysis_repository.py (Workspace-scoped queries, active job counting, atomic outbox persistence, cooperative cancellation)
  - backend/app/repositories/outbox_repository.py (Indexed polling on published_at IS NULL, batch mark_published)
  - backend/app/repositories/job_attempt_repository.py (Lease creation, active heartbeat extension, fencing token validation, expired attempt polling)
  - backend/app/repositories/__init__.py
  - backend/app/services/analysis_service.py (Full lifecycle orchestration: validation, idempotency replay vs conflict, active job throttling, DB-authoritative status)
  - backend/app/providers/fixture_processor.py (Deterministic synthetic fixture processor stamped fixture-orchestration-v0)
  - backend/app/workers/dispatcher.py (Transactional Outbox poller dispatching to Redis analyses_queue)
  - backend/app/workers/analysis_worker.py (Leased worker process with active heartbeats, fencing token validation, cooperative cancellation)
  - backend/app/workers/scheduler.py (Reconciliation scheduler detecting expired leases, incrementing fencing tokens, and requeuing)
  - backend/app/workers/__init__.py
  - backend/app/api/v1/analyses.py (Wired POST /analyses, GET /analyses/{id}, POST /analyses/{id}/cancel)
  - backend/app/models/analysis.py (Configured lazy="selectin" on layers and job_attempts relationships)
  - backend/tests/conftest.py (Added test_workspace, auth_headers, and async_client fixtures)
  - backend/tests/test_analysis_validation.py (11 unit tests for geometry and date validation)
  - backend/tests/test_idempotency.py (2 tests for replay vs conflict)
  - backend/tests/test_async_lifecycle.py (3 integration tests for full lifecycle, active job limits, and cancellation)
  - backend/tests/test_worker_heartbeat.py (2 tests for active lease extension and fencing token rejection)
  - backend/tests/test_worker_recovery.py (1 integration test for worker crash, reconciliation, zombie fencing rejection, and single-publication guarantee)
Behavior implemented: Validated asynchronous analysis submission, transactional outbox queuing, Redis queue dispatch, leased worker execution against deterministic synthetic fixture, periodic heartbeat lease extension, expired lease reconciliation, fencing token rejection, and cooperative cancellation.
Contract changes: Exposed POST /api/v1/analyses (202 Accepted + Location), GET /api/v1/analyses/{id} (DB-authoritative status), and POST /api/v1/analyses/{id}/cancel (202 Accepted / 409 Conflict).
Tests executed: 30 automated tests in PostgreSQL 16 + PostGIS + Redis Docker container (pytest tests/ -v).
Test results: 30/30 passed in 5.84s; Ruff check 100% clean; Ruff format 100% clean; Mypy 0 errors in 47 source files.
Provider checks executed: None (Purely deterministic fixture execution; external providers remain decoupled).
Known limitations: Analysis processing is backed by fixture-orchestration-v0 synthetic output pending Phase 3 vegetation domain slice. Seasonal window threshold (>2 months) is flagged as a product heuristic assumption.
Migration or deployment steps: Ensure Redis container is running and accessible via REDIS_URL. Outbox dispatcher and worker processes run alongside API.
Next dependency: Phase 3 (P3-VEGETATION-SLICE).
```

---

## Phase 3: Vegetation Vertical Slice (`P3-VEGETATION-SLICE`)

### Prompt
Implement the end-to-end vegetation domain slice: Sentinel-2 processing pipeline, NDVI zero-denominator masking without data fabrication, median temporal compositing, 8-connected component polygonization with minimum area thresholding, artifact publication to MinIO with SHA256 validation, idempotent ChangeEvent extraction, and result manifest API (`GET /analyses/{id}/results` and `GET /analyses/{id}/events`).

### Thinking
- **Scientific Integrity & Zero Data Fabrication (`rules.md`)**: In optical satellite imagery, pixels where $(B4+B8) == 0$ or $(B4+B8) < 1e-4$ are unobserved or corrupt. Fabricating an NDVI value of 0.0 falsely implies bare soil or water when in reality no valid measurement exists. These pixels must be strictly masked out of valid pixel masks and completely excluded from composite reductions and spatial statistics.
- **Artifact Publication Invariant (`systemdesign.md`)**: Artifact metadata must be persisted to the PostgreSQL `artifacts` table **only after** the object has been confirmed written to MinIO/S3 and its SHA256 checksum has been verified against the uploaded payload. If an upload fails or checksum mismatches, zero rows are inserted into the database.
- **Idempotency & Re-runs**: Re-running event extraction on the same analysis layer must be idempotent. The service purges or updates prior attempt extractions atomically within the attempt boundary to avoid duplicate event multiplication.
- **Result Manifest Completeness (`spec.md`)**: The response from `GET /analyses/{id}/results` must strictly adhere to the required fields (`analysis_id`, `status`, `configuration_id`, `input_snapshot`, `layers`, `provenance`, `warnings`, `attribution`, `event_count`, `events_url`).

### Result (Official Handover Format)
```text
Task: P3-VEGETATION-SLICE
Status: Complete and verified
Files changed:
  - backend/app/providers/base.py (ChangeProvider Protocol, LayerResult, AnalysisContext)
  - backend/app/analysis/vegetation.py (SCL masking, safe zero-denominator exclusion, temporal median compositing, 8-connected BFS component polygonization, ha conversion)
  - backend/app/providers/fixture_vegetation_provider.py (Deterministic synthetic Sentinel-2 fixture provider labeled synthetic)
  - backend/app/services/artifact_service.py (Storage-first MinIO upload with SHA256 verification before DB registration)
  - backend/app/services/event_extraction_service.py (Idempotent attempt-scoped ChangeEvent persistence with PostGIS polygons)
  - backend/app/models/artifact.py (Added checksum, artifact_type, storage_uri convenience properties)
  - backend/app/workers/analysis_worker.py (Wired Vegetation provider, MinIO artifact publisher, and event extraction service into worker flow)
  - backend/app/api/v1/analyses.py (Added GET /analyses/{id}/results and GET /analyses/{id}/events)
  - backend/app/api/v1/events.py (Added GET /events/{id})
  - backend/tests/test_vegetation_analysis.py (6 tests: zero-denominator masking, SCL masking, temporal compositing, thresholding, small component filtering, no valid observations)
  - backend/tests/test_artifact_publication.py (2 tests: upload with SHA256 verification and corruption rejection)
  - backend/tests/test_event_extraction.py (2 tests: idempotent event persistence and metric-to-manifest consistency)
  - backend/tests/test_result_manifest.py (1 test: spec.md field completeness and 409 when not ready)
  - backend/tests/conftest.py (Container network DB resolution fallback)
Behavior implemented: Implemented end-to-end vegetation change analysis with Sentinel-2 SCL cloud/shadow filtering, zero-denominator invalid support masking, temporal median compositing, 8-connected polygonization, storage-first artifact publication with SHA256 validation, idempotent ChangeEvent extraction, and full result manifest / GeoJSON event endpoints.
Contract changes: Added GET /api/v1/analyses/{id}/results (ResultManifestResponse), GET /api/v1/analyses/{id}/events (GeoJSON FeatureCollection), and GET /api/v1/events/{id} (GeoJSON Feature).
Tests executed: 41 automated tests in Docker with PostgreSQL 16 + PostGIS + Redis + MinIO (pytest tests/ -v).
Test results: 41/41 passed in 10.59s; Ruff check 100% clean; Ruff format 100% clean; Mypy 0 errors in 52 source files.
Provider checks executed: Synthetic Sentinel-2 provider labeled synthetic (Phase 0 real provider access pending).
Known limitations: Earth Engine provider verification remains pending in docs/provider-verification-records/gee.md; execution runs through the validated FixtureVegetationProvider.
Migration or deployment steps: MinIO bucket 'wildlife-artifacts' must exist or be created by ArtifactService._ensure_bucket_exists.
Next dependency: Phase 4 (P4-ADDITIONAL-LAYERS).
```

