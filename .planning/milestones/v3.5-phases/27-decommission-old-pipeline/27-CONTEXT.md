# Phase 27: Decommission Old Pipeline (v3.5-P3) - Context

**Gathered:** 2026-04-24 (auto mode — 10 decisions locked; pure cleanup phase, scope is small and well-bounded)
**Status:** Ready for planning

<domain>
## Phase Boundary

Remove all broken/orphaned remnants of the Forgejo+Woodpecker pipeline for hudsonfam. Woodpecker + Forgejo themselves remain operational for other homelab workloads (the registry path is hudsonfam-specific, not Forgejo-cluster-wide). Three REQs: CICD-07, CICD-08, CICD-09. Zero application-code changes; zero new infrastructure introduced. This phase is the safety-net retirement that follows Phase 26's cutover.

**Pre-Phase-27 state (verified via cluster + repo reads on 2026-04-24):**

- **Phase 26 status:** CODE COMPLETE 2026-04-24; pod `hudsonfam-b6b754b64-vcn5l` Running 1/1 on `ghcr.io/hudsor01/hudsonfam:20260424023904` with `ghcr-pull-credentials`. ImageRepository `flux-system/hudsonfam` Ready=True, scanning 46 GHCR tags. D-10 10-min observation window has elapsed (cutover ~13:11Z; current spot-check shows 0 restarts).
- **Broken target #1 — `default/imagerepository/hudsonfam`:** Exists, status `False`, reason `AuthenticationFailed`, refs missing `forgejo-registry-creds`. Created 2026-04-18T19:32:32Z. **Cluster-only orphan** — `grep -rln "namespace: default" /home/dev-server/homelab/ | xargs grep "hudsonfam"` returns ZERO matches. Removal path: `kubectl delete imagerepository hudsonfam -n default`. No git commit needed for this resource.
- **Broken target #2 — `forgejo-registry-creds` Secrets:** Exist in BOTH `flux-system` and `homepage` namespaces (both `kubernetes.io/dockerconfigjson`, 11d old). Phase 26 D-10 left these alone as the rollback safety net. **Both cluster-only** — no homelab manifest source. Removal path: `kubectl delete secret forgejo-registry-creds -n flux-system && kubectl delete secret forgejo-registry-creds -n homepage`.
- **Repo target — `.woodpecker.yaml`:** Exists at hudsonfam repo root. Plan 27-XX deletes it via git rm + commit + push to GitHub `main`.
- **Woodpecker repo registration:** `forgejo-admin/hudsonfam` is registered with the Woodpecker server (per `ci-cd-fragility-analysis.md` Finding 1: "Woodpecker MCP reports `repoId:2, name:forgejo-admin/hudsonfam, active:true`"). Removal path: Woodpecker MCP `mcp__woodpecker__*` tools available in this session — search by repo name, then deactivate/delete via API.
- **Forgejo registry path — `git.homelab/forgejo-admin/hudsonfam`:** Container registry namespace exists with historical tags (last build `20260417202843` per Phase 26 pre-cutover deployment). Phase 26 D-10 explicitly preserved this as rollback safety. Phase 27 owner-discretion: delete OR document retention. Per CONTEXT.md `<decisions>` D-08 below: DELETE entirely (cleanest; tags lived only as deployment refs, not as immutable provenance).
- **Different namespace, NOT for hudsonfam — `woodpecker-pipelines/forgejo-registry` Secret:** This is Woodpecker's own auth credentials for OTHER pipelines that still build to the Forgejo registry. **DO NOT touch.** Phase 27 is hudsonfam-scoped only.
- **Sister broken IRs (`recyclarr`, `seerr`):** Per `ci-cd-fragility-analysis.md` Finding 5, these are unrelated `cache.homelab` TLS issues. NOT in Phase 27 scope.

**What ships end-to-end this phase (file edits + cluster deletes):**

1. **REPO DELETE:** `git rm /home/dev-server/hudsonfam/.woodpecker.yaml` + commit + push to GitHub `main` (CICD-08 part 1)
2. **WOODPECKER DEREG:** Use Woodpecker MCP (`mcp__woodpecker__search_repository "hudsonfam"` → identify repo ID → API delete or deactivate) (CICD-08 part 2)
3. **CLUSTER DELETE:** `kubectl delete imagerepository hudsonfam -n default` (CICD-07)
4. **CLUSTER DELETE:** `kubectl delete secret forgejo-registry-creds -n flux-system` (CICD-09 part 1 — cleanup of Plan 26-01 D-10 rollback secret in scan namespace)
5. **CLUSTER DELETE:** `kubectl delete secret forgejo-registry-creds -n homepage` (CICD-09 part 2 — cleanup of Plan 26-01 D-10 rollback secret in pull namespace)
6. **FORGEJO DELETE:** Forgejo container registry path `git.homelab/forgejo-admin/hudsonfam` removal via Forgejo API (DELETE `/api/v1/packages/forgejo-admin/container/hudsonfam` or per-tag DELETE if package-level not supported) (CICD-09 part 3 — historical artifact cleanup)
7. **(NO CLAUDE.md update this phase)** — full §Deployment rewrite is deferred to Phase 28 per CICD-11; Phase 27 leaves CLAUDE.md untouched (no partial scrub, no half-rewrite). Documented decision in D-09 below.

**Vault prerequisite (none):** Phase 27 makes no vault changes.

**Not in this phase:**

- CLAUDE.md §Deployment rewrite → Phase 28 (CICD-11) explicitly owns the comprehensive rewrite. Phase 27 does NOT do a partial scrub — leaving §Deployment intact through Phase 27 keeps the scope tight and avoids two PRs touching the same docs section
- End-to-end no-op-commit smoke test → Phase 28 (CICD-10)
- Retroactive UAT for Phases 21/22/23/24 → Phase 28 (CICD-12, CICD-13)
- Broken `recyclarr` / `seerr` ImageRepositories — separate root cause (`cache.homelab` TLS); homelab-infra concern, not hudsonfam concern
- Woodpecker server stability (5 restarts in 3 days observed during Phase 21 investigation) — Woodpecker is being removed from hudsonfam's critical path, but its own reliability for OTHER pipelines is a separate concern
- Forgejo repo (`dev-projects/homelab` GitRepository source for Flux) — STAYS; Forgejo continues to host the homelab manifests repo
- Forgejo PVC backup posture (single-volume Longhorn per Finding 6 of fragility-analysis) — orthogonal homelab-infra concern

</domain>

<decisions>
## Implementation Decisions

### Cluster cleanup (CICD-07 + CICD-09 secret cleanup)

- **D-01 [--auto]:** `kubectl delete imagerepository hudsonfam -n default` — single command. The resource has no manifest source in the homelab repo (verified via `grep -rln "namespace: default" /home/dev-server/homelab/ | xargs grep "hudsonfam"` returning zero); it was hand-applied at some point past. Cluster-only deletion is the right path. Acceptance: `kubectl get imagerepository -A | grep hudsonfam` returns exactly ONE row (the `flux-system/hudsonfam` GHCR watcher).

- **D-02 [--auto]:** Both `forgejo-registry-creds` Secrets get deleted in the same Plan task (paired delete):
  - `kubectl delete secret forgejo-registry-creds -n flux-system` (was the Plan 26-01 ImageRepository scan-auth path; now no consumer since Plan 26-02 cut over to `ghcr-pull-credentials`)
  - `kubectl delete secret forgejo-registry-creds -n homepage` (was the Plan 26-01 Deployment imagePullSecrets path; same rationale)

  Acceptance: `kubectl get secret -A | grep forgejo-registry` returns zero hudsonfam-related rows (the `woodpecker-pipelines/forgejo-registry` row stays — different namespace, different consumer base, NOT hudsonfam).

### Repo cleanup + Woodpecker deregistration (CICD-08)

- **D-03 [--auto]:** Delete `/home/dev-server/hudsonfam/.woodpecker.yaml` via `git rm` (NOT just `rm` — git rm stages the deletion). Commit message format matches the established v3.5 cadence (`feat(27): ...` or `chore(27): ...`). Push to GitHub `main` (the hudsonfam app repo, NOT the homelab repo this time). Acceptance: `git ls-files .woodpecker.yaml` returns empty; `git log --diff-filter=D HEAD~1 HEAD .woodpecker.yaml` shows the deletion.

- **D-04 [--auto, AMENDED 2026-04-24 post-research]:** Woodpecker repo deregistration via **direct REST API** (Woodpecker MCP is read-only — verified against upstream `denysvitali/woodpecker-ci-mcp` README; all 7 MCP tools are read-only with NO delete capability). Corrected sequence:
  1. **Pre-verify with MCP:** `mcp__woodpecker__search_repository "hudsonfam"` → returns `forgejo-admin/hudsonfam` with its `repo_id` (numeric)
  2. **DELETE via REST:** `curl -X DELETE -H "Authorization: Bearer <WOODPECKER_PAT>" "https://woodpecker.homelab/api/repos/<repo_id>"` → expects HTTP 200
  3. **Post-verify with MCP:** `mcp__woodpecker__search_repository "hudsonfam"` → expects zero matches

  **PAT availability constraint:** Neither Forgejo nor Woodpecker PAT is in executor environment per RESEARCH §finding 5. Plan task for the REST DELETE MUST be `autonomous: false` and surface owner-supplied `WOODPECKER_PAT` inline, OR fall back to owner-runnable Woodpecker UI at <https://woodpecker.homelab/repos> → click hudsonfam repo → "Delete repository" button.

  **Original framing of "MCP if available, else REST" is misleading** — REST is the only DELETE path; MCP is verification-only.

### Forgejo registry path cleanup (CICD-09 part 3)

- **D-05 [--auto]:** Delete the Forgejo container registry path `git.homelab/forgejo-admin/hudsonfam` entirely. Rationale: per CONTEXT D-10 of Phase 26, this path was preserved as rollback safety net through Phase 26 verification — that window has now elapsed. The historical tags (e.g., `20260417202843`) lived only as deployment refs; they were never the source-of-truth for any code or build (the source is in git, the build is reproducible from `c099b66`+ via the new GHCR pipeline). Keeping them is pure storage cost with no observability or rollback value (Phase 26 cutover is now the new baseline; rollback would mean re-cutover to GHCR, not back to Forgejo).

  **Removal path AMENDED 2026-04-24 post-research:** Forgejo per-version DELETE is the **ONLY** path supported by the live `git.homelab` server (Forgejo 14.0.3+gitea-1.22.0; verified via swagger inspection — NO package-level DELETE endpoint exists). The originally-suggested "package-level preferred, per-version fallback" framing is incorrect — per-version is the main path.

  ```bash
  curl -sk -X DELETE \
    -H "Authorization: token <FORGEJO_PAT>" \
    "https://git.homelab/api/v1/packages/forgejo-admin/container/hudsonfam/<VERSION>"
  # → expects HTTP 204 (success)
  ```

  **6 versions to delete** (per RESEARCH §finding 1; loop over the live list at execution time): 4 timestamp tags (`20260424072940`, `20260417202843`, `20260414002755`, `20260409010056`) + 2 sha256 manifest digests. The exact list should be re-queried at execution time via `curl -sk "https://git.homelab/api/v1/packages/forgejo-admin?type=container" | jq -r '.[] | select(.name=="hudsonfam") | .version'` since new tags may have been added between Phase 26 and Phase 27 execution.

  **PAT availability constraint:** Forgejo PAT is NOT in executor environment per RESEARCH §finding 5. Plan task MUST be `autonomous: false` and surface owner-supplied `FORGEJO_PAT` inline (PAT scope: `write:package`).

  **Acceptance (CORRECTED — original D-10 search-endpoint commands are broken):** `curl -sk "https://git.homelab/api/v1/packages/forgejo-admin?type=container" | jq -r '.[] | select(.name=="hudsonfam")'` returns empty (no JSON object matching `name=="hudsonfam"`). The `/api/v1/packages/search` endpoint does NOT exist on Forgejo 14.x; the `/api/v1/packages/forgejo-admin/container/hudsonfam` (no-version) endpoint returns 404 because the path requires `{version}`. Use the owner-listing endpoint with jq filter instead.

- **D-06 [--auto]:** Owner-runnable fallback: if Forgejo API auth is fiddly from the executor sandbox, owner can delete via Forgejo UI (`https://git.homelab/forgejo-admin/-/packages` → click `hudsonfam` container → delete). Plan task should be `autonomous: false` for this step if API auth is unavailable.

### Sequencing + safety

- **D-07 [--auto]:** Sequential safe ordering — single Plan 27-01 with multiple tasks:
  1. **Repo first (lowest blast radius):** Delete `.woodpecker.yaml` from hudsonfam repo + commit + push (D-03). This stops Woodpecker from ever attempting a build again even before the dereg lands.
  2. **Woodpecker dereg:** MCP-based dereg (D-04). Removes the orphaned repo entry from Woodpecker's tracker.
  3. **Cluster broken IR delete:** `kubectl delete imagerepository hudsonfam -n default` (D-01). Removes the persistent error-condition cluster event.
  4. **Cluster Secret delete:** Both `forgejo-registry-creds` Secrets (D-02). Removes the unused auth artifacts.
  5. **Forgejo registry delete:** API DELETE (D-05). Removes the historical container artifacts.
  6. **Verification suite:** Run all 5 acceptance commands; confirm the post-state is clean.

  Rationale for repo-first: deleting `.woodpecker.yaml` makes any race with a stray Woodpecker push trigger fail-closed (no `.woodpecker.yaml` = no pipeline). Cluster deletes second because they're idempotent and have no dependencies on each other. Forgejo registry delete last because it's the most "destructive" (nukes historical artifacts) — do it after everything else verifies clean so we have a clean rollback opportunity if any step before it surfaces an unexpected dependency.

- **D-08 [--auto]:** No rollback path needed. Phase 26 was the rollback-safety phase (D-10 explicitly preserved Forgejo as the safety net through Phase 26). Phase 27 retires the safety net by design. If something goes wrong DURING Phase 27 execution, the recovery is to re-run Phase 26's cutover (which is already idempotent — the homelab repo state is the source-of-truth; the cluster catches up on Flux reconcile). No need to design a Phase-27-specific rollback.

### CLAUDE.md scope decision

- **D-09 [--auto]:** Phase 27 makes ZERO edits to `/home/dev-server/hudsonfam/CLAUDE.md`. The full §Deployment rewrite is owned by Phase 28 (CICD-11). Rationale:
  - Phase 27 is pure cleanup; touching docs would expand scope
  - A partial Phase-27 scrub of Forgejo references would create ROT (the same section gets rewritten in Phase 28; intermediate state has no value)
  - ROADMAP §Phase 27 SC #5 says "CLAUDE.md §Deployment is updated in the same PR so documentation reflects the decommission" — but that SC was written before Phase 28 ownership of CICD-11 was finalized. Honor the spirit (CLAUDE.md is up-to-date by milestone end) by doing the comprehensive rewrite ONCE in Phase 28
  - Document this scope-decision explicitly in Phase 27 SUMMARY so the next-reader sees why CLAUDE.md was untouched

### Verification

- **D-10 [--auto]:** Verification suite the executor runs after all 6 deletion steps complete (matches CICD-07/08/09 acceptance criteria):

  ```bash
  # CICD-07: only ONE hudsonfam ImageRepository remains
  kubectl get imagerepository -A 2>&1 | grep hudsonfam | wc -l  # → exactly 1

  # CICD-09 secret cleanup: zero forgejo-registry-creds rows in hudsonfam-relevant namespaces
  kubectl get secret -A 2>&1 | grep forgejo-registry-creds | wc -l  # → 0
  # (the woodpecker-pipelines/forgejo-registry row may still appear; that's a different name + ns + consumer base, NOT hudsonfam — sanity-check via:
  kubectl get secret -A 2>&1 | grep forgejo-registry | grep hudsonfam  # → empty)

  # CICD-08 part 1: .woodpecker.yaml gone from hudsonfam repo
  test ! -f /home/dev-server/hudsonfam/.woodpecker.yaml && echo "OK: .woodpecker.yaml deleted" || echo "FAIL: still present"

  # CICD-08 part 2: Woodpecker repo dereg
  # Via MCP: mcp__woodpecker__search_repository "hudsonfam" → expect zero matches OR active:false

  # CICD-09 part 3: Forgejo registry empty (CORRECTED 2026-04-24 post-research)
  # NOTE: original /api/v1/packages/search endpoint does NOT exist on Forgejo 14.x;
  # the /api/v1/packages/forgejo-admin/container/hudsonfam path requires {version} suffix and 404s without it.
  # Use the owner-listing endpoint + jq filter:
  curl -sk "https://git.homelab/api/v1/packages/forgejo-admin?type=container" | jq -r '.[] | select(.name=="hudsonfam") | .name + ":" + .version'
  # → expects EMPTY output (no hudsonfam container packages remain)

  # Overall Flux health: zero hudsonfam-related Failed conditions
  kubectl get gitrepository,imagerepository,imagepolicy,imageupdateautomation,kustomization -A 2>&1 | grep -iE "hudsonfam|homepage" | grep -i "false\|failed\|stalled"  # → empty

  # Pod still healthy on the new pipeline (sanity: nothing this phase did broke Phase 26)
  kubectl get pod -n homepage -l app=hudsonfam -o jsonpath='{.items[0].status.containerStatuses[0].ready} restarts={.items[0].status.containerStatuses[0].restartCount}'  # → "true restarts=0"
  ```

  All commands must produce expected output before Phase 27 is declared code-complete. This satisfies CICD-07 SC #1, CICD-08 SC #2, CICD-09 SC #3, and the broader SC #4 (zero Failed/Stalled conditions related to hudsonfam).

### Claude's Discretion

- Exact commit message wording for the `.woodpecker.yaml` deletion
- Whether to bundle all 6 cleanup steps into a single Plan or split into multiple plans (recommend SINGLE plan — scope is tiny)
- Whether to include per-step PROCEED/HALT checkpoints (recommend SINGLE end-of-plan checkpoint at Task 27-01-07 verification — too many checkpoints would slow a 6-step pure-cleanup phase)
- Whether to attempt Forgejo API DELETE from executor or punt to owner browser/curl (recommend: try API first, fall back to owner-runnable if auth fiddly; surface fallback path in plan task)
- Exact MCP tool sequence for Woodpecker dereg (depends on which `mcp__woodpecker__*` tools support DELETE — executor explores at runtime)
- Whether to add a one-line note in `homelab/CLAUDE.md` documenting that the broken `default/imagerepository/hudsonfam` was deleted — Claude's call (small ops note, low overhead); default to NO (homelab CLAUDE.md is for ongoing reference, not historical cleanup logs; the SUMMARY captures the historical detail)

### Folded Todos

None — `todo.match-phase 27` query deferred to planner's cross-reference step.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements and scope

- `.planning/REQUIREMENTS.md` — 3 Phase 27 REQs: CICD-07, CICD-08, CICD-09 (lines 25-27); v3.5 milestone framing in §`v3.5 Requirements`
- `.planning/ROADMAP.md` — Phase 27 entry (around line 295) with 5 Success Criteria (broken default IR deleted, .woodpecker.yaml deleted, git.homelab path deleted-or-documented, zero Failed/Stalled hudsonfam conditions, CLAUDE.md updated). NOTE: SC #5 superseded by Phase 28 ownership of CICD-11 per D-09 above.

### Domain-level seeds and notes

- `.planning/notes/ci-cd-fragility-analysis.md` — root-cause investigation; Finding 1 (Forgejo repo deletion + Woodpecker still tracking it), Finding 2 (broken default IR), Finding 5 (sister broken IRs are NOT Phase 27 scope), Finding 6 (Forgejo PVC backup posture is NOT Phase 27 scope)
- `.planning/seeds/SEED-005-cicd-hardening-migration.md` — full v3.5 milestone rationale; Phase 27 = v3.5-P3 of the 4-phase plan

### Phase 26 carry-forward (immediate predecessor)

- `.planning/phases/26-flux-reconfiguration/26-CONTEXT.md` — Phase 26 D-10 explicitly preserved Forgejo path through Phase 26 as rollback safety; Phase 27 retires it per the gating rule (10-min observation window post-Phase-26 cutover).
- `.planning/phases/26-flux-reconfiguration/26-02-SUMMARY.md` — Phase 26 GATING RULE captured ("do NOT run Phase 27 until Phase 26 has been observably green for ≥10 min"); satisfied 2026-04-24 per pre-discuss spot-check (pod `hudsonfam-b6b754b64-vcn5l` Running 1/1 since 13:11Z, 0 restarts, on `ghcr.io/hudsor01/hudsonfam:20260424023904`).
- `.planning/phases/26-flux-reconfiguration/26-01-SUMMARY.md` — captures forgejo-registry-creds Secret state pre-Phase-27 (lives in flux-system + homepage namespaces; Phase 27 D-02 deletes both).

### Existing files this phase reads or modifies

**Modified by Phase 27:**
- `/home/dev-server/hudsonfam/.woodpecker.yaml` — DELETED via `git rm` + commit to GitHub `main` (CICD-08 part 1)

**Cluster-only deletions (no manifest source; `kubectl delete` is the path):**
- `imagerepository.image.toolkit.fluxcd.io/hudsonfam` in `default` namespace (CICD-07)
- `secret/forgejo-registry-creds` in `flux-system` namespace (CICD-09 part 1)
- `secret/forgejo-registry-creds` in `homepage` namespace (CICD-09 part 2)

**Forgejo-API-only deletion (no manifest source; HTTP DELETE is the path):**
- Container registry path `git.homelab/forgejo-admin/hudsonfam` (CICD-09 part 3)

**External-API deletion (Woodpecker server):**
- Woodpecker repo registration for `forgejo-admin/hudsonfam` (CICD-08 part 2) — via MCP `mcp__woodpecker__*` tools or fallback Woodpecker REST API DELETE

**NOT touched this phase:**
- `/home/dev-server/hudsonfam/CLAUDE.md` — D-09 explicit scope decision (full rewrite owned by Phase 28 CICD-11)
- `/home/dev-server/homelab/` — no edits this phase (Phase 26 already removed all hudsonfam refs to Forgejo registry path; nothing left to delete in the homelab repo)
- `secret/woodpecker-pipelines/forgejo-registry` — different ns, different consumer base, NOT hudsonfam
- ImageRepositories `recyclarr` and `seerr` — sister broken IRs, separate root cause (cache.homelab TLS), out of scope

### External documentation

- Forgejo container packages API — DELETE endpoint pattern: <https://forgejo.org/docs/latest/user/packages/container/#delete-a-container-image>
- Woodpecker REST API — repo deregister: <https://woodpecker-ci.org/docs/usage/intro> §Repos
- Flux ImageRepository docs — already canonical from Phase 26 (no new Flux behavior introduced this phase)

### Prior phase context (carry-forward beyond Phase 26)

- v3.0 phases (20-24) are orthogonal — Phase 27 makes ZERO app-code edits in the `hudsonfam` repo. Only the `.woodpecker.yaml` file is removed.
- `.planning/PROJECT.md` §`Key Decisions` — Phase 27 doesn't introduce new project-wide decisions; it executes the cleanup half of the SEED-005 thesis.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- **kubectl + flux + Forgejo API + Woodpecker MCP** — all the tools Phase 27 needs are already in the executor's environment (kubectl from the Phase 26 verification work; `mcp__woodpecker__*` tools surfaced earlier in the session; Forgejo API reachable from the homelab network). No new tooling install needed.
- **Phase 26 D-09/D-10 sequencing pattern** — the safe-ordering discipline (cluster verify → repo edit → cluster verify) carries forward; Phase 27 uses repo-first ordering for the same reason (fail-closed if a Woodpecker race were to occur).

### Established Patterns

- **`kubectl delete` for cluster-only resources** — Phase 27 deletes 3 cluster-only resources (broken default IR + 2 Secrets). All have no manifest source in the homelab repo (verified). `kubectl delete` is the canonical path; no Flux reconcile or git revert needed.
- **GitHub `main` branch direct push for v3.5 work** — Phase 25 (`c7d8f33`) and v3.5 hotfix (`c099b66`) both pushed directly to GitHub main. Phase 27's `.woodpecker.yaml` deletion follows the same cadence (no PR branch).
- **Pre-push hook tolerance** — `scripts/install-hooks.sh` may have installed a pre-push hook that runs `test:schema`; that hook's contract (per Plan 25-01 SUMMARY notes) skips cleanly when JOBS_DATABASE_URL is unset. Phase 27 push will trip the hook but it'll skip with a non-failure warning — no executor action needed.

### Integration Points

- **GitHub repo** (`github.com/hudsor01/hudsonfam`) — Phase 27 commits the `.woodpecker.yaml` deletion to `main`. No CI side-effect (the workflow `build-and-push.yml` triggers on push, but a `.woodpecker.yaml`-only delete doesn't affect Dockerfile contents — the resulting build will be functionally identical to the previous one and may even short-circuit in cache; either way it's harmless).
- **K3s cluster (`default`, `flux-system`, `homepage` namespaces)** — Phase 27 deletes 1 ImageRepository in `default` + 2 Secrets across `flux-system` + `homepage`. No new resources created. Pod stays untouched (it already runs on the GHCR image).
- **Woodpecker server (`forge` namespace)** — Phase 27 deregisters one repo registration via MCP/API. Woodpecker continues running for OTHER pipelines.
- **Forgejo container registry (`git.homelab`)** — Phase 27 deletes the `forgejo-admin/hudsonfam` package path. Forgejo continues hosting the homelab manifests repo (`dev-projects/homelab`) — that's a SEPARATE Forgejo concern, untouched.

</code_context>

<specifics>
## Specific Ideas

- **Repo-first sequencing (D-07)** — deleting `.woodpecker.yaml` first means Woodpecker can never attempt a build for this repo again even if the dereg API call fails; fail-closed posture for the smallest possible blast-radius window.
- **Forgejo container delete is destructive but recoverable** — if the API DELETE fires and we later realize we wanted historical tags for forensic purposes, the rebuild path is `docker pull ghcr.io/hudsor01/hudsonfam:<tag>` (the GHCR copy of historical tags is also preserved per Phase 26 GHCR list — 46 tags, including `20260408173607` and earlier). So the Forgejo registry tags aren't unique provenance — just duplicate refs. Safe to delete.
- **CLAUDE.md untouched (D-09)** — the temptation to "scrub Forgejo references in §Deployment in the same PR" is real and rejected. Two PRs touching the same file == merge-conflict potential + ROT in the intermediate state. Phase 28 owns CLAUDE.md as a comprehensive rewrite.
- **Why Woodpecker MCP not direct REST API** — MCP tools handle auth (bearer token) transparently and provide structured JSON responses; direct REST would require pulling a Woodpecker token from somewhere. Lower-friction path.
- **No homelab repo edits this phase** — verified via grep that there are zero hudsonfam-Forgejo-registry references left in homelab manifests (Phase 26 cutover removed them all in the kustomization.yaml + deployment.yaml + image-repositories.yaml mutations). The `default/imagerepository/hudsonfam` is cluster-only orphan; the 2 forgejo-registry-creds Secrets are cluster-only orphans. Nothing to clean up in homelab.
- **woodpecker-pipelines/forgejo-registry KEEP** — explicitly named in CONTEXT for next-reader clarity (it's tempting to grep for `forgejo-registry` and delete all matches; this Secret is for OTHER workloads).

</specifics>

<deferred>
## Deferred Ideas

- **CLAUDE.md §Deployment comprehensive rewrite** — Phase 28 (CICD-11) per D-09
- **End-to-end no-op-commit smoke test** — Phase 28 (CICD-10)
- **Retroactive UAT for Phases 21/22/23/24** — Phase 28 (CICD-12, CICD-13)
- **`recyclarr` / `seerr` ImageRepository TLS fix** — separate homelab-infra phase (not v3.5 scope)
- **Woodpecker server stability investigation** — separate homelab-infra phase (Woodpecker stays operational for other workloads; its own crash-loop debugging is unrelated to hudsonfam decommission)
- **Forgejo PVC backup posture** — separate homelab-infra phase (single-volume Longhorn risk applies to all Forgejo-hosted artifacts; not hudsonfam-specific)
- **Older 14-digit GHCR tags cleanup** (`20260402051850`..`20260414020907`) — pre-Phase-25 historical artifacts; harmless to keep; cleanup would be a future "GHCR retention policy" phase if storage costs become a concern
- **SHA-style GHCR tags cleanup** (`8279573`, `fe90ab5`, etc. from old Forgejo+Woodpecker pipeline) — same reasoning as above; preserve as historical refs
- **Woodpecker server uninstall** — Woodpecker continues serving OTHER pipelines; full uninstall is a separate decision
- **Forgejo container registry feature uninstall** — Forgejo continues hosting `dev-projects/homelab`; container registry feature stays enabled

</deferred>

---

*Phase: 27-decommission-old-pipeline*
*Context gathered: 2026-04-24 (auto mode — 10 decisions locked using cluster reconnaissance + Phase 26 carry-forward + ci-cd-fragility-analysis Findings 1/2/5/6 framing)*
</content>
</invoke>