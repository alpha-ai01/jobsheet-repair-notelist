# Domain Model

## Aggregates and entities

| Aggregate root | Entities / value objects | Invariants |
|---|---|---|
| `UserProfile` | UserProfile; `UserId`, Email, DisplayName | ID equals Auth UID; profile contains no Group authority |
| `Group` | Group, Membership references; `GroupId`, GroupStatus, SecurityVersion | tenant boundary; ≥1 ACTIVE OWNER unless deletion finalized |
| `Membership` | Membership; `Role`, MembershipStatus, PermissionOverrides, MembershipVersion | one per `(groupId,uid)`; only three roles; protected grants impossible |
| `Invitation` | Invitation; InvitationStatus, OfferedRole, Expiry, IdempotencyKey | target UID; one pending active invite per target/group; immutable offer after creation |
| `Repair` | Repair, StatusHistory entries; `RepairId`, RepairNumber, RepairStatus, Assignment, Version, ArchiveState | technician-safe with no Customer identifier; restricted companion links Customer; Group immutable; transitions/version consistent |
| `Customer` | Customer; `CustomerId`, ContactMethods, ArchiveState, Version | PII vault; stable ID; Group immutable |
| `ReferenceData` | ReferenceItem; ReferenceType, ArchiveState | Group scoped and versioned |
| `SecurityProposal` | Proposal, OwnershipApproval; ProposalType/Status, OwnerSnapshot, Acceptance, Nonce | immutable required owners; unanimous; execute once; expiry and owner-set version |
| `Notification` | Notification; NotificationType/State | recipient UID immutable; no secret snapshot in payload |
| `AuditEvent` | immutable event | backend provenance for critical actions; no update/delete |

StatusHistory and AuditEvent are distinct immutable records; StatusHistory belongs to Repair aggregate transaction, while Audit is cross-domain accountability.

## Value objects

`UserId`, `GroupId`, `RepairId`, `CustomerId`, `InvitationId`, `ProposalId`, `Role`, `Capability`, `EffectivePermissionSet`, `RepairStatus`, `Money`, `DeviceDescriptor`, `Assignment`, `ArchiveMetadata`, `Version`, `ServerInstant`, `IdempotencyKey`, `OwnerSnapshot`, `ErrorCode`.

Validation is constructor/schema based. IDs are opaque; phone/email never serve as entity IDs. `Capability` registry marks protected/non-delegable capabilities.

## Domain services

- `PermissionPolicy`: calculate effective permissions and resource predicates.
- `DelegationPolicy`: role/permission ceiling, protected/non-delegable exclusion, no-self/no-owner Manager rules.
- `RepairTransitionPolicy`: legal transitions and required notes.
- `AssignmentPolicy`: same Group, active eligible target, actor capability.
- `OwnershipQuorumPolicy`: immutable snapshot, unanimous approval, target acceptance, last-owner safety.
- `InvitationPolicy`: offer ceiling, duplication, expiry, active-member exclusion.
- `ArchivePolicy`: eligibility and retention intent.

## Application use cases

`RegisterUser`, `RecoverProfile`, `LoginBootstrap`, `CreateGroup`, `SwitchActiveGroup`, `LogoutSession`, `InviteMember`, `AcceptInvitation`, `DeclineInvitation`, `ChangeMemberRole`, `ChangeMemberPermissions`, `SuspendMember`, `RemoveMember`, `CreateCustomer`, `UpdateCustomer`, `ArchiveCustomer`, `CreateRepair`, `EditRepair`, `AssignRepair`, `ChangeRepairStatus`, `ArchiveRepair`, `ListAssignedRepairs`, `ListGroupRepairs`, `ViewCustomer`, `ListNotifications`, `MarkNotificationRead`, `CreateSecurityProposal`, `ApproveProposal`, `RejectProposal`, `AcceptOwnershipTarget`, `ExecuteProposal`.

## Repository ports

`UserProfileRepository`, `GroupRepository`, `MembershipRepository`, `InvitationRepository`, `NotificationRepository`, `RepairRepository`, `CustomerRepository`, `ReferenceDataRepository`, `AuditRepository` (read only to client), `SecurityProposalRepository` (backend only), plus `AuthGateway`, `Clock`, `IdGenerator`, `TransactionRunner`, `NotificationPublisher`.

Every Group repository method requires `GroupContext`; MEMBER repair repository exposes `listAssigned(groupId, uid, page)` and has no generic list method available to Member use cases.

## Infrastructure concerns

Firebase Auth adapter, Firestore converters/runtime schemas, callable/HTTP backend, Admin SDK, transactions, server timestamps, index definitions, App Check/rate limiting, structured redacted logs, outbox/notification fanout, emulator/CI and environment bindings.

## UI concerns

Routes/components/forms/modals, view models, local form validation, loading/empty/error states, permission-based affordances, active Group selector, Notification Center, technician/manager/owner projections. UI visibility improves UX only; it never grants/denies authority.

## Aggregate transaction boundaries

- Repair status: Repair + new StatusHistory + Audit/outbox in one transaction.
- Assignment: Repair + Audit/outbox; notification delivered idempotently from outbox.
- Invitation accept: Invitation + Membership + Audit/outbox.
- Ownership execution: Group securityVersion + affected Membership(s) + Proposal + Audit/outbox.
- Customer and Repair are separate aggregates; no accidental customer upsert during ordinary repair create.
