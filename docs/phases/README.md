# CodeNiti Backend — Phase Prompts Index

Each file below is a standalone, agent-ready task prompt in the project's `agents.md` work-assignment format. Hand one file at a time to a coding agent, in order — each phase assumes the previous one's code is already merged and its tests pass. Point the agent at the repo root (`D:\firebox\CodeNiti`) so it can read the referenced spec files (`spec.md`, `architecture.md`, `systemdesign.md`, `backendhandoverfile.md`, `dsabackendoptimisation.md`, `rules.md`, `agents.md`, `tasks.md`, `workflow.md`, `superpower.md`, `skill.md`) directly — those remain the authoritative contracts; these files only excerpt and route to the relevant sections per phase.

| Phase | File | Depends on |
|---|---|---|
| 0 | [Provider verification track](phase-0-provider-verification.md) | none (parallel to Phase 1/2) |
| 1 | [Repository foundation](phase-1-repo-foundation.md) | none |
| 2 | [Asynchronous execution core](phase-2-async-execution-core.md) | Phase 1 |
| 3 | [Vegetation vertical slice](phase-3-vegetation-slice.md) | Phase 2 |
| 4 | [Additional change layers](phase-4-additional-layers.md) | Phase 3 |
| 5 | [Investigation workflow](phase-5-investigation-workflow.md) | Phase 4 |
| 6 | [Reliability & hardening](phase-6-reliability-hardening.md) | Phase 5 |
| 7 | [Documentation & handover](phase-7-handover.md) | Phases 1–6 |

Phase 0 has no code dependency and can run any time before you need real Earth Engine data (Phase 3/4's real-provider swap-in), but doesn't block Phase 1 or 2.
