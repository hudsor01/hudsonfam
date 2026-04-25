# Phase 26: Flux Reconfiguration (v3.5-P2) — Research

**Researched:** 2026-04-23
**Domain:** Flux CD ImageRepository reconfiguration + ExternalSecrets-templated dockerconfigjson + GHCR pull authentication (DevOps / GitOps)
**Confidence:** HIGH — every CONTEXT.md decision is tractable with one exception (D-01 fine-grained PAT) which is **flagged for planner re-evaluation** based on official-doc evidence

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions (D-01..D-12, copy verbatim)

- **D-01:** Provision a single GitHub fine-grained PAT with scope `Packages: Read` (read-only), repository scope = `hudsor01/hudsonfam` only, 1-year expiry, owner = `hudsor01`. Store in vault under key `ghcr-pull-credentials` with two properties: `username: hudsor01` and `pat: <fine-grained PAT value>`.
  - **RESEARCH-FLAG (see Risk R-01 below):** GitHub's official docs state "GitHub Packages only supports authentication using a personal access token (classic)." Fine-grained PAT support for `ghcr.io` pull is documented as **not officially supported** as of 2026-04. The vault-key shape and ExternalSecret template are unaffected; only the PAT type changes (classic with `read:packages` scope vs fine-grained with `Packages: Read`). Planner must decide before owner generates the token.
- **D-02:** PAT goes through the existing `kubernetes-secrets` ClusterSecretStore (same one referenced by `apps/hudsonfam/external-secret.yaml:13`). NO new ClusterSecretStore introduced.
- **D-03:** ExternalSecret uses ExternalSecrets v1 `spec.target.template` to reconstruct `kubernetes.io/dockerconfigjson` from `username` + `pat` raw fields. Sprig `b64enc` + `printf` build the auth string at sync time.
- **D-04:** Two ExternalSecrets, both pointing at vault key `ghcr-pull-credentials`: one materializing Secret `ghcr-pull-credentials` in `homepage` ns (kubelet pull); one in `flux-system` ns (ImageRepository scan auth).
- **D-05:** Mutate existing `clusters/homelab/image-automation/image-repositories.yaml:162-170` block in place. `metadata.name: hudsonfam` UNCHANGED (preserves ImagePolicy linkage). `spec.image` flips to `ghcr.io/hudsor01/hudsonfam`. `spec.insecure: true` REMOVED. `spec.secretRef.name` flips to `ghcr-pull-credentials`. `spec.interval: 6h` UNCHANGED.
- **D-06:** ZERO edits to `image-policies.yaml` (regex `^\d{14}$` already matches Phase 25 emission format). ZERO edits to `image-update-automation.yaml` (`update.path: ./apps` + `strategy: Setters` already covers `apps/hudsonfam/`).
- **D-07:** Edit `apps/hudsonfam/kustomization.yaml:11-13`. `images[0].name` → `ghcr.io/hudsor01/hudsonfam`. `newTag:` set to current latest YYYYMMDDHHmmss tag visible in GHCR (or fallback `20260408173607` if no Phase-25 build yet). Setter comment UNCHANGED.
- **D-08:** Edit `apps/hudsonfam/deployment.yaml:36` `image:` → `ghcr.io/hudsor01/hudsonfam:<initial-tag>` (same as D-07). Setter comment UNCHANGED. Edit `apps/hudsonfam/deployment.yaml:128` `imagePullSecrets[0].name` → `ghcr-pull-credentials`.
- **D-09:** Sequential two-commit PR strategy. Commit 1 = both ExternalSecrets + kustomization additions. Verify both Secrets materialize. Commit 2 = ImageRepository rewire + kustomization image swap + deployment image+pullSecret swap.
- **D-10:** Rollback path: `kubectl edit deployment hudsonfam -n homepage` revert image to `git.homelab/forgejo-admin/hudsonfam:20260417202843` + imagePullSecrets to `forgejo-registry-creds`. Forgejo registry STAYS ALIVE through Phase 26.
- **D-11:** Verification = 8 commands listed in CONTEXT.md (flux reconcile + kubectl get/describe sequence).
- **D-12:** First-build retroactive trigger via `workflow_dispatch` if no GHCR image exists at Phase 26 start. PRECONDITION CHECK, NOT a Phase 26 task.

### Claude's Discretion

- File-path naming: default `ghcr-pull-secret.yaml`
- ExternalSecret `metadata.name`: default `ghcr-pull-credentials` for both
- `refreshInterval`: `1h` (matches existing pattern)
- Labels: match `external-secret.yaml:5-9` triple for homepage-ns ESO; use `app.kubernetes.io/component: image-automation` for flux-system-ns ESO
- One PR with two commits vs two PRs: default one PR with two commits
- `b64enc` template formatting (single vs double quote): follow ESO docs canonical example (single-quoted YAML scalar around the JSON template body to avoid double-escaping)
- One-line ops note in `homelab/CLAUDE.md` for the new GHCR-watching ImageRepository: default YES

### Deferred Ideas (OUT OF SCOPE)

- Delete broken `default/imagerepository/hudsonfam` → Phase 27 (CICD-07)
- Remove `.woodpecker.yaml` + Woodpecker repo deregistration → Phase 27 (CICD-08)
- Cleanup `git.homelab/forgejo-admin/hudsonfam` registry entries → Phase 27 (CICD-09)
- Delete `forgejo-registry-creds` Secret → Phase 27
- End-to-end smoke test → Phase 28 (CICD-10)
- CLAUDE.md (hudsonfam repo) §Deployment rewrite → Phase 28 (CICD-11)
- Retroactive UAT → Phase 28 (CICD-12, CICD-13)
- Multi-namespace pull-secret reflection (Reflector/Replicator)
- Image signing (cosign / sigstore)
- Per-commit-SHA tags
- Switching `recyclarr`/`seerr` ImageRepositories to authenticated GHCR (separate root cause)
- New ClusterSecretStore introduction
- Calendar-reminder automation for PAT expiry

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CICD-04 | `imagerepository/hudsonfam` (in correct Flux namespace, not `default`) watches `ghcr.io/hudsor01/hudsonfam` and reconciles successfully | Mutate-in-place edit (D-05); Flux docs confirm `secretRef` must be in same namespace as ImageRepository (Finding §2); engineVersion v2 templating produces compatible Secret shape (Finding §1); 8-command verification recipe (D-11 + Validation Architecture §V-3) |
| CICD-05 | GHCR pull secret provisioned via ExternalSecret + ClusterSecretStore pattern; no PAT in git | Two-ExternalSecret pattern (D-04) using existing `kubernetes-secrets` ClusterSecretStore; canonical dockerconfigjson template extracted from official ESO docs (Finding §1); homepage-ns + flux-system-ns secrets verified materialized via `kubectl get secret ... -o jsonpath='{.type}'` (Validation Architecture §V-2) |
| CICD-06 | `imagepolicy/hudsonfam` filters YYYYMMDDHHmmss tag stream and picks newest; `imageupdateautomation` updates Deployment manifest in homelab manifests repo | ZERO edits to imagepolicy or imageupdateautomation (D-06); existing regex `^\d{14}$` matches Phase 25 emission (Finding §3); existing `update.path: ./apps strategy: Setters` already covers `apps/hudsonfam/`; setter-comment grammar verified per Flux docs (Finding §3) |

</phase_requirements>

## Project Constraints (from CLAUDE.md)

- All edits land in **`/home/dev-server/homelab/`**, NOT `/home/dev-server/hudsonfam/`. Working-directory switch required.
- All cluster changes go via git (Flux GitOps). Never `kubectl apply` directly. (`kubectl edit` is reserved for the rollback recipe in D-10 only.)
- `homelab` repo only has a Forgejo remote (`ssh://git@192.168.4.236:30022/dev-projects/homelab.git`); Flux source-controller polls this Forgejo URL every 1 minute (`gotk-sync.yaml:10`). Pushing to Forgejo IS the trigger for Flux reconcile.
- ExternalSecrets Operator running version: **2.1.0** (per `homelab/CLAUDE.md` line 55, `external-secrets` namespace). Confirms apiVersion `external-secrets.io/v1` is GA and template engineVersion v2 is the default.
- No GitHub remote on the homelab repo means GitHub Actions or PR-based workflows are NOT available there — commits land directly on `forgejo/main`.

## Summary

Phase 26 is a small, well-defined infrastructure phase with 12 locked decisions and a single design twist: the work crosses out of `/home/dev-server/hudsonfam/` into `/home/dev-server/homelab/` (the Flux-watched manifests repo). Six file-system mutations land in 2 sequenced commits on the homelab repo's `main` branch, pushed to its Forgejo remote (the only remote configured); from there, Flux source-controller picks up changes within 1 minute and reconciles within ~5 minutes. The phase introduces the **first authenticated GHCR ImageRepository** in the homelab repo and the **first ExternalSecret-templated dockerconfigjson** Secret (no prior example in the codebase — pre-existing `forgejo-registry-creds` was created imperatively via `kubectl create secret docker-registry`, not declaratively).

Research surfaced ONE high-impact deviation from CONTEXT.md and several plumbing-detail confirmations:

- **HIGH-IMPACT FLAG (R-01):** GitHub's official documentation explicitly states "GitHub Packages only supports authentication using a personal access token (classic)." Fine-grained PATs (D-01) for `ghcr.io` pull are documented as not officially supported and reported failing inconsistently in community discussions through 2026. Recommendation: planner converts D-01 to **classic PAT with `read:packages` scope** (still least-privilege; minor blast-radius increase since classic PATs cannot scope-limit to a single package). Vault-key shape, ExternalSecret template, and all downstream mechanics are UNCHANGED — only the type of token the owner generates differs.
- **CONFIRMED:** ExternalSecrets `apiVersion: external-secrets.io/v1` defaults to template **engineVersion v2** which provides full sprig (`b64enc`, `printf`, `lower`, etc.). The D-03 template body works as written.
- **CONFIRMED:** Flux ImageRepository's `spec.secretRef` requires a Secret of type `kubernetes.io/dockerconfigjson` in the same namespace as the ImageRepository. The two-ExternalSecret strategy (D-04) is correct and necessary; cross-namespace Secret refs are not supported.
- **CONFIRMED:** `spec.insecure: true` is for HTTP-only registries (Forgejo's self-signed cert was the legacy reason). Removal for GHCR is correct and safer.
- **CONFIRMED:** Setter-comment grammar `# {"$imagepolicy": "flux-system:hudsonfam"}` (basic, no field suffix) is correct for the Deployment image line; `# {"$imagepolicy": "flux-system:hudsonfam:tag"}` (with `:tag` suffix) is correct for the kustomization `newTag:` field. Both existing comments are correct and need NO edits.

**Primary recommendation:** Proceed with the CONTEXT.md plan exactly as written, with ONE adjustment: convert D-01 from fine-grained PAT to classic PAT (`read:packages`) before owner generates the token. Everything else lines up cleanly with established patterns + official docs.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| GHCR PAT storage at rest | Vault (kubernetes-secrets ClusterSecretStore-backed) | — | Established homelab secret-handling pattern; no PAT in git |
| Secret materialization in `homepage` ns (kubelet pull) | ExternalSecrets Operator (homepage-ns ExternalSecret) | — | Kubelet requires `imagePullSecrets` to reference a Secret in the Deployment's namespace |
| Secret materialization in `flux-system` ns (Flux scan) | ExternalSecrets Operator (flux-system-ns ExternalSecret) | — | Flux's `ImageRepository.spec.secretRef` requires same-namespace Secret (verified Finding §2) |
| Registry tag scanning | Flux image-reflector-controller (ImageRepository) | — | The component built for this; no alternative |
| Tag selection (newest YYYYMMDDHHmmss) | Flux image-reflector-controller (ImagePolicy) | — | Existing regex + numerical asc policy already correct (Finding §3) |
| Manifest tag rewrite | Flux image-automation-controller (ImageUpdateAutomation) | — | Setters strategy already wired for `./apps` (D-06) |
| Pod image pull | K3s kubelet | containerd | Standard K8s image-pull flow |
| Rollback to Forgejo registry | Owner (`kubectl edit deployment`) | — | Imperative emergency path; only invoked on Flux failure (D-10) |

## Standard Stack

### Core (already in cluster — Phase 26 introduces no new operators)

| Component | Version | Purpose | Why Standard |
|-----------|---------|---------|--------------|
| External Secrets Operator | 2.1.0 (per homelab/CLAUDE.md:55) | Sync from `kubernetes-secrets` ClusterSecretStore → Kubernetes Secrets | Existing canonical secret-injection path in homelab; zero-new-infra reuse |
| Flux image-reflector-controller | (homelab cluster Flux install) | Scans ImageRepositories, evaluates ImagePolicies | Already managing 20+ ImageRepositories per `image-repositories.yaml` |
| Flux image-automation-controller | (homelab cluster Flux install) | Rewrites manifest tags via Setters strategy | Existing `homelab-images` ImageUpdateAutomation already wired for `./apps` |
| Flux source-controller | (homelab cluster Flux install) | Polls Forgejo `homelab.git` every 1 min, applies Kustomizations | Existing flux-system GitRepository |
| GitHub Container Registry (ghcr.io) | N/A (vendor service) | Image hosting; CA-signed TLS (no `insecure: true` needed) | Phase 25 emits to it; v3.5 milestone target |

### Supporting

| Component | Version | Purpose | When to Use |
|-----------|---------|---------|-------------|
| `gh` CLI | (host-installed; unauthenticated locally per Phase 25 SUMMARY) | GHCR package metadata queries | Owner-only browser/host path; executor cannot use |
| `flux` CLI | (host-installed) | `flux reconcile` / `flux get image` verification | All 8 D-11 verification commands |
| `kubectl` | (host-installed) | Secret materialization checks, rollback recipe | All `kubectl get/describe/edit` commands in D-11 + D-10 |

### Alternatives Considered

| Instead of | Could Use | Tradeoff | Decision |
|-----------|-----------|----------|----------|
| Two ExternalSecrets (D-04) | Reflector or kubernetes-replicator operator | Auto-mirror one Secret across namespaces | REJECTED in CONTEXT.md — adds new operator; two ESOs is 6 extra YAML lines for cleaner dependency graph |
| ExternalSecret-templated dockerconfigjson (D-03) | Imperative `kubectl create secret docker-registry` (the existing `forgejo-registry-creds` pattern) | Simpler one-liner | REJECTED implicitly — violates "no PAT in git, all secrets via ExternalSecrets" pattern (CICD-05 SC #3); imperative path leaves PAT in shell history |
| Pre-encoded `.dockerconfigjson` blob in vault | Two raw fields (`username`, `pat`) + template reconstruction (D-03) | One vault key, no template needed | REJECTED in CONTEXT.md — independently rotatable fields; avoids brittle "paste base64-of-base64-encoded-JSON" pattern |
| Fine-grained PAT (D-01 as written) | Classic PAT with `read:packages` scope | Fine-grained allows per-package scope; classic is broader | RESEARCH-RECOMMENDS classic — official docs say fine-grained not supported for GHCR (R-01) |
| GitHub App auth | PAT (D-01) | No expiry, no rotation; smaller blast radius | REJECTED in CONTEXT.md `<deferred>` — significant first-time setup; revisit if PAT rotation becomes pain |
| Flux `provider: github` | Flux `provider: generic` (default) with secretRef | Native auth; no PAT needed for some providers | NOT APPLICABLE — `provider: github` doesn't exist; only `aws`/`azure`/`gcp`/`generic`. GHCR uses `generic` |

**Installation:** Zero new installations. All operators are pre-existing.

**Version verification:** ESO version (2.1.0) verified from `/home/dev-server/homelab/CLAUDE.md` line 55. Flux version not explicitly logged; ImageRepository uses `image.toolkit.fluxcd.io/v1beta2` and ImageUpdateAutomation uses the same group — confirms a recent enough Flux install (v2.x) where Setters strategy is GA.

## Architecture Patterns

### System Architecture Diagram

```
                                                      [Owner browser/host]
                                                              │
                                                              │ (out-of-band)
                                                              ▼
                                                ┌──────────────────────┐
                                                │ Generate GHCR PAT    │
                                                │ (CLASSIC, read:pkgs) │
                                                └──────────┬───────────┘
                                                           │ (out-of-band)
                                                           ▼
                                                ┌──────────────────────┐
                                                │ kubernetes-secrets   │
                                                │ ClusterSecretStore   │
                                                │ key:                 │
                                                │ ghcr-pull-credentials│
                                                │ ├─ username          │
                                                │ └─ pat               │
                                                └──────────┬───────────┘
                                                           │ refreshInterval: 1h
                                                           │ (or force-sync via annotation)
                       ┌───────────────────────────────────┴──────────────────────────────────┐
                       │                                                                       │
                       ▼                                                                       ▼
        ┌──────────────────────────────┐                                  ┌──────────────────────────────┐
        │ ExternalSecret               │                                  │ ExternalSecret               │
        │ ns: homepage                 │                                  │ ns: flux-system              │
        │ template engineVersion: v2   │                                  │ template engineVersion: v2   │
        │ (sprig: b64enc + printf)     │                                  │ (sprig: b64enc + printf)     │
        └──────────────┬───────────────┘                                  └──────────────┬───────────────┘
                       │                                                                  │
                       ▼                                                                  ▼
        ┌──────────────────────────────┐                                  ┌──────────────────────────────┐
        │ Secret ghcr-pull-credentials │                                  │ Secret ghcr-pull-credentials │
        │ type: dockerconfigjson       │                                  │ type: dockerconfigjson       │
        │ ns: homepage                 │                                  │ ns: flux-system              │
        └──────────────┬───────────────┘                                  └──────────────┬───────────────┘
                       │                                                                  │
                       │ imagePullSecrets[0].name                                         │ spec.secretRef.name
                       ▼                                                                  ▼
        ┌──────────────────────────────┐                                  ┌──────────────────────────────┐
        │ Deployment hudsonfam         │                                  │ ImageRepository hudsonfam    │
        │ ns: homepage                 │                                  │ ns: flux-system              │
        │ image: ghcr.io/hudsor01/...  │ ◀────────── Setters rewrite ─────│ image: ghcr.io/hudsor01/...  │
        │ # {"$imagepolicy":"…"}       │             (image-automation-   │ interval: 6h                 │
        └──────────────┬───────────────┘             controller)          └──────────────┬───────────────┘
                       │                                                                  │
                       │ pulls from ghcr.io                                               │ scans ghcr.io
                       │ (using PAT from Secret)                                          │ (using PAT from Secret)
                       ▼                                                                  ▼
        ┌──────────────────────────────────────────────────────────────────────────────────┐
        │                       ghcr.io/hudsor01/hudsonfam                                 │
        │       Tags: <YYYYMMDDHHmmss> + latest (emitted by Phase 25 GitHub Action)        │
        └──────────────────────────────────────────────────────────────────────────────────┘
                                           ▲
                                           │ tag selected by:
                                           │ ImagePolicy regex ^\d{14}$, numerical asc
                                           │ (no edits this phase — already configured)
                                           │
        ┌──────────────────────────────────────────────────────────────────────────────────┐
        │                    ImagePolicy hudsonfam (flux-system)                           │
        │                    ImageUpdateAutomation homelab-images (flux-system)            │
        │                    Setter comments at apps/hudsonfam/{deployment,kustomization}  │
        │                    NO EDITS THIS PHASE                                           │
        └──────────────────────────────────────────────────────────────────────────────────┘
```

### Recommended Project Structure (file edits in `/home/dev-server/homelab/`)

```
homelab/
├── apps/hudsonfam/
│   ├── ghcr-pull-secret.yaml          # NEW — homepage-ns ExternalSecret
│   ├── kustomization.yaml             # MOD — add ghcr-pull-secret.yaml to resources; flip images[0].name
│   ├── deployment.yaml                # MOD — flip image: + imagePullSecrets[0].name
│   ├── external-secret.yaml           # READ-ONLY (template reference)
│   └── (others unchanged)
└── clusters/homelab/image-automation/
    ├── ghcr-pull-secret.yaml          # NEW — flux-system-ns ExternalSecret
    ├── kustomization.yaml             # MOD — add ghcr-pull-secret.yaml to resources
    ├── image-repositories.yaml        # MOD — mutate the hudsonfam block (lines 162-170)
    ├── image-policies.yaml            # READ-ONLY (D-06)
    └── image-update-automation.yaml   # READ-ONLY (D-06)
```

### Pattern 1: ExternalSecret-templated dockerconfigjson

**What:** ExternalSecret pulls two raw fields (`username`, `pat`) from vault and uses sprig templating to construct a `kubernetes.io/dockerconfigjson`-typed Kubernetes Secret with the right `auths` structure.

**When to use:** Any time you need a registry-pull Secret managed declaratively in git without committing the PAT itself.

**Example (canonical, derived from ESO docs at <https://external-secrets.io/latest/guides/common-k8s-secret-types/>):**

```yaml
# Source: https://external-secrets.io/latest/guides/common-k8s-secret-types/
apiVersion: external-secrets.io/v1
kind: ExternalSecret
metadata:
  name: ghcr-pull-credentials
  namespace: homepage          # OR flux-system, depending on consumer
  labels:
    app: hudsonfam
    app.kubernetes.io/name: hudsonfam
    app.kubernetes.io/component: secrets   # OR image-automation for flux-system-ns
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: kubernetes-secrets
    kind: ClusterSecretStore
  target:
    name: ghcr-pull-credentials
    creationPolicy: Owner
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

**Notes on the template body:**
- The `.dockerconfigjson` key (with leading dot) is the canonical key kubelet + Flux both look for inside a `kubernetes.io/dockerconfigjson` Secret.
- The literal string `ghcr.io` (NOT a templated variable) is the registry host. Hardcoded because it never changes for this Secret's purpose.
- `{{ .username }}` and `{{ .pat }}` reference the `secretKey` names declared in `spec.data` (not the vault property names).
- `printf "%s:%s" .username .pat | b64enc` produces the standard `username:password` base64-encoded auth string per the Docker config spec.
- Engine v2 (default for `apiVersion: external-secrets.io/v1`) supports all sprig functions including `b64enc` and `printf` — verified via official ESO docs.

### Pattern 2: Mutate-in-place ImageRepository edit

**What:** Edit the existing ImageRepository block instead of deleting + recreating with a new name. Preserves the canonical `metadata.name: hudsonfam` referenced by the ImagePolicy and all setter comments.

**When to use:** Any time the consumer chain (ImagePolicy → Setters → kustomization → Deployment) is already correctly wired and only the underlying registry endpoint changes.

**Example diff (lines 162-170 of `clusters/homelab/image-automation/image-repositories.yaml`):**

```yaml
# Before (current state):
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageRepository
metadata:
  name: hudsonfam
spec:
  image: git.homelab/forgejo-admin/hudsonfam   # CHANGE
  interval: 6h                                 # KEEP
  insecure: true                               # REMOVE
  secretRef:
    name: forgejo-registry-creds               # CHANGE

# After (Phase 26):
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageRepository
metadata:
  name: hudsonfam                              # UNCHANGED — preserves all downstream refs
spec:
  image: ghcr.io/hudsor01/hudsonfam            # FLIPPED
  interval: 6h                                 # UNCHANGED
  secretRef:
    name: ghcr-pull-credentials                # FLIPPED
  # NOTE: spec.insecure REMOVED — GHCR uses CA-signed TLS
```

### Pattern 3: Setter-comment-anchored Kustomize image rewrite

**What:** The kustomize `images:` block + Deployment `image:` field both carry `# {"$imagepolicy": "flux-system:hudsonfam[:tag]"}` setter comments. ImageUpdateAutomation rewrites the value at the marked positions on each scan.

**When to use:** Any time you want Flux to keep the rendered manifest's image tag in sync with the latest ImagePolicy selection without manual intervention.

**Setter-comment grammar (verified from <https://fluxcd.io/flux/components/image/imageupdateautomations/>):**
- **Basic form** `# {"$imagepolicy": "flux-system:hudsonfam"}` — for Deployment lines where the entire `image:` value (including tag) is on one line. Flux rewrites the whole image+tag.
- **Field-suffix form** `# {"$imagepolicy": "flux-system:hudsonfam:tag"}` — for Helm/kustomize values where the image components are split. The suffix specifies which field (`tag`, `name`, `digest`) Flux should rewrite. Used in `apps/hudsonfam/kustomization.yaml:13` because `newTag:` is just the tag portion.

Both existing comments are correct as-written and need ZERO edits this phase (D-06).

### Anti-Patterns to Avoid

- **Cross-namespace `secretRef`:** Flux ImageRepository's `spec.secretRef` accepts only same-namespace references. Putting both Deployment+ImageRepository in the same namespace is not viable (image-reflector-controller runs in `flux-system`). Two ExternalSecrets is the correct fix; do not try to consolidate to one.
- **Imperative `kubectl create secret docker-registry`:** Violates the "no PAT in git, all secrets via ExternalSecret" pattern (CICD-05 SC #3). The existing `forgejo-registry-creds` Secret was created this way and is being explicitly deferred to Phase 27 cleanup partly for this reason.
- **Hand-crafting the dockerconfigjson string in the vault:** Brittle (each rotation requires re-encoding); error-prone (one wrong character breaks pulls); makes per-field rotation impossible. Always template at sync time using two raw fields.
- **Removing the `# {"$imagepolicy": ...}` setter comment during the edit:** Would orphan the line from ImageUpdateAutomation. Flux would still pick the latest tag, but it would never propagate into the manifest. CONTEXT.md D-07/D-08 explicitly say setter comments are UNCHANGED.
- **Renaming `metadata.name: hudsonfam` to anything else:** Would force synchronized edits to ImagePolicy, both setter comments, and the kustomization image-name match. CONTEXT.md D-05 explicitly preserves this name.
- **Bundling ESO-create and ImageRepository-rewire in one commit (D-09):** Creates a 1-30s race window where Flux scans before ESO syncs. Two-commit cadence eliminates the race.
- **Combining the homelab PR merge with Phase 27 work:** Phase 27 deletes the rollback path. Plan SUMMARY must call out: "Do not start Phase 27 until Phase 26 has been observably green for at least one full Flux reconcile cycle (≥10 min after Commit 2)." (Per D-10.)

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Mirror one Secret across two namespaces | A custom CronJob that copies the Secret | Two ExternalSecrets pointing at the same vault key (D-04) | Avoids new operator; both ESOs already in cluster; rotation-safe; matches CONTEXT decision |
| Build the dockerconfigjson string manually | Bash that runs `echo -n "$user:$pat" | base64` and pastes the result into a literal Secret YAML | ESO `target.template` with sprig `printf | b64enc` (D-03) | Idempotent; rotation-safe; PAT never appears in shell history; standard ESO pattern verified in official docs |
| Wait for Secret to materialize | Sleep loop in a pre-deploy script | `kubectl wait --for=condition=Ready externalsecret/<name> -n <ns> --timeout=120s` (Validation Architecture §V-2) | Native condition watch; deterministic; no arbitrary sleeps |
| Force PAT rotation propagation | Restart ESO operator pod | `kubectl annotate externalsecret <name> -n <ns> force-sync=$(date +%s) --overwrite` | Documented ESO sync trigger; doesn't disrupt other secrets |
| Validate dockerconfigjson is well-formed | Visual YAML inspection | `kubectl get secret ghcr-pull-credentials -n <ns> -o jsonpath='{.data.\.dockerconfigjson}' | base64 -d | jq .auths."ghcr\\.io".username` (Validation Architecture §V-2) | Fails loud on shape error; verifies actual rendered Secret matches expected JSON structure |
| Test PAT works against GHCR | Hope Flux succeeds | `echo "$PAT" | docker login ghcr.io -u hudsor01 --password-stdin && docker pull ghcr.io/hudsor01/hudsonfam:<tag>` (Validation Architecture §V-1) | Catches PAT typos / wrong-scope errors BEFORE relying on Flux event log |

**Key insight:** All five problems above have established Flux/ESO/kubectl primitives. The only "build" in Phase 26 is the YAML for two ExternalSecrets (~30 lines each) and a 4-field mutation of an existing ImageRepository block. No custom scripts, no operators, no shims.

## Runtime State Inventory

> Phase 26 IS a migration phase (Forgejo→GHCR registry endpoint switch). Inventory required.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None — no databases or datastores embed the registry path. The current Deployment image (`git.homelab/forgejo-admin/hudsonfam:20260417202843`) is a string in `apps/hudsonfam/deployment.yaml:36` only; not in any datastore. | Code edit only (D-08) |
| Live service config | **Cluster state** — the running ImageRepository spec, ImagePolicy state, current Deployment Pods, and the existing `forgejo-registry-creds` Secret all reference the old endpoint. None of these need a separate "data migration" — they all rebuild themselves once the manifests change and Flux reconciles. The `forgejo-registry-creds` Secret stays in place through Phase 26 (per D-10 rollback safety) and is deleted in Phase 27. | None for Phase 26 (Flux reconciliation auto-rebuilds); Phase 27 deletes `forgejo-registry-creds` |
| OS-registered state | None — no systemd units, cron jobs, or task-scheduler entries reference the registry endpoint or any pull-secret name. | None |
| Secrets/env vars | **Vault key `ghcr-pull-credentials`** — does NOT yet exist in `kubernetes-secrets` ClusterSecretStore-backed vault. Owner must provision it out-of-band (with two properties `username` + `pat`) BEFORE the Commit-1 ExternalSecret resources reconcile, otherwise ESO will report `SecretSyncedError: secret "ghcr-pull-credentials" not found`. The existing `hudsonfam-secrets` vault key is a separate entity and is not affected. The cluster `forgejo-registry-creds` Secret stays put through Phase 26. | Owner-only out-of-band vault add; documented as Plan precondition |
| Build artifacts / installed packages | None — Phase 26 ships no compiled binaries, npm packages, or Docker images. The hudsonfam container image continues to come from GHCR (now via the new pipeline). | None |

**Canonical question — "After every file in the homelab repo is updated, what runtime systems still have the old string cached?"**
- ImagePolicy `LATEST IMAGE` status field will still report the old Forgejo tag until the next image-reflector-controller scan after Commit 2 (`flux reconcile image repository hudsonfam -n flux-system` forces immediate rescan).
- Running pods will continue to run the old `git.homelab/...` image until the new ImagePolicy selection propagates through ImageUpdateAutomation → kustomization → Deployment rollout. The Deployment-image edit in Commit 2 (D-08) bootstraps the rollout immediately; ImageUpdateAutomation keeps it in sync afterwards.

## Common Pitfalls

### Pitfall 1: Vault key not provisioned before Commit 1 reconciles

**What goes wrong:** Owner creates the PR but forgets to add `ghcr-pull-credentials` to the `kubernetes-secrets` vault. Flux reconciles the new ExternalSecret resources; ESO logs `SecretSyncedError: secret "ghcr-pull-credentials" not found`. Both Secrets fail to materialize. Commit 2 then fails because the ImageRepository spec references a non-existent secret.

**Why it happens:** Vault add is an out-of-band step (no git artifact); easy to forget if not on the precondition checklist.

**How to avoid:** Plan must include a precondition checklist with exactly: (1) PAT generated, (2) vault key added with both `username` and `pat` properties, (3) `kubectl get externalsecret -n homepage ghcr-pull-credentials` shows `STATUS: SecretSynced` BEFORE pushing Commit 2.

**Warning signs:** `kubectl describe externalsecret ghcr-pull-credentials -n <ns>` shows `Status.Conditions[*].Reason: SecretSyncedError`. Quick fix once detected: add the vault key, then `kubectl annotate externalsecret ghcr-pull-credentials -n <ns> force-sync=$(date +%s) --overwrite` to skip the 1h refresh wait.

### Pitfall 2: PAT typed wrong; failure surfaces only at Flux scan time

**What goes wrong:** Owner pastes PAT into vault with one wrong character. ESO syncs the Secret successfully (it doesn't validate auth), kubelet on the running pod continues running the OLD image (no new pull triggered yet), but Flux ImageRepository scan fails with `unauthorized: authentication required` 6 hours after Commit 2. Phase 26 looks "shipped" until the first scheduled scan.

**Why it happens:** ESO validates only that the vault key exists with the named properties — not that the secret itself is valid for the target registry.

**How to avoid:** BEFORE pushing Commit 2, owner runs the docker-login smoke test from any host:
```bash
echo "<PAT-from-vault>" | docker login ghcr.io -u hudsor01 --password-stdin
docker pull ghcr.io/hudsor01/hudsonfam:<latest-tag>
docker logout ghcr.io
```
A 401 fails immediately; a successful pull confirms the PAT itself works. Plan must include this as part of the Commit-1 verification step.

**Warning signs:** After Commit 2, `flux get image repository hudsonfam -n flux-system` shows `READY: False` with `MESSAGE: failed to scan: unauthorized`. Quick fix: rotate vault PAT entry, force-sync ESO, force-reconcile ImageRepository.

### Pitfall 3: ImagePolicy `numerical.order: asc` semantics

**What goes wrong:** Owner reads `order: asc` and assumes "ascending order means oldest" — wrong. Flux's `numerical.order: asc` selects the **highest** value when the regex captures sortable values. For monotonic timestamps, `asc` correctly picks the newest tag. (The `desc` order would actually pick the oldest.) The existing `image-policies.yaml:266` is `asc`, which is correct.

**Why it happens:** Counter-intuitive naming — `order: asc` describes how Flux SORTS the values internally; the policy selects the LAST (highest) item from the sorted list.

**How to avoid:** Plan must NOT touch ImagePolicy (D-06). If a future maintainer is tempted to "fix" `asc` to `desc`, the regression would silently pin to the oldest YYYYMMDDHHmmss tag. Add a one-line comment to the existing block (purely informational; only if Claude's-discretion CLAUDE.md note covers it).

**Warning signs:** `flux get image policy hudsonfam -n flux-system` shows `LATEST IMAGE: ghcr.io/hudsor01/hudsonfam:<smallest-timestamp>`. Quick fix: revert `order:` to `asc`.

### Pitfall 4: Two-commit race if ESO refreshInterval not respected

**What goes wrong:** Owner pushes Commit 1 (ESO resources), waits 30 seconds, sees `kubectl get secret ghcr-pull-credentials -n homepage` returns nothing, panics, pushes Commit 2 anyway. Now Flux scans before either Secret materializes; ImageRepository goes `Ready: False`.

**Why it happens:** ESO's `refreshInterval: 1h` is the SCHEDULED resync cadence, not the time-to-first-sync. First sync should happen within seconds of the ExternalSecret being applied. But the Flux Kustomization that includes the ESO has its own reconcile interval (10m for `apps/hudsonfam`); the new ESO resource doesn't reach the cluster until after the next Flux reconcile pulls the Commit 1 changes.

**How to avoid:** Plan must instruct: after pushing Commit 1, run `flux reconcile kustomization hudsonfam` AND `flux reconcile kustomization flux-system` (the latter for the image-automation kustomization addition) immediately to skip the 10-min poll wait. Then `kubectl wait --for=condition=Ready externalsecret/ghcr-pull-credentials -n homepage --timeout=120s` and the same for flux-system ns. Only after both Secrets exist (verified via `kubectl get secret ... -o jsonpath='{.type}'` returning `kubernetes.io/dockerconfigjson`), proceed to Commit 2.

**Warning signs:** `kubectl get secret ghcr-pull-credentials -n homepage` returns "not found" even after `flux reconcile kustomization hudsonfam`. Likely cause: ESO not synced yet — `kubectl describe externalsecret ghcr-pull-credentials -n homepage` will show the actual error.

### Pitfall 5: Kustomize `images:` `name` mismatch silently does nothing

**What goes wrong:** Owner edits `apps/hudsonfam/kustomization.yaml:12` `name:` to a value that doesn't exactly match the Deployment's `image:` field's image-name portion (e.g., adds a trailing slash, capitalizes a letter, or has a stale `git.homelab/...` left over). Kustomize's `images:` block matches by exact name; any mismatch means the override silently doesn't apply, and the Deployment runs whatever raw `image:` value was in the Deployment spec.

**Why it happens:** Kustomize doesn't error on a non-matching `images:` entry — it's not a strict join. The override is an opt-in per-image transformation.

**How to avoid:** Plan must enforce: BOTH `kustomization.yaml:12 name:` AND `deployment.yaml:36 image:` must use the EXACT string `ghcr.io/hudsor01/hudsonfam` (the image name without any tag). After commits, verify with: `kubectl get deployment hudsonfam -n homepage -o jsonpath='{.spec.template.spec.containers[0].image}'` returning `ghcr.io/hudsor01/hudsonfam:<some-yyyymmddhhmmss-tag>`. If the result still shows `git.homelab/...`, the kustomize match failed.

**Warning signs:** After Commit 2, `kubectl describe deployment hudsonfam -n homepage` `Containers.hudsonfam.Image:` still references the old registry. Quick fix: re-check the `name:` field for whitespace/typos.

### Pitfall 6: Forgejo (homelab repo's Flux source) lag

**What goes wrong:** Owner pushes Commit 2 to Forgejo. Flux source-controller normally polls every 1 minute (per `gotk-sync.yaml:10` `interval: 1m0s`). But if Forgejo had an issue or the in-cluster network blip swallowed the poll, the manifest changes might not reach Flux for several minutes. Owner runs `kubectl get imagerepository hudsonfam -n flux-system` and sees the OLD image still configured.

**Why it happens:** Source poll cadence is 1 min, not instant. Reconciliation is push-based for the Kustomization but pull-based for the GitRepository.

**How to avoid:** Plan's verification recipe must START with `flux reconcile source git flux-system` (already in D-11) — this forces the source-controller to fetch immediately, bypassing the 1-min poll. Then `flux reconcile kustomization flux-system` and `flux reconcile kustomization hudsonfam` propagate downstream.

**Warning signs:** `kubectl get gitrepository flux-system -n flux-system -o jsonpath='{.status.artifact.revision}'` lags behind the latest commit on `forgejo/main`. Fix: `flux reconcile source git flux-system`.

## Code Examples

### Verify Secret materialized correctly (both namespaces)

```bash
# Source: kubectl + jq + base64 standard tooling
kubectl get secret ghcr-pull-credentials -n homepage -o jsonpath='{.type}'
# Expected: kubernetes.io/dockerconfigjson

kubectl get secret ghcr-pull-credentials -n flux-system -o jsonpath='{.type}'
# Expected: kubernetes.io/dockerconfigjson

kubectl get secret ghcr-pull-credentials -n homepage -o jsonpath='{.data.\.dockerconfigjson}' | base64 -d | jq -r '.auths."ghcr.io".username'
# Expected: hudsor01
```

### Force-sync an ExternalSecret (skip the 1h refresh wait)

```bash
# Source: ESO documented annotation pattern
kubectl annotate externalsecret ghcr-pull-credentials -n homepage \
  force-sync=$(date +%s) --overwrite
kubectl annotate externalsecret ghcr-pull-credentials -n flux-system \
  force-sync=$(date +%s) --overwrite
```

### Verify Flux picks up the new tag

```bash
# Source: D-11 verification recipe + Flux CLI docs
flux reconcile source git flux-system
flux reconcile image repository hudsonfam -n flux-system
flux reconcile image policy hudsonfam -n flux-system

flux get image repository hudsonfam -n flux-system
# Expected: READY=True; LAST SCAN=<recent>; LAST TAG=<newest YYYYMMDDHHmmss in GHCR>

flux get image policy hudsonfam -n flux-system
# Expected: LATEST IMAGE=ghcr.io/hudsor01/hudsonfam:<newest YYYYMMDDHHmmss>
```

### Verify Deployment rolled to new image

```bash
# Source: kubectl docs
kubectl describe deployment hudsonfam -n homepage | grep -E "Image:|imagePullSecrets"
# Expected:
#   Image: ghcr.io/hudsor01/hudsonfam:<some YYYYMMDDHHmmss>
#   imagePullSecrets: ghcr-pull-credentials

kubectl get pods -n homepage -l app=hudsonfam -w
# Expected: new pod Pulling → Pulled → Running 1/1; old pod Terminating
```

### Smoke-test the PAT itself (BEFORE Commit 2)

```bash
# Source: GitHub Container Registry official docs
echo "<paste-PAT-from-vault>" | docker login ghcr.io -u hudsor01 --password-stdin
# Expected: Login Succeeded

docker pull ghcr.io/hudsor01/hudsonfam:<latest-tag-from-GHCR-UI>
# Expected: pull completes; sha256 digest printed

docker logout ghcr.io
```

### Rollback recipe (D-10) — invoke ONLY if Commit 2 verification fails

```bash
# Source: CONTEXT.md D-10 verbatim
kubectl edit deployment hudsonfam -n homepage
# In the editor: change spec.template.spec.containers[0].image back to:
#   git.homelab/forgejo-admin/hudsonfam:20260417202843
# Change spec.template.spec.imagePullSecrets[0].name back to:
#   forgejo-registry-creds
# Save+exit
kubectl rollout status deployment/hudsonfam -n homepage --timeout=120s
# Then revert Commit 2 in git, push, let Flux reconcile.
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Imperative `kubectl create secret docker-registry forgejo-registry-creds ...` | Declarative ExternalSecret with `target.template` reconstructing dockerconfigjson | Phase 43 used imperative (existed pre-v3.5); Phase 26 establishes declarative pattern | PAT never in shell history; rotation = single vault update; standard ESO pattern matches all other homelab secrets |
| Self-hosted Forgejo registry with `insecure: true` | GHCR (CA-signed TLS) | This phase | Removes self-signed TLS exception; closes minor security regression |
| Forgejo-hosted CI (Woodpecker) → Forgejo registry | GitHub Actions (Phase 25) → GHCR (this phase) → Flux scan via PAT | v3.5 milestone | Vendor-managed > self-hosted thesis (per SEED-005) |
| ExternalSecrets API `v1beta1` | API `v1` (GA since v0.16; default engineVersion bumped to v2) | v0.16 (mid-2025) | Existing repo already on `v1`; no migration needed |
| Flux ImageRepository API `v1alpha2` / `v1beta1` | `v1beta2` (current default) | Multi-year migration | Existing repo already on `v1beta2`; no migration needed |

**Deprecated/outdated:**
- `apiVersion: external-secrets.io/v1beta1` — superseded by `v1` (still works but should not be used for new resources)
- `engineVersion: v1` (template engine) — superseded by `v2`; `v1` lacks sprig and has fewer functions; `v2` is now the default
- Fine-grained PATs for GHCR access — community-reported as inconsistent / not officially supported; use classic PAT (R-01)

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | ExternalSecrets Operator is at version 2.1.0 (per `homelab/CLAUDE.md:55`) | Standard Stack | Template syntax may differ across major ESO versions; if running version is significantly older (<v0.9), `apiVersion: external-secrets.io/v1` may not exist. Mitigation: existing `apps/hudsonfam/external-secret.yaml` uses `v1` and is presumed working today. |
| A2 | The `kubernetes-secrets` ClusterSecretStore is operational (existing ESOs sync successfully) | Standard Stack | If broken, no ExternalSecret can sync; all of Phase 26 blocks. Mitigation: out-of-scope to repair (would be its own incident). |
| A3 | GHCR package `hudsor01/hudsonfam` exists with at least one `^\d{14}$`-format tag at Phase 26 start | Architecture | If empty, ImagePolicy will be `Ready: False; reason: NoSuitableImage`. Mitigation: D-12 precondition trigger via `workflow_dispatch`. |
| A4 | Flux source-controller CAN reach `ghcr.io` (no NetworkPolicy blocks egress to public registry) | Pitfalls | If blocked, scan fails with `dial tcp: ...` errors. Mitigation: same egress path is used by `recyclarr` GHCR ImageRepository which has scanned successfully in the past per CONTEXT. |
| A5 | The current cluster pod for hudsonfam can be Recreate-rolled without downtime concerns (per `deployment.yaml:13 strategy.type: Recreate`) | Architecture | Brief downtime expected during rollout; no surprise. Mitigation: communicated in Phase 26 SUMMARY as expected behavior. |
| A6 | Kustomize honors the `images:` override based on exact name match (no version-pinning gotcha when both `name` AND `newTag` are pinned) | Pitfalls | If kustomize has a strict mode that rejects `name` not appearing in any underlying resource, the override could fail validation. Mitigation: validated by Phase 43 SUMMARY which used the same pattern successfully. |

## Open Questions (RESOLVED)

1. **GHCR package visibility (public vs private)** — RESOLVED: design works for BOTH cases regardless of visibility. If public, the PAT is harmless overhead (Flux uses it; GHCR ignores it for public images). If private, the PAT is required. Plan does NOT make this a precondition gate — Wave 0 Task 26-01-01 owner check captures visibility informationally for STATE.md only. Owner can flip to public via the GHCR UI as a separate post-Phase-26 ops decision (would simplify any future attempt to remove the pull PAT).

2. **First Phase-25 build observational verification** — RESOLVED: Wave 0 Task 26-01-01 owner-checklist gate + CONTEXT D-12 `workflow_dispatch` fallback together cover this. Plan precondition checklist requires "verify at least one `^\d{14}$`-tagged image exists at GHCR before Commit 2 merges."

3. **Cleanup of `forgejo-registry-creds` Secret in Phase 26** — RESOLVED: explicitly DEFERRED to Phase 27 per CONTEXT D-10 (rollback safety net through Phase 26). Plans 26-01 and 26-02 only de-reference it (flip Deployment `imagePullSecrets[0].name` and ImageRepository `secretRef.name`); the Secret resource itself stays in cluster.

4. **One-line note in `homelab/CLAUDE.md` documenting the new GHCR ImageRepository** — RESOLVED: deferred to executor's discretion at Plan 26-02 commit time per CONTEXT.md `<decisions> ## Claude's Discretion` block (low priority; small ops note that can be added in a follow-up commit if forgotten).

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Cluster `kubectl` access | All D-11 verification commands | Cluster permissions assumed (sandbox blocked direct probe) | — | Owner runs verification from cluster admin host |
| `flux` CLI | All D-11 `flux reconcile`/`flux get` commands | Owner host (per `homelab/CLAUDE.md`) | recent v2.x | None — `flux` CLI is required |
| `kubectl wait` | Validation Architecture §V-2 | Standard kubectl subcommand (k8s 1.13+) | k8s 1.34.6+k3s1 per CLAUDE.md | None |
| ExternalSecrets Operator | ExternalSecret resources to materialize | Yes — running per `homelab/CLAUDE.md:55` | 2.1.0 | None — Phase 26 fundamentally requires ESO |
| `kubernetes-secrets` ClusterSecretStore | Both ExternalSecrets `secretStoreRef` | Yes — used by 5+ existing ExternalSecrets in homelab repo | — | None |
| Flux image-reflector-controller | ImageRepository scans | Yes — managing 20+ ImageRepositories | recent | None |
| Flux image-automation-controller | Setters tag rewrite | Yes — `homelab-images` ImageUpdateAutomation already wired | recent | None |
| Forgejo (homelab GitRepository source) | Flux to detect Commit 1 / Commit 2 | Yes — running at `192.168.4.236:30022` per `.git/config` | — | None |
| `docker` CLI on owner host | Pitfall §2 PAT smoke test (BEFORE Commit 2) | Likely (homelab admin host) | — | Use `crane`, `skopeo`, or `oras` if `docker` is unavailable; `curl https://ghcr.io/v2/hudsor01/hudsonfam/manifests/latest -H "Authorization: Bearer $(echo -n ":$PAT" | base64)"` is a `docker`-free fallback |
| `gh` CLI for GHCR API queries | Open Question §1 (visibility check) | Owner host (unauthenticated locally per Phase 25 SUMMARY) | — | Browser-based check at <https://github.com/users/hudsor01/packages/container/hudsonfam/settings> |
| `jq` | Validation §V-2 dockerconfigjson parse verification | Standard tool | — | `python3 -c "import sys,json; ..."` fallback |
| `base64` | Same | Standard tool | — | None practical |
| GitHub fine-grained PAT generation | D-01 (RESEARCH-FLAGGED) | Available (owner can create) | — | Classic PAT with `read:packages` scope (RECOMMENDED per R-01) |

**Missing dependencies with no fallback:** None — all hard dependencies are present.

**Missing dependencies with fallback:**
- `gh` CLI (unauthenticated locally) → owner browser check is the documented path.

## Validation Architecture

### Test Framework

This is an infrastructure phase with NO unit-test framework. Validation is observational and command-based, executed against the live cluster post-Commit. The "tests" are kubectl/flux command outputs verified against expected values.

| Property | Value |
|----------|-------|
| Framework | None (observational, command-based; matches Phase 25 pattern of YAML-parse + grep gates + observational first-build check) |
| Config file | None |
| Quick run command | `kubectl get externalsecret,secret -n homepage ghcr-pull-credentials && kubectl get externalsecret,secret -n flux-system ghcr-pull-credentials` |
| Full suite command | The 8-command D-11 verification recipe + 4 additional checks (V-1..V-4 below) |
| Phase gate | All V-1..V-4 commands return their expected output before `/gsd-verify-work` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CICD-04 | ImageRepository ready, watching ghcr.io/hudsor01/hudsonfam | observational (cluster) | `flux get image repository hudsonfam -n flux-system` → READY=True; LAST SCAN recent; LAST TAG=newest YYYYMMDDHHmmss | n/a (live cluster check) |
| CICD-04 | ImageRepository scans correct registry | observational | `kubectl get imagerepository hudsonfam -n flux-system -o jsonpath='{.spec.image}'` → `ghcr.io/hudsor01/hudsonfam` | n/a |
| CICD-05 | Pull Secret in `homepage` ns is dockerconfigjson | observational | `kubectl get secret ghcr-pull-credentials -n homepage -o jsonpath='{.type}'` → `kubernetes.io/dockerconfigjson` | n/a |
| CICD-05 | Pull Secret in `flux-system` ns is dockerconfigjson | observational | `kubectl get secret ghcr-pull-credentials -n flux-system -o jsonpath='{.type}'` → `kubernetes.io/dockerconfigjson` | n/a |
| CICD-05 | Secret payload correctly templates the auth field | observational | `kubectl get secret ghcr-pull-credentials -n homepage -o jsonpath='{.data.\.dockerconfigjson}' \| base64 -d \| jq -r '.auths."ghcr.io".username'` → `hudsor01` | n/a |
| CICD-05 | No PAT in git | static | `git -C /home/dev-server/homelab grep -nE 'ghp_\|github_pat_' \| grep -v '\.planning/'` → no output (defensive grep) | n/a |
| CICD-06 | ImagePolicy still selects newest YYYYMMDDHHmmss | observational | `flux get image policy hudsonfam -n flux-system` → LATEST IMAGE matches newest tag in GHCR | n/a |
| CICD-06 | ImageUpdateAutomation produces a commit on tag bump | observational (post-bump) | `git -C /home/dev-server/homelab log --author='Flux Image Automation' -1` → commit visible after a new GHCR tag appears | n/a |
| CICD-06 | Deployment rolled to new image | observational | `kubectl get deployment hudsonfam -n homepage -o jsonpath='{.spec.template.spec.containers[0].image}'` → starts with `ghcr.io/hudsor01/hudsonfam:` | n/a |
| CICD-06 | Pod pulls cleanly from GHCR | observational | `kubectl get events -n homepage --field-selector involvedObject.kind=Pod,involvedObject.name=<new-pod>` → "Successfully pulled image" event; no `ImagePullBackOff` | n/a |

### Sampling Rate

- **Per task commit:** Static YAML validation only (`kubectl apply --dry-run=client -f <file>`; equivalent to `kubeconform`). One quick check per added/modified YAML.
- **Per wave merge:** Full V-1..V-4 sequence (below). Run 5 minutes after Forgejo push to allow Flux source poll + reconcile.
- **Phase gate:** All 4 validation sections green; no pod restarts on hudsonfam Deployment in the 10 minutes after Commit 2 reconciles.

### V-1: Static YAML validation (pre-push, per file)

Owner runs from any host with cluster access:
```bash
kubectl apply --dry-run=client -f apps/hudsonfam/ghcr-pull-secret.yaml
kubectl apply --dry-run=client -f clusters/homelab/image-automation/ghcr-pull-secret.yaml
kubectl apply --dry-run=client -f apps/hudsonfam/deployment.yaml
kubectl apply --dry-run=client -f apps/hudsonfam/kustomization.yaml
kubectl apply --dry-run=client -f clusters/homelab/image-automation/image-repositories.yaml
kubectl apply --dry-run=client -f clusters/homelab/image-automation/kustomization.yaml
```
Each must return `<kind>/<name> created (dry run)` with no errors. Catches schema typos, indent errors, missing required fields BEFORE Forgejo push.

### V-2: ESO materialization wait (after Commit 1 reconciles)

```bash
flux reconcile kustomization hudsonfam
flux reconcile kustomization flux-system

# Wait for both ExternalSecrets to reach Ready
kubectl wait --for=condition=Ready externalsecret/ghcr-pull-credentials \
  -n homepage --timeout=180s
kubectl wait --for=condition=Ready externalsecret/ghcr-pull-credentials \
  -n flux-system --timeout=180s

# Verify Secret type and payload structure
for ns in homepage flux-system; do
  echo "=== $ns ==="
  kubectl get secret ghcr-pull-credentials -n $ns -o jsonpath='{.type}' && echo
  kubectl get secret ghcr-pull-credentials -n $ns -o jsonpath='{.data.\.dockerconfigjson}' \
    | base64 -d | jq '.auths."ghcr.io" | keys'
done
```
Expected output: type `kubernetes.io/dockerconfigjson` in both namespaces; key list `["auth", "password", "username"]`.

If `kubectl wait` times out: `kubectl describe externalsecret ghcr-pull-credentials -n <ns>` reveals the sync error. Common causes: vault key missing, vault key has wrong property names, ClusterSecretStore not ready.

### V-3: Flux reconcile + observe (after Commit 2 reconciles)

The 8-command D-11 recipe verbatim:
```bash
flux reconcile source git flux-system
flux reconcile image repository hudsonfam -n flux-system
flux reconcile image update homelab-images -n flux-system
flux reconcile kustomization hudsonfam

kubectl get imagerepository hudsonfam -n flux-system
# Expected: READY=True; LAST SCAN=recent; LAST TAG=newest YYYYMMDDHHmmss

kubectl get imagepolicy hudsonfam -n flux-system
# Expected: LATEST IMAGE=ghcr.io/hudsor01/hudsonfam:<newest tag>

kubectl describe deployment hudsonfam -n homepage
# Expected: imagePullSecrets includes ghcr-pull-credentials; Image: ghcr.io/hudsor01/...

kubectl get pods -n homepage -l app=hudsonfam -w
# Expected: new pod transitions Pulling → Pulled → Running; old pod Terminating
# Press Ctrl-C after observing
```

### V-4: Rollback recipe verification (D-10 — DRY RUN ONLY)

The plan does NOT execute a rollback unless V-3 fails. But to confirm the rollback path is viable, owner runs (BEFORE pushing Commit 2):
```bash
# Verify forgejo-registry-creds Secret still exists (rollback target)
kubectl get secret forgejo-registry-creds -n homepage -o jsonpath='{.type}' && echo
# Expected: kubernetes.io/dockerconfigjson

# Verify the old image tag is still pullable from Forgejo
# (Owner runs from a node with Forgejo access; uses existing forgejo-registry-creds)
kubectl run rollback-pull-check --rm -it --restart=Never \
  --image=git.homelab/forgejo-admin/hudsonfam:20260417202843 \
  --image-pull-policy=Always \
  --overrides='{"spec": {"imagePullSecrets": [{"name": "forgejo-registry-creds"}]}}' \
  -n homepage \
  -- /bin/sh -c "exit 0"
# Expected: pod pulls successfully and exits 0
```
This verifies the rollback path is intact BEFORE the operation that might require it.

### Wave 0 Gaps

- None. Phase 26 is observational/command-based; no test infrastructure to provision. Pre-existing `flux`, `kubectl`, `jq`, `base64`, `docker` (or curl-based fallback), and the running ESO + Flux operators cover all validation needs.
- The `kubeconform` tool would add stricter offline schema validation than `kubectl apply --dry-run=client`, but it requires CRD schemas for the Flux/ESO types; not strictly necessary for Phase 26 since the dry-run path catches the same errors against the live cluster.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | GitHub PAT (classic, `read:packages` scope per R-01) authenticates to GHCR; vault-backed via ExternalSecrets |
| V3 Session Management | no | No application sessions in this phase |
| V4 Access Control | yes | PAT scope = read-only; Flux scan + kubelet pull are the only consumers; no write access to GHCR |
| V5 Input Validation | partial | YAML schema validated via `kubectl --dry-run=client`; no user-supplied input at runtime |
| V6 Cryptography | yes | Auth string is `base64(username:password)` — Docker config standard; PAT itself is rotatable; never hand-roll crypto |
| V7 Error Handling | yes | Flux/ESO/kubelet log all errors visibly via Kubernetes events + controller logs |
| V8 Data Protection | yes | PAT at rest in `kubernetes-secrets` vault (encrypted); PAT in flight via TLS to GHCR (CA-signed); never in git |
| V9 Communications Security | yes | TLS to ghcr.io (CA-signed; `spec.insecure: true` REMOVED per D-05); TLS to vault provider per ESO operator config |
| V10 Malicious Code | partial | No code execution introduced; container-image content trust is out of scope (cosign/sigstore deferred) |
| V14 Configuration | yes | Least-privilege PAT scope; least-privilege RBAC implicit (Secrets accessed by their namespace's controllers only) |

### Known Threat Patterns for Flux+GHCR

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| PAT exposure in git | Information Disclosure | ExternalSecret pattern (D-03/D-04) — PAT never committed; verified via static `git grep` defensive check (Validation §V-1) |
| PAT used for write/admin operations beyond pull | Elevation of Privilege | Scope = `read:packages` only (D-01 / R-01); cannot push, cannot read repo contents, cannot trigger Actions |
| Stale rotated PAT continues working | Spoofing | PAT rotation = single vault update + ESO `force-sync` annotation; both Secrets re-sync within seconds; old PAT can then be revoked at GitHub |
| Compromised classic PAT → blast radius | Information Disclosure | Classic PAT with `read:packages` can pull from ALL hudsor01 personal packages (limitation of classic-vs-fine-grained); for a personal-project image, blast radius = "anyone can pull our public-or-private container image" — owner-acceptable per R-02 in CONTEXT |
| Cross-namespace Secret leak | Information Disclosure | Both Secrets are scoped to specific namespaces (homepage, flux-system); RBAC default prevents cross-namespace read by other workloads |
| Tag substitution attack (someone pushes a tag matching `^\d{14}$` higher than ours) | Tampering | GHCR write requires `Packages: Write` scope; only owner's GitHub Actions workflow with built-in `GITHUB_TOKEN` can push (Phase 25 D-07/D-12) — workflow_dispatch + push triggers are the only entry points |
| MITM on ghcr.io traffic | Tampering | CA-signed TLS; `spec.insecure: true` removed (D-05); `cert-manager` cluster-trust handles upstream CAs |
| Imperative `kubectl create secret` leaking PAT to shell history | Information Disclosure | Excluded by design — declarative ExternalSecret pattern eliminates this entirely |

## Sources

### Primary (HIGH confidence)

- **External Secrets Operator — Common K8s Secret Types**: <https://external-secrets.io/latest/guides/common-k8s-secret-types/> — canonical dockerconfigjson template example with `printf | b64enc`; confirms `apiVersion: external-secrets.io/v1` is current GA; engine v2 is default; sprig functions available
- **External Secrets Operator — Templating v1**: <https://external-secrets.io/latest/guides/templating-v1/> — confirms v1 templating engine is deprecated; v2 is the default for new resources; v2 includes `b64enc`, `printf`, `lower`, etc.
- **External Secrets Operator — Templating (v2)**: <https://external-secrets.io/latest/guides/templating/> — confirms 200+ sprig functions in v2 (with `env` and `expandenv` removed for security); template lives in `spec.target.template`
- **Flux ImageRepositories**: <https://fluxcd.io/flux/components/image/imagerepositories/> — confirms `spec.secretRef` requires same-namespace Secret of `kubernetes.io/dockerconfigjson` shape; `spec.insecure: true` is for HTTP-only registries; `spec.provider: generic` (default) uses `secretRef`
- **Flux ImageUpdateAutomations**: <https://fluxcd.io/flux/components/image/imageupdateautomations/> — confirms setter-comment grammar `# {"$imagepolicy": "ns:name"}` (basic, for Deployment) vs `# {"$imagepolicy": "ns:name:field"}` (with field suffix, for split components like Helm `tag:`)
- **GitHub Container Registry official docs**: <https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry> — verbatim: "GitHub Packages only supports authentication using a personal access token (classic)." Confirms classic PAT with `read:packages` is the supported path; documents `docker login ghcr.io -u USERNAME --password-stdin` shape
- **Local repo files**:
  - `/home/dev-server/homelab/apps/hudsonfam/external-secret.yaml` — established ExternalSecret pattern using `kubernetes-secrets` ClusterSecretStore
  - `/home/dev-server/homelab/apps/hudsonfam/deployment.yaml` — current Deployment state including line 36 image and line 128 imagePullSecrets
  - `/home/dev-server/homelab/apps/hudsonfam/kustomization.yaml` — current kustomization with images: block and setter comment
  - `/home/dev-server/homelab/clusters/homelab/image-automation/image-repositories.yaml` — current ImageRepository at lines 162-170 (the resource to mutate)
  - `/home/dev-server/homelab/clusters/homelab/image-automation/image-policies.yaml` — confirms regex `^\d{14}$` and `numerical.order: asc` already correct (lines 257-266)
  - `/home/dev-server/homelab/clusters/homelab/image-automation/image-update-automation.yaml` — confirms `update.path: ./apps strategy: Setters` already configured
  - `/home/dev-server/homelab/clusters/homelab/image-automation/kustomization.yaml` — confirms `namespace: flux-system` and current `resources:` list (3 entries)
  - `/home/dev-server/homelab/clusters/homelab/flux-system/gotk-sync.yaml` — confirms Flux source = Forgejo, branch=main, interval=1m
  - `/home/dev-server/homelab/CLAUDE.md` — confirms ESO version 2.1.0
  - `/home/dev-server/homelab/.git/config` — confirms only Forgejo remote; no GitHub remote
  - `/home/dev-server/homelab/clusters/homelab/hudsonfam.yaml` — confirms `apps/hudsonfam` Flux Kustomization config

### Secondary (MEDIUM confidence — multi-source verified)

- **GitHub fine-grained PAT for GHCR (community discussion)**: <https://github.com/orgs/community/discussions/38467> — corroborates official docs that fine-grained PATs do NOT work for GHCR pull; community has tracked this limitation through 2026 with no resolution
- **OneUptime Flux+GHCR guide**: <https://oneuptime.com/blog/post/2026-03-05-imagerepository-github-ghcr-flux/view> — confirms `secretRef` namespace co-location requirement; provides the `kubectl create secret docker-registry` imperative reference (not used here, but useful for understanding the alternative)
- **Hashicorp discuss — ExternalSecrets dockerconfigjson**: <https://discuss.hashicorp.com/t/externalsecrets-and-dockerconfigjson/62217> — corroborating the templated dockerconfigjson pattern for vault-backed secret stores
- **External Secrets discussions — templating a pull secret**: <https://github.com/external-secrets/external-secrets/discussions/2543> — community-confirmed pattern for the same use case (URL returned 404 in WebFetch but URL appears in WebSearch results so listing for completeness)

### Tertiary (LOW confidence — single source, marked for plan-time validation)

- ESO engineVersion v2 default-for-`v1`-API-resources behavior — derived from cross-referencing two ESO docs pages and a release-notes-cited search snippet; planner should consider including a one-liner `engineVersion: v2` in the new ExternalSecrets even though it's the default, purely for explicitness (cost: 1 line of YAML; benefit: future-proofing if ESO ever changes the default)

## Metadata

**Confidence breakdown:**
- ESO templating shape (D-03): HIGH — canonical example pulled verbatim from official ESO docs; matches CONTEXT.md template body
- Flux ImageRepository same-ns secretRef (D-04): HIGH — directly quoted from official Flux docs
- Setter-comment grammar preservation (D-06): HIGH — official Flux docs quote both basic and field-suffix forms; existing comments match correct grammar
- TLS posture / `insecure: true` removal (D-05): HIGH — official Flux docs confirm `insecure: true` is HTTP-only; GHCR uses CA-signed TLS
- Mutate-in-place ImageRepository pattern (D-05): HIGH — standard Flux operation; `metadata.name` preservation correctly maintains all downstream refs
- Two-commit sequencing (D-09): HIGH — race condition logic confirmed by understanding ESO refreshInterval semantics + Flux scan cadence
- Verification recipe (D-11): HIGH — every command is standard `flux`/`kubectl` invocation
- Rollback path (D-10): HIGH — `kubectl edit` is well-known imperative escape hatch; pre-Phase-26 state preserved
- GitHub fine-grained PAT for GHCR (D-01): **MEDIUM-NEGATIVE** — official docs explicitly say classic-only; community confirms fine-grained doesn't work; some scattered reports of partial success but no consistent pattern. PLANNER ACTION RECOMMENDED: switch D-01 to classic PAT before owner generates the token.
- ESO engineVersion v2 default behavior: HIGH — confirmed across two ESO docs pages
- Vault key out-of-band step risk (Pitfall §1): HIGH — well-understood failure mode in any ExternalSecret-based deployment

**Research date:** 2026-04-23
**Valid until:** 2026-05-23 (30 days for stable; ESO/Flux APIs are stable, but GHCR fine-grained PAT support could theoretically change with a GitHub announcement — re-check R-01 if more than 60 days pass)

---

## RESEARCH COMPLETE

**Phase:** 26 - Flux Reconfiguration (v3.5-P2)
**Confidence:** HIGH

### Key Findings

1. **Fine-grained PAT for GHCR is NOT officially supported** (R-01) — GitHub's docs explicitly state classic-only; planner should convert D-01 to classic PAT with `read:packages` scope before owner generates token. Vault key shape, ExternalSecret template, and downstream mechanics unchanged.
2. **ExternalSecrets `apiVersion: v1` defaults to template engineVersion v2** with full sprig (`b64enc`, `printf`) — D-03 template body works as written.
3. **Flux ImageRepository `spec.secretRef` requires same-namespace Secret of `kubernetes.io/dockerconfigjson` type** — confirms two-ExternalSecret pattern (D-04) is correct and necessary.
4. **Setter-comment grammar verified**: existing `# {"$imagepolicy": "flux-system:hudsonfam"}` (Deployment) and `# {"$imagepolicy": "flux-system:hudsonfam:tag"}` (kustomization newTag) are both correct per official Flux docs — ZERO edits needed (D-06 holds).
5. **Homelab repo's only remote is Forgejo** (`192.168.4.236:30022/dev-projects/homelab.git`); Flux source-controller polls every 1 minute. Push to Forgejo IS the reconcile trigger; no GitHub remote means no PR-based workflow.
6. **First ESO-templated dockerconfigjson in this codebase** — pre-existing `forgejo-registry-creds` was created imperatively via `kubectl create secret docker-registry` (verified by `dockerconfigjson` grep returning 0 hits across `apps/`, `clusters/`). Phase 26 establishes the declarative template pattern.
7. **ESO version 2.1.0** running in cluster per `homelab/CLAUDE.md:55` — confirms `apiVersion: external-secrets.io/v1` is GA and engine v2 default applies.

### File Created

`/home/dev-server/hudsonfam/.planning/phases/26-flux-reconfiguration/26-RESEARCH.md`

### Confidence Assessment

| Area | Level | Reason |
|------|-------|--------|
| Standard Stack | HIGH | All operators pre-existing; ESO v2.1.0 + Flux v1beta2 confirmed; ESO + Flux docs canonical examples verified |
| Architecture | HIGH | Two-ESO pattern, mutate-in-place ImageRepository edit, setter-comment-anchored Deployment image rewrite — all verified against official docs and existing repo patterns |
| Pitfalls | HIGH | Six pitfalls documented with concrete warning signs and quick fixes; each grounded in either ESO/Flux operational semantics or codebase-state evidence |
| ExternalSecret template (D-03) | HIGH | Canonical example pulled verbatim from official ESO `common-k8s-secret-types` page |
| Verification recipe | HIGH | Every command standard kubectl/flux; D-11 + V-1..V-4 covers all SCs |
| GHCR fine-grained PAT (D-01) | MEDIUM-NEGATIVE | Official GitHub docs say classic-only; planner action: convert to classic PAT |
| Open question on package visibility | LOW (informational) | Owner browser check still pending; design works for both cases |

### Open Questions (RESOLVED)

1. GHCR package visibility (public/private) — RESOLVED: design works for both cases; PAT provisioned regardless; visibility recorded in STATE.md informationally via Wave 0 owner check. Cross-ref §Open Questions (above) item #1.
2. First Phase-25 build observational verification — RESOLVED: Wave 0 Task 26-01-01 owner-checklist + D-12 `workflow_dispatch` fallback. Cross-ref §Open Questions (above) item #2.
3. Cleanup of `forgejo-registry-creds` Secret — RESOLVED: explicitly DEFERRED to Phase 27 per D-10 (rollback safety net through Phase 26). Cross-ref §Open Questions (above) item #3.
4. Optional one-line note in `homelab/CLAUDE.md` documenting the new GHCR ImageRepository — RESOLVED: Claude's-discretion item per CONTEXT.md; default YES; deferred to executor at Plan 26-02 commit time. Cross-ref §Open Questions (above) item #4.

### Risks for Planner

- **R-01 (HIGH-IMPACT, design-affecting):** Convert D-01 from fine-grained PAT to classic PAT with `read:packages` scope before owner generates the token. ExternalSecret template (D-03), vault key shape (D-02), and all downstream mechanics are unchanged — only the type of token differs.
- **R-02 (acceptable-as-stated):** Classic PAT cannot scope-limit to a single package within an account; blast radius if leaked = "anyone can pull our public-or-private container image" — owner-acceptable per CONTEXT.md `<specifics>` PAT-scope-choice rationale.
- **R-03 (procedural):** Vault key `ghcr-pull-credentials` must be added BEFORE Commit 1 reconciles, else ESO reports `SecretSyncedError`. Plan must include vault-key-added precondition check.
- **R-04 (procedural):** PAT typo discovery is silent until Flux scan — plan must include the docker-login smoke test BEFORE Commit 2.
- **R-05 (procedural):** ESO `refreshInterval: 1h` — plan must use `kubectl wait` + `flux reconcile kustomization` to skip the wait between Commit 1 and Commit 2.
- **R-06 (procedural):** Kustomize `images:` `name` must EXACTLY match Deployment `image:` field name — plan must verify post-edit.
- **R-07 (procedural):** Forgejo source poll lag (1 min) — plan must use `flux reconcile source git flux-system` to skip the wait.
- **R-08 (sequencing):** Phase 27 deletes the rollback path (`forgejo-registry-creds` Secret + Forgejo registry) — Phase 26 SUMMARY must explicitly say "do not start Phase 27 until Phase 26 has been observably green for ≥10 min after Commit 2."

### Ready for Planning

Research complete. Planner can now create PLAN.md files. **Strong recommendation:** before generating the plan, address R-01 by converting D-01's fine-grained PAT to classic PAT with `read:packages` scope. All other CONTEXT.md decisions are validated.
