# Security Audit

Severity reflects SmartRepair target confidentiality/integrity and plausible legacy impact. Live exploitability depends on deployed Rules/data and requires verification; source evidence is exact.

## Findings

| ID / Severity | Evidence | Attack/failure scenario and impact | Recommended fix / SmartRepair requirement |
|---|---|---|---|
| S-01 CRITICAL | `firestore.rules:286-317`; `index.html:4910-4947,5047,5199,5755` | Any active Member lists all repairs/customers and reads name, phone, notes, IMEI. Full customer confidentiality loss. | Split customer vault; Member deny customer; technician-safe repair schema; Rules resource predicate |
| S-02 CRITICAL | `loadJobs` unqualified LIST `:5047`; repair read `rules:287` | Member reads all other technicians’ jobs; IDOR/list exposure. | Member query and Rules require `assignedToUid==auth.uid` |
| S-03 CRITICAL | single `ownerUid` `rules:33-37`; no proposal/backend source | Multiple equal owners/transfer cannot be represented; client ownership workflow would be unsafe or last owner can become inconsistent. | OWNER memberships + backend proposal/snapshot/unanimous transaction |
| S-04 HIGH | customer create/update `rules:315-327`; job submit customer upsert `:4960` | Member alters Customer master; Manager can edit contrary to target. | Owner-only customer manage; Manager read; Member deny |
| S-05 HIGH | member repair update allow-list includes PII/price `rules:86-100` | Member changes customer name/phone/note/price on any recent non-final job. | Assigned-status-only rule; field-specific commands |
| S-06 HIGH | Manager update lacks affected-key schema `rules:103-121` | Manager injects arbitrary fields/security-like metadata or rewrites assignment/customer fields. | Strict schema/field allow-list and separate permissions |
| S-07 HIGH | invitation flow `:3334,3715`; no expiry/UID/transaction | Duplicate invite/accept, accepted without membership, stale role grant, email recycling. | UID-bound backend state machine, expiry, nonce/idempotency, atomic membership/audit |
| S-08 HIGH | switch `:1978`; globals `:2005`; loaders clear only after fetch | Slow old-group response overwrites new group cache or failed load shows prior PII. | Clear/cancel on switch; generation-token reducers; group-keyed caches |
| S-09 HIGH | audit `rules:438-445`; helper `:4588` catches failure | Client creates misleading action/target/details; completed mutation has no audit. Integrity/non-repudiation failure. | Critical backend audit, strict schema, atomic command |
| S-10 HIGH | assignment `:4378`; manager broad update | Assign removed/inactive/cross-stale member; simultaneous assignments lose one; no notification/audit atomicity. | Transaction re-read member/group/version, notification/audit |
| S-11 HIGH | global admin UI `:6350-6550`; role helpers; user Rules self-only `:123-143` | Owner/admin sees admin controls that always fail; alternate hybrid Rules could grant broad global admin. Configuration swap changes authority drastically. | Remove global admin shop auth; explicit trusted support tooling |
| S-12 MEDIUM | register `:2325`; observer `:2451` | Auth account created but profile/group fails; retry email blocked, unusable account. | Recoverable onboarding saga and explicit states |
| S-13 MEDIUM | status uses cached old status `:5392`; no repair version | Concurrent changes produce incorrect `fromStatus`, last-write-wins and inconsistent business history. | Transaction current read/version/idempotency |
| S-14 MEDIUM | group create/bootstrap independent writes `:1483,:3176` | Orphan group or member; login recovery complexity and unauthorized assumptions. | Backend/transaction bootstrap |
| S-15 MEDIUM | member roster LIST `:3882` vs self-only list predicates `rules:219-220,459-462` | Team feature may be permission-denied in production; operators may be tempted to broaden Rules. | Define team projection/query and test; never broad fix blindly |
| S-16 MEDIUM | Rules lack complete key/type validation on repair/customer/workspace/audit | Malformed/extra fields cause schema confusion, stored XSS risks in future contexts, policy bypass candidates. | Runtime schema + strict Rules keys/types/version |
| S-17 MEDIUM | phone document ID/relation `:4960,:5857,:5907` | Collisions/shared/reformatted numbers merge customers; history misattribution. | Stable random customerId; normalized phone index only |
| S-18 MEDIUM | `generateJobNumber :2077` client time/random | Collision or manipulated clock yields duplicate external identifiers. | Backend/transactional unique sequence or UUID plus display number |
| S-19 MEDIUM | member removal audit before delete `:4284`; other audit after write | False “removed” event when delete fails; inconsistent event ordering. | One atomic backend use case |
| S-20 MEDIUM | logout `:2670`/no explicit cleanup | PII remains in JS memory/UI/local active group after logout until reload/overwrites. | Central teardown zeroizes scoped stores/pending UI |
| S-21 MEDIUM | Promise.allSettled ignored `:4825` | Partial failed load leaves stale data but app appears ready. | Interpret results; fail closed per resource and clear old cache |
| S-22 MEDIUM | alternate Rules/configs; hybrid config mismatch | Developer tests/deploys unintended policy; hybrid opens global data to active v1 users. | One explicit environment mapping; CI assert file hash/project |
| S-23 MEDIUM | migration script client password + non-transactional copy | Owner credential process, partial rerun/overwrite, PII copied unchanged, count-only verification. | Admin SDK controlled pipeline, dry-run/manifests/hashes |
| S-24 LOW | login logs full error object `:2249`; logs/debug reports | Sensitive diagnostics/project details may leak through console/files; live tokens in debug logs need verification. | Redacted structured logging; exclude/sanitize logs; rotate if needed |
| S-25 LOW | public Firebase API key in source | Key is not Admin secret, but can identify project and enable quota abuse if controls weak. | App Check/quotas/authorized domains; verify restrictions |
| S-26 LOW | silent catch `:1892`, scanner catch `:6917` | Operational failures hidden, stale labels/scanner cleanup uncertainty. | Central observable errors with safe user messaging |
| S-27 LOW | CDN dependencies without app build pin/integrity | Supply-chain/version/availability drift affects export/scanner/UI. | Bundle pinned dependencies, CSP/SRI where applicable |
| S-28 LOW | export uses cached allJobs PII | Wrong-group stale cache could be exported; no export audit. | Repository export query, permission, generation, audit |
| S-29 LOW | no email-verified authorization gate | Unverified account may use app if Auth user exists. | Explicit product decision and verified claim enforcement |

Totals: CRITICAL 3, HIGH 8 (S-04–S-11), MEDIUM 12 (S-12–S-23), LOW 6 (S-24–S-29).

## Required trusted-boundary controls

- Never trust client `actorUid`, role, permission, owner set, target membership, timestamps, before/after, proposal status, or subscription fields.
- Backend resolves Auth UID and re-reads active membership/group/security version in transaction.
- Proposal `requiredOwnerIds` is immutable snapshot. Approval doc ID is owner UID. Execute once with nonce/idempotency and expiry.
- If owner set changes, invalidate proposal by default. Never recompute a smaller quorum.
- Enforce last-owner invariant and target acceptance/current active membership.
- Rules remain deny-by-default; a missing backend must result in `BACKEND REQUIRED`, never broader client Rules.

## Session/cache threat model

All Customers, Repairs, Members, Analytics, invitations, audit rows, and pending commands are group-scoped. On group switch/role change/member suspension, unsubscribe and clear before rendering; refresh membership and permission version; reject stale response generations. Sensitive customer cache should be in-memory only unless a separately approved offline encryption/threat model exists.
