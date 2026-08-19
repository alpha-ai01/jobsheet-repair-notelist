# Firestore Rules Design Contracts

This is a contract, not production Rules code.

## Common predicates

`signedIn`, `self(uid)`, `groupExistsActive(groupId)`, `membership(groupId)`, `activeMember(groupId)`, `roleIs`, `hasCapability`, `isOwner`, `sameGroupField`, `validSchemaVersion`, `keysExactly/keysOnly`, `immutableFields`, `serverCreated/serverUpdated`, `assignedToSelf`, `nonArchived`, and `backendPrincipal` where backend direct writes are used. Prefer backend Admin SDK plus application validation for critical commands; Rules remain deny-by-default for clients.

Rules cannot safely derive complex arbitrary custom permission logic without cost/limits. Membership contains normalized validated effective or override fields only if needed for Rules. Backend owns their mutation. The exact representation requires emulator cost testing; unknown/missing permission denies.

## Collection contracts

| Path | get/list | create | update | delete |
|---|---|---|---|---|
| `/users/{uid}` | self only | self UID, exact safe profile keys/server time or backend | self only safe profile fields; no authority | deny client |
| user Group summaries | self only; query path already UID | backend only | backend only | backend only |
| `/groups/{g}` | active member; safe metadata | backend CreateGroup | OWNER only non-critical allowed keys; security/status backend | deny client |
| members | active team-view for roster, own doc always; list query contract defined | backend only | backend only | backend only |
| customers | active OWNER/MANAGER with `customer.view`; Member get/list denied | OWNER/backend and exact schema | OWNER/customer.manage, immutable group/creator/version progression | deny; archive update only |
| repairs | OWNER/MANAGER group capability; MEMBER get only assigned; list only query constrained assignedToUid=self | active actor with create capability, exact technician-safe keys, creator=self/server time | only command-specific exact fields; general edit OWNER; version increments | deny; archive update OWNER |
| statusHistory | same visibility as parent repair | centralized command; actor/time/request/version matches post-repair | deny | deny |
| repairPrivate | OWNER/MANAGER permitted read; Member deny | OWNER/backend | OWNER/backend | deny |
| invitations/locks | target self or inviter/team permitted minimal read | backend only | backend only; client cannot accept final state directly | backend only |
| notifications | recipient self; list within own path | backend only | recipient changes `readAt` only | deny/client archive decision later |
| referenceData | active member with view | OWNER/manage capability exact schema | OWNER/manage capability/version/archive | deny |
| auditEvents | OWNER/audit.view | backend only in V1 | deny | deny |
| securityProposals/approvals | active OWNER involved; target gets limited proposal projection if acceptance required | backend only | backend only | deny |
| outbox | deny client | backend/transaction only | backend worker only | backend retention only |
| any unknown path | deny | deny | deny | deny |

## Query contracts

- MEMBER repair list request must include `assignedToUid == request.auth.uid`, `archived == false`, approved order/limit. Rules evaluate every result and reject unconstrained query.
- OWNER/MANAGER repair list requires active membership and `repair.group.view`; archive/status filters and maximum page size.
- Customer list only OWNER/MANAGER, limit/order; search goes through approved Group-scoped mechanism.
- Notification query is under `/users/{uid}` with bounded limit/order.
- No cross-Group collection-group business queries from clients. Membership discovery uses recipient-only summary path.
- All client lists are bounded to maximum 50 documents per page.

## Schema/immutable contracts

Every create asserts exact required/optional keys, types, enum values, size limits, path `groupId`, schemaVersion, Auth-derived actor and server timestamp. Updates use affected-key allow-lists per command, immutable identity/creator/createdAt/group/customer link where specified, monotonic `version == old+1`, and server `updatedAt`.

Rules must never trust client role, effective permission, actor UID, owner snapshot, audit before/after, approval quorum, subscription/security version, or server timestamp sentinel without equality to request time/validated backend.

## Membership and invalidation

SUSPENDED/REMOVED immediately fails `activeMember`. Role/permission writes are backend-only and increment membershipVersion plus summary projection. Client listeners clear session on mismatch; Rules independently deny stale authority.

## Rules test gate

For every matrix row test get and list separately, query constraint success/failure, create/update/delete, extra/missing/wrong-type fields, immutable mutation, actor forgery, timestamp forgery, cross-Group path, inactive/missing membership, stale version, protected grant and unknown collection. Emulator query success must prove Rules/query compatibility before repository code exits a phase.

## Open technical decision

All business mutations, including Repair status and assignment, use trusted backend commands in V1. Direct client Firestore business writes are denied.

## Phase 2.5 Rules lock

CustomerIntakeDraft get/list is OWNER/MANAGER only; submit is backend, post-submit client mutation denied, OWNER approval backend-only. Member-safe Repair has no customerId; repairPrivate contains the Customer link and is MEMBER-denied. Direct client business writes are denied; page limit is 50.
