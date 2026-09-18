# Project Memory

## Project Overview

The Wildlife Habitat Monitoring System is a geospatial decision-support dashboard designed for comparing environmental conditions and managing field investigations of detected environmental changes (vegetation, water bodies, and built-up areas). It integrates satellite observation providers, automated change-detection analytics, verified forest alerts, and analyst verification workflows.

## Current Architecture

Based on specifications (`spec.md`, `architecture.md`, `systemdesign.md`):
- **Core Product**: Asynchronous geospatial processing API and interactive dashboard.
- **Frontend**: Decision-support dashboard supporting AOI drawing/selection, dual observation window comparisons, raster/vector change layer visualization, and event review drawer. Built with Next.js 16, Tailwind CSS, Leaflet, and Recharts.
- **Backend**: Asynchronous API (`/api/v1/analyses`, `/api/v1/events`, `/api/v1/public`, `/api/v1/admin`) backed by worker job execution, transactional outbox pattern, and tile/raster publication pipelines.
- **Storage & Infrastructure**: PostgreSQL with PostGIS, object storage for raster artifacts, and Redis/queue workers for background processing.

## Important Decisions

- **Asynchronous Execution**: Long-running raster and geospatial analysis jobs are decoupled via job queues with polling/status endpoints (`/api/v1/analyses/{id}`).
- **Strict AOI & Window Boundaries**: Maximum AOI area 2,500 km², max window 180 days, with rejection of overlapping baseline and comparison windows in V1.
- **Verifiable Provenance**: Change events require audit trails, confidence scoring, and reviewer verification states.
- **Git Branch Strategy**: Active branch is `kanhaiya`. Per user instruction, all current and future commits must be pushed exclusively to the `kanhaiya` branch.

## Current State

- Synced and merged the full backend and frontend codebase from `origin/backend` into branch `kanhaiya`.
- Backend FastAPI implementation complete with API v1 routes (analyses, events, public, admin, health), GEE integration, and test suite.
- Frontend Next.js implementation complete with Dashboard, Explorer, Hotspots, Reports, Admin, and Public portals.
- Working tree cleanly resolved and synchronized to `kanhaiya` branch.

---

## Phase Execution Log (from backend development)

### [2026-09-18 23:15] Phase 8 — Frontend Investigator Portal & Backend Integration
- Agent: Fullstack Lead & Frontend Specialist
- Changed: frontend/ (Next.js dashboard, maps, components, API client), backend/app/ (auth, portal schemas/models, GEE provider, seed scripts), migrations/
- Decision: Integrated Next.js 16 frontend with interactive dashboard, hotspot analysis, time-series visualizations, and connected to local/GEE backend pipelines.
- Gotcha: Keep .env.local and credentials gitignored; port 3000 running Next.js turbopack.
- Next: End-to-end verification of frontend portal with live backend endpoints.

### [2026-09-18 23:40] Phase 9 — Public / Demo (Curated, Read-Only) Portal Implementation
- Agent: Fullstack Lead & GIS Systems Engineer
- Changed: backend/app/api/v1/public.py, backend/app/scripts/seed_demo_analyses.py, backend/tests/test_public_api.py, frontend/src/lib/public-api.ts, frontend/src/components/public/PublicMap.tsx, frontend/src/app/page.tsx
- Decision: Built unauthenticated Public Demonstration Portal with zero mock fallbacks; seeded 3 curated real reserve analyses (Pench, Tadoba, Sundarbans) with real OSM boundaries and generalized coordinates for anti-poaching security.
- Gotcha: Leaflet must be loaded dynamically in Next.js ('use client' + ssr: false); AnalysisLayer table required warnings/provenance JSONB alignment in Postgres.

### [2026-09-19 00:08] Phase 10 — Admin Portal Implementation & Data Visualizations
- Agent: Fullstack Lead & Systems Security Engineer
- Changed: backend/app/api/v1/admin.py, backend/app/scripts/seed_admin_data.py, backend/tests/test_admin_api.py, frontend/src/lib/admin-api.ts, frontend/src/app/admin/page.tsx, frontend/src/app/admin/members/page.tsx, frontend/src/app/settings/page.tsx, frontend/src/components/layout/Sidebar.tsx
- Decision: Implemented 3 cohesive Admin pages (/admin, /admin/members, /settings) with rich Recharts data visualizations (AreaChart, PieChart, BarChart), live RBAC role delegation, scientific priority parameter tuning ($W_m + W_s + W_c = 1.00$), and immutable audit logs. Investigator portal pages were left completely untouched.
- Gotcha: JSX curly braces in raw text must be escaped (avoid LaTeX curly braces in unquoted JSX); FastAPI requires python-multipart for OAuth2 form parsing; dev credentials supported in non-production local environments.
- Next: Final end-to-end integration review, documentation update, and presentation readiness.

---

## Interaction History

### 2026-09-19 00:25

**User Request**
> Take the pull from the backend branch, update local codebase from that, and push to kanhaiya branch.

**Work Done**
- Fetched `origin/backend` and merged into `kanhaiya`.
- Resolved merge conflicts across `.gitignore`, `frontend/package-lock.json`, and `memory.md`.
- Staged all changes and committed the merge.
- Pushed the updated `kanhaiya` branch to `origin/kanhaiya`.

### 2026-09-19 00:05

**User Request**
> Inquired about the number of pages in the system and requested links for each page.

**Exploration**
- Inspected repository documentation (`frontend.md`, `spec.md`, `architecture.md`, `systemdesign.md`, `tasks.md`, `docs/phases/`).
- Checked `frontend/src/pages` directory and frontend scaffolding state.

**Work Done**
- Analyzed and documented the page/view structure across the frontend specification and repository files.
- Provided direct clickable links to all relevant specifications, layout sections, and documentation files.

### 2026-09-18 23:51

**User Request**
> Reconfirmed that from now on all future code and commits must be pushed exclusively to the `kanhaiya` branch.

**Work Done**
- Confirmed branch configuration and reinforced repository policy in `memory.md`.
- Synchronized documentation to branch `kanhaiya`.

### 2026-09-18 23:42

**User Request**
> Create new branch `kanhaiya`, push everything to it, and ensure all future commits are pushed only to this branch.

**Work Done**
- Created `.gitignore` excluding `node_modules/`, `dist/`, `.env*`, and build/editor artifacts.
- Created and checked out new branch `kanhaiya`.
- Staged `.gitignore`, `frontend/package-lock.json`, and updated `memory.md`.
- Set upstream to `origin/kanhaiya` and pushed branch.
- Documented mandatory rule that all future commits must target branch `kanhaiya`.

### 2026-09-18 23:18

**User Request**
> Clone repository https://github.com/rajvardhansinghchawda/WildLifeMonitor.git into the workspace.

**Work Done**
- Cloned the repository `https://github.com/rajvardhansinghchawda/WildLifeMonitor.git` into `d:\codeniti new`.
- Initialized `memory.md` according to the Antigravity workflow rules.
