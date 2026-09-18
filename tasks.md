Execution policy

Complete tasks in dependency order. Estimates should be assigned after provider validation, not inferred from the original eight-hour outline.

Foundation backlog

| ID | Task | Acceptance evidence |
|---|---|---|
| T01 | Verify provider access and coverage | Completed verification records |
| T02 | Select and validate demo AOIs | Real observations and documented findings |
| T03 | Create repository and lockfiles | Reproducible installations |
| T04 | Configure local infrastructure | Healthy Compose services |
| T05 | Implement configuration and logging | Startup validation and redaction tests |
| T06 | Create schema and migrations | Fresh database migration passes |
| T07 | Implement authentication and roles | Authorization tests |
| T08 | Define OpenAPI contract | Reviewed schema and matching fixtures |

Analysis backlog

| ID | Task | Acceptance evidence |
|---|---|---|
| T09 | Validate AOIs and periods | Edge-case validation tests |
| T10 | Persist analyses and outbox records | Transaction tests |
| T11 | Implement worker execution and leases | Crash-recovery test |
| T12 | Implement provider interface | Adapter contract tests |
| T13 | Build vegetation method | Real reproducible fixture |
| T14 | Publish raster artifacts | Validated metadata and checksums |
| T15 | Extract change events | Synthetic component tests |
| T16 | Build water method | Gain/loss and missing-data tests |
| T17 | Build built-up method | Probability-versus-area tests |
| T18 | Integrate verified forest alerts | Coverage and source-schema tests |
| T19 | Add context enrichment | Distance and missing-context tests |

Frontend backlog

| ID | Task | Acceptance evidence |
|---|---|---|
| T20 | Build dashboard shell | Responsive accessible layout |
| T21 | Add AOI drawing and presets | Valid geometry submission |
| T22 | Build analysis form | Validation and duplicate-click protection |
| T23 | Implement polling and cancellation | State-machine UI tests |
| T24 | Render raster layers and legends | Units and attribution visible |
| T25 | Build event list and detail drawer | Linked map/list selection |
| T26 | Add before/after imagery | Period labels and synchronized views |
| T27 | Add verification workflow | Persisted audited update |
| T28 | Add exports | Authorized export with provenance |

Reliability backlog

| ID | Task | Acceptance evidence |
|---|---|---|
| T29 | Add idempotency and computation reuse | Duplicate-submission tests |
| T30 | Add provider rate controls | Throttling tests |
| T31 | Add performance benchmarks | Recorded p50/p95 and resource use |
| T32 | Add security regression tests | Cross-workspace denial tests |
| T33 | Add observability | Operational dashboard and alerts |
| T34 | Test backup and restore | Restored analysis and artifacts |
| T35 | Prepare cached demonstration | Reproducible demo without live processing |
| T36 | Final documentation and review | Completed handover and release checklist |

Dependency notes
• T13 requires T01, T09, T11, and T12.
• T15 requires a validated spatial output from T13.
• T24 requires the artifact/access contract from T14.
• T27 requires event authorization and audit persistence.
• T18 may remain disabled if access or coverage is unsuitable; the UI must state that limitation.
• T35 must use real outputs, not synthetic fixtures presented as evidence.

Release-blocking tests

Do not release when any of these fail:

• No-data handling.
• Metric/overlay consistency.
• Geometry and area correctness.
• Workspace isolation.
• Retry deduplication.
• Artifact authorization.
• Attribution display.
• Worker recovery.
• Secret redaction.
