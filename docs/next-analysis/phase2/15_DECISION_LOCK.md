# Phase 2.5 Decision Lock

Effective: 2026-08-15. This document supersedes every earlier `OPEN DECISION`, “candidate,” “safe default,” or conditional policy in Phase 2 where the same topic appears. `LOCKED` means Phase 3 must implement/test exactly this contract or raise a new ADR before code changes.

## 1. Open-decision inventory and resolution

| ID | Topic / why unresolved | Security / data / UX / implementation impact | Recommended decision now | Alternative | Risk if postponed | Defer safely? | Resolution |
|---|---|---|---|---|---|:---:|---|
| ADR-023 | Email verification enforcement; abuse vs onboarding | Unverified identity may join Groups; restricted onboarding screen/workflow | Login allowed, but verified email required for create Group, send/accept invitation, and all Group business access | Permit unverified active use | account abuse/inconsistent profile | NO | **LOCKED** |
| ADR-024A | Invitation expiry | Replay/stale role offers and visible expired UX | 7×24 hours from server creation; backend expires lazily/worker | 24h/30d | stale membership grants | NO | **LOCKED** |
| ADR-024B | Security proposal expiry | Long-lived approvals become stale | 72 hours; owner-set drift invalidates earlier | 24h/7d | stale security execution | NO | **LOCKED** |
| ADR-025 | Retention/purge/export | Legal/business retention evidence absent | V1 archive/retain schedules below; implement no hard purge; legal purge/export deferred | Immediate purge or indefinite everything | loss/compliance conflict | YES, by retaining | **LOCKED V1 / PURGE DEFERRED** |
| ADR-026 | Manager new-customer intake | Manager must create repairs but cannot mutate Customer master | Manager submits immutable-after-submit `CustomerIntakeDraft`; repair is `CUSTOMER_APPROVAL_PENDING`, cannot assign/status; OWNER approves atomically creating Customer and activating repair or rejects | Existing Customer only; let Manager create Customer | blocks real intake or violates protected capability | NO | **LOCKED** |
| ADR-027 | Member fields/IMEI/price | Sensitive device/business identifiers could leak | Technician-safe fields fixed below; full serial/IMEI, Customer link, price/warranty/costs are Manager+/Owner restricted; Member gets optional masked last 4 only | Full identifiers to Member | privacy/asset tracking leak | NO | **LOCKED** |
| ADR-028 | Repair status graph | Domain transitions/test contracts ambiguous | Fixed graph below; reopen final requires OWNER/MANAGER+reason | Free-form status | inconsistent history | NO | **LOCKED** |
| ADR-029 | Former assignee history | Reassignment visibility ambiguous | Access follows current assignment only; former assignee loses repair/history access immediately | retain past access | ongoing information leakage | NO | **LOCKED** |
| ADR-030A | Owner removal quorum | Target approval makes involuntary removal impossible | Exclude target; all remaining active snapshot owners unanimous; 24h cooling, step-up auth, target notice/objection freeze | include target; majority | deadlock or collusive removal | NO | **LOCKED** |
| ADR-030B | Emergency owner recovery | Identity proof/support authority not specified | No self-service/support ownership mutation in V1; Firebase account recovery only; orphaned Group frozen; design trusted recovery later | manual DB/client bypass | takeover or permanent lockout | YES, fail-closed | **DEFERRED** |
| ADR-031 | Registered-user search privacy | account enumeration vs invitation UX | Exact normalized email search via rate-limited/App-Check backend; only exact match returns UID, displayName, masked email; no browse/prefix | directory search | privacy enumeration | NO | **LOCKED** |
| ADR-032 | Export | PII contents/role/audit unclear | Deliberately not in Phase 3A/V1 core; when built OWNER-only, backend scoped, audited | Manager/Member export | bulk leakage | YES | **DEFERRED** |
| ADR-033A | Customer duplicate merge | matching semantics/data evidence absent | No automatic merge in V1; stable random IDs; Owner may flag suspected duplicate; merge deferred | phone auto-merge | wrong customer history | YES | **LOCKED NO-MERGE / DEFERRED MERGE** |
| ADR-033B | Repair number | collision strategy ambiguous | Backend transaction allocates monotonically increasing Group-local number from counter; Firestore repair ID remains random | client random/time ID | collision/hot counter | NO | **LOCKED** |
| OD-034 | Manager A demotes Manager B | authority ceiling ambiguous | NO. Only OWNER may demote MANAGER→MEMBER or remove Manager. Manager manages MEMBER targets only, including promotion | allow equal-peer management | peer sabotage/escalation | NO | **LOCKED** |
| OD-035 | Member custom grants | “additional permissions” could defeat assigned/PII rules | OWNER may grant only registry-approved `reference.view` in V1; no group-view/assign/analytics/customer/private/audit/team grants | broader ordinary grants | scope/PII leakage | NO | **LOCKED** |
| OD-036 | Rules list limit/status command boundary | cost/query/atomicity ambiguous | max page size 50 in V1; all business mutations backend, including status/assignment/group/membership/invite/customer/repair writes | client Rules transaction | query abuse/policy drift | NO | **LOCKED** |
| OD-037 | Notification retention | evidence vs inbox cleanup | ordinary 180d; Security Event 365d; client cannot delete, only read/archive; Audit remains separate | user delete/indefinite inbox | evidence confusion/storage | NO | **LOCKED** |
| OD-038 | Migration identity and legacy access | real data unavailable | UID primary; explicit mapping manifest for Group/Customer/Repair IDs; legacy read-only; application core has no legacy fallback | email/phone matching/core adapter | cross-account/cross-customer mapping | YES | **DEFERRED TO MIGRATION** |

Decisions reviewed: **19 topics**. Locked now: **16**. Deliberately deferred with fail-closed V1 behavior: **3** (`ADR-030B`, `ADR-032`, `OD-038`; legal hard purge/merge implementation also deferred under locked no-purge/no-merge policy). Open implementation blocker for Phase 3A: **none**.

## 2. Locked security and permission invariants

### Customer

| Action | OWNER | MANAGER | MEMBER |
|---|:---:|:---:|:---:|
| View | YES | YES | NO |
| Create/edit/archive | YES | NO | NO |

`customer.manage` is protected OWNER-only and never an override. Manager intake writes `customerIntakeDrafts`, not Customer. Draft contains PII and is OWNER/MANAGER read; MEMBER denied. After submit Manager cannot edit it. Repair remains pending and non-assignable/non-actionable until OWNER approval transaction creates Customer/private link and activates repair.

### Member visibility / technician fields

`repairs/{repairId}` is Member-safe and contains no `customerId` or Customer identifier. Restricted `/repairPrivate/{repairId}` holds `customerId`, full serial/IMEI, price, warranty, customer intake and commercial fields; MEMBER path is denied.

| Classification | Fields |
|---|---|
| MEMBER SAFE | repairId, Group-local job number, device type/category, brand, model, color, `serialMasked` last 4 if present, reported issue sanitized of PII, repair instructions, technical notes, status, current assignment-to-self marker, status history, parts/work descriptions and quantities without supplier/cost/price, archive flag/time |
| MANAGER+ | opaque customerId/link, full serial/IMEI, estimate/price, warranty, supplier/part costs, customer intake draft; Customer PII via Customer repository |
| OWNER ONLY | Customer mutations/archive, restricted security/audit payloads, protected policy fields |
| NEEDS REDACTION | free-text issue/instructions/technical notes/parts notes: UI warning + validation/redaction pipeline; no Customer phone/email/address/name; audit before/after redacted |

Full serial/IMEI is a sensitive equipment identifier and never delivered to MEMBER. `serialMasked` is derived backend-side; empty if fewer than four safe characters. Member’s query is always `assignedToUid == auth.uid`, current assignment only. UI hiding is irrelevant to enforcement.

### Manager authority

Manager baseline is exactly: group repair view/create/assign/status, Customer view, team view, invite MEMBER/MANAGER within ceiling, remove MEMBER only, manage MEMBER permissions, promote MEMBER→MANAGER, analytics view. Manager cannot general-edit/archive repairs; mutate Customer; manage/demote/remove another MANAGER; touch OWNER; modify self; grant absent/protected/non-delegable capabilities; manage reference/audit/export/security. OWNER alone demotes/removes Manager.

### Member overrides V1

Only OWNER may grant a MEMBER `reference.view` in V1. All other additive overrides are rejected.

## 3. Multi-owner governance state machine

Proposal states: `PENDING_APPROVALS → PENDING_TARGET_ACCEPTANCE (if required) → APPROVED_COOLING_OFF → EXECUTED`; terminal alternatives `REJECTED | EXPIRED | INVALIDATED | CANCELLED`. Expiry is 72h, including cooling period. Execution is once-only backend transaction.

General snapshot is sorted active Owner UIDs plus `ownerSetVersion`, immutable. Add/transfer requires all current owners and target acceptance. Remove Owner excludes target from `requiredOwnerIds`; all remaining active owners approve. Sole Owner cannot be removed. Transfer from sole Owner requires sole approval+target acceptance and atomically promotes target before/demotes source so count never reaches zero.

| Edge case | Locked result |
|---|---|
| Last/zero owner | reject `VALIDATION_ERROR`; transaction invariant count≥1 |
| Duplicate approval | same request idempotent; differing replay `CONFLICT` |
| Expired/replayed/executed | reject; no mutation; security Audit attempt |
| Concurrent security proposals | proposals may coexist, but first executed increments securityVersion; conflicting snapshots become INVALIDATED |
| Target inactive/removed/already OWNER | invalidate/reject; already-owner add is idempotent no-op only if same request receipt exists |
| Proposer leaves/loses Owner | proposal remains only if proposer is not required for execution and snapshot/securityVersion remains valid; normally owner-set change invalidates |
| Any required owner inactive/removed | invalidate; never shrink quorum |
| Owner set changes | invalidate and recreate |
| Target Owner removal | target excluded; remaining unanimous; 24h cooling; step-up reauth; immediate target Security Notification; target objection freezes as `DISPUTED`, executable only by future trusted recovery process—deferred in V1 |
| Remove with only two owners | one remaining approval plus safeguards above; cannot execute if target disputes |

Critical proposals require recent authentication (maximum 15 minutes; implementation may use Firebase reauthentication timestamp/one-time challenge) and a reason. Final exact step-up mechanism is an implementation detail but bypass is forbidden.

## 4. Invitation and notification lifecycle

Invitation states: `PENDING→ACCEPTED|DECLINED|CANCELLED|EXPIRED`. Seven-day server expiry. Same Group+target pending invitation returns existing if identical; differing role/permissions requires cancel old then create new. Existing ACTIVE/SUSPENDED/REMOVED Membership cannot be invited; separate Owner-only reactivation workflow handles non-active memberships. Declined/expired/cancelled may be reinvited immediately through a new ID after lock release. Offer fields are immutable; change means cancel/reinvite. Accept/decline twice with same idempotency request returns prior result; other repeat conflicts. Acceptance revalidates current offer policy and target UID; expired/changed offer never creates Membership.

Notifications: ordinary Group Invitation, Assignment, Role Changed, Permission Changed (180 days); Ownership Invitation, Approval Request, Security Event (365 days). Recipient can mark read/archive, never hard-delete. Expiry cleanup is backend. Notification is UX, not evidence; Audit/Proposal history remains authoritative.

## 5. Retention and archive V1

| Resource | V1 policy |
|---|---|
| Repairs | soft archive; retain indefinitely in V1; no hard purge endpoint |
| Customers | OWNER archive; cannot hard-delete while any Repair/private record references ID; no hard purge V1 |
| Invitations | terminal documents retained 2 years; backend purge deliberately deferred until legal review |
| Ordinary notifications | visible/retained 180 days, then backend eligible cleanup |
| Security notifications | 365 days; never substitute Audit |
| Audit | append-only, no client delete, retain minimum 7 years; legal jurisdiction review before purge implementation |
| Security proposals/approvals | retain minimum 7 years; append-only terminal history |
| Group deletion | mark `DELETION_PENDING`; actual destructive purge deferred; Group remains recoverable/read-only under backend policy |

## 6. Concurrency and atomicity

All business mutations use trusted backend transactions in V1. Repair has integer `version`; command supplies `expectedVersion` and idempotency key. Status transaction reads active actor Membership and Repair, validates current assignment/transition/version, then writes Repair currentStatus/version + StatusHistory + Audit/outbox. Assignment reads actor, target ACTIVE same-Group Membership and Repair/version, then writes assignment/version + Audit/outbox. Concurrent different command loses with `CONFLICT`; identical replay returns receipt. Batch without transaction/precondition is forbidden.

## 7. Session, registration, Group lifecycle

- Invalidation trigger: own Membership/summary listener, backend version response, Group securityVersion change, Group switch, token/logout. Server/backend/Rules is always authority.
- Stale permission maximum UI lifetime target is 60 seconds while online; sensitive commands always reauthorize at execution, so security lifetime is zero. Listener disconnect beyond 60 seconds marks context `AUTHORIZATION_STALE` and blocks mutations until refresh.
- Role/permission/Owner/status change increments versions, clears all Group caches/pending UI and reboots context. Group switch clear-first covers repairs, private/customer/draft, team, analytics, reference, audit, notifications tied to Group, forms/modals/export/scanner.
- Register recovery: Auth creation then idempotent `ensureProfile(uid)` with deterministic profile ID. Missing profile login enters restricted `PROFILE_RECOVERY`; retry is safe and cannot create duplicate. Verified email gates Group actions. No implicit Group.
- Create Group is backend transaction: Group + OWNER Membership + user Group summary + Audit/outbox/counter initialization. Failure commits nothing. Idempotency receipt recovers ambiguous network result; reconciliation alert handles impossible integrity anomaly, never client repair.

## 8. Query contracts

All lists max 50/page, explicit Group path and approved cursor/order.

| Resource | Required client query |
|---|---|
| Repairs MEMBER | `/groups/{g}/repairs`: `assignedToUid==uid`, `archived==false`, `updatedAt desc`, limit≤50 |
| Repairs OWNER/MANAGER | same Group path, `archived==false`, optional status, `updatedAt desc`, limit≤50 |
| Repair private/Customer | exact get or OWNER/MANAGER Group list/search endpoint; MEMBER no query |
| Members | Group path, ACTIVE/role/order projection, team capability, limit≤50; self exact get always |
| Invitations | recipient notifications/action exact get; team list Group+status/createdAt, limit≤50; business mutation backend |
| Notifications | `/users/{uid}/notifications`, archived/read filter + createdAt desc, limit≤50 |
| Status history | child of visible parent, createdAt desc, limit≤50; Rules verify parent scope/current assignment |
| Audit | OWNER-only Group path, createdAt desc, limit≤50 |
| Security proposals | OWNER-only Group path; target gets backend-safe projection; status/createdAt, limit≤50 |

No client collection-group business query and no load-all-then-filter authorization.

## 9. Backend/client boundary final

Backend-required: create Group; all Customer/draft/Repair/assignment/status/archive writes; invitations and membership/role/permission/status; notification creation; audit/outbox; proposal create/approve/reject/target accept/execute; Owner promotion/removal/transfer; Group delete/critical policy; Firebase Auth privileged operations. Client-safe: Auth register/login/logout/reset/reauth; own profile safe-field write via constrained repository (or backend); authorized reads using locked queries; mark own notification read/archive. Client never executes final security/business mutation by direct Firestore write.

## 10. Migration lock

Phase 3 uses isolated Firebase dev project. Legacy is read-only evidence. Migration is not implemented. Future matching order: Auth UID exact; explicit Group mapping manifest; stable generated new Customer/Repair IDs with recorded old-path→new-ID adapter manifest; never match identity solely by email/phone. No legacy path, schema, role or fallback enters application core.

## 11. Phase 3A deliberate scope

Implement only scaffolding/tooling/environment separation, domain IDs/enums/schemas, central errors, repository interfaces/query specifications, Firebase Auth foundation, profile recovery, Group/Membership/session context, permission registry/engine, emulator and Rules test harness with deny-default draft rules in the new isolated project. Do not implement repair/customer/invitation/ownership business mutations yet; their contracts and tests may be scaffolded.

Deferred: analytics, export, scanner, advanced UI, production migration/cutover, destructive Group purge, emergency Owner recovery, Customer merge, optional offline mode, subscriptions.

## Locked V1 status graph

`CUSTOMER_APPROVAL_PENDING -> WAITING` only by OWNER draft approval. `WAITING -> ASSIGNED|IN_PROGRESS|CANCELLED`; `ASSIGNED -> IN_PROGRESS|WAITING_PARTS|DONE|CANCELLED`; `IN_PROGRESS -> WAITING_PARTS|DONE|CANCELLED`; `WAITING_PARTS -> IN_PROGRESS|DONE|CANCELLED`. `DONE|CANCELLED -> WAITING|ASSIGNED|IN_PROGRESS` is reopen by OWNER/MANAGER only with non-empty reason. MEMBER may perform only a legal transition on the currently assigned Repair; CUSTOMER_APPROVAL_PENDING cannot be assigned or status-mutated.

## 12. Detailed decision impact decomposition

| Decision | Why unresolved | Security impact | Data impact | UX impact | Implementation impact |
|---|---|---|---|---|---|
| ADR-023 | verification gate absent | identity abuse | profile verification state | restricted verify screen | Auth guard/tests |
| ADR-024A/B | expiry unspecified | stale replay | expiresAt/cleanup | expired states | server clock/workers |
| ADR-025 | legal retention unknown | evidence/privacy | archive and retention | no hard delete | no-purge V1 |
| ADR-026 | Manager create vs Customer protection | privilege boundary | draft/private link | Owner approval queue | draft aggregate/transaction |
| ADR-027 | equipment/commercial sensitivity | Member disclosure | split safe/private docs | masked serial | DTO/Rules split |
| ADR-028 | transition graph absent | unauthorized reopen | consistent history | deterministic controls | policy/transaction tests |
| ADR-029 | reassignment semantics | stale access | parent history scope | former job disappears | current-assignee Rules |
| ADR-030A | removal target quorum conflict | collusive removal/deadlock | proposal snapshot/DISPUTED | cooling/objection | backend state machine |
| ADR-030B | recovery identity proof absent | takeover risk | orphaned Group frozen | no V1 self-service | deferred trusted process |
| ADR-031 | search privacy | enumeration | minimal result | exact email search | rate-limited backend |
| ADR-032 | export scope unknown | bulk PII leak | export DTO/Audit | feature absent | deferred module |
| ADR-033A | merge evidence absent | ID misassociation | stable IDs/flags | no auto-merge | defer merge use case |
| ADR-033B | number uniqueness absent | collision | counter+random ID | stable visible number | backend counter transaction |
| OD-034 | peer Manager authority unclear | peer sabotage | Membership version | Owner handles Manager | delegation policy |
| OD-035 | overrides too broad | scope escalation | allow registry | fewer customization options | fixed V1 registry |
| OD-036 | query/mutation boundary conditional | over-read/partial writes | page/version contract | bounded pages/typed conflict | backend-only commands |
| OD-037 | notification evidence conflated | client evidence deletion | archive/expiry fields | manageable inbox | cleanup/Rules |
| OD-038 | real legacy mapping unknown | cross-identity migration | mapping manifest | no legacy fallback | separate migration tooling |

## 13. Consistency review result

- Product ↔ Permission ↔ Matrix: OWNER Customer manage, MANAGER Customer read-only and MEMBER Customer deny match; Manager manages MEMBER only; Member override is reference.view only.
- Data ↔ Rules ↔ Query: Member-safe Repair has no Customer identifier/PII; repairPrivate/Customer/draft are MEMBER-denied; assigned query and max 50 are identical.
- Backend ↔ Governance: every business/critical mutation is backend-transactional; Owner-removal exception, snapshots, versions, idempotency, cooling and dispute states match the schema.
- Session ↔ Tests: clear-first Group switching, 60-second authorization freshness and execution-time reauthorization have mandatory race/stale tests.
- Test ↔ Implementation: every Phase 3A module has a security gate; deferred feature tests become mandatory before their feature ships.

No unresolved contradiction remains for OWNER, MANAGER, MEMBER, Customer PII, assigned Repairs, multi-Group isolation, ownership, invitations, session invalidation or backend boundary.
