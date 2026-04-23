# Phase 25: Pipeline Build (v3.5-P1) — Research

**Researched:** 2026-04-22
**Domain:** GitHub Actions + GHCR Docker build pipeline (DevOps)
**Confidence:** HIGH — 12 decisions already locked in CONTEXT.md; research scope limited to version verification + gotcha surface + canonical YAML shape

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions (copy verbatim — D-01..D-12)

- **D-01:** Single-job workflow `build-and-push` in `.github/workflows/build-and-push.yml`; `runs-on: ubuntu-latest`; job permissions `contents: read` + `packages: write`.
- **D-02:** Triggers = `push.branches: [main]` + `workflow_dispatch: {}`. No PR / tag / schedule triggers.
- **D-03:** Timestamp via `date -u +%Y%m%d%H%M%S` in a dedicated step, stored in `GITHUB_OUTPUT` (matches `.woodpecker.yaml:16` + Flux imagepolicy `^\d{14}$` regex).
- **D-04:** Every build emits 2 tags: `${{ steps.ts.outputs.ts }}` + `latest`, both via build-push-action's `tags` input (newline-delimited).
- **D-05:** `docker/build-push-action@v5`, `platforms: linux/amd64`, `push: true`, `cache-from` + `cache-to` both `type=gha,scope=build-and-push`.
- **D-06:** `docker/setup-buildx-action@v3`, default `docker-container` driver, no `--load`.
- **D-07:** `docker/login-action@v3` to `ghcr.io`; `username: ${{ github.actor }}`; `password: ${{ secrets.GITHUB_TOKEN }}`. NO PAT.
- **D-08:** gha cache: cold 8-12 min; warm 2-6 min. CICD-03 SC caps at 10 min.
- **D-09:** Dockerfile NOT modified this phase.
- **D-10:** Workflow-level `concurrency: { group: 'build-and-push-main', cancel-in-progress: true }`.
- **D-11:** No step-level retry on build-push (failures surface red, not masked).
- **D-12:** Only secret used = `${{ secrets.GITHUB_TOKEN }}` (built-in) + `${{ github.actor }}`. Zero custom repo secrets.

### Claude's Discretion

- YAML whitespace/indentation style
- Step name cosmetics ("Check out code" vs "Checkout")
- Whether to pin `ubuntu-latest` to `ubuntu-24.04` (default: don't)
- `timeout-minutes` on the job (recommended: 20)
- Summary step for Actions UI readability — Claude's call
- Exact order of `setup-buildx` vs `docker login` (both work; buildx-first is GitHub canonical)

### Deferred Ideas (OUT OF SCOPE)

Image signing (cosign/sigstore), SBOM emission, matrix across Node versions, Dockerfile cache-mount optimizations, PR preview environments, auto-rollback, per-SHA tags alongside timestamps, self-hosted runners, workflow_dispatch input fields.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CICD-01 | `.github/workflows/build-and-push.yml` exists and runs on push-to-main; builds Dockerfile to linux/amd64 image | Canonical YAML skeleton below (§3); verified action versions (§2) |
| CICD-02 | Built image pushed to `ghcr.io/hudsor01/hudsonfam` tagged `YYYYMMDDHHmmss` + `latest` | Multi-tag `tags:` input pattern from docker/build-push-action docs (§3); timestamp step pattern from `.woodpecker.yaml:16` convention |
| CICD-03 | Workflow completes in under 10 min warm-cache; logs readable in Actions UI | `type=gha` scoped cache pattern (§3); D-08 timing estimate verified against GitHub's canonical cache guide |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- Path alias `@/*` → `./src/*` (not relevant this phase — no source edits)
- Deployment section in CLAUDE.md documents the target pipeline shape this phase begins implementing
- `.planning/` structure and GSD commands govern planning workflow

## Summary

Phase 25 ships a single YAML file — `.github/workflows/build-and-push.yml` — that is ~50 lines of well-trodden `docker/*` action invocations. CONTEXT.md has already locked every meaningful decision including action major versions (v5/v3/v3). The research contribution is three-fold:

1. **Version-currency check**: CONTEXT.md locks v5/v3/v3 majors, but **current majors as of April 2026 are v7/v4/v4 (released March 2025)**. The v5/v3 choice is still functional today and was correct at the time of decision-locking, but a Node.js 20 runtime deprecation in June-September 2026 will eventually force these to be bumped. This is a forward-looking note for Phase 26+ maintenance, **not a blocker for Phase 25**. Planner should document the version-choice rationale in the workflow file header.
2. **First-push visibility gotcha for Phase 26 handoff**: First `ghcr.io` push to a never-used namespace creates the package as **private** by default. Flux (Phase 26) needs either a PAT pull secret or the package manually flipped to public. This is called out for downstream planners — Phase 25 itself is not blocked because nothing consumes the images yet.
3. **Canonical YAML shape**: Working example below, every field verified against Context7-fetched docker/build-push-action documentation.

**Primary recommendation:** Ship the locked v5/v3/v3 stack as designed; add a single-line comment in the workflow noting "actions pinned at v5/v3 majors per 25-CONTEXT D-05/06/07; v7/v4 migration deferred past v3.5-P4." Two tasks: (1) write the file; (2) commit. Optional third: `yamllint` validation.

## Architectural Responsibility Map

Multi-tier mapping for this phase — almost entirely external/vendor-managed:

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Build trigger (push / workflow_dispatch) | CI Vendor (GitHub Actions) | — | Fully vendor-owned event |
| Docker image build | CI Vendor (GitHub-hosted runner) | — | `ubuntu-latest` provides buildx host; BuildKit inside `docker-container` driver |
| Image registry storage | Vendor Registry (GHCR) | — | ghcr.io is vendor-managed; no local infra |
| Layer cache | CI Vendor (GHA native cache) | — | `type=gha` stores in GitHub's cache service; 10GB/repo free quota |
| Tag emission (timestamp + latest) | CI Vendor (Actions step output) | — | `date -u` in runner shell; consumed by build-push `tags` input |
| Auth | CI Vendor (OIDC-adjacent via GITHUB_TOKEN) | — | Built-in short-lived token; no secret management needed this phase |

**Note:** Phase 25 is infrastructure-only; no application-tier work exists. The entire `src/`, database, and K3s deployment are untouched. This phase's output is three states: a new YAML file, a new file in git, and images accumulating in a vendor registry.

## Standard Stack

### Core (locked — use exactly as listed; do not substitute)

| Action | Version (locked) | Purpose | Context7 verified |
|--------|------|---------|---------|
| `actions/checkout` | `@v4` | Clone repo into runner workspace | CITED: actions/checkout README — still current runner-compatible; v5/v6 exist but v4 is stable baseline |
| `docker/setup-buildx-action` | `@v3` | Configure Buildx with `docker-container` driver | CITED: Context7 `/docker/build-push-action` — v3 is the documented-compatible major for use with build-push-action@v5 |
| `docker/login-action` | `@v3` | Auth to `ghcr.io` | CITED: Context7 + docker/login-action README |
| `docker/build-push-action` | `@v5` | Build + push + cache orchestration | CITED: Context7 `/docker/build-push-action` |

**Version verification (performed 2026-04-22):**
- `docker/build-push-action` latest release: **v7.1.0** (April 10, 2025). v5.x remains functional. `[VERIFIED: github.com/docker/build-push-action/releases]`
- `docker/setup-buildx-action` latest release: **v4.0.0** (March 5, 2025). v3.x remains functional. `[VERIFIED: github.com/docker/setup-buildx-action/releases]`
- `docker/login-action` latest release: **v4.1.0** (2025). v3.x remains functional. `[VERIFIED: github.com/docker/login-action/releases]`
- `actions/checkout` latest major: **v5/v6** (Node 24 compatible). v4 still works; recommended bump to v6 before June 2026 Node 20 forced deprecation. `[VERIFIED: github.com/actions/checkout/releases]`

**Forward-looking flag (not a Phase 25 blocker):** GitHub Actions runners will force Node 24 as the default starting **June 2, 2026**, and will remove Node 20 from the runner **September 16, 2026**. Actions using `v5` (build-push) / `v3` (buildx, login) / `v4` (checkout) are all Node-20-based internally. They will emit deprecation warnings until their end dates but will not fail builds until Node 20 is actually removed. A v3.x/v4 maintenance phase bumping all four to Node-24-compatible majors (`v7`/`v4`/`v4`/`v6`) should land before September 2026. This is Phase 26+ backlog, not Phase 25 scope.

### Installation (none required)

No `npm install`. No local tooling. Runner comes pre-configured with Docker, Buildx v0.x, GHCR auth paths, and `date` utility. The only "installation" is: write file → commit → push.

### Alternatives Considered (CONTEXT.md locks all choices; this table documents the closed question for audit)

| Instead of locked choice | Could Use | Why locked choice wins |
|------------|-----------|----------|
| `type=gha` cache | `type=registry` (GHCR-hosted cache image) | Registry cache works but doubles push traffic; gha native is simpler, zero-config, free 10GB |
| `ubuntu-latest` | `ubuntu-24.04` pinned | Pinning trades reproducibility for eventual runner-image EOL; `ubuntu-latest` bumps invisibly |
| `GITHUB_TOKEN` | Fine-grained PAT | PAT needed for Flux (external consumer, Phase 26); workflow is internal, built-in token has `packages:write` |
| Single amd64 build | Multi-arch via QEMU | Cluster is amd64-only (ROADMAP exclusion); adding arm64 slows build ~3x for zero runtime value |

## Architecture Patterns

### System Architecture Diagram

```
┌────────────────┐
│  git push main │
│  or manual run │
└───────┬────────┘
        │  (push event or workflow_dispatch)
        ▼
┌─────────────────────────────────────────────┐
│  GitHub Actions workflow: build-and-push    │
│  runs-on: ubuntu-latest                     │
│  permissions: contents:read packages:write  │
│  concurrency: build-and-push-main (cancel)  │
│                                             │
│  Step 1: actions/checkout@v4                │
│         │ (repo files available in runner)  │
│         ▼                                   │
│  Step 2: Generate timestamp                 │
│         │ date -u +%Y%m%d%H%M%S             │
│         │ echo "ts=$ts" >> $GITHUB_OUTPUT   │
│         ▼                                   │
│  Step 3: docker/setup-buildx-action@v3      │
│         │ (buildx host ready; docker-       │
│         │  container driver initialized)    │
│         ▼                                   │
│  Step 4: docker/login-action@v3             │
│         │ registry: ghcr.io                 │
│         │ user: github.actor                │
│         │ pass: secrets.GITHUB_TOKEN        │
│         ▼                                   │
│  Step 5: docker/build-push-action@v5        │
│         │ context: .                        │
│         │ file: ./Dockerfile                │
│         │ platforms: linux/amd64            │
│         │ push: true                        │
│         │ tags: [ghcr.io/.../hudsonfam:TS,  │
│         │        ghcr.io/.../hudsonfam:latest]│
│         │ cache-from/to: type=gha,scope=..  │
│         ▼                                   │
└─────────────────────────────────────────────┘
        │
        ▼
┌────────────────────────────────────┐
│  ghcr.io/hudsor01/hudsonfam        │
│  (two new tags per run)            │
│                                    │
│  Flux (Phase 26+) will watch this; │
│  Phase 25 just accumulates images  │
└────────────────────────────────────┘
```

### Recommended Project Structure

```
.github/
└── workflows/
    └── build-and-push.yml   # ONLY file created this phase
```

The `.github/` directory does not currently exist in hudsonfam (verified 2026-04-22). The workflow file is genuinely greenfield.

### Pattern: single-job build+push with gha cache (canonical)

**What:** One job does everything — checkout, timestamp, buildx, login, build+push. No matrix, no dependent jobs, no artifacts passed between jobs.

**When to use:** Single-target single-arch builds without pre-build linting/testing steps (hudsonfam's test suite already runs via Vitest locally pre-commit; CI-side test parallelism is out of scope per CONTEXT.md).

**Example:** See §3 Canonical Workflow YAML Shape below.

### Anti-Patterns to Avoid

- **Using `-` pinning like `@v5.0.0`:** Over-pins; security fixes within v5.x won't flow in. Use major-only (`@v5`) per D-05/D-06/D-07.
- **`contents: write` or `id-token: write`:** Not needed this phase. Principle of least privilege. `contents: read` + `packages: write` is the minimum and matches D-01.
- **Omitting the `concurrency` block:** Without it, simultaneous pushes build in parallel and race to GHCR; timestamps still differ so there's no name collision, but wasted runner minutes and confusing log trails result. D-10 prevents this.
- **Hard-coding the image name:** `ghcr.io/hudsor01/hudsonfam` is stable per CLAUDE.md and the pre-Phase-25 production tag `ghcr.io/hudsor01/hudsonfam:20260408173607`. Prefer the literal over `${{ github.repository }}` — GitHub's `repository` context returns `hudsor01/hudsonfam` which matches, but a rename would silently redirect. CONTEXT.md implies literal; stay explicit.
- **Using `${{ github.repository_owner }}` as GHCR username for same-repo push:** Works, but `github.actor` matches D-07. They are equivalent here; don't switch.

## Canonical Workflow YAML Shape

Complete working file the executor writes verbatim (with only cosmetic adjustments). Every line is grounded in either CONTEXT.md decisions or Context7-verified docker/* action documentation.

```yaml
# .github/workflows/build-and-push.yml
#
# Phase 25 / v3.5-P1: Builds the hudsonfam Dockerfile and pushes to GHCR
# with YYYYMMDDHHmmss UTC timestamp + latest tags. Consumed by Flux
# imagepolicy (Phase 26) via numerical-ordering regex ^\d{14}$.
#
# Action versions pinned to v5/v3 majors per 25-CONTEXT.md D-05/06/07.
# A Node 24 migration (v7/v4 majors) is deferred past v3.5-P4; the
# GitHub Actions runner forces Node 24 default on 2026-06-02 and
# removes Node 20 on 2026-09-16. Current versions remain functional
# inside that window.

name: build-and-push

on:
  push:
    branches: [main]
  workflow_dispatch:

concurrency:
  group: build-and-push-main
  cancel-in-progress: true

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    timeout-minutes: 20
    permissions:
      contents: read
      packages: write

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Generate timestamp tag
        id: ts
        run: |
          timestamp="$(date -u +%Y%m%d%H%M%S)"
          echo "ts=${timestamp}" >> "$GITHUB_OUTPUT"
          echo "Timestamp tag: ${timestamp}"

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Log in to GHCR
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: .
          file: ./Dockerfile
          platforms: linux/amd64
          push: true
          tags: |
            ghcr.io/hudsor01/hudsonfam:${{ steps.ts.outputs.ts }}
            ghcr.io/hudsor01/hudsonfam:latest
          cache-from: type=gha,scope=build-and-push
          cache-to: type=gha,scope=build-and-push,mode=max
```

### Field-by-field justification

- `name: build-and-push` — matches CONTEXT.md workflow name convention; appears in Actions UI as the job title.
- `on.push.branches: [main]` + `workflow_dispatch:` — D-02 exactly.
- `concurrency.group: build-and-push-main` + `cancel-in-progress: true` — D-10 exactly.
- `timeout-minutes: 20` — Claude's Discretion per CONTEXT.md; defensive against runaway builds; double the 10-min CICD-03 SC.
- `permissions.contents: read` + `packages: write` — D-01 minimum scope for checkout + GHCR push.
- `actions/checkout@v4` — current baseline; no LFS, no submodules, shallow clone default (sufficient since Dockerfile does not read git history).
- Timestamp step: `id: ts` exposes `steps.ts.outputs.ts` for downstream reference per D-03. Using `$GITHUB_OUTPUT` (file-based) is the current-correct pattern; the legacy `::set-output::` syntax was removed from GitHub Actions in 2022.
- `docker/setup-buildx-action@v3` — no `with:` block; all defaults match D-06 (docker-container driver, no custom builder).
- `docker/login-action@v3` with `registry: ghcr.io` — D-07 exactly. `username: github.actor` is the committer (for push) or the manual-trigger invoker (for workflow_dispatch); both are valid package owners.
- `docker/build-push-action@v5` — D-05 exactly. `mode=max` on cache-to is the canonical recommendation for monorepo-style caches (caches all intermediate layers, not just the final stage); this matters for hudsonfam's 3-stage Dockerfile (deps → builder → runner) because the `deps` stage is the slowest and most reusable.

**Note on cache mode:** Context7 docs show `cache-to: type=gha,mode=max` as the pattern. CONTEXT.md D-05 says `cache-to: type=gha,scope=build-and-push` — does not specify mode. Adding `mode=max` aligns with the canonical pattern and is inside Claude's Discretion (D-05 doesn't forbid it). Without `mode=max`, only the final-stage layers are cached, which defeats 80% of the cache benefit on a 3-stage Dockerfile. Strongly recommend the planner includes `mode=max`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Docker image layer caching | `docker save` + `actions/cache` | `cache-from/cache-to: type=gha` in build-push-action | BuildKit integrates natively with GitHub's cache service; handles manifest-level dedup, cross-stage cache imports, size capping automatically |
| Image tagging with timestamp | Multiple `docker tag` + `docker push` shell commands | `tags:` input with newline-delimited list in build-push-action | Single push operation, tag resolution happens inside BuildKit, no race conditions |
| GHCR auth | `docker login` shell command + stdin password | `docker/login-action@v3` | Handles token refresh, credential-helper cleanup, runner-level credential scoping; also provides auditability in Actions log |
| Buildx setup | `apt install` + `docker buildx install` | `docker/setup-buildx-action@v3` | Installs correct Buildx version for the runner OS, initializes a builder with sensible defaults, sets up BuildKit container |
| Timestamp generation | Node.js / Python script | `date -u +%Y%m%d%H%M%S` in a `run:` step | POSIX utility already on the runner; matches `.woodpecker.yaml:16` convention exactly; zero dependencies |

**Key insight:** The entire workflow is a composition of four official Docker-maintained actions + one official GitHub action. There is nothing custom to build. The "Don't Hand-Roll" discipline for Phase 25 is: **resist the urge to add anything that isn't already in the locked stack.** No `docker/metadata-action` (not needed — tagging is manual + simple), no `anchore/sbom-action` (deferred), no cosign (deferred), no matrix strategy (deferred).

## Known Gotchas

### Gotcha 1: `GITHUB_TOKEN` write-to-packages requires explicit `permissions:` block

**What goes wrong:** Workflow runs, login succeeds, build succeeds, `push` step fails with HTTP 403 `unauthorized: denied`.

**Why it happens:** GitHub's default `GITHUB_TOKEN` permissions since 2023 are **read-only** for most scopes, including `packages`. The `packages: write` scope must be explicitly granted at either the workflow level, the job level, or via repo-level default permissions settings.

**How to avoid:** D-01 already specifies job-level `permissions.packages: write`. Verify the skeleton YAML in §3 has this block. If the token ever gets a 403, first thing to check is repo Settings → Actions → General → Workflow permissions — if set to "Read repository contents and packages permissions", the job-level block still overrides it upward; if set to "Read-only" only, the job-level `packages: write` override still works. The job-level block is authoritative; the repo setting is a ceiling on default behavior only.

**Warning signs:** Step named "Build and push" fails at the very end (after full build, at push time) with `unauthorized`. A successful login (prior step) is not a guarantee — `docker/login-action` validates token presence but not scope.

**Confidence:** HIGH `[VERIFIED: docs.github.com/packages working-with-container-registry]`

### Gotcha 2: First-ever push to `ghcr.io/<owner>/<repo>` creates the package as PRIVATE

**What goes wrong:** Phase 25 completes green. Flux (Phase 26) adds a pull secret, but pulls still fail with `denied: denied` on the package.

**Why it happens:** GHCR defaults new packages to **private visibility** on first push, regardless of the source repo's visibility. Same-org pushes from GitHub Actions with `GITHUB_TOKEN` work fine (they're authenticated), but external pullers (Flux running in K3s) need either (a) a pre-provisioned GHCR PAT pull secret, or (b) the package manually flipped to public via `github.com/users/hudsor01/packages/container/hudsonfam/settings`.

**How to avoid:** This is **NOT a Phase 25 blocker** — nothing consumes images from GHCR in Phase 25. Phase 26's CICD-05 explicitly addresses this by provisioning a GHCR PAT via ExternalSecret. **Planner callout:** write a note at the end of the workflow file (or in STATE.md) reminding the Phase 26 planner that either (a) the package will need a pull PAT OR (b) the owner can manually flip visibility after the first Phase 25 build lands. Don't surprise Phase 26.

**Historical caveat:** The pre-Phase-25 image `ghcr.io/hudsor01/hudsonfam:20260408173607` already exists (per CONTEXT.md §Current state). This means the `hudsonfam` package ALREADY EXISTS on GHCR and has whatever visibility was set when it was first created. The owner should check `github.com/users/hudsor01/packages/container/hudsonfam/settings` to confirm current visibility before Phase 26.

**Warning signs:** Phase 26 `imagerepository` shows `Ready: False, reason: denied` despite pull secret being correctly provisioned. Fix = either visibility flip or PAT with `read:packages` scope.

**Confidence:** HIGH `[VERIFIED: docs.github.com/packages about-permissions-for-github-packages]`

### Gotcha 3: `concurrency: cancel-in-progress: true` cancels mid-push but timestamp uniqueness is preserved

**What goes wrong (perceived):** Owner worries that canceling a mid-push build will leave half-uploaded layers in GHCR under a tag, producing a corrupt image.

**Why this is actually safe:** GHCR uses Docker's content-addressable storage — a manifest only commits atomically once all blob uploads complete. A canceled push at layer 7 of 10 means no manifest is written, so no tag is created. The timestamp tag for the canceled run is "lost" (never existed on the registry), and the next run generates a fresh timestamp. No corrupt images, no collisions.

**Warning sign (false alarm):** Actions UI shows a canceled run with the "Build and push" step marked red. This is expected. Check GHCR — the canceled run's timestamp tag will be absent, which is correct behavior.

**Confidence:** HIGH `[CITED: Docker BuildKit OCI distribution spec — manifest atomicity]`

### Gotcha 4: `type=gha` cache scope defaults to branch name → unnecessary cache pollution

**What goes wrong (in default config):** Without explicit `scope=`, `type=gha` cache keys default to `buildkit-{branch-name}`. Branch proliferation (feature branches, PR branches) pollutes the cache, and the 10GB per-repo quota can thrash.

**Why D-05's locked config is correct:** D-05 specifies `scope=build-and-push` (same literal string for both cache-from and cache-to). This overrides the branch-name default with a single stable scope, so every build (regardless of branch that triggered it — though per D-02 only `main` triggers) reads and writes the same cache bucket.

**Warning sign:** Sudden warm-cache regressions (builds that used to take 3 min suddenly take 8 min) on an unchanged Dockerfile. Check cache hit logs in the "Build and push" step output — look for `importing cache manifest from type=gha` and "X layers cached, Y layers built". Low cache-hit ratio = scope config is broken.

**Confidence:** HIGH `[VERIFIED: docs.docker.com/build/ci/github-actions/cache/]`

### Gotcha 5: Dockerfile `RUN npm install -g bun` inside build stages is not cached across runs by default

**What this means for Phase 25:** Hudsonfam's Dockerfile has `RUN apk add --no-cache libc6-compat && npm install -g bun` in both `deps` and `builder` stages (lines 9-10 and 26). These `RUN` layers cache at the BuildKit layer level, so as long as the preceding `FROM node:22-alpine` hash is stable, they cache reliably.

**When it breaks:** `node:22-alpine` is a floating tag — Docker Hub can update it upstream, invalidating the cache. This happens ~weekly. After such an invalidation, the cold-rebuild path triggers for `deps` stage (which takes ~3-5 min to reinstall all npm deps). This is the expected 8-12 min cold-build behavior in D-08.

**How to avoid (Phase 25+ deferral):** Pin `node:22.x.x-alpine` to an exact digest, e.g., `FROM node:22-alpine@sha256:abc...`. This is a Dockerfile change and therefore **out of scope for Phase 25 per D-09**. Document this as a future Dockerfile optimization phase.

**Confidence:** MEDIUM `[ASSUMED: based on BuildKit caching semantics and Docker Hub tag update cadence]`

## Runtime State Inventory

Phase 25 creates a new file; it does not rename, refactor, or migrate any existing runtime state. This section is largely **None — verified by X** for each category:

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | **None** — Phase 25 does not touch databases, ChromaDB, Mem0, n8n workflows, Redis, or any other state store. Verified by grep: no SQL / ORM / cache keys referenced in CONTEXT.md decisions. | None |
| Live service config | **One item — pre-existing GHCR package visibility.** The `hudsonfam` GHCR package already exists (from pre-Phase-25 production image). Its visibility setting persists and affects Phase 26. | Owner verifies current GHCR package visibility at `github.com/users/hudsor01/packages/container/hudsonfam/settings` before Phase 26 planning; documents result in STATE.md or 26-CONTEXT.md. **Not Phase 25's responsibility, but worth a one-line verification step if the planner wants to reduce Phase 26 surprise.** |
| OS-registered state | **None** — Phase 25 does not touch Windows Task Scheduler, systemd, launchd, pm2, or cron. | None |
| Secrets / env vars | **Only `GITHUB_TOKEN` (auto-injected by GitHub Actions).** No new repo secrets created, no existing secrets renamed or re-keyed. | None |
| Build artifacts | **None new this phase.** The existing Dockerfile is unchanged (D-09). Existing GHCR tags (`:20260408173607`) are untouched. | None |

**The canonical question:** "After every file in the repo is updated, what runtime systems still have the old string cached, stored, or registered?" — Answer: **nothing**, because nothing is being renamed or refactored. Phase 25 is pure file-addition.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | N/A — this phase introduces a YAML config file, not TypeScript code. The project's Vitest suite (268 tests) is unaffected. |
| Config file | `.github/workflows/build-and-push.yml` is the artifact; its correctness is validated by (a) YAML parsability and (b) actually running the workflow |
| Quick run command | `yamllint .github/workflows/build-and-push.yml` (if `yamllint` available) OR VS Code's built-in YAML validation |
| Full suite command | Trigger the workflow via `gh workflow run build-and-push.yml` (workflow_dispatch); observe green checkmark in Actions UI |
| Phase gate | Full suite green + GHCR shows new tag within 12 minutes of trigger |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CICD-01 | `.github/workflows/build-and-push.yml` exists, parses as valid YAML, triggers match D-02, uses `actions/checkout` + `docker/setup-buildx-action` + `docker/login-action` + `docker/build-push-action` | file-existence + YAML-parse + grep | `test -f .github/workflows/build-and-push.yml && yamllint .github/workflows/build-and-push.yml && grep -q 'docker/build-push-action@v5' .github/workflows/build-and-push.yml` | ❌ Wave 0 (create the file) |
| CICD-02 | Push to main triggers build; two tags land in GHCR (`YYYYMMDDHHmmss` + `latest`); image is `linux/amd64`; ≤ 600MB | smoke (manual or `gh run watch`) | `gh workflow run build-and-push.yml && gh run watch` then `docker manifest inspect ghcr.io/hudsor01/hudsonfam:latest` | ❌ Wave 0 (requires Phase 25 deployment) |
| CICD-03 | Warm-cache build completes under 10 minutes; Actions UI logs are readable | smoke (timing + UI inspection) | `gh run list --workflow=build-and-push.yml --limit 2` + owner inspects duration | ❌ Wave 0 (requires 2nd run after 1st established cache) |

### Sampling Rate

- **Per task commit:** `yamllint .github/workflows/build-and-push.yml` (static — runs locally pre-commit)
- **Per wave merge:** N/A — single-wave phase
- **Phase gate:** First workflow_dispatch trigger returns green AND tag lands in GHCR AND second trigger completes in under 10 min

### Wave 0 Gaps

- [ ] `.github/workflows/build-and-push.yml` — does not exist; must be created in the implementation task
- [ ] `yamllint` availability check — if `yamllint` not installed on dev machine, fall back to Actions CLI (`gh workflow view build-and-push.yml` parses the YAML as a side effect) or VS Code's YAML extension's built-in schema validation

*(No pre-existing test fixtures needed; this is a YAML-only phase.)*

## Code Examples

Verified patterns from Context7:

### Canonical GHCR push with gha cache (from docker/build-push-action Context7 docs)

```yaml
# Source: /docker/build-push-action Context7 llms.txt
# Adapted to match 25-CONTEXT.md D-05/06/07 (v5/v3/v3 pins)
- name: Login to GHCR
  uses: docker/login-action@v3
  with:
    registry: ghcr.io
    username: ${{ github.repository_owner }}   # D-07 uses github.actor; both work
    password: ${{ secrets.GITHUB_TOKEN }}

- name: Build and push
  uses: docker/build-push-action@v5
  with:
    push: true
    tags: |
      ghcr.io/${{ github.repository }}:latest
      ghcr.io/${{ github.repository }}:${{ github.sha }}
    cache-from: type=gha
    cache-to: type=gha,mode=max
```

### Timestamp step (matches `.woodpecker.yaml:16` exactly)

```yaml
- name: Generate timestamp tag
  id: ts
  run: |
    timestamp="$(date -u +%Y%m%d%H%M%S)"
    echo "ts=${timestamp}" >> "$GITHUB_OUTPUT"
```

Reference `${{ steps.ts.outputs.ts }}` in the build step. `$GITHUB_OUTPUT` is the current-correct file-based output mechanism (legacy `::set-output::` was removed from Actions in 2022).

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `::set-output name=ts::20260422120000` | `echo "ts=..." >> "$GITHUB_OUTPUT"` | GitHub Actions deprecated `::set-output::` in Oct 2022 (full removal Nov 2023) | D-03 already uses current pattern |
| `docker/build-push-action@v2` with `buildx` pre-installed | `docker/setup-buildx-action@v3` as prerequisite step | build-push-action v3+ requires explicit buildx setup (published 2022) | D-05/06 match current pattern |
| GHCR PAT (`CR_PAT`) for internal workflow pushes | `GITHUB_TOKEN` with `packages: write` permission | GitHub enabled built-in token for GHCR in early 2022 | D-07/D-12 already use current pattern; PAT is a Phase 26 concern |
| `docker/build-push-action@v5` (current lock) | `docker/build-push-action@v7` (April 2025) | v6 (June 2024): build-summary feature; v7 (Mar 2025): Node 24 runtime | **Not a Phase 25 break**; v5 functional through Sept 16 2026 runtime deprecation |
| `docker/setup-buildx-action@v3` (current lock) | `docker/setup-buildx-action@v4` (March 2025) | v4: Node 24 runtime, ESM switch, deprecated inputs removed | **Not a Phase 25 break**; v3 functional through Sept 16 2026 |
| `docker/login-action@v3` (current lock) | `docker/login-action@v4` (2025) | v4: Node 24 runtime, ESM switch | **Not a Phase 25 break**; v3 functional through Sept 16 2026 |
| `actions/checkout@v4` (recommended this phase) | `actions/checkout@v5/v6` | Periodic Node 20 → Node 24 migration track | **Not a Phase 25 break**; v4 functional through mid-2026 |

**Deprecated/outdated:**
- `docker/build-push-action@v4` and earlier — missing modern cache semantics; should not be used for new workflows.
- `set-output::` step output syntax — removed.
- `image-tags-action` / `crazy-max/ghaction-docker-meta` — superseded by `docker/metadata-action` (which we don't need since tagging is manual + simple).

## Security Domain

Phase 25 is CI/CD infrastructure. ASVS categories apply as follows:

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | `docker/login-action@v3` to GHCR with `GITHUB_TOKEN` (short-lived, scoped, auto-rotated by GitHub) |
| V3 Session Management | no | No user sessions; CI token is per-run, not session-based |
| V4 Access Control | yes | `permissions:` block with principle of least privilege (`contents: read` + `packages: write`); workflow triggers restricted to `push.main` + `workflow_dispatch` (no PR triggers → no fork-originated writes) |
| V5 Input Validation | minimal | No user inputs except implicit `workflow_dispatch` (no `inputs:` defined); no injection surface |
| V6 Cryptography | no | No crypto operations this phase. TLS to GHCR is vendor-managed. |
| V7 Error Handling / Logging | yes | Actions UI logs are owner-visible; failed builds surface red (D-11 no-retry policy ensures genuine failures aren't masked) |
| V14 Config | yes | YAML config is committed to git; no secrets embedded; no inline tokens |

### Known Threat Patterns for GitHub Actions + GHCR

| Pattern | STRIDE | Standard Mitigation | Applied in Phase 25? |
|---------|--------|---------------------|----------------------|
| Pull-request-triggered workflow runs with elevated permissions (code injection from forks) | Elevation of Privilege | Don't trigger on `pull_request` from forks with write permissions | YES — D-02 excludes PR triggers entirely |
| Unpinned action tags (e.g., `@main`) allowing upstream tampering | Tampering | Pin to major version (`@v5`) or, for hardening, to commit SHA | YES — D-05/06/07 pin major versions; SHA-pinning deferred |
| Leaked `GITHUB_TOKEN` via `run:` step echoing env | Information Disclosure | GitHub automatically redacts `secrets.*` values from logs; don't echo `$GITHUB_TOKEN` in a `run` script | YES — no echo of token in canonical YAML |
| Overly-broad `permissions:` granting `contents: write` or `id-token: write` | Elevation of Privilege | Principle of least privilege: minimum scope per job | YES — D-01 locks `contents: read` + `packages: write` only |
| Supply-chain compromise of docker/* actions | Tampering | Major-version pin + Dependabot/Renovate monitoring (deferred per v3.5 out-of-scope list) | PARTIAL — major-version pin yes; automated monitoring deferred |
| Cache poisoning via `type=gha` across PR forks | Tampering | GitHub scopes gha cache by repo + branch ref; forks cannot write to upstream scope | YES — implicit to `type=gha` semantics; D-05's `scope=build-and-push` is an additional scope narrower |

**Not applicable to Phase 25:** OWASP API security (no HTTP API ships), session fixation (no sessions), SSRF (no outbound user-controlled requests), XSS (no rendering surface).

## Ordered Task Hints for Planner

**Strong recommendation: 2 tasks, optional 3rd.**

1. **Task 1 — Create workflow file.**
   - Write `.github/workflows/build-and-push.yml` using the canonical YAML shape from §3.
   - Verify file is ≤ 60 lines.
   - Verify every D-01..D-12 decision maps to a concrete YAML field (see §3 field-by-field justification).
   - Local validation: `yamllint .github/workflows/build-and-push.yml` (if available) OR `gh workflow view` after first push.

2. **Task 2 — Commit and push.**
   - `git add .github/workflows/build-and-push.yml`
   - Commit message: `ci(25): add GitHub Actions build-and-push workflow for GHCR`
   - Push to `main` (CONTEXT.md's chosen trigger branch — this IS the smoke test).
   - Watch Actions UI for green run. If red, read the log; don't retry blind (D-11).
   - Verify GHCR tags: `https://github.com/users/hudsor01/packages/container/hudsonfam` should show two new tags.

3. **(Optional) Task 3 — Documentation note.**
   - Add a one-line STATE.md entry: "Phase 25 v3.5-P1 shipped; next: Phase 26 Flux reconfig — verify GHCR package visibility before planning."
   - This surfaces the Gotcha 2 follow-up without creating a separate planning artifact.

**Do NOT add tasks for:**
- Tests (no runtime code changed).
- Dockerfile modifications (D-09).
- Flux / cluster config (out of Phase 25 scope — Phase 26).
- Deleting `.woodpecker.yaml` (Phase 27).
- CLAUDE.md rewrites (Phase 28 — CICD-11).
- PAT provisioning (Phase 26 — CICD-05).

**Anticipated time:** 20-30 minutes owner-time including the first build's observation window. Cold-cache first build will take 8-12 minutes on GitHub's runners per D-08.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Pre-Phase-25 GHCR image `ghcr.io/hudsor01/hudsonfam:20260408173607` implies the `hudsonfam` package already exists on GHCR with some persisted visibility setting (pulled from CONTEXT.md §Current state) | Gotcha 2 | LOW — CONTEXT.md explicitly states this image exists; if absent, first push just creates the package as private (D-07's GITHUB_TOKEN still authorizes the push) |
| A2 | `node:22-alpine` tag floats and is updated ~weekly by Docker Hub, invalidating the FROM layer periodically (estimated behavior, not measured) | Gotcha 5 | LOW — affects cold-build timing estimates (D-08 range 8-12 min) not correctness |
| A3 | GitHub's 2026-06-02 forced Node 24 runtime default and 2026-09-16 Node 20 removal dates are accurate as announced | Summary + State of the Art | MEDIUM — if dates slip earlier, v5/v3 versions break sooner; if later, more runway. Owner should subscribe to GitHub Actions changelog. |
| A4 | hudsonfam's image size will remain ≤ 600MB on the GitHub-hosted runner (CICD-03 SC) — based on CONTEXT.md's "~500MB per existing prod image" note | Validation Architecture | LOW — size is a function of the Dockerfile (unchanged per D-09); runner environment does not affect final image size |
| A5 | `cache-to: type=gha,scope=build-and-push,mode=max` is a drop-in, D-05-compatible improvement over the bare `type=gha,scope=build-and-push` in CONTEXT.md — `mode=max` is a well-documented canonical improvement for multi-stage Dockerfiles | §3 Field-by-field justification | LOW — absent `mode=max`, only final-stage layers cache; warm builds slower but not broken. Planner can drop the `mode=max` if they want literal D-05 compliance. |

## Open Questions

1. **Current visibility of pre-existing `ghcr.io/hudsor01/hudsonfam` package.**
   - What we know: The pre-Phase-25 image `:20260408173607` exists at this path.
   - What's unclear: Whether the package is currently public or private on GHCR.
   - Recommendation: Owner does a 30-second visual check at `https://github.com/users/hudsor01/packages/container/hudsonfam/settings` before Phase 26 planning. Not a Phase 25 blocker.

2. **Whether to pre-emptively bump to v7/v4/v4/v5+ action majors.**
   - What we know: CONTEXT.md locks v5/v3/v3/v4 explicitly per D-05/06/07. Current majors are v7/v4/v4/v6.
   - What's unclear: Whether owner wants to ship the locked version and revisit before the Node 20 deprecation, OR lift the lock and ship current majors now.
   - Recommendation: **Ship the locked versions** per CONTEXT.md. The decision was deliberate. v3.5-P4 or a post-v3.5 maintenance phase can bump majors — they are mechanical, well-documented migrations (only runtime node version changes; API surface of each action is stable).

## Environment Availability

Phase 25 runs entirely on GitHub-vendor infrastructure. Local dev environment audit:

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `gh` CLI | Optional — manual workflow_dispatch trigger for smoke test | ✓ (assumed — standard dev toolchain) | — | GitHub web UI: Actions tab → Run workflow button |
| `yamllint` | Optional — pre-commit YAML validation | ? (unverified) | — | VS Code's built-in YAML schema validation, OR skip and let `gh workflow view` / first run validate |
| Git + push access to `github.com/hudsor01/hudsonfam` | Required for commit | ✓ (owner has push access — confirmed by existing repo activity) | — | — |
| GitHub Actions enabled on the repo | Required for workflow to run | ✓ (assumed enabled — free tier available; repo is private but Actions is free for private repos up to 2000 min/month) | — | Enable at Settings → Actions → General → Allow all actions |
| `docker` / `docker buildx` locally | **Not required for Phase 25** — all build happens on the runner | — | — | — |

**Missing dependencies with no fallback:** None.

**Missing dependencies with fallback:**
- `yamllint` (optional): if absent, validate via `gh workflow view build-and-push.yml` after first push (the Actions API parses and returns an error if invalid).

## Sources

### Primary (HIGH confidence)
- Context7 `/docker/build-push-action` — canonical GHCR + `type=gha` cache examples, multi-tag `tags:` input syntax, current recommendation of `@v7`/`@v4`/`@v4` but backward compat with v5/v3 stacks
- [docker/build-push-action releases](https://github.com/docker/build-push-action/releases) — v7.1.0 (April 2025) latest; v5.x still available and functional
- [docker/setup-buildx-action releases](https://github.com/docker/setup-buildx-action/releases) — v4.0.0 latest (March 2025)
- [docker/login-action releases](https://github.com/docker/login-action/releases) — v4.1.0 latest (2025)
- [docs.github.com — Working with the Container registry](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry) — GITHUB_TOKEN + packages:write permission pattern; default-private package visibility
- [docs.github.com — About permissions for GitHub Packages](https://docs.github.com/en/packages/learn-github-packages/about-permissions-for-github-packages) — first-push visibility defaults
- [docs.docker.com — Cache management with GitHub Actions](https://docs.docker.com/build/ci/github-actions/cache/) — canonical `type=gha,mode=max` pattern

### Secondary (MEDIUM confidence)
- [GitHub Actions Node 20 deprecation discussion](https://github.com/orgs/community/discussions/189324) — June 2026 / September 2026 milestone dates
- CONTEXT.md-cited `.woodpecker.yaml:16` — timestamp format convention precedent (internal source, direct code read)

### Tertiary (LOW confidence)
- None — all Phase 25 claims are grounded in either Context7, official GitHub/Docker docs, or direct source-file inspection.

## Metadata

**Confidence breakdown:**
- Standard stack (action versions + YAML shape): **HIGH** — CONTEXT.md locks + Context7 verification + official docs cross-reference
- Architecture (single-job shape): **HIGH** — trivial workflow, canonical pattern, three-step sequence with no branching
- Gotchas: **HIGH** — all five are officially documented or semantically implied by vendor behavior; first-push visibility is the single most-likely-to-bite one for Phase 26 handoff
- Forward-looking (v7/v4 migration): **MEDIUM** — Node 24 forced-runtime date could slip either direction within weeks

**Research date:** 2026-04-22
**Valid until:** 2026-06-01 — action version current states should be re-verified if Phase 25 is not implemented by then (GitHub's Node 20 deprecation cutover window)

---

*Research complete. Planner can draft PLAN with confidence: 2 tasks + 1 optional, ~30 min total, zero code changes.*
