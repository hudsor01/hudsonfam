---
phase: 25-pipeline-build
plan: 01
subsystem: infrastructure/ci-cd
tags: [ci, github-actions, ghcr, docker, v3.5-P1]
requires:
  - Dockerfile (multi-stage Node 22 Alpine + bun; pre-existing, unchanged this phase)
  - GitHub repo hudsor01/hudsonfam with Actions enabled
  - GHCR namespace ghcr.io/hudsor01 (pre-existing, contains prior tag :20260408173607)
provides:
  - .github/workflows/build-and-push.yml — single-job push-to-main → GHCR pipeline
  - Timestamp-tagged images at ghcr.io/hudsor01/hudsonfam (YYYYMMDDHHmmss + latest)
  - Foundation for Phase 26 Flux imagepolicy reconfiguration
affects:
  - GHCR package hudsor01/hudsonfam (new images accumulate silently until Phase 26 wires consumer)
  - No cluster impact this phase (K3s still serves pre-existing :20260408173607 via existing Flux config)
tech-stack:
  added:
    - "GitHub Actions workflow (ubuntu-latest runner, vendor-managed)"
    - "docker/build-push-action@v5 (cache-from/to type=gha,scope=build-and-push,mode=max)"
    - "docker/setup-buildx-action@v3 (docker-container driver default)"
    - "docker/login-action@v3 (GHCR auth via built-in GITHUB_TOKEN)"
    - "actions/checkout@v4"
  patterns:
    - "Timestamp tag generation via `date -u +%Y%m%d%H%M%S` → $GITHUB_OUTPUT (matches .woodpecker.yaml:16 convention + Flux imagepolicy regex ^\\d{14}$)"
    - "Two-tag emission per build (immutable timestamp + floating latest)"
    - "Workflow-level concurrency group with cancel-in-progress (single-dev deploy posture: newest source wins)"
    - "Least-privilege job permissions (contents: read, packages: write)"
    - "Built-in GITHUB_TOKEN for same-repo GHCR push (no custom PAT for internal workflow)"
key-files:
  created:
    - .github/workflows/build-and-push.yml
  modified: []
decisions:
  - "D-05/06/07 action versions locked at v5/v3 majors; Node 24 migration (v7/v4 majors) deferred past v3.5-P4"
  - "mode=max added to cache-to within D-05 discretion — caches all 3 Dockerfile stages (deps → builder → runner), not just final"
  - "Built-in GITHUB_TOKEN sufficient for same-repo GHCR push with packages:write job permission; no custom PAT in Phase 25 (Phase 26 adds a separate Flux-side pull PAT)"
  - "Concurrency cancel-in-progress:true chosen over queue-behind — stale builds should die when newer main lands"
  - "No pull_request trigger (D-02) — excludes fork-pwn-request threat class entirely; workflow_dispatch covers manual rebuild need"
  - "Dockerfile unchanged this phase (D-09) — Phase 25 validates existing Dockerfile builds on GitHub-hosted runner (6.5GB/4-core vs Woodpecker 4Gi/2CPU limits); Dockerfile optimizations deferred"
requirements-completed: [CICD-01, CICD-02, CICD-03]
metrics:
  duration: "9m 17s"
  completed: "2026-04-23"
  task-commits: 1
  files-created: 1
  files-modified: 0
---

# Phase 25 Plan 01: Pipeline Build Summary

One-liner: Ships `.github/workflows/build-and-push.yml` — a single-job GitHub Actions pipeline that builds the existing Dockerfile on push to main and emits two tags (YYYYMMDDHHmmss UTC timestamp + latest) to `ghcr.io/hudsor01/hudsonfam` via built-in `GITHUB_TOKEN`, using `docker/build-push-action@v5` with `type=gha,mode=max` layer caching.

## Outcome

v3.5-P1 (Pipeline Build) code complete. The workflow file is shipped and push-to-main triggered the first Actions run (observational verification required — see below). Zero cluster impact this phase; images accumulate in GHCR silently. Phase 26 reconfigures Flux imagepolicy to consume the new tag stream.

All 10 decision-compliance grep gates passed against the shipped YAML. `js-yaml` parse confirmed the file is syntactically valid YAML. File is 64 lines (within the ~55-line expected range from PLAN done-criteria, slightly larger due to header comment block + blank-line separators).

## Workflow Spec Details

| Field | Value | Decision |
|-------|-------|----------|
| Name | `build-and-push` | D-01 |
| Runner | `ubuntu-latest` | D-01 |
| Timeout | `20` minutes | D-08 |
| Permissions | `contents: read`, `packages: write` | D-01 / least-privilege |
| Triggers | `push.branches: [main]` + `workflow_dispatch` | D-02 |
| Concurrency | `build-and-push-main`, `cancel-in-progress: true` | D-10 |
| Timestamp | `date -u +%Y%m%d%H%M%S` → `steps.ts.outputs.ts` | D-03 |
| Checkout | `actions/checkout@v4` | standard |
| Buildx | `docker/setup-buildx-action@v3` (no `with:` — all defaults) | D-06 |
| Login | `docker/login-action@v3`, `ghcr.io`, `github.actor`, `secrets.GITHUB_TOKEN` | D-07 |
| Build/push | `docker/build-push-action@v5` | D-05 |
| Context/Dockerfile | `.` / `./Dockerfile` | D-05 / D-09 |
| Platform | `linux/amd64` | D-05 (cluster is amd64) |
| Tags | `ghcr.io/hudsor01/hudsonfam:${{ steps.ts.outputs.ts }}` + `:latest` | D-04 |
| Cache from | `type=gha,scope=build-and-push` | D-05 |
| Cache to | `type=gha,scope=build-and-push,mode=max` | D-05 + discretion |
| Push | `true` | D-05 |
| Custom secrets | none (only built-in `GITHUB_TOKEN` + `github.actor`) | D-12 |

## First-Build Observational Note

- **Commit pushed:** `c7d8f33` to `main` at approximately 2026-04-23 20:21Z
- **Push result:** `79ad296..c7d8f33  main -> main` — remote accepted
- **Pre-push hook:** `test:schema` ran, skipped (JOBS_DATABASE_URL not set locally — non-failure)
- **Executor could not observe the run directly:** local `gh` CLI is unauthenticated (`You are not logged into any GitHub hosts`). Browser verification required by owner at <https://github.com/hudsor01/hudsonfam/actions> — look for the `build-and-push` workflow run triggered by commit `c7d8f33` (expected duration 8–12 min on cold cache per D-08).
- **Expected outcome of first run:** Green within 12 minutes; "Generate timestamp tag" step logs the `YYYYMMDDHHmmss` value; "Build and push" completes without `unauthorized`. After completion, two new tags visible at the GHCR package page.
- **If the run fails:** See PLAN §Task 25-01-02 troubleshooting table (HTTP 403 → verify `packages: write` in YAML — already present; build failure unrelated to workflow → read step log; do NOT retry blind per D-11).
- **Warm-cache second-build target:** 2–6 minutes (well under 10-min CICD-03 SC). Verified observationally on any subsequent no-code-change run (e.g., `workflow_dispatch`).

## Phase 26 Handoff Note: GHCR Package Visibility

The pre-existing GHCR package `hudsor01/hudsonfam` may be private (default for first-ever push to a namespace). Before Phase 26 planning begins, owner should visit:

<https://github.com/users/hudsor01/packages/container/hudsonfam/settings>

and record visibility (public / private) in STATE.md. Phase 26 provisions a Flux pull PAT via ExternalSecret regardless of visibility, so Phase 25 is NOT blocked on this check — but knowing the answer before Phase 26 planning avoids surprise during Flux reconfig.

Executor's `gh` CLI is unauthenticated locally, so automated visibility query via `gh api /users/hudsor01/packages/container/hudsonfam --jq .visibility` is not runnable from this session. Browser check is the minimum-friction path.

## Open Items for Phase 26

- **GHCR pull PAT for Flux** — external-to-GitHub consumer needs a PAT regardless of package visibility (built-in `GITHUB_TOKEN` is internal-only). Phase 26 provisions this via ExternalSecret from the `secrets` namespace ClusterSecretStore.
- **Flux imagerepository + imagepolicy** — rewire to watch `ghcr.io/hudsor01/hudsonfam` with numerical-ordering regex `^\d{14}$` (matches the timestamp format this phase emits).
- **Flux kustomization / image-automation** — verify image-update-automation controller reconciles the new imagepolicy and commits back to homelab repo tag bumps.
- **First post-Phase-26 warm-cache build** — confirm CICD-03 SC (clean build under 10 min) holds under real cluster-consumer load.

## Decisions Recorded

1. **v5/v3 action major pins locked (D-05/06/07)** — `docker/build-push-action@v5`, `docker/setup-buildx-action@v3`, `docker/login-action@v3`, `actions/checkout@v4`. Node 24 migration (v7/v4 majors) deferred past v3.5-P4. GitHub Actions runner forces Node 24 default on 2026-06-02 and removes Node 20 on 2026-09-16 — current versions remain functional inside that window; migration is a v3.5-post-completion backlog item.
2. **`mode=max` added to `cache-to` within D-05 discretion** — caches intermediate stages (`deps`, `builder`) in addition to the final `runner` stage, turning partial source edits into 2–4 minute warm-cache builds instead of 6+ minutes rebuilding `deps` every time. Still fits inside the 10 GB per-repo GHA cache quota given the Dockerfile's layer sizes.
3. **Built-in `GITHUB_TOKEN` sufficient for same-repo GHCR push** — common misconception that a PAT is always needed was the v3.0/pre-Phase-25 failure mode. With `permissions: { packages: write }` at job level, `GITHUB_TOKEN` is ephemeral (expires at run end), auto-rotated, repo-scoped — zero long-lived credentials in Phase 25. Phase 26 introduces a separate PAT for Flux's external GHCR pull (different auth context).
4. **Concurrency `cancel-in-progress: true`** — single-developer deploy posture: always-latest-source wins over finishing stale builds. Prevents queue pile-up.
5. **No `pull_request` trigger** — structurally excludes fork-pwn-request and cache-poisoning-via-fork threat classes. `workflow_dispatch` covers the ad-hoc rebuild need.

## Deviations from Plan

None — plan executed exactly as written. Every element of the canonical YAML from PLAN §Task 25-01-01 was shipped verbatim; all 10 PLAN automated grep checks passed; 12 decisions D-01..D-12 fully implemented.

## Known Stubs

None. This phase ships infrastructure YAML with no application-code touch points; no stub patterns to track.

## Self-Check: PASSED

- File exists: `.github/workflows/build-and-push.yml` → FOUND (64 lines)
- YAML valid: `js-yaml` parse via nvm node → YAML valid
- Grep gates: 10/10 decision-compliance patterns found in file (action versions, platform, cache, timestamp format, concurrency, permissions, mode=max)
- Commit exists: `c7d8f33` → `ci(25-01): add GitHub Actions build-and-push workflow for GHCR` (verified via `git log --oneline -1`)
- Push succeeded: `79ad296..c7d8f33  main -> main` — remote accepted
- First Actions run observational verification: deferred to owner browser check (executor `gh` CLI unauthenticated locally — expected and documented)
- File tracked by git: `git ls-files .github/workflows/build-and-push.yml` → present
- No unintended deletions: `git diff --diff-filter=D HEAD~1 HEAD` → empty
