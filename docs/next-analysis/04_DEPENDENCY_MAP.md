# Dependency and Firestore Access Map

## Actual startup sequence

```text
HTML parse + CDN scripts
→ module imports Firebase 10.8
→ initializeApp → getAuth → getFirestore
→ activeWorkspaceId read from localStorage (or hard-coded default)
→ installTeamWebUI / register DOM listeners
→ onAuthStateChanged
   ├─ no user: show auth, hide app, currentRole="user"
   └─ user:
      → loadCurrentUserProfile (GET/possibly SET users/{uid})
      → resolveActiveWorkspace
         → collectionGroup members where uid==user.uid
         → fallback direct personal membership GET on discovery error
         → ensurePersonalWorkspace only when no memberships
         → save activeWorkspaceId + render switcher (N workspace GETs)
      → loadCurrentWorkspaceMembership (GET member → GET workspace)
      → reveal app → applyRoleUI → navigate dashboard
      → loadAllData: loadJobs + loadCustomers + loadReferences concurrently
```

Authentication succeeds before authorization/bootstrap. The observer catch reports “Auth passed, Workspace failed” but does not roll back session or fully reset UI.

## Use-case traces

| Flow | Actual dependency chain | Gaps / risk |
|---|---|---|
| Register | UI → validation → Auth create → `/users/{uid}` SET → verification email → Auth observer → profile → memberships → personal workspace/member → app data | Non-atomic; observer can race submit; partial Auth/profile/workspace |
| Login | UI → signIn → observer → profile/global active → membership discovery → active group → membership role → loaders | Global role overwritten by group role; fallback couples login to personal workspace |
| Logout | UI confirm → Auth signOut → observer hides app | Arrays, group ID/localStorage, pending modal, team caches, scanner not explicitly cleared |
| Profile | observer → GET self; missing→SET default; active false→signOut | No profile edit use case; global authorization mixed in profile |
| Invitation create | Team UI → email/role → duplicate pending query → ADD invite → best-effort ADD audit → reload invitations | Check/create race; email identity; no expiry/existing member |
| Accept | invitation list → GET invite → UPDATE accepted → SET member → ADD audit → refresh/switch group | Four independent commits; stale/replay/partial state |
| Create repair | Job form → validation → ADD repair → derive phone ID → MERGE customer → reload all → render | Customer write unauthorized by target; no transaction/audit/history |
| Edit repair | No general UI; status/assignment only | Feature partial; Rules permit more fields than UI |
| Customer | page/navigation/auth load → LIST all customers → global cache → client search/render → phone-based job filter | Member PII leak; client filter; unstable identity |
| Assignment | render card → cached member select → UI role check → UPDATE repair → ADD audit → LIST repairs → render | No membership-at-write validation, notification, version, atomic audit |
| Status | select → pending globals/modal → stale cached job → batch repair/history/audit → reload all | Atomic batch is good; missing version/precondition and assigned scope |
| Team | page → parallel LIST members + collectionGroup invitations + LIST audit | User invitation query not active-group-only; global caches; audit/member visibility policy |
| Analytics | navigation role check → already-loaded all repairs → client date/status/revenue aggregation | Requires over-reading PII and all jobs; stale state |

## Firestore operation map

Paths use `{g}` active workspace, `{u}` UID, `{r}` repair, `{i}` invitation.

| # | Function/source | Operation/path/query | Fields read/written and identity/scope | Relevant Rule / compatibility |
|---:|---|---|---|---|
| 1 | personal bootstrap `1483` | GET `workspaces/ws-{u}/members/{u}` | status, role | members GET 208–212: compatible |
| 2 | same | GET `workspaces/ws-{u}` | ownerUid/name | workspace GET owner recovery 175–179: compatible |
| 3 | same | CREATE/SET workspace | ownerUid=u, status, plan, subscription, limit, timestamps | create 183–188: compatible; schema not key-limited |
| 4 | same | CREATE/SET member | uid=u, role owner, active, email/name/times | create 228–259: bootstrap branch compatible |
| 5 | discovery `1718` | LIST collectionGroup `members`, `uid==u` | uid/status/role/path | wildcard list 459–462 + index: compatible |
| 6 | switcher `1829` | GET each `workspaces/{g}` | name | member/owner GET: compatible, N+1 |
| 7 | membership loader `1902` | GET member then workspace | role/status; workspace all fields | compatible |
| 8 | registration `2325` | CREATE `/users/{u}` | uid/profile/email, role=user, active, timestamps | user create 126–130: compatible but lacks timestamp/schema checks |
| 9 | profile loader `2546` | GET/CREATE `/users/{u}` | role/active; default profile | self rules compatible |
| 10 | create group `3176` | CREATE workspace; CREATE owner member | same as bootstrap | compatible; non-atomic |
| 11 | invite create `3334` | LIST `{g}/invitations` where email+pending | emailLower/status | list admin-up + query predicate: compatible for owner/admin |
| 12 | same | CREATE invitation | email, offered legacy role, inviter UID, workspace metadata, times | create 377–388: compatible; Owner/Admin only, no expiry/UID |
| 13 | invitations `3508` | LIST collectionGroup invitations where email==Auth email | all invite fields | wildcard list 471–475: compatible; email identity |
| 14 | respond `3715` | GET invitation | status/email/role | recipient GET 355–364: compatible |
| 15 | respond | UPDATE invitation | status/respondedBy/respondedAt/updatedAt | update 394–433: compatible for accepted/declined |
| 16 | respond | CREATE member `{u}` | uid, invite role, active, invitationId, PII/times | create verifies accepted invite/email/role: compatible but replay/partial |
| 17 | team loader `3882` | LIST `{g}/members` unfiltered | full member docs | nested list 219–220 appears to require returned uid=self; however wildcard list 459–462 also requires uid=self. Full roster query likely denied. **Frontend↔Rules incompatible/BROKEN unless overlapping match behavior or deployed Rules differ; emulator verification required.** |
| 18 | role/status/member handlers | UPDATE/UPDATE/DELETE member | role/status/updatedAt | lower-role/self/owner constraints 261–283; compatible only for permitted hierarchy |
| 19 | assignment `4378` | UPDATE repair | assignedTo, email/name, assignedAt, updatedAt | Manager rule has no affectedKeys list; compatible but under-validated |
| 20 | audit helper `4588` | CREATE audit | client actor/action/target/details/time | actor/time only 441–443: compatible, semantically forgeable |
| 21 | audit loader `4654` | LIST all auditLogs | all fields | manager-up read: compatible; no query limit |
| 22 | job create `4842` | CREATE repair | customer PII/device/price/status/assignment/creator/times | create checks creator/status/times only: compatible, schema broad |
| 23 | same | CREATE/UPDATE customer `{phoneDigits}` merge | name/phone/note/last job/time | any member create; Member listed fields update: compatible, target violation |
| 24 | jobs `5047` | LIST all `{g}/repairs` | entire docs including PII | any active member read 287: compatible, CRITICAL target violation |
| 25 | status `5392` | batch UPDATE repair | status/note/actor/time | Member path checks some identity/time but not assignment; manager broad |
| 26 | status | batch CREATE `repairs/{r}/statusHistory/{auto}` | from/to/note/actor role/time | create checks actor/time and toStatus=getAfter: compatible |
| 27 | status | batch CREATE audit | before/after/action/actor/time | compatible and atomic |
| 28 | customers `5755` | LIST all customers | name, phone, note, last job | any member read 316: compatible, CRITICAL target violation |
| 29 | references `5926/6010` | LIST/CREATE references | name/type/creator/time | all members read, manager-up write: compatible |
| 30 | users `6350/6525` | LIST `/users`; UPDATE other user active | global profiles/active | current Rules self-read/self-update only: **BROKEN** |

Production source has 40 primitive call sites because some operation classes appear in branches or repeated handlers. There is no production status-history read, notification operation, archive operation, customer edit form, ownership proposal, or group delete.

## Rules/config matrix

| Rule file | Referencing config | Model / supported collections | Compatibility / likely purpose | Status |
|---|---|---|---|---|
| `firestore.rules` | `firebase.json`, `firebase.final.json`, misleading `firebase.hybrid.json` | self users; workspace members/repairs/customers/references/invitations/audit; locked globals | Closest to frontend and reported deployed; team full roster likely query mismatch; global admin broken | Current legacy production |
| `firestore.workspace.rules` | `firebase.workspace.json` | workspace with owner/admin/manager/member | Cannot support recipient invitation discovery/accept; earlier bootstrap coupling | Obsolete |
| `firestore.hybrid.rules` | **none** | permissive global v1 plus workspace v2 | Migration compatibility; broad global reads and no invitation acceptance | Obsolete/high risk |

## Rule audit highlights

- `get/list`: workspace parent list denied correctly; member/invitation collection-group queries attempt predicate alignment. Full member roster is not aligned with the self-only list predicate and needs emulator confirmation.
- `create/update`: Rules do not enforce complete allowed-key schemas for workspace, repair, customer, invitation, or audit. Extra client-controlled fields may be stored.
- role/membership: active membership is enforced, but permissions are hard-coded role comparisons and include obsolete `admin`.
- ownership: `ownerUid` makes a second owner ineffective and is client-created security state.
- timestamps: some sensitive creates enforce server time; member updates only require `updatedAt` to be among changed fields, not equal request time. Assignment allows client serverTimestamp but does not require it.
- audit: append-only document mutation is enforced, but content integrity is not.
- isolation: path-based group isolation is strong for correctly scoped calls; active group selection and stale client caches remain client data leak risks.
- query/resource policy: Members are allowed to list whole repairs/customers, preventing target confidentiality regardless of UI.

## AuthN vs AuthZ

Authentication is Firebase email/password and Auth state. Authorization is separately derived from `/users.active`, active-group membership status, membership role, and Rules. The legacy code conflates them in bootstrap and UI. SmartRepair must never use `/users.role` for shop authorization; only active group membership plus effective permission/resource scope may authorize group actions.
