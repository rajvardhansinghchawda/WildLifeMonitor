Engineering rules

These rules apply to all contributors and automated coding agents.

Scientific integrity
• Never fabricate observations. Synthetic fixtures must be labeled.
• Never equate NDVI decrease with confirmed deforestation.
• Never equate built probability with built area.
• Never treat no data as no change.
• Never imply causation from proximity.
• Never report species outcomes without appropriate evidence.
• Never present heuristic scores as validated ecological health.
• Always retain observation periods and provenance.
• Always distinguish native source resolution from analysis-grid resolution.

Data-source rules
• Verify dataset identifiers and bands against the selected source.
• Run capability probes before enabling a provider.
• Treat free-tier limits and terms as configuration and operational constraints.
• Record attribution and redistribution requirements.
• Do not infer nonexistence of a package from an unsuccessful local installation.
• Do not depend on satchange unless its source, package identity, maintenance, and behavior are independently established.

API rules
• Use /api/v1 for public application routes.
• Validate inputs before queueing.
• Use UTC timestamps and ISO-formatted dates.
• Use explicit units in field names.
• Return null for unknown values.
• Use bounded pagination.
• Publish OpenAPI as the contract.
• Keep large computation outside request handlers.

Security rules
• Never expose provider secrets through frontend environment variables.
• Never accept unrestricted external fetch URLs.
• Enforce authorization on every analysis, event, artifact, and tile.
• Parameterize database queries.
• Use explicit CORS origins.
• Limit geometry size, AOI area, request rate, and active jobs.
• Redact tokens and sensitive AOI coordinates from routine logs.
• Avoid exposing sensitive wildlife locations publicly.
• Use trusted identity claims, not user-supplied workspace headers alone.

Frontend rules
• Display partial failure visibly.
• Preserve completed results while other layers load.
• Do not invent progress percentages.
• Display stale or expired layer states.
• Keep map attribution visible.
• Pair color with text or symbols.
• Provide a non-map route to event details.
• Separate request state from map interaction state.

Code-quality rules
• Use typed interfaces at module boundaries.
• Keep route handlers thin.
• Write tests for new behavior.
• Commit migrations with schema changes.
• Do not store secrets or large rasters in Git.
• Do not merge unverified provider response assumptions.
• Do not claim tests ran unless they actually ran.
• Record unresolved limitations in handover notes.

Merge gate

A change is ready only when:

• Behavior matches acceptance criteria.
• Tests cover success and relevant failure paths.
• Contracts remain synchronized.
• Security has been reviewed.
• Scientific labels match the implemented method.
• Documentation reflects the actual implementation.
