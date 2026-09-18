Architecture decision

Use a modular monolith with a separate worker process.

FastAPI serves authenticated metadata and workflow APIs. Workers perform geospatial analysis. React presents maps and results. PostgreSQL stores durable application state, while object storage holds large spatial artifacts.

Do not start with microservices.

Technology choices

| Component | Choice | Responsibility |
|---|---|---|
| Frontend | React + TypeScript + Vite | Dashboard and user interaction |
| Map | Leaflet with React integration | AOIs, raster tiles, event selection |
| Server state | TanStack Query | Fetching, polling, caching |
| Backend | FastAPI + Pydantic | HTTP contract and validation |
| Persistence | PostgreSQL + PostGIS | Jobs, events, geometry, audit |
| ORM/migrations | SQLAlchemy + Alembic | Database access and schema changes |
| Worker | Celery | Long-running analysis execution |
| Queue/cache | Redis | Dispatch, bounded cache, rate counters |
| Artifacts | S3-compatible storage | Raster outputs, exports, manifests |
| Tests | pytest, Vitest, Playwright | Backend, frontend, end-to-end checks |

Use supported versions selected during implementation and commit lockfiles. Do not assume unverified version compatibility.

Component diagram

``mermaid
flowchart TD
    U[Conservation user] --> R[React dashboard]
    R --> A[FastAPI]
    A --> D[(PostgreSQL and PostGIS)]
    A --> O[(Transactional outbox)]
    O --> P[Outbox publisher]
    P --> Q[(Redis queue)]
    Q --> W[Analysis worker]
    W --> E[Earth observation adapters]
    W --> C[Context data adapters]
    W --> D
    W --> S[(Object storage)]
    R --> T[Authorized tile access]
    T --> S
    A --> M[Logs and metrics]
    W --> M
`

Processing engine decision

Use Earth Engine as the primary V1 spatial processing engine, subject to verified project access and quota suitability.

Keep provider interfaces separate so Copernicus processing can be introduced later without changing the public API.

Initial responsibilities:

• Vegetation: Cloud-masked Sentinel-2 analysis.
• Water: Matched-period water masks using an approved method.
• Built-up: Dynamic World class-probability composites and candidate transitions.
• Historical water context: JRC historical products with their actual coverage.
• Forest alerts: Optional verified GFW integration.
• Human context: Cached Overpass-derived features.
• Boundaries: Approved, attributed boundary files or verified provider access.

Do not implement two equivalent vegetation pipelines in V1.

Repository structure

`text
wildlife-monitor/
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── api/
│   │   │   ├── dependencies.py
│   │   │   └── v1/
│   │   ├── core/
│   │   │   ├── config.py
│   │   │   ├── security.py
│   │   │   └── logging.py
│   │   ├── db/
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── services/
│   │   ├── providers/
│   │   ├── analysis/
│   │   ├── workers/
│   │   └── repositories/
│   ├── migrations/
│   ├── tests/
│   └── pyproject.toml
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   ├── components/
│   │   ├── features/
│   │   ├── hooks/
│   │   ├── pages/
│   │   ├── state/
│   │   └── types/
│   └── package.json
├── contracts/
│   └── openapi.json
├── fixtures/
├── infra/
├── docs/
└── compose.yaml
`

Dependency boundaries

Routes validate HTTP concerns and call services.

Services coordinate authorization, persistence, and domain operations.

Analysis modules implement scientific methods without HTTP dependencies.

Provider adapters translate external formats into internal contracts.

Repositories encapsulate database access.

Workers execute persisted jobs and update durable state.

No route may directly construct a complex satellite-processing expression.

Artifact strategy

Store persistent analysis outputs when provider terms permit:

• COGs: Numeric change rasters and masks.
• GeoJSON: Small event exports.
• Manifests: Provenance, checksums, and layer metadata.
• Display tiles: Generated from stored artifacts or obtained through approved provider access.

Provider-issued tile URLs may be temporary. They are not durable analysis identifiers.

Deployment modes

Development: Docker Compose runs API, worker, database, Redis, and local object storage.

Staging: Production-like authentication and real provider credentials with restricted quotas.

Production: Managed backups, TLS, object-storage lifecycle rules, monitored workers, and restricted network access.
