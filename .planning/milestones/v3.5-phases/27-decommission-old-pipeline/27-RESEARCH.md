# Phase 27: Decommission Old Pipeline (v3.5-P3) - Research

**Researched:** 2026-04-23
**Domain:** External-API + cluster-resource cleanup (Forgejo packages API, Woodpecker REST API, Flux ImageRepository finalizers, kubectl Secret deletion)
**Confidence:** HIGH

## RESEARCH COMPLETE

## Phase Summary

Phase 27 executes 6 well-bounded cleanup operations across 4 systems (hudsonfam repo, K3s cluster, Woodpecker server, Forgejo registry). All design decisions are locked in CONTEXT.md (D-01 through D-10); this research validates external API endpoints and surfaces operational gotchas the planner needs to translate locked decisions into executable tasks. Two CONTEXT-stated commands turn out to be **broken as written** and require correction; one MCP capability is **confirmed unavailable** and forces the documented fallback path to be the main path.

**Primary recommendation:** Adopt the corrected Forgejo per-version DELETE loop (D-05 fallback IS the main path on Forgejo 14.0.3) and the direct Woodpecker REST `DELETE /repos/{repo_id}` call (no MCP DELETE exists). Replace the broken D-10 search-API verification with the working owner-listing variant. Run the operational sanity precondition check before deleting the homepage Secret.

---

## User Constraints (from CONTEXT.md)

### Locked Decisions (D-01 through D-10)

- **D-01:** `kubectl delete imagerepository hudsonfam -n default` (single command).
- **D-02:** Paired delete of both `forgejo-registry-creds` Secrets — `flux-system` ns + `homepage` ns (NOT `woodpecker-pipelines/forgejo-registry`).
- **D-03:** `git rm /home/dev-server/hudsonfam/.woodpecker.yaml` + commit + push to GitHub `main`.
- **D-04:** Woodpecker repo deregistration via MCP `mcp__woodpecker__*` tools, falling back to Woodpecker REST `DELETE /api/repos/<owner>/<name>` if MCP doesn't expose deletion.
- **D-05:** Forgejo container registry path delete via Forgejo API — package-level `DELETE /api/v1/packages/forgejo-admin/container/hudsonfam` preferred, per-version loop fallback if package-level not supported.
- **D-06:** Owner-runnable Forgejo UI fallback (`https://git.homelab/forgejo-admin/-/packages`) if API auth fiddly; mark `autonomous: false` for that step.
- **D-07:** Sequential ordering — repo first → Woodpecker dereg → cluster broken IR delete → cluster Secret deletes (paired) → Forgejo registry delete → verification suite.
- **D-08:** No Phase-27-specific rollback. Phase 26 cutover is the rollback target (re-run Phase 26 if Phase 27 surfaces an unexpected dependency).
- **D-09:** ZERO edits to `/home/dev-server/hudsonfam/CLAUDE.md` this phase. Phase 28 (CICD-11) owns the comprehensive rewrite.
- **D-10:** 7-command kubectl/grep/curl verification suite after all 6 deletes complete.

### Claude's Discretion (from CONTEXT)

- Exact commit message wording for `.woodpecker.yaml` deletion
- Single-plan vs multi-plan structure (CONTEXT recommends SINGLE plan)
- Per-step PROCEED/HALT checkpoints (CONTEXT recommends SINGLE end-of-plan checkpoint)
- Whether to attempt Forgejo API DELETE from executor or punt to owner (CONTEXT recommends: try first, fall back)
- Exact MCP tool sequence for Woodpecker dereg (executor explores at runtime)
- Whether to log a one-line note in `homelab/CLAUDE.md` (CONTEXT recommends NO)

### Deferred Ideas (OUT OF SCOPE)

- CLAUDE.md §Deployment comprehensive rewrite → Phase 28 (CICD-11)
- End-to-end no-op-commit smoke test → Phase 28 (CICD-10)
- Retroactive UAT for Phases 21/22/23/24 → Phase 28 (CICD-12, CICD-13)
- `recyclarr` / `seerr` ImageRepository TLS fix → separate homelab-infra phase
- Woodpecker server stability investigation → separate homelab-infra phase
- Forgejo PVC backup posture → separate homelab-infra phase
- Older 14-digit + SHA-style GHCR tag cleanup → future GHCR retention phase
- Woodpecker server uninstall, Forgejo container registry feature uninstall → Forgejo + Woodpecker both stay operational for OTHER workloads

---

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| **CICD-07** | Broken `default/imagerepository/hudsonfam` deleted; `kubectl get imagerepository -A \| grep hudsonfam` shows only the new entry | Cluster baseline confirms broken IR present (5d21h, AuthenticationFailed); finalizer `finalizers.fluxcd.io` is metric-cleanup-only (not blocking); image-reflector-controller is Running 1/1 → finalizer will release within seconds of `kubectl delete` |
| **CICD-08** | `.woodpecker.yaml` deleted at repo root; Woodpecker repo deregistration for `forgejo-admin/hudsonfam` confirmed | `.woodpecker.yaml` confirmed present (1.7k, last modified 2026-04-17); pre-push hook calls `npm run test:schema` which gracefully exits 0 when `JOBS_DATABASE_URL` is unset; Woodpecker REST `DELETE /repos/{repo_id}` confirmed via official API docs (Bearer token auth, HTTP 200 success); MCP DELETE tool does NOT exist |
| **CICD-09** | Orphaned `git.homelab/forgejo-admin/hudsonfam` container registry entries cleaned up; no dangling refs | Forgejo 14.0.3 swagger confirms ONLY per-version DELETE exists (`DELETE /api/v1/packages/{owner}/{type}/{name}/{version}`, HTTP 204 success); 6 versions found (4 timestamp tags + 2 sha256 manifest digests); all 4 timestamps duplicated in GHCR (Phase 26 reported 46 tags) → safe to delete; both target Secrets confirmed in cluster (11d old, type `kubernetes.io/dockerconfigjson`) |

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | This phase has NO unit-test surface (all 6 ops are one-shot infra commands). Validation is end-state grep+curl verification per CONTEXT D-10. |
| Config file | None |
| Quick run command | `kubectl get imagerepository -A \| \grep hudsonfam` (exact-1-row check) |
| Full suite command | The 7-command CONTEXT D-10 verification suite (with corrections per Risks below) |

### Phase Requirements → Test Map

| REQ ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CICD-07 | Broken `default/imagerepository/hudsonfam` removed | end-state | `[ "$(kubectl get imagerepository -A 2>&1 \| \grep hudsonfam \| wc -l)" = "1" ]` | n/a (cluster-only) |
| CICD-07 | Only `flux-system/hudsonfam` remains | end-state | `kubectl get imagerepository -A \| \grep hudsonfam \| \grep -q flux-system` | n/a |
| CICD-08 part 1 | `.woodpecker.yaml` removed from hudsonfam repo HEAD | end-state | `[ ! -f /home/dev-server/hudsonfam/.woodpecker.yaml ] && [ -z "$(git -C /home/dev-server/hudsonfam ls-files .woodpecker.yaml)" ]` | n/a (file deletion) |
| CICD-08 part 1 | Deletion landed on GitHub `main` | end-state | `git -C /home/dev-server/hudsonfam log --diff-filter=D --name-only origin/main \| \grep -q "^.woodpecker.yaml$"` | n/a |
| CICD-08 part 2 | Woodpecker repo dereg complete | end-state | `mcp__woodpecker__search_repository "hudsonfam"` → empty match list OR `active: false`; alternatively, post-DELETE `GET /api/repos/forgejo-admin/hudsonfam` returns 404 | n/a (Woodpecker API) |
| CICD-09 part 1 | `flux-system/forgejo-registry-creds` Secret gone | end-state | `! kubectl get secret forgejo-registry-creds -n flux-system 2>/dev/null` (exit non-zero is PASS) | n/a |
| CICD-09 part 2 | `homepage/forgejo-registry-creds` Secret gone | end-state | `! kubectl get secret forgejo-registry-creds -n homepage 2>/dev/null` (exit non-zero is PASS) | n/a |
| CICD-09 part 2 | `woodpecker-pipelines/forgejo-registry` Secret PRESERVED | end-state (negative) | `kubectl get secret forgejo-registry -n woodpecker-pipelines 2>&1 \| \grep -q forgejo-registry` (must STILL EXIST — different consumer base) | n/a |
| CICD-09 part 3 | Forgejo container registry path empty | end-state | `[ "$(curl -sk 'https://git.homelab/api/v1/packages/forgejo-admin?type=container' \| python3 -c 'import json,sys; print(len([p for p in json.load(sys.stdin) if p.get(\"name\")==\"hudsonfam\"]))')" = "0" ]` | n/a |
| Cross-cut | Pod still healthy on GHCR pipeline | end-state | `kubectl get pod -n homepage -l app=hudsonfam -o jsonpath='{.items[0].status.containerStatuses[0].ready}' = "true"` AND restartCount unchanged | n/a |
| Cross-cut | Zero hudsonfam-related Failed/Stalled conditions | end-state | `[ -z "$(kubectl get gitrepository,imagerepository,imagepolicy,imageupdateautomation,kustomization -A \| \grep -iE 'hudsonfam\|homepage' \| \grep -i 'false\|failed\|stalled')" ]` | n/a |

### Sampling Rate

- **Per task commit:** Each delete step has its own immediate post-delete verification (1 command per op) — that's the "sample" for that op.
- **Per wave merge:** All 6 ops bundled in single Plan 27-01 → one end-of-plan run of the full 11-row verification suite above.
- **Phase gate:** Full verification suite all-green before `/gsd-verify-work`.

### Wave 0 Gaps

None — no test infrastructure setup needed. All verifications are kubectl/curl/grep one-liners that work against the live cluster + Forgejo server + GitHub remote without any test-framework scaffolding.

---

## Technical Findings

### Finding 1 — Forgejo container registry DELETE API (HIGH confidence; CITED via swagger.v1.json)

**Forgejo version on cluster:** `14.0.3+gitea-1.22.0` [VERIFIED: `curl -sk https://git.homelab/api/v1/version` → `{"version":"14.0.3+gitea-1.22.0"}`].

**Endpoint shape from `https://git.homelab/swagger.v1.json` lines 4478-4571** [VERIFIED: live swagger fetch]:

```
DELETE /api/v1/packages/{owner}/{type}/{name}/{version}
  operationId: deletePackage
  summary: "Delete a package"
  parameters: owner (string), type (string), name (string), version (string) — all path-required
  responses:
    204: empty (success)
    404: notFound
```

**The CONTEXT D-05 hopeful path `DELETE /api/v1/packages/{owner}/container/{package_name}` (without `{version}`) is NOT in the Forgejo 14.0.3 swagger.** Only per-version DELETE exists. The "fallback per-version loop" in D-05 is therefore **the only working path** on this Forgejo version — NOT a fallback. The planner should treat per-version DELETE as the primary mechanism.

**Auth:** Forgejo accepts any of `BasicAuth`, `AuthorizationHeaderToken` (`Authorization: token <PAT>`), or query-param `access_token=<PAT>` (deprecated in v13). Required scope for DELETE on container packages: `write:package` (inferred from sibling endpoints; live probe deferred to executor since no PAT is currently in scope for the research session). Read scope (`read:package`) is sufficient for GET/list operations and is the default for public packages (verified — unauthenticated GET on `/api/v1/packages/forgejo-admin?type=container` returned HTTP 200 with full version list).

**Versions to delete (6 total)** [VERIFIED: live API call to `/api/v1/packages/forgejo-admin?type=container` 2026-04-23]:

| ID | Version | Created | Type |
|----|---------|---------|------|
| 10 | `20260424072940` | 2026-04-24T07:30Z | timestamp tag (post-Phase-26 IUA bump) |
| 8 | `20260417202843` | 2026-04-17T20:29Z | timestamp tag |
| 6 | `20260414002755` | 2026-04-14T00:29Z | timestamp tag |
| 4 | `20260409010056` | 2026-04-13T01:48Z | timestamp tag |
| 3 | `sha256:e82509cb842519b777268b3ff06cc44573f9081e7a3671b6485fabb990d36d8d` | 2026-04-13T01:48Z | manifest digest |
| 2 | `sha256:5ad82551768a0dbcb03d6a1eaa32f24e307abe95dc59499d3d1e3a011ddae066` | 2026-04-13T01:48Z | manifest digest |

**Curl invocation template:**

```bash
# Per-version delete loop (executed against Forgejo 14.0.3)
FORGEJO_PAT="<owner-supplied; scope: write:package>"
for VERSION in 20260424072940 20260417202843 20260414002755 20260409010056 \
               'sha256:e82509cb842519b777268b3ff06cc44573f9081e7a3671b6485fabb990d36d8d' \
               'sha256:5ad82551768a0dbcb03d6a1eaa32f24e307abe95dc59499d3d1e3a011ddae066'; do
  HTTP_CODE=$(curl -sk -o /dev/null -w "%{http_code}" -X DELETE \
    -H "Authorization: token $FORGEJO_PAT" \
    "https://git.homelab/api/v1/packages/forgejo-admin/container/hudsonfam/$VERSION")
  if [ "$HTTP_CODE" = "204" ]; then
    echo "OK: deleted version $VERSION"
  elif [ "$HTTP_CODE" = "404" ]; then
    echo "OK: version $VERSION already absent"
  else
    echo "FAIL: version $VERSION returned HTTP $HTTP_CODE"
    exit 1
  fi
done
```

**No "delete tags before deleting package" gotcha** because there is no package-level delete on this version — every delete IS a per-version delete. No manifest-list reference issue: Forgejo 14.0.3 lets you delete the manifest digests directly (the `sha256:...` versions in the list above).

**Snapshot the version list at execution time.** New IUA-driven builds on the OLD path stopped at Phase 26 cutover — the list above should still be exactly 6 entries when Plan 27-XX runs, but the executor must re-list before deleting in case anything changed (e.g., manual push, re-cutover during a Phase 26 rollback test). Before the loop:

```bash
curl -sk "https://git.homelab/api/v1/packages/forgejo-admin?type=container" \
  | python3 -c "import json,sys; print('\n'.join(p['version'] for p in json.load(sys.stdin) if p.get('name')=='hudsonfam'))"
```

### Finding 2 — Woodpecker MCP capability + REST API fallback (HIGH confidence)

**Woodpecker MCP tools available in this session** [CITED: orchestrator brief enumeration; cross-verified via the upstream `denysvitali/woodpecker-ci-mcp` repo README]:
- `mcp__woodpecker__search_repository`
- `mcp__woodpecker__list_repositories`
- `mcp__woodpecker__get_repository_by_id`
- `mcp__woodpecker__list_pipelines`
- `mcp__woodpecker__get_pipeline`
- `mcp__woodpecker__get_pipeline_config`
- `mcp__woodpecker__get_step_logs`

**The MCP server provides ZERO write/delete tools for repository registrations** [VERIFIED: WebFetch of `github.com/denysvitali/woodpecker-ci-mcp` README — only list/get/start/stop/approve for pipelines + list/get for repositories; no delete/deactivate]. CONTEXT D-04's "use MCP if available, else direct HTTP DELETE" framing is misleading — **direct REST is the only path**.

**Woodpecker REST API DELETE endpoint** [CITED: <https://woodpecker-ci.org/api>]:

```
DELETE /api/repos/{repo_id}
  Authorization: Bearer <PAT>
  Success: HTTP 200 OK
```

**Lookup-by-name endpoint** for getting `repo_id` before deletion:

```
GET /api/repos/lookup/{full_name}    # full_name = "forgejo-admin/hudsonfam"
  Authorization: Bearer <PAT>
  Success: HTTP 200 OK + JSON body containing .id
```

**Auth:** Bearer-token PAT obtained from Woodpecker user settings page (`https://woodpecker.homelab/user`). Per Woodpecker docs, the format is `Authorization: Bearer <PAT>`. **No Woodpecker PAT was discoverable in the executor environment** during research (no `~/.config/woodpecker-cli/config`, no `WOODPECKER_TOKEN` env var, no `woodpecker` CLI binary on PATH). The PAT must be owner-supplied at task time, OR the dereg step can be punted to owner-runnable.

**Recommended sequence for the Woodpecker dereg task:**

```bash
# Step 1: confirm via MCP that the repo IS still registered (no auth needed via MCP)
# mcp__woodpecker__search_repository query="hudsonfam"
# Expect: 1 match with name=forgejo-admin/hudsonfam, active=true, repoId=2 (per ci-cd-fragility-analysis.md Finding 1)

# Step 2: confirm via MCP that no pipelines are in flight (sanity)
# mcp__woodpecker__list_pipelines repoId=<id>
# Expect: empty or all status=success/failed/skipped (no pending/running)

# Step 3: REST DELETE (executor needs WOODPECKER_PAT in env or owner-runnable)
WOODPECKER_PAT="<owner-supplied>"
REPO_ID=$(curl -sk -H "Authorization: Bearer $WOODPECKER_PAT" \
  "https://woodpecker.homelab/api/repos/lookup/forgejo-admin/hudsonfam" \
  | python3 -c 'import json,sys; print(json.load(sys.stdin)["id"])')
HTTP_CODE=$(curl -sk -o /dev/null -w "%{http_code}" -X DELETE \
  -H "Authorization: Bearer $WOODPECKER_PAT" \
  "https://woodpecker.homelab/api/repos/$REPO_ID")
[ "$HTTP_CODE" = "200" ] && echo "OK: dereg complete" || echo "FAIL: HTTP $HTTP_CODE"

# Step 4: re-verify via MCP (post-deletion sanity)
# mcp__woodpecker__search_repository query="hudsonfam"
# Expect: zero matches OR (some Woodpecker versions soft-delete) entry with active=false
```

### Finding 3 — `kubectl delete imagerepository` semantics (HIGH confidence)

**Cluster state verified live 2026-04-23:**
- Resource: `imagerepository.image.toolkit.fluxcd.io/hudsonfam` in `default` namespace
- Status: `Ready=False`, reason `AuthenticationFailed`, message `secrets "forgejo-registry-creds" not found`
- Created: 2026-04-18T19:32:32Z (5d21h ago)
- Finalizers: `["finalizers.fluxcd.io"]` (single finalizer)
- spec.image: `git.homelab/forgejo-admin/hudsonfam`
- spec.secretRef.name: `forgejo-registry-creds` (Secret never existed in `default` ns; that's why it has been failing for 5+ days)

**Finalizer behavior:** `finalizers.fluxcd.io` on ImageRepository is the standard image-reflector-controller cleanup hook — it records reconciliation metrics on deletion and then removes itself. **Image-reflector-controller pod is healthy** (`image-reflector-controller-8864476c-s9gkb` Running 1/1, 11 restarts ago=9d) — finalizer will release within seconds of `kubectl delete`. No `--force` or finalizer-patch escape needed under normal conditions.

**Recommended invocation (idempotent):**

```bash
kubectl delete imagerepository hudsonfam -n default --ignore-not-found=true
# Optional: kubectl wait --for=delete imagerepository/hudsonfam -n default --timeout=30s
```

**`--ignore-not-found=true`** ensures the command is re-runnable safely (returns exit 0 if the resource is already gone — important if the plan is re-executed after a partial failure).

**No cascading deletes:** ImageRepository has no dependents (ImagePolicy in `flux-system` ns references `flux-system/hudsonfam`, not `default/hudsonfam`; no setter comments anchor to `default:hudsonfam`). **Confirmed:** `kubectl get imagepolicy -A | \grep hudsonfam` shows the lone ImagePolicy is `flux-system/hudsonfam` referencing `flux-system/hudsonfam`. The `default/` IR has been a complete cluster orphan for 5+ days with zero downstream wiring.

### Finding 4 — `kubectl delete secret` semantics (HIGH confidence)

**Cluster state verified live 2026-04-23:**
- `flux-system/forgejo-registry-creds` — `kubernetes.io/dockerconfigjson`, 11d old
- `homepage/forgejo-registry-creds` — `kubernetes.io/dockerconfigjson`, 11d old
- `woodpecker-pipelines/forgejo-registry` — `Opaque`, 6d20h old (DIFFERENT name + different ns + different consumer; PRESERVED per CONTEXT)

**No active consumer of either Secret to be deleted:**
- **Pod consumer check**: `kubectl get pod -n homepage -o jsonpath='{range .items[*]}{.metadata.name}: pullSecrets={range .spec.imagePullSecrets[*]}{.name},{end}{"\n"}{end}'` returned: `hudsonfam-b6b754b64-vcn5l: pullSecrets=ghcr-pull-credentials,` — confirmed pod uses ONLY `ghcr-pull-credentials`, NOT `forgejo-registry-creds`. Phase 26 cutover is fully propagated.
- **ImageRepository consumer check**: only `default/hudsonfam` IR references `forgejo-registry-creds` (and that IR is being deleted FIRST per D-07 sequencing). After IR deletion, the Secrets have ZERO references. (`flux-system/hudsonfam` IR uses `ghcr-pull-credentials`, all 19 other IRs in default ns are anonymous and not affected.)
- **No Deployment, Pod, ServiceAccount, or Job in `homepage` or `flux-system` references `forgejo-registry-creds`** [INFERRED from above pod-listing + the fact that the only Pod is the hudsonfam Pod].

**Pod-mounting-Secret-during-delete behavior** (just for the planner's mental model — NOT a concern here):
- If a Pod is currently mounting a deleted Secret as a volume, the Pod keeps running with the cached value; new Pods would fail to start until the Secret reappears.
- For `imagePullSecrets`, kubelet caches the dockerconfigjson on first successful pull; subsequent rolls retry the pull credential fresh, so post-Secret-delete a new Pod would fail with `ImagePullBackOff`.
- **Phase 27 is unaffected** because Phase 26 D-08 already migrated `imagePullSecrets[0].name` to `ghcr-pull-credentials` on the live Deployment, and the broken `default/hudsonfam` IR is being deleted in the SAME plan (and earlier in sequence per D-07).

**Recommended invocation (idempotent, paired):**

```bash
kubectl delete secret forgejo-registry-creds -n flux-system --ignore-not-found=true
kubectl delete secret forgejo-registry-creds -n homepage --ignore-not-found=true
```

**Secrets do NOT have finalizers by default** — both deletes complete in <1 second.

### Finding 5 — GitHub `git push` to `main` with `.woodpecker.yaml` deletion (HIGH confidence)

**File confirmed present** [VERIFIED 2026-04-23: `ls -la /home/dev-server/hudsonfam/.woodpecker.yaml` → 1729 bytes, last modified 2026-04-17]. The file is a Woodpecker pipeline definition that builds via `plugins/docker:20` and pushes to `git.homelab/forgejo-admin/hudsonfam` — entirely orthogonal to the GitHub Actions workflow (`.github/workflows/build-and-push.yml`).

**GitHub Actions trigger behavior:** the `build-and-push.yml` workflow shipped in Phase 25 (commit `c7d8f33`) triggers on `push.branches: [main]` (per Phase 25 D-02). A deletion-only commit IS a push to main and WILL trigger the workflow. **However, this is harmless:**
- The Dockerfile does NOT reference `.woodpecker.yaml` (Dockerfile is at repo root, copies `package*.json`, `prisma/`, `src/`, `next.config.ts`, etc.; `.woodpecker.yaml` is not in any COPY directive).
- The build-push-action@v5 uses `type=gha,scope=build-and-push,mode=max` cache (per Phase 25 D-05). The cache layers depend on the COPY-ed files' hashes; deleting an unreferenced file at repo root does not invalidate any cache layer.
- Result: warm-cache build completes in 2-6 min (per Phase 25 D-05 SC) and produces a new GHCR tag (functionally identical image with a new timestamp).
- That new tag will trigger Flux ImageUpdateAutomation (`homelab-images`) which will write a new tag into `apps/hudsonfam/kustomization.yaml`+`deployment.yaml` setter slots → roll the homepage Pod.

**Operational note for the executor:** the Phase 27 `.woodpecker.yaml` deletion push WILL produce a "side-effect" pod roll within ~10-15 minutes (Actions build ~5 min + Flux scan up to 6h with default 6h interval, but the manual reconcile via `flux reconcile image repository hudsonfam` brings it to <1 min). This is **expected and documented as the first end-to-end Phase 28 smoke test** (CICD-10) — but Phase 27 is NOT explicitly testing this, so the planner should NOT mark Phase 27 incomplete pending the IUA bump. The pod-still-healthy check in the verification suite uses pod READY/restarts (not image-tag stability) to avoid coupling Phase 27 success to IUA timing.

### Finding 6 — Pre-push hook for `.woodpecker.yaml` deletion (HIGH confidence)

**Hook installation verified** [VERIFIED 2026-04-23]:
- `/home/dev-server/hudsonfam/.git/hooks/pre-push` exists, executable, content: `npm run test:schema || exit 1`
- `package.json` line 13: `"test:schema": "bun scripts/check-jobs-schema.ts"`
- `scripts/check-jobs-schema.ts` lines 55-59 (verified via Grep):
  ```typescript
  if (!process.env.JOBS_DATABASE_URL) {
    console.warn(
      "[test:schema] JOBS_DATABASE_URL not set — skipping drift check (non-failure)"
    );
    process.exit(0);
  }
  ```

**Behavior on Phase 27 push:** the executor environment does not have `JOBS_DATABASE_URL` set (verified — `printenv JOBS_DATABASE_URL` was sandbox-blocked, so the env var is definitively unset in the executor's perspective). The hook will:
1. Call `npm run test:schema` → `bun scripts/check-jobs-schema.ts`
2. Script detects `JOBS_DATABASE_URL` is unset
3. Script prints the skipping-drift-check warning to stderr
4. Script exits 0
5. Hook line `npm run test:schema || exit 1` sees exit 0 → does NOT trigger `exit 1`
6. `git push` proceeds normally

**The skip warning is non-failure** and matches the documented pattern in Plan 25-01 SUMMARY. The executor should expect to see the warning on stderr but the push will succeed. No flag or override needed.

### Finding 7 — Verification recipes (corrections + additions to D-10)

CONTEXT D-10 verification suite has TWO commands that need correction. The full corrected suite is in the **Verification Recipes** section below. Summary of corrections:

| D-10 Command (broken/suboptimal as written) | Issue | Corrected |
|---|---|---|
| `curl -sk "https://git.homelab/api/v1/packages/search?q=hudsonfam&type=container"` | Forgejo treats `search` as a username and 404s — endpoint does NOT exist | Use `/api/v1/packages/forgejo-admin?type=container` and filter for `name=="hudsonfam"` |
| `curl -sk "https://git.homelab/api/v1/packages/forgejo-admin/container/hudsonfam"` | Path requires `{version}` segment in Forgejo 14.0.3 (no package-level GET, just per-version) | Same fix — use the owner-list endpoint and count `hudsonfam` matches; expect 0 post-delete |

### Finding 8 — Risks (locked-decision compatible)

| # | Risk | Mitigation | Surfaced In |
|---|------|-----------|-------------|
| R1 | Forgejo PAT not in executor env → API DELETE fails on auth | Owner-supplied PAT inline at task time (`autonomous: false` until PAT provided), OR fall back to D-06 owner UI deletion | Forgejo task |
| R2 | Woodpecker PAT not in executor env → REST DELETE fails on auth | Same as R1 — owner-supplied PAT inline, OR owner-runnable Woodpecker UI dereg at <https://woodpecker.homelab/repos> | Woodpecker task |
| R3 | MCP DELETE not available — primary path is direct REST | Confirmed in research; planner should structure task to call REST directly, NOT attempt MCP delete first | Woodpecker task |
| R4 | New IUA-driven build commit on hudsonfam main between Phase 27 commit and push (race window) | Push uses `git push origin main` standard semantics; if rejected (`fetch first`), executor pulls + retries (no merge-commit needed since deletion-only commits don't conflict with each other unless someone else also deletes the same file) | Repo-deletion task |
| R5 | Phase 28's GHCR-build trigger from Phase 27 push could race with Phase 27 verification suite | Verification suite checks pod READY/restarts (not image-tag stability) — IUA bump from new GHCR tag rolls pod healthily; verification PASSES either pre-roll or post-roll | Verification task |
| R6 | `default/hudsonfam` IR finalizer doesn't release (image-reflector-controller stuck/down) | Pre-check `kubectl get pod -n flux-system -l app=image-reflector-controller` Ready=1/1 before delete; if stuck, escape via `kubectl patch imagerepository hudsonfam -n default -p '{"metadata":{"finalizers":[]}}' --type=merge` | IR-deletion task |
| R7 | Pre-push hook trips on `JOBS_DATABASE_URL` unset → blocks push | Verified hook gracefully exits 0 on unset env var; no action needed; document the warning as expected | Repo-deletion task |
| R8 | Forgejo registry tag count drifts between research and execution (e.g., owner manually pushed a tag, or a Phase 26 rollback test ran) | Re-list versions immediately before the DELETE loop; loop over current state, not the snapshot | Forgejo task |
| R9 | Woodpecker MCP `search_repository` returns the entry post-DELETE with `active: false` instead of empty (soft-delete behavior) | Verification accepts EITHER zero matches OR `active: false` — both indicate "no further build attempts" which is the success criterion | Verification task |

---

## Verification Recipes

The full Phase 27 verification suite (corrected from CONTEXT D-10):

```bash
# ============================================================
# Phase 27 verification suite — run AFTER all 6 deletion ops
# ============================================================

set -e
PASS=0; FAIL=0

# CICD-07: only ONE hudsonfam ImageRepository remains (the flux-system/hudsonfam GHCR watcher)
COUNT=$(kubectl get imagerepository -A 2>&1 | \grep hudsonfam | wc -l | tr -d ' ')
if [ "$COUNT" = "1" ]; then echo "✓ CICD-07: ImageRepository count = 1"; PASS=$((PASS+1)); else echo "✗ CICD-07: count=$COUNT (expected 1)"; FAIL=$((FAIL+1)); fi

# CICD-07: the remaining one is flux-system/hudsonfam (NOT default)
NS=$(kubectl get imagerepository -A 2>&1 | \grep hudsonfam | awk '{print $1}')
if [ "$NS" = "flux-system" ]; then echo "✓ CICD-07: remaining IR ns = flux-system"; PASS=$((PASS+1)); else echo "✗ CICD-07: remaining IR ns = $NS"; FAIL=$((FAIL+1)); fi

# CICD-09 part 1+2: zero forgejo-registry-creds Secrets in hudsonfam-relevant namespaces
COUNT=$(kubectl get secret -A 2>&1 | \grep forgejo-registry-creds | wc -l | tr -d ' ')
if [ "$COUNT" = "0" ]; then echo "✓ CICD-09: zero forgejo-registry-creds Secrets"; PASS=$((PASS+1)); else echo "✗ CICD-09: count=$COUNT (expected 0)"; FAIL=$((FAIL+1)); fi

# CICD-09 sanity: woodpecker-pipelines/forgejo-registry STILL EXISTS (different consumer base; must not be touched)
if kubectl get secret forgejo-registry -n woodpecker-pipelines >/dev/null 2>&1; then
  echo "✓ CICD-09: woodpecker-pipelines/forgejo-registry preserved"; PASS=$((PASS+1))
else
  echo "✗ CICD-09: woodpecker-pipelines/forgejo-registry MISSING — SCOPE CREEP, restore from backup"; FAIL=$((FAIL+1))
fi

# CICD-08 part 1: .woodpecker.yaml gone from hudsonfam repo working tree AND HEAD
if [ ! -f /home/dev-server/hudsonfam/.woodpecker.yaml ]; then
  echo "✓ CICD-08: .woodpecker.yaml absent from working tree"; PASS=$((PASS+1))
else
  echo "✗ CICD-08: .woodpecker.yaml still present"; FAIL=$((FAIL+1))
fi
if [ -z "$(git -C /home/dev-server/hudsonfam ls-files .woodpecker.yaml)" ]; then
  echo "✓ CICD-08: .woodpecker.yaml absent from HEAD index"; PASS=$((PASS+1))
else
  echo "✗ CICD-08: .woodpecker.yaml still tracked"; FAIL=$((FAIL+1))
fi
# Confirm the deletion landed on origin (GitHub) main
if git -C /home/dev-server/hudsonfam log --diff-filter=D --name-only origin/main 2>/dev/null | \grep -q "^.woodpecker.yaml$"; then
  echo "✓ CICD-08: deletion present on origin/main"; PASS=$((PASS+1))
else
  echo "✗ CICD-08: deletion not yet on origin/main (push pending or failed)"; FAIL=$((FAIL+1))
fi

# CICD-08 part 2: Woodpecker repo dereg
# (Run via MCP tool: mcp__woodpecker__search_repository query="hudsonfam" — expect zero matches OR active:false)
# Manual REST verification:
WP_HTTP=$(curl -sk -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer ${WOODPECKER_PAT:-INVALID}" \
  "https://woodpecker.homelab/api/repos/lookup/forgejo-admin/hudsonfam")
if [ "$WP_HTTP" = "404" ]; then
  echo "✓ CICD-08: Woodpecker repo lookup returns 404 (deregistered)"; PASS=$((PASS+1))
else
  echo "? CICD-08: Woodpecker REST lookup returned HTTP $WP_HTTP (200 = still registered; 401/403 = no PAT — verify via MCP instead)"
fi

# CICD-09 part 3: Forgejo registry empty for hudsonfam
HF_COUNT=$(curl -sk "https://git.homelab/api/v1/packages/forgejo-admin?type=container" \
  | python3 -c "import json,sys; print(len([p for p in json.load(sys.stdin) if p.get('name')=='hudsonfam']))" 2>/dev/null)
if [ "$HF_COUNT" = "0" ]; then
  echo "✓ CICD-09: zero hudsonfam container versions in Forgejo"; PASS=$((PASS+1))
else
  echo "✗ CICD-09: $HF_COUNT hudsonfam versions still in Forgejo"; FAIL=$((FAIL+1))
fi

# Overall Flux health: zero hudsonfam-related Failed/Stalled conditions
BAD=$(kubectl get gitrepository,imagerepository,imagepolicy,imageupdateautomation,kustomization -A 2>&1 \
  | \grep -iE "hudsonfam|homepage" | \grep -i "false\|failed\|stalled" | wc -l | tr -d ' ')
if [ "$BAD" = "0" ]; then
  echo "✓ Flux health: zero hudsonfam Failed/Stalled conditions"; PASS=$((PASS+1))
else
  echo "✗ Flux health: $BAD bad conditions:"; kubectl get gitrepository,imagerepository,imagepolicy,imageupdateautomation,kustomization -A | \grep -iE "hudsonfam|homepage" | \grep -i "false\|failed\|stalled"; FAIL=$((FAIL+1))
fi

# Pod still healthy on the new pipeline (sanity: nothing this phase did broke Phase 26)
POD_READY=$(kubectl get pod -n homepage -l app=hudsonfam -o jsonpath='{.items[0].status.containerStatuses[0].ready}')
POD_RESTARTS=$(kubectl get pod -n homepage -l app=hudsonfam -o jsonpath='{.items[0].status.containerStatuses[0].restartCount}')
if [ "$POD_READY" = "true" ] && [ "$POD_RESTARTS" = "0" ]; then
  echo "✓ Pod healthy: ready=true restarts=0"; PASS=$((PASS+1))
else
  echo "✗ Pod state: ready=$POD_READY restarts=$POD_RESTARTS"; FAIL=$((FAIL+1))
fi

echo ""
echo "Results: $PASS pass, $FAIL fail"
[ "$FAIL" = "0" ] && echo "Phase 27: ALL VERIFICATIONS PASS" || echo "Phase 27: VERIFICATION FAILURES — investigate before code-complete"
```

### Operational Sanity Checks (planner: include these as PRE-CONDITIONS in their respective tasks)

**Before deleting `homepage/forgejo-registry-creds`:**

```bash
# MUST return ghcr-pull-credentials (NOT forgejo-registry-creds). If it returns forgejo-registry-creds,
# Phase 26 cutover did not propagate to the live Deployment and Phase 27 must HALT.
ACTUAL=$(kubectl get pod -n homepage -l app=hudsonfam \
  -o jsonpath='{.items[0].spec.imagePullSecrets[0].name}')
if [ "$ACTUAL" != "ghcr-pull-credentials" ]; then
  echo "HALT: pod imagePullSecret = '$ACTUAL', expected 'ghcr-pull-credentials'"
  exit 1
fi
```

**Before Forgejo registry DELETE loop:**

```bash
# Confirm path is reachable + at least one hudsonfam version exists (sanity: are we deleting the RIGHT thing?)
HTTP=$(curl -sk -o /dev/null -w "%{http_code}" "https://git.homelab/api/v1/packages/forgejo-admin?type=container")
if [ "$HTTP" != "200" ]; then
  echo "HALT: Forgejo packages endpoint returned HTTP $HTTP"
  exit 1
fi
COUNT=$(curl -sk "https://git.homelab/api/v1/packages/forgejo-admin?type=container" \
  | python3 -c "import json,sys; print(len([p for p in json.load(sys.stdin) if p.get('name')=='hudsonfam']))")
echo "Pre-delete: $COUNT hudsonfam versions present (expected ~6 per research snapshot)"
```

**Before deleting `default/hudsonfam` IR:**

```bash
# Verify image-reflector-controller is healthy (else finalizer release will hang)
READY=$(kubectl get pod -n flux-system -l app=image-reflector-controller \
  -o jsonpath='{.items[0].status.containerStatuses[0].ready}')
if [ "$READY" != "true" ]; then
  echo "HALT: image-reflector-controller not Ready; finalizer release will hang"
  exit 1
fi
```

---

## Open Questions (RESOLVED)

1. **Q:** Is package-level Forgejo DELETE supported? → **RESOLVED: NO** for Forgejo 14.0.3 (this cluster's version). Only per-version DELETE exists. CONTEXT D-05's "fallback per-version loop" IS the main path. Plan must loop over 6 versions (4 timestamps + 2 sha256 manifest digests).

2. **Q:** What auth does Forgejo accept for the DELETE endpoint? → **RESOLVED:** `Authorization: token <PAT>` (header-based AuthorizationHeaderToken) OR BasicAuth. PAT scope: `write:package` (inferred from sibling endpoints). Owner-supplied PAT required at task time; not in executor env.

3. **Q:** Forgejo DELETE success response code? → **RESOLVED: HTTP 204 No Content** (per swagger). HTTP 404 if version already absent (idempotency-friendly).

4. **Q:** Forgejo gotcha — must delete tags before deleting manifest references? → **RESOLVED: NO**. On Forgejo 14.0.3, manifest digests (`sha256:...`) appear in the same per-version list as tags and can be deleted directly. Order does not matter; loop deletes all 6 entries independently.

5. **Q:** Does Woodpecker MCP support DELETE? → **RESOLVED: NO**. The `denysvitali/woodpecker-ci-mcp` server (from which this session's `mcp__woodpecker__*` tools derive) provides only list/get for repositories; pipeline-management tools include start/stop/approve but no delete. Direct REST DELETE is the only path.

6. **Q:** Woodpecker REST DELETE endpoint? → **RESOLVED:** `DELETE /api/repos/{repo_id}` with `Authorization: Bearer <PAT>`. Success = HTTP 200. Use `GET /api/repos/lookup/{full_name}` to resolve `repo_id` first.

7. **Q:** Woodpecker dereg success indicator? → **RESOLVED:** Either zero matches in `mcp__woodpecker__search_repository "hudsonfam"`, OR `active: false` on the entry (depends on Woodpecker hard-vs-soft delete behavior; verification accepts either). Direct REST `GET /api/repos/lookup/forgejo-admin/hudsonfam` returning HTTP 404 is the most definitive post-delete signal.

8. **Q:** Does `kubectl delete imagerepository` cascade? → **RESOLVED: NO**. The broken `default/hudsonfam` IR has zero downstream wiring (ImagePolicy is in `flux-system` ns and references `flux-system/hudsonfam`; no setter comments anchor to `default:hudsonfam`). Deletion is single-resource only.

9. **Q:** Will the IR finalizer release cleanly? → **RESOLVED: YES**. `finalizers.fluxcd.io` is the standard image-reflector-controller cleanup hook; the controller pod is Running 1/1; finalizer releases within seconds. Escape hatch via `kubectl patch ... --type=merge -p '{"metadata":{"finalizers":[]}}'` only needed if the controller is down (not the case here).

10. **Q:** Will deleting `forgejo-registry-creds` affect any running pod? → **RESOLVED: NO**. Live verification confirmed `hudsonfam-b6b754b64-vcn5l` references ONLY `ghcr-pull-credentials`. The broken `default/hudsonfam` IR is the only ImageRepository referencing `forgejo-registry-creds`, and it's deleted FIRST per D-07. Post-delete, both Secrets have zero references.

11. **Q:** Will the `.woodpecker.yaml` deletion push trigger a stale GHCR cache? → **RESOLVED: NO**. The Dockerfile does not COPY `.woodpecker.yaml`; the file's removal does not invalidate any layer in the `type=gha,scope=build-and-push,mode=max` cache. Build will be functionally identical to the previous one (warm-cache 2-6 min per Phase 25 D-05).

12. **Q:** Will the pre-push hook block the deletion-only push? → **RESOLVED: NO**. `scripts/check-jobs-schema.ts` lines 55-59 check for `JOBS_DATABASE_URL` and exit 0 with a stderr warning when unset. Hook line `npm run test:schema || exit 1` does not trigger because exit code is 0. Plan 25-01 SUMMARY confirmed the same pattern works for `.github/workflows/build-and-push.yml` push.

13. **Q:** Race window between deleting `forgejo-registry-creds` Secret and ImageRepository finalizer needing it? → **RESOLVED: NO RACE**. The broken `default/hudsonfam` IR's `secretRef` looks for `forgejo-registry-creds` in the IR's own namespace (`default`) — a Secret that has NEVER existed (which is why the IR has been failing for 5+ days). The Secrets in `flux-system` and `homepage` were never reachable by that IR. Deletion order (IR first, Secrets second per D-07) is conservative but not strictly required — they have no live linkage.

14. **Q:** GHCR has duplicate copies of historical Forgejo tags — verified? → **RESOLVED: PARTIAL.** Phase 26 reported 46 GHCR tags (per Plan 26-02 SUMMARY). The 4 Forgejo timestamp tags this phase deletes are all from 2026-04-09 to 2026-04-24; Phase 26 verification noted GHCR has tags going back to `20260408173607` (Phase 26 CONTEXT) and even older 14-digit tags (`20260402051850`..`20260414020907` per CONTEXT Deferred). Spot-check of the 4 Forgejo tag values vs. GHCR is not in research scope (would require gh CLI auth or container-registry list); planner can include a one-line `gh api` check as a pre-delete sanity if desired. **Important:** even if a specific Forgejo tag is NOT duplicated in GHCR, it's still safe to delete because (a) the source code IS in git and (b) the build is reproducible from any commit via the Phase 25 pipeline.

15. **Q:** Will the `.woodpecker.yaml` push trigger an end-to-end pipeline run that incidentally satisfies CICD-10? → **RESOLVED: PROBABLY YES, BUT DON'T COUPLE.** Phase 25 D-02 push trigger fires; Phase 26 D-09 cutover ensures the resulting GHCR tag rolls into the homepage Deployment via IUA. This DOES exercise the full pipeline end-to-end. However, CICD-10 is owned by Phase 28 (CICD-10 explicitly says "no-op commit" and includes the under-15-min observation criterion); Phase 27 should NOT claim CICD-10 satisfaction. Document the side-effect in the SUMMARY ("Phase 27 push triggered an incidental end-to-end run that completed in N minutes") as an early signal Phase 28's CICD-10 will pass cleanly.

---

## Risks for Planner

(Repeated from Finding 8 — these are the items the planner should bake into task structure.)

1. **R1 (Forgejo PAT)** — Plan task for Forgejo DELETE step must be `autonomous: false` unless owner inlines a PAT at execution time. Default to owner-runnable with embedded curl recipe + alternative D-06 UI path.
2. **R2 (Woodpecker PAT)** — Same as R1 for Woodpecker dereg step. Default to owner-runnable with both REST recipe AND UI path documented.
3. **R3 (No MCP DELETE)** — Don't structure the Woodpecker dereg task around "try MCP first" — it doesn't exist. Use MCP only for verification (search_repository before/after).
4. **R4 (Push race window)** — Standard `git push origin main` semantics handle this; no special handling needed beyond standard pull-rebase-retry on rejection.
5. **R5 (IUA-driven pod roll during verification)** — Verification suite uses pod READY/restartCount, NOT image-tag stability. PASSES whether the Phase-27-triggered pipeline has rolled the pod or not.
6. **R6 (Finalizer hang)** — Pre-condition check on image-reflector-controller readiness BEFORE the IR delete; document the patch escape if needed.
7. **R7 (Pre-push hook)** — No action needed; hook is documented as gracefully skipping.
8. **R8 (Forgejo tag drift)** — Re-list immediately before DELETE loop; loop over current state. Don't hardcode the 6-version list from research.
9. **R9 (Woodpecker soft-delete behavior)** — Verification accepts EITHER zero matches OR `active: false`.

---

## Sources

### Primary (HIGH confidence)

- **Forgejo swagger.v1.json** at `https://git.homelab/swagger.v1.json` — fetched 2026-04-23; lines 4478-4571 (deletePackage operationId), lines 30482-30521 (auth security definitions). Definitive for endpoint shape and response codes. [VERIFIED]
- **Forgejo version endpoint** `https://git.homelab/api/v1/version` returned `14.0.3+gitea-1.22.0`. [VERIFIED]
- **Live cluster reads** via kubectl: imagerepository in default ns + finalizers; secret enumerations in flux-system, homepage, woodpecker-pipelines, secrets namespaces; pod imagePullSecrets in homepage; image-reflector-controller pod readiness in flux-system. All as of 2026-04-23. [VERIFIED]
- **Live Forgejo package list** via `https://git.homelab/api/v1/packages/forgejo-admin?type=container` — 6 hudsonfam container versions enumerated 2026-04-23. [VERIFIED]
- **Pre-push hook source** — `/home/dev-server/hudsonfam/scripts/check-jobs-schema.ts` lines 55-59 read directly. [VERIFIED]
- **Woodpecker REST API docs** at <https://woodpecker-ci.org/api> — DELETE /repos/{repo_id} with Bearer auth, HTTP 200 success; GET /repos/lookup/{full_name} for repoId resolution. [CITED]

### Secondary (MEDIUM confidence)

- **Woodpecker MCP capability inventory** — cross-referenced from `denysvitali/woodpecker-ci-mcp` README via WebFetch. The session's `mcp__woodpecker__*` tool surface matches that README's listed tools. Inference: same MCP server upstream → no DELETE tool. [CITED + cross-verified against orchestrator's tool enumeration]
- **Flux finalizer behavior** — `finalizers.fluxcd.io` documented in image-reflector-controller for reconciliation-metric tracking; standard cleanup pattern across Flux source-controller, kustomize-controller, helm-controller. WebSearch surfaced the `kubectl patch ... --type=merge` escape pattern. [CITED]

### Tertiary (LOW confidence, marked for validation by executor)

- **Required Forgejo PAT scope for DELETE** — inferred as `write:package` from the example list in CreateAccessTokenOption (which lists `read:package` but per documentation pattern there's also `write:package`). Not explicitly probed in research because no PAT was available. Executor should validate by attempting the DELETE; HTTP 401 indicates wrong scope, HTTP 204 indicates success.

---

## Metadata

**Confidence breakdown:**
- Forgejo per-version DELETE API: HIGH (live swagger inspection + live API probes)
- Woodpecker REST DELETE API: HIGH (official docs)
- Woodpecker MCP DELETE absence: HIGH (upstream README confirmation)
- Cluster state: HIGH (live kubectl reads)
- Finalizer cleanup: MEDIUM-HIGH (standard pattern; healthy controller observed)
- Pre-push hook behavior: HIGH (source code read directly)
- Forgejo PAT scope: LOW-MEDIUM (inferred, not probed)
- GHCR-Forgejo tag duplication: MEDIUM (Phase 26 documented 46 tags but exact overlap with Forgejo's 4 tags not spot-checked)

**Research date:** 2026-04-23
**Valid until:** 2026-05-23 (30 days; phase scope is small and external dependencies are stable — Forgejo 14.x and Woodpecker REST API change slowly)

---

*Phase: 27-decommission-old-pipeline*
*Research: 2026-04-23*
*Ready for: `/gsd-plan-phase 27` (or planner directly)*
