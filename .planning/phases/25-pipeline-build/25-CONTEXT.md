# Phase 25: Pipeline Build (v3.5-P1) - Context

**Gathered:** 2026-04-23 (auto mode — 12 decisions locked; infrastructure/DevOps phase with owner-domain scope)
**Status:** Ready for planning

<domain>
## Phase Boundary

Ship `.github/workflows/build-and-push.yml` that builds the existing `Dockerfile` (multi-stage Node 22 Alpine + bun) and pushes to `ghcr.io/hudsor01/hudsonfam` with `YYYYMMDDHHmmss` UTC timestamp tags on every push to `main`. 3 REQs: CICD-01, CICD-02, CICD-03. **Zero cluster changes** this phase — images accumulate in GHCR with no consumer yet; Phase 26 reconfigures Flux to watch them.

**Current state (pre-Phase-25):**
- `.github/` directory does NOT exist — fully green-field
- `Dockerfile` exists at repo root, multi-stage (deps → builder → runner), uses `node:22-alpine` + bun, produces `NEXT_TELEMETRY_DISABLED=1` Next.js standalone output; size ~500MB per existing prod image
- `.woodpecker.yaml` at repo root still present (Phase 27 decommissions it); uses `date -u +%Y%m%d%H%M%S > .tags` pattern and `plugins/docker:20` — establishes the timestamp format convention
- Pre-Phase-25 production image `ghcr.io/hudsor01/hudsonfam:20260408173607` exists (built via unknown pre-Forgejo path); indicates GHCR repo already has naming + prior manual push precedent
- No `GHCR_TOKEN` or `GHCR_PAT` secret configured in the GitHub repo; Actions will use the built-in `GITHUB_TOKEN` which has write access to packages scoped to the same repo owner

**What ships end-to-end this phase:**
1. `.github/workflows/build-and-push.yml` — single-job GitHub Actions workflow
2. Triggers: `push` to `main` AND `workflow_dispatch` (manual) — NO `pull_request` trigger (scope exclusion per CICD-FUTURE-01)
3. Steps in order: checkout → generate timestamp → setup buildx → login to GHCR → build + push
4. Image tags on every build: `<YYYYMMDDHHmmss>` (UTC) + `latest`
5. Architecture: `linux/amd64` only (cluster is amd64-only per ROADMAP v3.5 exclusions)
6. Layer caching: `type=gha` (GitHub Actions native cache; free; no S3 / registry-cache infrastructure)
7. Build context: `.` (repo root); Dockerfile path: `./Dockerfile` (default)
8. Workflow-dispatch input: none required (always builds HEAD); reserving future input for ad-hoc rebuilds

**Not in this phase:**
- Any Flux / cluster reconfiguration (Phase 26)
- Removal of `.woodpecker.yaml` or old Flux resources (Phase 27)
- Image signing via cosign / sigstore (Phase 25 exclusion — nice-to-have, not in CICD-XX REQs)
- SBOM emission (same reason)
- Multi-arch builds (arm64) — cluster is amd64; explicit v3.5 out-of-scope
- PR preview environments (CICD-FUTURE-01)
- Matrix build across Node versions (v3.5 out-of-scope)

</domain>

<decisions>
## Implementation Decisions

### Workflow structure

- **D-01 [--auto]:** Single-job workflow named `build-and-push` in `.github/workflows/build-and-push.yml`. Single-job simplifies debugging (one Actions run page → one log). Job runs on `ubuntu-latest` (GitHub-hosted runner — default choice; self-hosted runners are out-of-scope complexity for a solo-user app). Job permissions: `contents: read` + `packages: write` (minimum for checkout + GHCR push).

- **D-02 [--auto]:** Triggers: `on.push.branches: [main]` + `on.workflow_dispatch: {}`. Exactly two triggers, no `pull_request`, no tag triggers, no schedule. Rationale: push-to-main fits the single-developer / single-main-branch model; workflow_dispatch gives an ad-hoc rebuild knob (cache invalidation, testing the pipeline itself, rebuilding to refresh `latest` tag without a code commit).

### Timestamp tag generation

- **D-03 [--auto]:** Timestamp generated in a dedicated workflow step via `date -u +%Y%m%d%H%M%S`; stored in `GITHUB_OUTPUT` (e.g., `timestamp=$(date -u +%Y%m%d%H%M%S) && echo "ts=$timestamp" >> $GITHUB_OUTPUT`). This matches the existing `.woodpecker.yaml` convention (line 16) and Flux imagepolicy regex (`^\d{14}$`). The step runs at workflow start (not mid-build) so the timestamp reflects when the workflow started, not when the build happened to finish — predictable monotonic ordering across concurrent workflow runs (GitHub Actions serializes on `concurrency` if we add a group; see D-11).

- **D-04 [--auto]:** Tag SET on every build: `${{ steps.ts.outputs.ts }}` AND `latest`. Both tags applied via `docker/build-push-action`'s `tags` input (newline-delimited multi-tag). No SHA tag, no branch-name tag — keeps the tag space clean and Flux imagepolicy's regex simple. `latest` floats to the most recent build (useful for manual pulls); timestamp is the immutable identifier Flux tracks.

### Docker build + push

- **D-05 [--auto]:** `docker/build-push-action@v5` (major-version pin, not floating `@v5.x`; update on major bumps only). Platforms: `linux/amd64`. Push: `true`. Tags: 2-entry list (D-04). Cache-from / cache-to: both `type=gha,scope=build-and-push` (one shared scope for the single job; GitHub caches up to 10GB per repo free tier; Dockerfile layer sizes well under that).

- **D-06 [--auto]:** `docker/setup-buildx-action@v3` configures Buildx; no custom builder (default `docker-container` driver suffices for amd64-only). No `--load` flag — image pushes directly to GHCR, no local load step.

- **D-07 [--auto]:** `docker/login-action@v3` authenticates to `ghcr.io` using:
  - `registry: ghcr.io`
  - `username: ${{ github.actor }}` (the user who triggered the workflow; for push-to-main, this is the committer)
  - `password: ${{ secrets.GITHUB_TOKEN }}` (built-in token; has `packages: write` scope when job permissions include it per D-01)

  NO PAT (personal access token) required for this phase — the built-in token authorizes pushes to `ghcr.io/<owner>/*` when the workflow has `packages: write` permission. Phase 26 introduces a PAT for Flux's GHCR pull (different auth context: Flux is external to GitHub; the workflow is internal).

### Build performance + caching

- **D-08 [--auto]:** Primary cache: GitHub Actions cache (`type=gha`). Expected behavior: first run takes 8-12 minutes (cold cache); subsequent runs on unchanged `package.json` / `bun.lock` take 2-4 minutes (cached `deps` stage); full source edit takes 4-6 minutes (cached deps, rebuilt builder + runner stages). CICD-03 SC caps clean-build at 10 minutes — warm-cache is well inside that.

- **D-09 [--auto]:** Dockerfile is NOT modified this phase — use as-is. If build-time optimizations (e.g., cache-mount for bun global store, multi-stage COPY optimization) are needed, they live in a future phase. Phase 25 validates the existing Dockerfile builds successfully under GitHub Actions runners (6.5GB RAM / 4-core / 14GB SSD — comparable to the Woodpecker 4Gi RAM / 2 CPU limits in `.woodpecker.yaml:33-34`).

### Concurrency + safety

- **D-10 [--auto]:** Workflow-level `concurrency: { group: 'build-and-push-main', cancel-in-progress: true }` — if a new push lands while a build is still running, cancel the in-flight build and start fresh. Rationale: always-latest-source wins over finishing a stale build; avoids queuing up wasted cycles.

- **D-11 [--auto]:** No step-level retry on the build-push action (a real failure should surface as a red run; retrying masks Dockerfile regressions). Workflow_dispatch provides the manual retry path.

- **D-12 [--auto]:** Secrets hygiene: the workflow uses ONLY `${{ secrets.GITHUB_TOKEN }}` (built-in) + `${{ github.actor }}` (public metadata). Zero custom repository secrets or environment secrets required for Phase 25. Phase 26 adds a GHCR pull PAT for Flux — that's a cluster-side concern, not a workflow concern.

### Claude's Discretion

- Exact workflow YAML whitespace / indentation (YAML is flexible; follow GitHub Actions canonical examples)
- Whether to include a `Check out code` vs `Checkout` step name (cosmetic)
- Whether to pin the `ubuntu-latest` runner to a specific version (e.g., `ubuntu-24.04`) — default to `ubuntu-latest` unless reproducibility bites later
- `timeout-minutes` on the job — set to 20 (defensive against runaway builds; well above the 10-min CICD-03 SC)
- Whether to add a `runs: echo "Pushed <image>:<tag>"` summary step for Actions UI readability — Claude's call
- Exact step order of `setup-buildx` vs `docker login` — both work; default to buildx first per GitHub's canonical example

### Folded Todos

None — `todo.match-phase 25` query deferred to planner's cross-reference step.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements and scope
- `.planning/REQUIREMENTS.md` — 3 Phase 25 REQs: CICD-01, CICD-02, CICD-03
- `.planning/ROADMAP.md` — Phase 25 entry with 5 Success Criteria (warm-cache under 10 min; 2 tags per build; linux/amd64; buildx + GHCR + gha cache stack; workflow_dispatch wired)

### Domain-level seeds and notes
- `.planning/seeds/SEED-005-cicd-hardening-migration.md` — full milestone rationale; Phase 25 is v3.5-P1 of the 4-phase plan
- `.planning/notes/ci-cd-fragility-analysis.md` — investigation that triggered the migration; documents the broken Forgejo+Woodpecker pipeline this phase replaces

### Existing code this phase reads or modifies
- `Dockerfile` (repo root) — READ-ONLY this phase; multi-stage Node 22 Alpine + bun; existing working artifact
- `.dockerignore` (repo root, if exists) — READ-ONLY; controls build context size
- `.woodpecker.yaml` (repo root) — READ-ONLY this phase; REFERENCE ONLY for the timestamp tag convention (line 16: `date -u +%Y%m%d%H%M%S > .tags`). Deleted in Phase 27.
- `.github/workflows/build-and-push.yml` — NEW this phase; only file created
- `CLAUDE.md` — READ-ONLY this phase; §Deployment describes the target pipeline this phase begins implementing. CLAUDE.md docs rewrite is deferred to Phase 28 (after full pipeline is proven working).

### External documentation (Actions)
- `docker/build-push-action` README on GitHub — canonical `type=gha` caching reference
- `docker/login-action` README on GitHub — canonical GHCR login pattern
- `docker/setup-buildx-action` README on GitHub — canonical Buildx setup

### Prior phase context (carry-forward)
- None this phase — Phase 25 is the first phase of v3.5; no prior v3.5 CONTEXT.md exists. v3.0 phases are orthogonal (app-code concern, not infrastructure).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`Dockerfile`** — already produces a working image (pre-Phase-25 production image `ghcr.io/hudsor01/hudsonfam:20260408173607` was built from a previous iteration of this Dockerfile). Phase 25 validates it builds cleanly under GitHub Actions without any Dockerfile changes.
- **Timestamp convention (`YYYYMMDDHHmmss` UTC)** — established by `.woodpecker.yaml:16` and matched by Flux imagepolicy regex (to be verified in Phase 26). Phase 25 preserves the exact format.
- **GHCR repo namespace (`ghcr.io/hudsor01/hudsonfam`)** — already exists (pre-Phase-25 production image is tagged under it); Phase 25 just resumes pushing to it.

### Established Patterns
- **Single-main-branch deploy** — CLAUDE.md §Deployment documents "Push to main → build → push → Flux → K3s" as the intended flow. Phase 25 implements the first arrow of this chain.
- **Vendor-managed > self-hosted** — v3.5 milestone thesis: GitHub Actions (vendor) + GHCR (vendor) replaces Woodpecker (self-hosted) + Forgejo registry (self-hosted). Phase 25 is the first concrete step of this thesis.
- **YYYYMMDDHHmmss Flux convention** — timestamp-based image tags are the project convention for Flux imagepolicy (regex-based numerical ordering). Phase 25 preserves the convention exactly.

### Integration Points
- **GitHub repo** (`github.com/hudsor01/hudsonfam`) — Phase 25 workflow only runs against this repo. No cross-repo / submodule concerns.
- **GHCR** (`ghcr.io/hudsor01`) — Phase 25 pushes; Phase 26 configures Flux to pull. The two phases are cleanly decoupled: Phase 25 can land and accumulate images in GHCR with no cluster impact; Phase 26 wires the cluster to consume them.
- **Dockerfile** — Phase 25 invokes it unchanged; any Dockerfile optimizations (e.g., `RUN --mount=type=cache,target=/root/.bun` for bun global store) are deferred to a post-v3.5 backlog item.

</code_context>

<specifics>
## Specific Ideas

- GitHub Actions cache (`type=gha`) is the industry-standard choice for Docker builds inside GitHub Actions — free up to 10GB per repo; no S3 / GCS / registry-cache infrastructure needed. Matches v3.5's "vendor-managed > self-hosted" thesis.
- `GITHUB_TOKEN` for GHCR push is sufficient when the repo owner owns the package; no PAT needed. Common misconception: people think they need a PAT even for their own repo, but the built-in token with `packages: write` permission works (documented in GitHub's "Publishing and installing a package with GitHub Actions" guide).
- `concurrency: cancel-in-progress: true` is the right posture for a single-developer deploy pipeline — you never want a stale build finishing after a new commit lands; the new commit should invalidate the old build.
- Phase 25 intentionally ships "images accumulating in GHCR with no consumer" — this lets Phase 25 ship independently of any cluster state. Flux keeps serving the pre-Phase-25 production image `:20260408173607` until Phase 26 reconfigures imagerepository to watch the new tag stream.

</specifics>

<deferred>
## Deferred Ideas

- **Image signing via cosign / sigstore** — adds supply-chain integrity but no observable owner-value for solo-user app; post-v3.5 backlog
- **SBOM emission** — `docker/build-push-action` supports `sbom: true`; same cost/benefit analysis as signing; post-v3.5 backlog
- **Matrix build across Node 22 / Node 24** — v3.5 out-of-scope; single-target build matches deploy reality
- **Dockerfile layer-cache optimizations** (e.g., `--mount=type=cache,target=/root/.bun`) — Phase 25 uses the existing Dockerfile as-is; optimization phase comes after v3.5 lands
- **PR preview environments** — CICD-FUTURE-01; not planned for current milestone
- **Automated rollback on health-check failure** — CICD-FUTURE-02; Flux-side concern, not workflow-side
- **Per-commit-SHA tags alongside timestamp** — CICD-FUTURE-03; useful for bisecting but overkill today
- **Self-hosted GitHub Actions runner** — out-of-scope complexity for solo-user app; explicit v3.5 exclusion
- **Manual workflow_dispatch input fields** (e.g., `rebuild_tag` option) — not needed for v1; reserving for ad-hoc rebuilds that just run with defaults

</deferred>

---

*Phase: 25-pipeline-build*
*Context gathered: 2026-04-23 (auto mode — 12 decisions locked using GitHub Actions canonical patterns + existing .woodpecker.yaml timestamp convention + CLAUDE.md-documented intent)*
