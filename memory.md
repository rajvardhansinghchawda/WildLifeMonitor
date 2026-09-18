# Project Memory

## Project Overview

The Wildlife Habitat Monitoring System is a geospatial decision-support dashboard designed for comparing environmental conditions and managing field investigations of detected environmental changes (vegetation, water bodies, and built-up areas). It integrates satellite observation providers, automated change-detection analytics, verified forest alerts, and analyst verification workflows.

## Current Architecture

Based on specifications (`spec.md`, `architecture.md`, `systemdesign.md`):
- **Core Product**: Asynchronous geospatial processing API and interactive dashboard.
- **Frontend**: Decision-support dashboard supporting AOI drawing/selection, dual observation window comparisons, raster/vector change layer visualization, and event review drawer.
- **Backend**: Asynchronous API (`/api/v1/analyses`, `/api/v1/events`) backed by worker job execution, transactional outbox pattern, and tile/raster publication pipelines.
- **Storage & Infrastructure**: PostgreSQL with PostGIS, object storage for raster artifacts, and Redis/queue workers for background processing.

## Important Decisions

- **Asynchronous Execution**: Long-running raster and geospatial analysis jobs are decoupled via job queues with polling/status endpoints (`/api/v1/analyses/{id}`).
- **Strict AOI & Window Boundaries**: Maximum AOI area 2,500 km², max window 180 days, with rejection of overlapping baseline and comparison windows in V1.
- **Verifiable Provenance**: Change events require audit trails, confidence scoring, and reviewer verification states.

## Current State

- Cloned repository from `https://github.com/rajvardhansinghchawda/WildLifeMonitor.git`.
- Repository contains initial architectural blueprints, task backlogs, system design, and API specifications.
- Project codebase implementation (backend/frontend application scaffolding) is pending.

## Known Issues

- None currently identified.

## Pending Work

- Foundation backlog tasks (T01 - T08): environment setup, database migrations, auth/roles, OpenAPI specification, provider verification.
- Analysis pipeline and worker implementation (T09 - T19).
- Frontend dashboard construction (T20 - T28).
- Reliability, rate-limiting, and caching (T29 - T36).

## Interaction History

### 2026-09-18 23:18

**User Request**
> Clone repository https://github.com/rajvardhansinghchawda/WildLifeMonitor.git into the workspace.

**Exploration**
- Checked workspace directory `d:\codeniti new` (initially empty).
- Inspected repository documentation (`spec.md`, `tasks.md`, `architecture.md`, git history) after cloning.
- Verified initial commit `bb097a3` on branch `main`.

**Work Done**
- Cloned the repository `https://github.com/rajvardhansinghchawda/WildLifeMonitor.git` into `d:\codeniti new`.
- Initialized `memory.md` according to the Antigravity workflow rules.

**Files Changed**
- `memory.md`
  - Created persistent project memory file documenting overview, architecture, current state, and interaction history.

**Verification**
- Checked git status: confirmed repo cloned on branch `main`.
- Validated directory structure and presence of specification files.

**Response**
- Cloned the repository successfully, explored project structure and requirements, and initialized `memory.md`.

**Git**
- Branch: main
- Commit: d2a6fed
- Push: successful
- Remote: origin/main

**Notes**
- Ready to proceed with foundation tasks or next user instructions.
