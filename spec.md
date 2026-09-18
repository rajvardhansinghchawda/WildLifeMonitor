Product definition

Wildlife Habitat Monitoring System is a geospatial decision-support dashboard for comparing environmental conditions and managing investigation of detected changes.

Primary user stories
• As an analyst, I can draw or select an AOI.
• As an analyst, I can compare two observation windows.
• As an analyst, I can inspect vegetation, water, and built-up changes.
• As an analyst, I can see supported forest alerts and contextual features.
• As a reviewer, I can understand evidence quality and limitations.
• As an analyst, I can record field-verification decisions.
• As a viewer, I can inspect results without changing them.

Initial configurable limits

These are deployment defaults to validate through benchmarking.

| Setting | Initial value |
|---|---|
| Maximum AOI area | 2,500 km² |
| Maximum geometry vertices | 5,000 |
| Maximum request body | 1 MB |
| Maximum observation window | 180 days |
| Default event page size | 50 |
| Maximum event page size | 100 |
| Concurrent active jobs per workspace | 2 |

Reject overlapping baseline and comparison windows in V1. Emit a warning for substantially different seasonal windows.

Future dates and unsupported source periods must produce explicit validation or capability outcomes.

API endpoints

| Method and path | Purpose | Response |
|---|---|---|
| POST /api/v1/analyses | Submit analysis | 202 |
| GET /api/v1/analyses/{id} | Job and layer status | 200 |
| POST /api/v1/analyses/{id}/cancel | Request cancellation | 202 or 409 |
| GET /api/v1/analyses/{id}/results | Result manifest | 200 or 409 |
| GET /api/v1/analyses/{id}/events | Paginated events | 200 |
| GET /api/v1/events/{id} | Event detail | 200 |
| PATCH /api/v1/events/{id}/verification | Review update | 200 |
| GET /api/v1/analyses/{id}/layers/{layerid}/access | Tile access descriptor | 200 |
| GET /api/v1/capabilities | Enabled methods and limits | 200 |
| GET /health/live | Process liveness | 200 |
| GET /health/ready | Core dependency readiness | 200 or 503 |

POST /analyze is replaced by the canonical asynchronous /api/v1/analyses endpoint.

Submission request

`json
{
  "aoi": {
    "type": "Polygon",
    "coordinates": [
      [
        [79.20, 21.60],
        [79.30, 21.60],
        [79.30, 21.70],
        [79.20, 21.70],
        [79.20, 21.60]
      ]
    ]
  },
  "baseline": {
    "start": "2024-01-01",
    "end": "2024-04-01"
  },
  "comparison": {
    "start": "2025-01-01",
    "end": "2025-04-01"
  },
  "layers": [
    "vegetation",
    "water",
    "builtup"
  ],
  "configurationid": "mvp-v1"
}
`

Dates use start-inclusive, end-exclusive semantics.

Send an Idempotency-Key header. Reusing the key with a different body returns 409.

Submission response

`json
{
  "analysisid": "an01",
  "status": "queued",
  "createdat": "2026-09-18T08:00:00Z",
  "statusurl": "/api/v1/analyses/an01",
  "resultsurl": "/api/v1/analyses/an01/results"
}
`

The response also supplies a Location header.

An idempotent replay returns the original accepted response and analysis identifier.

Status response

`json
{
  "analysisid": "an01",
  "status": "running",
  "stage": "processinglayers",
  "completedlayers": 1,
  "totallayers": 3,
  "layers": [
    {
      "type": "vegetation",
      "status": "ready"
    },
    {
      "type": "water",
      "status": "running"
    },
    {
      "type": "builtup",
      "status": "pending"
    }
  ],
  "warnings": [],
  "updatedat": "2026-09-18T08:01:00Z"
}
`

Do not infer percent completion from elapsed time.

Result manifest

The result endpoint returns metadata, not raw raster arrays.

Required fields:

• Analysis identity: ID, state, configuration.
• Input snapshot: AOI and requested periods.
• Layers: Status, metrics, quality, artifact references.
• Provenance: Sources, method versions, effective observations.
• Warnings: Structured codes and human-readable explanations.
• Attribution: Layer-specific source text.
• Events: Counts and navigation URL.

A partial analysis returns available results with status: "partial".

Change-event contract

The following values are illustrative, not an actual detection.

`json
{
  "type": "Feature",
  "id": "evt01",
  "geometry": {
    "type": "Polygon",
    "coordinates": [
      [
        [79.24, 21.64],
        [79.241, 21.64],
        [79.241, 21.641],
        [79.24, 21.641],
        [79.24, 21.64]
      ]
    ]
  },
  "properties": {
    "analysisid": "an01",
    "changetype": "vegetationlosscandidate",
    "affectedareaha": 1.15,
    "meanndvichange": -0.18,
    "validpixelfraction": 0.91,
    "qualitylabel": "usable",
    "sourceconfidence": null,
    "priorityscore": null,
    "prioritymethodversion": "priority-v1",
    "status": "pendingfieldverification",
    "methodversion": "vegetation-v1",
    "recordversion": 1
  }
}
`

Computed area must come from the analysis output, not a manually entered event estimate.

Metric semantics

| Metric | Meaning |
|---|---|
| meanndvichange | Mean comparison-minus-baseline NDVI on common valid support |
| vegetationlossareaha | Area passing configured vegetation-loss candidate rules |
| watergainareaha | Newly classified water on common valid support |
| waterlossareaha | Previously classified water lost on common valid support |
| builtupgainareaha | Area passing built-up transition rules |
| validpixelfraction | Valid comparison area divided by AOI area |
| forestalertcount | Count under the documented source counting rule |

Every percentage must include its denominator definition.

Verification contract

Allowed states:

`text
pendingfieldverification
investigating
verifiedchange
dismissed
inconclusive
`

Updates include notes and expectedrecordversion. Concurrent modification returns 409.

A verified event means the reviewer confirmed the recorded change under the workflow. It does not automatically confirm cause, illegality, or species impact.

Error contract

`json
{
  "error": {
    "code": "AOITOOLARGE",
    "message": "The selected area exceeds the configured analysis limit.",
    "details": {
      "maximumareakm2": 2500
    },
    "requestid": "req01",
    "retryable": false
  }
}
`

Important error codes include:

`text
INVALIDGEOMETRY
AOITOOLARGE
TOOMANYVERTICES
INVALIDDATERANGE
UNSUPPORTEDGEOMETRY
UNSUPPORTEDCOVERAGE
PROVIDERUNAVAILABLE
PROVIDERQUOTAEXCEEDED
INSUFFICIENTVALIDOBSERVATIONS
ANALYSISNOTREADY
VERSIONCONFLICT
RATELIMITED
`

Acceptance criteria

V1 is accepted when:

A user can submit a valid AOI and receive a job identifier promptly.
At least one approved real-data fixture exercises every enabled change method.
Map overlays and reported metrics originate from the same analysis artifacts.
Unsupported coverage and insufficient observations are visible.
Events retain provenance and verification history.
Worker retries do not create duplicate published events.
Cross-workspace access is denied.
Cached demonstrations are clearly labeled.
