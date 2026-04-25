# Flux IUA Push-Branch Separation Pattern

**Captured:** 2026-04-25 (post-v3.5 milestone audit)
**Sibling intel:** `crd-vs-docs-mismatch-pattern.md` (v3.5-era)
**Implemented in:** homelab repo, commit `<flux-iua-push-branch-migration>` (see commit log)

## The Pattern (anti-pattern observed)

When `ImageUpdateAutomation.spec.git.push.branch` is set to the same branch humans commit to (in our case `main`), the IUA controller and humans race for write access to that branch.

Symptom: `git push` from a human local clone is rejected with:

```
! [rejected]        main -> main (fetch first)
hint: Updates were rejected because the remote contains work that you do not
hint: have locally.
```

The "remote work" is one or more `chore(images): update ghcr.io/...` commits that Flux IUA pushed during the human's local-edit window.

## Observed instances (history)

| Instance | Phase | Date | Symptom | Resolution at time |
|---|---|---|---|---|
| 1 | Phase 26 Plan 26-02 | 2026-04-24 | IUA promoted Forgejo tag mid-window between Plan 26-01 close and Plan 26-02 push (~6h gap); rebase forced 3-way conflict on 2 files | `git pull --rebase forgejo main` + manually take "ours" on conflicts |
| 2 | SEED-007 push | 2026-04-25 | 9 IUA commits accumulated between local commit and push attempt (rapid post-Phase-28 build cadence + dep-upgrade build) | Same — rebase clean (disjoint file sets, zero conflict) |
| 3 (would-be) | Future homelab edit | TBD | Same | This intel exists to prevent a 3rd hand-resolution |

The pattern was diagnosed as recurring after instance 2. Captured here before instance 3.

## The Canonical Flux Solution: Push-Branch Separation

Per [Flux docs §"Push updates to a different branch"](https://fluxcd.io/flux/guides/image-update/) — the documented mitigation is to configure IUA to push to a branch other than the human-edited branch:

```yaml
spec:
  git:
    checkout:
      ref:
        branch: main           # IUA reads from main
    push:
      branch: flux-image-updates  # IUA writes to a SEPARATE branch
```

With this:
- IUA never pushes to `main` — humans always push to `main` cleanly with no contention
- IUA's setter changes accumulate on `flux-image-updates`
- A separate process (CronJob, Forgejo Actions, manual PR) brings `flux-image-updates` back into `main`

This is the official Flux GitOps separation-of-concerns pattern (analogous to how teams using IUA at scale gate IUA pushes through a PR review).

## Implementation in this Homelab

**Files (in `homelab` repo):**

1. **`clusters/homelab/image-automation/image-update-automation.yaml`** — flipped `push.branch: main` → `push.branch: flux-image-updates`. Comment block in the manifest cross-references this intel doc.

2. **`clusters/homelab/image-automation/flux-image-updates-merger.yaml`** — new K8s CronJob in `flux-system` namespace that runs every 2 minutes and merges `flux-image-updates` → `main`:
   - **Fast-forward case** (common): `git push origin <flux-image-updates SHA>:refs/heads/main`. Server-side rejects if non-fast-forward (concurrent human commit) — exits clean for next-cycle retry.
   - **Diverged case** (rare; happens when human pushed AND IUA hasn't yet rebased): cherry-pick IUA's commits onto current `main` with `--strategy-option=theirs` (mechanical setter bumps always win), force-reset `flux-image-updates` to merged head, push both.
   - **Self-healing**: idempotent, crash-safe, bounded deploy lag (~4 min worst case after a human commit).
   - Mounts the existing `flux-system` SSH Secret (the same deploy key Flux source-controller uses to pull from this repo — the key has push permission per Phase 43 Flux bootstrap).

3. **`clusters/homelab/image-automation/kustomization.yaml`** — added `flux-image-updates-merger.yaml` to the resources list.

## Why a CronJob (not Forgejo Actions or refspec push-to-both)?

| Alternative | Why rejected |
|---|---|
| **Forgejo Actions on push to flux-image-updates** | Adds Forgejo Actions runner dependency we don't yet manage. CronJob is K8s-native and uses the K8s tooling already in operation. |
| **IUA `push.refspec: refs/heads/auto:refs/heads/main`** (Gerrit pattern) | Pushes atomically to BOTH branches — but this STILL puts IUA in contention with humans on `main`. Only fixes IUA-side retry; human-side rejection still happens. The point is human-side decoupling. |
| **Pre-push git hook on local homelab clone** | Auto-rebase on rejection works for the agent's clone but doesn't solve for other clones. CronJob solves it server-side, once. |
| **Manual PR review** (open PR from flux-image-updates → main, review, merge) | Adds review overhead per IUA push (~30/day cadence). For solo-owner use case, no review value to extract; pure friction. |

The CronJob has zero new infra dependencies (uses existing alpine/git image, existing Flux SSH Secret, existing K8s CronJob controller) and provides the Flux-canonical push-branch-separation property.

## Trade-offs

**Improved:**
- Human-side: `git push` to `main` from any clone is never rejected by IUA contention. Period.
- IUA-side: still atomic via `--force-with-lease` semantics; no lost work.
- Consistency: `flux-image-updates` is always either equal to `main` or one IUA-cycle ahead.

**Costs:**
- One additional K8s CronJob (~25m CPU / 32Mi mem requested, ~200m / 128Mi limit; runs ~5s every 2 min).
- New deploy lag for image bumps: max ~4 min (was ~immediate).
  - 2 min for the merger to run after IUA's push to flux-image-updates
  - +1-2 min for IUA to react to source-controller's notification of flux-image-updates push
  - Acceptable for non-critical homelab use case
- Additional surface area in flux-system namespace (one CronJob + its Job pods).
- `flux-image-updates` branch is now visible in the Forgejo UI repo branches list (cosmetic; no semantic concern).

**Edge cases handled:**
- IUA hasn't run yet after migration → `flux-image-updates` doesn't exist → merger logs and exits clean.
- IUA's push branch has no commits ahead of main → merger logs and exits clean (waiting for IUA rebase).
- Cherry-pick conflict on diverged-state replay → merger aborts cleanly, lets IUA's natural rebase resolve on its next reconcile.
- Concurrent human push during merger's fetch-then-push window → merger's push is server-side rejected, exits clean for next cycle.
- Pod crash mid-merge → no partial state pushed (push is the atomic barrier; everything before is local tmpfs).

## Verification

After the homelab commit lands and Flux reconciles (1-10 min):

```bash
# CronJob exists and is healthy
kubectl get cronjob flux-image-updates-merger -n flux-system

# First Job ran and exited 0
kubectl logs -n flux-system -l app.kubernetes.io/name=flux-image-updates-merger --tail=50

# IUA now uses the new push branch
kubectl get imageupdateautomation homelab-images -n flux-system -o jsonpath='{.spec.git.push.branch}'
# → flux-image-updates

# After next IUA reconcile, the new branch exists in the repo
git -C /home/dev-server/homelab fetch origin flux-image-updates 2>&1
# → no error; branch is fetched

# Convergence check — these two SHAs should be equal (within one merger cycle)
git -C /home/dev-server/homelab rev-parse origin/main
git -C /home/dev-server/homelab rev-parse origin/flux-image-updates
```

## Closure

This intel doc captures the Flux-canonical permanent fix. Future homelab edits should NOT see the "fetch first" rejection from IUA contention. If a 4th instance of the rebase pattern appears, this implementation has a bug — investigate the merger logs and the IUA reconcile state before re-introducing manual-rebase workarounds.

Sibling pattern: see `crd-vs-docs-mismatch-pattern.md` for the related "live cluster CRD shape diverges from upstream docs" pattern that hit Plan 26-01 (ESO `spec.target.type`) and Plan 26-02 (`status.latestImage` → `latestRef`).

## Sources

- [Flux docs — Automate image updates to Git](https://fluxcd.io/flux/guides/image-update/)
- [Flux ImageUpdateAutomation CRD reference](https://fluxcd.io/flux/components/image/imageupdateautomations/)
- [Phase 26-02 SUMMARY §"Deviation 2 — Rebase required"](../phases/26-flux-reconfiguration/26-02-SUMMARY.md)
- This implementation: `/home/dev-server/homelab/clusters/homelab/image-automation/{image-update-automation.yaml, flux-image-updates-merger.yaml, kustomization.yaml}`
