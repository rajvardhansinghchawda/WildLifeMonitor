# CodeNiti Backend — Architecture Decisions Log (ADR)

This document records the foundational architecture decisions, rationale, trade-offs, and invariants governing the Wildlife Habitat Monitoring System backend.

---

## ADR-001: Modular Monolith over Microservices
- **Status:** Accepted
- **Context:** `architecture.md` specifies building a single modular backend with separated worker processes rather than multiple distributed microservices.
- **Decision:** Use FastAPI for API routing and authorization, PostgreSQL + PostGIS for durable relational state, Redis for Celery queue and caching, and MinIO for S3-compatible artifact storage.
- **Consequences:** Low operational complexity, shared data models without RPC overhead, single database transaction boundary for request-outbox persistence.

---

## ADR-002: Real PostGIS Environment for Tests (No SQLite)
- **Status:** Accepted
- **Context:** SQLite does not natively support PostGIS DDL (`CREATE EXTENSION postgis;`, `USING GIST (geom)`) or PostgreSQL JSONB operators.
- **Decision:** Execute all automated test suites against real PostgreSQL 16 + PostGIS instances (via Docker Compose / test database container).
- **Consequences:** Tests validate true production behavior; prevents silent migration failures; requires a running database service during test execution.

---

## ADR-003: Session Isolation with NullPool in Asyncpg Tests
- **Status:** Accepted
- **Context:** Asyncpg connection pools are bound to the asyncio event loop in which they were created. Pytest-asyncio creates a separate event loop per test function, leading to `Future attached to a different loop` errors if connection pools are shared.
- **Decision:** Configure test engine with `poolclass=NullPool` and separate sessions per request/test.
- **Consequences:** Zero connection collisions across asynchronous test loops; clean teardown and rollback for every test.

---

## ADR-004: Workspace Scoping Anchored on Authenticated Identity Claims
- **Status:** Accepted
- **Context:** Multi-tenant systems are vulnerable to IDOR / cross-tenant leaks if client-supplied headers (e.g., `X-Workspace-ID`) are trusted without server-side validation.
- **Decision:** Workspace access is derived by validating the token principal against the `memberships` table in PostgreSQL. Client headers are used solely to select between multiple verified memberships for the same user.
- **Consequences:** Strict workspace isolation; cross-workspace access attempts are rejected with 403 or 404.

---

## ADR-005: Transactional Outbox with Nullable `published_at` Timestamp
- **Status:** Accepted
- **Context:** System design requires reliable dispatch from FastAPI to Celery worker queue without distributed transactions (2PC).
- **Decision:** Model `outbox` with `published_at` (`TIMESTAMP WITH TIME ZONE`, nullable) and composite index `(published_at, created_at)`.
- **Consequences:** Transactional consistency between Analysis persistence and job dispatch; fast index scans (`WHERE published_at IS NULL`); audit trail of dispatch latency.

---

## ADR-006: Distributed Leases with Active Heartbeat Renewal and Fencing Tokens
- **Status:** Accepted
- **Context:** Long-running geospatial analysis jobs executed by background workers need protection against split-brain finalization if a worker process crashes, hangs, or encounters network partitions.
- **Decision:** Workers acquire a lease on an analysis by creating an active `JobAttempt` with a short expiration (`lease_expires_at = now() + 30s`) and a monotonically increasing `fencing_token`. Active workers periodically issue heartbeats that actively push `lease_expires_at` forward in PostgreSQL. Before writing results, the worker validates its fencing token against the database. If reconciliation expired or superseded the attempt, finalization is rejected with `FencingTokenExpiredError`.
- **Consequences:** Eliminates zombie worker race conditions; prevents duplicate layer publication; ensures healthy jobs running longer than 30 seconds are not prematurely reaped.

---

## ADR-007: Cooperative Cancellation and Idempotent Request Replay
- **Status:** Accepted
- **Context:** Users require the ability to cancel queued or in-flight analyses, and network retries must not create duplicate jobs.
- **Decision:** Implement cooperative cancellation where `POST /api/v1/analyses/{id}/cancel` sets `cancel_requested = True` in PostgreSQL and returns 202 Accepted (or 409 if terminal). Workers inspect this flag before and between layer processing steps to halt cleanly. For idempotency, the API caches `Idempotency-Key` along with the request payload snapshot; matching requests replay the original 202 response, while divergent payloads with the same key return 409 Conflict (`IDEMPOTENCYCONFLICT`).
- **Consequences:** Responsive cancellation without abrupt thread termination; zero duplicate job creation from client retries; robust idempotency semantics.

---

## ADR-008: Zero Data Fabrication in Spectral Indices Masking
- **Status:** Accepted
- **Context:** `rules.md` mandates zero data fabrication in scientific calculations. In optical satellite observations (e.g. Sentinel-2), pixels where $(B4 + B8) == 0$ or $(B4 + B8) < 1e-4$ are unobserved, corrupt, or invalid. Setting NDVI to 0.0 falsely implies bare soil or open water when no observation exists.
- **Decision:** Explicitly mask zero-denominator pixels out of the valid pixel support array (`valid_mask`). Never smooth, interpolate, or set them to 0.0. Exclude invalid pixels entirely from composite reductions (`np.nanmedian`) and layer mean calculations.
- **Consequences:** Scientifically sound metrics; zero artificial vegetation change reports; transparent valid pixel fraction reporting.

---

## ADR-009: Storage-First Checksummed Artifact Registration
- **Status:** Accepted
- **Context:** `systemdesign.md` requires that artifact metadata in the database reflect only durable, accessible objects in object storage. Writing database records before upload completion risks dangling references if network or write failures occur.
- **Decision:** In `ArtifactService`, upload binary payloads to MinIO/S3 and verify SHA256 integrity and byte length before executing any database `INSERT` into the `artifacts` table. If storage write fails or checksum mismatches, abort immediately with `ArtifactPublicationError` without creating a database record.
- **Consequences:** Perfect consistency between object storage and relational database metadata; zero orphaned or corrupt artifact rows.

