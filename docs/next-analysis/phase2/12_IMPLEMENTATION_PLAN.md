# Phase 3+ Implementation Blueprint

Proposed modules are illustrative paths for the new `SmartRepair` repository, not files created in Phase 2.

| Phase | Goal; modules | Dependencies | Security gate/tests | Exit criteria | Rollback |
|---:|---|---|---|---|---|
| 0 | Lock ADRs/contracts: `docs/adr`, capability registry, schemas | Phase 2 decisions | threat-model review | Phase 2.5 decision lock signed | revise docs only |
| 1 | Toolchain/foundation: `src/domain`, `src/application`, `src/infrastructure`, `src/ui`, `functions`, `tests`, emulator CI, error model | new repo/envs | pinned deps, secret/config scan, deny-default skeleton | one command validates all; no app feature | delete isolated scaffold branch |
| 2 | Auth/Profile: AuthGateway, profile schema/repo, BootstrapSession | 1 | partial registration/missing profile/error redaction | deterministic restricted/ready states | feature flag; Auth users retained |
| 3 | Group/Membership/Session/Permissions: GroupContext, summaries, session store, PermissionPolicy | 2 | cross-Group/inactive/multi-role/stale switch | no Group repo without context; cache generation tests | disable Group feature; no data migration |
| 4 | Backend membership/invitations/notifications: functions and outbox | 3 | escalation, duplicate/expiry/replay/atomic accept | idempotent onboarding and safe notification payload | disable endpoints; expire test invites |
| 5 | Customer vault: Customer aggregate/repo/Owner UI/Manager projection | 3 | MEMBER path deny, Manager write deny, exact schema | PII isolation independently proven | feature flag; retain isolated data |
| 6 | Technician-safe Repair: aggregate/repo/query/UI/archive | 5 customer IDs | assigned query/Rules, no PII DTO, version/archive | Owner/Manager/Member read matrix green | disable create; preserve records |
| 7 | Assignment/Status/History/Audit: backend commands/outbox | 4,6 | concurrency/idempotency/atomic history-audit | no inconsistent mutation under fault injection | revert endpoint version; old endpoint disabled safely |
| 8 | Team/role/permissions/reference/analytics/audit views | 3,4,7 | Manager ceiling, protected grants, aggregate privacy | each action maps to tested use case | feature flags per module |
| 9 | Ownership backend: proposals/approvals/execution/deletion state | 3,7 | unanimous/sole/last/replay/drift/concurrent/security review | no direct Owner mutation path | disable proposal creation/execution separately; never roll back executed ownership without new proposal |
| 10 | Export/scanner | 6–8 | scoped export/audit/stale generation; camera manual | no PII leakage/wrong Group | disable adapters |
| 11 | Migration tooling in separate admin package | stable schemas/backends | immutable export, dry-run, hashes, role/PII/ref integrity | pilot Group reconciled and restore rehearsed | discard target test project; source untouched |
| 12 | Pilot/cutover | monitoring/runbooks/feature flags | full security/regression/manual gates | no unresolved Critical/High; stakeholder approval | point users to legacy read-only; restore named snapshot if data fault |

## Dependency order

Foundation → Auth/Profile → Group/Session/Permission → Invitations/Notification and Customer Vault → Repairs → Assignment/Status/Audit → Team/Analytics → Ownership → optional adapters → migration. Customer isolation precedes repair schema to prevent legacy PII coupling.

## Implementation rules

- UI never imports Firebase; repositories are sole ordinary persistence adapters.
- Critical command interfaces return typed versions/results and require idempotency key.
- Every phase adds Rules/backend negative tests before UI success path.
- No copied legacy source, personal workspace, global role, phone ID, client Audit or all-job Member query.
- Data/schema change includes forward/backward reader strategy and explicit migration; no destructive rollback assumption.

## Security gate ownership

Developer supplies tests/evidence; independent reviewer approves Rules and backend for phases 3–9; product owner resolves data visibility/retention decisions; operations verifies environment/IAM/restore. A phase cannot defer a failing security gate to UI hiding.

## Phase 2.5 Phase 3A cut

Phase 3A implements only tooling/isolated environments, domain types/errors, repository contracts, Auth/profile recovery, atomic Group creation, Membership/session/permission engine, emulator and Rules harness. Customer/Repair/Invitation/Ownership workflows, analytics, export, scanner, migration, Group purge and emergency recovery are deferred to their gated phases. See [16_PHASE3_ENTRY_GATE.md](16_PHASE3_ENTRY_GATE.md).
