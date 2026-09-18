# Phase 7 — Documentation & handover

Paste the block below into a coding agent as its task. The agent should also read, at the repo root (`D:\firebox\CodeNiti`): `backendhandoverfile.md`, `agents.md`, `rules.md` — these are the authoritative contracts; this file only points to the relevant sections.

Depends on: Phases 1–6 merged.
Blocks: nothing (final phase).

```text
Task ID: P7-HANDOVER
Objective: Complete backendhandoverfile.md's "Handover completion checklist" with the real, verified state of the implementation — not aspirational claims.

Read first: backendhandoverfile.md (entire document, especially the final "Handover completion checklist" section), agents.md ("Handover format"), rules.md ("Merge gate", "Do not claim tests ran unless they actually ran").
Depends on: Phases 1–6 merged.

Deliverables — produce `docs/handover.md` covering exactly the checklist items from backendhandoverfile.md:
- What is actually implemented (feature-by-feature, phase-by-phase, explicit about what's still fixture-backed vs real-provider-backed).
- Which providers were tested (with reference to the Phase 0 verification records — state plainly if GEE/GFW were never actually exercised with real credentials).
- Which AOIs and periods were tested (reference the specific fixtures/tests used across phases).
- Exact method/configuration versions shipped (vegetation-v1, priority-v1, etc. — the literal strings used in method_version/priority_method_version fields).
- Tests executed and their results (link to or summarize CI output — do not claim a test ran if it didn't).
- Known unsupported conditions (antimeridian AOIs, disabled GFW, any layer/provider gaps).
- Required credentials for a real deployment (env var list from backendhandoverfile.md, cross-referenced with what's actually configured vs still pending from Phase 0).
- Migration instructions (how to run Alembic migrations safely, backup-before-migrate guidance from the Phase 6 drill).
- Deployment and rollback steps.
- Remaining security or scientific review items (anything flagged but not resolved — e.g. "priority weights are product heuristics, not ecologically validated," repeated verbatim from superpower.md, plus any open items specific to this implementation).

Constraints:
- Every claim must be traceable to an actual test run or a documented manual verification step — this document is explicitly "a target handover contract" that must now describe reality, not the plan.
- Do not describe planned-but-unbuilt features as implemented (agents.md: Documentation agents "must not... describe planned features as implemented").

Acceptance criteria: a new engineer or reviewer, reading only docs/handover.md plus the referenced test output, can determine exactly what works, what's fixture-only, what credentials are still needed, and how to safely deploy and roll back — without reading the full commit history.

Expected handover: the completed docs/handover.md itself, plus a short list of anything discovered during this review pass that should become a new backlog item (e.g. a gap noticed while writing up "known unsupported conditions").
```

Previous: [Phase 6 — Reliability & hardening](phase-6-reliability-hardening.md)

This is the final phase.
