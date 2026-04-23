---
phase: 26
slug: flux-reconfiguration
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-23
---

# Phase 26 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | bash + kubectl + flux CLI (no app test framework — this phase ships YAML in the homelab repo, not code in the hudsonfam repo) |
| **Config file** | none — verification commands come from 26-RESEARCH.md §Verification recipes + 26-CONTEXT.md D-11 |
| **Quick run command** | `kubectl get externalsecret ghcr-pull-credentials -n homepage -n flux-system 2>&1 \| grep -E "SyncedAt\|status: True"` |
| **Full suite command** | See "Full validation script" block below — 8-command sequence from D-11 |
| **Estimated runtime** | ~45 seconds (excluding Flux scan-interval waits, which are operational latency not test latency) |

**Full validation script (executor runs after Commit 2 lands and Flux source reconciles):**

```bash
# 1. Force Flux source reconcile
flux reconcile source git flux-system

# 2. Force ImageRepository scan (uses new GHCR secretRef)
flux reconcile image repository hudsonfam -n flux-system

# 3. Force ImageUpdateAutomation re-evaluate setters
flux reconcile image update homelab-images -n flux-system

# 4. Force kustomization apply (picks up image update commit)
flux reconcile kustomization hudsonfam

# 5. Verify ImageRepository ready + latest tag matches GHCR
kubectl get imagerepository hudsonfam -n flux-system -o jsonpath='{.status.conditions[?(@.type=="Ready")].status}'  # → "True"
kubectl get imagerepository hudsonfam -n flux-system -o jsonpath='{.status.lastScanResult.latestTags[0]}'  # → newest YYYYMMDDHHmmss

# 6. Verify ImagePolicy promotes to expected tag
kubectl get imagepolicy hudsonfam -n flux-system -o jsonpath='{.status.latestImage}'  # → "ghcr.io/hudsor01/hudsonfam:<newest-ts>"

# 7. Verify Deployment uses GHCR + new pull secret
kubectl describe deployment hudsonfam -n homepage | grep -E "Image:|imagePullSecrets:"
# → Image: ghcr.io/hudsor01/hudsonfam:<tag>
# → imagePullSecrets: ghcr-pull-credentials

# 8. Watch new pod pull cleanly
kubectl get pods -n homepage -l app=hudsonfam -w  # → Running 1/1, replaces old pod
```

---

## Sampling Rate

- **After every task commit:** Run `kubectl get externalsecret ghcr-pull-credentials -n homepage -n flux-system` (verifies ESO sync state)
- **After every plan wave:** Run the full validation script above
- **Before `/gsd-verify-work`:** Full validation script must pass all 8 steps; ImageRepository must show `Ready: True`; deployed pod must be `Running 1/1` with image starting with `ghcr.io/hudsor01/hudsonfam:`
- **Max feedback latency:** ~120 seconds for full validation script (Flux reconcile waits dominate)

---

## Per-Task Verification Map

> Filled in by planner during PLAN.md creation. Each task gets one row mapping it to a CICD-XX requirement and an automated kubectl/flux command. Manual-only verifications captured in the section below.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 26-01-01 | 01 | 1 | CICD-05 | T-26-01 (PAT leakage) | Vault holds PAT; no PAT in git | manual | Owner verifies vault key `ghcr-pull-credentials` has both `username` + `pat` properties | N/A — owner ops | ⬜ pending |
| 26-01-02 | 01 | 1 | CICD-05 | — | dockerconfigjson Secret materializes in homepage ns | integration | `kubectl get secret ghcr-pull-credentials -n homepage -o jsonpath='{.type}'` → `kubernetes.io/dockerconfigjson` | ⬜ pending | ⬜ pending |
| 26-01-03 | 01 | 1 | CICD-05 | — | dockerconfigjson Secret materializes in flux-system ns | integration | `kubectl get secret ghcr-pull-credentials -n flux-system -o jsonpath='{.type}'` → `kubernetes.io/dockerconfigjson` | ⬜ pending | ⬜ pending |
| 26-01-04 | 01 | 1 | CICD-05 | T-26-02 (PAT typo) | Decoded auth string is base64(hudsor01:PAT) | integration | `kubectl get secret ghcr-pull-credentials -n homepage -o jsonpath='{.data.\.dockerconfigjson}' \| base64 -d \| jq -r '.auths."ghcr.io".username'` → `hudsor01` | ⬜ pending | ⬜ pending |
| 26-02-01 | 02 | 2 | CICD-04 | — | ImageRepository scans GHCR successfully | integration | `kubectl get imagerepository hudsonfam -n flux-system -o jsonpath='{.status.conditions[?(@.type=="Ready")].status}'` → `True` | ⬜ pending | ⬜ pending |
| 26-02-02 | 02 | 2 | CICD-06 | — | ImagePolicy picks newest YYYYMMDDHHmmss tag | integration | `kubectl get imagepolicy hudsonfam -n flux-system -o jsonpath='{.status.latestImage}'` matches `^ghcr\.io/hudsor01/hudsonfam:\d{14}$` | ⬜ pending | ⬜ pending |
| 26-02-03 | 02 | 2 | CICD-04 | — | Deployment rolls cleanly with GHCR image + pull secret | integration | `kubectl get deployment hudsonfam -n homepage -o jsonpath='{.spec.template.spec.containers[0].image}'` starts with `ghcr.io/hudsor01/hudsonfam:` AND `kubectl get pods -n homepage -l app=hudsonfam -o jsonpath='{.items[*].status.phase}'` includes `Running` | ⬜ pending | ⬜ pending |
| 26-02-04 | 02 | 2 | CICD-06 | — | ImageUpdateAutomation commits tag bumps to homelab repo with author "Flux Image Automation" | integration | After waiting for next ImageUpdateAutomation cycle: `git -C /home/dev-server/homelab log --author="Flux Image Automation" -1 --format='%s'` → matches `chore(images): update.*ghcr.io/hudsor01/hudsonfam` | ⬜ pending | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] No code-test framework needed — this phase ships YAML, not source code; verification is operational (kubectl + flux CLI)
- [ ] Wave 0 covers manual prerequisites only:
  - Owner has populated vault key `ghcr-pull-credentials` with `username: hudsor01` + `pat: <classic PAT>` properties (D-01 amended; classic PAT with `read:packages` scope ONLY — fine-grained PATs do NOT work for GHCR per R-01)
  - Owner has smoke-tested the PAT manually before Commit 2: `echo $PAT | docker login ghcr.io -u hudsor01 --password-stdin && docker pull ghcr.io/hudsor01/hudsonfam:<latest-tag>` succeeds without errors
  - At least one Phase 25 GHCR build has completed and produced a valid `^\d{14}$` tag (precondition gate per CONTEXT D-12)

*Existing infrastructure covers all phase requirements — no test files to author.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Vault holds PAT (no PAT in git) | CICD-05 | Vault is owner-only ops surface; not exposed to executor | Owner: open vault, confirm key `ghcr-pull-credentials` exists with two non-empty properties (`username`, `pat`); confirm no `ghcr_pat`, `GHCR_TOKEN`, or PAT-shaped string appears in any committed file under `/home/dev-server/homelab/` |
| Owner has smoke-tested PAT before Commit 2 | CICD-05 | Pre-commit defense; catches PAT typos before they manifest as Flux scan errors hours later | Owner runs locally: `echo $PAT \| docker login ghcr.io -u hudsor01 --password-stdin` (must print `Login Succeeded`); then `docker pull ghcr.io/hudsor01/hudsonfam:<latest-tag>` (must complete without `unauthorized` or `denied`) |
| Phase 25 first GHCR build is observably green | precondition | Owner browser check; executor `gh` CLI is unauthenticated locally | Owner: visit <https://github.com/hudsor01/hudsonfam/actions> and confirm the `build-and-push` workflow run from commit `c7d8f33` shows green; OR trigger a fresh `workflow_dispatch` run and confirm it greens |
| GHCR package visibility recorded | informational | Owner browser check; affects no code path | Owner: visit <https://github.com/users/hudsor01/packages/container/hudsonfam/settings>; record visibility (public/private) in STATE.md before Phase 26 commits land |
| Rollback path proven before Phase 27 | rollback safety | Operational sequencing rule (CONTEXT D-10) | After Phase 26 verification passes: leave the cluster running on the new GHCR image for ≥10 minutes (one full Flux reconcile cycle); confirm no event log noise; THEN Phase 27 may begin (Phase 27 deletes the Forgejo rollback path) |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify (kubectl/flux command in the per-task table) or fall under Wave 0 manual prerequisites
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify (Phase 26 has 7 tasks, all with automated verify or manual prerequisite — passes)
- [ ] Wave 0 covers all MISSING references (owner ops surface only — no source-code Wave 0 needed)
- [ ] No watch-mode flags (verification commands are one-shot kubectl/flux invocations)
- [ ] Feedback latency < 120s (Flux reconcile waits dominate; acceptable for infra phase)
- [ ] `nyquist_compliant: true` set in frontmatter (flip on plan-checker pass)

**Approval:** pending
</content>
</invoke>