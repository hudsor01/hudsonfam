---
title: CI/CD fragility analysis — hudsonfam deploy pipeline
date: 2026-04-22
trigger: Phase 21 production UAT blocked by broken CI pipeline; owner asked for permanent fix or proper deferral
author: claude+owner collaboration
related:
  - .planning/phases/21-polish-copy-pdf-empty-states-link-out/21-08-SUMMARY.md
  - .planning/seeds/SEED-005-cicd-hardening-migration.md
  - CLAUDE.md §Deployment
---

# CI/CD fragility analysis — hudsonfam

## Purpose

This document captures the investigation done on 2026-04-22 when Phase 21 production UAT was blocked by a broken deploy pipeline. Owner's observation: "every time I use it I have to fix it" — a DX pattern that needed a root-cause answer, not another band-aid.

The investigation produced:
1. A factual inventory of what's broken today (this doc)
2. A proposal for the permanent fix (see §"Proposed v3.5 milestone" below + `SEED-005-cicd-hardening-migration.md`)
3. A decision to defer production deployment of Phase 21 until v3.5 ships (see `21-08-SUMMARY.md`)

## What the pipeline was intended to be

From `CLAUDE.md` §Deployment:

```
Push to main → GitHub Actions builds Docker image → GHCR
  → Flux image automation (timestamp tags: YYYYMMDDHHmmss)
  → Flux kustomization updates K3s deployment
```

- Source: GitHub (`git@github.com:hudsor01/hudsonfam.git`)
- Build: GitHub Actions
- Registry: GHCR (ghcr.io/hudsor01/hudsonfam)
- Deploy: Flux → K3s

This is a well-trodden, vendor-managed path. Only ~2 local moving parts: Flux (local) and the K3s cluster itself.

## What the pipeline actually became

Investigated 2026-04-22 via `kubectl get gitrepository,imagerepository,imagepolicy,imageupdateautomation,kustomization -A` + Forgejo API + Woodpecker MCP:

```
Push to forgejo remote → Woodpecker CI webhook fires
  → .woodpecker.yaml builds Docker image with timestamp tag
  → Pushes to git.homelab/forgejo-admin/hudsonfam (Forgejo container registry)
  → Flux imagepolicy picks up new tag
  → Flux imageupdateautomation updates Deployment manifest in dev-projects/homelab
  → Flux kustomization reconciles → K3s rollout
```

- Source: Self-hosted Forgejo (`forge` namespace, pod `forgejo-6bd67bfd68-xj9r7`)
- Build: Self-hosted Woodpecker (`forge` namespace, server + 2 agents + separate runner pod)
- Registry: Self-hosted Forgejo container registry (`git.homelab`)
- Deploy: Flux → K3s (same as intended)

**Six moving parts in the critical path** for a single-person hudsonfam deploy, five of which are local/self-hosted infrastructure. Three are explicitly broken today.

`.github/workflows/` directory does not exist in the hudsonfam repo — the CLAUDE.md pipeline was never implemented. At some point, someone (likely past-me during a homelab experiment session) pivoted to the Woodpecker path without updating CLAUDE.md, and the documented-intent and actual-state have drifted.

## What's broken right now (concrete)

### Finding 1 — `forgejo-admin/hudsonfam` repo does not exist on Forgejo

- `git ls-remote ssh://git@192.168.4.236:30022/forgejo-admin/hudsonfam.git` → `Forgejo: Cannot find repository: forgejo-admin/hudsonfam`
- `curl -sk https://git.homelab/api/v1/repos/forgejo-admin/hudsonfam` → 404
- `curl -sk "https://git.homelab/api/v1/repos/search?q=hudsonfam"` → `{"ok":true,"data":[]}` (zero matches)

**But:**
- Woodpecker MCP reports `repoId:2, name:forgejo-admin/hudsonfam, active:true` — Woodpecker thinks the repo is wired up
- Flux `imagepolicy/hudsonfam` resolves `git.homelab/forgejo-admin/hudsonfam:20260417202843` — the last image built (5 days ago) still exists in the container registry
- Production Deployment still runs that 5-day-old image

**Inference:** The Forgejo repo was deleted or renamed at some point between 2026-04-17 (last successful build) and 2026-04-22 (today). Nothing cleaned up Woodpecker's registration or the Flux image automation references. User could not recall having intentionally deleted the repo.

### Finding 2 — `default/imagerepository/hudsonfam` Flux resource is broken

```
imagerepository.image.toolkit.fluxcd.io/hudsonfam
  IMAGE: git.homelab/forgejo-admin/hudsonfam
  READY: False
  STATUS: failed to configure authentication options: secrets "forgejo-registry-creds" not found
  AGE: 3d20h
```

There are **two** `imagerepository/hudsonfam` resources — one in `default` namespace (broken since 3d20h) and one in `flux-system` namespace (working; that's the one actually driving deploys). The broken duplicate is orphaned from some past configuration attempt. It does not block deploys but it does generate a persistent error condition in cluster events.

### Finding 3 — `dev-projects/homelab` Flux source stale for 8+ days

```
gitrepository.source.toolkit.fluxcd.io/flux-system
  URL: ssh://git@forgejo-ssh.forge/dev-projects/homelab
  REVISION: main@sha1:dcd17ca8
  LAST-FETCHED: still dcd17ca8
```

All three hudsonfam-related `kustomization` resources (`home-assistant`, `home-services`, `hudsonfam`) last applied revision `dcd17ca8`. The homelab manifests repo has received no commits since at least 2026-04-14.

This means even if a new image gets built, Flux's imageupdateautomation writes the new tag reference INTO the homelab repo — but nothing is pushing that write out to observable state right now because the whole source chain is dormant.

### Finding 4 — Woodpecker server instability

```
forge  woodpecker-server-0  1/1  Running  5 restarts (2d9h ago)  3d
```

5 restarts in 3 days of uptime. Not catastrophic, but a signal that the server pod has been unhealthy. Cause not investigated (would require digging into pod logs + events); signals for the hardening milestone to look at.

### Finding 5 — Two unrelated image automation failures exist in the same cluster

```
imagerepository.image.toolkit.fluxcd.io/recyclarr
  STATUS: scan failed: Get "https://cache.homelab/v2/": tls: failed to verify certificate:
          x509: certificate is valid for <wildcard>, not cache.homelab
  AGE: 3d20h

imagerepository.image.toolkit.fluxcd.io/seerr
  STATUS: (same TLS error)
  AGE: 3d20h
```

Two other apps have broken image automation due to a Traefik default-cert issue on `cache.homelab`. Per memory (`reference_zot_cache_homelab.md`), this is a known homelab pattern where Traefik serves its default cert for HTTPS-only SNI. These aren't hudsonfam problems, but they surface the same root cause: **image automation config is sensitive to TLS/auth/cert state that changes independently of application code.** A migration to GHCR sidesteps this class of bug for hudsonfam (GHCR has vendor-managed TLS).

### Finding 6 — Backup posture of Forgejo data is single-volume

- Forgejo data lives on PVC `gitea-shared-storage` (20Gi Longhorn, bound 12d ago)
- No evidence of a separate backup pipeline for Forgejo repos in the cluster (investigation was surface-level — there may be a CNPG-barman-style backup I didn't find, but no matching CronJob/backup-agent was immediately visible)

If this PVC is lost or corrupted, all Forgejo repos (including whatever `forgejo-admin/hudsonfam` was pointing at) are gone. Image registry storage might be on a separate volume (not verified). **Blast radius for a single Longhorn volume failure is wider than it should be for this tier of workload.**

## Pattern analysis: why does this keep breaking?

Six moving parts × partial knowledge of each × independent failure modes × no automated health alerting for the composition = "every time I use it I have to fix it."

Concretely:
- Self-hosted Forgejo can restart / lose data / change URL / change auth config / rename repos
- Self-hosted Woodpecker can crash (5 restarts in 3 days of observation), lose webhook state, fall behind on forge version
- Self-hosted container registry can rotate certs, run out of disk, drop credentials
- Flux image automation config has 6+ resources that must agree on image names, tags, credentials, and manifest paths
- Homelab manifests repo can fall out of sync with application code commits if nobody's pushing
- K3s cluster state (secrets, PVCs, network) can drift independently of everything above

Compare with the CLAUDE.md-intended GitHub Actions + GHCR pattern:
- GitHub Actions is vendor-managed (free tier; Anthropic-compatible; well-documented)
- GHCR is vendor-managed (free for public + reasonable rate on private)
- Only ONE local moving part: Flux watching GHCR
- Failures are typically one of: GHCR rate-limit (documented), auth token expired (single-point fix), Flux controller restart (rare, heals itself)

The vendor-managed pattern **trades one set of problems (local infrastructure complexity) for a much smaller set of problems (vendor dependency + token management).** For a single-person homelab project whose primary concern is shipping features reliably, the vendor-managed tradeoff is categorically correct.

## Proposed v3.5 milestone — CI/CD hardening

### Why a new milestone (not a phase)

v3.0 is scoped as "AI Integration" (Phases 20-24). Bolting a CI/CD rewrite onto v3.0 would:
- Break the milestone boundary (CI/CD is not AI integration)
- Delay Phase 22 (Salary Intelligence) and Phase 23/24 (owner-triggered workflows + regenerate expansion) which are actually on the AI roadmap
- Hide the CI/CD work inside an already-busy milestone

v3.5 is sized for a focused 1-day infra sprint. Numbering it `.5` signals "half-milestone / cross-cutting infra" without inflating the v4 major version.

### Goal

Eliminate the "CI breaks every time I use it" pattern by migrating hudsonfam deploy from self-hosted Forgejo + Woodpecker + git.homelab registry to the CLAUDE.md-intended GitHub Actions + GHCR pattern. Preserve Flux-driven K3s rollout (it's the one piece that works reliably). Keep Forgejo running for OTHER workloads (homelab manifests repo) where it genuinely earns its keep — just get it out of hudsonfam's critical path.

### Success criteria (what must be TRUE at v3.5 completion)

1. A single push to `origin/main` (GitHub) triggers a GitHub Actions workflow that builds the Dockerfile, tags it `YYYYMMDDHHmmss`, and pushes to `ghcr.io/hudsor01/hudsonfam`
2. Flux's `imagerepository/hudsonfam` is updated to watch `ghcr.io/hudsor01/hudsonfam` with a valid pull secret (from ExternalSecret)
3. Flux's `imagepolicy/hudsonfam` promotes the new tag within 5 minutes of the GitHub Actions push completing
4. Flux's `imageupdateautomation` writes the new tag into the homelab manifests repo; `kustomization/hudsonfam` reconciles; K3s rollout happens
5. A dry-run test: make a whitespace-only commit on a test branch, merge to main, verify the entire pipeline fires end-to-end unattended in under 10 minutes
6. CLAUDE.md §Deployment is updated if any factual detail differs from the v3.5 implementation (likely: no changes needed, since this matches the original intent)
7. Woodpecker's hudsonfam repo registration is removed OR explicitly documented as "legacy / superseded by GitHub Actions"
8. The broken `default/imagerepository/hudsonfam` duplicate is deleted
9. The orphaned `git.homelab/forgejo-admin/hudsonfam` registry entries are either deleted or preserved as a historical artifact with a dated README

### Proposed phases (4-phase breakdown, ~4 hours total)

**Phase v3.5-P1 — GitHub Actions workflow creation** (~1 hour)
- Write `.github/workflows/build-and-push.yml`:
  - Trigger: `push` to `main`, plus `workflow_dispatch` for manual reruns
  - Builds Dockerfile (already exists at repo root)
  - Tags: `YYYYMMDDHHmmss` format (match existing Flux numerical policy) + a `latest` tag
  - Pushes to `ghcr.io/hudsor01/hudsonfam`
  - Uses `GITHUB_TOKEN` for GHCR auth (no separate PAT needed for same-org pushes)
- Initial test: push a no-op commit, verify the workflow runs green and produces a tag in GHCR

**Phase v3.5-P2 — Flux reconfiguration** (~1.5 hours)
- Update `imagerepository/hudsonfam` (in `flux-system` namespace) to watch `ghcr.io/hudsor01/hudsonfam`
- Wire a GHCR pull secret:
  - Create a GitHub fine-grained PAT with `read:packages` scope
  - Store in 1Password / Bitwarden / whatever the homelab ExternalSecrets pipeline currently uses
  - Create an ExternalSecret in `flux-system` ns that syncs to a `ghcr-pull-credentials` k8s secret
  - Reference that secret in the imagerepository spec's `secretRef`
- Update `imagepolicy/hudsonfam` to point at the new imagerepository (path name stays the same; only the underlying image URL changes)
- Verify: `flux get images repository hudsonfam -n flux-system` shows successful scans against the GHCR-hosted tags
- Verify: the NEXT new tag (after v3.5-P1's smoke test) gets picked up by imagepolicy

**Phase v3.5-P3 — Decommission old pipeline** (~30 min)
- Delete the broken `default/imagerepository/hudsonfam` (no-op unless something depends on its mere existence)
- In Woodpecker UI, disable or delete the `forgejo-admin/hudsonfam` repo registration
- Decide fate of `git.homelab/forgejo-admin/hudsonfam` registry entries:
  - Option A: delete (cleanest; losses nothing since code lives in git)
  - Option B: preserve with a dated README file explaining "superseded by GHCR on 2026-MM-DD" (best for historical context)
- Remove `.woodpecker.yaml` from the hudsonfam repo (or add a comment marking it deprecated)

**Phase v3.5-P4 — End-to-end smoke test + documentation** (~1 hour)
- Create a test branch, make one meaningful change (e.g., a new comment in a README), merge to main
- Observe the full pipeline fire under 10 minutes:
  1. GitHub Actions build + push: ~3 min
  2. Flux imagepolicy scan + promote: up to 5 min (scan interval)
  3. Flux imageupdateautomation writes to homelab repo: near-instant
  4. Flux kustomization reconciles: near-instant
  5. K3s pulls image and rolls out: ~1 min
- Update CLAUDE.md §Deployment if any details differ from the proposed pattern
- Retroactively execute Plan 21-08 UAT checkpoint against the now-live Phase 21 code (see `21-08-SUMMARY.md` for the UAT criteria)

### Out of scope for v3.5 (deliberate deferrals)

- Migrating OTHER hudsonfam-adjacent workloads to GitHub Actions (e.g., if the homelab repo itself ever goes through a similar pivot) — not this milestone's concern
- Fixing the `recyclarr` / `seerr` TLS issues on `cache.homelab` — those are separate apps, same root cause, but belong in a homelab-infra pass, not a hudsonfam pass
- Investigating Woodpecker server instability (5 restarts in 3 days) — Woodpecker is being removed from hudsonfam's critical path; debugging its stability for non-hudsonfam repos is a separate concern
- Replacing Longhorn with something more redundant — orthogonal concern, same cost/benefit analysis applies elsewhere
- Setting up staging environment — single-user project; local `npm run build && npm start` is sufficient as the pre-prod check

### Risks + mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| GHCR rate-limit on image pulls | K3s can't pull new images in a rollout | GHCR allows authenticated pulls without rate-limit at small-project scale; pull secret in v3.5-P2 mitigates |
| GitHub Actions billing / free-tier limits | Builds queue or get rejected | hudsonfam is a private repo on the free tier: 2000 Actions minutes/month. Each build is ~3 min; budget allows ~660 builds/month. Not a realistic concern. |
| GitHub PAT expiration | Flux can't pull from GHCR after PAT expires | Use a fine-grained PAT with 1-year expiry; calendar reminder 2 weeks before expiry; alternatively use GitHub Apps auth for permanent no-rotation |
| Breaking change during migration — hudsonfam goes down mid-rewire | Prod is on an old image but not accessible | Sequence: v3.5-P1 + v3.5-P2 + v3.5-P4 smoke test FIRST; only then execute v3.5-P3 decommission. Old pipeline keeps working as fallback until smoke test green. |
| GitHub repo name drift vs Flux config | Image scans fail silently | v3.5-P4 smoke test is the regression guard; add a follow-up one-liner in STATE.md `## Key Decisions` noting "GHCR image path is `ghcr.io/hudsor01/hudsonfam` — must match Flux `imagerepository.spec.image`" |

### Estimated timing

| Day | Activity |
|---|---|
| 0 | Start v3.5-P1 (workflow creation + initial test) |
| 0 | v3.5-P2 (Flux reconfiguration + pull secret) |
| 0 | v3.5-P4 smoke test |
| 0 | v3.5-P3 decommission (only after smoke test green) |
| +1 day | Retroactive Plan 21-08 UAT against deployed code |

All in one day for a focused session. Owner could plausibly finish in ~4-6 hours of focused work.

## Appendix: Commands used during investigation (for future-me / future-claude)

```bash
# Verify Forgejo repo existence
git ls-remote ssh://git@192.168.4.236:30022/forgejo-admin/hudsonfam.git
curl -sk https://git.homelab/api/v1/repos/forgejo-admin/hudsonfam
curl -sk "https://git.homelab/api/v1/repos/search?q=hudsonfam"

# Survey Flux state
kubectl get gitrepository,imagerepository,imagepolicy,imageupdateautomation,kustomization -A
flux get source git -A
flux get images repository hudsonfam -n flux-system
flux get images policy hudsonfam -n flux-system

# Check deployed image
kubectl get deployment hudsonfam -n homepage -o jsonpath='{.spec.template.spec.containers[0].image}'

# Check CI state
kubectl get pods -n forge
kubectl logs -n forge woodpecker-server-0 --tail=200
# (Woodpecker MCP): mcp__woodpecker__search_repository + list_pipelines

# Check cluster image registry cache health
kubectl get imagerepository -A
```

## Cross-references

- `.planning/phases/21-polish-copy-pdf-empty-states-link-out/21-08-SUMMARY.md` — Phase 21's production UAT deferral + retroactive execution path
- `.planning/seeds/SEED-005-cicd-hardening-migration.md` — forward-looking seed for v3.5 with trigger conditions
- `CLAUDE.md` §Deployment — documented intent (now re-aligned with plan)
- Memory: `reference_zot_cache_homelab.md` — same TLS issue pattern affects `cache.homelab`

---

*Prepared 2026-04-22 during Phase 21 production UAT. Owner approved v3.5 deferral over a same-session band-aid.*
