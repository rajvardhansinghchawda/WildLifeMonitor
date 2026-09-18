Development approach

Build one working vertical slice before expanding to all layers.

The first slice is:

Select AOI -> submit job -> process vegetation -> display overlay -> inspect event.

Phase 0: provider and dataset validation

Create a provider verification record containing:

| Field | Required content |
|---|---|
| Provider | Service and account/project |
| Verification date | Actual execution date |
| Dataset | Exact identifier and bands |
| Coverage | Tested AOI and periods |
| Credentials | Required mechanism |
| Quotas | Applicable account limits |
| Output | Actual response format |
| License | Attribution and retention conditions |
| Result | Working, blocked, or unsupported |

Run a real AOI test. Do not treat registration as proof of processing access.

Phase 1: repository foundation

Implement:

• Local infrastructure: Database, Redis, object storage.
• API skeleton: Configuration, logging, health endpoints.
• Frontend shell: Map, sidebar, routing.
• Database migrations: Workspaces, AOIs, analyses.
• Authentication: Explicit local-development mode and protected shared mode.
• CI: Formatting, type checking, and unit tests.

Exit criterion: a frontend request reaches FastAPI and persists an authorized analysis record.

Phase 2: asynchronous execution

Implement queue dispatch, outbox publishing, worker leases, status polling, and cancellation.

Start with a clearly labeled deterministic fixture processor to test orchestration.

Exit criterion: a worker crash can be recovered without duplicate published results.

Phase 3: vegetation vertical slice

Implement a real provider adapter, quality filtering, composites, change raster, event extraction, and provenance.

Exit criterion: a real AOI produces reproducible metrics, a spatial overlay, and an inspectable event.

Phase 4: additional change layers

Add water and built-up processing independently.

Add forest alerts only after source coverage and access pass validation.

Exit criterion: each layer can succeed, fail, or report insufficient data without corrupting others.

Phase 5: investigation workflow

Add context enrichment, event filters, verification updates, audit history, and exports.

Exit criterion: an analyst can investigate an event and another authorized user can see the recorded decision.

Phase 6: hardening

Exercise rate limits, credential failures, queue recovery, maximum AOIs, authorization boundaries, and backup restoration.

Exit criterion: release checklist passes and remaining limits are documented.

Demo preparation

Use cached real outputs for selected AOIs.

Record:

• Actual source periods.
• Processing timestamp.
• Method version.
• Known limitations.
• Whether results are cached.
• Provider dependencies needed for live refresh.

Cached mode must be labeled. It must not pretend to be live analysis.

Daily development loop
Select one acceptance criterion.
Confirm relevant provider assumptions.
Update the contract where necessary.
Implement the smallest coherent change.
Add and run tests.
Validate the user-facing behavior.
Record evidence and unresolved issues.
