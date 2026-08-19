# Invitation and Notification Design

## Normal invitation

Normal invitation grants MEMBER or MANAGER Membership; it can never grant OWNER. Target identity is registered User UID. Search is exact normalized-email only through rate-limited, App-Check protected backend; an exact match returns only UID, displayName and masked email.

Invitation fields and locks are defined in Data Model. Offer is immutable after create; change requires cancel+new invite. Invitation expires exactly 7×24 hours after server creation.

## Create flow

`SearchRegisteredUser → InviteMember` backend verifies inviter ACTIVE same-Group and capability/ceiling; target exists, is not active member; offered role/permissions valid; deterministic target lock has no unexpired pending invite. Transaction creates Invitation, lock, Audit and notification outbox. Email is display only.

Manager cannot offer OWNER, protected/non-delegable grants, grant self, or grant capability outside delegation ceiling. Owner normal invitation also cannot offer OWNER; ownership uses proposal.

## Accept/decline/cancel

Accept backend transaction validates target UID, PENDING/unexpired/version/lock, target not active member, offer still valid under current policy. It creates ACTIVE Membership, updates invitation ACCEPTED, clears lock, writes Group summary, Audit/outbox. Replay with same request returns prior result; different/repeated invalid request conflicts. Decline updates DECLINED/clears lock/audits. Owner/Manager cancel follows ceiling and pending state. Cleanup backend marks expired and clears locks.

Failure cannot create accepted-without-membership or membership-without-audit. Notification delivery may retry via outbox without repeating mutation.

## Ownership invitation/proposal

Ownership action is SecurityProposal with required owner snapshot and target acceptance. It generates `OWNERSHIP_INVITATION` for target and `OWNERSHIP_APPROVAL_REQUEST` for snapshot owners. Normal Invitation endpoints reject OWNER role. Proposal expiry/quorum/replay rules apply independently.

## Notification schema and behavior

Types: `GROUP_INVITATION`, `ASSIGNMENT`, `ROLE_CHANGED`, `PERMISSION_CHANGED`, `OWNERSHIP_INVITATION`, `OWNERSHIP_APPROVAL_REQUEST`, `SECURITY_EVENT`. Backend creates recipient-only safe payload with target/action reference, dedupeKey and server time. Customer PII, permission snapshots, proposal nonce and confidential audit before/after are forbidden.

Recipient lists own notifications ordered/paginated and may set/clear `readAt` only. Action resolution re-fetches authoritative resource; a stale notification never grants access. Role/member removal may leave a generic security notification but Group details are hidden if authorization is gone.

## Duplicate/race cases

- Same Group+target pending invitation: deterministic lock/transaction rejects or returns existing.
- Existing active member: reject.
- Accept/decline twice: idempotent same request; state conflict otherwise.
- Expired/cancelled invite: no membership.
- Role/policy changed after issue: accept revalidates; invalid offer is invalidated.
- Concurrent invite creators: one lock wins.
- Concurrent removal/accept: membership/version transaction decides; no partial state.
- Email change/reuse: irrelevant to UID identity.

## Notification delivery

Firestore outbox in domain transaction → backend worker creates notification with deterministic dedupe ID → optional email/push later. Delivery status is operational metadata; domain commit does not roll back solely because push/email fails.

## Phase 2.5 retention lock

Ordinary notifications retain 180 days; Ownership/Security notifications 365 days. Recipient may mark read/archive but not hard-delete. Backend cleanup applies after retention. Audit and SecurityProposal history, not notification, is authoritative evidence.
