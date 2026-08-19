# Central Permission Model

## Capability registry

Repair: `repair.assigned.view`, `repair.group.view`, `repair.create`, `repair.edit`, `repair.assign`, `repair.assigned.status.update`, `repair.group.status.update`, `repair.archive`, `repair.private.view`.  
Customer: `customer.view`, `customer.manage`.  
Team: `team.view`, `team.invite`, `team.remove`, `member.role.manage`, `member.permission.manage`.  
Product: `analytics.view`, `reference.view`, `reference.manage`, `audit.view`, `export.execute`.  
Security: `ownership.propose`, `ownership.approve`, `ownership.execute`, `owner.manage`, `group.delete`, `security.critical.manage`.

Protected registry (OWNER-only, never stored as effective override for lower roles): `customer.manage`, every `ownership.*`, `owner.manage`, `group.delete`, `security.critical.manage`.

Non-delegable confidentiality capabilities: `customer.view`, `repair.private.view`, `audit.view` cannot be granted to MEMBER even though not all are ownership-protected. This resolves the fixed Customer/Member requirement. Registry metadata: `{protected, delegableToRoles, resourcePolicy}`.

## Role defaults

- OWNER: all registered capabilities.
- MANAGER: repair group/assigned view, create, assign, assigned/group status; customer view; team view/invite/remove; member role/permission manage within ceiling; analytics view. No export baseline, general repair edit/archive/private edit, reference manage, audit or protected capabilities.
- MEMBER: assigned view and assigned status update. Optional ordinary OWNER-granted allow overrides.

## Overrides and calculation

Membership stores `allow[]` and `deny[]`. Deny is useful for reducing ordinary role defaults; it cannot disable mandatory safety obligations and cannot manufacture resource access.

```text
assert ACTIVE membership and valid role
baseline = RoleDefaults[role]
validAllow = allow ∩ Registry ∩ delegableTo(role) − Protected − ForbiddenForRole
validDeny = deny ∩ Registry
effective = (baseline ∪ validAllow) − validDeny
then apply resource predicate and command invariants
```

Unknown capabilities fail closed. Role change recomputes/normalizes overrides; incompatible grants are removed in the same transaction and audited. Permission snapshot is cached only with membershipVersion/securityVersion.

## Authority and resource scope

A capability alone is insufficient. Example: MEMBER with `repair.assigned.status.update` must satisfy `repair.assignedToUid == actorUid`, same Group, active membership, non-archived, permitted transition. MANAGER `customer.view` grants read only, never write. Group authority never crosses path.

## Manager ceiling

Manager may manage a target only if actor ≠ target, target is not OWNER, actor and target are same Group/active as action requires, role transition is MEMBER→MANAGER or target-role MEMBER removal, and requested grants are a subset of `actorEffective ∩ managerGrantableRegistry`. Manager cannot grant `customer.view` to MEMBER, any protected/non-delegable capability, or a capability Manager lacks. Manager cannot modify own role/permissions/status.

OWNER can manage non-owner role/ordinary permissions directly, but promotion/removal of OWNER uses SecurityProposal. OWNER also cannot bypass proposal by writing membership role directly.

## Enforcement locations

- UI: affordance only.
- Application/domain: complete policy and actionable errors.
- Firestore Rules: deny direct invalid reads/writes and enforce query/resource/schema predicates.
- Trusted backend: re-evaluate actor/target/membership/version; only boundary for membership authority and security-critical mutations.

## Invalidation

Membership `membershipVersion` increments on role/status/permission change; Group `securityVersion` increments on ownership/critical policy. Session listener/snapshot or backend response detects mismatch, clears Group caches and rebuilds effective permissions. Sensitive command backend always re-reads, so stale clients cannot authorize.

## Phase 2.5 lock

MANAGER has no export baseline. In V1 OWNER may grant MEMBER only `reference.view`; all other additive grants are rejected. See [15_DECISION_LOCK.md](15_DECISION_LOCK.md).
