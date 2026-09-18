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
