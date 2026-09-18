Objective

Optimize API responsiveness, processing cost, memory use, and map delivery without changing scientific results silently.

An accepted asynchronous request is not a completed analysis.

Performance targets

These are initial targets, not measured guarantees.

| Operation | Initial target | Conditions |
|---|---|---|
| Analysis submission | p95 below 500 ms | Warm API, valid bounded AOI |
| Job status read | p95 below 200 ms | Indexed database query |
| Event page | p95 below 500 ms | Page size up to 100 |
| Cached result metadata | p95 below 300 ms | No external provider call |
| Cancellation request | p95 below 300 ms | Actual cancellation is cooperative |

Benchmark using documented hardware, dataset size, concurrency, and cache state.

Algorithm choices

| Operation | Approach | Benefit |
|---|---|---|
| Geometry lookup | GiST spatial index | Avoid full spatial scans |
| Event pagination | Keyset cursor | Stable cost for deep navigation |
| Local nearest-feature search | Spatial tree | Reduce repeated candidate comparisons |
| Raster processing | Windowed chunks | Bound peak memory |
| Hotspot extraction | Connected components | Group candidate pixels |
| Cross-tile components | Union-find reconciliation | Avoid tile-edge duplicates |
| Request reuse | Hash-based lookup | Avoid duplicate computation |
| Top-priority retrieval | Indexed ordering | Avoid application-side sorting |

Spatial-index performance depends on geometry distribution and selectivity; it is not a universal constant-time guarantee.

Cache-key construction

Include all inputs that can affect a result:

`text
workspacescope
canonicalaoihash
baselinestart
baselineend
comparisonstart
comparisonend
requestedlayers
datasetrevisionorfreshnessbucket
methodversion
thresholdconfiguration
maskconfiguration
analysiscrs
analysisresolution
`

Canonical geometry handling must normalize ring orientation and ordering. Do not round coordinates unless a documented precision policy permits it.

Separate idempotency keys from scientific cache keys:

• Idempotency protects request submission from duplication.
• Scientific caching reuses identical computations.

Cache policy

Use Redis for small metadata and short-lived coordination.

Store large rasters in object storage, not Redis.

Different data have different freshness needs:

• Immutable historical outputs: Long retention.
• Recent open-ended observations: Shorter freshness window.
• Context features: Provider-aware refresh policy.
• Tile credentials: Expiry-aware metadata.
• Failures: Short-lived negative caching only for known repeatable conditions.

Do not reuse permission-sensitive content across workspaces without an explicit public-data policy.

Database optimization

Recommended indexes include:

`sql
CREATE INDEX analysesworkspacecreatedidx
ON analyses (workspaceid, createdat DESC, id DESC);

CREATE INDEX eventsgeomgistidx
ON changeevents USING GIST (geom);

CREATE INDEX eventsworkspaceanalysisidx
ON changeevents (workspaceid, analysisid);

CREATE INDEX eventspriorityidx
ON changeevents
(workspaceid, analysisid, priorityscore DESC, id);
`

Validate real query plans before adding more indexes.

Use spatial bounding-box filtering before exact geometry predicates where appropriate. Batch context enrichment to avoid one road query per event.

Raster optimization
• Estimate work before execution. Bound AOI area, requested resolution, time windows, and expected observation count.
• Process incrementally. Avoid loading entire large rasters into memory.
• Preserve exact calculations. Simplification applies to display geometry, not metric geometry.
• Handle tile seams. Reconcile connected components across processing windows.
• Choose resampling deliberately. Categorical masks and continuous index rasters require different treatment.
• Avoid silent coarsening. If a provider operation changes effective resolution, record and display it.

Earth Engine applies request, aggregation, and compute limits; increasing worker concurrency is not a substitute for respecting provider limits. Earth Engine quota documentation

Concurrency strategy

Use async I/O for database and supported network clients.

Run blocking SDK calls and CPU-intensive work outside the FastAPI event loop.

Apply provider-specific distributed concurrency limits across workers. A semaphore inside one process does not enforce a deployment-wide limit.

Retry policy

Retry transient failures with exponential backoff and jitter.

• Retry: Timeouts, selected 5xx responses, rate limits where retry is permitted.
• Do not retry automatically: Invalid credentials, invalid geometry, unsupported coverage.
• Respect: Retry-After, attempt limits, and cancellation.
• Refresh credentials: Through a controlled shared path to avoid token-refresh storms.

Map-delivery optimization
• Return tiles, not raster arrays in JSON.
• Paginate event metadata.
• Query map features by viewport.
• Cap GeoJSON responses.
• Move dense vector results to vector tiles when profiling justifies it.
• Use ETags for immutable metadata and appropriate cache controls.
• Never attach public cache headers to private artifacts accidentally.

Benchmark suite

Test:

Small, medium, and maximum-permitted AOIs.
Cold and warm cache behavior.
Concurrent submissions of the same request.
Dense event results.
Provider throttling.
Worker crashes.
Low-coverage imagery.
Tile credential expiry.
Large but valid geometry inputs.
Database connection-pool exhaustion.

Record API latency separately from queue delay and processing duration.
