# Provider Verification Record: Google Earth Engine (GEE)

> **Status:** PARTIALLY VERIFIED — authentication and catalog access confirmed with real credentials; AOI/date-scoped extraction, quotas, and the other two candidate datasets are still unverified.
>
> **Note:** Per `workflow.md` ("Run a real AOI test. Do not treat registration as proof of processing access") and `rules.md` ("Never fabricate observations"), this record only claims what was actually executed below — it does not claim full production readiness for the vegetation/water pipelines. The probe was deliberately kept metadata-only (no `reduceRegion`, no pixel computation) to avoid consuming quota on a free-trial GCP project, per explicit operator instruction.

---

| Field | Required content | Record Details |
|---|---|---|
| **Provider** | Service and account/project | Google Earth Engine — GCP Project `macro-shore-471006-c3`, Service Account `codeniti-gee-worker@macro-shore-471006-c3.iam.gserviceaccount.com` |
| **Verification date** | Actual execution date | 2026-09-18 — executed independently twice: once by the project operator, once by this agent via `backend/credentials/gee_probe.py` (gitignored, not committed) |
| **Dataset** | Exact identifier and bands | **Confirmed accessible:** `COPERNICUS/S2_SR_HARMONIZED` — `ImageCollection(...).limit(1).first().bandNames().getInfo()` returned real band names (`B1`, `B2`, `B3`, `B4`, ...). The specific `B8`/`SCL` bands this project's vegetation method needs, and the other two candidate datasets (`GOOGLE/DYNAMICWORLD/V1`, `JRC/GSW1_4/GlobalSurfaceWater`), were **not individually probed** — not confirmed yet. |
| **Coverage** | Tested AOI and periods | **Not yet tested.** The probe queried the global collection with no AOI or date filter (deliberately, to stay metadata-only). The candidate test AOI (Pench buffer, ~10 km², baseline 2024-01/comparison 2025-01) from the original plan has not been run against a real `reduceRegion`/`getRegion` call. |
| **Credentials** | Required mechanism | Service Account Private Key JSON (`GOOGLE_APPLICATION_CREDENTIALS=/app/credentials/macro-shore-471006-c3-822bdbdaa0b9.json`), scoped to `https://www.googleapis.com/auth/earthengine`. Key file confirmed present, readable, and gitignored (not committed) — `ee.Initialize(credentials=..., project=...)` succeeded. |
| **Quotas** | Applicable account limits | **Not yet checked.** Free-trial GCP project — EECU-seconds/min, concurrent query limits, and daily compute quota have not been queried or exercised. Treat as unknown/limited until checked; do not run heavy `reduceRegion`/export calls without checking first. |
| **Output** | Actual response format | Only `.bandNames().getInfo()` (a plain JSON list of strings) has been exercised. `reduceRegion` JSON shape, CRS handling, and export raster (GeoTIFF/COG) format are **not yet confirmed**. |
| **License** | Attribution and retention conditions | Copernicus Sentinel data (terms of use: credit European Union/ESA/Copernicus); Dynamic World (CC-BY 4.0, not yet re-confirmed against a real pull); Google Earth Engine terms of service. Artifact caching permitted for analytical outputs. |
| **Result** | Working, blocked, or unsupported | **Working (authentication + catalog access only).** Real service-account authentication against a real GCP project succeeds, and real Sentinel-2 catalog metadata was fetched. This unblocks building a real `gee_vegetation_provider.py` adapter behind the existing `ChangeProvider` Protocol, but AOI-scoped extraction, quotas, and the water/built-up candidate datasets still need their own verification passes before any of it is called "production ready." |

---

### Action Items for Completion

1. ~~Follow `docs/gee-setup-guide.md` to set up GCP project and Service Account.~~ **Done.**
2. ~~Run the capability probe (metadata-only, no quota consumed).~~ **Done — passed 2026-09-18.**
3. Before running anything heavier: check the free-trial project's actual quota/billing limits in the GCP console, since none of this session's checks queried quota.
4. Run one real AOI/date-scoped `reduceRegion` (or `getRegion`) call against the Pench buffer test AOI — this is the first call that will consume real EECU, so run it deliberately, once, and record the actual response shape here.
5. Repeat a minimal metadata-only probe against `GOOGLE/DYNAMICWORLD/V1` and `JRC/GSW1_4/GlobalSurfaceWater` (water/built-up methods) before building their real adapters.
6. Only after steps 3–5: update `Result` to reflect full pipeline readiness, and begin swapping `FixtureVegetationProvider` for a real `GEEVegetationProvider` behind the same `ChangeProvider` Protocol.
