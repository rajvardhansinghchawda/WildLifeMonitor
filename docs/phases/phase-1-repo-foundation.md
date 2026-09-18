# Phase 1 — Repository foundation

Paste the block below into a coding agent as its task. The agent should also read, at the repo root (`D:\firebox\CodeNiti`): `architecture.md`, `backendhandoverfile.md`, `systemdesign.md`, `spec.md`, `rules.md`, `agents.md` — these are the authoritative contracts; this file only points to the relevant sections.

Depends on: nothing (can start immediately; Phase 0 runs in parallel but isn't required).
Blocks: everything from Phase 2 onward.

```text
Task ID: P1-REPO-FOUNDATION
Objective: Scaffold the backend repository so an authenticated request can reach FastAPI and persist an authorized Analysis record. No business logic beyond validation/auth/persistence scaffolding.

Read first (in full): architecture.md, backendhandoverfile.md, systemdesign.md (data model + security model sections), spec.md (API endpoint table + error contract), rules.md, agents.md.

Deliverables — create this exact layout (architecture.md's "Repository structure"):
backend/
├── app/
│   ├── main.py
│   ├── api/
│   │   ├── dependencies.py
│   │   └── v1/                 (one router module per resource: analyses.py, events.py, capabilities.py, health.py)
│   ├── core/
│   │   ├── config.py
│   │   ├── security.py
│   │   └── logging.py
│   ├── db/                     (async engine/session setup)
│   ├── models/                 (SQLAlchemy ORM models)
│   ├── schemas/                (Pydantic request/response models)
│   ├── services/
│   ├── providers/
│   ├── analysis/
│   ├── workers/
│   └── repositories/
├── migrations/                 (Alembic)
├── tests/
└── pyproject.toml
Also create `compose.yaml` at the repo root per architecture.md (services: postgres with PostGIS, redis, an S3-compatible object store such as MinIO, plus placeholder api/worker/dispatcher/scheduler service entries even if some just run `sleep infinity` for now).

1. `pyproject.toml`: pin FastAPI, Pydantic v2, SQLAlchemy (async) + asyncpg, GeoAlchemy2, Shapely, Alembic, Celery, redis-py, an S3 client (boto3 or minio), structlog (or equivalent), an OIDC-capable JWT library (e.g. python-jose or authlib), pytest, pytest-asyncio, httpx. Commit the resulting lockfile.
2. `app/core/config.py`: Pydantic Settings class loading exactly the environment contract from backendhandoverfile.md:
   APP_ENV, API_PREFIX (default /api/v1), DATABASE_URL, REDIS_URL,
   OBJECT_STORAGE_ENDPOINT, OBJECT_STORAGE_BUCKET, OBJECT_STORAGE_ACCESS_KEY, OBJECT_STORAGE_SECRET_KEY,
   AUTH_MODE, OIDC_ISSUER, OIDC_AUDIENCE,
   GEE_PROJECT_ID, GOOGLE_APPLICATION_CREDENTIALS,
   GFW_ENABLED, GFW_API_KEY,
   OVERPASS_ENDPOINT,
   MAX_AOI_KM2 (default 2500), MAX_AOI_VERTICES (default 5000), MAX_ACTIVE_JOBS_PER_WORKSPACE (default 2),
   ALLOWED_ORIGINS, LOG_LEVEL.
   Startup MUST raise/exit if AUTH_MODE=development while APP_ENV=production (backendhandoverfile.md: "Development authentication must be rejected at startup in production mode").
3. `app/core/logging.py`: structured (JSON) logging. Every log line must support request_id / analysis_id / attempt_id correlation fields. Implement redaction so tokens/secrets and raw AOI coordinates never appear in routine logs (rules.md: "Redact tokens and sensitive AOI coordinates from routine logs").
4. `app/models/`: SQLAlchemy models for every entity in systemdesign.md's data model table: Workspace, Membership, AOI, Analysis, AnalysisLayer, JobAttempt, ChangeEvent, Artifact, Verification, AuditLog, Outbox. Use GeoAlchemy2 geometry columns for AOI/ChangeEvent geometries (SRID 4326). Analysis inputs are immutable — do not model in-place editing of AOI/thresholds on an existing Analysis row.
5. `migrations/`: initialize Alembic, generate the baseline migration for all models above. Include (from dsabackendoptimisation.md) at minimum:
   CREATE INDEX analyses_workspace_created_idx ON analyses (workspace_id, created_at DESC, id DESC);
   CREATE INDEX events_geom_gist_idx ON change_events USING GIST (geom);
   CREATE INDEX events_workspace_analysis_idx ON change_events (workspace_id, analysis_id);
   CREATE INDEX events_priority_idx ON change_events (workspace_id, analysis_id, priority_score DESC, id);
   Enable the PostGIS extension in the migration.
6. `app/core/security.py`: an auth dependency supporting two modes:
   - AUTH_MODE=development: issues a trusted local principal (for local dev only), never usable when APP_ENV=production.
   - AUTH_MODE=oidc (or similar): validates a bearer token against OIDC_ISSUER/OIDC_AUDIENCE.
   Implement the role model: Viewer (read analyses/events), Analyst (create analyses, submit verification updates), Admin (manage membership/config) — from systemdesign.md's security model table.
   Workspace scoping MUST come from trusted token claims plus a Membership lookup — never trust a client-supplied workspace header alone (rules.md).
7. `app/api/v1/health.py`: GET /health/live (process liveness, no dependencies) and GET /health/ready (checks DB and Redis connectivity, 200 or 503).
8. Route stubs + Pydantic schemas for the full spec.md endpoint table, even if handlers just return 501 for now, so the contract is reviewable early:
   POST /api/v1/analyses, GET /api/v1/analyses/{id}, POST /api/v1/analyses/{id}/cancel,
   GET /api/v1/analyses/{id}/results, GET /api/v1/analyses/{id}/events, GET /api/v1/events/{id},
   PATCH /api/v1/events/{id}/verification, GET /api/v1/analyses/{id}/layers/{layerid}/access,
   GET /api/v1/capabilities.
   Model the error envelope from spec.md exactly: {"error": {"code", "message", "details", "request_id", "retryable"}}.
9. CI (GitHub Actions or an equivalent local script): formatting (ruff/black), type checking (mypy or pyright), pytest.

Constraints (rules.md):
- Routes must stay thin — only HTTP concerns; delegate to services/repositories.
- No route may directly construct a complex satellite-processing expression.
- Use /api/v1 for all public application routes.
- UTC timestamps, ISO-formatted dates, explicit units in field names, null for unknown values.
- Do not commit secrets or large binary artifacts.
- Parameterize all database queries (use the ORM/async driver correctly — no string-built SQL).

Acceptance criteria:
- `docker compose up` brings up healthy postgres, redis, object-storage, and api services.
- GET /health/live and GET /health/ready return correctly in both healthy and DB-down states.
- A test creates a Workspace + Membership, authenticates as that member (dev auth mode), and successfully persists an Analysis row scoped to that workspace via a (stubbed-acceptable) service call — proving the request→persistence path works end-to-end.
- `alembic upgrade head` runs cleanly against a fresh database.
- Cross-workspace access is denied in at least one negative test (a member of workspace A cannot read a resource scoped to workspace B).

Required tests: config validation (dev-auth-in-prod rejection), migration apply/rollback, health endpoint states, auth dependency (valid/invalid/expired token, dev mode), one persistence round-trip test, one workspace-isolation negative test.

Expected handover: exact dependency versions pinned, confirmation that migrations run clean, which auth mode was exercised, and any assumptions made about the OIDC provider that need review.
```

Previous: [Phase 0 — Provider verification track](phase-0-provider-verification.md)
Next: [Phase 2 — Asynchronous execution core](phase-2-async-execution-core.md)
