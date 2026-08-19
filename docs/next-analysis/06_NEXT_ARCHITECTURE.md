# SmartRepair Target Architecture

## Architectural decision

Build a separate application with a Single Group UX and multi-tenant data/security model. The default screen may remember one active Group, but no repository or cache may operate without an explicit `groupId` and verified membership context.

```text
UI components / routes
        ↓ commands, query DTOs
Application use cases
        ↓ entities, policies, ports
Domain + permission engine
        ↓ repository interfaces
Firebase repositories ───── Trusted backend commands
        ↓                         ↓
Firestore/Auth              Admin SDK + transactions
```

Dependency direction points inward. UI never imports Firestore. Domain never imports Firebase. Critical commands never accept client-declared actor/role/owner truth.

## Central session and bootstrap

Session state:

```text
AuthSession { uid, authClaimsVersion }
UserProfile { uid, displayName, ... }
GroupSession {
  activeGroupId,
  membershipVersion,
  role,
  status,
  effectivePermissions,
  generation
}
```

Bootstrap:

```text
Auth state
→ load/create profile (recoverable independently)
→ list active membership summaries for current UID
→ choose explicit/saved group only if membership exists
→ GET exact membership and group
→ compute/verify effective permissions
→ increment session generation
→ start group-scoped queries
→ ready
```

No Personal Workspace is created implicitly. A user with no groups sees “create or accept invitation.” Every async response carries/captures generation; reducers discard responses from older generations. Group switch first cancels subscriptions, clears all group-scoped stores and pending commands, increments generation, then loads new state.

## Domain design

| Concept | Kind | Core invariants / responsibility |
|---|---|---|
| User | Entity | Firebase UID identity; profile not group authorization |
| Group | Entity | tenant lifecycle/status/settings; no single authoritative owner field |
| Membership | Entity | `(groupId, uid)`, role, status, permission overrides, version |
| Role | Value object | OWNER/MANAGER/MEMBER only |
| Capability | Value object | namespaced permission string; protected marker |
| EffectivePermissionPolicy | Domain service | baseline + allowed overrides; protected ceiling; grant subset |
| Invitation | Entity/state machine | targetUid, offeredRole, permissions, expiry, status, nonce/version |
| Notification | Entity | recipient UID, event, read state, group/target reference |
| Repair | Entity | group-scoped work; customerId; assignment; status; version; archive state |
| Customer | Entity | stable customerId and PII; Owner-managed, Manager-readable |
| Assignment | Value object/event | assignedToUid/by/at; validated active group member |
| RepairStatus | Value object | allowed enum/transitions |
| StatusHistory | Append-only entity/event | exact from/to, actor, note, server time, repair version |
| ReferenceData | Entity | group-defined options and archive state |
| AuditEvent | Append-only security/business event | actor, group, action, target, before/after, server time, proposal |
| SecurityProposal | Entity/state machine | type, snapshot owners, approvals, target acceptance, expiry, executedAt |
| OwnershipApproval | Entity | proposalId + ownerUid unique approval, decision/time |
| ChangeRepairStatus | Application use case | authorize, concurrency check, write repair/history/audit atomically |
| AssignRepair | Application use case | validate target membership, update, notify, audit |
| ExecuteSecurityProposal | Backend use case | verify snapshot/quorum/acceptance/current safety, transact, audit |
| Repositories | Ports | explicit group-scoped reads/writes and safe projections |
| Firebase adapters | Infrastructure | Auth, Firestore converters, backend callable endpoints |
| View models/forms/modals | UI concern | no permission truth or Firestore schema logic |

## Candidate Firestore schema

```text
/users/{uid}                                  # private profile
/users/{uid}/notifications/{notificationId}  # recipient-only projection

/groups/{groupId}                             # tenant metadata, status, schemaVersion
/groups/{groupId}/members/{uid}               # role/status/overrides/version
/groups/{groupId}/invitations/{invitationId}  # targetUid, expiry, nonce/state

/groups/{groupId}/repairs/{repairId}          # technician-safe work document
/groups/{groupId}/repairs/{repairId}/statusHistory/{historyId}
/groups/{groupId}/customers/{customerId}      # PII vault
/groups/{groupId}/referenceData/{referenceId}
/groups/{groupId}/auditEvents/{eventId}
/groups/{groupId}/securityProposals/{proposalId}
/groups/{groupId}/securityProposals/{proposalId}/approvals/{ownerUid}
```

Repair technician-safe fields may include `repairNumber`, `device`, `issue`, `status`, `assignedToUid`, timestamps, version, archive fields, and opaque `customerId`. Do not copy phone/email/address/customer note into the repair document readable by Member. If technicians need a label, store a deliberately non-PII work alias after privacy review.

Customer fields include stable random `customerId`, name, normalized phones, email, address, notes, archived metadata, created/updated actor and server times, version. Phone is searchable data, not identity or document key.

## Group isolation and query contracts

Security pipeline:

```text
authenticated UID
→ explicit group path
→ active membership at /groups/{group}/members/{uid}
→ role + effective permissions
→ resource predicate
→ action field/schema predicate
```

- OWNER/MANAGER group repair query: group subcollection with `archived == false` and approved ordering.
- MEMBER query: `where("assignedToUid", "==", uid)` plus archive/status constraints. Rules require `resource.data.assignedToUid == request.auth.uid` for reads; never load all then filter.
- Customer repository is inaccessible to MEMBER. OWNER write; OWNER/MANAGER read; Rules enforce.
- Cross-group resource IDs never authorize access; all paths and backend inputs include groupId and backend re-reads membership.

## Permission model

Example baselines:

| Capability | OWNER | MANAGER | MEMBER default |
|---|:---:|:---:|:---:|
| `repair.group.view/create/assign/group.status.update` | ✓ | ✓ | — |
| `repair.edit/archive` | ✓ | policy/— | — |
| `repair.assigned.view/assigned.status.update` | ✓ | ✓ | ✓ |
| `customer.view` | ✓ | ✓ | — |
| `customer.manage` | ✓ | — | — |
| `team.view/invite/remove` | ✓ | ✓ | — |
| `member.role.promote_to_manager` | ✓ | ✓ | — |
| `member.permission.manage` | ✓ | ✓ within grant subset | — |
| `analytics.view` | ✓ | ✓ | — |
| `audit.view`, `reference.manage` | ✓ | target decision | — |
| `ownership.*`, `owner.manage`, `group.delete`, `security.critical.manage` | ✓ protected | — | — |

Member overrides can add ordinary capabilities such as `repair.create` or limited group view if product-approved, but cannot add protected capabilities. Manager mutation policy verifies actor ≠ target, target not OWNER, actor not editing self, offered role only MEMBER/MANAGER as allowed, requested grants are non-protected and a subset of actor’s grantable effective capabilities.

## Multiple owners and trusted security workflow

Owners are equal active OWNER memberships. No super/primary owner. `Group.ownerUid` is not authorization truth.

```text
Create proposal (trusted backend)
→ snapshot requiredOwnerIds and ownerSetVersion
→ collect unique approvals from those exact UIDs
→ collect target acceptance when adding/transferring owner
→ verify unexpired/pending/non-replayed
→ verify target still active member
→ verify required owners still eligible and policy for owner-set drift
→ atomic membership mutations + proposal executed + authoritative audit
```

For multiple owners, required approval is unanimous over the snapshot. For a sole owner adding/transferring, current owner approval plus target acceptance is sufficient. Snapshot is immutable; never recompute quorum on each request.

Edge rules:

- Unique approval document ID `{ownerUid}` prevents duplicate votes; backend transaction rejects changed decision/replay.
- Proposal has `expiresAt`, `nonce`, `status`, `version`, `executedAt`; only pending/unexpired executes once.
- If owner set/version changes after snapshot, safest default is invalidate proposal and require a new snapshot; document this policy.
- Never remove the last owner or allow zero active owners.
- Removing/transferring owner cannot proceed if target inactive/no longer member.
- Concurrent proposals lock/check `group.securityVersion` in one transaction; only one compatible mutation commits.
- Group delete becomes soft `deletionPending` then scheduled backend deletion after retention/export; unanimous approval.

## Client-safe vs backend-required

| Client safe under strict Rules | Trusted backend required |
|---|---|
| Read own profile/notifications | Firebase Auth user disable/delete/custom claims |
| Read group/member summary allowed by capability | Owner add/remove/transfer |
| Query allowed repair projection | Security proposal create/execute/quorum |
| Create ordinary repair if policy allows | Critical role/security policy mutation |
| Update assigned status through constrained use case | Group deletion |
| Mark own notification read | Authoritative security audit/fanout |
| Non-sensitive reference reads | Invitation acceptance if it grants membership/role |
| Export request initiation | Subscription/entitlement enforcement |

## Status, assignment, audit and archive

- `changeRepairStatus` reads current repair in a transaction, checks `version`, membership and assigned/group capability, transition policy and note, then updates repair and creates history + audit with server time. Retry only on transaction conflicts; idempotency key prevents double-submit.
- `assignRepair` re-reads target active membership in the same trusted transaction/use case, checks group equality and version, writes assignment, notification, audit. Removal/deactivation must handle assigned open repairs explicitly.
- Audit is distinct from status history. Target fields: `actorUid, groupId, action, targetType, targetId, before, after, createdAt(server), proposalId, requestId`. Critical audit is backend-only; append-only Rules.
- Repairs/customers use `archived, archivedAt, archivedByUid, version`. No client hard delete. Retention/purge is backend policy.

## Invitations and notification center

Registered-user search returns privacy-limited results and uses UID as identity; email is display/search only. Invitation uniqueness should be enforced by deterministic active key or backend transaction `(groupId,targetUid,pending)`. Validate existing active membership, target status, expiry, inviter grant scope, offered role, protected capability exclusion, and idempotent accept/decline. Events generate recipient notifications for invitation, assignment, role/permission change, ownership actions, and security events.

## Validation, errors, cache

- Runtime schemas at repository boundary reject unknown/invalid fields and carry `schemaVersion`.
- Central errors: Auth, PermissionDenied, MembershipInactive, Validation, Conflict/StaleVersion, NotFound, Network, BackendRequired, Integrity.
- Store only minimal group-scoped DTOs in memory; key every cache by groupId and membership/session generation. Do not persist Customer PII unless an explicit encrypted/offline policy is approved.

## Test strategy

| Layer | Required coverage |
|---|---|
| Unit/domain | statuses, permission composition, protected capabilities, owner quorum/state machines |
| Permission matrix | unauthenticated, Owner, Manager, Member, inactive, missing profile/member, multi-group |
| Repository | query constraints, schema converter, stale generation, transaction conflicts |
| Rules emulator | allow/deny reads/writes/queries and exact schemas |
| Backend | Auth admin, proposals, expiry/replay/concurrency, last-owner safety, audit |
| Integration | register/login/group switch/invite/repair/customer/assignment/status |
| Regression/manual | legacy migration samples, exports, scanner/camera, responsive UI |

Mandatory negative tests: Member cannot read Customer or another member repair; Manager cannot edit Customer, touch Owner, self-grant, or grant protected capability; cross-group read/write fail; inactive denied; duplicate/expired invitation fail; ownership unanimous quorum/last owner/replay enforced.
