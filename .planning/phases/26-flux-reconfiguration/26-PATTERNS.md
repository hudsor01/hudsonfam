# Phase 26: Flux Reconfiguration — Pattern Map

**Mapped:** 2026-04-23
**Files analyzed:** 6 (2 NEW + 4 MODIFIED)
**Analogs found:** 6 / 6 (all 4 modifications are mutate-in-place; both NEW files have a structural analog + a documented pattern gap for the dockerconfigjson template block)
**Repo scope:** `/home/dev-server/homelab/` (NOT hudsonfam) — all paths below are relative to this repo unless stated.

---

## PATTERN MAPPING COMPLETE

---

## Phase File Inventory

| # | File | NEW or MODIFIED | Role | Data Flow |
|---|------|-----------------|------|-----------|
| 1 | `apps/hudsonfam/ghcr-pull-secret.yaml` | NEW | ExternalSecret (homepage ns) | secret-injection (vault → kubelet imagePullSecrets) |
| 2 | `clusters/homelab/image-automation/ghcr-pull-secret.yaml` | NEW | ExternalSecret (flux-system ns) | secret-injection (vault → Flux ImageRepository scan auth) |
| 3 | `clusters/homelab/image-automation/image-repositories.yaml` lines 161-170 | MODIFIED | Flux ImageRepository spec | registry scan (registry rewire) |
| 4 | `clusters/homelab/image-automation/kustomization.yaml` | MODIFIED | Kustomize manifest | resource enumeration (add new ExternalSecret) |
| 5 | `apps/hudsonfam/kustomization.yaml` lines 4-13 | MODIFIED | Kustomize manifest | resource enumeration + image override (add ExternalSecret + flip image name) |
| 6 | `apps/hudsonfam/deployment.yaml` lines 36, 127-128 | MODIFIED | K8s Deployment | container image + imagePullSecrets rewire |

Verified line ranges against the actual files on disk (2026-04-23):
- File 3: `image-repositories.yaml:161-170` is the `---` separator + the `hudsonfam` ImageRepository block. CONTEXT cited 162-170; the `---` separator at 160 belongs to the previous block, the `hudsonfam` block proper is 161 (`---`?) → actually 161 is `apiVersion:`. The block to mutate spans lines 161-170 inclusive (6 lines of YAML: apiVersion, kind, metadata.name, spec.image, spec.interval, spec.insecure, spec.secretRef.name + 1 child).
- File 5: `images:` block is at lines 11-13.
- File 6: `image:` is line 36; `imagePullSecrets[0].name` is line 128 (preceded by `imagePullSecrets:` at line 127).

---

## Pattern Map

### File 1 — `apps/hudsonfam/ghcr-pull-secret.yaml` (NEW, ExternalSecret in `homepage` ns)

**Closest analog:** `apps/hudsonfam/external-secret.yaml` (sibling file, exact-match on apiVersion + secretStoreRef + refreshInterval + label conventions; only `target.type` + `target.template` are new)

**Analog excerpt (lines 1-17, the structural skeleton to mirror):**
```yaml
apiVersion: external-secrets.io/v1
kind: ExternalSecret
metadata:
  name: hudsonfam-secrets
  namespace: homepage
  labels:
    app: hudsonfam
    app.kubernetes.io/name: hudsonfam
    app.kubernetes.io/component: secrets
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: kubernetes-secrets
    kind: ClusterSecretStore
  target:
    name: hudsonfam-secrets
    creationPolicy: Owner
```

**Verbatim values to carry over (do NOT change):**
- `apiVersion: external-secrets.io/v1`
- `spec.refreshInterval: 1h`
- `spec.secretStoreRef.name: kubernetes-secrets`
- `spec.secretStoreRef.kind: ClusterSecretStore`
- `spec.target.creationPolicy: Owner`
- `metadata.namespace: homepage`
- Label triple: `app: hudsonfam`, `app.kubernetes.io/name: hudsonfam`, `app.kubernetes.io/component: secrets` (per CONTEXT D-discretion: keep `component: secrets` for the homepage-ns ESO; matches the sibling)

**Values to change (Phase 26-specific):**
- `metadata.name`: `ghcr-pull-credentials` (per CONTEXT discretion default)
- `spec.target.name`: `ghcr-pull-credentials`
- `spec.target.type`: `kubernetes.io/dockerconfigjson` ← **NEW key, no analog in homelab repo**
- `spec.target.template`: dockerconfigjson reconstruction block ← **NEW pattern, see Pattern Gap below**
- `spec.data`: two entries (`username` + `pat`) keyed off vault key `ghcr-pull-credentials`

**Vault entry shape reference (from `apps/ai/litellm/externalsecret.yaml:21-32` — closest analog for "two-property single-key remoteRef" pattern):**
```yaml
  data:
    - secretKey: username
      remoteRef:
        key: litellm-credentials
        property: username
    - secretKey: password
      remoteRef:
        key: litellm-credentials
        property: password
```
The Phase 26 ExternalSecret mirrors this two-property pattern exactly, swapping `litellm-credentials` → `ghcr-pull-credentials` and `password` → `pat`.

---

### File 2 — `clusters/homelab/image-automation/ghcr-pull-secret.yaml` (NEW, ExternalSecret in `flux-system` ns)

**Closest analog:** Same as File 1 — `apps/hudsonfam/external-secret.yaml` for the ESO shape. For the namespace-omission convention, the sibling files in the same directory are the analogs.

**Sibling-file convention from `clusters/homelab/image-automation/image-update-automation.yaml:1-10`:**
```yaml
---
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageUpdateAutomation
metadata:
  name: homelab-images
spec:
  interval: 6h
  sourceRef:
    kind: GitRepository
    name: flux-system
```

Note `metadata.namespace:` is OMITTED — inherited from `clusters/homelab/image-automation/kustomization.yaml:4` (`namespace: flux-system`). Phase 26 NEW file at `clusters/homelab/image-automation/ghcr-pull-secret.yaml` should follow this convention: omit `metadata.namespace` and let the kustomization apply it.

**Sibling file `clusters/homelab/image-automation/kustomization.yaml` (full, 10 lines):**
```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

namespace: flux-system

resources:
  - image-repositories.yaml
  - image-policies.yaml
  - image-update-automation.yaml
```

**Label discretion (per CONTEXT):** Use `app.kubernetes.io/component: image-automation` instead of `secrets` for this flux-system-scoped ESO. No exact label-set analog exists in `clusters/homelab/image-automation/` (the Flux CRs there carry only `metadata.name`); the `app.kubernetes.io/component:` value is a Phase 26 judgment call (CONTEXT explicitly delegates to Claude). Suggested labels:
```yaml
  labels:
    app: hudsonfam
    app.kubernetes.io/name: hudsonfam
    app.kubernetes.io/component: image-automation
```

**Vault data block:** identical to File 1 (same `key: ghcr-pull-credentials`, same two `property:` lookups). PAT rotation = single vault update propagates to BOTH ExternalSecrets within `refreshInterval: 1h`.

**Difference from File 1:**
- `metadata.namespace`: OMITTED (inherited as `flux-system` via kustomization)
- `metadata.labels.app.kubernetes.io/component`: `image-automation` (not `secrets`)
- Everything else IDENTICAL to File 1 byte-for-byte (same target.template, same data block) — this is the explicit point of the "two ExternalSecrets, same vault key" decision (CONTEXT D-04).

---

### File 3 — `clusters/homelab/image-automation/image-repositories.yaml` lines 161-170 (MODIFIED)

**Closest analog:** The block ITSELF (mutate in place per CONTEXT D-05). No "after" example exists in the file because Phase 26 introduces the FIRST authenticated GHCR ImageRepository.

**Current block to mutate (verbatim, lines 161-170):**
```yaml
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageRepository
metadata:
  name: hudsonfam
spec:
  image: git.homelab/forgejo-admin/hudsonfam
  interval: 6h
  insecure: true
  secretRef:
    name: forgejo-registry-creds
```

**Reference for shape after mutation — the unauthenticated GHCR analog at `image-repositories.yaml:153-159` (recyclarr) shows what a clean GHCR entry looks like:**
```yaml
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageRepository
metadata:
  name: recyclarr
spec:
  image: ghcr.io/recyclarr/recyclarr
  interval: 6h
```

**Reference for the secretRef-bearing shape — also the current block itself (the only `secretRef:` user in the entire file):** see verbatim above.

**Mutations to apply (lock by CONTEXT D-05):**
- `spec.image`: `git.homelab/forgejo-admin/hudsonfam` → `ghcr.io/hudsor01/hudsonfam`
- `spec.insecure: true`: REMOVE the entire line (GHCR has valid TLS)
- `spec.secretRef.name`: `forgejo-registry-creds` → `ghcr-pull-credentials`
- `spec.interval: 6h`: UNCHANGED (matches every other ImageRepository in the file — file convention)
- `metadata.name: hudsonfam`: UNCHANGED (preserves linkage to `image-policies.yaml:258` ImagePolicy ref)

**File-section ordering:** This block lives in the `# === GitHub Container Registry (ghcr.io) ===` section (header at line 151). Post-mutation, the `spec.image: ghcr.io/...` is now consistent with the section header. No reordering needed.

---

### File 4 — `clusters/homelab/image-automation/kustomization.yaml` (MODIFIED)

**Closest analog:** The file ITSELF (add one entry to `resources:`).

**Current state (verbatim, full file):**
```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

namespace: flux-system

resources:
  - image-repositories.yaml
  - image-policies.yaml
  - image-update-automation.yaml
```

**Mutation:** Append `- ghcr-pull-secret.yaml` to the `resources:` list. Existing file ordering is "logical" (repositories → policies → automation) rather than alphabetical; appending at the end is the cleanest insertion point. Suggested final state:
```yaml
resources:
  - image-repositories.yaml
  - image-policies.yaml
  - image-update-automation.yaml
  - ghcr-pull-secret.yaml
```

(Alternative: insert above `image-repositories.yaml` so the secret materializes first when Flux applies the kustomization — but Flux applies the entire kustomization atomically, so the dependency-order argument is moot. CONTEXT D-09 handles the cross-commit race separately via the two-commit PR strategy.)

---

### File 5 — `apps/hudsonfam/kustomization.yaml` (MODIFIED)

**Closest analog:** The file ITSELF (mutate-in-place: add one entry to `resources:` AND flip `images[0].name`).

**Current state (verbatim, full file, 13 lines):**
```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
namespace: homepage
resources:
  - pvc-thumbnails.yaml
  - pvc-data.yaml
  - external-secret.yaml
  - deployment.yaml
  - service.yaml
  - httproute.yaml
images:
  - name: git.homelab/forgejo-admin/hudsonfam
    newTag: "20260417202843" # {"$imagepolicy": "flux-system:hudsonfam:tag"}
```

**Mutations:**
- `resources:` — append `- ghcr-pull-secret.yaml`. Suggested insertion point: right after `external-secret.yaml` (line 7) to keep both ExternalSecrets adjacent in the resource list:
  ```yaml
  resources:
    - pvc-thumbnails.yaml
    - pvc-data.yaml
    - external-secret.yaml
    - ghcr-pull-secret.yaml
    - deployment.yaml
    - service.yaml
    - httproute.yaml
  ```
- `images[0].name`: `git.homelab/forgejo-admin/hudsonfam` → `ghcr.io/hudsor01/hudsonfam`
- `images[0].newTag`: SET to a valid existing GHCR tag at edit time (CONTEXT D-07: latest YYYYMMDDHHmmss visible in GHCR, OR fall back to `20260408173607` if no Phase-25 build has completed yet). Flux ImageUpdateAutomation will overwrite this within 6h regardless.
- The `# {"$imagepolicy": "flux-system:hudsonfam:tag"}` setter comment: UNCHANGED (Phase 26 makes ZERO edits to setter comments per CONTEXT carry-forward)

---

### File 6 — `apps/hudsonfam/deployment.yaml` lines 36, 127-128 (MODIFIED)

**Closest analog:** The file ITSELF (mutate two specific lines; setter comment plumbing already correct).

**Current line 36 (verbatim):**
```yaml
          image: git.homelab/forgejo-admin/hudsonfam:20260417202843 # {"$imagepolicy": "flux-system:hudsonfam"}
```

**Mutation:** Replace `git.homelab/forgejo-admin/hudsonfam:20260417202843` with `ghcr.io/hudsor01/hudsonfam:<initial-ghcr-tag>` where `<initial-ghcr-tag>` matches the value chosen in File 5 `images[0].newTag` (must agree per CONTEXT D-08 rationale). Keep the setter comment ` # {"$imagepolicy": "flux-system:hudsonfam"}` byte-for-byte intact (single space before `#`, no trailing space).

**Current lines 127-128 (verbatim):**
```yaml
      imagePullSecrets:
        - name: forgejo-registry-creds
```

**Mutation:** Line 128 only — change `forgejo-registry-creds` → `ghcr-pull-credentials`. Line 127 (`imagePullSecrets:`) untouched. Final state:
```yaml
      imagePullSecrets:
        - name: ghcr-pull-credentials
```

**Anchoring values that MUST stay aligned across files post-mutation:**
- The image NAME in `kustomization.yaml:images[0].name` (File 5) MUST equal the image-name portion of `deployment.yaml:image:` (File 6, line 36) — kustomize's image-override mechanism uses string match on the name. Both must read `ghcr.io/hudsor01/hudsonfam`.
- The Secret name in `deployment.yaml:imagePullSecrets[0].name` (File 6, line 128) MUST equal the Secret name materialized by File 1 ExternalSecret (`spec.target.name: ghcr-pull-credentials`). Both must read `ghcr-pull-credentials`.
- The Secret name in `image-repositories.yaml:secretRef.name` (File 3, post-mutation) MUST equal the Secret name materialized by File 2 ExternalSecret (`spec.target.name: ghcr-pull-credentials`). Both must read `ghcr-pull-credentials`.

---

## Convention Summary (homelab-repo-wide patterns the new files must honor)

| Convention | Source of Truth | Applied To |
|------------|-----------------|------------|
| ExternalSecret apiVersion = `external-secrets.io/v1` | All 11 ExternalSecrets in repo (e.g., `apps/hudsonfam/external-secret.yaml:1`, `apps/ai/qdrant/external-secret.yaml:1`) | Files 1, 2 |
| `spec.secretStoreRef.name: kubernetes-secrets` + `kind: ClusterSecretStore` | All 11 ExternalSecrets — universal pattern | Files 1, 2 |
| `spec.refreshInterval: 1h` | All 11 ExternalSecrets — universal pattern | Files 1, 2 |
| `spec.target.creationPolicy: Owner` | All 11 ExternalSecrets — universal pattern | Files 1, 2 |
| `metadata.name == spec.target.name` (vault-secret name and K8s-secret name match) | Every ExternalSecret in the repo | Files 1, 2 (`ghcr-pull-credentials` for both fields) |
| Label triple `app:` / `app.kubernetes.io/name:` / `app.kubernetes.io/component:` | `apps/hudsonfam/external-secret.yaml:6-9` (most explicit example); also `apps/media/arr-stack/base/external-secret.yaml:6-9` | File 1 (component: `secrets`); File 2 (component: `image-automation`) |
| `clusters/homelab/image-automation/*.yaml` files OMIT `metadata.namespace:` (kustomization sets `namespace: flux-system`) | `image-repositories.yaml`, `image-policies.yaml`, `image-update-automation.yaml` — none of them set `metadata.namespace:` | File 2 (omit `metadata.namespace:`) |
| ImageRepository `interval: 6h` | All 17 ImageRepository entries in `image-repositories.yaml` | File 3 (preserve unchanged) |
| Setter-comment grammar `# {"$imagepolicy": "<ns>:<name>[:<field>]"}` | `apps/hudsonfam/kustomization.yaml:13`, `apps/hudsonfam/deployment.yaml:36` | Files 5, 6 (NO edits — preserve byte-for-byte) |
| ImagePolicy regex `^\d{14}$` for YYYYMMDDHHmmss tags | `clusters/homelab/image-automation/image-policies.yaml:263` | NOT mutated this phase — referenced for verification only |
| `apps/hudsonfam/kustomization.yaml` resource ordering: PVCs → secrets → workload → networking | Lines 5-10 of current file | File 5 (insert new ExternalSecret in the "secrets" cluster, after `external-secret.yaml`) |
| `clusters/homelab/image-automation/kustomization.yaml` resource ordering: logical (repositories → policies → automation), NOT alphabetical | Lines 7-9 of current file | File 4 (append new ExternalSecret at end) |

---

## Pattern Gaps (NEW patterns being established this phase — flag clearly)

### Gap 1 — `kubernetes.io/dockerconfigjson`-typed ExternalSecret with `spec.target.template`

**Status:** ZERO existing ExternalSecrets in the homelab repo use `spec.target.template` to reconstruct a typed Secret. All 11 existing ExternalSecrets create plain `Opaque` Secrets via `data:` mappings only (verified via grep across `/home/dev-server/homelab/apps/**/external*secret*.yaml`).

**Verified gap evidence:**
- `grep -rn "type: kubernetes.io/dockerconfigjson"` against `/home/dev-server/homelab/apps/**/*.yaml` → 0 results
- `grep -rn "template:"` against the same path, scoped to ExternalSecret YAMLs → 0 results
- The existing `forgejo-registry-creds` Secret (still referenced by `apps/hudsonfam/deployment.yaml:128` and `image-repositories.yaml:170`) was created MANUALLY (not via ExternalSecret) per `.planning/phases/43-platform-cutover/43-RESEARCH.md:419` and `43-VERIFICATION.md:68`.

**Source of truth for the new pattern:** ExternalSecrets v1 official templating guide — <https://external-secrets.io/latest/guides/templating/>. The dockerconfigjson reconstruction pattern from CONTEXT D-03 follows the canonical sprig-templating example from that page (`b64enc`, `printf "%s:%s"`).

**Template block to use (from CONTEXT D-03, verbatim):**
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

**Implication for planner:** This is the FIRST templating ExternalSecret in the homelab repo. Plan should:
1. Cite the canonical ExternalSecrets v1 docs URL above as the syntax source-of-truth (no internal analog to copy from)
2. Add a verification step that the materialized Secret is BOTH the right `type:` (`kubernetes.io/dockerconfigjson`, not `Opaque`) AND has a parseable `.dockerconfigjson` JSON payload — e.g., `kubectl get secret ghcr-pull-credentials -n homepage -o jsonpath='{.type}'` should output `kubernetes.io/dockerconfigjson`, and `kubectl get secret ghcr-pull-credentials -n homepage -o jsonpath='{.data.\.dockerconfigjson}' | base64 -d | jq .` should produce valid JSON with `.auths."ghcr.io".username == "hudsor01"`.
3. Note in SUMMARY that subsequent ExternalSecret rewrites of similar manually-created Secrets in the cluster (e.g., other dockerconfigjson Secrets, future TLS-secret ExternalSecrets) can copy from THIS file as their canonical homelab-repo analog. This phase establishes the template; future phases reuse it.

### Gap 2 — First authenticated GHCR ImageRepository in `image-repositories.yaml`

**Status:** All other GHCR entries (`recyclarr` line 156, `seerr` line 104) are anonymous — no `secretRef`. The Phase 26 mutation produces the first authenticated GHCR ImageRepository. The `secretRef:` shape itself is established (the current Forgejo block uses it, lines 169-170), but no other GHCR-targeted ImageRepository in this file uses it. Plan should NOT introduce a separate "GHCR-authenticated" section header — the `# === GitHub Container Registry (ghcr.io) ===` header at line 151 already covers it; auth is per-block, not per-section.

### Gap 3 — Two-namespace pull-secret materialization

**Status:** No existing pattern in the homelab repo for materializing the SAME logical Secret in two namespaces from one vault key. Files 1 + 2 establish this pattern via "two ExternalSecrets, same `data:` block". CONTEXT D-04 explicitly chose this over installing a Reflector/Replicator operator. Future homelab work that needs the same Secret in N namespaces should copy from Files 1 + 2 — N copies, one vault key. Trade-off: 6 extra YAML lines per copy vs. one new operator dependency.

---

## File Created

`/home/dev-server/hudsonfam/.planning/phases/26-flux-reconfiguration/26-PATTERNS.md`

## Ready for Planning

Pattern mapping complete. Planner can now:
1. Cite `apps/hudsonfam/external-secret.yaml:1-17` as the structural skeleton for Files 1 + 2.
2. Cite `apps/ai/litellm/externalsecret.yaml:21-32` as the analog for the two-property remoteRef pattern.
3. Cite `clusters/homelab/image-automation/image-update-automation.yaml:1-10` as the convention proof for omitting `metadata.namespace:` in File 2.
4. Cite the External Secrets v1 docs URL (<https://external-secrets.io/latest/guides/templating/>) as the source-of-truth for the dockerconfigjson template block (no internal analog).
5. Use the verbatim "current state" excerpts of Files 3, 4, 5, 6 as the before-state for surgical edit instructions.
6. Lock the cross-file string-equality invariants documented in File 6 (image name match, Secret name match) into plan acceptance criteria.
