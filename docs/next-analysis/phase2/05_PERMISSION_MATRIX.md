# Role × Action × Resource Matrix

Legend: `A` allow baseline, `D` deny, `O` OWNER-grantable ordinary override, `B` trusted backend only, `S` resource-scoped condition.

| Resource/action | OWNER | MANAGER | MEMBER | Mandatory scope/notes |
|---|:---:|:---:|:---:|---|
| Group get | A | A | A | active same-Group membership; safe metadata only |
| Group update name/settings | A | D | D | critical settings use B/proposal |
| Group delete | B | D | D | protected, unanimous proposal |
| Membership list/team view | A | A | D | minimal roster projection; no sensitive email by default |
| Invite MEMBER | A/B | A/B | D | backend create, same Group, target UID |
| Invite MANAGER | A/B | A/B | D | Manager may offer MANAGER but no excess grants |
| Invite OWNER | B | D | D | ownership proposal, not normal invite |
| Remove MEMBER | A/B | A/B | D | actor≠target; assignment impact; backend mutation |
| Remove/demote MANAGER | A/B | D | D | OWNER only; Manager manages MEMBER targets only |
| Touch OWNER | B | D | D | unanimous security workflow |
| Promote MEMBER→MANAGER | A/B | A/B | D | Manager ceiling and version check |
| Change ordinary Member permissions | A/B | A/B | D | grant subset; no self/protected/non-delegable |
| Change own role/permissions | D | D | D | no self-modification; Owner security via proposal |
| Customer get/list | A | A | D | MEMBER Rules deny path entirely |
| Customer create/update/archive | A | D | D | `customer.manage` protected |
| Repair list all Group | A | A | D | never grantable to MEMBER in V1 |
| Repair list assigned | A | A | A | MEMBER query requires assignedToUid=self |
| Repair get assigned | A | A | A/S | parent resource assignment checked |
| Repair get unassigned/other | A | A | D | no client filtering |
| Repair create | A | A | D | Member cannot read/select Customer; no V1 override |
| Repair general edit | A | D | D | status/assignment are separate commands |
| Repair assign | A | A | D | target active same Group; transaction |
| Assigned status update | A | A | A/S | legal transition, current assignment/version |
| Any Group status update | A | A | D | explicit `repair.group.status.update` |
| Status history read | A | A | A/S | MEMBER only parent assigned repair |
| Repair archive | A | D | D | soft delete; owner baseline |
| Repair hard delete | D/B | D | D | retention purge backend only |
| Reference read | A | A | D/O | non-sensitive only |
| Reference manage | A | D | D | OWNER only in V1 |
| Analytics view | A | A | D | privacy-safe aggregates only |
| Audit view | A | D | D | confidential/non-delegable default |
| Audit create security event | B | D | D | backend-only |
| Notifications list/read | A/S | A/S | A/S | own UID only |
| Mark notification read | A/S | A/S | A/S | only `readAt`; own UID |
| Export | DEFER | D | D | not Phase 3A/V1 core; future OWNER-only backend/audited |
| Propose/approve ownership | B | D | D | active OWNER only |
| Execute ownership/security | B | D | D | backend verifies unanimous snapshot |

## State modifiers

Unauthenticated, missing Membership, SUSPENDED/REMOVED Membership, mismatched Group, archived resource where command disallows, stale version, expired invitation/proposal, unknown capability, or invalid schema changes any apparent `A/O` to `D`.

## Consistency contract

Firestore Rules design must implement the same read/resource conditions and prevent direct membership/security writes. Backend policy implements every `B`. UI may hide `D`, but tests call repositories/backend directly to prove denial.
