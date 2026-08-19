# Architecture Decision Log

| ADR | Status | Decision | Reason / consequence |
|---|---|---|---|
| 001 | ACCEPTED | Clean rebuild in separate `SmartRepair` repository | Phase 1 debt/security makes repair equivalent to unsafe in-place rewrite |
| 002 | ACCEPTED | Layered UI→Application→Domain→Repositories→Firebase/backend | prevents UI/Firestore coupling and centralizes policy |
| 003 | ACCEPTED | Auth UID identity; no global shop role | separates authentication/authorization |
| 004 | ACCEPTED | Explicit multi-Group context; no Personal Workspace | independent role/data scope and simpler bootstrap |
| 005 | ACCEPTED | OWNER/MANAGER/MEMBER only | removes legacy global/admin hierarchy |
| 006 | ACCEPTED | Customer PII vault separate from technician-safe Repair | Firestore has no secure field-level hiding; Member must not receive PII |
| 007 | ACCEPTED | MEMBER assigned query at repository and Rules | client filtering is not authorization |
| 008 | ACCEPTED | Stable generated Customer ID; phone is attribute | avoids collisions/history misassociation |
| 009 | ACCEPTED | Role defaults + membership allow/deny + registry | supports custom ordinary permissions with fail-closed calculation |
| 010 | ACCEPTED | Protected and non-delegable capability metadata | blocks Manager/Member escalation and fixed Customer confidentiality conflict |
| 011 | ACCEPTED | Manager general repair edit/archive/reference/audit denied by default | requirements grant specific create/assign/status/customer-view actions only |
| 012 | ACCEPTED | Multiple equal OWNER Memberships; no ownerUid authority | required governance and no super owner |
| 013 | ACCEPTED | Critical security uses backend proposals, immutable owner snapshot and unanimity | closes client authority/race/replay paths |
| 014 | ACCEPTED | Owner-set drift invalidates proposal | never silently reduces quorum |
| 015 | ACCEPTED | Normal invitations UID-bound/backend-atomic; OWNER promotion separate | eliminates email/replay/partial membership defects |
| 016 | ACCEPTED | Central backend status/assignment commands | consistent version, history, audit, notification and idempotency |
| 017 | ACCEPTED | Append-only authoritative Audit distinct from StatusHistory | separate accountability and domain timeline |
| 018 | ACCEPTED | Soft archive; client hard delete denied | recovery/retention safety |
| 019 | ACCEPTED | Central session generation and clear-first switch/logout | prevents stale/cross-Group cache leakage |
| 020 | ACCEPTED | Strict runtime schemas and Rules affected-key/immutability contracts | prevents schema confusion/client-controlled security fields |
| 021 | ACCEPTED | Outbox for notifications | domain transaction remains atomic while delivery retries safely |
| 022 | ACCEPTED | Membership discovery through user-owned summary projection | avoids broad collection-group query and N+1 leakage |
| 023 | LOCKED | Verified email required for every Group action; login restricted before verification | closes abuse while preserving recovery UX |
| 024 | LOCKED | Invitation 7 days; SecurityProposal 72 hours | bounds stale grants/approvals |
| 025 | LOCKED V1/DEFERRED PURGE | soft archive; no hard purge V1; retention schedules in ADR-15 | fail-closed until legal review |
| 026 | LOCKED | immutable Manager CustomerIntakeDraft; Owner approval creates Customer/activates Repair | preserves protected customer.manage |
| 027 | LOCKED | Member gets masked serial only; full serial/IMEI/price/warranty/Customer link MANAGER+ | document-path confidentiality |
| 028 | LOCKED | V1 transition graph in ADR-15; final reopen requires MANAGER/OWNER reason | deterministic history tests |
| 029 | LOCKED | current assignment only; former assignee loses access | least privilege |
| 030 | LOCKED REMOVAL/DEFERRED RECOVERY | removal excludes target with remaining unanimity+coldown+dispute freeze; no V1 emergency bypass | safe governance boundary |
| 031 | LOCKED | exact normalized-email backend search only; minimal masked result, App Check/rate limit | prevents directory enumeration |
| 032 | DEFERRED | no Phase 3A/V1-core export; future OWNER-only backend/audited | avoids bulk leakage |
| 033 | LOCKED V1/DEFERRED MERGE | no auto-merge; backend Group counter for repair number; migration mapping deferred | prevents wrong identity/collision |

## Additional Phase 2.5 decisions

| ADR | Status | Decision | Reason / consequence |
|---|---|---|---|
| 034 | LOCKED | Manager cannot demote/remove another Manager | OWNER alone manages Manager targets |
| 035 | LOCKED | V1 Member grant is limited to reference.view by OWNER | preserves assigned/PII boundary |
| 036 | LOCKED | list max 50; all business mutations backend | query cost and atomic authorization |
| 037 | LOCKED | notifications 180d ordinary/365d security; no client delete | UX records distinct from Audit |
| 038 | DEFERRED | migration uses UID+explicit mapping manifest; no core compatibility | real data not available |

## Architecture readiness

Architecture, security, permission, data boundary, backend boundary and Phase 3A test gate are **LOCKED**. Deferred decisions have explicit fail-closed behavior and do not block Phase 3A. [15_DECISION_LOCK.md](15_DECISION_LOCK.md) is authoritative.
