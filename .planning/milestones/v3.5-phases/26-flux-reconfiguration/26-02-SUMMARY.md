---
phase: 26-flux-reconfiguration
plan: 02
subsystem: infra
tags: [flux, imagerepository, ghcr, deployment, v3.5-P2, infra-only-yaml, cutover]

requires:
  - phase: 26-flux-reconfiguration
    plan: 01
    provides: "Both ghcr-pull-credentials Secrets materialized in cluster (homepage + flux-system, type kubernetes.io/dockerconfigjson, decoded auths.ghcr.io.username == hudsor01) — D-09 Commit 1 of 2 unlock condition for Plan 26-02 cutover"
provides:
  - "Flux ImageRepository hudsonfam (flux-system ns) now scans ghcr.io/hudsor01/hudsonfam authenticated via ghcr-pull-credentials Secret (D-05 mutate-in-place; spec.insecure removed; metadata.name + interval preserved → ImagePolicy linkage intact)"
  - "Deployment hudsonfam (homepage ns) runs ghcr.io/hudsor01/hudsonfam:20260424023904 with imagePullSecrets[0].name: ghcr-pull-credentials — pod Running 1/1, ready=true, 0 restarts, image pulled in 3.228s"
  - "ImagePolicy hudsonfam status.latestRef.name+tag = ghcr.io/hudsor01/hudsonfam:20260424023904 (Phase 25-format ^\\d{14}$ tag promoted from 46-tag GHCR scan; previousRef shows successful migration from git.homelab/forgejo-admin/hudsonfam path)"
  - "D-09 Commit 2 of 2 landed on homelab/main as 7f3302c (rebased from 4aab702 to integrate concurrent IUA promotion a1b454b on Forgejo path; rebase resolution preserved Plan 26-02 GHCR cutover intent)"
affects: [27-pipeline-decommission, future-iua-ghcr-tag-bumps]

tech-stack:
  added: ["First authenticated GHCR ImageRepository in homelab repo (other GHCR ImageRepositories — recyclarr, seerr — remain anonymous per CONTEXT)"]
  patterns: ["D-05 mutate-in-place for ImageRepository spec swap (preserves metadata.name across 4 reference sites: ImagePolicy, kustomize images entry, 2 setter comments)", "D-09 two-commit safety cadence (Plan 26-01 secrets + Plan 26-02 image rewire) — proven worthwhile when concurrent IUA promotion forced rebase mid-window"]

key-files:
  modified:
    - "/home/dev-server/homelab/clusters/homelab/image-automation/image-repositories.yaml — hudsonfam ImageRepository block (lines 161-170 → 161-169 post-removal-of-insecure): spec.image flipped git.homelab/forgejo-admin/hudsonfam → ghcr.io/hudsor01/hudsonfam; spec.insecure: true REMOVED (T-26-04 mitigation); spec.secretRef.name flipped forgejo-registry-creds → ghcr-pull-credentials; metadata.name + spec.interval UNCHANGED"
    - "/home/dev-server/homelab/apps/hudsonfam/kustomization.yaml — images[0].name flipped to ghcr.io/hudsor01/hudsonfam; newTag set to 20260424023904 (verified GHCR ^\\d{14}$ tag per orchestrator brief; ImageUpdateAutomation will rewrite within 6h via setter comment scan); setter comment {\\\"$imagepolicy\\\": \\\"flux-system:hudsonfam:tag\\\"} preserved byte-for-byte"
    - "/home/dev-server/homelab/apps/hudsonfam/deployment.yaml — line 36 container image flipped to ghcr.io/hudsor01/hudsonfam:20260424023904; line 128 imagePullSecrets[0].name flipped forgejo-registry-creds → ghcr-pull-credentials; setter comment {\\\"$imagepolicy\\\": \\\"flux-system:hudsonfam\\\"} preserved byte-for-byte"

key-decisions:
  - "Initial GHCR tag chosen as 20260424023904 (verified GHCR-existing tag per orchestrator brief; cluster ImageRepository scan confirms it's one of 46 GHCR tags — ImagePolicy promoted it as latestRef immediately after force-reconcile)"
  - "Rebase resolution: when concurrent IUA commit (a1b454b) promoted the OLD Forgejo path from 20260417202843 → 20260424072940 mid-window, took 'ours' (Plan 26-02 GHCR cutover) on both conflict files — the IUA Forgejo bump is moot once Plan 26-02 reconciles and ImageRepository re-targets GHCR"
  - "Push to remote 'forgejo' (not 'origin') — homelab repo's only remote alias is 'forgejo' (verified via `git remote -v`); plan said 'origin main' but the actual remote name is 'forgejo' (alias for the same Forgejo SSH endpoint). Branch tracks forgejo/main."
  - "ImagePolicy verification adapted to status.latestRef field path — installed Flux CRD uses status.latestRef.{name,tag} instead of status.latestImage; semantic content (ghcr.io/hudsor01/hudsonfam:20260424023904) confirmed correct via alt-path lookup. Pattern matches Plan 26-01 ESO CRD-vs-docs rename (spec.target.type → spec.target.template.type)."

requirements-completed: [CICD-04, CICD-06]

duration: ~30min active (executor wall-clock from precondition gate to push+verify; cluster reconcile waits + rebase resolution included). Wall-clock spans 2026-04-24T03:54Z → 13:17Z (~9h23m calendar) due to cluster reconcile interleaving — active executor work was ~30 min.
completed: 2026-04-24
---

# Phase 26 Plan 26-02: Flux Cutover to GHCR Summary

**ImageRepository hudsonfam mutated in place to scan ghcr.io/hudsor01/hudsonfam (authenticated via ghcr-pull-credentials, no insecure TLS bypass); kustomization.yaml + deployment.yaml flipped to GHCR image path; pod Running 1/1 ready=true with image pulled successfully — D-09 Commit 2 of 2 atomic cutover from Forgejo to GHCR.**

## Performance

- **Duration:** ~30 min active executor work (precondition gate → 3 file edits → 6-check grep gate → commit → rebase due to concurrent IUA promotion → re-resolve gates → push → 4-step Flux reconcile → 8-step cluster verification). Calendar wall-clock spans ~9h23min due to interleaved cluster reconciliation waits.
- **Started:** 2026-04-24T03:54:01Z (executor session start, precondition gate)
- **Completed:** 2026-04-24T13:17:38Z (last cluster verification + plan duration capture)
- **Tasks:** 7 of 7
- **Files modified:** 3 (in `/home/dev-server/homelab/`)
- **Commits to homelab/main:** 1 (`7f3302c`, rebased from initial `4aab702` to integrate concurrent IUA commit `a1b454b`)

## Accomplishments

- **ImageRepository hudsonfam fully cut over to GHCR** — `spec.image: ghcr.io/hudsor01/hudsonfam`, `spec.insecure` removed (T-26-04 silent TLS bypass eliminated), `spec.secretRef.name: ghcr-pull-credentials`. First post-cutover scan returned **46 GHCR tags** (up from 4 Forgejo tags pre-cutover) — proves authenticated GHCR scan works end-to-end.
- **ImagePolicy promoted GHCR image successfully** — `status.latestRef.name: ghcr.io/hudsor01/hudsonfam, tag: 20260424023904`. The CRD `Ready` condition message explicitly confirms migration: `"Latest image tag for ghcr.io/hudsor01/hudsonfam resolved to 20260424023904 (previously git.homelab/forgejo-admin/hudsonfam:20260424072940)"`.
- **Pod rolled cleanly** — kubelet pulled `ghcr.io/hudsor01/hudsonfam:20260424023904` in 3.228 seconds using the `ghcr-pull-credentials` Secret in homepage namespace; pod `hudsonfam-b6b754b64-vcn5l` Running 1/1, ready=true, 0 restarts.
- **D-09 two-commit cadence proven worthwhile under stress** — concurrent IUA promotion (`a1b454b` bumped Forgejo tag mid-window) forced a rebase, but the rebase cleanly resolved (took "ours" = Plan 26-02 GHCR intent on both conflict files). If Plan 26-01 + Plan 26-02 had been bundled as one commit, the same conflict + the same Plan 26-01 ESO CRD bug would have compounded.
- **D-10 rollback path STILL ALIVE** — Forgejo `forgejo-registry-creds` Secrets remain present in both namespaces; Forgejo registry path remains accessible. `kubectl edit deployment hudsonfam -n homepage` revert recipe (in Plan 26-02 PLAN `<output>` block) works for the entire Phase 26 lifetime. Phase 27 is the FIRST phase where this rollback stops working.

## Task Commits

Plan 26-02 landed in ONE commit on homelab/main (after a rebase that integrated concurrent IUA activity):

1. **All 7 tasks bundled — `7f3302c`** (`feat(hudsonfam): cut over Flux to ghcr.io/hudsor01/hudsonfam (Phase 26 Plan 26-02, Commit 2 of D-09)`): 3 files committed (image-repositories.yaml + kustomization.yaml + deployment.yaml), 6 insertions / 7 deletions. The initial commit hash `4aab702` was rebased onto `forgejo/main` (which had moved forward with `a1b454b` IUA promotion + `5eec924` chore commit) — the rebase preserved my commit message verbatim, so the only change is the parent SHA chain.

**Plan SUMMARY.md commit:** TBD (this file) — committed to hudsonfam repo (planning artifacts), separate from the homelab repo file changes above.

## Files Created/Modified

**Modified (all in `/home/dev-server/homelab/`):**

- `clusters/homelab/image-automation/image-repositories.yaml` — Hudsonfam ImageRepository block (now lines 161-169, was 161-170): `spec.image: git.homelab/forgejo-admin/hudsonfam → ghcr.io/hudsor01/hudsonfam`; **`spec.insecure: true` REMOVED** (T-26-04 mitigation; GHCR has valid CA TLS); `spec.secretRef.name: forgejo-registry-creds → ghcr-pull-credentials`. `metadata.name: hudsonfam` and `spec.interval: 6h` UNCHANGED (preserves ImagePolicy linkage at `image-policies.yaml:258`).

- `apps/hudsonfam/kustomization.yaml` — `images[0].name: git.homelab/forgejo-admin/hudsonfam → ghcr.io/hudsor01/hudsonfam`; `images[0].newTag: "20260417202843" → "20260424023904"`. Setter comment `# {"$imagepolicy": "flux-system:hudsonfam:tag"}` preserved byte-for-byte (T-26-06; setter count UNCHANGED at 1).

- `apps/hudsonfam/deployment.yaml` — Line 36 container image: `git.homelab/forgejo-admin/hudsonfam:20260417202843 → ghcr.io/hudsor01/hudsonfam:20260424023904`. Line 128 imagePullSecrets entry: `forgejo-registry-creds → ghcr-pull-credentials`. Setter comment `# {"$imagepolicy": "flux-system:hudsonfam"}` preserved byte-for-byte (T-26-06; setter count UNCHANGED at 1).

## Decisions Made

- **D-05 honored verbatim** — ImageRepository mutated in place; metadata.name + interval preserved across the swap; no cascading rename edits to ImagePolicy / setter comments / kustomize images entry needed.
- **D-07 + D-08 honored** — kustomization newTag and deployment line 36 tag both set to `20260424023904` (the same value; cross-file invariant). Initial tag chosen from orchestrator-brief verified GHCR tag.
- **D-10 rollback path explicitly preserved** — `forgejo-registry-creds` Secrets in cluster + Forgejo registry remain alive; Phase 27 is first phase where rollback stops working.
- **Push to `forgejo` remote (not `origin`)** — homelab repo's only configured remote is named `forgejo` (alias for the Forgejo SSH endpoint `192.168.4.236:30022/dev-projects/homelab.git`). Plan said `origin main` but actual remote alias is `forgejo` per `git remote -v`. Branch tracks `forgejo/main`. Same pattern Plan 26-01 used (per its SUMMARY referring to `forgejo/main` reconcile state).
- **Rebase resolution policy: take Plan 26-02 (ours)** — concurrent IUA promotion `a1b454b` (Forgejo tag bump 20260417202843 → 20260424072940) collided with my edits. Took my GHCR cutover values; the IUA Forgejo bump is moot post-cutover (ImageRepository now scans GHCR, not Forgejo).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking issue] Push to `forgejo` remote (plan said `origin`)**

- **Found during:** Task 26-02-06 — `git push origin main` returned `fatal: 'origin' does not appear to be a git repository`.
- **Issue:** Plan 26-02 PLAN.md `<action>` block specifies `git push origin main`. Orchestrator brief sequential-execution preamble also said "homelab repo's `origin` remote is the Forgejo SSH endpoint." But on disk, `git remote -v` shows ONLY a remote named `forgejo` (no `origin`). Branch tracks `forgejo/main`.
- **Fix:** Pushed via `git push forgejo main` instead. Remote URL identical (`ssh://git@192.168.4.236:30022/dev-projects/homelab.git`); only the alias differs.
- **Files modified:** None (git config is unchanged).
- **Commit:** N/A (push-only).
- **Plan acceptance impact:** PLAN acceptance criterion `git -C /home/dev-server/homelab push origin main exit code 0` is stale relative to actual remote naming. Functional intent (push HEAD to homelab Forgejo `main`) satisfied via alias `forgejo`.

**2. [Rule 3 - Blocking issue] Rebase required: concurrent IUA promotion `a1b454b` between Plan 26-01 close and Plan 26-02 push**

- **Found during:** Task 26-02-06 first push attempt — push rejected (`fetch first`); fetch revealed 2 new commits on `forgejo/main` not present locally: `a1b454b` (Flux Image Automation IUA tag bump from 20260417202843 → 20260424072940 on the OLD Forgejo path) and `5eec924` (chore image bump for an unrelated app).
- **Issue:** During the ~6 hours between Plan 26-01 close (2026-04-24T03:25Z) and Plan 26-02 execution (2026-04-24T03:54Z onwards), Flux ImageUpdateAutomation scanned the existing Forgejo ImageRepository on its 6h interval and pushed a tag-bump commit on the old `git.homelab/forgejo-admin/hudsonfam` path. This created a 3-way conflict on `apps/hudsonfam/kustomization.yaml` line 14 and `apps/hudsonfam/deployment.yaml` line 36 (both files where IUA had bumped the Forgejo tag while my Plan 26-02 commit flipped them to GHCR).
- **Fix:** `git pull --rebase forgejo main` produced the expected conflicts. Resolved by taking "ours" (Plan 26-02 GHCR cutover values) on both files via Python in-place rewrite of the conflict markers. Re-ran the full Task 26-02-05 6-check grep gate after resolution — all 6 checks PASSED. `git rebase --continue` succeeded with `GIT_EDITOR=true` to preserve the original commit message. Re-pushed cleanly.
- **Files modified:** `apps/hudsonfam/kustomization.yaml`, `apps/hudsonfam/deployment.yaml` (conflict markers removed, GHCR values retained).
- **Commit hash changed:** Initial `4aab702` → rebased `7f3302c`. Same commit message body verbatim; only the parent SHA chain differs.
- **Verification:** Post-rebase 6-check gate all PASS; YAML parses; `7f3302c` pushed and matches `forgejo/main` HEAD.
- **Plan acceptance impact:** PLAN acceptance criterion `Predecessor commit (Plan 26-01 Commit 1) still present in git log` — VERIFIED: `cc12a61` and `943c2c4` (Plan 26-01 commits) still in `git log forgejo/main`. The rebase preserves history; only intervening IUA commits were integrated.
- **Lesson for future plans:** Long-running cluster pipelines (IUA, periodic Flux scans) can mutate the working repo between plan close and plan execution. Plans that mutate setter-anchored fields should expect potential rebases when the IUA cycle interval is shorter than the inter-plan gap. D-09 cadence didn't prevent this, but the conflict was trivially resolvable because the intent (replace Forgejo with GHCR) makes the Forgejo bump moot.

**3. [Rule 1 - Verification script bug] Plan-supplied sed extraction for Check 4 had greedy `.*:` consuming past the tag into the comment**

- **Found during:** Task 26-02-05 first run — Check 4 reported `MISMATCH: kusto=20260424023904 deploy=hudsonfam"}`.
- **Issue:** Plan-supplied extraction `sed 's/.*://; s/ .*//'` against `image: ghcr.io/hudsor01/hudsonfam:20260424023904 # {"$imagepolicy": "flux-system:hudsonfam"}` greedily strips to the LAST `:` (which is inside `"flux-system:hudsonfam"` in the trailing comment), then strips at the next space — yielding `hudsonfam"}` instead of the intended tag.
- **Fix:** Replaced extraction with anchored regex `sed -E 's|.*ghcr\.io/hudsor01/hudsonfam:([0-9]+) .*|\1|'` which captures only the digits between `hudsor01/hudsonfam:` and the next space. Re-ran Check 4 — PASS: MATCH (20260424023904).
- **Files modified:** None (verification-script-only fix; PLAN.md not edited per orchestrator scope).
- **Independent confirmation:** Direct content inspection — `grep -c "20260424023904"` returns 1 on each of `apps/hudsonfam/kustomization.yaml` and `apps/hudsonfam/deployment.yaml`; both files contain the same tag exactly once.
- **Plan acceptance impact:** Functional invariant (kustomization newTag == deployment image-tag portion) is satisfied; only the verification script in the PLAN had the bug. Recommend updating PLAN Task 26-02-05 Check 4 sed to the anchored form for any future re-execution.

**4. [Rule 1 - Verification CRD field rename] Plan Step 7 verification command uses `status.latestImage`; installed Flux CRD uses `status.latestRef.{name,tag}`**

- **Found during:** Task 26-02-07 Step 7 — `kubectl get imagepolicy hudsonfam -n flux-system -o jsonpath='{.status.latestImage}'` returned EMPTY.
- **Issue:** Plan-supplied verification command (and 26-VALIDATION.md "Full validation script" line 46) assumes a field `status.latestImage`. The installed Flux ImagePolicy CRD (apiVersion noted via `kubectl get imagepolicy ... -o yaml`) populates `status.latestRef.name` and `status.latestRef.tag` separately, plus a `status.observedPreviousRef`, but NOT a composite `status.latestImage` field. This is the same pattern Plan 26-01 hit with ESO (`spec.target.type` → `spec.target.template.type`): published Flux/CRD docs sometimes reference fields the installed CRD has renamed or moved.
- **Fix:** Verified semantic equivalent via `kubectl get imagepolicy hudsonfam -n flux-system -o jsonpath='Name: {.status.latestRef.name}{"\n"}Tag: {.status.latestRef.tag}{"\n"}'` → `Name: ghcr.io/hudsor01/hudsonfam, Tag: 20260424023904`. Composite string `ghcr.io/hudsor01/hudsonfam:20260424023904` matches `^ghcr\.io/hudsor01/hudsonfam:[0-9]{14}$` ✓.
- **Bonus signal:** ImagePolicy `Ready` condition message explicitly states the migration: `"Latest image tag for ghcr.io/hudsor01/hudsonfam resolved to 20260424023904 (previously git.homelab/forgejo-admin/hudsonfam:20260424072940)"` — much stronger evidence than just an empty `latestImage` string.
- **Plan acceptance impact:** Functional intent (ImagePolicy promoted the newest GHCR tag matching the regex) is satisfied. Recommend updating PLAN Task 26-02-07 Step 7 + 26-VALIDATION.md to use `status.latestRef.name + ":" + status.latestRef.tag` (or to query the `Ready` condition message) for the installed Flux CRD shape.

---

**Total deviations:** 4 auto-fixed (1 Rule 3 push-remote-name, 1 Rule 3 rebase-required, 2 Rule 1 verification-script bugs)
**Impact on plan:** All 4 deviations were operational/verification-only and trivially resolved without changing the plan's functional intent. The cutover landed cleanly: ImageRepository scanning GHCR with 46 tags discovered, ImagePolicy promoted `20260424023904`, Deployment + pod running on the GHCR image. None of the Plan 26-02 acceptance criteria failed at the semantic level — only the literal verification commands needed adaptation to the installed Flux CRD shapes (same pattern as Plan 26-01 ESO CRD bug).

## Issues Encountered

- **Concurrent IUA promotion forced rebase mid-execution** — described in full under Deviation 2 above. Underscores that the D-09 two-commit cadence is necessary BUT not sufficient against a Flux pipeline that's actively running other automation against the same files. Future similar phases should consider (a) timing the cutover to occur shortly after a fresh IUA scan (no pending bump), or (b) explicitly suspending IUA via `flux suspend image update homelab-images` before mutating setter-anchored files, then `flux resume` after Commit 2 lands. For Phase 26 Plan 26-02 the conflict was trivially resolvable; for higher-stakes phases the suspend/resume dance might be warranted.
- **Two CRD-vs-published-docs field-rename gotchas** — Plan 26-01 hit one (`spec.target.type` → `spec.target.template.type` for ExternalSecrets v1); Plan 26-02 hit another (`status.latestImage` → `status.latestRef.{name,tag}` for Flux ImagePolicy). Pattern for v3.5-Pn future planning: when authoring per-phase verification commands, dry-run them against the installed CRD shape (`kubectl get <resource> -n <ns> -o yaml`) before locking the plan, not just against the published docs.

## User Setup Required

None. All cluster verification GREEN; no owner action needed for Phase 26 code-complete declaration.

## Verification Outputs

### Task 26-02-01: Precondition Gate

```
Secret ghcr-pull-credentials -n homepage type: kubernetes.io/dockerconfigjson ✓
Secret ghcr-pull-credentials -n flux-system type: kubernetes.io/dockerconfigjson ✓
ExternalSecret ghcr-pull-credentials -n homepage Ready: True ✓
ExternalSecret ghcr-pull-credentials -n flux-system Ready: True ✓
Initial GHCR tag chosen: 20260424023904 (verified GHCR ^\d{14}$ tag per orchestrator brief)
```

### Task 26-02-02: image-repositories.yaml mutation

```
image: ghcr.io/hudsor01/hudsonfam (count = 1) ✓
secretRef.name: ghcr-pull-credentials (count = 1) ✓
insecure: true (count = 0; T-26-04 mitigated; was 1 pre-edit) ✓
git.homelab/forgejo-admin/hudsonfam (count = 0) ✓
forgejo-registry-creds (count = 0) ✓
ImageRepository entries (count = 19; UNCHANGED — no other blocks touched) ✓
yaml.safe_load_all parses 19 docs cleanly ✓
```

### Task 26-02-03: kustomization.yaml mutation

```
images[0].name: ghcr.io/hudsor01/hudsonfam (count = 1) ✓
git.homelab/forgejo-admin/hudsonfam (count = 0) ✓
$imagepolicy setter count = 1 (T-26-06 UNCHANGED) ✓
Full setter comment {"$imagepolicy": "flux-system:hudsonfam:tag"} preserved byte-for-byte ✓
newTag matches ^"\d{14}"$ (count = 1) ✓
ghcr-pull-secret.yaml line preserved in resources (count = 1; Plan 26-01 work intact) ✓
yaml.safe_load parses cleanly ✓
```

### Task 26-02-04: deployment.yaml mutation

```
Line 36 regex match ^          image: ghcr\.io/hudsor01/hudsonfam:[0-9]{14} # \{"\$imagepolicy": "flux-system:hudsonfam"\}$ (count = 1) ✓
git.homelab/forgejo-admin/hudsonfam (count = 0) ✓
Line 128: ^        - name: ghcr-pull-credentials$ (count = 1) ✓
forgejo-registry-creds (count = 0) ✓
$imagepolicy setter count = 1 (T-26-06 UNCHANGED) ✓
imagePullSecrets: blocks (count = 1; no second block introduced) ✓
yaml.safe_load parses cleanly ✓
```

### Task 26-02-05: BLOCKING 6-Check Grep Gate (post-rebase-resolution rerun)

```
Check 0 (PAT defense-in-depth, T-26-01): PASS — zero ghp_* / github_pat_* matches across 3 files
Check 1 (zero Forgejo paths in 3 mutated files): PASS — zero matches
Check 2 (zero insecure: true in image-repositories.yaml, T-26-04): PASS — zero matches
Check 3 (image NAME consistency): PASS — kusto=ghcr.io/hudsor01/hudsonfam == deploy=ghcr.io/hudsor01/hudsonfam
Check 4 (TAG consistency, corrected extraction): PASS — kusto=20260424023904 == deploy=20260424023904
Check 5 (Secret name consistency): PASS — both deployment.yaml + image-repositories.yaml reference ghcr-pull-credentials
Bonus (T-26-06 setter counts): kustomization.yaml=1, deployment.yaml=1 (UNCHANGED from baseline)
Bonus (YAML parse): all 3 files parse cleanly
```

### Task 26-02-06: Commit 2 of D-09

```
Commit hash (post-rebase): 7f3302c (initial: 4aab702, rebased to integrate concurrent IUA commit a1b454b)
Commit message subject: feat(hudsonfam): cut over Flux to ghcr.io/hudsor01/hudsonfam (Phase 26 Plan 26-02, Commit 2 of D-09)
Files in commit: 3 (apps/hudsonfam/deployment.yaml, apps/hudsonfam/kustomization.yaml, clusters/homelab/image-automation/image-repositories.yaml)
Diff stat: 6 insertions(+), 7 deletions(-)
Push: forgejo main (5eec924..7f3302c) — local main == forgejo/main confirmed
Predecessor commits preserved: cc12a61 + 943c2c4 (Plan 26-01) both still in git log
Post-commit deletion check: OK — no file deletions
```

### Task 26-02-07: D-11 8-Step Cluster Verification Suite

```
Step 1 (flux reconcile source git flux-system): ✔ fetched revision main@sha1:7f3302c332ae649414249aeb5f92860bd19e1e47
Step 2 (flux reconcile image repository hudsonfam): ✔ scan fetched 46 tags
Step 3 (flux reconcile image update homelab-images): ✔ repository up-to-date
Step 4 (flux reconcile kustomization hudsonfam): ✔ applied revision main@sha1:7f3302c332ae649414249aeb5f92860bd19e1e47
Step 5 (kubectl get imagerepository hudsonfam Ready): True ✓
Step 5 detail (spec.image): ghcr.io/hudsor01/hudsonfam ✓
Step 5 detail (Ready message): "successful scan: found 46 tags with checksum 3592059367" ✓
Step 6 (latestTags[0]): "latest" — note: scan returns `latest` first because GHCR has BOTH `latest` and `^\d{14}$` tags per Phase 25 D-04. ImagePolicy filter `^\d{14}$` correctly selects `20260424023904` from the full 46-tag set; `latestTags[0]` is the raw scan order, not the filtered policy result. SEMANTIC PASS via Step 7.
Step 7 (ImagePolicy latestRef.name + tag): ghcr.io/hudsor01/hudsonfam : 20260424023904 ✓
       (status.latestImage was empty due to CRD field rename — see Deviation 4; latestRef.{name,tag} is the canonical source)
Step 7 BONUS (ImagePolicy Ready message): "Latest image tag for ghcr.io/hudsor01/hudsonfam resolved to 20260424023904 (previously git.homelab/forgejo-admin/hudsonfam:20260424072940)" — explicit migration confirmation
Step 8a (Deployment image): ghcr.io/hudsor01/hudsonfam:20260424023904 ✓
Step 8b (Deployment imagePullSecrets[0].name): ghcr-pull-credentials ✓
Step 8c (Pod): hudsonfam-b6b754b64-vcn5l Running 1/1 ready=true restarts=0 image=ghcr.io/hudsor01/hudsonfam:20260424023904 ✓
Step 8c BONUS (Pod events): Pulling → Pulled (3.228s, 91MB) → Created → Started — clean kubelet pull from GHCR using ghcr-pull-credentials Secret
Step 9 (Flux Image Automation commit on homelab repo): OBSERVATIONAL-PENDING — IUA reported "repository up-to-date" because current setter value (20260424023904) already equals what ImagePolicy promotes. First IUA commit on the GHCR path will fire when Phase 25 produces a NEWER ^\d{14}$ tag (next push to hudsonfam main, or workflow_dispatch). CICD-06 SC #5 will be fully observable then. Does NOT block Phase 26 code-complete.
```

### Plan 26-02 must_haves Final Status

| # | Must-Have | Status | Evidence |
|---|-----------|--------|----------|
| 1 | Plan 26-01 Task 26-01-08 owner-approved (D-09 unlock) | ✓ | Precondition gate verified all 4 cluster checks (Secret type x2, ExternalSecret Ready x2) |
| 2 | ImageRepository hudsonfam Ready=True post-Commit-2; spec.image=ghcr.io/hudsor01/hudsonfam; insecure removed; secretRef=ghcr-pull-credentials | ✓ | Step 5: Ready=True, scanned 46 tags; spec.image confirmed; spec.insecure empty; spec.secretRef.name confirmed |
| 3 | ImagePolicy latestImage = ghcr.io/hudsor01/hudsonfam:<newest-^\d{14}$> | ✓ | Step 7: latestRef.name+tag = ghcr.io/hudsor01/hudsonfam:20260424023904; Ready message confirms migration |
| 4 | Deployment imagePullSecrets[0].name=ghcr-pull-credentials AND container image starts with ghcr.io/hudsor01/hudsonfam: AND pod Running 1/1 | ✓ | Step 8a/b/c all green; pod ready=true 0 restarts; clean kubelet pull |
| 5 | ImageUpdateAutomation produces Flux Image Automation commit referencing ghcr.io/hudsor01/hudsonfam (within 6h post-Commit-2) | OBSERVATIONAL-PENDING | IUA reports "repository up-to-date"; first IUA commit fires when Phase 25 produces a newer tag |
| 6 | Setter-comment count UNCHANGED at 1 in deployment.yaml (T-26-06) | ✓ | grep -c '\$imagepolicy' deployment.yaml = 1 |
| 7 | Setter-comment count UNCHANGED at 1 in kustomization.yaml (T-26-06) | ✓ | grep -c '\$imagepolicy' kustomization.yaml = 1 |
| 8 | insecure: true count decreases by 1 in image-repositories.yaml (T-26-04) | ✓ | Pre-edit baseline = 1 (hudsonfam block); post-edit = 0 |
| 9 | No PAT-shaped string introduced by Plan 26-02 edits (T-26-01 defense-in-depth) | ✓ | Task 26-02-05 Check 0 PASS — zero ghp_*/github_pat_* matches across 3 mutated files |

## Phase 27 GATING RULE

**Do NOT run Phase 27 until Phase 26 has been observably green for at least 10 minutes (one full Flux reconcile cycle).** Phase 27 (CICD-07/08/09) deletes the Forgejo rollback path; if Phase 26 stops working AFTER Phase 27 deletes Forgejo, there is no working rollback. Operational sequencing rule per CONTEXT D-10.

**Required before Phase 27 starts:**
- ImageRepository `Ready: True` continuously for ≥10 min (no flap)
- Pod `hudsonfam-b6b754b64-vcn5l` (or its successor after IUA-driven roll) Running 1/1 ready=true with 0 restarts
- Optional: confirm at least one IUA commit on GHCR path has fired (proves CICD-06 SC #5 end-to-end without ambiguity); otherwise document as observational-deferred to Phase 28 UAT

## D-10 Rollback Recipe (operational know-how — recorded for posterity)

```bash
# If Phase 26 fails post-Commit-2 (e.g., kubelet ImagePullBackOff, ImageRepository Ready=False with auth error):
kubectl edit deployment hudsonfam -n homepage
# Change spec.template.spec.containers[0].image back to: git.homelab/forgejo-admin/hudsonfam:20260424072940
#   (or 20260417202843 — both are valid Forgejo tags still in the registry)
# Change spec.template.spec.imagePullSecrets[0].name back to: forgejo-registry-creds
# Save + exit. Pod rolls back within seconds.
# Then: investigate root cause (PAT issue / GHCR rate limit / network policy) before re-attempting Plan 26-02.
# Recipe ONLY works while Phase 27 has NOT been run.
```

Note: rollback tag value updated from PLAN's `20260417202843` to `20260424072940` because the latter is the most recent IUA-promoted Forgejo tag (per `a1b454b`); both work as rollback values.

## PAT Expiry Calendar Reminder

(Inherited from Plan 26-01 ops note — repeated here for Phase 27 handoff continuity.) Classic PAT generated under owner account `hudsor01` with 1-year expiry per D-01 amended (vault key `ghcr-pull-credentials`, property `pat`). Owner should set a calendar reminder ~2 weeks pre-expiry (target: ~2027-04-10) to rotate the `pat` property in vault — both Secrets (homepage + flux-system) pick up the new value within ESO `refreshInterval: 1h`. No code or YAML change required for rotation; vault write is the single point of action.

## Self-Check: PASSED

**Files modified on disk** (verified via Read + Grep):
- ✓ `/home/dev-server/homelab/clusters/homelab/image-automation/image-repositories.yaml` — hudsonfam block now contains `image: ghcr.io/hudsor01/hudsonfam`, `secretRef.name: ghcr-pull-credentials`; zero `insecure: true`; zero Forgejo refs
- ✓ `/home/dev-server/homelab/apps/hudsonfam/kustomization.yaml` — `images[0].name: ghcr.io/hudsor01/hudsonfam`, `newTag: "20260424023904"`, setter comment intact
- ✓ `/home/dev-server/homelab/apps/hudsonfam/deployment.yaml` — line 36 image flipped, line 128 imagePullSecret flipped, both setter comments intact

**Commit exists on homelab forgejo/main** (verified via `git log --oneline forgejo/main -1`):
- ✓ `7f3302c` — `feat(hudsonfam): cut over Flux to ghcr.io/hudsor01/hudsonfam (Phase 26 Plan 26-02, Commit 2 of D-09)` — local main == forgejo/main HEAD

**Cluster state verified live:**
- ✓ ImageRepository hudsonfam (flux-system ns): Ready=True, spec.image=ghcr.io/hudsor01/hudsonfam, secretRef.name=ghcr-pull-credentials, scanned 46 GHCR tags
- ✓ ImagePolicy hudsonfam (flux-system ns): latestRef.name+tag = ghcr.io/hudsor01/hudsonfam:20260424023904
- ✓ Deployment hudsonfam (homepage ns): containers[0].image=ghcr.io/hudsor01/hudsonfam:20260424023904, imagePullSecrets[0].name=ghcr-pull-credentials
- ✓ Pod hudsonfam-b6b754b64-vcn5l (homepage ns): Running 1/1, ready=true, 0 restarts, image pulled cleanly in 3.228s from GHCR

**Threat-model verifications:**
- ✓ T-26-01 (PAT leakage defense-in-depth): Task 26-02-05 Check 0 PASS — zero ghp_*/github_pat_* matches across the 3 mutated files
- ✓ T-26-04 (TLS bypass via insecure: true): grep -c "insecure: true" image-repositories.yaml returns 0 (decreased by 1 from baseline)
- ✓ T-26-06 (setter-comment mutation): grep -c '\$imagepolicy' returns 1 in BOTH kustomization.yaml AND deployment.yaml (UNCHANGED from baseline)
- ✓ T-26-07 (cross-file invariant violation): Task 26-02-05 Checks 3+4+5 all PASS — image NAME, tag value, and Secret name byte-equal across kustomization.yaml + deployment.yaml + image-repositories.yaml + Plan 26-01 ExternalSecret targets

**D-09 cadence integrity:**
- ✓ Plan 26-01 Commit 1 commits (cc12a61 + 943c2c4) preserved in git log forgejo/main
- ✓ Plan 26-02 Commit 2 (7f3302c, rebased from 4aab702) is the third Phase-26 commit on homelab/main
- ✓ Two-commit cadence proven worthwhile under stress (rebase resolved cleanly because intent makes IUA Forgejo bumps moot)

---

*Phase: 26-flux-reconfiguration*
*Completed: 2026-04-24*
*Commit 2 of D-09 — Phase 26 code-complete; Phase 27 gated on ≥10 min observably-green window per D-10*
