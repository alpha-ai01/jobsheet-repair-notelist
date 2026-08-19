# Phase 1 Executive Summary

Audit date: 2026-08-15 UTC  
Repository: `jobsheet-repair-notelist`  
Branch/commit: `main` / `297f774`  
Boundary: static source audit and non-mutating test attempts only. No production source, Rules, Firebase data, or deployment was changed.

## Verdict

**PLAN 2 — CLEAN REBUILD** is recommended. Preserve verified business requirements, selected UX behavior, and migration knowledge; do not copy the monolithic implementation or its authorization model into SmartRepair.

The current system is a 6,924-line single-page `index.html` whose UI, mutable session state, authorization decisions, Firestore access, domain mutations, rendering, exports, and scanner lifecycle are coupled. Production Rules isolate workspace paths, but deliberately allow every active member to list every repair and customer. Repair documents embed customer name, phone, and notes. This directly conflicts with the SmartRepair target: a Member must see only assigned work and no Customer PII.

## Count baseline

Counts below use the auditable units in [02_FUNCTION_INVENTORY.md](02_FUNCTION_INVENTORY.md). “Production callable unit” includes named functions, window handlers, event/auth handlers, and anonymous callbacks with state/business/Firestore behavior; trivial pure `map/filter/sort/forEach` lambdas are recorded by callback family instead of being falsely presented as independent business features.

| Metric | Count |
|---|---:|
| Production callable units inventoried | 83 |
| Migration callable units | 3 |
| Firestore Rules helper functions across 3 versions | 40 |
| Test cases inspected | 86 |
| Test lifecycle hooks | 14 |
| Production Firestore call sites | 40 |
| Production Firestore operation classes | 29 |
| Features inventoried | 38 |

Recommendations are tags and may overlap (for example, a function may be both `REWRITE` and `SECURITY RISK`).

| Function recommendation | Count |
|---|---:|
| KEEP CONCEPT | 48 |
| REWRITE | 59 |
| MERGE | 9 |
| SPLIT | 12 |
| REMOVE | 4 |
| LEGACY | 8 |
| UNUSED | 1 |
| DUPLICATE | 13 |
| PARTIAL | 14 |
| BROKEN | 6 |
| SECURITY RISK | 25 |
| BACKEND REQUIRED | 9 |
| NEEDS VERIFICATION | 17 |

| Feature status | Count |
|---|---:|
| WORKING (source-complete; deployment still not independently verified) | 8 |
| PARTIAL | 17 |
| BROKEN | 3 |
| NOT IMPLEMENTED | 5 |
| BACKEND REQUIRED | 3 |
| UNKNOWN | 2 |
| **TOTAL FEATURES** | **38** |

## Critical security findings

1. **Customer PII disclosure to all active members.** `firestore.rules:286-317` permits any active workspace member to read every repair and customer. `index.html:5047-5199` lists all repairs, whose schema includes `customerName`, `phone`, `customerNote`, and IMEI (`index.html:4910-4947`), and `loadCustomers()` lists all customer documents (`index.html:5755-5810`). UI hiding cannot repair document-level disclosure.
2. **Member sees all members’ jobs.** `loadJobs()` has no `where("assignedTo", "==", uid)` constraint and Rules have no assigned-resource condition. JavaScript does not even filter by assignee. This violates both least privilege and the target technician view.
3. **Security-critical ownership model cannot support multiple owners safely.** Rules define Owner only when membership role is `owner` *and* the single `workspaces.ownerUid` equals the caller (`firestore.rules:33-37`). There is no proposal, owner snapshot, quorum, target acceptance, transaction, replay protection, or trusted backend.

## High security findings

1. Members may create/update Customer master data (`firestore.rules:315-327`); job creation also upserts a customer (`index.html:4960`). Target requires Manager read-only and Member no access.
2. Audit is client-authored and semantically forgeable: Rules bind `actorUid` and time but do not constrain action/target/before/after schema (`firestore.rules:438-445`). Several primary writes and audits are separate; `appendWorkspaceAudit()` swallows failure.
3. Invitation acceptance is GET → invitation UPDATE → membership CREATE → audit, not atomic (`index.html:3715-3840`); concurrent clicks/failures can leave accepted-without-membership or replayable states. No expiry or UID-bound target exists.
4. Group switching does not clear `allJobs`, `allCustomers`, `allUsers`, `teamMembersCache`, or pending state before async reload (`index.html:1978-2000`). Failed/overlapping loads can retain and render stale data from another group.
5. Assignment trusts cached member data and separately updates repair then audit (`index.html:4378-4460`); no atomic active-membership check at commit time, notification, or version precondition.
6. Manager/Member repair updates are over-broad. A Member may change PII and price within three hours (`firestore.rules:86-100`), not only assigned status; Manager updates lack an affected-field allow-list (`firestore.rules:103-121`).
7. Global `admin/user` and workspace `owner/admin/manager/member` models overlap. A workspace owner/admin can reach global-admin UI, but production `/users` Rules only allow self-read/self-update, so `loadUsers()` and `toggleUserActive()` are incompatible/broken.
8. Registration is non-atomic across Auth, profile, email verification, and later workspace bootstrap. Failure can leave an Auth account without complete app state; retry with the same email cannot recreate Auth cleanly.

Severity totals: **CRITICAL 3, HIGH 8, MEDIUM 12, LOW 6**. Full evidence and scenarios are in [08_SECURITY_AUDIT.md](08_SECURITY_AUDIT.md).

## Top architectural problems

- God-file and direct UI→Firestore coupling; no repository/use-case/domain boundary.
- Global mutable arrays and active-workspace state create race/stale-state hazards.
- Authentication, global profile role, workspace discovery, personal-workspace creation, membership, role, and initial data load are one fragile bootstrap chain.
- Security policy is expressed differently in UI helpers, three Rules versions, tests, and documentation.
- Customer identity is normalized phone number; repairs duplicate PII rather than reference stable `customerId`.
- Audit and status history integrity depend on client behavior.
- No explicit schema validation/versioning, error taxonomy, concurrency/version field, or trusted backend.
- No executable project test script; existing emulator tests cannot run without external orchestration.

## Top duplicate/overlapping logic

- Role hierarchy: `isAdmin`, `isManagerUp`, `isOwner`, `availableRolesForCurrentUser`, `renderTeamMembers`, plus three divergent Rules implementations.
- Workspace/membership resolution: `ensurePersonalWorkspace`, `discoverUserWorkspaces`, `resolveActiveWorkspace`, `loadCurrentWorkspaceMembership`, `refreshWorkspaceSwitcher`, `setActiveWorkspace`.
- Data reload: auth bootstrap, navigation, group switch, mutation handlers, `loadAllData`, and individual loaders.
- Repair rendering is monkey-patched: original `renderJobCard` is captured and reassigned to inject assignment UI.
- Status/audit writes mix centralized batch behavior with best-effort `appendWorkspaceAudit` behavior.
- Date/time normalization: `formatDate`, `getTime`, `dateFileName` and repeated sorting lambdas.
- Repeated direct collection reads and manual snapshot→array→sort→render pipelines.

## Do not port

- Personal Workspace bootstrap and deterministic `ws-{uid}` fallback.
- Single `ownerUid` authorization and legacy workspace `admin` role.
- Global shop authorization through `/users.role = admin|user`.
- Whole-collection repair/customer/member loads and global caches.
- Phone-number document ID/relation for customers.
- Repairs containing Customer PII for technician-readable documents.
- Client-authoritative audit/security operations and swallowed audit failures.
- Renderer monkey patch, inline handlers, CDN-only unpinned runtime design, and monolithic HTML architecture.
- Legacy global collections and hybrid Rules compatibility paths.
- Hard delete member/repair/customer workflows as the default.

## Recommended SmartRepair architecture

Single-store/group UX over a multi-tenant model:

`UI → application use cases → domain/policy → repositories → Firebase/Trusted Backend`

Use an explicit central session `{uid, profile, activeGroupId, membership, effectivePermissions, generation}`; a deny-by-default permission engine; repository-only Firestore access; runtime schema validation; typed error model; request generation/cancellation on group switch; and trusted backend transactions for ownership/security operations, invitation acceptance, security audit, and future subscription enforcement.

## Recommended data and permission model

- `/groups/{groupId}` and `/groups/{groupId}/members/{uid}`; no `ownerUid` as authority. Multiple active OWNER memberships are equal.
- Separate technician-safe `/groups/{groupId}/repairs/{repairId}` from `/groups/{groupId}/customers/{customerId}` PII. Repair stores stable `customerId` and a non-sensitive display token only if required.
- Member query must include `assignedToUid == request.auth.uid`; Rules enforce the same resource predicate. Owner/Manager use group-wide query capability.
- Role baselines: OWNER, MANAGER, MEMBER plus per-membership additive permissions bounded by grantor authority.
- Protected capabilities (`customer.manage`, `ownership.*`, `owner.manage`, `group.delete`, `security.critical.manage`) are OWNER-only and cannot be custom-granted.
- Status changes go through one use case that transactionally checks version/assignment/membership and writes repair + status history + audit.

## Backend requirements

Trusted backend is required for owner add/remove/transfer, owner-set snapshot and unanimous approvals, group deletion, critical policy mutation, authoritative security audit, invitation acceptance with expiry/replay guarantees, Firebase Auth user administration, and subscription enforcement. Rules must not be broadened to simulate these operations.

## Implementation phases

1. Foundation, schemas, errors, repositories, emulator CI.
2. Auth/profile and explicit session bootstrap.
3. Groups, memberships, active-group isolation, permission engine.
4. Invitations and notifications.
5. Customer vault and technician-safe repairs.
6. Assignment and transactional status/history/audit.
7. Team/reference/analytics/audit UI.
8. Ownership security backend.
9. Export/scanner and migration/regression.

## Fallback plans

- Plan 1 Controlled Repair: only emergency stabilization of legacy production; no new security model.
- Plan 2 Clean Rebuild: recommended default with strangler-style read-only validation and staged migration.
- Plan 3 Minimal Production Core: auth, group, membership, technician repairs/status only if schedule collapses.
- Plan 4 Data/Firebase Recovery: immutable export, mapping verification, quarantine invalid documents, rehearsed restore.

## Open decisions

- Whether Members may see customer-safe aliases, device identifiers, price, or warranty.
- Whether Manager can edit repair non-status fields after creation.
- Invitation expiry length and registered-user search privacy controls.
- Owner quorum behavior when an owner is inactive/unreachable; requirement currently says unanimous.
- Data retention/export/delete policy and customer archival rules.
- Migration source of truth and production dataset quality were not available in repository; all data-volume/shape conclusions need verification.
