# Phase 28: End-to-End Smoke + Retroactive UAT - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-25
**Phase:** 28-smoke-retroactive-uat (final v3.5 phase)
**Mode:** `--auto` (Claude selected recommended option for every decision; no interactive AskUserQuestion calls)
**Areas discussed:** CICD-10 smoke method, CICD-11 doc rewrite path, CICD-12 P21-08 UAT execution, CICD-13 P22/23/24 retroactive smoke, n8n-side gap handling, Plan structure, Milestone close-out

---

## CICD-10 — End-to-end no-op smoke test

| Option | Description | Selected |
|--------|-------------|----------|
| Empty commit (`--allow-empty`) | Cleanest signal: 100% warm cache; pure pipeline latency measurement; no source artifact | ✓ |
| Whitespace tweak in source | Some layers rebuild → measures rebuild + pipeline; muddies CICD-10 timing | |
| Comment change in CLAUDE.md | Same issue — bundles CICD-10 with CICD-11 | |
| `workflow_dispatch` only | Doesn't exercise the push-trigger path which is the actual production deploy mechanism | |

**Auto-selected:** Empty commit (D-01)
**Rationale:** Measures pure pipeline latency; clean signal; aligns with 15-min CICD-10 SC.

## CICD-10 observation chain

| Option | Description | Selected |
|--------|-------------|----------|
| Force-reconcile via `flux reconcile ...` at each stage; agent measures + records timing | Hits the 15-min SC reliably; documents force-reconcile as ops lever | ✓ |
| Wait for natural Flux scan interval (6h) | Doesn't fit CICD-10's 15-min SC | |
| `kubectl get -w` watch loops | Useful but not necessary for the smoke; force-reconcile gives faster feedback | |

**Auto-selected:** Force-reconcile chain (D-02)

## CICD-11 — CLAUDE.md §Deployment rewrite

| Option | Description | Selected |
|--------|-------------|----------|
| Apply pre-drafted text from `.planning/notes/phase-28-claude-md-deployment-rewrite-draft.md` after live re-validation | Saves ~30 min of writing; draft already covers all required content per CICD-11 SC | ✓ |
| Write fresh in Phase 28 | Wastes the parallel-prep work done during Phase 27 wait time | |
| Defer CLAUDE.md update to v4.0 | Misses CICD-11; ROADMAP says Phase 28 owns it | |

**Auto-selected:** Apply pre-drafted text after re-validation (D-04)

## CICD-11 sequencing

| Option | Description | Selected |
|--------|-------------|----------|
| CICD-10 first, then CICD-11 (docs describe verified-working pipeline) | Right order: don't claim it works in docs until smoke proves it works | ✓ |
| CICD-11 first, then CICD-10 | Risks publishing docs that turn out to be wrong if smoke fails | |
| Parallel | Coupled commits to same repo; serialize for clean git history | |

**Auto-selected:** CICD-10 → CICD-11 (D-06)

## CICD-12 — Plan 21-08 retroactive UAT

| Option | Description | Selected |
|--------|-------------|----------|
| Owner does 5 browser checks per Plan 21-08 §"Retroactive execution path" lines 67-79 verbatim | Plan 21-08 already has the script; just execute | ✓ |
| Re-design UAT script | Wastes Plan 21-08's existing detail | |
| Skip CICD-12 since the code is already known good | Doesn't satisfy CICD-12; production observability is the explicit ask | |

**Auto-selected:** Execute Plan 21-08 retroactive-execution-path script (D-07)

## CICD-13 — Phases 22/23/24 retroactive smoke scope

| Option | Description | Selected |
|--------|-------------|----------|
| Spot-check the 1-2 highest-value features per phase per ROADMAP §Phase 28 SC #4 | Right-sized for "smoke" vs full UAT; ROADMAP wording supports | ✓ |
| Full UAT for every Phase 22/23/24 feature | Over-scoping — turns 30-45 min UAT into multi-hour | |
| Skip CICD-13 entirely | Doesn't satisfy the REQ | |

**Auto-selected:** Per-phase spot-check (D-08)

## CICD-13 — n8n-side gap handling

| Option | Description | Selected |
|--------|-------------|----------|
| Document gaps as OBSERVATIONAL-PENDING-N8N + seed v3.5.1 followup | Doesn't conflate "client-side works" with "full safety chain works"; defers homelab-PR concern correctly | ✓ |
| Treat gaps as Phase 28 BLOCKERs requiring n8n PR completion | Out of scope per Phase 28 boundary; n8n side is homelab-repo PR concern | |
| Ignore gaps entirely | Loses operational visibility; misleading sign-off | |

**Auto-selected:** Document + seed v3.5.1 followup (D-09)

## Plan structure

| Option | Description | Selected |
|--------|-------------|----------|
| Single Plan 28-01 with 5 tasks (smoke, docs, P21 UAT, P22-24 UAT, SUMMARY consolidation) | Cohesive single artifact for the final v3.5 phase | ✓ |
| Split into 2-3 plans (one per CICD or per-phase-target group) | Scope is small enough that splitting adds overhead without benefit | |
| Per-CICD plan (4 plans) | Same — over-decomposition for ~1-2 hour total work | |

**Auto-selected:** Single Plan 28-01 with 5 tasks (D-10)

## v3.5 milestone close-out

| Option | Description | Selected |
|--------|-------------|----------|
| Generate `v3.5-MILESTONE-SUMMARY.md` in new milestones dir + git-tag the close commit | Full milestone close-out; clean handoff to v4.0 | ✓ |
| Just commit Phase 28 SUMMARY and call it done | Loses milestone-level summary; SEED-005 thesis closure not surfaced | |
| Auto-trigger v4.0 milestone planning | Out of scope; v4.0 planning is a separate decision | |

**Auto-selected:** v3.5 milestone summary + git-tag (D-11)

## Owner-facing post-milestone checklist

| Option | Description | Selected |
|--------|-------------|----------|
| Surface 4-item checklist (delete phase-27-pats, rotate PATs, triage Dependabot, GHCR retention decision) in Phase 28 SUMMARY + milestone summary | Owner gets a clear punch list of optional follow-ups; nothing blocking | ✓ |
| Bury in deferred-ideas only | Owner may miss it | |
| Add as Phase 28 tasks | Owner-ops surface; not agent-executable; would expand scope | |

**Auto-selected:** Surface in SUMMARY + milestone summary (D-12)

## Claude's Discretion

- Exact wording of empty smoke commit message (D-01 suggests "smoke(28): v3.5-P4 end-to-end pipeline verification")
- Whether to git-tag the v3.5 close commit (default: YES, `v3.5-complete`)
- Whether owner does CICD-12 + CICD-13 in one session vs async
- Whether to include `kubectl get events -n homepage --since=15m` in CICD-10 verification (recommend YES)
- Tone trim of CLAUDE.md rewrite (only at owner's explicit direction)
- Per-phase SUMMARY edit format (suggest a "Production UAT executed" appended section)

## Deferred Ideas

- v3.5.1 followup milestone (if CICD-12/13 surface bugs)
- n8n-side HMAC verify + regenerate endpoints → SEED-006-n8n-hardening-followup.md (NEW)
- GitHub Dependabot triage → v4.0 candidate
- GHCR retention policy → future cleanup phase
- Forgejo PVC backup hardening → orthogonal homelab-infra
- recyclarr/seerr ImageRepository TLS → orthogonal homelab-infra
- `kubectl explain` validation tooling as CI gate → v4.0 candidate
- CICD-FUTURE-01/02/03 (PR previews, auto-rollback, SHA tags) → explicit v3.5 deferrals
- Multi-arch builds, matrix builds, Renovate, staging env, external monitoring → explicit v3.5 out-of-scope
- Node 24 migration (action v7/v4) → past v3.5-P4 per Phase 25 D-05
- Broader CLAUDE.md tone overhaul → only §Deployment in CICD-11
</content>
</invoke>