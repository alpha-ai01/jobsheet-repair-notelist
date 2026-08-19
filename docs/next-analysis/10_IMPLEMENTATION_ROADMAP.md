# SmartRepair Implementation and Test Roadmap

This is design sequencing only; Phase 1 created no SmartRepair source.

| Phase | Goal / dependencies | Deliverables | Tests / security gate | Exit criteria / principal risk |
|---:|---|---|---|---|
| 0 | Freeze evidence and decide open policies | ADRs, data dictionary, role/capability matrix, environment map | Threat model review | Owner/Manager/Member semantics signed off; risk: ambiguous product policy |
| 1 | Foundation | new repo/build, modules, schemas, typed errors, repository ports, emulator CI | schema/unit/toolchain; dependency scan | one command runs lint/unit/emulators; risk: overengineering |
| 2 | Authentication/Profile | Auth adapter and recoverable bootstrap states | login/register/reset/verification/profile; no group creation side effect | missing profile and partial registration integration tests | Auth success/failure/recovery deterministic |
| 3 | Group/Membership/Session | explicit group creation/list/switch, central session generation | Group/Membership repositories, scoped stores, permission engine | cross-group, inactive, multi-group, stale response tests | no request without explicit group context; caches clear on switch |
| 4 | Invitations/Notifications | UID-bound onboarding | registered-user search privacy, invite/accept/decline, notification center | duplicate/existing/expired/replay/role elevation tests | idempotent membership creation and audit |
| 5 | Customer Vault | protect PII before repairs | stable Customer entity/repository/UI; Owner edit, Manager view | Member get/list/query/write denied; Manager write denied | PII never enters Member-readable DTO/document |
| 6 | Repairs | technician-safe create/list/detail/archive | group and assigned query contracts; version/archive fields | Member another job denied; schemas; create/archive permissions | required indexes/Rules tests green |
| 7 | Assignment/Status/History | consistent mutations | transactional assignment/status use cases, history, notifications, audit | concurrency/lost-update/inactive/cross-group tests | atomic changes and idempotency verified |
| 8 | Team/Reference/Analytics/Audit | operational UI on secure repositories | member management, permissions, safe aggregates, audit views | Manager escalation matrix; audit append-only/content source | every UI action maps one tested use case |
| 9 | Ownership Security Backend | critical multi-owner lifecycle | proposals, owner snapshots, approvals, acceptance, execution, group delete workflow | unanimous/sole-owner/last-owner/expiry/replay/set-change/concurrent proposal tests | external security review; backend audit complete |
| 10 | Export/Scanner | non-core adapters | permission-scoped CSV/XLSX, QR/barcode scanner | PII/export audit, camera/browser/manual tests | no stale/wrong-group export; formats verified |
| 11 | Migration/Pilot | transform legacy data | immutable export, mapping manifest, quarantine, dry-run, pilot | hashes/counts/references/PII split/role mapping/regression | one pilot group reconciled and rollback rehearsed |
| 12 | Cutover | minimal safe production | monitoring, runbooks, read-only legacy period | smoke/security/regression/manual UI | agreed SLO and no critical/high unresolved |

## Test suites

- Unit/domain: entity invariants, permission composition, transitions, owner quorum.
- Repository: exact queries, converters, schema failure, pagination, cancellation generation.
- Firestore Rules: Auth/membership/role/resource/field matrices and collection query compatibility.
- Backend security: Auth UID binding, transaction/version/idempotency, protected operations/audit.
- Integration: bootstrap, multi-group switch, invite, repair/customer, assignment/status.
- Regression: representative legacy records, migration transformations, exports/scanner.
- Manual: browser/mobile/accessibility/network interruption/double-submit/group switch under load.

## Quality gates before any production migration

All mandatory negative security tests pass; no critical/high finding accepted without explicit risk owner; Rules deployed from CI to named environment; backend and Rules versions recorded; data snapshot/restoration rehearsed; legacy remains recoverable/read-only; monitoring detects permission-denied spikes, proposal failures, stale clients, and audit gaps.
