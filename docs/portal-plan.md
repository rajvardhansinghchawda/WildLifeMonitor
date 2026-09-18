# CodeNiti — Portal, Page & Feature Plan

This document maps the Wildlife Habitat Monitoring System's frontend to the backend that actually exists today. It splits the product into three portals by access level, lists each portal's pages and features, and marks — page by page — whether the backend already supports it or would need new API work first.

Wireframes for every page below: **[CodeNiti Portal Wireframes](https://claude.ai/artifact/BeeZefH3xZCvB2zutvKm6M)** (private — share it from the page's Share menu if others need to open it).

## Legend

| Marker | Meaning |
|---|---|
| ✅ Built | Endpoint exists, is implemented, and passed live end-to-end testing this session |
| 🚧 Needs new API | Feature is implied by the product plan (spec.md / systemdesign.md / superpower.md) but has no backend endpoint yet |

---

## 1. Analyst / Investigator Portal
**Roles:** Viewer, Analyst · **Source:** `frontend.md`'s dashboard spec, backed by the async analysis pipeline

The core operational app. Every page here is backed by a real, tested endpoint.

### New Analysis
- Draw or select a preset AOI, with live area-limit feedback (max 2,500 km², max 5,000 vertices)
- Baseline and comparison date windows, with a seasonal-mismatch warning
- Layer selection sourced from live capabilities (vegetation / water / built-up / forest alerts)
- Idempotent submission — resubmitting the same request never creates a duplicate job
- ✅ `GET /api/v1/capabilities`, `POST /api/v1/analyses` (202 Accepted, Idempotency-Key)

### Analysis Workspace
- Live status polling (queued → running → succeeded/partial/failed), DB-authoritative — never inferred from elapsed time
- Metric cards: vegetation-loss area, water gain/loss, built-up probability change, valid-pixel coverage, events pending
- Per-layer state shown independently (one layer failing never hides another's results)
- Map overlays with legend, authorized short-lived tile access
- Event list, keyset-paginated and sorted by Investigation Priority
- ✅ `GET /api/v1/analyses/{id}`, `GET .../results`, `GET .../events`, `GET .../layers/{id}/access`

### Event Detail Drawer
- Full evidence: geometry, area, magnitude metrics, observation quality, method/dataset version
- Nearby mapped context — nearest known road/settlement distance, explicitly labeled "nearest known feature in cached source," never implied as proof nothing closer exists
- Investigation Priority score with its three components (magnitude/sensitivity/context) shown individually; score is `null` rather than defaulted to 0 when a required component is missing
- Full verification history
- Before/after imagery comparison with source period labels
- ✅ `GET /api/v1/events/{id}`

### Verification Update
- Status transition across the five allowed states (pending → investigating → verified/dismissed/inconclusive)
- Notes mandatory for dismissed and inconclusive, enforced server-side
- Optimistic concurrency — a stale `expected_record_version` is rejected with a clear conflict, never silently overwritten
- Explicit disclaimer: a verified event confirms the recorded change, not cause, illegality, or species impact
- ✅ `PATCH /api/v1/events/{id}/verification`

---

## 2. Admin Portal
**Role:** Admin · **Source:** `systemdesign.md`'s security model ("Admin: manage workspace membership and configuration")

The data model for this portal already exists (`Workspace.settings`, `Membership`, role-based access), but most of it isn't exposed through the API yet — only capabilities is real today.

### Workspace Settings
- Conservation zones — directly feeds the priority score's sensitivity component (weight 0.30)
- Pressure indicators — feeds the context component (weight 0.20) as a fallback when live per-event proximity data isn't used
- Read-only display of configured limits (max AOI area, vertices, observation window, active jobs, page sizes)
- ✅ Limits: `GET /api/v1/capabilities`
- 🚧 Needs new API: reading/writing `Workspace.settings` — currently a database column with no admin endpoint

### Membership Management
- Member list with role (Viewer/Analyst/Admin)
- Invite / role-change / remove flows
- 🚧 Needs new API: the `Membership` model and auth-time lookup exist and are enforced on every request, but there's no CRUD endpoint to manage members yet

### Capabilities & System Status
- Enabled change methods and their versions
- Forest-alerts (GFW) explicit disabled state with reason
- Phase 0 provider-verification status (Earth Engine: pending; GFW: pending)
- Live process health: API, worker, dispatcher, scheduler
- ✅ `GET /api/v1/capabilities`, `GET /health/ready`, `/metrics` — all verified against the real running system this session

---

## 3. Public / Demonstration Portal
**Access:** unauthenticated · **Source:** `spec.md` ("public demonstrations use curated results and restricted analysis access"), `rules.md` ("avoid exposing sensitive wildlife locations publicly")

Required by the product spec, but every endpoint built so far requires workspace authentication and membership — there is currently no public-read path at all.

### Public Landing
- Prominent "cached demonstration" labeling — never presented as live analysis
- One curated AOI's overlay with processing metadata (source periods, method version, processing date)
- 🚧 Needs new API: no public/curated read path exists yet

### Public Event Gallery
- Read-only event cards, grouped by curated analysis
- No verification controls
- Generalized (non-precise) geometry — exact coordinates and polygons withheld from public view
- 🚧 Needs new API: same gap as above, plus a location-generalization step that doesn't exist in any built endpoint

---

## Summary

The **Analyst/Investigator Portal is ready to build a real frontend against today** — every endpoint it needs has been implemented and verified live (submit → queue → process → results → verify, end to end, 81/81 backend tests passing). The **Admin** and **Public** portals are legitimate product requirements with real data models already in place, but need backend API work before a frontend can do anything beyond a static mockup.
