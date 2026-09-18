# Provider Verification Record: Global Forest Watch (GFW)

> **Status:** PENDING — GFW_ENABLED=false until verified.
>
> **Note:** Per `tasks.md` (task `T18`), Global Forest Watch integration is optional and may remain disabled if access, quota, or geographic coverage is unsuitable. In accordance with `backendhandoverfile.md`, `GFW_ENABLED=false` remains standard across all environment configurations until this verification record is completed through an approved probe.

---

| Field | Required content | Record Details |
|---|---|---|
| **Provider** | Service and account/project | Global Forest Watch (GFW / WRI) API |
| **Verification date** | Actual execution date | PENDING (Unexecuted) |
| **Dataset** | Exact identifier and bands | Integrated Deforestation Alerts (GLAD-L, GLAD-S2, RADD). Source schema: alert date, confidence categories (`nominal`, `high`, `highest`). *(Per systemdesign.md: preserve source confidence categories; never translate them into arbitrary percentages).* |
| **Coverage** | Tested AOI and periods | PENDING — test AOI and geographic coverage check required. Verify tropical/temperate forest coverage boundary. |
| **Credentials** | Required mechanism | GFW API Key (`GFW_API_KEY`), passed via authorization headers or query parameters. |
| **Quotas** | Applicable account limits | PENDING — confirm rate limits (req/min) and monthly request limits for registered GFW API key. |
| **Output** | Actual response format | PENDING — verify GeoJSON FeatureCollection or vector tile schema, timestamp format, and spatial resolution. |
| **License** | Attribution and retention conditions | World Resources Institute / Global Forest Watch open data terms (CC-BY 4.0). Requires explicit display of GFW attribution. |
| **Result** | Working, blocked, or unsupported | **PENDING** — GFW_ENABLED=false until verified. No active API key or verified probe currently established. |

---

### Action Items for Completion

1. Evaluate whether GFW deforestation alerts are required for target study zones (task `T18`).
2. Register for a GFW developer account and obtain an API key if pursued.
3. Execute a capability probe validating response schemas and latency against sample AOIs.
4. If verified, update `Result` to `working` and enable `GFW_ENABLED=true` in environment configuration. If unsuitable or unsupported, update `Result` to `unsupported` and keep `GFW_ENABLED=false`.
