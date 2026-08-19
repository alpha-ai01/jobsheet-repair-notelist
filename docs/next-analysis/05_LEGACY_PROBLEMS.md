# Legacy Problems and Repair-vs-Rebuild Decision

## Architectural problem register

| Problem | Evidence | Impact | Disposition |
|---|---|---|---|
| God file/functions | `index.html` 6,924 lines; auth observer, registration, personal bootstrap, job submit | Hard to test/change; failures cross layers | Clean modules/use cases |
| Global mutable state | `currentUser/currentRole/activeWorkspaceId/currentWorkspace/all*/*Cache/pending*` | Stale/cross-group rendering; races | Immutable central session + scoped stores |
| Direct UI→Firestore | Every loader/mutator calls SDK | No enforceable architecture, schema mapper, or test seam | Repository-only access |
| Business logic in UI | Role rank, invitation policy, reopening, assignment, phone identity | UI bypass and duplicated policy | Domain/application policy |
| Scattered role checks | UI helpers, nav, renderers, handlers, 3 Rules files | Drift and privilege bugs | Central permission engine + Rules matrix |
| Auth/bootstrap coupling | Auth observer drives profile/group/member/UI/data | Auth success but unusable session | Explicit bootstrap state machine |
| Personal workspace coupling | deterministic personal group recovery in login | Requirement no longer exists; chicken/egg complexity | DO NOT PORT |
| Schema inconsistency | global users admin/user; groups owner/admin/manager/member; phone customer IDs | Ambiguous authority/migration | New versioned schemas |
| Rules/config mismatch | 3 rule versions, 4 configs; hybrid config points to current rules | Wrong testing/deployment target | One config per explicit environment |
| Duplicate loaders | identical snapshot-array-sort-render pipelines | Boilerplate and inconsistent errors | Repositories/query hooks |
| Renderer monkey patch | `originalRenderJobCard`, reassignment and string replacement | Fragile HTML changes and timing | Component composition |
| Client-only audit | best-effort helper; action/details unconstrained | Missing/false audit evidence | Trusted append-only audit |
| Partial features | deleteReference placeholder; no status history UI/archive/permissions/notifications | UI implies broader product than exists | Re-scope requirements |
| Dead/obsolete features | global admin UI under self-only Rules; hybrid/global Rules; personal workspace | Confusion and attack surface | Do not port |
| Error handling | silent switcher catch; Promise.allSettled ignored; generic catches; audit swallow | Hidden partial failure/stale state | Central typed error/result model |
| Async races | group switch, status stale cache, invitation response, assignment | Lost updates/partial records/data leak | cancellation generation + transactions/idempotency |
| No backend | ownership/Auth user/security operations are client-side or absent | Cannot meet critical security target | Trusted backend boundary |
| Testing difficulty | no npm scripts; direct test run fails without emulator; policy suites conflict | No reliable gate | Emulator CI + unified scripts |
| Supply-chain/runtime | CDN Tailwind, scanner, SheetJS, Firebase 10.8 vs npm 12.17 | Availability/version drift; no build integrity | pinned bundle/dependency review |

There is no clear circular module dependency because there are no modules; instead, temporal coupling through globals creates the equivalent problem. Functions assume DOM and state have already been initialized in a specific order.

## Legacy role mapping

| Legacy identity | Meaning | SmartRepair mapping |
|---|---|---|
| `/users.role=user` | Global active user | No group authorization; profile only |
| `/users.role=admin` | Old global admin | DO NOT PORT; trusted support/admin separate if ever needed |
| membership `owner` | Group owner plus matching single `ownerUid` | OWNER membership, multiple equal owners |
| membership `admin` | Intermediate group administrator | Usually OWNER or MANAGER after case review; role deprecated |
| membership `manager` | Can manage Member under Rules, broad repair/customer rights | MANAGER with explicit target permissions |
| membership `member` | Can read all group data and edit broad repair/customer fields | MEMBER baseline dramatically reduced |

## Permission and escalation observations

Current Rules prevent self role/status changes and protect the single owner from lower roles. They also prevent a Manager assigning higher than Member. Those are useful concepts. However, there is no custom permission grant model, protected capability set, grant-subset check, immutable owner quorum, or owner lifecycle. UI rank checks are not a security boundary. The target Manager rules must explicitly enforce: actor cannot modify self; target cannot be OWNER; new permissions ⊆ actor effective grantable permissions; protected capabilities excluded; only MEMBER→MANAGER promotion; never OWNER mutation.

## State/race catalogue

- Two group switches can finish out of order and the slower old group loader can overwrite arrays after the new group is active.
- A failed loader leaves the previous group’s array intact because arrays are cleared only after successful `getDocs` returns.
- Pending status job/status survives group switch/logout; modal action can target the same document ID under a new group.
- Invitation double-click reads `pending` twice; one update wins and membership creation/audit can partially fail.
- Assignment uses a roster cache that may be stale after member suspension/removal.
- Status uses cached `job.status` as `fromStatus`; two simultaneous updates can write histories whose `fromStatus` does not match the actual prior server state.
- Creating a group or personal workspace uses independent parent/member writes; either can orphan the other.
- Creating repair and customer master are independent; customer/history consistency is not guaranteed.
- Member removal audit is written before delete, while other audits occur after mutation, yielding inconsistent truth semantics.

## Repair vs clean rebuild scoring

Scale 1 low/favorable, 5 high/unfavorable.

| Criterion | Controlled repair | Clean rebuild | Evidence |
|---|---:|---:|---|
| Technical debt carried | 5 | 1 | monolith/globals/direct SDK |
| Security remediation complexity | 5 | 2 | PII schema split and assigned queries require model rewrite |
| Role/rules mismatch | 5 | 2 | target removes two role systems and adds capabilities/backend |
| Regression risk | 5 | 3 | limited executable tests; rebuild can establish gates first |
| Migration complexity | 3 | 4 | both require data transform; rebuild makes transform explicit |
| Short-term delivery cost | 2 | 4 | repair appears quicker |
| Long-term operating risk | 5 | 2 | ownership/audit/concurrency cannot be safely layered onto monolith |
| Testing difficulty | 5 | 2 | repository/use-case design enables isolation |

**Decision: PLAN 2 — CLEAN REBUILD.** A controlled repair is justified only for urgent legacy production containment while the rebuild proceeds. Repairing this code enough to meet the target would replace the schema, Rules, session, permission, data access, mutation boundaries, and most UI integration—functionally a riskier in-place rebuild.

## Recovery/fallback plans

| Plan | Trigger | Scope / benefits | Risks | Exit criteria | Rollback strategy |
|---|---|---|---|---|---|
| 1 Controlled Repair | Active exploit/production outage before replacement | Minimal denial/containment and observability in legacy; fastest stabilization | Entrenches architecture; regression under weak tests | Incident closed, emulator tests green, rebuild unaffected | Revert isolated repair commit/rules release using recorded prior version; data recovery separately |
| 2 Clean Rebuild | Default decision | New repo, schema, backend, tests, staged migration | More upfront time; migration dual-run complexity | Role/security matrix green; migrated sample reconciled; pilot accepted; rollback rehearsed | Keep legacy read-only; feature flag/cutover pointer; restore pre-cutover export |
| 3 Minimal Production Core | Deadline/budget threatens Plan 2 | Auth/profile/group/membership/session, assigned repairs, status only | Deferred team/analytics/export UX | Critical tests green; no PII to Members; manual operations documented | Fall back to legacy read-only for historical lookup |
| 4 Data/Firebase Recovery | Corrupt/inconsistent/missing data or wrong Rules deployment | Immutable export, schema report, quarantine, replay/restore | Downtime/data reconciliation | Counts+hashes+referential checks pass; owners sign off | Restore named export to isolated project first; never overwrite sole copy |

## Functions/systems explicitly not to port

`ensurePersonalWorkspace`, legacy role loaders/helpers, global admin functions, renderer monkey patch, full-collection member repair/customer loaders, phone-ID customer relationship, best-effort client audit, client workspace ownership writes, hybrid/global Rules paths, and migration script implementation.
