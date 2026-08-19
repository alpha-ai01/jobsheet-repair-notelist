# Complete Function Inventory

## Counting and field legend

Production count is **83 callable units**: named functions, assigned/window functions, auth/event handlers, and anonymous callbacks that own async, state, UI, or business behavior. Pure formatting callbacks used only inside `map/filter/sort/forEach` are listed as callback families because their input/output/state is identical to the owning renderer. Imported library functions are dependencies, not repository-defined functions. Migration has 3 callable units. Rules helpers (40 occurrences across versions) and 86 test callbacks are audited in dedicated sections.

Abbreviations: `S:R/W` global state read/write; `F:R/W` Firestore; `A` Auth; `UI`; `EH` error handling. All production functions depend on the browser DOM unless noted. All Firestore paths below are under active `workspaces/{workspaceId}` unless top-level is stated.

## Application bootstrap, session, workspace (1–12)

| # | Function / exact location | Category; called by → calls | Inputs → outputs; state | Firestore/Auth/permission | Problems; recommendation |
|---:|---|---|---|---|---|
| 1 | `workspaceCollection` `index.html:1454` | FIRESTORE ACCESS utility; all loaders/writers | collection name→ref; reads active group | scoped collection | Mutable implicit scope; `REWRITE` repository context |
| 2 | `workspaceDoc` `:1467` | FIRESTORE ACCESS utility | name,id→ref | scoped doc | Same; `MERGE REWRITE` with repositories |
| 3 | `ensurePersonalWorkspace` `:1483` | BOOTSTRAP/GROUP/MEMBERSHIP; resolve→multiple reads/writes | user,name→workspaceId; reads current user | GET member/workspace; SET workspace/member; Auth UID; owner | God flow, partial writes, personal workspace; `LEGACY SPLIT DO NOT PORT` |
| 4 | `discoverUserWorkspaces` `:1718` | GROUP discovery | none→memberships; currentUser | collectionGroup members where uid==self | Query/rules/index coupling; keep multi-group concept; `REWRITE` |
| 5 | membership `forEach` `:1729` | anonymous state transform | snapshot→array append | reads uid/status/role/path | Trusts document uid; fine with Rules; `KEEP CONCEPT` |
| 6 | `resolveActiveWorkspace` `:1746` | SESSION bootstrap | none→groupId; writes active id/localStorage | discovery, fallback GET, possible bootstrap | Too many responsibilities/fallback masks failure; `SPLIT LEGACY` |
| 7 | switcher `change` handler `:1840` | SESSION/UI async | event→switch/reload | localStorage; calls setActive | No disable/cancel; overlapping switches; `REWRITE SECURITY RISK` |
| 8 | switcher name `.then` `:1880` | UI async callback | workspace snapshot→label | GET workspace | Stale callback may label reused option; silent failures; `PARTIAL` |
| 9 | switcher `.catch` `:1892` | ERROR HANDLING | error→nothing | none | Silent catch; `REMOVE/central error` |
| 10 | `renderWorkspaceSwitcher` `:1829` | UI/GROUP | memberships→DOM | GET each workspace N+1 | UI performs data access; `SPLIT REWRITE` |
| 11 | `loadCurrentWorkspaceMembership` `:1902` | SESSION/AUTHORIZATION | none→state | GET own member then workspace; active status/role | Correct order but global state; legacy admin; `KEEP CONCEPT REWRITE` |
| 12 | `setActiveWorkspace` `:1978` | SESSION/GROUP | id→Promise; writes active/current caches indirectly | membership + all loaders | Does not clear caches/pending; race/data leak; `SECURITY RISK SPLIT` |

## Utilities, auth, navigation (13–32)

| # | Function / location | Category and behavior | Dependencies/state | Problems; recommendation |
|---:|---|---|---|---|
| 13 | `$` `:2019` | UI element lookup | DOM | `KEEP CONCEPT` only |
| 14 | `escapeHTML` `:2021` | FORMATTING/XSS encoding | pure string→string | Used in HTML contexts including attributes; context-specific encoding absent; `REWRITE` |
| 15 | `formatDate` `:2036` | FORMATTING | Timestamp/Date→Thai text | `KEEP CONCEPT MERGE` with time service |
| 16 | `formatMoney` `:2058` | FORMATTING | number→Thai currency | `KEEP CONCEPT` |
| 17 | `normalize` `:2069` | SEARCH/FORMATTING | value→lowercase | `KEEP CONCEPT` |
| 18 | `generateJobNumber` `:2077` | REPAIR utility | client clock/random→ID | collision/no uniqueness guarantee; `REWRITE SECURITY RISK` |
| 19 | `getStatusMeta` `:2091` | STATUS formatting | key→metadata | duplicated status enum; `CENTRALIZE KEEP CONCEPT` |
| 20 | `statusBadge` `:2131` | UI formatting | status→HTML | calls metadata/escape | `KEEP CONCEPT REWRITE` component |
| 21 | `showToast` `:2143` | UI/error feedback | message,type→DOM | timer callback | `KEEP CONCEPT` central UI errors |
| 22 | toast timeout callback `:2166` | anonymous UI cleanup | element→remove | DOM | benign `KEEP CONCEPT` |
| 23 | `toggleAuthMode` `:2176` | AUTH UI | mode→DOM | none | `KEEP CONCEPT` |
| 24 | login submit handler `:2199` | AUTHENTICATION | email/password→sign-in | Firebase Auth; button/error DOM | Good await/EH; logs full error object; auth completion relies observer; `REWRITE` |
| 25 | register submit handler `:2325` | REGISTRATION/AUTH/PROFILE | form→Auth user/profile/email | Auth CREATE, SET `/users`; state via observer | God callback/non-atomic/partial Auth account; `SPLIT SECURITY RISK` |
| 26 | auth-state handler `:2451` | APPLICATION BOOTSTRAP/SESSION | Firebase user→whole app | writes currentUser/role; profile→group→member→UI→data | God callback; failure after Auth leaves ambiguous UI; stale overlapping observer; `SPLIT REWRITE` |
| 27 | `loadCurrentUserProfile` `:2546` | PROFILE/legacy role | current user→role | GET/SET `/users/{uid}`, Auth signout | Mixes profile creation/global authz/disable; `SPLIT LEGACY` |
| 28 | `getDisplayName` `:2597` | PROFILE formatting | Auth email→name | currentUser | Drops registered names; local-domain legacy; `PARTIAL REWRITE` |
| 29 | `applyRoleUI` `:2623` | ROLES/UI | currentRole→visibility | DOM globals | UI-only authorization; duplicated checks; `REWRITE` |
| 30 | `isAdmin` `:2650`; `isManagerUp` `:2655`; `isOwner` `:2661` | PERMISSIONS (3 callable units, counted 29–31 in raw ledger) | role→boolean | currentRole | Role hierarchy scattered, global/admin ambiguity; `MERGE REWRITE SECURITY RISK` |
| 31 | `logout` `:2670` | LOGOUT | confirmation→Auth signout | does not clear caches | `PARTIAL SECURITY RISK` central teardown |
| 32 | `resetPassword` `:2706`; `navigate` `:2755` | PASSWORD RESET and NAVIGATION (two raw units) | user/page→Auth email/UI | role UI checks, loaders | Navigation permission duplicated and analytics condition inconsistent; `SPLIT REWRITE` |

Note: rows grouping adjacent simple role/navigation units retain the raw-unit total shown in the heading.

## Team, invitations, assignment, audit (33–55)

| Raw unit(s) | Function / location | Category; I/O/state; Firestore | Problems; recommendation |
|---:|---|---|---|
| 33 | `installTeamWebUI` `:2885` | UI installer; DOM creation/event registration | Business UI embedded string; `REWRITE` component |
| 34–35 | desktop/mobile button arrow handlers `:2907,:3165` | NAVIGATION callbacks | trivial; `MERGE` router |
| 36 | invite form submit callback binding `:3116` | UI event delegates to send | no new business logic; `KEEP CONCEPT` |
| 37 | `installMobileTeamButton` `:3127` | UI installer | duplicates desktop nav; `MERGE REWRITE` |
| 38 | `openCreateWorkspaceDialog` `:3176` | GROUP create; prompt→workspace/member/audit | SET workspace, SET owner member, ADD audit; non-atomic/orphan; `BACKEND REQUIRED SPLIT` |
| 39 | `refreshWorkspaceSwitcher` `:3319` | GROUP reload | discovery→render | duplicate loading; `MERGE` |
| 40 | `sendWorkspaceInvitation` `:3334` | INVITATION create | query pending email/status; ADD invitation/audit | email identity, check-then-create race, no expiry/existing member; `REWRITE SECURITY RISK` |
| 41 | `loadMyInvitations` `:3508` | INVITATION/NOTIFICATION | collectionGroup email query→cache | email identity; all statuses; `REWRITE` UID notification center |
| 42–43 | invitation snapshot/sort callbacks `:3562,:3584` | anonymous state/sort | writes pending cache | stale group-independent cache; `PARTIAL` |
| 44 | `renderMyInvitations` `:3608` | UI | cache→HTML | inline interpolated IDs; `REWRITE` |
| 45 | invitation map callback `:3632` | UI anonymous | invite→HTML | grouped with renderer; `KEEP CONCEPT` |
| 46 | `respondWorkspaceInvitation` `:3715` | INVITATION/MEMBERSHIP | ids/status→invite update/member create/audit | GET then UPDATE then SET; non-atomic; arbitrary status passed until Rules; replay/partial; `BROKEN BACKEND REQUIRED SECURITY RISK` |
| 47 | `loadTeamMembers` `:3882` | TEAM/FIRESTORE | LIST members→cache/render | all roster, stale cache; `REWRITE` |
| 48–49 | member snapshot/sort callbacks `:3915,:3928` | anonymous state/sort | cache mutation | duplicated rank map; `DUPLICATE` |
| 50 | `renderTeamMembers` `:3965` | TEAM/ROLES/UI | cache→HTML | embeds permission hierarchy and management rules; `SPLIT SECURITY RISK` |
| 51 | member map callback `:4000` | UI/policy anonymous | member→HTML | same; `SPLIT` |
| 52 | `availableRolesForCurrentUser` `:4137` | ROLES | role→roles | legacy admin; duplicated Rules; `MERGE REWRITE` |
| 53 | `saveMemberRole` `:4160`; `toggleMemberStatus` `:4228`; `removeWorkspaceMember` `:4284` | MEMBER MANAGEMENT (3 raw units) | UPDATE/UPDATE/DELETE member then audit/reload | no before/after, hard delete, audit order inconsistent, no permissions; `REWRITE/BACKEND REQUIRED` |
| 54 | `refreshJobAssigneeSelectors` `:4340` | ASSIGNMENT UI | member cache→selects | stale/inactive snapshot; `REWRITE` |
| 55 | `assignJobToMember` `:4378` | ASSIGNMENT | job, selected UID→UPDATE repair + audit | no transaction/member validation/version/notification; `SECURITY RISK REWRITE` |
| 56 | patched `renderJobCard` wrapper `:4489` | UI/ASSIGNMENT | calls original, string replace injection | brittle monkey patch/duplicate renderer/timer; `REMOVE REWRITE` |
| 57 | assignment injection timeout callback `:4568` | UI async | refresh selectors | can run after group/page switch; `REMOVE` |
| 58 | `appendWorkspaceAudit` `:4588` | AUDIT/FIRESTORE | action/target/details→ADD log | catches and suppresses; client semantics forgeable; `BACKEND REQUIRED SECURITY RISK` |
| 59 | `loadTeamAuditLogs` `:4654` | AUDIT UI | LIST all logs→sort/render | client sorting/unbounded list then slice; manager reads client logs; `REWRITE` |
| 60–61 | audit snapshot/sort/map callbacks `:4689,:4700,:4709` | anonymous transforms/UI | logs→HTML | group with loader; `KEEP CONCEPT` |
| 62 | `loadTeamPage` `:4761` | TEAM bootstrap | parallel member/invite/audit | invitation query is user-wide, caches global; `SPLIT REWRITE` |

## Repairs, customers, reference, analytics, admin, export, scanner (63–83)

| # | Function / location | Category and data flow | Problems; recommendation |
|---:|---|---|---|
| 63 | `loadAllData` `:4825` | BOOTSTRAP | Promise.allSettled jobs/customers/references | Swallows rejected result semantics and leaves stale arrays; `REWRITE SECURITY RISK` |
| 64 | job form submit `:4842` | REPAIR/CUSTOMER CREATE | form→ADD repair then SET phone-key customer | PII duplicated; non-atomic; Member customer mutation; job number collision; `SPLIT REWRITE SECURITY RISK` |
| 65 | `clearJobForm` `:5025`; `openJobForm` `:5034` | UI (2 raw units) | reset/scroll | `KEEP CONCEPT` |
| 66 | `loadJobs` `:5047` | REPAIR/FIRESTORE | LIST entire repairs→`allJobs` | no assigned query; PII to Member; stale race; `SECURITY RISK REWRITE` |
| 67 | job snapshot/sort callbacks `:5067,:5078` | anonymous state/sort | snapshot→global | callback family; `REWRITE` repository mapper |
| 68 | `getTime` `:5104` | FORMATTING | timestamp→ms | duplicates time utilities; `MERGE` |
| 69 | `renderJobs` `:5127` | REPAIR/UI | global cache→filtered HTML | client filtering of already over-read data; `SECURITY RISK REWRITE` |
| 70 | job filter callback `:5142` | UI search | job→bool; reads PII | never security filter; `KEEP CONCEPT` only for search |
| 71 | original `renderJobCard` `:5199` | REPAIR/UI | job→HTML | exposes customer/phone/IMEI to Member; status controls for all jobs; `SECURITY RISK REWRITE` |
| 72 | status-options map `:5278` | UI callback | tuple→option | centralize enum; `DUPLICATE` |
| 73 | `requestStatusChange` `:5333` | STATUS/UI | jobId→pending globals/modal | stale global job; cross-group pending not cleared; `SECURITY RISK REWRITE` |
| 74 | `confirmStatusChange` `:5392` | STATUS/HISTORY/AUDIT | pending→batch UPDATE repair + SET history + SET audit | Good atomic concept; stale old status/lost update, no version; `KEEP CONCEPT REWRITE` |
| 75 | `quickDone` `:5597` | STATUS shortcut | jobId→request status | `KEEP CONCEPT` through same use case |
| 76 | `openJobDetail` `:5615`; `closeModal` `:5742` | REPAIR/UI (2 raw units) | cached job→PII modal / hide | PII leak, stale modal; `REWRITE` technician DTO |
| 77 | `loadCustomers` `:5755`; `renderCustomers` `:5810`; `customerJobs` `:5907` | CUSTOMERS (3 raw units) | LIST all customer PII→cache/render; phone→job search | Member exposure; phone relation; `SECURITY RISK REWRITE` |
| 78 | customer filter/map/job-count callbacks `:5819,:5853,:5857` | anonymous UI/data join | caches→HTML | O(customers×jobs), phone join; `REWRITE` |
| 79 | `loadReferences` `:5926`; `addReference` `:6010`; `deleteReference` `:6064` | REFERENCE DATA (3 raw units) | LIST/ADD; delete placeholder | Delete `BROKEN`; permissions differ target; `PARTIAL REWRITE` |
| 80 | `updateDashboard` `:6086`; `renderAnalytics` `:6182` | ANALYTICS (2 raw units) | full job cache→metrics | derives from PII over-read/stale state; `REWRITE` safe aggregates |
| 81 | `loadUsers` `:6350`; `renderUsers` `:6405`; search handler `:6519`; `toggleUserActive` `:6525` | LEGACY ADMIN (4 raw units) | LIST/UPDATE top-level users | Current Rules deny; global role wrong; `BROKEN LEGACY DO NOT PORT` |
| 82 | `exportRows` `:6578`; `exportExcel` `:6626`; `exportCSV` `:6675`; `dateFileName` `:6740` | EXPORT (4 raw units) | allJobs PII→file | cache scope/PII, third-party CDN; `KEEP CONCEPT REWRITE` |
| 83 | `startScanner` `:6758`; success/error/catch callbacks `:6784,:6802,:6805`; `stopScanner` `:6821`; beforeunload callback `:6910` | QR/BARCODE/UI (6 raw units) | camera→input/scanner state | lifecycle races/silent frame errors; runtime unverified; `PARTIAL REWRITE` adapter |

Rows containing tightly coupled adjacent units explain why the raw callable count exceeds the table-row count; each raw function is explicitly named and located.

## Callback families not promoted to business functions

All remaining arrow callbacks at `index.html:1814,1866,2627,2638,2783,2802,2813,3145,4072,4346,4353,4356,4406,5142,5278,5344,5403,5619,5769,5775,5786,5819,5853,5857,5940,5963,6093-6108,6145,6227,6243,6249,6269-6297,6378,6414,6442,6580` are pure find/filter/map/sort/reduce/render callbacks. Inputs are the enclosing collection element; outputs are a boolean/value/HTML; they read the enclosing cache/DOM but do not independently write Firestore/Auth. Recommendation: keep algorithmic concepts where useful, move them into selectors/presenters, and never treat client filters as authorization.

## Migration functions

| Function | Location | Purpose / operations | Problems / recommendation |
|---|---|---|---|
| `slugify` | `scripts/migrate_workspace_v2.mjs:48` | name→workspace slug | collision/fixed fallback; `LEGACY` |
| `copyCollection` | `:58` | LIST legacy collection, batch SET into group, verify counts | Count-only verification; rerun overwrites; no schema transform; `LEGACY SECURITY RISK` |
| `Object.values(...).every` callback | `:158` | verify all count flags | count is not content integrity; `REWRITE` migration validator |

Top-level migration statements authenticate with owner email/password from environment, create workspace/member, and copy three global collections. They are a one-shot script, not functions, but are included in the Firestore map.

## Firestore Rules functions

`firestore.rules` defines 11 helpers: `signedIn`, `isFinalStatus`, `workspaceDoc`, `memberDoc`, `isWorkspaceMember`, `workspaceRole`, `isOwner`, `isWorkspaceAdmin`, `isManager`, `isManagerUp`, `isAdminUp`, `canManageExistingRole`, `canAssignRole`, `memberRepairUpdateAllowed`, `managerRepairUpdateAllowed` (15 actual helper declarations). `firestore.workspace.rules` has 9; `firestore.hybrid.rules` has 16. `rg` reports **40 helper declarations total**. The overlap is intentional history but dangerous divergence; central concepts should be rewritten once and covered by matrix tests.

## Test callbacks

The four tracked test suites plus `.repair-tools` contain **86 `test(...)` callbacks and 14 lifecycle hooks**. Each test callback performs fixture setup or an allow/deny assertion and has no production caller. They cover global v1, workspace v2, final/free-plan, web-team, and core-bootstrap variants. Because no `npm test` script exists and direct execution had no emulator, every suite is `NEEDS VERIFICATION`; old-policy suites are `LEGACY`, while isolation/append-only/identity test concepts should be rewritten.

## Duplicate/overlap register

| Locations/functions | Overlap / difference / risk | Next design |
|---|---|---|
| `loadCurrentUserProfile`, auth observer, registration | Profile creation/loading repeated with different fields/roles | `UserProfileRepository` + `BootstrapSession` |
| workspace functions 3–12 | Discovery/bootstrap/switch/reload overlap and mutate globals | Central `GroupSessionService` |
| role UI/helpers/team/rules | Four hierarchies and legacy admin | One permission policy and Rules mirror tests |
| `loadJobs/loadCustomers/loadReferences/loadTeamMembers/loadUsers` | Repeated LIST→array→sort→render | Repositories + query DTOs |
| mutation handlers + `appendWorkspaceAudit` | Primary update then separate best-effort audit | Use-case transaction/backend audit |
| status batch vs assignment/member/invite | Only status mutation is atomic | Standard transactional command boundary |
| `formatDate/getTime/dateFileName` | Timestamp normalization repeated | Time adapter |
| original/patched `renderJobCard` | Same renderer is reassigned and string-injected | Component with explicit assignment slot |
| client filters across jobs/customers/analytics | Search and authorization concerns mixed | Server-secure query + pure view selector |
| Firebase versions/configs | Browser 10.8, npm 12.17, 3 Rules versions/4 configs | One pinned SDK/toolchain per environment |

## Quality limits

Static inspection proves reachable code and Rules compatibility, not deployed state, index readiness, authorized domains, Auth provider settings, or actual document schemas. Those remain `NEEDS VERIFICATION`.
