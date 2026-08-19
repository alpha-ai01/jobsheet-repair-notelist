# Phase 3A Entry Gate

## Scope

Phase 3A Foundation Core is limited to:

- new `SmartRepair` repository/project scaffolding; build/lint/typecheck/test commands;
- isolated Firebase dev/test environment bindings and deployment guards;
- domain value objects/types for User, Group, Membership, roles/capabilities and versions;
- central error/result model;
- repository contracts and locked query specifications, not feature-complete repositories;
- Firebase Authentication foundation, Register/Login/Logout/Reset/verification gate;
- idempotent profile bootstrap/recovery;
- backend-atomic Group creation;
- Group summaries, Membership, active Group session and switch invalidation;
- centralized PermissionPolicy/DelegationPolicy registry;
- Firestore emulator and Rules test harness; deny-default draft Rules only in new environment;
- CI security gates and fixtures for unauthenticated/missing/inactive/multi-Group roles.

Not Phase 3A: Customer/Repair production workflows, invitations/notifications, status/assignment, analytics, reference management, audit UI, export/scanner, ownership proposal execution, Group purge, emergency recovery, migration, deploy/cutover.

## Entry prerequisites

- Phase 2.5 decisions are referenced as immutable ADR inputs.
- New repository and Firebase dev/test project names are explicitly approved before creation.
- No production Firebase credentials/project are used by default.
- Tool versions, runtime, package manager and CI platform are selected in the Phase 3 kickoff ADR.
- Production legacy remains untouched/read-only.

## Mandatory Phase 3A gates

| Gate | Must pass |
|---|---|
| Build quality | install from lockfile; build, lint, typecheck, unit tests one command in clean CI |
| Environment | tests prove dev/test project binding and reject production project ID/deploy target |
| Architecture | UI cannot import Firebase; Group repositories require explicit GroupContext |
| Authentication | partial registration/profile recovery/missing profile/verification restriction deterministic |
| Group integrity | atomic Group+Owner Membership+summary; idempotent retry; no orphan fixtures |
| Permission | only OWNER/MANAGER/MEMBER; unknown/protected invalid; Manager self/equal/Owner escalation denied |
| Isolation | cross-Group get/list/write fixtures denied; multi-Group roles independent |
| Session | switch clears scoped caches/pending state; out-of-order generation discarded; suspended/removed invalidates |
| Rules | emulator suite green; default deny; exact self-profile/Group/Membership get/list/query contracts |
| Security regression | Member Customer access and other-member Repair access fixtures denied even before feature UI exists |

Phase 3A cannot pass if any critical permission test, cross-Group isolation, Member Customer/other Repair denial, Manager Customer/self-escalation/protected grant, last-owner/quorum contract test scaffold, stale-permission denial, or Rules test fails. Ownership execution is not implemented in 3A, but domain/backend contract tests for last-owner/snapshot/quorum must exist and pass before that module can enter implementation.

## Mandatory now vs deferred tests

Mandatory 3A: tooling/environment, domain schemas/errors, role/capability/delegation, Auth/profile recovery, Group atomic creation/idempotency, Group session/switch/invalidation, repository explicit scope, Rules baseline/query denials, multi-Group and stale permission adversarial cases.

Deferred to owning phase but release-blocking there: Customer/Repair field/query suites; invitation expiry/idempotency; assignment/status concurrency; notification retention; full ownership transaction/replay; migration reconciliation; export/scanner/manual advanced UI. “Deferred” never means optional before that feature ships.

## Exit evidence

- CI run link/log and pinned lockfile;
- environment guard evidence;
- module dependency check;
- permission registry snapshot and matrix test report;
- Rules emulator report with get/list distinction;
- Auth recovery and Group atomicity integration report;
- session race test report;
- no Critical/High failed/skipped security test;
- Git diff confirms no legacy production source/Rules/config edits.

## Rollback

Phase 3A operates only in an isolated repository/project. Roll back application commit/deployment artifact and delete disposable dev data only under separately approved safe procedure. It has no production data migration to reverse. Never “roll back” by pointing new code at legacy production.

## Gate decision

Architecture, security model, permission semantics, data boundaries, backend boundary and test gates are **LOCKED** for Phase 3A. Deferred policies have explicit fail-closed behavior and do not block foundation work.

**Ready for Phase 3A: YES**, subject to approving the new repository and isolated Firebase dev/test environment identifiers at kickoff. This is an operational prerequisite, not an architecture blocker.
