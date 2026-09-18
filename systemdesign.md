System objectives

The system must remain responsive while analyses take seconds or minutes. It must preserve usable results when an optional source fails and avoid presenting unavailable data as zero change.

Data model

| Entity | Important fields | Purpose |
|---|---|---|
| Workspace | ID, name, settings | Authorization boundary |
| Membership | User, workspace, role | Access control |
| AOI | Geometry, area, hash, owner | Reusable study area |
| Analysis | AOI snapshot, periods, config, state | Analysis request |
| AnalysisLayer | Type, state, quality, error | Independent layer outcome |
| JobAttempt | Attempt, lease, heartbeat | Worker recovery |
| ChangeEvent | Geometry, metrics, workflow status | Investigation unit |
| Artifact | Object key, checksum, media type | Persistent outputs |
| Verification | Event, actor, notes, decision | Review history |
| AuditLog | Actor, action, target, timestamp | Accountability |
| Outbox | Message, published timestamp | Reliable dispatch |

Analysis inputs are immutable. Editing an AOI or threshold creates a new analysis.

Job state machine

`mermaid
stateDiagram-v2
    [*] --> queued
    queued --> running
    queued --> cancelrequested
    running --> succeeded
    running --> partial
    running --> failed
    running --> cancelrequested
    cancelrequested --> cancelled
`

Terminal analyses are not silently restarted. An explicit retry creates a new execution request linked to the original.

Layer states

Layer state is distinct from job state:

| State | Meaning |
|---|---|
| pending | Not started |
| running | Processing |
| ready | Usable output available |
| insufficientdata | Valid observations below requirements |
| unsupported | AOI, period, or method outside coverage |
| failed | Processing or provider error |
| cancelled | Work stopped |

Job resolution:

• Succeeded: All requested change layers are ready.
• Partial: At least one requested change layer is ready and another is not.
• Failed: No requested change layer produces usable output.
• Cancelled: Cancellation takes effect before terminal publication.

Context-layer failures generate warnings; they must not invalidate otherwise useful change outputs.

Request lifecycle
Authenticate and resolve workspace membership.
Validate geometry, dates, requested layers, and resource limits.
Snapshot the AOI and processing configuration.
Resolve idempotency within the workspace.
Persist analysis and outbox entry in one transaction.
Dispatch the outbox message to the worker queue.
Acquire a lease before executing.
Check provider capability for each requested layer.
Process and store artifacts.
Publish metadata only after artifact validation.
Finalize job state from layer outcomes.
Expose results to authorized users.

Worker reliability

Queue delivery is treated as at least once.

• Use leases and heartbeats to identify abandoned attempts.
• Assign each attempt a fencing token.
• Reject finalization from a worker with an expired token.
• Write artifacts under attempt-specific keys.
• Publish final artifact references transactionally.
• Reconcile stale jobs with a periodic worker task.
• Retry only classified transient failures.

The database is authoritative; Redis is not the sole source of job truth.

Vegetation-change method
Select approved Sentinel-2 surface-reflectance inputs.
Mask clouds, shadows, invalid pixels, and inappropriate observations.
Compute per-observation NDVI with safe handling of zero denominators.
Create comparable temporal composites.
Align both periods to the same analysis grid.
Calculate comparison NDVI minus baseline NDVI.
Restrict comparison to valid observations in both periods.
Apply a versioned change threshold.
Filter undersized components and create event geometries.
Record index change, classified area, and valid coverage.

A decrease in mean NDVI must not be labeled “percentage vegetation loss.”

Water-change method

V1 uses matched-period Dynamic World water-probability composites with configured classification and ambiguity thresholds.

Compute separate masks for water gain and water loss. Ambiguous pixels remain unclassified.

JRC historical data is a separate context layer, not a substitute for current observations.

Report:

• Baseline classified water area.
• Comparison classified water area.
• Gross gain and gross loss.
• Net change.
• Valid comparison area.

If baseline water area is zero, relative percentage change is null.

Built-up-change method

Aggregate built-class probabilities over comparable windows.

Require configured baseline and comparison class conditions to produce built-up change candidates. Retain ambiguous pixels separately.

A probability difference raster may be displayed, but must be labeled as probability change, not construction area.

Forest-alert method

The adapter must verify:

• Geographic coverage.
• Temporal coverage.
• Access requirements.
• Source schema and confidence categories.
• Geometry or raster representation.
• Attribution and redistribution conditions.

Preserve source confidence categories. Do not translate them into arbitrary percentages.

Context enrichment

Compute road and settlement distances from cached context features.

Distinguish nearest known feature from nearest real-world feature. An empty source response is not proof that no road or settlement exists.

For “new road” claims, a separate historical change method is required; V1 does not make that claim.

Security model

Use OIDC-compatible authentication for shared deployments.

| Role | Permissions |
|---|---|
| Viewer | Read authorized analyses and events |
| Analyst | Create analyses and submit verification updates |
| Admin | Manage workspace membership and configuration |

Apply workspace scoping to database queries, artifact access, tile access, and caches.

Public demonstrations use curated results and restricted analysis access.
