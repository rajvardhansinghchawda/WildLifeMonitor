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
