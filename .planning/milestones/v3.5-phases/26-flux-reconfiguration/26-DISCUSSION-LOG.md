# Phase 26: Flux Reconfiguration - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-23
**Phase:** 26-flux-reconfiguration
**Mode:** `--auto` (Claude selected recommended option for every decision; no interactive AskUserQuestion calls)
**Areas discussed:** GHCR pull authentication, ExternalSecret shape, pull-secret namespace scope, ImageRepository disposition, kustomization + deployment image rewrite, migration sequencing + safety, verification

---

## GHCR pull authentication

| Option | Description | Selected |
|--------|-------------|----------|
| Fine-grained PAT, repo-scoped, `Packages: Read`, 1-year expiry | Least-privilege; works for both public and private packages; matches CICD-05 + SEED-005 §Risks | ✓ |
| Classic PAT with `read:packages` | Wider scope (all packages owner has); legacy auth surface | |
| GitHub App auth (no rotation) | Most robust long-term; significantly higher first-time setup cost | |
| Anonymous scan (no secret) | Only works if package is public; brittle to visibility flip | |

**Auto-selected:** Fine-grained PAT (D-01)
**Rationale:** Least-privilege + works for either visibility + matches the SEED-005 plan owner already approved. PAT rotation pain re-evaluated post-v3.5 if it becomes ops noise.

## ExternalSecret shape

| Option | Description | Selected |
|--------|-------------|----------|
| Sprig templating from username + pat fields | ExternalSecrets v1 `spec.target.template` reconstructs dockerconfigjson at sync time from two human-meaningful raw fields | ✓ |
| Pre-baked dockerconfigjson string in vault | Owner manually encodes dockerconfigjson and pastes the base64 blob into vault | |
| Stakater Reloader / Reflector pattern | Operator-managed mirror across namespaces | |

**Auto-selected:** Sprig template from username + pat (D-03)
**Rationale:** Vault stores rotatable human-meaningful fields; encoding is deterministic and happens at sync time; matches ExternalSecrets canonical example.

## Pull-secret namespace scope

| Option | Description | Selected |
|--------|-------------|----------|
| Two ExternalSecrets (homepage + flux-system, same vault key) | Each namespace materializes its own Secret from the shared vault key; no operator install | ✓ |
| Reflector / Replicator pattern | One Secret in a source namespace, mirrored across by an operator | |
| Single namespace (homepage only) | Doesn't work — Flux requires same-namespace secret for ImageRepository scan | |

**Auto-selected:** Two ExternalSecrets (D-04)
**Rationale:** Explicit dependency graph; no new operator install; rotation is one vault update propagating to both Secrets within `refreshInterval: 1h`.

## ImageRepository disposition

| Option | Description | Selected |
|--------|-------------|----------|
| Mutate in place (preserve `metadata.name: hudsonfam`) | Edit `spec.image`, drop `insecure: true`, swap `secretRef.name`; everything downstream Just Works | ✓ |
| Delete + recreate with new name | Forces synchronized edits across ImagePolicy + 2 setter comments + kustomization | |
| Add new ImageRepository, leave old in place during transition | Two ImageRepositories briefly active = ImagePolicy ambiguity risk | |

**Auto-selected:** Mutate in place (D-05)
**Rationale:** `metadata.name: hudsonfam` is referenced in 4 places; mutate-in-place eliminates cascading rename edits; lowest-edit path.

## ImagePolicy + ImageUpdateAutomation edits

| Option | Description | Selected |
|--------|-------------|----------|
| Zero edits to image-policies.yaml + image-update-automation.yaml | Existing regex `^\d{14}$` already matches Phase 25 timestamp format; existing `update.path: ./apps` already covers hudsonfam | ✓ |
| Tighten regex to `^\d{14}$` (already correct, defensive re-confirmation) | Redundant edit; no behavior change | |
| Switch ImagePolicy to semver | Doesn't match the YYYYMMDDHHmmss format; would break image selection | |

**Auto-selected:** Zero edits (D-06)
**Rationale:** Phase 25 D-03 happened to emit the exact format the existing regex was already configured for. Pure carry-forward.

## Kustomization + Deployment image rewrite

| Option | Description | Selected |
|--------|-------------|----------|
| Edit kustomization.yaml `images[0].name` + deployment.yaml `image:` (preserve setter comments) | Both files agree post-edit; ImageUpdateAutomation keeps them in sync going forward | ✓ |
| Edit only deployment.yaml (drop kustomize images: block) | Inconsistent with existing repo convention; setter resolution depends on kustomize images: entry | |
| Use a JSON6902 patch instead of in-place edit | Adds new patch syntax for no benefit; in-place is the established pattern | |

**Auto-selected:** Edit both, preserve setter comments (D-07 + D-08)
**Rationale:** Matches the existing kustomize images: + setter-comment plumbing; minimal-edit path.

## Migration sequencing + safety

| Option | Description | Selected |
|--------|-------------|----------|
| Two commits in one PR (secrets first, image rewire second) | Eliminates Flux scan-before-secret race; trades 5-15 min wall-clock for zero error noise | ✓ |
| Single bundled commit | Simpler PR; creates 1-30s race window where Flux tries scan before Secret materializes | |
| Two separate PRs | More overhead than benefit for atomic rollback | |

**Auto-selected:** Two commits, one PR (D-09)
**Rationale:** Clean cluster-event log + atomic rollback if Commit 2 fails; 5-15 min wait is acceptable.

## Rollback path

| Option | Description | Selected |
|--------|-------------|----------|
| `kubectl edit deployment` to revert to Forgejo registry path | Forgejo registry stays alive through Phase 26; rollback is one command | ✓ |
| Git revert the homelab repo + Flux reconcile | Cleaner audit trail but slower (waits for Flux source reconcile) | |
| Pre-stage a rollback Helm release | Overkill; we don't use Helm for hudsonfam | |

**Auto-selected:** kubectl edit (D-10)
**Rationale:** Fast (sub-second); Forgejo path proven to work (currently serving prod); Phase 27 ordering enforces "verify Phase 26 green ≥1 reconcile cycle before running Phase 27".

## Verification approach

| Option | Description | Selected |
|--------|-------------|----------|
| 8-command scripted verification (flux reconcile + kubectl observe) | Deterministic; satisfies all 5 ROADMAP success criteria explicitly | ✓ |
| Trust Flux reconcile + only spot-check final pod state | Faster but risks missing intermediate-stage failures (Secret materialization, ImageRepository readiness) | |
| Add a CI/synthetic-check step in homelab repo | Out of scope for Phase 26; would be a v3.5+ ops phase | |

**Auto-selected:** 8-command scripted verification (D-11)
**Rationale:** Each command maps directly to a success criterion in CICD-04/-05/-06; explicit observability path.

## Claude's Discretion

- File-path naming (`ghcr-pull-secret.yaml` vs `external-secret-ghcr.yaml`)
- ExternalSecret labels (matching existing patterns vs minimal)
- Whether to bundle into one PR with two commits vs two separate PRs (defaulted to one PR)
- Whether to add a one-line note in homelab/CLAUDE.md (defaulted to YES; small ops note)
- Exact sprig template formatting (follow ExternalSecrets canonical example)

## Deferred Ideas

- Delete broken `default/imagerepository/hudsonfam` → Phase 27
- `.woodpecker.yaml` removal + Woodpecker deregistration → Phase 27
- Forgejo registry cleanup → Phase 27
- `forgejo-registry-creds` Secret deletion → Phase 27
- End-to-end smoke test → Phase 28
- CLAUDE.md §Deployment rewrite → Phase 28
- Retroactive UAT for Phases 21/22/23/24 → Phase 28
- Image signing (cosign) → post-v3.5 backlog
- GitHub App auth (PAT alternative) → revisit if PAT rotation becomes ops pain
- Calendar-reminder automation for PAT expiry → owner ops responsibility
- Reflector/Replicator pattern for cross-namespace secret mirror → not introducing new operator
- Switching `recyclarr` / `seerr` GHCR scans to authenticated → separate homelab-infra phase (different root cause)
</content>
</invoke>