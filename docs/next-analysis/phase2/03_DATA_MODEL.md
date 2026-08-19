# Candidate Firestore Data Model

All documents have strict allowed keys, `schemaVersion: number`, server timestamps, and converters. IDs are random/opaque unless stated. `groupId` in a document is defense-in-depth and immutable; path remains tenant authority.

## Paths and documents

### `/users/{uid}` — private profile

`uid:string! immutable`, `displayName:string!`, `emailLower:string!` (self/backend maintained), `photoUrl:string?`, `locale:string?`, `onboardingState:'PROFILE_REQUIRED'|'READY'!`, `createdAt:timestamp! immutable server`, `updatedAt:timestamp! server`, `schemaVersion:number!`. Self get/update constrained fields; no role.

### `/userGroupSummaries/{uid}/groups/{groupId}` — membership discovery projection

Backend-maintained: `groupId!`, `groupName!`, `role:OWNER|MANAGER|MEMBER!`, `membershipStatus!`, `membershipVersion:number!`, `groupStatus!`, `updatedAt!`. Recipient-only read. This avoids insecure collection-group discovery and contains no Group business data.

### `/groups/{groupId}`

`name:string!`, `status:'ACTIVE'|'SUSPENDED'|'DELETION_PENDING'!`, `securityVersion:number!`, `settingsVersion:number!`, `createdByUid:string! immutable`, `createdAt! immutable server`, `updatedAt! server`, `deletionRequestedAt?`, `schemaVersion!`. No `ownerUid`; owner authority comes only from active OWNER memberships. Client cannot write security/deletion fields.

### `/groups/{groupId}/members/{uid}`

`uid:string! immutable`, `groupId:string! immutable`, `role:Role!`, `status:'ACTIVE'|'SUSPENDED'|'REMOVED'!`, `allow:string[]!`, `deny:string[]!`, `membershipVersion:number!`, `displayNameSnapshot:string!`, `joinedAt:timestamp! immutable`, `updatedAt:timestamp!`, `updatedByUid:string!`, `removedAt?`, `schemaVersion!`. Email is omitted from roster projection unless separately justified. Role/overrides/security fields mutate only through validated backend for management commands.

### `/groups/{groupId}/customers/{customerId}` — PII vault

`groupId! immutable`, `displayName:string!`, `phones:map[]?`, `emails:map[]?`, `address:map?`, `notes:string?`, `searchTokens:string[]?` (backend generated), `archived:boolean!`, `archivedAt?`, `archivedByUid?`, `version:number!`, `createdByUid! immutable`, `createdAt! immutable server`, `updatedByUid!`, `updatedAt! server`, `schemaVersion!`.

Sensitive: every business field except IDs/version/archive metadata. MEMBER has no get/list. Search tokens must not be exposed to Member and must avoid plaintext global indexes. OWNER write; OWNER/MANAGER read.

### `/groups/{groupId}/repairs/{repairId}` — technician-safe

Required: `groupId:string immutable`, `repairNumber:string immutable`, `device:{category,brand?,model?,color?}`, `issueSummary:string`, `status:RepairStatus`, `assignedToUid:string?`, `archived:boolean`, `version:number`, `createdByUid:string immutable`, `createdAt:timestamp immutable server`, `updatedByUid:string`, `updatedAt:timestamp server`, `schemaVersion:number`.

Member-safe Repair stores no customer identifier, full serial/IMEI, price, warranty or costs. It may store backend-derived `serialMasked`, technical notes and non-commercial parts/work descriptions; free text is validated/redacted for Customer PII. Restricted values live in `/repairPrivate/{repairId}`.

### `/groups/{groupId}/repairPrivate/{repairId}` — optional restricted companion

OWNER/MANAGER read; backend/OWNER-authorized writes: `customerId!`, `customerIntakeNote?`, `fullSerial?`, `estimateMinor?`, `warrantyTerms?`, `partCosts?`, `version!`, timestamps, schemaVersion. MEMBER denied; it prevents field-level confidentiality assumptions.

### `/groups/{groupId}/repairs/{repairId}/statusHistory/{historyId}`

`groupId!`, `repairId!`, `fromStatus!`, `toStatus!`, `note?`, `actorUid!`, `actorRole!`, `repairVersion:number!`, `requestId:string! immutable`, `createdAt:timestamp! server`, `schemaVersion!`. Create only inside centralized command; no update/delete. MEMBER reads only if parent repair assigned to self.

### `/groups/{groupId}/invitations/{invitationId}`

`groupId!`, `targetUid!`, `targetDisplaySnapshot!`, `offeredRole:MANAGER|MEMBER!`, `offeredAllow:string[]!`, `offeredDeny:string[]!`, `status:'PENDING'|'ACCEPTED'|'DECLINED'|'CANCELLED'|'EXPIRED'!`, `invitedByUid!`, `createdAt!`, `expiresAt!`, `respondedAt?`, `respondedByUid?`, `version!`, `idempotencyKey!`, `schemaVersion!`. Offer/target/time immutable; backend writes state.

Duplicate prevention uses backend transaction plus deterministic lock `/groups/{groupId}/invitationLocks/{targetUid}` containing active invitation ID/expiry. Lock is backend-only.

### `/users/{uid}/notifications/{notificationId}`

`recipientUid! immutable`, `type!`, `groupId?`, `actorUid?`, `targetType?`, `targetId?`, `title!`, `bodySafe!`, `actionRef?`, `readAt?`, `archivedAt?`, `createdAt! server`, `expiresAt?`, `dedupeKey!`, `schemaVersion!`. Backend create; recipient get/list and update only `readAt` and `archivedAt`. No Customer PII/security snapshots.

### `/groups/{groupId}/auditEvents/{eventId}`

`groupId!`, `actorUid!`, `actorRole!`, `action!`, `targetType!`, `targetId!`, `before:map?`, `after:map?`, `requestId!`, `proposalId?`, `source:'BACKEND'!`, `createdAt! server`, `schemaVersion!`. Append-only. Critical/security event creation backend-only. Sensitive before/after values require redaction policy.

### `/groups/{groupId}/securityProposals/{proposalId}`

`groupId!`, `type:'ADD_OWNER'|'REMOVE_OWNER'|'TRANSFER_OWNERSHIP'|'DELETE_GROUP'|'CRITICAL_POLICY_CHANGE'!`, `status:'PENDING_APPROVALS'|'PENDING_TARGET_ACCEPTANCE'|'APPROVED_COOLING_OFF'|'DISPUTED'|'REJECTED'|'EXPIRED'|'INVALIDATED'|'CANCELLED'|'EXECUTED'!`, `createdByUid!`, `targetUid?`, `payloadHash!`, `payload:map!`, `requiredOwnerIds:string[]! immutable`, `ownerSetVersion:number! immutable`, `requiresTargetAcceptance:boolean!`, `targetAcceptedAt?`, `expiresAt!`, `nonceHash!`, `version!`, `executedAt?`, timestamps, schemaVersion. Backend writes.

Approvals: `/securityProposals/{proposalId}/approvals/{ownerUid}` with immutable `ownerUid`, `decision:APPROVE|REJECT`, `proposalVersion`, `payloadHash`, `createdAt`, `requestId`, schemaVersion. One owner/one document; backend-only create/update policy.

### Reference/outbox

`/groups/{groupId}/referenceData/{referenceId}`: type/name/value/order/archive/version/audit metadata. OWNER manage; roles may read per capability.  
`/groups/{groupId}/outbox/{eventId}`: backend/transaction-created delivery record; backend-only.

## Repair statuses

Locked enum: `CUSTOMER_APPROVAL_PENDING`, `WAITING`, `ASSIGNED`, `IN_PROGRESS`, `WAITING_PARTS`, `DONE`, `CANCELLED`. Transition graph follows [15_DECISION_LOCK.md](15_DECISION_LOCK.md); reopening DONE/CANCELLED requires OWNER/MANAGER, reason and Audit.

## Required indexes

- Repairs: `(assignedToUid ASC, archived ASC, updatedAt DESC)` for MEMBER.
- Repairs: `(archived ASC, updatedAt DESC)` and optional `(status ASC, archived ASC, updatedAt DESC)` for OWNER/MANAGER.
- Customers: `(archived ASC, updatedAt DESC)`; approved search strategy may require backend search service, not global plaintext exposure.
- Invitations: `(targetUid ASC, status ASC, expiresAt DESC)` and `(status ASC, expiresAt ASC)` backend cleanup.
- Notifications: `(recipientUid implicit path, readAt ASC, createdAt DESC)` and `createdAt DESC`.
- Audit: `(createdAt DESC)`, optional `(targetType,targetId,createdAt DESC)`.
- Members: `(status ASC, role ASC, displayNameSnapshot ASC)`.
- Proposals: `(status ASC, expiresAt ASC)`.

Every query must be tested against Rules; an index does not grant access.

## Immutability and timestamp policy

Path identity, `groupId`, entity IDs, creator, createdAt, invitation target/offer, proposal snapshot/payload hash/owner version are immutable. All authority/version/timestamps used for security are backend/server-generated. Client display timestamps are never authoritative.

## Phase 2.5 schema additions

`/groups/{groupId}/customerIntakeDrafts/{draftId}` is OWNER/MANAGER restricted PII with `repairId`, proposed Customer fields, `status: SUBMITTED|APPROVED|REJECTED`, immutable submitted payload hash, submit/response actors and server times, version and schemaVersion. MANAGER may submit but cannot edit after submit; OWNER approval transaction creates Customer and Repair private link. Group-local `/counters/repairNumber` is backend-only.
