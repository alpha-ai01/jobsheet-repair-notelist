# Old → SmartRepair Migration Compatibility

No migration was executed. Compatibility is structural/design assessment only; production data shape and volume need verification.

| Legacy feature/data/function | SmartRepair target | Compatibility | Required action / prohibition |
|---|---|---|---|
| Firebase Auth UID | User identity UID | DIRECTLY COMPATIBLE | Preserve UID; verify provider/email verification state |
| `/users/{uid}` profile | UserProfile | TRANSFORMATION REQUIRED | Drop global role/active authorization; normalize names/contact/schema version |
| Workspace | Group | ADAPTER REQUIRED | Rename semantics; validate status/settings; remove plan authority from client |
| `ownerUid` | OWNER memberships | DO NOT PORT | Seed owner membership only after evidence; no single-owner authority |
| Personal workspace `ws-{uid}` | No implicit group | DEPRECATED | Map only if it contains real business data and owner decides to retain |
| members `{uid}` | Membership | TRANSFORMATION REQUIRED | Map roles; status; add permissions/version; resolve duplicates/inactive |
| owner role | OWNER | DIRECTLY COMPATIBLE concept | Validate against ownerUid/history; support multiple owners afterward |
| admin role | OWNER or MANAGER | NEEDS DECISION | Case-by-case privilege review; never auto-promote all admins to Owner |
| manager role | MANAGER | ADAPTER REQUIRED | Remove legacy customer-write/broad repair rights |
| member role | MEMBER | TRANSFORMATION REQUIRED | Baseline becomes assigned-only/no PII; do not preserve broad access |
| repairs | technician-safe Repair | TRANSFORMATION REQUIRED | Split PII/customer reference; add version/archive/schemaVersion; normalize assignment/status |
| repair `customerName/phone/customerNote` | Customer vault + customerId | DO NOT PORT in technician doc | Resolve/create stable customer; remove PII from repair projection |
| `assignedTo` | `assignedToUid` | ADAPTER REQUIRED | Verify UID is active same-group member; quarantine invalid values |
| client jobNumber | repairNumber | ADAPTER REQUIRED | Detect duplicates; allocate authoritative sequence/unique ID policy |
| customers keyed by phone digits | random/stable Customer ID | TRANSFORMATION REQUIRED | Deduplicate with reviewed matching; phone becomes attribute/search index |
| statusHistory | append-only StatusHistory | ADAPTER REQUIRED | Validate chain/current status/timestamps/actors; mark unverifiable history |
| auditLogs | AuditEvent | NEEDS DECISION | Client logs are non-authoritative; import labeled `legacyClientAudit=true`, never as trusted security evidence |
| invitations by email | UID-bound Invitation | DO NOT PORT active state | Expire/cancel legacy pending invitations; reissue after cutover |
| references | ReferenceData | ADAPTER REQUIRED | Normalize type, group scope, archive, timestamps |
| analytics documents/global | Derived aggregates | DEPRECATED | Recompute from validated repairs; do not trust client/global aggregates |
| notifications | Notification center | NOT PRESENT | New data only |
| security proposals/approvals | Backend entities | NOT PRESENT | New data only |
| `ensurePersonalWorkspace` | explicit group onboarding | DO NOT PORT | Legacy only |
| role helper/rank/UI guards | Permission engine | DO NOT PORT | Reimplement from target matrix |
| workspaceCollection/Doc | repositories with explicit group context | KEEP CONCEPT | Never copy implicit mutable active group |
| auth observer bootstrap | BootstrapSession use case | KEEP CONCEPT | Split state machine/recovery/error states |
| job form UX | CreateRepair UI/use case | ADAPTER REQUIRED | Separate customer selection/vault and permission checks |
| status batch | ChangeRepairStatus | KEEP CONCEPT | Add transaction/version/resource authorization/idempotency |
| assignment handler | AssignRepair | KEEP CONCEPT | Re-read membership, transaction, notification/audit |
| load all jobs/customers | constrained repositories | DO NOT PORT | Server-secure assigned/group queries only |
| appendWorkspaceAudit | backend audit service | DO NOT PORT | Client cannot author critical audit |
| export/scanner | adapters/features | ADAPTER REQUIRED | Permission-scoped DTOs, pinned libraries, acceptance tests |
| global admin UI/functions | trusted support tooling if required | DO NOT PORT | No shop permissions via global admin/user |
| hybrid/global Rules | deny/archived legacy project | DO NOT PORT | New Rules from target schema only |
| migration script | controlled migration pipeline | DO NOT PORT | Use Admin SDK, immutable export, transforms, hashes, dry-run/replay controls |

## Data migration gates

1. Export immutable source snapshot and Firestore/Auth metadata; hash and record counts by collection/group.
2. Profile actual schemas/unknown fields/nulls/duplicate phones/duplicate repair numbers/invalid assignments/missing memberships.
3. Produce deterministic mapping manifests `oldPath → newPath`, with quarantine reasons.
4. Dry-run transforms into isolated Firebase project; never write target production first.
5. Validate referential integrity, PII separation, owner/member mapping, status chain, archive state, timestamps.
6. Run complete Rules/backend/role matrix and migration regression.
7. Pilot one group, reconcile business totals and user acceptance.
8. Cut over with legacy read-only window and rehearsed rollback. No legacy deletion in initial cutover.

## Open migration decisions

- Whether the default workspace is a real shared store or an artifact.
- How legacy admins map, which is security-sensitive.
- Customer deduplication policy when phone is missing/shared/changed.
- How to label histories/audits with missing or client-controlled actors/timestamps.
- Whether completed/old repairs require technician access after migration.
