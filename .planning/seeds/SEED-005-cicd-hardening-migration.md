---
id: SEED-005
status: dormant
planted: 2026-04-22
planted_during: v3.0 Phase 21 production UAT (blocked by broken CI pipeline)
trigger_when: Phase 21 is code-complete and ready to deploy to production, OR any future phase's production deployment is blocked by the Forgejo+Woodpecker pipeline, OR owner decides to close the Phase-21-UAT gap deliberately (not on an external block)
scope: Medium (1-day focused infra sprint; ~4 hours hands-on)
---

# SEED-005: CI/CD hardening — migrate hudsonfam deploy to GitHub Actions + GHCR

## Why This Matters

Owner's own observation (2026-04-22): "every time I use it I have to fix it which is a very low dx". Current deploy pipeline has 6 moving parts, 5 of which are self-hosted:

1. Forgejo repo (self-hosted, pod can restart / lose data / get renamed / get deleted)
2. Forgejo SSH endpoint (NodePort 30022 at 192.168.4.236 — depends on cluster state)
3. Woodpecker server (self-hosted, observed 5 restarts in 3 days during Phase 21 window)
4. Woodpecker agents + runner (3 pods)
5. git.homelab container registry (self-hosted, shares Longhorn volume with Forgejo)
6. Flux image automation (local, but agnostic to where the registry is)

This contrasts with CLAUDE.md's **documented intent**: "Push to main → GitHub Actions builds Docker image → GHCR → Flux image automation" — a 2-moving-part pipeline (GitHub Actions + GHCR are vendor-managed). The CLAUDE.md pattern was never implemented; `.github/workflows/` doesn't exist in hudsonfam. Someone pivoted to Woodpecker at some point and the documented intent drifted from reality.

During Phase 21's production UAT attempt (2026-04-22), investigation found:
- `forgejo-admin/hudsonfam` Forgejo repo no longer exists (deleted/renamed at some point; Woodpecker + Flux configs are orphaned)
- `default/imagerepository/hudsonfam` is in a persistent failed state ("secret forgejo-registry-creds not found")
- Homelab manifests repo has been stale at commit `dcd17ca8` for 8+ days
- Nothing was pushing the actual hudsonfam code to any pipeline that could build it

Full investigation documented in `.planning/notes/ci-cd-fragility-analysis.md`.

**Opportunity cost:** Phase 21 (AI-ACTION-01 + AI-ACTION-02 + AI-RENDER-04 + AI-RENDER-05 + AI-RENDER-06) is code-complete and passing 395/395 tests but cannot be deployed to `https://thehudsonfam.com` until this is fixed. Subsequent phases (22, 23, 24) would queue up behind the same block if nothing changes.

## When to Surface

**Decision locked 2026-04-22:** Owner explicitly chose to batch all v3.0 code-complete work behind a single v3.5 deploy rather than insert v3.5 between v3.0 phases. Rationale: continue building the AI-integration feature surface (Phases 22, 23, 24) without a context-switch to infra work, then do v3.5 once as a dedicated sprint that releases the accumulated v3.0 backlog.

**Primary trigger:** v3.0 milestone closes (all 5 phases — 20, 21, 22, 23, 24 — are code-complete). Activate v3.5 via `/gsd-new-milestone v3.5` on that day.

**Emergency trigger:** If any v3.0 phase discovers a production bug that's observable ONLY in the deployed environment (e.g., CSP violation, NFS mount issue, session-cookie edge case), pull v3.5 forward to unblock investigation. Unlikely per current Plan 21-01..07 coverage, but worth naming.

**Accumulated deferred work queued for v3.5-P4 retroactive UAT:**
- Phase 21 Plan 21-08 (AI-ACTION-01 + AI-ACTION-02 + AI-RENDER-04 + AI-RENDER-05 + AI-RENDER-06)
- Phase 22 Plan NN (Salary Intelligence UAT — pending Phase 22 planning)
- Phase 23 Plan NN (Owner-Triggered Workflows UAT — pending Phase 23 planning)
- Phase 24 Plan NN (Regenerate Expansion UAT — pending Phase 24 planning)

This means v3.5-P4's retroactive UAT scope grows as v3.0 proceeds. Budget accordingly — expect the UAT portion of v3.5-P4 to take 30-45 min (5+ features across multiple sections) rather than 10-15 min for Phase 21 alone.

Present this seed during:
- `/gsd-new-milestone` when owner advances past v3.0 completion
- `/gsd-progress` output when v3.0 hits 4/5 phases so owner can stage v3.5 activation

## Scope Estimate

**Medium (~4 hours hands-on, 1 focused day)** — 4 sub-phases:

1. **v3.5-P1** `.github/workflows/build-and-push.yml` creation (~1 hour) — build Dockerfile, push to GHCR with `YYYYMMDDHHmmss` tag
2. **v3.5-P2** Flux reconfiguration (~1.5 hours) — update `imagerepository/hudsonfam` to watch `ghcr.io/hudsor01/hudsonfam`, wire a GHCR PAT via ExternalSecret pattern
3. **v3.5-P3** Decommission old pipeline (~30 min) — remove broken `default/imagerepository`, deregister Woodpecker repo, document or delete orphaned registry entries
4. **v3.5-P4** Smoke test + docs (~1 hour) — no-op commit test end-to-end, update CLAUDE.md, retroactively execute Plan 21-08 UAT

**Risks are well-characterized** (GHCR rate-limit, PAT expiration, wrong image path, breaking change mid-rewire). All have concrete mitigations in `.planning/notes/ci-cd-fragility-analysis.md` §Risks.

## Key Artifacts When Promoted

When this seed becomes a milestone:

1. Create `.planning/milestones/v3.5-cicd-hardening/` directory
2. Write `v3.5-ROADMAP.md` with the 4-phase breakdown above (copy from `ci-cd-fragility-analysis.md` §Proposed phases verbatim)
3. Start v3.5-P1 via `/gsd-plan-phase 30` (phase number chosen to leave space after Phase 24 for v3.0 wrap-up phases)
4. Ensure `ci-cd-fragility-analysis.md` is referenced in every v3.5 phase's CONTEXT.md as canonical background

## Contrast with Other Seeds

- **SEED-001** (pipeline health dashboard): AI-pipeline observability. Orthogonal — that's about watching n8n workflows, this is about hudsonfam's own deploy pipeline.
- **SEED-002/003/004**: None of these touch CI/CD.

This seed is unique in being **infrastructure-remediation** scoped rather than feature-add scoped.

## Deferrals (explicitly not in v3.5)

- Fixing `recyclarr` / `seerr` TLS errors on `cache.homelab` — same root cause (self-hosted cert rotation fragility) but different apps; homelab-infra concern, not hudsonfam concern
- Replacing Longhorn with more-redundant storage — orthogonal
- Setting up a staging environment — single-user project; local `npm run build && npm start` is sufficient pre-prod
- Debugging Woodpecker server crash loop — Woodpecker is being removed from hudsonfam's critical path; its own reliability can be addressed separately for non-hudsonfam repos that stay on it
- Keeping Woodpecker + Forgejo as a fallback path — "two parallel pipelines" is worse than one simple one; commit to GHCR or don't do this milestone

---

*Seed planted during Phase 21 UAT block. Owner approved deferral over same-session band-aid (2026-04-22).*
