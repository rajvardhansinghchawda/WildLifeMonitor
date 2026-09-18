Purpose

Define responsibilities for human contributors and AI coding agents.

Agents may assist with implementation, but scientific claims, security decisions, and deployment authorization require accountable review.

Roles

| Agent | Owns | Must not do |
|---|---|---|
| Coordinator | Task ordering and integration | Declare untested work complete |
| Backend | API, persistence, orchestration | Invent provider schemas |
| Geospatial | Analysis methods and quality | Overstate ecological conclusions |
| Frontend | Dashboard and interaction | Derive scientific metrics independently |
| QA | Contract and failure testing | Rely only on screenshots |
| Security/operations | Access, secrets, deployment | Expose credentials in examples |
| Documentation | Contracts and handovers | Describe planned features as implemented |

Shared context

All agents read:

• rules.md
• spec.md
• architecture.md
• The task they are assigned
• Relevant API contracts and test fixtures

Geospatial contributors also read systemdesign.md. Performance contributors read dsabackendoptimisation.md.

Work-assignment format

`text
Task ID:
Objective:
Allowed files:
Dependencies:
Acceptance criteria:
Required tests:
Scientific or security risks:
Expected handover:
`

Agent execution protocol
Inspect existing implementation before editing.
Identify assumptions that require verification.
Keep changes inside assigned boundaries.
Add tests with the implementation.
Run available checks.
Report exact results.
Record blockers without fabricating workarounds.
Request review for shared-contract changes.

Handover format

`text
Task:
Status:
Files changed:
Behavior implemented:
Contract changes:
Tests executed:
Test results:
Provider checks executed:
Known limitations:
Migration or deployment steps:
Next dependency:
`

Parallel-work rules
• Backend and frontend may proceed in parallel after schema agreement.
• Mock fixtures must match the OpenAPI contract.
• Only one owner changes shared schemas at a time.
• Database migrations require coordinated ordering.
• Shared dependency changes require lockfile review.
• Provider adapters use recorded fixtures in CI.
• Live provider tests run separately with explicit credentials and quota limits.

Escalation triggers

Stop and request review when:

• A dataset band or endpoint does not exist.
• Source coverage excludes the selected AOI.
• A proposed label exceeds what the data measures.
• An implementation requires weakening authorization.
• A task needs paid or privileged access not approved.
• A performance shortcut alters resolution or scientific output.
