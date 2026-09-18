Purpose

Define the engineering and scientific capabilities required to build and maintain the Wildlife Habitat Monitoring System.

The product helps conservation teams locate environmental changes, understand supporting evidence, and prioritize field investigation. It does not identify animals, establish illegality, or prove species-specific habitat loss.

Required competencies

| Area | Required capability | Evidence of completion |
|---|---|---|
| Python backend | FastAPI, validation, dependency injection, async I/O | Tested API endpoints |
| React frontend | TypeScript, map interaction, asynchronous state | Working analysis workflow |
| Geospatial data | GeoJSON, CRS, raster masks, spatial queries | Verified geometry and area tests |
| Remote sensing | Composites, cloud masking, temporal comparison | Reproducible analysis fixture |
| Database | PostgreSQL, PostGIS, migrations | Spatial schema and query tests |
| Background processing | Retries, leases, idempotency, cancellation | Worker recovery tests |
| Security | Authorization, secret handling, input limits | Negative security tests |
| Operations | Containers, metrics, logs, backups | Successful deployment rehearsal |

Remote-sensing fundamentals

Every developer touching analysis must understand:

• NDVI is an index, not a percentage of vegetation cover.
• Seasonality matters. Comparing different seasons can create misleading vegetation-change signals.
• Clouds and shadows are missing or contaminated observations, not environmental change.
• Probability change is not area change. Increasing built-class probability must not be reported directly as hectares of new construction.
• Pixel dimensions depend on the analysis grid. Geographic-coordinate pixels must not be assigned a constant area without an appropriate method.
• Tree-cover disturbance is not automatically permanent deforestation.
• Current roads provide context, not proof that roads were recently built or caused a detected change.

Coordinate and geometry rules

External geometries use GeoJSON longitude-latitude ordering in WGS84.

Spatial analysis must use a documented grid and area calculation:

• Use an appropriate projected CRS or provider pixel-area calculation for area.
• Use a metric CRS or PostGIS geography for distance.
• Record resolution, CRS, transformation, and resampling method.
• Reject invalid geometries with a useful message.
• Do not silently repair user geometry when repair materially changes the AOI.
• Reject antimeridian-crossing AOIs in V1 with an explicit unsupported-geometry error.

Backend skills

Backend contributors must be able to:

Separate HTTP handlers from analysis logic.
Validate requests before scheduling expensive work.
Persist job state independently of worker processes.
Implement provider timeouts and bounded retries.
Stream or reference large artifacts instead of embedding them in JSON.
Apply tenant authorization to every stored object.
Write contract, integration, and failure-path tests.

Frontend skills

Frontend contributors must be able to:

Keep server state separate from transient UI state.
Render large spatial outputs as tiles.
Poll jobs without duplicate submissions.
Handle partial results and stale tile credentials.
Display units, dates, source lineage, and coverage.
Support keyboard-accessible alternatives to map interaction.

Scientific review checklist

Before publishing an analysis method:

• Temporal validity: Are baseline and comparison windows appropriate?
• Observation quality: Are clouds, shadows, and missing data handled?
• Spatial validity: Are grids aligned and area calculations correct?
• Semantic validity: Does the label match what the data actually measures?
• Reproducibility: Are input identifiers and method versions recorded?
• Uncertainty: Is insufficient evidence displayed rather than hidden?

Completion standard

A capability is complete only when it has implementation, tests, documentation, and a failure behavior. A working happy-path demonstration alone is insufficient.
