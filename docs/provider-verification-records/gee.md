# Provider Verification Record: Google Earth Engine (GEE)

> **Status:** PENDING — run after credentials are provisioned.
>
> **Note:** The values below reflect candidate datasets and configurations identified in `spec.md`, `systemdesign.md`, and `workflow.md`. **Do not mark this record as working until a real capability probe has been executed by a human operator using active GCP credentials as documented in `docs/gee-setup-guide.md`.** Confirm exact dataset identifiers and band names against Earth Engine's actual catalog during the live probe.

---

| Field | Required content | Record Details |
|---|---|---|
| **Provider** | Service and account/project | Google Earth Engine (GCP Project: PENDING, Service Account: PENDING) |
| **Verification date** | Actual execution date | PENDING (Unexecuted) |
| **Dataset** | Exact identifier and bands | Candidate primary datasets to verify:<br>1. `COPERNICUS/S2_SR_HARMONIZED` (Bands: `B4`, `B8`, `SCL`)<br>2. `GOOGLE/DYNAMICWORLD/V1` (Bands: `water`, `built`, `label`)<br>3. `JRC/GSW1_4/GlobalSurfaceWater` (Bands: `occurrence`, `change_norm`) |
| **Coverage** | Tested AOI and periods | Candidate test AOI: Pench buffer ~10 km² (`[[79.20, 21.60], [79.30, 21.60], [79.30, 21.70], [79.20, 21.70], [79.20, 21.60]]`). Periods: 2024-01-01 to 2024-01-31 (baseline), 2025-01-01 to 2025-01-31 (comparison). PENDING probe run. |
| **Credentials** | Required mechanism | Service Account Private Key JSON (`GOOGLE_APPLICATION_CREDENTIALS`), scoped to `https://www.googleapis.com/auth/earthengine` |
| **Quotas** | Applicable account limits | PENDING — confirm EECU-seconds/min, concurrent queries limit, and daily compute quota for provisioned project |
| **Output** | Actual response format | PENDING — confirm `reduceRegion` JSON shape, CRS (`EPSG:4326` or projected UTM), and export raster format (GeoTIFF/COG) |
| **License** | Attribution and retention conditions | Copernicus Sentinel data (terms of use: credit European Union/ESA/Copernicus); Dynamic World (CC-BY 4.0); Google Earth Engine terms of service. Artifact caching permitted for analytical outputs. |
| **Result** | Working, blocked, or unsupported | **PENDING** — Awaiting GCP project registration, IAM role assignment (`roles/earthengine.writer`), and capability probe execution. |

---

### Action Items for Completion

1. Follow [`docs/gee-setup-guide.md`](../gee-setup-guide.md) to set up GCP project and Service Account.
2. Run the capability probe in Step 6 of the guide.
3. Update this record with actual timestamps, verified dataset bands, quota figures, and probe outputs.
4. Update `Result` from `PENDING` to `working` (or `blocked`).
