---
phase: 26-flux-reconfiguration
plan: 01
subsystem: infra
tags: [flux, externalsecret, ghcr, dockerconfigjson, k3s, vault, cicd, v3.5-P2]

requires:
  - phase: 25-pipeline-build
    provides: "Phase 25 GitHub Actions workflow emits ^\\d{14}$ tags to ghcr.io/hudsor01/hudsonfam (build c099b66 produced tag 20260424023904 prior to Plan 26-01 execution; satisfies D-12 precondition)"
provides:
  - "Two ExternalSecrets materializing kubernetes.io/dockerconfigjson Secret named ghcr-pull-credentials in homepage + flux-system namespaces from a single vault key (D-04 two-namespace pattern)"
  - "First templated ExternalSecret in homelab repo (PATTERNS.md Gap 1 closed) — sprig b64enc + printf reconstruct dockerconfigjson at sync time so vault holds two raw fields (username + pat) instead of pre-encoded JSON"
  - "GHCR pull credential available in cluster ready for Plan 26-02 ImageRepository spec.secretRef rewire + Deployment imagePullSecrets rewire (D-09 Commit 1 of 2 — secrets land first to eliminate race window)"
affects: [26-02-flux-rewire, 27-pipeline-decommission, future-templated-externalsecret-work]

tech-stack:
  added: ["ExternalSecrets v1 spec.target.template (sprig b64enc + printf for dockerconfigjson reconstruction)"]
  patterns: ["Two ExternalSecrets / one vault key for cross-namespace Secret materialization (alternative to Reflector/Replicator operator)", "dockerconfigjson typed Secret via template instead of imperative kubectl create secret docker-registry"]

key-files:
  created:
    - "/home/dev-server/homelab/apps/hudsonfam/ghcr-pull-secret.yaml — homepage-ns ExternalSecret (kubelet image-pull consumer)"
    - "/home/dev-server/homelab/clusters/homelab/image-automation/ghcr-pull-secret.yaml — flux-system-ns ExternalSecret (ImageRepository scan auth consumer)"
  modified:
    - "/home/dev-server/homelab/apps/hudsonfam/kustomization.yaml — added ghcr-pull-secret.yaml between external-secret.yaml and deployment.yaml (preserves PVCs → secrets → workload → networking ordering)"
    - "/home/dev-server/homelab/clusters/homelab/image-automation/kustomization.yaml — appended ghcr-pull-secret.yaml after image-update-automation.yaml (preserves logical repositories → policies → automation ordering)"

key-decisions:
  - "Mounted target.type via spec.target.template.type only — cluster CRD rejected the redundant spec.target.type from D-03 verbatim (Rule 1 bug auto-fix; hotfix commit 943c2c4)"
  - "Both ExternalSecrets share metadata.name ghcr-pull-credentials and target.name ghcr-pull-credentials (allowed because they live in different namespaces — preserves the metadata.name == spec.target.name convention from PATTERNS.md Convention Summary)"
  - "flux-system-ns ExternalSecret OMITS metadata.namespace (kustomization injects flux-system per sibling-file convention — image-update-automation.yaml + image-policies.yaml + image-repositories.yaml all do the same)"
  - "Label app.kubernetes.io/component differentiates the two: secrets for homepage-ns, image-automation for flux-system-ns (Claude's discretion delegation per CONTEXT)"
  - "PAT material lives only in vault — ExternalSecrets reference vault key ghcr-pull-credentials via remoteRef.key + property; T-26-01 grep gate (Task 26-01-06) confirmed zero ghp_ / github_pat_ matches across homelab repo working tree"

patterns-established:
  - "Pattern 1: Templated dockerconfigjson ExternalSecret — vault holds username + pat as two raw rotatable fields; ExternalSecrets v1 sprig templating reconstructs the auth blob at sync time. Future homelab work needing typed Secrets (TLS, dockerconfigjson, etc.) copies from these two files as the canonical analog."
  - "Pattern 2: Two ExternalSecrets / one vault key — explicit alternative to installing a Reflector/Replicator operator. PAT rotation = single vault write propagates to N Kubernetes Secrets within refreshInterval: 1h. Trade: ~10 extra YAML lines per copy vs. one new operator dependency."

requirements-completed: [CICD-05]

duration: ~22min (executor wall-clock from first file write to hotfix commit landing — 2026-04-24 03:03 → 03:25 UTC; cluster materialization observed within 1-2 min after hotfix per Secret creationTimestamp)
completed: 2026-04-24
---

# Phase 26 Plan 26-01: GHCR Pull Secret Provisioning Summary

**ExternalSecret-templated kubernetes.io/dockerconfigjson Secret materialized in two namespaces (homepage + flux-system) from a single vault key, satisfying D-09 Commit 1 of 2 — the secrets-only landing before Plan 26-02's ImageRepository + Deployment rewire.**

## Performance

- **Duration:** ~22 min (first file write to hotfix commit landing; cluster materialization within ~1 min after hotfix)
- **Started:** 2026-04-24T03:03:00Z (approx — first reflog commit timestamp on homelab/main was 03:06:15 UTC, file writes preceded by ~3 min)
- **Completed:** 2026-04-24T03:25:18Z (hotfix commit `943c2c4` landed; cluster materialization observed at 03:25:25Z and 03:26:25Z)
- **Tasks:** 7 of 7 (Task 26-01-01 owner Wave-0 gate pre-approved per WAVE-0-APPROVED block / STATE.md commit `7c3b8af`; Tasks 26-01-02 through 26-01-08 executed by prior agent + cluster verification confirmed by this resumption agent)
- **Files modified:** 4 (2 NEW + 2 MODIFIED, all in `/home/dev-server/homelab/`)

## Accomplishments

- **Both `ghcr-pull-credentials` Secrets live in cluster** with type `kubernetes.io/dockerconfigjson`, decoded `auths."ghcr.io".username == hudsor01`, decoded password length 40 chars (classic PAT), and ExternalSecret `status.conditions[type=Ready].status == True` in BOTH `homepage` and `flux-system` namespaces.
- **First templated ExternalSecret in homelab repo** — closes PATTERNS.md Gap 1; future work needing typed Secrets (TLS, dockerconfigjson, etc.) copies from these files as the canonical analog.
- **D-09 Commit 1 of 2 cleanly landed** — secrets-first cadence eliminates the race window where Flux source-controller could try to scan the new GHCR ImageRepository before ESO has materialized the pull Secret in flux-system. Plan 26-02 may now proceed.
- **T-26-01 mitigation verified** — grep gate (`grep -rE "ghp_[A-Za-z0-9]{36}|github_pat_[A-Za-z0-9_]{82}" /home/dev-server/homelab/`) returns ZERO matches across all `*.yaml`, `*.yml`, `*.json`, `*.txt`, `*.md`, `*.sh`, `*.env*` files. PAT material exists ONLY in vault (cluster Secret `secrets/ghcr-pull-credentials` with `username` + `pat` properties; populated out-of-band by owner per Wave 0 prereq).

## Task Commits

Plan 26-01 landed in TWO commits on the homelab repo's `main` branch (the second is a Rule 1 deviation auto-fix; the underlying file changes are otherwise the original D-09 Commit 1 set):

1. **Tasks 26-01-02 through 26-01-07 bundled — `91d9cd9`** (`feat(hudsonfam): provision GHCR pull secret via ExternalSecret (Phase 26 Plan 26-01, Commit 1 of D-09)` per PLAN cadence): 4 files committed (2 new ghcr-pull-secret.yaml + 2 modified kustomization.yaml). Initial form included `spec.target.type: kubernetes.io/dockerconfigjson` per D-03 verbatim.
2. **Hotfix [Rule 1 bug] auto-fix — `943c2c4`** (`fix(hudsonfam): drop spec.target.type from ExternalSecret (cluster CRD schema rejected it)`): removed the redundant `spec.target.type` line from both ExternalSecret YAMLs after cluster CRD dry-run rejection (see Deviations below). Both ESOs went Ready=True within seconds of this hotfix landing.

**Plan SUMMARY.md commit:** TBD (this file) — committed to hudsonfam repo (planning artifacts), separate from the four homelab-repo file changes above.

_Note: Two-commit landing here is NOT D-09 (which describes Plan 26-01 = Commit 1 + Plan 26-02 = Commit 2 across the milestone). Within Plan 26-01 itself, the two commits are: (a) the planned files, (b) a Rule 1 bug fix on those files. Plan 26-02 is still pending and will be the third commit on homelab/main from this milestone._

## Files Created/Modified

**Created:**

- `/home/dev-server/homelab/apps/hudsonfam/ghcr-pull-secret.yaml` — `apiVersion: external-secrets.io/v1`, `kind: ExternalSecret`, `metadata.namespace: homepage`, `metadata.name: ghcr-pull-credentials`, label `app.kubernetes.io/component: secrets`. Materializes `kubernetes.io/dockerconfigjson` Secret named `ghcr-pull-credentials` in `homepage` namespace via `spec.target.template` (sprig `b64enc` reconstructs auth blob from vault `username` + `pat` properties).
- `/home/dev-server/homelab/clusters/homelab/image-automation/ghcr-pull-secret.yaml` — byte-identical to the homepage-ns ESO EXCEPT (1) `metadata.namespace` OMITTED (kustomization.yaml in same dir injects `namespace: flux-system`), (2) label `app.kubernetes.io/component: image-automation` (not `secrets`). Same vault key + same two `property:` lookups — PAT rotation propagates to both Secrets within `refreshInterval: 1h`.

**Modified:**

- `/home/dev-server/homelab/apps/hudsonfam/kustomization.yaml` — inserted `- ghcr-pull-secret.yaml` between `- external-secret.yaml` and `- deployment.yaml` (preserves PVCs → secrets → workload → networking ordering). Setter comment `# {"$imagepolicy": "flux-system:hudsonfam:tag"}` count UNCHANGED at 1 (T-26-06 mitigation). `images[0].name: git.homelab/forgejo-admin/hudsonfam` UNCHANGED — that's Plan 26-02's job.
- `/home/dev-server/homelab/clusters/homelab/image-automation/kustomization.yaml` — appended `- ghcr-pull-secret.yaml` after `- image-update-automation.yaml` (preserves logical repositories → policies → automation ordering). `namespace: flux-system` UNCHANGED at top-level.

## Decisions Made

- **D-01 amended** (carried in from CONTEXT, executed in Wave 0 per STATE.md commit `7c3b8af`): classic PAT with `read:packages` scope ONLY (NOT fine-grained — fine-grained does NOT work for GHCR per R-01 / official GitHub docs).
- **D-03 partial deviation** (auto-fix Rule 1): `spec.target.type` removed; `spec.target.template.type` retained as the sole authoritative type declaration. The cluster ExternalSecrets v1 CRD allows only `[creationPolicy, deletionPolicy, immutable, manifest, name, template]` under `spec.target` — no `type` field. The Secret type is correctly set via `spec.target.template.type`, which IS in the v1 CRD schema. (See "Deviations from Plan" below for the full root-cause + fix narrative.)
- **D-04 honored verbatim**: two ExternalSecrets, one vault key. Both share `metadata.name: ghcr-pull-credentials` and `spec.target.name: ghcr-pull-credentials` because they live in different namespaces — Kubernetes name-uniqueness is per-namespace.
- **flux-system-ns ESO OMITS `metadata.namespace`**: matches sibling-file convention (image-update-automation.yaml, image-policies.yaml, image-repositories.yaml all omit it). The kustomization.yaml at that path injects `namespace: flux-system`.
- **GHCR package visibility recorded as PUBLIC** (Wave 0 prereq deliverable, recorded in STATE.md commit `7c3b8af`). Two-ExternalSecret + classic-PAT design works for both visibilities; no design change needed despite public status. The Flux pull PAT is still provisioned for rate-limit hygiene + future-proofs against any visibility flip.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed `spec.target.type` field rejected by cluster CRD schema**

- **Found during:** Initial post-commit verification of Tasks 26-01-02 + 26-01-03 (both ExternalSecrets failed Ready=False after Commit 1 landed).
- **Issue:** The PLAN's verbatim YAML (per CONTEXT D-03 + ExternalSecrets v1 docs at <https://external-secrets.io/latest/guides/templating/>) included `spec.target.type: kubernetes.io/dockerconfigjson` ALONGSIDE `spec.target.template.type: kubernetes.io/dockerconfigjson`. The cluster's installed `external-secrets.io/v1` CRD (ESO 2.1.0 per `homelab/CLAUDE.md:55`) allows only `[creationPolicy, deletionPolicy, immutable, manifest, name, template]` under `spec.target` — no `type` field. Both kustomizations failed `Ready=False` with: `ExternalSecret/<ns>/ghcr-pull-credentials dry-run failed: failed to create typed patch object: .spec.target.type: field not declared in schema`.
- **Fix:** Removed the `spec.target.type: kubernetes.io/dockerconfigjson` line from BOTH ExternalSecret YAMLs (apps/hudsonfam/ghcr-pull-secret.yaml and clusters/homelab/image-automation/ghcr-pull-secret.yaml). The `spec.target.template.type: kubernetes.io/dockerconfigjson` line was retained — that IS in the v1 CRD schema and is the documented path for typed-Secret materialization.
- **Files modified:** `/home/dev-server/homelab/apps/hudsonfam/ghcr-pull-secret.yaml`, `/home/dev-server/homelab/clusters/homelab/image-automation/ghcr-pull-secret.yaml`
- **Verification:** Both files pass `kubectl apply --dry-run=server` against the cluster CRD; T-26-01 grep gate still returns zero PAT-shaped strings; both Secrets materialized within ~1 min of the hotfix landing (homepage Secret `creationTimestamp: 2026-04-24T03:26:25Z`, flux-system Secret `creationTimestamp: 2026-04-24T03:25:25Z`; hotfix commit landed at 2026-04-24T03:25:18Z per reflog).
- **Committed in:** `943c2c4` (`fix(hudsonfam): drop spec.target.type from ExternalSecret (cluster CRD schema rejected it)`)
- **Plan acceptance criterion impact:** PLAN Task 26-01-02/03 acceptance specified `grep -c "type: kubernetes.io/dockerconfigjson" <file>` returns exactly `2` — post-fix this returns `1` (only the `template.type` instance). The acceptance criterion is now stale relative to the cluster's CRD reality; the underlying intent (the materialized Secret is `kubernetes.io/dockerconfigjson` typed, not `Opaque`) is satisfied and verified via `kubectl get secret ... -o jsonpath='{.type}'`. PLAN authors should update the criterion to match the post-hotfix shape if Plan 26-01 is ever re-executed in a fresh cluster.

---

**Total deviations:** 1 auto-fixed (1 Rule 1 bug — CRD schema mismatch with PLAN-verbatim YAML)
**Impact on plan:** The Rule 1 fix was strictly necessary for Secret materialization; without it, both ExternalSecrets would have remained Ready=False indefinitely and Plan 26-02 could not unlock. The fix is two-line (one removed line per file). Underlying CICD-05 satisfaction unchanged. PLAN's verbatim D-03 template body should be updated to match the cluster CRD shape; the plan-time CONTEXT cited the official ExternalSecrets v1 docs which include `spec.target.type` as a valid field, but the cluster's installed CRD schema rejects it — version-skew or stricter validation than the published docs. Documenting this here so Plan 26-02 (and any future templated ExternalSecret work) starts from the corrected pattern.

## Issues Encountered

- **CRD schema rejection of `spec.target.type`** — described in full under Deviations above. Root cause: PLAN-verbatim YAML (per ExternalSecrets v1 docs) included a field the cluster's installed CRD does not accept. The fix was a one-line deletion per file. ESO 2.1.0 in this cluster validates `spec.target` more strictly than the published v1 docs imply.
- **Cluster verification timing** — Secrets materialized within ~7 seconds (flux-system) and ~67 seconds (homepage) of the hotfix commit landing on homelab/main. This is faster than the documented `refreshInterval: 1h` because Flux source-controller's poll cycle picks up new commits in under a minute, and ESO syncs immediately upon a CRD-validated dry-run pass (no need to wait for the refresh interval when the spec changes). No force-sync annotation was needed.

## User Setup Required

None — Wave 0 prereqs (PAT generation, vault population, smoke-test, GHCR build observation, package visibility check) all satisfied OUT-OF-BAND prior to Plan 26-01 execution per STATE.md commit `7c3b8af`. No additional owner action needed for Plan 26-01 closure. Plan 26-02 will likewise have no Wave 0 owner prereqs (consumer wiring only — both Secrets are already live).

## Next Phase Readiness

**Plan 26-02 unlocked** — D-09 Commit 1 verification passed end-to-end:

| Check | Command | Expected | Actual |
|-------|---------|----------|--------|
| Secret type (homepage) | `kubectl get secret ghcr-pull-credentials -n homepage -o jsonpath='{.type}'` | `kubernetes.io/dockerconfigjson` | `kubernetes.io/dockerconfigjson` ✓ |
| Secret type (flux-system) | `kubectl get secret ghcr-pull-credentials -n flux-system -o jsonpath='{.type}'` | `kubernetes.io/dockerconfigjson` | `kubernetes.io/dockerconfigjson` ✓ |
| Decoded username (homepage) | `kubectl get secret ghcr-pull-credentials -n homepage -o jsonpath='{.data.\.dockerconfigjson}' \| base64 -d \| jq -r '.auths."ghcr.io".username'` | `hudsor01` | `hudsor01` ✓ |
| Decoded username (flux-system) | (same as above with `-n flux-system`) | `hudsor01` | `hudsor01` ✓ |
| Decoded password length (homepage) | (same as above with `.password \| wc -c`) | > 30 (classic PAT = 40 chars + newline = 41) | `41` ✓ |
| ExternalSecret Ready (homepage) | `kubectl get externalsecret ghcr-pull-credentials -n homepage -o jsonpath='{.status.conditions[?(@.type=="Ready")].status}'` | `True` | `True` ✓ |
| ExternalSecret Ready (flux-system) | (same as above with `-n flux-system`) | `True` | `True` ✓ |
| Flux source reconciled to HEAD | `flux reconcile source git flux-system` | `fetched revision main@sha1:<commit>` | `fetched revision main@sha1:943c2c49f8454499908588f8595e2487d48f623f` ✓ |

**Plan 26-02 prerequisites:**
- Both Secrets exist in cluster ✓ (this plan)
- Phase 25 GHCR build green; tag `20260424023904` visible at ghcr.io/hudsor01/hudsonfam ✓ (per STATE.md commit `7c3b8af`)
- ImageRepository regex `^\d{14}$` already present at `clusters/homelab/image-automation/image-policies.yaml:263` (D-06 — zero edits) ✓
- ImageUpdateAutomation `update.path: ./apps strategy: Setters` already wired (D-06 — zero edits) ✓
- Setter comments at `apps/hudsonfam/kustomization.yaml:13` + `apps/hudsonfam/deployment.yaml:36` byte-for-byte preserved (T-26-06 verified post-Task 26-01-04 — `grep -c '\$imagepolicy' apps/hudsonfam/kustomization.yaml` returns `1`) ✓

**Operational notes (carry-forward):**

- **PAT expiry calendar reminder:** Classic PAT generated under owner account `hudsor01` with 1-year expiry per D-01 amended. Owner should set a calendar reminder ~2 weeks pre-expiry (target: ~2027-04-10) to rotate the `pat` property in vault — both Secrets pick up the new value within `refreshInterval: 1h`. No code or YAML change required for rotation; vault write is the single point of action.
- **Forgejo registry rollback path stays alive through Plan 26-02:** Plan 26-01 alone doesn't yet require a rollback path (no consumer is wired to the new Secret). After Plan 26-02 lands and switches Deployment + ImageRepository to GHCR, the Forgejo registry path stays alive through Phase 26 entirely (Phase 27 decommissions it) explicitly so D-10 rollback (`kubectl edit deployment hudsonfam -n homepage` revert) works. Plan 26-02 SUMMARY should reiterate this and document the "Phase 27 cannot start until Phase 26 has been observably green for ≥1 reconcile cycle" gating discipline.
- **PATTERNS.md Gap 1 closed:** Future homelab work needing templated typed Secrets (TLS, dockerconfigjson for other registries, etc.) should copy from these two new files as the canonical homelab-repo analog. The authoritative ESO reference `spec.target.template.type` (NOT `spec.target.type`) is the ESO 2.1.0 cluster CRD shape — see Rule 1 deviation above.
- **D-09 secrets-first cadence proven worthwhile:** The hotfix detour validates the cadence — had Plan 26-01 + Plan 26-02 been bundled in a single commit, the same CRD rejection would have prevented the ImageRepository from acquiring its secretRef, generating cluster-event log noise of `secretRef "ghcr-pull-credentials" not found` for the duration of the bug. The two-commit cadence isolated the bug to the secrets-only commit; ImageRepository remained unmodified and continued pulling from Forgejo without disruption.

## Self-Check: PASSED

**Files created on disk** (verified via Glob/Read):
- ✓ `/home/dev-server/homelab/apps/hudsonfam/ghcr-pull-secret.yaml` (FOUND, content matches post-hotfix shape: no `spec.target.type`, has `spec.target.template.type`)
- ✓ `/home/dev-server/homelab/clusters/homelab/image-automation/ghcr-pull-secret.yaml` (FOUND, content matches post-hotfix shape, OMITS `metadata.namespace` per kustomization-injection convention)
- ✓ `/home/dev-server/homelab/apps/hudsonfam/kustomization.yaml` (FOUND, contains `- ghcr-pull-secret.yaml` line between `- external-secret.yaml` and `- deployment.yaml`; setter comment count = 1, `git.homelab/forgejo-admin/hudsonfam` image name UNCHANGED)
- ✓ `/home/dev-server/homelab/clusters/homelab/image-automation/kustomization.yaml` (FOUND, contains `- ghcr-pull-secret.yaml` line appended after `- image-update-automation.yaml`; `namespace: flux-system` preserved)

**Commits exist on homelab/main** (verified via reflog timestamps + COMMIT_EDITMSG content + Flux source-controller fetched revision):
- ✓ `943c2c4` (HEAD) — `fix(hudsonfam): drop spec.target.type from ExternalSecret (cluster CRD schema rejected it)` — content recovered from `.git/COMMIT_EDITMSG`; reflog timestamp 2026-04-24 03:25:18 UTC
- ✓ `91d9cd9` — `feat(hudsonfam): provision GHCR pull secret via ExternalSecret (Phase 26 Plan 26-01, Commit 1 of D-09)` — reflog timestamp 2026-04-24 03:06:15 UTC (parent of `943c2c4` after intervening pull-rebase-finish `cc12a61`)

**Cluster state verified live** (kubectl + flux CLI; full output in "Next Phase Readiness" table above):
- ✓ Both `ghcr-pull-credentials` Secrets type `kubernetes.io/dockerconfigjson`
- ✓ Both decoded `auths."ghcr.io".username == hudsor01`
- ✓ Decoded password length 40 chars (classic PAT)
- ✓ Both ExternalSecret `status.conditions[type=Ready].status == True`
- ✓ Flux source reconciled to `main@sha1:943c2c49f8454499908588f8595e2487d48f623f`

**Threat-model verifications:**
- ✓ T-26-01 (PAT leakage): `grep -rE "ghp_[A-Za-z0-9]{36}|github_pat_[A-Za-z0-9_]{82}"` across `/home/dev-server/homelab/` returns ZERO matches across all `*.yaml`, `*.yml`, `*.json`, `*.txt`, `*.md`, `*.sh`, `*.env*` files
- ✓ T-26-06 (setter-comment mutation): `grep -c '\$imagepolicy' /home/dev-server/homelab/apps/hudsonfam/kustomization.yaml` returns `1` (UNCHANGED from pre-edit baseline)
- ◯ T-26-04 (TLS bypass `insecure: true` carryover) — DEFERRED to Plan 26-02 (this plan does not touch image-repositories.yaml)

---

*Phase: 26-flux-reconfiguration*
*Completed: 2026-04-24*
*Commit 1 of D-09 — Plan 26-02 may now proceed*
