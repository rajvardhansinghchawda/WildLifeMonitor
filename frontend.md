Frontend objective

Build a React dashboard that makes where change occurred, what changed, and how reliable the evidence is immediately understandable.

The interface should prioritize inspection and comparison over decorative statistics.

Technology decisions

Use:

• React + TypeScript + Vite for the application.
• Leaflet with React integration for the map.
• TanStack Query for API state and job polling.
• React Router for analysis URLs and navigation.
• A tested form-validation approach consistent with backend schemas.
• A chart library only when needed for actual time-series or categorical data.

Do not add a separate global store until local state and server-state tooling become insufficient.

Main layout

The desktop dashboard contains:

Header: Workspace, analysis title, source freshness, user controls.
Left panel: AOI, date windows, layers, submit controls.
Map: Basemap, overlays, AOI outline, selected event.
Summary region: Metrics, coverage, warnings.
Event panel: Sortable and filterable investigation list.
Detail drawer: Evidence, provenance, context, verification history.

On small screens, map and event list become separate tabs rather than compressed desktop columns.

Feature structure

`text
src/
├── api/
│   ├── client.ts
│   └── generated/
├── features/
│   ├── aoi/
│   ├── analyses/
│   ├── map/
│   ├── events/
│   └── verification/
├── components/
│   ├── ErrorPanel.tsx
│   ├── QualityBadge.tsx
│   ├── MetricCard.tsx
│   └── AttributionPanel.tsx
├── hooks/
├── pages/
└── types/
`

State ownership

| State | Owner | Persistence |
|---|---|---|
| Analysis results | TanStack Query | Server |
| Job status | TanStack Query | Server |
| Verification history | TanStack Query | Server |
| Draft AOI | AOI feature state | Session unless saved |
| Draft dates | Form state | Optional URL/session |
| Selected event | URL or feature state | Shareable where authorized |
| Layer visibility | Map UI state | Optional local preference |
| Opacity and viewport | Map UI state | Optional local preference |

Never duplicate server result objects in multiple independent stores.

Analysis form

The form supports:

• Drawing Polygon or MultiPolygon AOIs where the selected drawing tool supports them.
• Selecting approved preset AOIs.
• Reviewing calculated AOI size.
• Selecting baseline and comparison windows.
• Selecting enabled layers from /capabilities`.
• Reviewing seasonal-comparison warnings.
• Submitting one idempotent request.

Client validation improves feedback; backend validation remains authoritative.

Polling behavior

Poll active analyses with a bounded interval and backoff.

• Continue while queued, running, or cancellation is pending.
• Stop on terminal state.
• Pause or reduce polling in inactive tabs where appropriate.
• Refetch on reconnection.
• Preserve the analysis identifier across page refreshes.
• Do not resubmit a job after a polling network error.

UI state requirements

| State | Display | Available action |
|---|---|---|
| Empty | AOI and date guidance | Configure analysis |
| Queued | Queue message | Cancel |
| Running | Stage and layer states | Inspect ready layers |
| Partial | Results plus failure explanation | Review available evidence |
| Succeeded | Complete results | Investigate/export |
| Insufficient data | Coverage explanation | Adjust periods |
| Failed | Classified error | Submit corrected/new request |
| Cancelled | Cancellation status | Start new analysis |
| Offline | Connection warning | Retry fetching |

Cancellation is shown as pending until the server confirms it.

Map behavior
• Keep the AOI boundary visible.
• Show a legend for every active thematic layer.
• Use fixed, documented value ranges when comparisons require consistency.
• Display no-data regions distinctly from zero-change regions.
• Preserve layer order.
• Debounce viewport-based event requests.
• Synchronize event selection between map and list.
• Avoid automatically moving the map after every poll.
• Display data dates separately from processing dates.

For dense outputs, request server-rendered tiles or viewport-filtered features rather than downloading all events.

Layer terminology

Use scientifically defensible labels:

| Avoid | Use |
|---|---|
| Confirmed deforestation | Forest disturbance alert |
| Habitat destroyed | Vegetation-loss candidate |
| New buildings proved | Built-up change candidate |
| Human activity caused loss | Nearby mapped human features |
| Habitat Health: 87% | Investigation Priority: 87/100 |
| No change | No detected change in valid observations |

The priority score appears only when required components are available.

Metric cards

Display:

• Vegetation-loss candidate area, in hectares.
• Water gain and loss, separately.
• Built-up gain candidate area, in hectares.
• Forest alerts, using source-defined counting.
• Valid observation coverage, as a percentage.
• Events pending verification, as a count.

Do not sum overlapping thematic areas into a single total without an explicit union calculation.

Event detail drawer

Show:

• Event type and workflow status.
• Geometry and area.
• Baseline and comparison periods.
• Relevant numeric change.
• Observation quality.
• Nearby mapped context.
• Method and dataset information.
• Priority explanation where available.
• Reviewer notes and audit history.

Verification forms require notes for dismissal and inconclusive decisions. Resolve version conflicts by refreshing the record and asking the user to review changes.

Before/after comparison

Use matched-period imagery when available.

Each side displays its observation window and composite method. The comparison must not imply that two composites are individual photographs captured on exact dates.

If one side is unavailable, disable the slider and explain why.

Accessibility
• Provide keyboard-accessible forms and event lists.
• Keep visible focus indicators.
• Use meaningful control labels.
• Announce important analysis-state changes without excessive live-region updates.
• Do not rely on red/green alone.
• Ensure legends remain legible.
• Provide textual summaries of map findings.

API and security integration

Generate TypeScript types from the reviewed OpenAPI schema.

Use one API client for authentication, request IDs, error parsing, and cancellation.

Never store provider credentials in browser code. Treat tile URLs as potentially sensitive and temporary. Refresh them through the authorized backend contract.

Authentication failures must not trigger infinite refresh loops.

Frontend tests

Required tests cover:

Invalid AOI feedback.
Invalid and overlapping date windows.
Duplicate-click submission protection.
Polling completion and recovery.
Partial layer results.
Missing-data presentation.
Event/map selection synchronization.
Verification version conflicts.
Expired tile-access recovery.
Keyboard navigation.
Attribution visibility.
Absence of provider secrets in the build.

Definition of done

The frontend is complete when an authorized user can select an AOI, submit an analysis, inspect real spatial results, understand limitations, and record an investigation decision without relying on developer explanations.
