# Project Memory Log

Persistent context and execution log across sessions per memory protocol.

---

## [2026-09-18 23:15] Phase 8 — Frontend Investigator Portal & Backend Integration
- Agent: Fullstack Lead & Frontend Specialist
- Changed: frontend/ (Next.js dashboard, maps, components, API client), backend/app/ (auth, portal schemas/models, GEE provider, seed scripts), migrations/
- Decision: Integrated Next.js 16 frontend with interactive dashboard, hotspot analysis, time-series visualizations, and connected to local/GEE backend pipelines.
- Gotcha: Keep .env.local and credentials gitignored; port 3000 running Next.js turbopack.
- Next: End-to-end verification of frontend portal with live backend endpoints.

## [2026-09-18 23:40] Phase 9 — Public / Demo (Curated, Read-Only) Portal Implementation
- Agent: Fullstack Lead & GIS Systems Engineer
- Changed: backend/app/api/v1/public.py, backend/app/scripts/seed_demo_analyses.py, backend/tests/test_public_api.py, frontend/src/lib/public-api.ts, frontend/src/components/public/PublicMap.tsx, frontend/src/app/page.tsx
- Decision: Built unauthenticated Public Demonstration Portal with zero mock fallbacks; seeded 3 curated real reserve analyses (Pench, Tadoba, Sundarbans) with real OSM boundaries and generalized coordinates for anti-poaching security.
- Gotcha: Leaflet must be loaded dynamically in Next.js ('use client' + ssr: false); AnalysisLayer table required warnings/provenance JSONB alignment in Postgres.
## [2026-09-19 00:08] Phase 10 — Admin Portal Implementation & Data Visualizations
- Agent: Fullstack Lead & Systems Security Engineer
- Changed: backend/app/api/v1/admin.py, backend/app/scripts/seed_admin_data.py, backend/tests/test_admin_api.py, frontend/src/lib/admin-api.ts, frontend/src/app/admin/page.tsx, frontend/src/app/admin/members/page.tsx, frontend/src/app/settings/page.tsx, frontend/src/components/layout/Sidebar.tsx
- Decision: Implemented 3 cohesive Admin pages (/admin, /admin/members, /settings) with rich Recharts data visualizations (AreaChart, PieChart, BarChart), live RBAC role delegation, scientific priority parameter tuning ($W_m + W_s + W_c = 1.00$), and immutable audit logs. Investigator portal pages were left completely untouched.
- Gotcha: JSX curly braces in raw text must be escaped (avoid LaTeX curly braces in unquoted JSX); FastAPI requires python-multipart for OAuth2 form parsing; dev credentials supported in non-production local environments.
- Next: Final end-to-end integration review, documentation update, and presentation readiness.
