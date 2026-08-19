# Repair and Customer Security Design

## PII boundary

Customer is a separate aggregate/document vault. Member-safe Repair contains no Customer identifier or PII; restricted `repairPrivate` contains `customerId` and Manager+ data. Firestore has document-level access, so fields that Member must not read cannot coexist in a Member-readable document. Optional commercial/full-serial fields use restricted `repairPrivate` companion.

## Views

| View | Query/data | Allowed commands |
|---|---|---|
| Technician MEMBER | `repairs where assignedToUid==uid && archived==false`; technician-safe fields; assigned history | assigned status only; any override explicitly permission/resource tested |
| MANAGER | Group repairs; restricted repair private; Customer read | create, assign, status; no Customer write/general repair edit/archive by locked default |
| OWNER | Group repairs, private companion, Customer vault, audit | create/edit/assign/status/archive; Customer manage |

No view fetches Customers for MEMBER. Repair list presentation uses repair number/device/issue/status, never a client-side join to Customer PII.

## Create repair

Input validates Group context, actor capability, existing Customer ID, technician-safe schema, optional assignee. OWNER may create Customer separately. MANAGER selects an existing Customer or submits immutable-after-submit CustomerIntakeDraft; the Repair remains CUSTOMER_APPROVAL_PENDING until OWNER approval. Backend writes immutable repairNumber/creator/server time/version=1 to Member-safe Repair, writes customerId only to restricted repairPrivate, and creates Audit/outbox. Repair number is allocated by a backend transaction using a Group-local monotonic counter; Firestore Repair ID remains random.

## Edit and archive

General EditRepair is OWNER baseline with affected-field allow-list and optimistic version. Assignment/status/customer link are not general edit fields. Customer reassociation, if allowed, is separately audited. ArchiveRepair sets `archived=true`, actor/time, increments version and audit; unarchive policy is OWNER with reason. Hard purge is backend retention only.

Customer update/archive is OWNER-only, versioned and audited. Phone normalization/search never merges identities automatically; suspected duplicates may be flagged but are never auto-merged in V1; merge implementation is deferred.

## Assignment

`AssignRepair(groupId,repairId,targetUid,expectedVersion,requestId)`:

1. Authenticate and re-read actor Membership/capability.
2. Read Repair and target Membership in transaction; Group match, ACTIVE target, non-archived repair.
3. Validate eligible role/permission and expected version; optionally reject unchanged assignment idempotently.
4. Update assignment/version/time; write Audit and outbox Notification.
5. If member is suspended/removed, membership command must list open assignments and require reassignment/unassign policy before completion.

## Status and history

Only `ChangeRepairStatus` mutates status. It re-reads current Repair, validates actor resource scope, assignment for MEMBER, expected version, transition/note, then atomically updates Repair and creates StatusHistory + Audit/outbox with same request ID/server time. Concurrent command returns `CONFLICT`; idempotent replay returns prior result.

History read follows parent visibility: OWNER/MANAGER group repair; MEMBER only currently assigned repair. A former assignee loses Repair and History access immediately after reassignment.

Candidate transition graph:

`WAITING→ASSIGNED|IN_PROGRESS|CANCELLED`; `ASSIGNED→IN_PROGRESS|WAITING_PARTS|DONE|CANCELLED`; `IN_PROGRESS↔WAITING_PARTS`; `IN_PROGRESS|WAITING_PARTS→DONE|CANCELLED`. Reopen DONE/CANCELLED requires OWNER/MANAGER, reason and Audit. This transition graph is locked for V1.

## Confidentiality tests

Direct Customer get, list, guessed ID, collection query, cross-Group path and offline cache access all fail for MEMBER. Member repair DTO/schema contains none of the forbidden PII fields. Manager Customer create/update/archive fails. Assignment/status cannot be used to change unrelated/private fields.
