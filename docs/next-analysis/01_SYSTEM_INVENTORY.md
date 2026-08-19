# Complete System Inventory

## Baseline

`pwd`: `/data/data/com.termux/files/home/jobsheet-repair-notelist`  
Branch: `main`; HEAD `297f774`; upstream `origin/main`; working tree was clean.  
Remote: `git@github.com:alpha-ai01/jobsheet-repair-notelist.git`.  
Recent history is dominated by workspace/auth/team repairs. Local branches/tags preserve several pre-repair and workspace variants. No `AGENTS.md` was found in the repository.

## Inventory method and scope

All first-party and repository artifact paths were inspected. `node_modules` (9,000+ generated dependency files) is inventoried as a generated group; vendored library internals are not application source. `.git` objects are repository metadata, not runtime source. Documentation was treated as a claim and checked against code/Rules.

## File/group inventory

| Path | Type | Purpose / dependencies | Runtime / production relevance | Legacy / potential problems | Recommendation |
|---|---|---|---|---|---|
| `index.html` | HTML/CSS/ES module JS, 6,924 lines | Entire SPA; Firebase Web SDK 10.8 CDN, Tailwind CDN, html5-qrcode, SheetJS | Primary production frontend; GitHub Pages workflow publishes repository | God-file; direct Firestore; globals; inline handlers; PII exposure; CDN availability/integrity/version drift; calls features incompatible with current Rules | Preserve requirements only; rewrite |
| `.firebaserc` | Firebase project binding | Default project `smart-repair-app-feff0` | Deployment safety-critical | Repository/project names differ; accidental deploy risk when using alternate configs | Keep explicit per-environment config in new repo; never infer environment |
| `firebase.json` | Firebase CLI config | `firestore.rules`, indexes, emulator 8080/UI 4000 | Canonical config by CLI default | No hosting config; no scripts; production mapping inferred from reports, not live-verified | Treat as legacy deployment evidence |
| `firebase.final.json` | Alternate CLI config | Same Rules/index, emulator 8081/UI 4001 | Test/repair artifact | Name implies authority but points to same Rules; config confusion | Remove from future design after archive |
| `firebase.workspace.json` | Alternate CLI config | `firestore.workspace.rules` | Historical workspace testing | References obsolete/incompatible Rules; lacks indexes | LEGACY; do not deploy |
| `firebase.hybrid.json` | Alternate CLI config | Surprisingly references `firestore.rules`, not `firestore.hybrid.rules` | Misleading | Filename/config mismatch can test/deploy wrong Rules | SECURITY RISK; do not port |
| `firestore.rules` | Rules v2, 482 lines | Current workspace Rules, users, repairs, customers, refs, invitations, audit | Production-relevant; repair report says deployed 2026-08-14 | All members read all repairs/customers; single owner; client audit; member PII mutation; global admin UI mismatch | Replace for SmartRepair; keep evidence |
| `firestore.workspace.rules` | Rules v2, 241 lines | Earlier workspace model | Legacy/emulator | Chicken-and-egg workspace bootstrap; invitation recipient cannot read/accept; permissive membership creation; no collection-group discovery | LEGACY |
| `firestore.hybrid.rules` | Hybrid v1/v2, 299 lines | Temporary global + workspace compatibility | Legacy migration | Broad global active-user reads; alternate schema; config does not reference it | DO NOT PORT |
| `firestore.indexes.json` | Firestore index config | collection-group fields for member UID and invitation email | Current query dependency | No composite indexes; invitation identity is email; explicit overrides add deployment coupling | Rewrite for UID invitations and repair assignment queries |
| `package.json` / `package-lock.json` | npm manifest/lock | Dev deps `firebase ^12.17.1`, rules-unit-testing `^5.0.1` | Tests/migration only; browser uses SDK 10.8 | No scripts at all; SDK version split; no Firebase CLI dependency | New project needs pinned tooling/scripts |
| `node_modules/` | Generated dependencies | Installed npm tree | Local test tooling only | Must not be audited as first-party or committed; provenance follows lockfile | Regenerate; never port directory |
| `tests/firestore.rules.test.mjs` | 434-line emulator suite | Tests old global collections and global admin/user | Legacy test | Contradicts current production Rules; 30 cases could not run without emulator | LEGACY |
| `tests/firestore.workspace.rules.test.mjs` | 250-line emulator suite | Earlier workspace model | Legacy test | Assumes manager membership creation and delete behavior inconsistent with current Rules | LEGACY |
| `tests/firestore.final.rules.test.mjs` | 334-line emulator suite | Workspace isolation/job/member/audit tests | Closest core suite | Tests “admin delete”, free-plan invite disabled; misses PII, assigned visibility, proposals | Adapt concepts, rewrite |
| `tests/firestore.webteam.rules.test.mjs` | 299-line emulator suite | Invitation/team web operations | Relevant historical test | Needs audit against current Rules; limited race/replay coverage | Rewrite |
| `.repair-tools/core-bootstrap.rules.test.mjs` | 351-line repair test | Personal workspace bootstrap/recovery | Repair-only | Encodes requirement explicitly rejected for SmartRepair | LEGACY/DO NOT PORT |
| `scripts/migrate_workspace_v2.mjs` | Node ESM migration | Password login from env; copies global repairs/customers/references to one workspace | Dangerous operational utility, not run | Client SDK, non-transactional copy, owner credentials, no schema transform, fixed project, phone/PII preserved | Archive; do not run/port |
| `migration-reports/*.json` | Generated migration report | Counts/verification for workspace `smart-fix-repair-msqd4lyb` | Evidence only | Count equality does not validate schema/content/permissions | Retain as evidence; migration needs stronger checks |
| `.repair-backups/20260815-001916/*` | Backup source/config/Rules | Snapshot before repair | Recovery evidence | Duplicate source can confuse scanners/deploy tooling; not tracked by Git | Archive outside app repo eventually; do not execute |
| `.repair-reports/*.txt` | Generated operational reports | Deployment, patch and publish history | Evidence; says current Rules were deployed and frontend pushed | Reports are claims; contain verbose API/debug content and environment detail | Retain read-only; sanitize secrets/tokens if distributing |
| `firebase-debug.log`, `firestore-debug.log` | Generated logs | Firebase CLI/emulator diagnostics | No runtime use | Potential credentials/tokens/sensitive project details; untracked | Do not commit; rotate credentials if any live token exposure is confirmed |
| `README.md` | Documentation, one line | Project label only | None | No setup/run/test/deploy contract | Replace in new repo |
| `SECURITY.md` | Policy claims | Legacy roles and desired isolation | Documentation only | Claims Manager/Member cannot manage members, contradicted by Rules/UI; says PII protection but Rules expose it | Do not trust as implementation |
| `docs/FIRESTORE_V2_SCHEMA.md` | Design doc | Workspace schema and hierarchy | Historical architecture | Single owner/admin, all-member repair reads, personal workspace era | Use only as migration evidence |
| `.github/workflows/jekyll-docker.yml` | GitHub Actions | Jekyll build | Production publishing candidate | A static HTML repo does not need dual Jekyll workflows; action versions/config need verification | Replace with one pinned build/deploy CI |
| `.github/workflows/jekyll-gh-pages.yml` | GitHub Actions | GitHub Pages Jekyll deploy | Production publishing candidate | Overlaps docker workflow; possible duplicate deployments/races | Consolidate |
| `.gitignore` | Git metadata | Ignores dependencies/logs/repair artifacts | Development relevance | Generated repair artifacts exist untracked by design | Keep concept; strengthen for new repo |
| `.git/`, branches, tags | Git structure | History/rollback | Audit/recovery only | Many similarly named repair/final branches/tags increase operational ambiguity | Preserve legacy repo read-only; clean naming in new repo |

## Git and generated/obsolete assessment

- Tracked production surface is unusually small; untracked backup/report/log directories materially affect local audit but not repository history.
- `firebase.hybrid.json` does not reference `firestore.hybrid.rules`; this is a concrete configuration defect.
- Two GitHub Pages workflows overlap. Whether both currently trigger and which deploy wins requires GitHub Actions inspection and is `NEEDS VERIFICATION`.
- Firebase web API key is public configuration, not an Admin secret by itself, but project abuse controls (App Check, quotas, authorized domains) are absent from source and require verification.

## Recommendation

Freeze this repository as a Legacy Reference. Only emergency repairs should land here. SmartRepair should begin in a separate repository with an executable toolchain, repository boundaries, emulator CI, explicit environments, and no copied production code.
