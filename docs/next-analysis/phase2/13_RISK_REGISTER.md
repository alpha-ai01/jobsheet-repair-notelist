# Risk Register

Likelihood: L/M/H. Severity reflects impact if realized.

| ID | Risk | Severity | Likelihood | Impact | Mitigation | Detection | Fallback |
|---|---|---|:---:|---|---|---|---|
| R1 | Customer PII enters Member-readable Repair | CRITICAL | M | confidentiality breach | separate schemas/paths, exact keys, DTO tests | Rules/schema tests and data scanner | block release; quarantine/remove field via controlled migration |
| R2 | Member query becomes unconstrained | CRITICAL | M | all jobs leak | dedicated `listAssigned`, Rules predicate, no generic Member repo | emulator/query telemetry | disable Member listing |
| R3 | Ownership quorum/replay flaw | CRITICAL | M | hostile/zero Owner takeover | backend snapshot/version/hash/idempotency/last-owner | security tests/alerts/manual review | disable execution endpoint; proposals remain pending |
| R4 | Permission drift across domain/Rules/backend | HIGH | H | over/under authorization | capability registry + generated/table fixtures and review | matrix differential tests | deny affected command |
| R5 | Manager escalation | HIGH | M | Owner/security compromise | backend-only member mutation and DelegationPolicy | adversarial tests/audit alerts | disable Manager management endpoints |
| R6 | Stale cross-Group cache | HIGH | M | tenant data leak/wrong mutation | clear-first generation/cancel/group keys | race tests/client telemetry | force logout/reload; disable switching temporarily |
| R7 | Invitation race/replay | HIGH | M | unintended membership/role | UID locks, transaction, expiry, idempotency | duplicate/integrity alerts | cancel/disable invitation endpoints |
| R8 | Assignment/status lost update | HIGH | M | wrong assignee/history | version transaction/idempotency/outbox | conflict metrics/reconciliation | command read-only mode |
| R9 | Client/partial Audit | HIGH | M | accountability gap | backend atomic Audit; append-only | outbox/audit reconciliation | stop sensitive commands |
| R10 | Wrong Firebase environment/Rules | HIGH | M | broad exposure/data damage | separate projects/IAM; CI project+hash assertion | deploy audit/smoke deny tests | release prior Rules/backend artifact |
| R11 | Partial registration/onboarding | MEDIUM | H | locked-out users/support cost | idempotent profile/restricted recovery state | funnel/error metrics | self-service retry/admin recovery runbook |
| R12 | Customer matching duplicates | MEDIUM | H | wrong history/customer | stable IDs; no auto-merge; reviewed merge | duplicate reports | quarantine/manual merge |
| R13 | Repair number collision | MEDIUM | M | operational ambiguity | transactional allocator/unique ID | uniqueness test/index/monitor | use opaque Repair ID until resolved |
| R14 | Owner unavailable under unanimity | HIGH | M | governance deadlock | 72-hour proposal expiry/invalidation; no V1 ownership bypass | aged proposal alert | no self-service/support ownership mutation in V1; Group frozen; future trusted recovery process |
| R15 | Notification outbox backlog | MEDIUM | M | delayed actions | idempotent worker/retry/DLQ | queue age/failure alert | in-app refresh/direct resource screen |
| R16 | Search leaks registered users | HIGH | M | privacy/account discovery | exact/minimal/rate-limited backend search | abuse/rate telemetry | disable search; invite by verified opaque identifier |
| R17 | Audit before/after leaks PII | HIGH | M | secondary PII breach | redaction allow-list/restricted access | schema/log scanner | disable detail payload; retain action metadata |
| R18 | Offline persistence retains PII | HIGH | M | device data leak | disable Customer offline cache by default | configuration/security review | force cache clear/logout; revoke sessions |
| R19 | Migration corrupts roles/PII links | CRITICAL | M | cross-tenant/leak/loss | immutable export/manifests/quarantine/pilot | hashes/ref/security scans | rollback to legacy read-only/snapshot |
| R20 | Dependency/supply-chain compromise | HIGH | L/M | code/data compromise | pinned lock, scans, minimal deps, CSP/App Check | CI advisories/runtime monitoring | rollback build/revoke keys/tokens |
| R21 | Firestore cost/rule lookup limits | MEDIUM | M | outage/latency | query/load testing, normalized summaries | cost/latency/denial metrics | reduce projections/route command backend |
| R22 | Retention/deletion undefined | HIGH | H | compliance/data recovery conflict | resolve policy before production | governance gate | archive only; prohibit purge |
| R23 | Email verification policy undefined | MEDIUM | H | abuse or onboarding friction | resolve/open safe restricted state | auth funnel/abuse metrics | enforce verification temporarily |
| R24 | Emergency owner recovery undefined | HIGH | M | permanent lockout or unsafe bypass | formal offline identity/security procedure decision | aged inaccessible Group support cases | freeze security actions; no ad-hoc database edit |

## Critical risks remaining

R1/R2/R3 are controlled by design but remain critical until implemented and independently tested. R19 remains critical until real data profiling/pilot. R14/R22/R24 are fail-closed deferred capabilities: no emergency ownership mutation, no destructive purge, and no manual bypass in V1. They do not block Phase 3A foundation.

## Phase 2.5 risk disposition

R14 is accepted fail-closed for V1; R22 is mitigated by no-purge retention; R24 has no manual/client bypass. R1/R2/R3/R19 remain release risks and are mandatory gates in their owning phases.
