# Phase 0 — Provider verification track

Paste the block below into a coding agent as its task. The agent should also read, at the repo root (`D:\firebox\CodeNiti`): `workflow.md`, `backendhandoverfile.md`, `rules.md`, `agents.md` — these are the authoritative contracts; this file only points to the relevant sections.

Depends on: nothing (runs first, in parallel with Phase 1/2).
Blocks: real-provider swap-in inside Phase 3/4 (does not block Phase 1/2, or the fixture-based parts of Phase 3/4).

```text
Task ID: P0-PROVIDER-VERIFICATION
Objective: Produce a provider-verification record for Google Earth Engine (and, if pursued, GFW) following the exact template in workflow.md's "Phase 0: provider and dataset validation" section, and document the concrete setup steps needed to obtain working credentials. This task produces documentation and a verification-record template, not application code.

Read first: workflow.md (Phase 0 section), backendhandoverfile.md (environment contract: GEE_PROJECT_ID, GOOGLE_APPLICATION_CREDENTIALS, GFW_ENABLED, GFW_API_KEY), rules.md ("Data-source rules"), agents.md ("Escalation triggers").

Context: The project currently has no Earth Engine or GFW credentials. This task does NOT require you to already have access — it produces (a) a reusable verification-record template with the required fields, and (b) a step-by-step guide for creating a GCP project, enabling the Earth Engine API, creating a service account, and registering it for Earth Engine access, so the project owner can execute those steps themselves.

Deliverables:
1. `docs/provider-verification-template.md` — a blank/reusable record with the exact fields workflow.md requires: Provider, Verification date, Dataset (exact identifier and bands), Coverage (tested AOI and periods), Credentials (required mechanism), Quotas (applicable account limits), Output (actual response format), License (attribution and retention conditions), Result (working/blocked/unsupported).
2. `docs/gee-setup-guide.md` — numbered steps to: create/select a GCP project, enable the Earth Engine API, register the project for Earth Engine access, create a service account with minimum required roles, download/store its key securely (never commit it), and set GEE_PROJECT_ID / GOOGLE_APPLICATION_CREDENTIALS locally and in deployment. Include how to run a minimal capability probe (a single small AOI, single date range) to confirm access actually works — registration alone is not proof of processing access (per workflow.md).
3. A stub `docs/provider-verification-records/gee.md` copied from the template, left unfilled with a note "PENDING — run after credentials are provisioned," and the same for `gfw.md` marked "PENDING — GFW_ENABLED=false until verified."

Constraints:
- Do not fabricate a "Result: working" entry — an unfilled/pending record is correct until a real probe has been run.
- Do not invent dataset identifiers or band names; instruct the reader to confirm them against Earth Engine's actual catalog during the real probe.
- This task must not touch `backend/` application code.

Acceptance criteria:
- Both guide documents exist, are accurate against current (as of writing) Earth Engine onboarding steps, and clearly separate "registration" from "verified processing access."
- The verification-record template's fields match workflow.md exactly.
- GFW stays explicitly marked disabled/pending, consistent with tasks.md's note that T18 may remain disabled if access or coverage is unsuitable.

Expected handover: state which steps were documented, which (if any) were actually executed with real credentials, and that GEE_PROJECT_ID/GFW_ENABLED remain unset/false in all environment templates until a human completes the real probe.
```

Next: [Phase 1 — Repository foundation](phase-1-repo-foundation.md)
