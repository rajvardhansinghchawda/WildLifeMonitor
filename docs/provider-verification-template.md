# Provider Verification Record Template

This template defines the mandatory verification record required by `workflow.md` ("Phase 0: provider and dataset validation") before any external provider or dataset is enabled in the Wildlife Habitat Monitoring System.

Every provider, whether primary (e.g., Google Earth Engine) or optional/contextual (e.g., Global Forest Watch), must have a completed, non-fabricated verification record backed by an executed capability probe.

---

| Field | Required content | Record Details |
|---|---|---|
| **Provider** | Service and account/project | <!-- e.g., Google Earth Engine — GCP Project: codeniti-wildlife-dev, Service Account: codeniti-gee-worker@codeniti-wildlife-dev.iam.gserviceaccount.com --> |
| **Verification date** | Actual execution date | <!-- ISO-8601 UTC date when probe was executed, e.g., 2026-09-18T12:00:00Z --> |
| **Dataset** | Exact identifier and bands | <!-- Exact Earth Engine asset ID or API endpoint and queried bands, e.g., COPERNICUS/S2_SR_HARMONIZED (B4, B8, SCL) --> |
| **Coverage** | Tested AOI and periods | <!-- Tested bounding polygon/coordinates, computed area in km², baseline period, and comparison period --> |
| **Credentials** | Required mechanism | <!-- Mechanism used: Service Account JSON key, Workload Identity, OAuth, API key, etc. --> |
| **Quotas** | Applicable account limits | <!-- Account tier limits: EECU-seconds/min, concurrent requests, rate limits, storage limits --> |
| **Output** | Actual response format | <!-- Actual return shape, raster dimensions, pixel data type, native resolution, projection/CRS, scale --> |
| **License** | Attribution and retention conditions | <!-- Attribution requirement string, commercial/non-commercial usage terms, artifact caching and retention policy --> |
| **Result** | Working, blocked, or unsupported | <!-- Exactly one of: 'working', 'blocked', or 'unsupported'. Provide detailed technical justification if blocked or unsupported --> |

---

### Verification Checklist & Sign-Off

- [ ] Capability probe executed against a real, small AOI (registration alone is **not** proof of processing access).
- [ ] Response confirmed server-side compute evaluation (e.g., raster reduction/composite returned actual numeric pixel values, not just client initialization).
- [ ] Band names and collection identifiers verified against active source catalog.
- [ ] Attribution terms documented and compatible with project display requirements (`rules.md`).
- [ ] Rate limits and free-tier quotas documented and integrated into system design constraints.
- [ ] No private keys or credential secrets stored in this document or version control.
