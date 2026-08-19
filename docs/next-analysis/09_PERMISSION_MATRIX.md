# SmartRepair Permission Matrix

`✓` baseline allow, `—` deny, `O` ordinary custom override may add, `P` protected OWNER-only and never grantable.

| Capability | OWNER | MANAGER | MEMBER default | Override / constraints |
|---|:---:|:---:|:---:|---|
| `repair.group.view` | ✓ | ✓ | — | O only if product approves; otherwise assigned query only |
| `repair.assigned.view` | ✓ | ✓ | ✓ | Resource must be assigned to UID |
| `repair.create` | ✓ | ✓ | — | O |
| `repair.edit` | ✓ | policy decision | — | O bounded fields; customer PII never implied |
| `repair.assign` | ✓ | ✓ | — | O; target active same-group member |
| `repair.assigned.status.update` | ✓ | ✓ | ✓ | Resource+transition constraint |
| `repair.group.status.update` | ✓ | ✓ | — | O |
| `repair.archive` | ✓ | — | — | Owner baseline; decision whether Manager override allowed |
| `customer.view` | ✓ | ✓ | — | Member cannot override under stated target |
| `customer.manage` | ✓ | — | — | **P** |
| `team.view` | ✓ | ✓ | — | O if limited projection approved |
| `team.invite` | ✓ | ✓ | — | Manager offered role ≤ MANAGER; no protected permissions |
| `team.remove` | ✓ | ✓ | — | Manager target MEMBER/MANAGER below policy; never Owner/self |
| `member.role.manage` | ✓ | limited | — | Manager may Member→Manager; never owner/self |
| `member.permission.manage` | ✓ | limited | — | grant subset; no self; no protected; no Owner |
| `analytics.view` | ✓ | ✓ | — | O if privacy-safe aggregates approved |
| `reference.view` | ✓ | ✓ | product decision | O |
| `reference.manage` | ✓ | product decision | — | O |
| `audit.view` | ✓ | product decision | — | likely no Member override for sensitive security audit |
| `ownership.*` | ✓ | — | — | **P**, proposal/backend only |
| `owner.manage` | ✓ | — | — | **P**, proposal/backend only |
| `group.delete` | ✓ | — | — | **P**, unanimous proposal/backend |
| `security.critical.manage` | ✓ | — | — | **P**, unanimous proposal/backend |

## Manager anti-escalation algorithm

For any Manager role/permission command, trusted policy must establish:

1. Actor membership active in same `groupId`; actor role MANAGER.
2. Target UID differs from actor UID.
3. Target is active/pending as action permits and is not OWNER.
4. Manager may not create/promote an OWNER or perform Manager→Owner.
5. Requested permission set contains no protected capability.
6. Every granted capability is in actor’s `grantableCapabilities`, not merely current UI options.
7. Actor cannot grant a capability the actor lacks or that policy marks non-delegable.
8. Transaction checks membership versions to prevent stale role races and writes authoritative audit.

## Multi-group example

User A’s OWNER in Group 1 grants no authority in Group 2 or 3. Every permission evaluation key is `(uid, groupId, membershipVersion)`. Group 2 MANAGER cannot use Group 1 ownership to grant capabilities. Group 3 MEMBER query remains assigned-only. No global `admin/user` role participates.

## Required negative tests

- Unauthenticated denied everywhere private.
- Missing/inactive membership denied even with cached UI role.
- Member cannot get/list Customer or another assignee’s repair.
- Manager cannot write Customer, self role/permissions, Owner, protected capability, group delete/security policy.
- Cross-group IDs and queries fail.
- Role/permission update invalidates existing session/caches promptly.
