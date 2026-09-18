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
- **Git Branch Strategy**: Active branch is `kanhaiya`. Per user instruction, all current and future commits must be pushed exclusively to the `kanhaiya` branch.

## Current State

- Cloned repository from `https://github.com/rajvardhansinghchawda/WildLifeMonitor.git`.
- Created and switched to branch `kanhaiya`.
- Added root `.gitignore` to prevent committing dependencies (`node_modules/`), build outputs (`dist/`), and logs.
- Initial frontend scaffolding started (`frontend/package-lock.json`).

## Known Issues

- None currently identified.

## Pending Work

- Foundation backlog tasks (T01 - T08): environment setup, database migrations, auth/roles, OpenAPI specification, provider verification.
- Analysis pipeline and worker implementation (T09 - T19).
- Frontend dashboard construction (T20 - T28).
- Reliability, rate-limiting, and caching (T29 - T36).

## Interaction History

### 2026-09-19 00:05

**User Request**
> Inquired about the number of pages in the system and requested links for each page.

**Exploration**
- Inspected repository documentation (`frontend.md`, `spec.md`, `architecture.md`, `systemdesign.md`, `tasks.md`, `docs/phases/`).
- Checked `frontend/src/pages` directory and frontend scaffolding state.
- Discovered that the frontend is specified as a single-page decision-support dashboard with dynamic views/drawers rather than multiple disjoint web pages, and that `frontend/src/pages/` currently contains no committed component files yet.
- Identified documentation pages in `docs/` and root specification markdown documents.

**Work Done**
- Analyzed and documented the page/view structure across the frontend specification and repository files.
- Provided direct clickable links to all relevant specifications, layout sections, and documentation files.

**Files Changed**
- `memory.md`
  - Added interaction log documenting the page count inquiry and exploration results.

**Verification**
- Verified file system status and directory contents via `git status` and `Get-ChildItem`.

**Response**
- Summarized the page and view architecture (Single Page Application dashboard with main workspace, map/metric views, event drawer, and comparison slider) and provided clickable links to the frontend specifications and documentation pages.

**Git**
- Branch: kanhaiya
- Commit: pending
- Push: pending
- Status: clean

**Notes**
- Next step for frontend is building out the dashboard shell and page components (Task T20).

### 2026-09-18 23:51

**User Request**
> Reconfirmed that from now on all future code and commits must be pushed exclusively to the `kanhaiya` branch.

**Exploration**
- Verified current active branch and upstream: `kanhaiya` tracking `origin/kanhaiya`.
- Checked working tree and disk status: clean working tree.

**Work Done**
- Confirmed branch configuration and reinforced repository policy in `memory.md`.
- Synchronized documentation to branch `kanhaiya`.

**Files Changed**
- `memory.md`
  - Added interaction log documenting user confirmation of the `kanhaiya` branch policy.

**Verification**
- `git branch -vv`: confirmed tracking `origin/kanhaiya`.
- `git status`: verified clean status.

**Response**
- Acknowledged and confirmed that all code, commits, and pushes will strictly target `kanhaiya`.

**Git**
- Branch: kanhaiya
- Commit: e9d66f1
- Push: successful
- Remote: origin/kanhaiya

**Notes**
- All subsequent tasks and code will be committed and pushed exclusively to `kanhaiya`.

### 2026-09-18 23:42

**User Request**
> Create new branch `kanhaiya`, push everything to it, and ensure all future commits are pushed only to this branch.

**Exploration**
- Inspected git branches and found existing remotes `origin/main` and `origin/backend`.
- Detected newly created `frontend/` directory with `package-lock.json`, `dist/`, and `node_modules/`.
- Noticed missing `.gitignore`, which would cause `dist/` and `node_modules/` to be accidentally tracked.

**Work Done**
- Created `.gitignore` excluding `node_modules/`, `dist/`, `.env*`, and build/editor artifacts.
- Created and checked out new branch `kanhaiya`.
- Staged `.gitignore`, `frontend/package-lock.json`, and updated `memory.md`.
- Set upstream to `origin/kanhaiya` and pushed branch.
- Documented mandatory rule that all future commits must target branch `kanhaiya`.

**Files Changed**
- `.gitignore`
  - Created root gitignore to exclude `node_modules`, `dist`, logs, and temporary files.
- `frontend/package-lock.json`
  - Tracked frontend package lockfile.
- `memory.md`
  - Updated Important Decisions with git branch convention, Current State, and Interaction History.

**Verification**
- `git status`: confirmed clean staging of `.gitignore`, `package-lock.json`, and `memory.md` without `node_modules/` or `dist/`.
- `git branch`: verified current active branch is `kanhaiya`.

**Response**
- Created branch `kanhaiya`, added `.gitignore`, staged changes, and pushed to `origin/kanhaiya` with upstream tracking configured.

**Git**
- Branch: kanhaiya
- Commit: 25b22d3
- Push: successful
- Remote: origin/kanhaiya

**Notes**
- Future commits must always target and push to `origin/kanhaiya`.

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
- Commit: d2a6fed / a960fe0
- Push: successful
- Remote: origin/main

**Notes**
- Ready to proceed with foundation tasks or next user instructions.
