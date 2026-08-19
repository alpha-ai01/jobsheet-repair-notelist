# SmartRepair Product Specification

Status: Phase 2 blueprint; Clean Rebuild; no legacy implementation reuse.

## Product boundary and invariants

SmartRepair is a multi-tenant repair-management system presented as a single active-Group UX. Firebase Authentication proves identity; only an active Group Membership authorizes Group resources. There is no global `admin/user` shop role, implicit Personal Workspace, client-side security authority, or cross-Group query.

Non-negotiable invariants:

1. Every Group read/write carries an explicit `groupId`; repositories reject a missing Group context.
2. Membership role and permissions are scoped to `(groupId, uid)` and never inherited across Groups.
3. OWNER, MANAGER, MEMBER are the only roles. Multiple OWNERs are equal.
4. MEMBER reads only assigned repairs and no Customer document/PII. Server query and Rules enforce this before data reaches client.
5. Customer master: OWNER read/write; MANAGER read-only; MEMBER deny.
6. Security-critical mutations are finalized only by trusted backend transactions and append authoritative audit.
7. Group switch/logout clears scoped caches and pending commands before new data renders.

## Authentication and onboarding

- Accounts originate through Register only. Login uses Firebase Email/Password Authentication.
- Registration creates Auth identity, then an idempotent self-profile. It does not create a Group automatically.
- Authenticated user with no Membership sees onboarding: create Group or await/accept invitation.
- Login is allowed before verification only into a restricted verification/profile-recovery screen. Verified email is required before Group creation, invitation send/accept, or any Group business access.
- Password reset is available before and after login. Auth errors never reveal whether another email exists beyond Firebase-safe behavior.

## Groups, roles, membership

- User can belong to many Groups with independent roles/overrides.
- Membership states: `INVITED` is represented by Invitation, not an active Membership; Membership status is `ACTIVE | SUSPENDED | REMOVED` (REMOVED may be retained tombstone).
- OWNER: all repairs/customer management/team/role/permission/analytics/reference/audit/ownership security.
- MANAGER: all Group repairs, create, assign, status; Customer view only; team view; invite/remove eligible non-owner; manage eligible Member permissions; MEMBER→MANAGER. No general repair edit, archive, reference management, audit, Owner/security operations by default.
- MEMBER: assigned repair view/status/history only. OWNER may add only `reference.view` in V1. Customer access remains forbidden.
- Suspending/removing a member immediately invalidates authorization; open assignments require reassignment decision.

## Repair lifecycle

- Create → view → OWNER edit → assign/reassign → centralized status transitions/history → archive.
- OWNER sees/edits all. MANAGER sees all, creates, assigns and changes status but cannot silently use these commands as general edit. MEMBER sees/statuses assigned only.
- Repair documents are technician-safe and contain no Customer identifier or PII. The restricted repairPrivate companion holds customerId and Manager+ fields.
- Status command atomically checks membership, resource scope, transition, version/idempotency and writes Repair + StatusHistory + Audit.
- Archive is soft delete (`archived`, actor/time); OWNER-only baseline. Hard purge is retention/backend policy.

## Customer lifecycle

- Stable generated `customerId`; phone/email are attributes/search data, never identity.
- OWNER creates/edits/archives. MANAGER views. MEMBER cannot get/list/query Customer paths.
- MANAGER creating a repair may select an existing Customer. For a new Customer, MANAGER submits an immutable-after-submit CustomerIntakeDraft; the Repair remains CUSTOMER_APPROVAL_PENDING until OWNER atomically approves Customer creation.

## Assignment

Assign command verifies actor capability, current Repair version, target UID, ACTIVE Membership in the same Group, and eligible assignee role/status. One transaction writes assignment/version, authoritative Audit and outbox/Notification. Concurrent assignment yields `CONFLICT`, not silent last-write-wins.

## Invitations and notifications

- OWNER/MANAGER searches a registered SmartRepair user through a privacy-limited backend endpoint; UID is target identity; email is display/search only.
- Invitation offers MEMBER or MANAGER subject to actor ceiling and optional allowed permissions. MANAGER cannot offer OWNER/protected/non-delegable permissions.
- Create prevents active member and duplicate pending invitation; invitations expire. Accept/decline is idempotent and backend-transactional; acceptance creates Membership and Audit, then Notification state changes.
- Notification events: Group Invitation, Assignment, Role Changed, Permission Changed, Ownership Invitation, Ownership Approval Request, Security Event.
- Ownership invitation/proposal is separate from ordinary Group invitation.

## Ownership and critical security

Critical actions: add/remove/transfer Owner, Group deletion, critical security policy change. Flow: backend creates SecurityProposal → immutable `requiredOwnerIds` snapshot → unanimous unique approvals → target acceptance when applicable → revalidation → atomic execution → security Audit.

- Multiple owners: every snapshot owner approves add/transfer/delete/critical policy. Remove Owner excludes the target and requires every remaining active snapshot Owner, with 24-hour cooling and dispute freeze.
- Sole owner add/transfer: current owner approval plus target acceptance.
- Never remove last owner; target must remain ACTIVE member; expired/replayed/owner-set-drift proposals fail.
- Group deletion is two-stage soft deletion then scheduled purge after retention/export.

## Audit and errors

StatusHistory explains repair transitions; Audit records security/business accountability. Critical Audit is backend-only and append-only. Central error codes: `AUTH_ERROR`, `PERMISSION_DENIED`, `MEMBERSHIP_REQUIRED`, `MEMBERSHIP_INACTIVE`, `VALIDATION_ERROR`, `NOT_FOUND`, `CONFLICT`, `NETWORK_ERROR`, `BACKEND_REQUIRED`, `INTEGRITY_ERROR`, `RATE_LIMITED`.

## Acceptance criteria

All role/resource negative tests pass; no Customer PII exists in Member-readable documents; every Group query has explicit scope; all critical commands are backend-only; stale session generations cannot commit/render; no critical/high Phase 1 finding remains untested.

## Phase 2.5 lock

All implementation decisions are resolved by [15_DECISION_LOCK.md](15_DECISION_LOCK.md). Full serial/IMEI, price, warranty, Customer link and costs are MANAGER+ restricted; Member receives only masked serial last four where safe.
