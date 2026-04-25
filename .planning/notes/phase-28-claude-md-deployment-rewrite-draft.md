# Phase 28 §Deployment rewrite — draft

**Status:** DRAFT (Phase 28 deliverable per CICD-11; written ahead during Phase 27 executor wait time)
**Target file:** `/home/dev-server/hudsonfam/CLAUDE.md` §Deployment (lines 141-163 currently)
**Owned by:** Phase 28 (CICD-11) — DO NOT apply this draft from Phase 27; this is a head-start artifact
**Sources of truth at draft time:** Phase 25 SUMMARY (workflow file shipped), Phase 26 SUMMARY (Flux + ESO live), Phase 27 plan (cleanup), Plan 25-01 hotfix detour (bun.lock regen pattern), live cluster state 2026-04-25

---

## Proposed replacement text for CLAUDE.md §Deployment

```markdown
## Deployment

```
Push to main (GitHub) → GitHub Actions builds Docker image → GHCR
  → Flux ImageRepository scans GHCR every 6h
  → Flux ImagePolicy promotes newest YYYYMMDDHHmmss tag
  → Flux ImageUpdateAutomation rewrites tag in homelab manifests repo (Forgejo)
  → Flux Kustomization reconciles → K3s rolls hudsonfam Deployment
```

- **Pipeline definition:** `.github/workflows/build-and-push.yml` — single-job workflow (`docker/build-push-action@v5` with `type=gha,mode=max` cache); triggers on `push.branches: [main]` + `workflow_dispatch`; builds in 2-6 min on warm cache.
- **Image registry:** `ghcr.io/hudsor01/hudsonfam` (public package); built-in `GITHUB_TOKEN` for push (no PAT needed for same-repo push).
- **Image tags:** `YYYYMMDDHHmmss` UTC timestamp + `latest` per build (Flux ImagePolicy filters on regex `^\d{14}$` and picks the highest numerical value).
- **Cluster pull credentials:** `ghcr-pull-credentials` Secret (`kubernetes.io/dockerconfigjson` type) materialized in BOTH `homepage` (kubelet pull) and `flux-system` (ImageRepository scan auth) namespaces via two ExternalSecrets sharing a single vault key. Vault key holds `username: hudsor01` + `pat: <classic PAT, scope read:packages, 1-year expiry>`. ExternalSecrets `spec.target.template` reconstructs dockerconfigjson from those two raw fields at sync time. PAT rotation = single vault-write event; both Secrets resync within `refreshInterval: 1h`.
- **Manifest source:** homelab manifests repo (`dev-projects/homelab` on Forgejo SSH at `192.168.4.236:30022`); Flux source-controller polls every 1 min. ImageUpdateAutomation commits tag bumps as user `Flux Image Automation` to `main` directly. Hudsonfam-specific manifests live at `apps/hudsonfam/` (Deployment + Service + HTTPRoute + 2 PVCs + ExternalSecret + GHCR pull-secret ExternalSecret).
- **Namespace:** `homepage`. **Volumes:** NFS mount for photo originals (writable, NFS server `192.168.4.164`), local-path PVCs for thumbnails + Next.js cache. **Secrets:** ExternalSecrets from `secrets` namespace via `kubernetes-secrets` ClusterSecretStore (raw K8s Secrets, not external vault).
- **Public URL:** <https://thehudsonfam.com> via Cloudflare Tunnel.

### Manual deploy + reconcile

```bash
# Force a fresh GHCR scan (e.g., after a manual workflow_dispatch)
flux reconcile source git flux-system
flux reconcile image repository hudsonfam -n flux-system

# Force ImageUpdateAutomation to re-evaluate setters
flux reconcile image update homelab-images -n flux-system

# Force kustomization apply (picks up image update commit)
flux reconcile kustomization hudsonfam

# If quota blocks rolling update (rare):
kubectl scale deployment hudsonfam -n homepage --replicas=0
kubectl scale deployment hudsonfam -n homepage --replicas=1
```

### Top failure modes + mitigations (from Phase 25/26/27 lessons)

1. **Stale `bun.lock` rejected by `bun install --frozen-lockfile`** — Dockerfile uses bun + frozen-lockfile; if recent `npm install --legacy-peer-deps` updates `package.json` without regenerating `bun.lock`, the build fails at the deps stage in ~45s. **Fix:** run `bun install` locally to regen the lockfile; commit + push. Symptom: GitHub Actions step "Build and push" fails with `process "/bin/sh -c bun install --frozen-lockfile" did not complete successfully: exit code: 1`. Established as a recurring failure mode after Phase 25 first-build gotcha.

2. **GHCR PAT expiry** — classic PAT expires 1 year from generation (~2027-04-24 for current PAT). Set calendar reminder 2 weeks pre-expiry. **Fix:** generate new classic PAT under owner account, scope `read:packages`, then `kubectl create secret generic ghcr-pull-credentials -n secrets --from-literal=username='hudsor01' --from-literal=pat='<NEW>' --dry-run=client -o yaml | kubectl apply -f -`. Both ExternalSecrets resync within `refreshInterval: 1h` (or force via `kubectl annotate externalsecret ghcr-pull-credentials -n <ns> force-sync=$(date +%s) --overwrite`).

3. **Cluster ESO/Flux CRD vs docs version mismatch** — Some fields documented in upstream library docs may not exist in the installed CRD schema. Examples seen: ESO 2.1.0 rejected `spec.target.type` (canonical type stays in `spec.target.template.type`); Flux ImagePolicy CRD uses `status.latestRef.{name,tag}` not docs-stated `status.latestImage`. **Fix:** validate any new manifest's field paths against `kubectl explain <resource>.<path>` before assuming docs are current. See `.planning/intel/crd-vs-docs-mismatch-pattern.md`.

### Pre-push hook (one-time per clone)

```bash
./scripts/install-hooks.sh
```

Installs a native git pre-push hook that runs `npm run test:schema` (queries `information_schema.columns` against the live n8n DB to detect schema drift in `src/lib/jobs-db.ts` queries). Skips cleanly with a non-failure warning when `JOBS_DATABASE_URL` is unset (e.g., on hosts without DB access — pushes still complete).
```

---

## Diff vs current §Deployment (lines 141-163)

**Adds:**
- Full pipeline diagram with all 5 stages (vs current 3-line diagram)
- Pipeline definition reference (`build-and-push.yml`)
- Cluster pull credentials provenance (the Phase 26 ESO pattern)
- PAT rotation procedure (operational know-how from Phase 26 D-01 + Wave 0)
- Public URL + Cloudflare Tunnel mention
- 3 failure modes with concrete fixes (per CICD-11 SC: "top-3 failure modes + mitigations")
- Pre-push hook reference (currently mentioned in §Commands but not §Deployment)

**Removes:**
- "If quota blocks" comment moved into the Manual section (kept as operational note)
- The pipeline diagram is rewritten end-to-end to match reality (was missing ImagePolicy + ImageUpdateAutomation steps)

**Preserves:**
- Image tags format (`YYYYMMDDHHmmss`)
- Namespace (`homepage`)
- Volumes (NFS + PVCs)
- Secrets pattern (ExternalSecrets via ClusterSecretStore)
- The 4 `flux reconcile` commands

---

## Open items for Phase 28 to confirm before applying

1. **Verify the actual values in the rewrite are still correct at Phase 28 execution time** (especially: PAT expiry date, cache mode, GHCR visibility, NFS server IP, Forgejo SSH endpoint).
2. **Add CICD-13 retroactive UAT outcomes** to a separate "Recent verifications" subsection if needed (or leave that for SUMMARY artifacts).
3. **Decide on tone:** current CLAUDE.md is terse; this draft is more verbose. Trim if owner prefers.
4. **Consider mentioning the Phase 26 ESO templated-dockerconfigjson pattern** in the broader §Deployment context since it's the first such pattern in the homelab repo (per `.planning/intel/crd-vs-docs-mismatch-pattern.md` and Phase 26 PATTERNS.md Gap 1).

---

*Draft created during Phase 27 executor wait time on 2026-04-25. Apply via Phase 28 (CICD-11). Validate every claim against live cluster + repo state at Phase 28 execution time before committing.*
</content>
</invoke>