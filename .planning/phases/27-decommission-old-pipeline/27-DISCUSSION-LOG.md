# Phase 27: Decommission Old Pipeline - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-24
**Phase:** 27-decommission-old-pipeline
**Mode:** `--auto` (Claude selected recommended option for every decision; no interactive AskUserQuestion calls)
**Areas discussed:** Cluster cleanup, Repo cleanup + Woodpecker dereg, Forgejo registry path cleanup, Sequencing, CLAUDE.md scope, Verification

---

## Cluster cleanup (CICD-07 + CICD-09 secret cleanup)

| Option | Description | Selected |
|--------|-------------|----------|
| `kubectl delete` direct (cluster-only resources have no manifest source) | Verified via grep — broken default IR + 2 forgejo-registry-creds Secrets are cluster-only; manifest deletion not applicable | ✓ |
| Find manifest source in homelab repo + git rm | Doesn't apply — these were hand-applied at some past point, no homelab manifest exists | |
| Flux suspend + force-delete via finalizer scrub | Overkill for resources that just have a "secret not found" status | |

**Auto-selected:** `kubectl delete` direct (D-01 + D-02)
**Rationale:** Lowest-friction path; no Flux reconcile dependency; idempotent.

## Repo cleanup + Woodpecker deregistration (CICD-08)

| Option | Description | Selected |
|--------|-------------|----------|
| `git rm` + commit + push to GitHub main + Woodpecker MCP dereg | Repo-first ordering eliminates race window; MCP tools handle Woodpecker auth | ✓ |
| Comment out `.woodpecker.yaml` instead of delete | Half-measure; leaves dead code in repo; explicit deletion is cleaner | |
| Owner-only manual UI dereg via Woodpecker dashboard | Fallback path documented in plan; default to MCP-driven first | |

**Auto-selected:** git rm + MCP dereg (D-03 + D-04)
**Rationale:** Fail-closed posture — even if Woodpecker dereg API call fails, the missing `.woodpecker.yaml` blocks any future build attempt.

## Forgejo registry path cleanup (CICD-09 part 3)

| Option | Description | Selected |
|--------|-------------|----------|
| Delete entirely via Forgejo API | Cleanest; tags lived only as deployment refs, GHCR has duplicate copies of historical tags so no unique provenance lost | ✓ |
| Document retention with reason in `.planning/notes/decommission-decisions.md` | Owner-discretion fallback if API delete proves problematic; surface in plan as alt-path | |
| Per-version DELETE loop | Use only if Forgejo version doesn't support package-level DELETE; documented as fallback | |

**Auto-selected:** Delete entirely via Forgejo API (D-05) + owner-runnable UI fallback (D-06)
**Rationale:** GHCR holds the same historical tags (Phase 26 listing showed 46 tags including pre-cutover `20260408173607`); Forgejo registry artifacts are duplicate refs, not unique provenance.

## Sequencing + safety

| Option | Description | Selected |
|--------|-------------|----------|
| Repo first → Woodpecker dereg → cluster deletes → Forgejo registry delete → verify | Fail-closed at each step; most-destructive (Forgejo delete) last for clean rollback opportunity | ✓ |
| Single bulk `kubectl delete` script | Faster but loses per-step verification opportunities | |
| Cluster first → repo last | Reverses fail-closed posture; risks Woodpecker race during the gap | |

**Auto-selected:** Repo-first sequential (D-07)
**Rationale:** Phase 26 D-09 established the safe-ordering discipline; Phase 27 inherits it.

## CLAUDE.md scope decision

| Option | Description | Selected |
|--------|-------------|----------|
| Phase 27 makes ZERO edits to CLAUDE.md; full §Deployment rewrite owned by Phase 28 (CICD-11) | Avoids two PRs touching the same file; intermediate ROT prevented; ROADMAP SC #5 honored in spirit by Phase 28 comprehensive rewrite | ✓ |
| Partial Phase-27 scrub of Forgejo references in §Deployment | Half-measure; same section gets rewritten in Phase 28 anyway | |
| Comprehensive rewrite in Phase 27 (steal CICD-11) | Expands scope; conflicts with Phase 28 ownership | |

**Auto-selected:** ZERO CLAUDE.md edits in Phase 27 (D-09)
**Rationale:** Single-source-of-truth principle for shared docs; Phase 28 owns the comprehensive rewrite.

## Rollback design

| Option | Description | Selected |
|--------|-------------|----------|
| No rollback path needed — Phase 26 already idempotent; recovery is re-running Phase 26 cutover | Phase 26 was the rollback-safety phase; Phase 27 by design retires the safety net | ✓ |
| Add Phase-27-specific rollback recipe | Over-engineering; Phase 26 IS the rollback path | |
| Pre-snapshot all deleted resources to YAML for restore | Complexity > benefit for cleanup phase | |

**Auto-selected:** No Phase-27-specific rollback (D-08)
**Rationale:** Phase 26's GHCR cutover is the rollback target; not Phase 27 itself.

## Verification approach

| Option | Description | Selected |
|--------|-------------|----------|
| 7-command suite covering all 3 REQs + Flux health + pod sanity | Each command maps directly to a CICD SC; explicit observability | ✓ |
| Trust silent success | Risks missing intermediate-stage failures | |
| Add full /api/health smoke test for the deployed pod | Out of Phase 27 scope (Phase 28 owns end-to-end smoke) | |

**Auto-selected:** 7-command verification suite (D-10)

## Claude's Discretion

- Single Plan vs multi-Plan structure (default: single Plan with 7 tasks)
- Per-step PROCEED/HALT checkpoints (default: single end-of-plan checkpoint at verification task)
- Forgejo API auth method — bearer token vs basic auth (default: try API first, fall back to owner-runnable if auth fiddly)
- One-line note in homelab/CLAUDE.md documenting cleanup (default: NO; SUMMARY captures historical detail)
- Exact MCP tool sequence for Woodpecker dereg (executor explores at runtime)

## Deferred Ideas

- CLAUDE.md §Deployment comprehensive rewrite → Phase 28 (CICD-11)
- End-to-end no-op-commit smoke test → Phase 28 (CICD-10)
- Retroactive UAT for Phases 21-24 → Phase 28 (CICD-12, CICD-13)
- recyclarr/seerr ImageRepository TLS fix → separate homelab-infra phase
- Woodpecker server stability investigation → separate homelab-infra phase
- Forgejo PVC backup posture → separate homelab-infra phase
- Older GHCR tag cleanup (14-digit + SHA from old pipeline) → future GHCR retention policy phase
- Woodpecker server uninstall → out of scope (Woodpecker stays for other pipelines)
- Forgejo container registry feature uninstall → out of scope (Forgejo stays for homelab manifests repo)
</content>
</invoke>