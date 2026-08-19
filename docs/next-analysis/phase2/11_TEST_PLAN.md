# Test Plan

## Test levels

- Unit: schemas, errors, formatters, reducers, cache generation, idempotency utilities.
- Domain: role/capability calculation, delegation ceiling, transition graph, assignment, invitation and quorum policies.
- Repository: explicit Group context, exact queries/indexes, converters, pagination, stale generation, optimistic versions.
- Permission: table-driven Role × Action × Resource/Group/status/override.
- Firestore Rules emulator: get/list/create/update/delete and query compatibility with exact schemas.
- Backend security: token binding, App Check/rate limit, transactions, idempotency/replay/concurrency, Audit/outbox.
- Integration: Auth bootstrap through each business workflow.
- Regression/migration: legacy fixtures transformed without PII/role leakage.
- Manual UI: responsive/accessibility/loading/offline/double-submit/camera/export/group switching.

## Mandatory adversarial matrix

| Area | Required tests |
|---|---|
| Identity | unauthenticated; forged actorUid; expired token; UID/email mismatch; missing profile |
| Group | missing/suspended/removed Membership; Group A credentials against B; guessed IDs; multi-Group role isolation |
| Permissions | unknown grant; protected grant; non-delegable customer grant; Manager self-modify; grant absent capability; touch/promote/remove Owner; stale membershipVersion |
| Customer | MEMBER get/list/query/create/update/archive all fail; MANAGER writes fail; repair doc/DTO contains no PII |
| Repairs | MEMBER unconstrained list fails; assigned query succeeds; another member repair get/history/status fails; archived/version/schema constraints |
| Assignment | inactive/removed/cross-Group target; simultaneous assign; stale version; notification retry dedupe |
| Status | illegal transition; stale from/version; simultaneous commands; double submit/replay; repair/history/audit consistency |
| Invitation | duplicate/existing member/expired/cancelled; accept/decline twice; stale role offer; Manager OWNER/protected offer; concurrent accept/removal |
| Ownership | immutable snapshot; unanimous multiple; sole owner+target; missing/duplicate approval; payload hash mismatch; expiry/replay; owner-set drift; target inactive; last owner; concurrent proposals |
| Session | out-of-order Group loads; failure after clear; role change during modal; logout during fetch/export/scanner; offline stale PII |
| Schema/audit | extra/missing/wrong type; immutable changes; timestamp spoof; update/delete Audit denied; forged critical Audit denied |

## Phase 1 finding coverage

| Finding | Test gate |
|---|---|
| S-01/S-04/S-05/S-06 | Customer deny matrix, technician schema inspection, command affected-key tests |
| S-02 | Member assigned query and direct other-job denial |
| S-03 | multiple-owner/proposal/quorum/last-owner suite |
| S-07 | invitation backend state/idempotency/concurrency suite |
| S-08/S-20/S-21 | session generation/cache teardown/partial load tests |
| S-09/S-19 | atomic authoritative Audit and append-only Rules tests |
| S-10/S-13 | assignment/status version conflict and atomicity tests |
| S-11/S-22 | only three roles; environment/config CI assertion; no global authorization |
| S-12/S-14 | partial registration/profile/group bootstrap recovery |
| S-15 | roster get/list query emulator contract |
| S-16 | exact schema/property tests across collections |
| S-17/S-18 | stable customer ID and unique repair-number tests |
| S-23 | migration dry-run/hash/referential/quarantine tests |
| S-24/S-25/S-26/S-27/S-28/S-29 | log redaction, API-key/App Check/quota controls, error observability, dependency pin/CSP, export scope/audit, verification policy |

All 3 Critical and 8 High findings have direct automated gates.

## Backend concurrency scenarios

Use barriers to start two commands from the same versions: assignment A/B, two status transitions, accept+decline, accept+member removal, last approval+owner set change, two proposal executions. Exactly one valid state transition commits; loser returns typed conflict/idempotent result; Audit/history counts match committed transitions.

## Integration journeys

Register partial recovery; login no Group; create Group; multi-Group switch roles; invite/accept/decline; Owner Customer+Repair; Manager view/create/assign/status but Customer edit denied; Member assigned workflow; suspension invalidation; ownership add/remove/transfer/delete proposal; notification deep link reauthorization; archive/export.

## Exit policy

CI must run one pinned command for unit/domain/repository/Rules/backend integration. Zero Critical/High failures or skipped negative tests. Flaky security tests block release. Manual test evidence includes browser/version and correlation IDs. Production data is never used in tests.

## Phase 2.5 mandatory gate

Phase 3A fails on any critical permission failure, cross-Group isolation failure, MEMBER Customer or other-repair access, MANAGER Customer write/self-escalation/protected grant, stale-permission bypass, orphan Group creation, or Rules failure. Mandatory/deferred ownership is defined by [16_PHASE3_ENTRY_GATE.md](16_PHASE3_ENTRY_GATE.md).
