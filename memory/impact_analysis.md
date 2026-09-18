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
