# Trusted Backend Security Design

## Boundary

Callable/HTTP commands authenticate Firebase ID token and App Check where supported. Backend ignores client actor/role/permission/time/current-owner claims, re-reads Group/Membership, validates input schema and rate/idempotency keys, then uses Firestore transactions. Client receives typed result/error and authoritative versions.

Backend-only commands: `createGroup`, `createInvitation`, `acceptInvitation`, membership role/permission/status mutations, `assignRepair` and `changeRepairStatus`, authoritative audit/outbox, every ownership/security proposal command, Group deletion, Firebase Auth administration and future entitlements.

## Security proposal lifecycle

1. `createSecurityProposal(groupId,type,targetUid?,payload,idempotencyKey)` verifies active OWNER and action validity; transaction reads all active OWNER memberships and `group.securityVersion`; stores sorted immutable `requiredOwnerIds`, payload hash, ownerSetVersion, 72-hour expiry, nonce hash, PENDING proposal and creator approval only after explicit step-up confirmation.
2. `approveProposal`/`rejectProposal` verifies caller UID is in snapshot, pending/unexpired, payload/version match. Approval doc ID is caller UID; same identical request is idempotent, conflicting second decision fails.
3. `acceptOwnershipTarget` verifies target UID matches proposal, is ACTIVE same-Group member and proposal requires acceptance. It records acceptance bound to proposal/payload/version.
4. `executeProposal` may be explicit or automatically attempted after final approval. Transaction re-reads proposal, group, snapshot owner memberships and target; requires every required ID unique-approved, no reject, target acceptance if required, unexpired, nonce/request not replayed, and `group.securityVersion == ownerSetVersion`.
5. Transaction applies membership/group changes, increments versions, marks EXECUTED with request ID/time, writes Audit and outbox.

Owner-set drift or inactive/removed snapshot owner invalidates the proposal; quorum is never recomputed. V1 has no self-service or support ownership mutation recovery: Firebase account recovery is the only recovery path and orphaned Groups remain frozen.

## Operation specifics

- Add Owner: target ACTIVE member; target acceptance; role→OWNER; normalize prohibited overrides; at least current snapshot unanimous.
- Remove Owner: target is excluded from required approvals; every remaining active snapshot owner approves. Enforce 24-hour cooling, recent reauthentication, target security notification, target objection freeze, and owner count ≥1. Frozen disputes require the deferred trusted recovery process.
- Transfer Ownership: because multiple equal owners exist, define payload as add target and optionally remove named owner atomically. Never imply “primary owner.” Target accepts; all snapshot owners approve; at least one owner remains.
- Delete Group: unanimous, mandatory recent reauthentication, status→DELETION_PENDING, export/retention job, no immediate client delete. Final purge backend-only after cooling period.
- Critical Policy: payload is canonicalized/hashed; approvals bind hash. Unknown policy keys reject.

## Idempotency/replay/race controls

- Require UUID request ID/idempotency key; store operation receipt keyed by actor+command+key with payload hash/result.
- Reusing key with different payload fails `CONFLICT`; same payload returns prior result.
- Proposal nonce stored hashed, version monotonic, payload hash canonical, state transition compare-and-set.
- Transactions check Group securityVersion/Membership version/Repair version.
- Deterministic approval IDs and invitation locks prevent duplicates.
- Outbox delivery uses dedupe key; notification retry does not repeat domain mutation.
- Rate-limit search/invite/proposal/approval and log denied security attempts.

## Privilege-escalation closure

Membership mutation service applies DelegationPolicy: no self mutation, Manager never targets OWNER, never promotes to OWNER, never grants protected/non-delegable or absent capability, never trusts offered permissions, and always increments target version. OWNER promotion/removal routes exclusively through proposals; direct backend membership endpoint rejects OWNER transition.

## Audit

Backend derives `actorUid/role`, reads before, derives after, uses server time/request/proposal IDs and writes Audit in same transaction. Before/after is allow-listed/redacted; no secrets/Customer PII unless compliance explicitly requires encrypted restricted audit.

## Failure behavior

Transactions are all-or-nothing. Notification delivery after commit is outbox-driven. Retryable conflicts/network errors are distinguished from validation/permission/integrity. Backend failure never causes client to fall back to direct Firestore mutation (`BACKEND_REQUIRED`).

## Operational controls

Separate dev/staging/prod projects and service accounts, least-privilege IAM, secret manager, structured redacted logs, alerting on proposal/replay/denial anomalies, dependency patching, emulator+staging tests, deployment artifact/version audit and rollback to prior backend while preserving forward-compatible data.

## Phase 2.5 backend lock

CreateGroup atomically creates Group, OWNER Membership, user summary, Audit/outbox and repair counter. Customer intake approval, all Repair/Customer/membership/invitation writes, status and assignment are backend transactions. Owner removal excludes target, requires unanimous remaining owners, 24-hour cooling, recent reauthentication and dispute freeze.
