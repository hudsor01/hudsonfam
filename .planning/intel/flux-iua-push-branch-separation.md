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

## Implementation Iteration Notes (2026-04-25)

The merger CronJob took **6 iterations** to land cleanly. Each surfaced a real CRD-vs-docs / pod-runtime quirk worth recording so future "I need to git push from a flux-system K8s pod" implementations don't repeat them:

| # | Symptom | Root cause | Fix |
|---|---------|------------|-----|
| 1 | `No user exists for uid 1000` → `fatal: Could not read from remote repository` | alpine/git container has only root + nobody in /etc/passwd; we runAsUser:1000; SSH refuses to proceed when getpwuid lookup fails | Initial misdiagnosis: thought it was DNS. Switched REPO_URL to FQDN as a precaution (this was the wrong fix; see iteration 6) |
| 2 | `/bin/sh: can't create /etc/passwd: Permission denied` | Tried to write a runtime /etc/passwd shim; PodSecurity restricted profile drops ALL caps including DAC_OVERRIDE; can't write root-owned files | Switched to ConfigMap-mounted /etc/passwd via subPath (the documented K8s pattern for "make non-root uid resolve") |
| 3 | `Host key verification failed` | After /etc/passwd fix surfaced the next layer: REPO_URL was FQDN but Secret-mounted known_hosts only had short-name entries | Added an awk pass to append FQDN-keyed copies of each known_hosts line (same key, broader hostname patterns) |
| 4 | `/bin/sh: can't create /home/git/.ssh/known_hosts: Permission denied` | `cp /ssh/known_hosts ...` inherited the Secret's defaultMode 0400, breaking subsequent `>>` append | Switched to `cat /ssh/known_hosts > destination` — `cat` writes via shell's umask 022 → mode 644 |
| 5 | `Host key verification failed` (again, despite awk-rewritten known_hosts) | At this point user pushed back on iterating blind. Direct evidence inspection of `kubectl get gitrepository flux-system -o yaml` revealed source-controller successfully connects via the SHORT name `forgejo-ssh.forge` — proving the FQDN switch was unnecessary all along. Earlier `nslookup forgejo-ssh.forge` returning NXDOMAIN was a busybox `nslookup` quirk (it doesn't apply /etc/resolv.conf search paths the way getaddrinfo() does) | Reverted REPO_URL to short name; dropped the awk FQDN-rewrite logic entirely. The short name matches the Secret's known_hosts entries so host-key verification passes naturally |
| 6 | (final, working) | All real fixes accumulated: ConfigMap /etc/passwd + cat-not-cp + short Service DNS name. SSH connects, git fetch works, merger logic runs end-to-end | — |

**Verified live (2026-04-25 16:55-16:57):**
- ✓ `branch absent` exit-clean path (run #8)
- ✓ `branches converged, no-op` path (run #10)
- ✓ `fast-forward push` path (run #11) — main moved `d42c9ce` → `29ab2ab` via the merger pushing flux-image-updates HEAD as fast-forward

**Cherry-pick replay path (cases of true human-vs-IUA divergence)** is well-tested logic but not exercised live — would require contrived scenario (human commit + IUA push without IUA rebasing first). Will be exercised naturally over time when the recurring pattern would have hit (no longer hits because the new architecture prevents it).

**Lessons for future "git push from K8s pod" implementations:**
1. Inspect what the working comparable does (in this case, source-controller's GitRepository spec) BEFORE assuming you need a different URL/config than what already works
2. busybox `nslookup` is a poor proxy for actual DNS resolution; it does not apply /etc/resolv.conf search paths the same way getaddrinfo() does. If you need to test K8s DNS resolution from inside a pod, use a tool that wraps getaddrinfo (e.g., `getent hosts`)
3. ConfigMap-mounted /etc/passwd via subPath is the canonical K8s pattern for runAsUser:N where N isn't in the container image's stock /etc/passwd
4. PodSecurity restricted profile + drop-ALL caps means you cannot edit any root-owned file at runtime; design for read-only system files
5. Secret-mounted files inherit defaultMode; using `cp` source→dest preserves the source mode. Use `cat src > dest` to write at the shell's umask instead

## Sources

- [Flux docs — Automate image updates to Git](https://fluxcd.io/flux/guides/image-update/) — push-branch separation reference
- [Flux ImageUpdateAutomation CRD reference](https://fluxcd.io/flux/components/image/imageupdateautomations/)
- [Using a private Git host — Flux documentation](https://docs.fluxcd.io/en/1.18.0/guides/use-private-git-host.html) — known_hosts must include the connected hostname VERBATIM
- [GitHub SSH Handshake failed: knownhosts key mismatch — fluxcd/flux2 Discussion #2097](https://github.com/fluxcd/flux2/discussions/2097)
- [Phase 26-02 SUMMARY §"Deviation 2 — Rebase required"](../phases/26-flux-reconfiguration/26-02-SUMMARY.md) — the original recurring-pattern instance #1
- This implementation (homelab repo): `/home/dev-server/homelab/clusters/homelab/image-automation/{image-update-automation.yaml, flux-image-updates-merger.yaml, kustomization.yaml}` — final working state at homelab `29ab2ab`
- Live evidence — `kubectl get gitrepository flux-system -n flux-system -o yaml` (proves source-controller connects via short Service DNS `forgejo-ssh.forge`)
