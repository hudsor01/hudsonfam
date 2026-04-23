# Phase 26: Flux Reconfiguration (v3.5-P2) - Context

**Gathered:** 2026-04-23 (auto mode — 12 decisions locked; infrastructure phase whose entire file surface lives in the `homelab` repo, not `hudsonfam`)
**Status:** Ready for planning

<domain>
## Phase Boundary

Reconfigure Flux to watch `ghcr.io/hudsor01/hudsonfam` (the new tag stream Phase 25 produces) instead of the broken `git.homelab/forgejo-admin/hudsonfam`. Provision a GHCR pull PAT via the established ExternalSecret + ClusterSecretStore pattern — no PAT in git. Validate that ImagePolicy's existing `^\d{14}$` regex picks the newest YYYYMMDDHHmmss tag and that ImageUpdateAutomation writes the new tag into `apps/hudsonfam/kustomization.yaml`. 3 REQs: CICD-04, CICD-05, CICD-06.

**Pre-Phase-26 state (verified via repo + cluster reads on 2026-04-23):**

- **Phase 25 status:** `.github/workflows/build-and-push.yml` shipped (commit `c7d8f33`); first GHCR build observational verification still pending owner browser check at `https://github.com/hudsor01/hudsonfam/actions`. Phase 26 planning assumes the first build succeeds and produces at least one `YYYYMMDDHHmmss` tag at `ghcr.io/hudsor01/hudsonfam` — if not, Phase 26 plan must add a precondition gate.
- **GHCR package visibility:** Not yet recorded in STATE.md (owner browser check at `github.com/users/hudsor01/packages/container/hudsonfam/settings` still pending). Plan assumes private (worst case) and provisions a PAT regardless — works for both public and private packages.
- **Pre-Phase-25 production image:** `ghcr.io/hudsor01/hudsonfam:20260408173607` already exists at the GHCR namespace (the Phase 25 push reuses it). Cluster Deployment currently runs `git.homelab/forgejo-admin/hudsonfam:20260417202843` per `apps/hudsonfam/deployment.yaml:36` — pinned to old Forgejo registry path.
- **Existing ImageRepository (the active one):** `clusters/homelab/image-automation/image-repositories.yaml:162-170` declares `metadata.name: hudsonfam` (resolves to `flux-system` namespace via the kustomization), `spec.image: git.homelab/forgejo-admin/hudsonfam`, `interval: 6h`, `insecure: true`, `secretRef.name: forgejo-registry-creds`. THIS is the resource Phase 26 mutates in place.
- **Existing ImagePolicy:** `clusters/homelab/image-automation/image-policies.yaml:257-266` declares `metadata.name: hudsonfam`, `spec.imageRepositoryRef.name: hudsonfam`, `filterTags.pattern: '^\d{14}$'`, `policy.numerical.order: asc`. Already correctly configured for the timestamp tag stream — Phase 26 makes ZERO changes to this file. The regex matches the exact format Phase 25 emits.
- **Existing ImageUpdateAutomation:** `clusters/homelab/image-automation/image-update-automation.yaml` declares `metadata.name: homelab-images`, `update.path: ./apps`, `update.strategy: Setters`. Already wired to scan all `apps/` subdirs for `# {"$imagepolicy": "flux-system:hudsonfam"}` setter comments — Phase 26 makes ZERO changes to this file. The setter comments at `apps/hudsonfam/kustomization.yaml:13` (`{"$imagepolicy": "flux-system:hudsonfam:tag"}`) and `apps/hudsonfam/deployment.yaml:36` (`{"$imagepolicy": "flux-system:hudsonfam"}`) are already correct.
- **Existing Deployment imagePullSecrets:** `apps/hudsonfam/deployment.yaml:127-128` references `forgejo-registry-creds` — Phase 26 swaps this for `ghcr-pull-credentials`.
- **Existing ExternalSecret pattern:** `apps/hudsonfam/external-secret.yaml` already uses `secretStoreRef.name: kubernetes-secrets`, `kind: ClusterSecretStore` — Phase 26 follows the same pattern for the new GHCR pull secret.
- **Other GHCR ImageRepositories in homelab** (`recyclarr`, `seerr` per `image-repositories.yaml`): Both are anonymous (no `secretRef`). They've been failing on a separate `cache.homelab` TLS issue (per `ci-cd-fragility-analysis.md` Finding 5) — that's NOT this phase's problem. Phase 26 introduces the FIRST authenticated GHCR ImageRepository in the homelab repo.
- **Broken duplicate:** `default/imagerepository/hudsonfam` (referencing missing `forgejo-registry-creds`) — DEFERRED to Phase 27 per `CICD-07`. Phase 26 leaves it in place.

**What ships end-to-end this phase (file edits in `/home/dev-server/homelab/`):**

1. **NEW:** `apps/hudsonfam/ghcr-pull-secret.yaml` — ExternalSecret that materializes a `kubernetes.io/dockerconfigjson`-typed Secret named `ghcr-pull-credentials` in `homepage` namespace (for kubelet image pulls)
2. **NEW:** `clusters/homelab/image-automation/ghcr-pull-secret.yaml` (or a new file under that dir) — ExternalSecret that materializes the SAME `ghcr-pull-credentials` Secret in `flux-system` namespace (for ImageRepository scan auth — Flux requires the secret to live in the same namespace as the ImageRepository)
3. **MODIFIED:** `clusters/homelab/image-automation/image-repositories.yaml:162-170` — `spec.image` flips from `git.homelab/forgejo-admin/hudsonfam` to `ghcr.io/hudsor01/hudsonfam`; `insecure: true` removed (GHCR has valid TLS); `secretRef.name` flips from `forgejo-registry-creds` to `ghcr-pull-credentials`. `metadata.name: hudsonfam` and `interval: 6h` UNCHANGED (preserves ImagePolicy linkage).
4. **MODIFIED:** `apps/hudsonfam/kustomization.yaml:11-13` — `images[0].name` flips from `git.homelab/forgejo-admin/hudsonfam` to `ghcr.io/hudsor01/hudsonfam`. `newTag` value left as-is (Flux ImageUpdateAutomation rewrites it on next scan); `# {"$imagepolicy": ...}` setter comment UNCHANGED.
5. **MODIFIED:** `apps/hudsonfam/deployment.yaml:36` — `image:` value flips from `git.homelab/forgejo-admin/hudsonfam:20260417202843` to `ghcr.io/hudsor01/hudsonfam:<initial-ghcr-tag>` where `<initial-ghcr-tag>` is the latest YYYYMMDDHHmmss tag visible in GHCR at the time of the edit. Setter comment unchanged.
6. **MODIFIED:** `apps/hudsonfam/deployment.yaml:127-128` — `imagePullSecrets[0].name` flips from `forgejo-registry-creds` to `ghcr-pull-credentials`.
7. **MODIFIED:** `apps/hudsonfam/kustomization.yaml` — add `ghcr-pull-secret.yaml` to the `resources:` list (so the new ExternalSecret reconciles via the homepage kustomization).
8. **MODIFIED:** `clusters/homelab/image-automation/kustomization.yaml` — add the new ExternalSecret file to its `resources:` list (so the flux-system-scoped pull secret materializes via the image-automation kustomization).

**Vault prerequisite (out-of-band, owner-only step):** Before the homelab-repo PR merges, the owner stores a GitHub fine-grained PAT (scope: `read:packages`, 1-year expiry, owner: `hudsor01`, repo: `hudsonfam` only) in the existing `kubernetes-secrets` ClusterSecretStore-backed vault under key `ghcr-pull-credentials` with two properties: `username` (= `hudsor01`) and `pat` (= the actual PAT). The ExternalSecrets templating reconstructs the dockerconfigjson from these two fields — no need to hand-craft and paste a full dockerconfigjson string.

**Not in this phase:**

- Deletion of broken `default/imagerepository/hudsonfam` → Phase 27 (CICD-07)
- Removal of `.woodpecker.yaml` from hudsonfam repo → Phase 27 (CICD-08)
- Cleanup of orphaned `git.homelab/forgejo-admin/hudsonfam` registry entries → Phase 27 (CICD-09)
- End-to-end no-op-commit smoke test → Phase 28 (CICD-10)
- CLAUDE.md §Deployment rewrite → Phase 28 (CICD-11)
- Retroactive UAT for Phases 21/22/23/24 → Phase 28 (CICD-12, CICD-13)
- Removing `forgejo-registry-creds` Secret resource itself (if one exists) → Phase 27 (cleanup; Phase 26 only de-references it)
- Multi-namespace pull-secret reflection (Reflector/Replicator pattern) — Phase 26 just creates two ExternalSecrets with the same source key, which is simpler and more explicit
- Image signing verification (cosign / sigstore) — out of v3.5 scope per Phase 25 deferred list
- New ExternalSecret patterns (separate vault provider) — reuses the existing `kubernetes-secrets` ClusterSecretStore exclusively

</domain>

<decisions>
## Implementation Decisions

### GHCR pull authentication

- **D-01 [--auto, AMENDED 2026-04-23 post-research per R-01]:** Provision a GitHub **classic PAT** (NOT fine-grained — GHCR explicitly does not support fine-grained PATs per GitHub Container Registry docs and community discussion #38467) with scope `read:packages` ONLY (no `repo`, no `write:packages`, no `delete:packages`). Expiry: 1 year. Owner: `hudsor01`. Store in vault under key `ghcr-pull-credentials` with two properties: `username: hudsor01` and `pat: <classic PAT value>`. Rationale: classic PAT is the ONLY token type GHCR accepts for non-Actions auth contexts (Flux is external to GitHub); single-scope `read:packages` is the minimum-privilege equivalent of the originally-intended fine-grained `Packages: Read`; works regardless of whether the GHCR package is public or private; SEED-005 §Risks already calls out the 1-year expiry tradeoff (calendar reminder 2 weeks pre-expiry — captured as Phase 26 ops note in SUMMARY). **Override origin:** initial `--auto` decision proposed fine-grained for least-privilege; researcher (26-RESEARCH.md R-01) verified against official GitHub docs that fine-grained does not work; amended in place rather than via D-13 to keep the decision register coherent.

- **D-02 [--auto]:** PAT goes through the existing `kubernetes-secrets` ClusterSecretStore (the same one referenced by `apps/hudsonfam/external-secret.yaml:13`). NO new ClusterSecretStore introduced this phase — owner already operates this vault path; adding a new vault provider would be unjustified scope creep for a single secret.

### ExternalSecret shape

- **D-03 [--auto]:** ExternalSecret uses ExternalSecrets v1 `spec.target.template` to reconstruct a `kubernetes.io/dockerconfigjson` Secret from the two raw fields (`username`, `pat`) stored in vault. The template body is the standard form:

  ```yaml
  spec:
    target:
      name: ghcr-pull-credentials
      type: kubernetes.io/dockerconfigjson
      template:
        type: kubernetes.io/dockerconfigjson
        data:
          .dockerconfigjson: |
            {"auths":{"ghcr.io":{"username":"{{ .username }}","password":"{{ .pat }}","auth":"{{ printf "%s:%s" .username .pat | b64enc }}"}}}
    data:
      - secretKey: username
        remoteRef:
          key: ghcr-pull-credentials
          property: username
      - secretKey: pat
        remoteRef:
          key: ghcr-pull-credentials
          property: pat
  ```

  Rationale: vault stores the two human-meaningful fields (rotatable independently), Kubernetes gets the dockerconfigjson shape kubelet + Flux both expect. Avoids the brittle "paste a base64-encoded JSON blob into the vault" pattern. ExternalSecrets sprig templating (`b64enc`, `printf`) handles the encoding at sync time.

### Pull-secret namespace scope

- **D-04 [--auto]:** Two ExternalSecrets, both pointing at the same vault key `ghcr-pull-credentials`:
  1. `apps/hudsonfam/ghcr-pull-secret.yaml` → materializes Secret `ghcr-pull-credentials` in `homepage` namespace (for kubelet image pull)
  2. `clusters/homelab/image-automation/ghcr-pull-secret.yaml` → materializes Secret `ghcr-pull-credentials` in `flux-system` namespace (for ImageRepository scan auth)

  Rationale: Flux requires `ImageRepository.spec.secretRef` to reference a Secret in the same namespace as the ImageRepository (no cross-namespace lookup); kubelet requires `imagePullSecrets` to reference a Secret in the same namespace as the Deployment (no cross-namespace lookup). Two ExternalSecrets is more explicit than installing a Reflector/Replicator pattern just to mirror one secret across two namespaces. Both ESOs share the same vault key, so PAT rotation = one vault update propagates to both Secrets within `refreshInterval: 1h`.

### ImageRepository disposition

- **D-05 [--auto]:** Mutate the existing `clusters/homelab/image-automation/image-repositories.yaml:162-170` block in place. Specifically:
  - `metadata.name: hudsonfam` UNCHANGED — preserves the ImagePolicy linkage (`image-policies.yaml:261` references `imageRepositoryRef.name: hudsonfam`)
  - `spec.image:` flips from `git.homelab/forgejo-admin/hudsonfam` to `ghcr.io/hudsor01/hudsonfam`
  - `spec.insecure: true` REMOVED entirely (GHCR has valid TLS — `insecure: true` was a Forgejo self-signed-cert workaround)
  - `spec.secretRef.name:` flips from `forgejo-registry-creds` to `ghcr-pull-credentials`
  - `spec.interval: 6h` UNCHANGED (matches every other ImageRepository in the file; consistency)

  Rationale: same `metadata.name` keeps every downstream reference (ImagePolicy, ImageUpdateAutomation Setters, kustomization image-name match) working without any additional edits. Deleting + recreating with a different name would force ImagePolicy + setter-comment edits across multiple files — pure churn.

### ImagePolicy + ImageUpdateAutomation

- **D-06 [--auto]:** ZERO edits to `clusters/homelab/image-automation/image-policies.yaml` (the regex `^\d{14}$` already matches the exact YYYYMMDDHHmmss format Phase 25 emits) and ZERO edits to `clusters/homelab/image-automation/image-update-automation.yaml` (the existing `update.path: ./apps` + `strategy: Setters` config already covers `apps/hudsonfam/`). Phase 26 only modifies the ImageRepository block; everything downstream of it Just Works because of the existing setter-comment plumbing.

### Kustomization + Deployment image rewrite

- **D-07 [--auto]:** Edit `apps/hudsonfam/kustomization.yaml` lines 12-13:
  - `images[0].name` flips from `git.homelab/forgejo-admin/hudsonfam` to `ghcr.io/hudsor01/hudsonfam`
  - `newTag:` value is set to the **current latest** YYYYMMDDHHmmss tag visible in GHCR at edit time (manually queried via `https://github.com/hudsor01/hudsonfam/pkgs/container/hudsonfam` browser page or `gh api /users/hudsor01/packages/container/hudsonfam/versions`). Flux ImageUpdateAutomation will overwrite this on the next scan cycle, so the initial value just needs to be a valid existing tag. **Acceptable initial value:** the Phase 25 first-build tag (whatever the owner sees in GHCR), OR `20260408173607` if no Phase 25 build has completed yet (falls back to the pre-Phase-25 image; ImageUpdateAutomation will bump it within 6h regardless).
  - `# {"$imagepolicy": "flux-system:hudsonfam:tag"}` setter comment UNCHANGED

- **D-08 [--auto]:** Edit `apps/hudsonfam/deployment.yaml` line 36:
  - `image:` value flips from `git.homelab/forgejo-admin/hudsonfam:20260417202843` to `ghcr.io/hudsor01/hudsonfam:<same-initial-tag-as-D-07>`
  - `# {"$imagepolicy": "flux-system:hudsonfam"}` setter comment UNCHANGED
  - Edit `apps/hudsonfam/deployment.yaml` line 128: `imagePullSecrets[0].name` flips from `forgejo-registry-creds` to `ghcr-pull-credentials`

  Rationale: kustomize's `images:` block in `kustomization.yaml` is the canonical override path, but the deployment.yaml `image:` value is what the setter comment annotates — both must agree post-edit. Flux's Setters strategy rewrites the field marked by the comment, so both the kustomization images entry AND the deployment image line need to be valid post-edit; ImageUpdateAutomation keeps them in sync going forward.

### Migration sequencing + safety

- **D-09 [--auto]:** Sequential two-commit PR strategy on the homelab repo:
  - **Commit 1:** Add both `ghcr-pull-secret.yaml` files (homepage + flux-system) + add references to both kustomization.yaml `resources:` lists. Verify in cluster: `kubectl get secret ghcr-pull-credentials -n homepage` and `-n flux-system` both materialize within 1h (ESO `refreshInterval: 1h`; can force-trigger via `kubectl annotate externalsecret ... force-sync=$(date +%s)`).
  - **Commit 2:** Edit ImageRepository spec + kustomization.yaml images entry + deployment.yaml image + deployment.yaml imagePullSecrets. Push. Wait for Flux reconcile + observe Deployment rolls out cleanly.

  Rationale: bundling secret-create and image-rewire in one Flux reconcile cycle creates a race window — Flux may try to scan the new ImageRepository before the Secret materializes, generating a transient `secretRef not found` error. Two-commit cadence eliminates the race entirely; trades 5-15 min of wall-clock for zero error noise.

- **D-10 [--auto]:** Rollback path (if Flux can't pull from GHCR after Commit 2): manually `kubectl edit deployment hudsonfam -n homepage` and revert `image:` to `git.homelab/forgejo-admin/hudsonfam:20260417202843` + `imagePullSecrets[0].name` to `forgejo-registry-creds`. The Forgejo registry path STAYS ALIVE through Phase 26 (Phase 27 decommissions it) explicitly so this rollback works. Plan SUMMARY must call out: "Phase 27 is the first phase where this rollback path stops working — do not run Phase 27 until Phase 26 has been observably green for at least one Flux reconcile cycle."

### Verification

- **D-11 [--auto]:** Verification commands the executor runs after Commit 2 lands and Flux source reconciles:

  ```bash
  flux reconcile source git flux-system
  flux reconcile image repository hudsonfam -n flux-system
  flux reconcile image update homelab-images -n flux-system
  flux reconcile kustomization hudsonfam
  kubectl get imagerepository hudsonfam -n flux-system  # READY: True, latest tag = newest GHCR YYYYMMDDHHmmss
  kubectl get imagepolicy hudsonfam -n flux-system       # LATEST IMAGE: same newest tag
  kubectl describe deployment hudsonfam -n homepage      # imagePullSecrets: ghcr-pull-credentials; image: ghcr.io/hudsor01/...
  kubectl get pods -n homepage -l app=hudsonfam -w       # New pod pulls cleanly, becomes Ready, replaces old pod
  ```

  All 8 commands must produce expected output before Phase 26 is declared code-complete. This satisfies CICD-04 SC #1 (`Ready: True`), SC #2 (`LATEST IMAGE` = newest timestamp tag), SC #4 (deployment confirms image pull from `ghcr.io/hudsor01/hudsonfam`), and SC #5 (ImageUpdateAutomation commits to homelab-manifests-repo on each new tag — observable as a new commit in `homelab` repo authored by `Flux Image Automation`).

- **D-12 [--auto]:** First-build retroactive trigger (if no GHCR image exists at Phase 26 start, e.g., Phase 25 first build still pending observational verification): owner triggers a `workflow_dispatch` run on `.github/workflows/build-and-push.yml` from the GitHub Actions UI to ensure GHCR has at least one Phase-25-format image to watch. This is a precondition for Phase 26, NOT a Phase 26 task — but Phase 26 plan should explicitly call out the precondition check.

### Claude's Discretion

- File-path naming: `ghcr-pull-secret.yaml` vs `external-secret-ghcr.yaml` (cosmetic; default to `ghcr-pull-secret.yaml`)
- ExternalSecret `metadata.name` value: `ghcr-pull-credentials` (matches the target Secret name, simpler) vs `hudsonfam-ghcr-pull` (more namespace-context); default to `ghcr-pull-credentials` for both ExternalSecrets
- `refreshInterval` on the new ExternalSecrets: `1h` (matches existing `apps/hudsonfam/external-secret.yaml:11`) — no reason to deviate
- Whether to add a `labels:` block to the new ExternalSecrets — match the existing `app: hudsonfam` / `app.kubernetes.io/name: hudsonfam` / `app.kubernetes.io/component: secrets` triple from `external-secret.yaml:5-9` for the `homepage`-ns one; the `flux-system`-ns one needs different labels (e.g., `app.kubernetes.io/component: image-automation`) — Claude's call
- Whether to break the homelab PR into two separate PRs (one per commit per D-09) vs one PR with two commits — default to one PR, two commits (cleaner review, atomic rollback if needed)
- Exact `b64enc` template string formatting (single-quote vs double-quote, line breaks) — YAML/sprig conventions vary; follow ExternalSecrets official docs canonical example
- Whether to log a one-line note in `homelab/CLAUDE.md` documenting the new GHCR-watching ImageRepository — Claude's call (small ops note, low overhead); default to YES
- `timeout-minutes`-style fail-fast on the ESO sync (would require a Job/CronJob waiter pattern) — overkill for this phase; rely on `refreshInterval: 1h` + manual force-sync annotation if needed

### Folded Todos

None — `todo.match-phase 26` query deferred to planner's cross-reference step.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements and scope

- `.planning/REQUIREMENTS.md` — 3 Phase 26 REQs: CICD-04, CICD-05, CICD-06 (lines 19-21); v3.5 milestone framing in §`v3.5 Requirements`
- `.planning/ROADMAP.md` — Phase 26 entry (line 278-288) with 5 Success Criteria covering ImageRepository readiness, ImagePolicy regex, ExternalSecret pattern, Deployment imagePullSecret config, and ImageUpdateAutomation commit author

### Domain-level seeds and notes

- `.planning/seeds/SEED-005-cicd-hardening-migration.md` — full v3.5 milestone rationale; Phase 26 = v3.5-P2 of the 4-phase plan; §`Risks + mitigations` has the GHCR rate-limit, PAT-expiration, breaking-change-mid-rewire risk register that informs D-09 + D-10
- `.planning/notes/ci-cd-fragility-analysis.md` — investigation that triggered the migration; §`Phase v3.5-P2 — Flux reconfiguration` line 190-199 has the original phase outline (largely matches this CONTEXT, with one delta: SEED draft suggested deleting `default/imagerepository/hudsonfam` in P2; this CONTEXT defers that to Phase 27 to keep blast radius tight)

### Phase 25 carry-forward (immediate predecessor)

- `.planning/phases/25-pipeline-build/25-CONTEXT.md` — Phase 25 decision register; relevant carry-forwards: D-03 timestamp format `YYYYMMDDHHmmss UTC`, D-04 two-tag emission (`<timestamp>` + `latest`), D-05 GHCR namespace `ghcr.io/hudsor01/hudsonfam`. Phase 26 ImagePolicy regex `^\d{14}$` and ImageRepository `spec.image` value depend on these exact values.
- `.planning/phases/25-pipeline-build/25-01-SUMMARY.md` §`Phase 26 Handoff Note` (line 92-100) — owner browser check for GHCR package visibility + `gh api` command for automated check (executor `gh` CLI is unauthenticated locally; browser is the path)
- `.planning/phases/25-pipeline-build/25-01-SUMMARY.md` §`Open Items for Phase 26` (line 102-107) — explicit Phase 26 scope handoff list: GHCR pull PAT via ExternalSecret, ImageRepository + ImagePolicy rewire, ImageUpdateAutomation reconcile verification

### Existing files this phase reads or modifies (in `/home/dev-server/homelab/`)

**Modified by Phase 26:**
- `homelab/clusters/homelab/image-automation/image-repositories.yaml` — lines 162-170 (the `hudsonfam` ImageRepository block); spec.image, spec.insecure (REMOVE), spec.secretRef.name flips
- `homelab/clusters/homelab/image-automation/kustomization.yaml` — add new ExternalSecret file to `resources:` list
- `homelab/apps/hudsonfam/kustomization.yaml` — lines 11-13 (`images:` block); name + setter-comment-anchored newTag
- `homelab/apps/hudsonfam/deployment.yaml` — line 36 (`image:`) + line 128 (`imagePullSecrets[0].name`)

**Read-only (referenced for context):**
- `homelab/clusters/homelab/image-automation/image-policies.yaml` lines 257-266 — confirms ImagePolicy regex already correct; NO edits this phase
- `homelab/clusters/homelab/image-automation/image-update-automation.yaml` — confirms ImageUpdateAutomation already wired to `apps/`; NO edits this phase
- `homelab/apps/hudsonfam/external-secret.yaml` — pattern reference for the new ExternalSecrets (same `secretStoreRef.name: kubernetes-secrets` ClusterSecretStore)

**Created by Phase 26 (NEW files in `/home/dev-server/homelab/`):**
- `homelab/apps/hudsonfam/ghcr-pull-secret.yaml` — ExternalSecret in `homepage` namespace
- `homelab/clusters/homelab/image-automation/ghcr-pull-secret.yaml` — ExternalSecret in `flux-system` namespace

### External documentation

- ExternalSecrets Operator v1 docs — `spec.target.template` semantics + sprig templating (`b64enc`, `printf`) for dockerconfigjson reconstruction: <https://external-secrets.io/latest/guides/templating/>
- Flux ImageRepository spec docs — `spec.secretRef` semantics + same-namespace requirement: <https://fluxcd.io/flux/components/image/imagerepositories/>
- GitHub Actions docs — fine-grained PAT scope `Packages: Read` + 1-year max expiry: <https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens>
- GitHub Container Registry docs — pulling private packages with PAT auth: <https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry>

### Prior phase context (carry-forward beyond Phase 25)

- v3.0 phases (20-24) are orthogonal — Phase 26 makes ZERO app-code edits in the `hudsonfam` repo. The hudsonfam repo CONTEXT files are NOT referenced by Phase 26.
- `.planning/PROJECT.md` §`Key Decisions` line 67 — `Flux image tags use YYYYMMDDHHmmss timestamps` (project-wide convention; Phase 26 preserves it)
- `CLAUDE.md` §`Deployment` (in hudsonfam repo) — describes the target end-state; Phase 26 implements the second arrow of the `Push to main → GitHub Actions → GHCR → Flux → K3s` chain. CLAUDE.md text rewrite is deferred to Phase 28 (CICD-11).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- **Existing `apps/hudsonfam/external-secret.yaml`** — copy-paste template for both new ExternalSecrets. Same `apiVersion: external-secrets.io/v1`, `secretStoreRef.name: kubernetes-secrets, kind: ClusterSecretStore`, `refreshInterval: 1h`, `target.creationPolicy: Owner` pattern. Diffs: `spec.target.type: kubernetes.io/dockerconfigjson` (instead of default Opaque), and `spec.target.template` block to reconstruct dockerconfigjson from raw username/PAT vault entries.
- **Existing ImageRepository at `image-repositories.yaml:162-170`** — same shape as 20+ other ImageRepository entries in the file; mutate-in-place is the lowest-risk option. Other GHCR entries (`recyclarr` line 156, `seerr` line ~180) use anonymous scan (no `secretRef`); Phase 26 hudsonfam ImageRepository becomes the FIRST authenticated GHCR scan in this file — pattern is new but trivially derived from the existing `forgejo-admin/hudsonfam` block (which already used `secretRef`, just for a self-hosted registry).
- **Existing setter-comment plumbing** — `apps/hudsonfam/kustomization.yaml:13` and `apps/hudsonfam/deployment.yaml:36` already have `# {"$imagepolicy": "flux-system:hudsonfam"}` style annotations. ImageUpdateAutomation `update.strategy: Setters` (`image-update-automation.yaml:27`) already scans `./apps` for these. Phase 26 preserves them verbatim — only the image *name* changes; the setter contract is untouched.

### Established Patterns

- **ExternalSecret + ClusterSecretStore = canonical secret-injection path** — `external-secret.yaml:13` proves the existing app-secrets pattern; Phase 26 reuses it for the GHCR pull credential. Zero new infrastructure introduced.
- **`metadata.name: hudsonfam` is the canonical resource identifier across Flux** — `image-repositories.yaml:164`, `image-policies.yaml:258`, `kustomization.yaml:13` setter comment, `deployment.yaml:36` setter comment. Mutate-in-place (D-05) preserves this identifier and avoids cascading rename edits.
- **`interval: 6h` ImageRepository scan cadence** — every other ImageRepository in `image-repositories.yaml` uses this value. Phase 26 keeps it for consistency.
- **`# {"$imagepolicy": "<ns>:<name>:<field>"}` setter-comment grammar** — established by Flux ImageUpdateAutomation Setters strategy. The existing comments at `kustomization.yaml:13` (`{"$imagepolicy": "flux-system:hudsonfam:tag"}`) and `deployment.yaml:36` (`{"$imagepolicy": "flux-system:hudsonfam"}`) are already correct — Phase 26 makes ZERO edits to these comments.

### Integration Points

- **Vault (`kubernetes-secrets` ClusterSecretStore)** — Phase 26 introduces ONE new vault key (`ghcr-pull-credentials`) with two properties (`username`, `pat`). Owner-only out-of-band step before homelab PR merges; documented in plan SUMMARY as a precondition checklist item.
- **GitHub Actions (Phase 25)** — Phase 26 is downstream; relies on Phase 25 producing at least one valid GHCR tag matching `^\d{14}$`. D-12 documents the precondition check + workflow_dispatch fallback.
- **K3s cluster (homepage namespace, flux-system namespace)** — both namespaces already exist; both already have ESO operator + Flux source-controller running. Zero cluster prerequisites beyond what's already operational. The Phase 26 file edits, once committed and reconciled by Flux, materialize new Secrets + reconfigure existing ImageRepository + roll the Deployment — no operator install, no CRD upgrade, no namespace creation.
- **Forgejo container registry (`git.homelab/forgejo-admin/hudsonfam`)** — Phase 26 STOPS using it but does NOT delete it. Stays alive as the rollback path until Phase 27. The `forgejo-registry-creds` Secret (if it exists in the cluster) similarly stays put through Phase 26 — Phase 27 cleanup.

</code_context>

<specifics>
## Specific Ideas

- **Two ExternalSecrets > Reflector** — The "two ExternalSecrets pointing at the same vault key" pattern (D-04) is more explicit than installing a Reflector/Replicator operator just to mirror one Secret across two namespaces. ESO's `refreshInterval: 1h` already handles rotation — both Secrets re-sync from vault independently within the same window. Trade: 6 extra YAML lines for a cleaner dependency graph.
- **Why `^\d{14}$` not SHA tags** — Phase 25 D-04 explicitly emits `YYYYMMDDHHmmss` + `latest`, no SHA tag. The existing ImagePolicy regex was already `^\d{14}$` (it predates this milestone — set when the Forgejo + Woodpecker pipeline was first wired). Pure coincidence that the regex still works post-migration; documented explicitly in D-06 to avoid the next maintainer "fixing" it to a SHA pattern.
- **Why mutate ImageRepository in place vs replace** — `metadata.name: hudsonfam` is referenced in 4 places (ImagePolicy.spec.imageRepositoryRef.name, two setter-comment `{"$imagepolicy": "flux-system:hudsonfam[:tag]"}` annotations, and the kustomization.images entry name match). Renaming would require synchronized edits across all 4 — pure churn for zero behavioral benefit. Mutate-in-place is the least-edit path.
- **Why `insecure: true` removal matters** — The existing block has `insecure: true` because Forgejo's container registry served self-signed certs. GHCR has valid CA-signed TLS, so `insecure: true` is unnecessary AND would represent a small security regression to leave in. Removing it forces strict TLS verification — defensible default.
- **PAT scope choice (fine-grained, repo-scoped, `Packages: Read`)** — The minimum-privilege PAT can ONLY pull from `ghcr.io/hudsor01/hudsonfam`. Cannot pull from any other hudsor01 package, cannot push (no `Packages: Write`), cannot read repo contents. If the PAT leaks, blast radius = "anyone can pull our public-or-private container image" — for a personal-project image, that's near-zero owner harm.
- **Why two commits not one (D-09)** — Single-commit ESO+ImageRepository rewire creates a 1-30s race window where Flux source-controller reconciles the ImageRepository spec change and tries to scan GHCR before ESO has materialized the Secret in `flux-system`. Result: `secretRef "ghcr-pull-credentials" not found` event, ImageRepository goes `Ready: False`, then auto-recovers within `refreshInterval: 1h` once ESO syncs. Two-commit cadence eliminates the false-positive error condition entirely. Cost: 5-15 min wall-clock between commits to verify Secrets materialize. Worth it for clean cluster-event log.
- **Why Forgejo path stays alive through Phase 26 (D-10 rollback)** — Phase 27 explicitly removes the Forgejo+Woodpecker pipeline (CICD-07/08/09). If Phase 26 ships and Flux can't pull from GHCR (e.g., PAT typo, GHCR rate limit, network policy), the rollback path is `kubectl edit deployment` to revert image+pullSecret. That rollback ONLY works while Forgejo registry + secret still exist. Phase 27 ordering enforces "verify Phase 26 green for ≥1 reconcile cycle, then run Phase 27" — the SUMMARY captures this gating discipline.
- **CLAUDE.md update is Phase 28, not Phase 26** — CICD-11 explicitly bundles the docs rewrite with the end-to-end smoke test. Doing it in Phase 26 would be premature (the docs would describe the new pipeline before it's been smoke-tested end-to-end). Per ROADMAP.

</specifics>

<deferred>
## Deferred Ideas

- **Delete broken `default/imagerepository/hudsonfam`** — Phase 27 (CICD-07); Phase 26 leaves it in place to keep blast radius tight
- **Remove `.woodpecker.yaml` + Woodpecker repo deregistration** — Phase 27 (CICD-08)
- **Cleanup `git.homelab/forgejo-admin/hudsonfam` registry entries** — Phase 27 (CICD-09); also serves as Phase 26 rollback safety net per D-10
- **Removing `forgejo-registry-creds` Secret resource** — Phase 27 cleanup; Phase 26 only de-references it (changes `imagePullSecrets[0].name`)
- **End-to-end no-op-commit smoke test** — Phase 28 (CICD-10)
- **CLAUDE.md §Deployment rewrite** — Phase 28 (CICD-11) — must NOT happen in Phase 26 to avoid documenting an unverified pipeline
- **Retroactive UAT for Phases 21/22/23/24** — Phase 28 (CICD-12, CICD-13)
- **Multi-namespace pull-secret reflection (Reflector / Replicator operator)** — out of scope; D-04 chose two ExternalSecrets explicitly to avoid introducing a new operator
- **Image signing verification (cosign / sigstore)** — Phase 25 deferred-list carry-forward; post-v3.5 backlog
- **Calendar-reminder automation for PAT expiry** — owner ops responsibility; could be a future automation phase but not in v3.5 scope
- **GitHub App-based auth as PAT alternative** — D-01 chose fine-grained PAT for setup simplicity; GitHub App offers no-rotation but adds significant first-time setup; revisit if PAT rotation becomes operational pain
- **Automated rollback on health-check failure** — `CICD-FUTURE-02`; explicit v3.5 deferral
- **Per-commit-SHA tags alongside timestamp** — `CICD-FUTURE-03`; Phase 25 + 26 both keep tag space minimal
- **Switching all other GHCR ImageRepositories (`recyclarr`, `seerr`) to authenticated scan** — out of scope; their failures are a different root cause (`cache.homelab` TLS issue per `ci-cd-fragility-analysis.md` Finding 5); separate homelab-infra phase

</deferred>

---

*Phase: 26-flux-reconfiguration*
*Context gathered: 2026-04-23 (auto mode — 12 decisions locked using existing homelab-repo Flux patterns + ExternalSecrets v1 templating canonical form + Phase 25 D-03/D-04 carry-forward of YYYYMMDDHHmmss tag format)*
</content>
</invoke>