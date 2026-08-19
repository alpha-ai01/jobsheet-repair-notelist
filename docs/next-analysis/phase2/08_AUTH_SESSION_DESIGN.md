# Authentication and Session Design

## Separation

Auth state `{uid,email,emailVerified,token}` proves identity only. Authorization is `{activeGroupId, active Membership, role, effectivePermissions, membershipVersion, groupSecurityVersion}`. UserProfile has no Group role.

## Register

```text
Register form → validate → Firebase createUser
→ send verification (policy-dependent)
→ ensureProfile(uid) idempotently
→ session state AUTHENTICATED_PROFILE_READY (Group actions remain blocked until email verified)
→ list Group summaries
→ no groups: ONBOARDING_NO_GROUP
```

Recovery: if Auth exists but profile missing, `ensureProfile` creates safe self profile. If profile write fails, retain signed-in restricted recovery state with retry; never create implicit Group. Duplicate registration directs safe login/reset flow without account enumeration details.

## Login/bootstrap states

`SIGNED_OUT → AUTHENTICATING → AUTHENTICATED → PROFILE_LOADING/PROFILE_REQUIRED → GROUPS_LOADING → GROUP_SELECTION_REQUIRED | GROUP_CONTEXT_LOADING → READY`, with terminal/retryable `ERROR` substate. Missing profile is recoverable; missing membership for a saved Group clears saved selection and returns Group selection; suspended membership denies Group and clears caches.

## Session model

```text
Session {
 auth: {uid,emailVerified,tokenGeneration},
 profile,
 availableGroups[],
 active: {groupId,membership,permissions,membershipVersion,securityVersion}|null,
 generation:number,
 status,
 lastError?
}
```

Only non-sensitive `lastActiveGroupId` may persist locally. It is a preference, not authority. Customer/repair/member caches are keyed by active group and generation; Customer PII is memory-only by default.

## Group switch

1. Validate target appears in summary; set `SWITCHING` and increment generation.
2. Abort/unsubscribe old requests/listeners; close modals and clear pending repair/status/assignment/export commands.
3. Clear all Group-scoped caches before new reads.
4. GET exact Group and Membership; require ACTIVE; calculate permissions/version.
5. Commit active context only if request generation remains current; start scoped loaders/listeners.
6. On failure fail closed and remain with no active Group, not stale previous data; user may explicitly switch back.

## Role/permission/status invalidation

Listen to own Membership/summary or validate versions on backend responses. Any version change increments generation, clears affected caches and rebuilds permissions. SUSPENDED/REMOVED immediately exits Group. Token refresh alone cannot substitute membership re-read.

## Logout

Set `SIGNING_OUT`, increment generation, cancel subscriptions/requests, stop camera/export work, clear forms/modals/errors, zero Group/customer/repair/member/analytics caches, clear active context and persisted preference as product chooses, then Firebase signOut. Auth observer is idempotent and repeats cleanup.

## Errors

Infrastructure errors map once into central codes with `retryable`, safe user message, correlation ID and redacted cause. UI never branches on raw Firebase strings. Permission/membership errors fail closed and trigger context refresh; network error does not restore stale PII views.

## Concurrency

Every repository result carries groupId/generation. Reducers discard mismatch. Commands carry expected entity/membership versions and idempotency key. Disable UI double-submit for UX, but backend enforcement remains mandatory.

## Tests

Partial registration, missing/corrupt profile, no groups, invalid saved group, missing/suspended membership, multi-group different roles, concurrent switches/out-of-order responses, permission change during modal, logout during fetch/camera/export, token expiry, offline/reconnect and stale cache rejection.
