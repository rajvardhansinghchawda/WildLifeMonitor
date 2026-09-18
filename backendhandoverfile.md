Backend responsibility

The backend owns authorization, input validation, job execution, scientific metrics, provenance, event persistence, and secure artifact access.

The frontend must not independently calculate official change areas or priority scores.

Service entry points

Expected process roles:

`text
API process:
  FastAPI application

Worker process:
  Celery analysis worker

Dispatcher process:
  Transactional outbox publisher

Scheduler process:
  Stale-job reconciliation and scheduled maintenance
`

These roles may share code but have separate lifecycle and scaling needs.

Environment contract

The following are application-defined settings.

`dotenv
APPENV=development
APIPREFIX=/api/v1
DATABASEURL=postgresql+asyncpg://user:password@db:5432/wildlife
REDISURL=redis://redis:6379/0

OBJECTSTORAGEENDPOINT=http://object-storage:9000
OBJECTSTORAGEBUCKET=wildlife-artifacts
OBJECTSTORAGEACCESSKEY=replace-me
OBJECTSTORAGESECRETKEY=replace-me

AUTHMODE=development
OIDCISSUER=
OIDCAUDIENCE=

GEEPROJECTID=
GOOGLEAPPLICATIONCREDENTIALS=

GFWENABLED=false
GFWAPIKEY=

OVERPASSENDPOINT=https://overpass-api.de/api/interpreter

MAXAOIKM2=2500
MAXAOIVERTICES=5000
MAXACTIVEJOBSPERWORKSPACE=2

ALLOWEDORIGINS=http://localhost:5173
LOGLEVEL=INFO
`

Production should prefer managed identity where supported. Development authentication must be rejected at startup in production mode.

Provider interface

Each adapter implements conceptual operations:

`python
from typing import Protocol

class ChangeProvider(Protocol):
    async def checkcapability(
        self,
        request: "AnalysisRequest",
    ) -> "CapabilityResult":
        ...

    async def analyze(
        self,
        context: "AnalysisContext",
    ) -> "LayerResult":
        ...
`

The async interface does not imply that a blocking SDK is safe to run on an event loop. Implementations must isolate blocking operations.

Layer-result contract

A layer result contains:

• Status and optional classified error.
• Metrics with explicit units.
• Quality including valid coverage.
• Artifact references rather than embedded large payloads.
• Events or an event-extraction artifact.
• Provenance and source attribution.
• Warnings and method version.

Adapters do not directly mutate user-facing verification records.

Error ownership

| Failure | Backend behavior | User-facing result |
|---|---|---|
| Invalid AOI | Reject before enqueue | Validation message |
| Expired provider credential | Controlled refresh or fail layer | Provider unavailable |
| Quota exhaustion | Bounded retry or terminal layer outcome | Quota warning |
| No valid imagery | Do not fabricate metrics | Insufficient data |
| Unsupported geography | Skip incompatible method | Unsupported layer |
| Optional context failure | Preserve change output | Context warning |
| Artifact corruption | Reject publication | Layer failure |

Do not turn all provider failures into HTTP 500 responses from the status endpoint.

Operations runbook
Stuck jobs

Check worker heartbeats, lease expiry, queue depth, provider requests, and database connectivity.

Recovery must pass through the reconciliation mechanism. Do not manually mark a job successful without validating artifacts.

Provider throttling

Reduce provider concurrency, inspect quota consumption, and honor retry guidance. Do not increase retries aggressively.

Expired tiles

Refresh access through the authorized layer-access endpoint. Reuse persistent analysis outputs; do not rerun the full analysis merely to renew tile access.

Database migration

Run migrations once per deployment before enabling new application instances. Maintain a backup and rollback plan appropriate to the migration.

Artifact cleanup

Delete abandoned attempt artifacts after a grace period. Preserve published outputs according to workspace retention policy and source-license conditions.

Observability

Capture:

| Signal | Purpose |
|---|---|
| HTTP duration and error rate | API health |
| Queue age | Scheduling delay |
| Job duration by method | Processing cost |
| Provider latency and throttles | External dependency health |
| Valid-data coverage | Analysis usefulness |
| Cache reuse rate | Cost reduction |
| Worker heartbeat age | Recovery detection |
| Artifact publication failures | Output integrity |

Use request IDs, analysis IDs, and attempt IDs for correlation.

Handover completion checklist

The implementation handover must state:

• What is actually implemented.
• Which providers were tested.
• Which AOIs and periods were tested.
• Exact method/configuration versions.
• Tests executed and results.
• Known unsupported conditions.
• Required credentials.
• Migration instructions.
• Deployment and rollback steps.
• Remaining security or scientific review items.

This document is a target handover contract, not evidence that the backend already exists.
