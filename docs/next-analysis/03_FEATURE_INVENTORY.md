# Business Feature Inventory

Status is based on source completeness and Rules compatibility, not mere UI/function presence. Live Firebase state and browser smoke tests were unavailable.

| # | Feature | Entry/functions | Collections / requirements | Status | Failure/security evidence | SmartRepair redesign |
|---:|---|---|---|---|---|---|
| 1 | Register | Register form; submit handler | Auth, `/users/{uid}` | PARTIAL | Auth/profile/verification/workspace are non-atomic; registration success precedes workspace bootstrap | Saga/use case with recoverable profile state; no personal workspace |
| 2 | Login | Login form; auth observer | Auth, user, memberships, workspace | PARTIAL | Auth can succeed while post-auth fails; UI may remain inconsistent | Explicit bootstrap state machine |
| 3 | Logout | Security/header buttons; `logout` | Auth | PARTIAL | Does not explicitly clear group caches/pending/scanner/local active group | Central session teardown and cache wipe |
| 4 | Profile | Security page; `loadCurrentUserProfile` | `/users/{uid}` | PARTIAL | Only creates/reads role/active; registration fields not loaded into UI; global role conflicts with membership role | Profile repository independent from authorization |
| 5 | Password Reset | Security page | Firebase Auth | WORKING | Only signed-in self-service; no logged-out forgot-password entry | Keep concept, add recovery UX/rate messaging |
| 6 | Email Verification | Registration | Firebase Auth | PARTIAL | Email sent, but login/use is not gated by verified claim and profile flag can stale | Gate policy explicitly; backend/claim verification if required |
| 7 | Create Group | Team page | `/workspaces/{id}`, member | PARTIAL | Two writes plus audit not atomic; orphan workspace possible; free memberLimit=1 conflicts team intent | Trusted/transactional group bootstrap |
| 8 | Personal Workspace | Auth bootstrap | deterministic workspace/member | WORKING | Complex chicken-and-egg recovery; explicitly not required | DO NOT PORT / LEGACY |
| 9 | Group Membership | bootstrap/invite/team | members | PARTIAL | Multiple role systems; no custom permissions; deletion is hard delete | Membership entity with status/version/permissions |
| 10 | Group Switching | Header switcher | collection-group members | PARTIAL | Caches/pending state not cleared; async switch race | Session generation, cancel stale requests, clear group stores first |
| 11 | Team Roster | Team page | members list; active membership | WORKING | All members may list roster under intended current Rules behavior; privacy policy unclear | Permission `team.view`; minimal member projection |
| 12 | Invite Member | Team form | invitations | PARTIAL | Email identity, no expiry/UID lookup/existing-member check; Owner/Admin only vs target Owner/Manager | UID-bound invitation use case/backend |
| 13 | Accept Invitation | Invitation center | invitation + membership | BROKEN | Non-atomic; accepted-without-membership possible; double-submit/replay race | Backend transaction/idempotency token |
| 14 | Decline Invitation | Invitation center | invitation | PARTIAL | Non-atomic UI state and no expiry/idempotency contract | Transactional state machine |
| 15 | Remove Member | Team card | member delete | PARTIAL | Audit-before-delete can create false audit if delete fails; hard delete; no assignment handling | Soft deactivate use case; impact check; atomic audit |
| 16 | Role Change | Team card | member update | PARTIAL | Legacy admin role; no capability model; UI and Rules differ from target | OWNER/MANAGER/MEMBER policy engine |
| 17 | Permission Change | None | none | NOT IMPLEMENTED | No per-member permissions or protected-capability ceiling | Membership overrides + grant subset validation |
| 18 | Repairs/Jobsheet List | Jobs page | repairs LIST | WORKING | Lists every job and PII to every member | Separate group and assigned queries; safe projection |
| 19 | Create Repair | Job form | repair CREATE + customer UPSERT | PARTIAL | Two non-atomic writes; Member mutates customer; duplicate job number possible | Create use case/transaction, stable customerId |
| 20 | Repair Detail | Modal | cached repair | WORKING | PII/IMEI/customer note visible to Member | Technician DTO without customer PII |
| 21 | Edit Repair | Status controls only | repair UPDATE | PARTIAL | No general edit UX; Rules allow broad Member PII edits within 3h and broad Manager writes | Explicit field-specific use cases/permissions |
| 22 | Archive Repair | None | Rules allow delete for admin-up | NOT IMPLEMENTED | No archived fields/UI; hard delete allowed | Soft archive fields/use case |
| 23 | Assignment | Job card/team cache | repair UPDATE | PARTIAL | No notification, active membership commit check, transaction/version, or cross-request race protection | Transactional assignment + notification + audit |
| 24 | Status Update | Modal/quick done | repair + history + audit batch | PARTIAL | Best implemented mutation, but uses stale `allJobs` old status; no version precondition/assigned policy | Central backend/use-case transaction with version |
| 25 | Status History View | None | history subcollection | NOT IMPLEMENTED | Writes occur, no UI/load function; all members could read all history | Assigned/group scoped repository and timeline |
| 26 | Customers | Customer page | customers LIST | WORKING | All members can read; phone is ID/relation; no edit form despite writes from job creation | Customer vault; Owner edit, Manager view, Member deny |
| 27 | Reference Data | Reference page | references | PARTIAL | Add manager-up; delete intentionally placeholder; no update | Repository/use cases and permission tests |
| 28 | Analytics | Analytics page | client `allJobs` | WORKING | Derived from full PII-bearing job load; stale cache; Manager target okay but query architecture wrong | Server/aggregate safe metrics, group scope |
| 29 | Audit | Team page | auditLogs | PARTIAL | Client-authored, incomplete, best-effort, semantically forgeable | Backend authoritative append-only audit |
| 30 | Notifications | None | none | NOT IMPLEMENTED | Invitation list is not a general notification center | `/users/{uid}/notifications` or backend fanout with group refs |
| 31 | Excel Export | Export page | cached jobs, SheetJS | WORKING | Owner/Admin only; exports PII from global cache; CDN dependency | Owner permission, repository export DTO, audit export |
| 32 | CSV Export | Export page | cached jobs, SheetJS | WORKING | Same PII/cache concerns | Same as Excel |
| 33 | QR Scan | Job IMEI button | html5-qrcode | WORKING | Scanner input only; no QR generation | Keep optional adapter |
| 34 | Barcode Scan | Same scanner | html5-qrcode | UNKNOWN | Library format support/runtime camera not verified | Acceptance test supported formats |
| 35 | Legacy Global Admin | Admin page | top-level users | BROKEN | Workspace owner/admin passes UI check; production Rules deny listing/updating other users | DO NOT PORT; Auth admin via trusted backend only |
| 36 | Workspace Subscription | Metadata only | workspace fields | NOT IMPLEMENTED | Client creates `plan=free`; no enforcement backend | Backend-owned entitlements later |
| 37 | Ownership Security | None | single `ownerUid` | BACKEND REQUIRED | No multiple owners/proposals/quorum | Proposal workflow described in architecture |
| 38 | Group Deletion/Critical Policy | None | Rules deny delete | BACKEND REQUIRED | Required critical operation absent | Trusted backend unanimous approval |

## Totals

WORKING 8; PARTIAL 17; BROKEN 3; NOT IMPLEMENTED 5; BACKEND REQUIRED 3; UNKNOWN 2; total 38.

“WORKING” here means the source path is coherent under its legacy policy, not that it satisfies SmartRepair security or was live-tested.
