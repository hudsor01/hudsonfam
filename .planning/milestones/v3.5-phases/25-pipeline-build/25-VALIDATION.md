---
phase: 25
slug: pipeline-build
status: approved
nyquist_compliant: true
wave_0_complete: false
created: 2026-04-23
approved_at: 2026-04-23
---

# Phase 25 — Validation Strategy

> Per-phase validation contract. Phase 25 is infrastructure (single YAML file); validation happens via YAML parse + GitHub Actions first-build observation.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Structural (YAML parse + grep) + observational (first GitHub Actions run) — no Vitest cases this phase |
| **Config file** | `.github/workflows/build-and-push.yml` itself |
| **Quick structural check** | `npx yaml-lint .github/workflows/build-and-push.yml` (if yaml-lint available) OR `node -e "require('js-yaml').load(require('fs').readFileSync('.github/workflows/build-and-push.yml','utf8'))"` |
| **Acceptance test** | First push to `main` triggers workflow → green check → new tag appears at `ghcr.io/hudsor01/hudsonfam` within 10 min (CICD-01, CICD-02, CICD-03) |
| **Estimated runtime** | ~0s structural / 8-12 min observational |

---

## Sampling Rate

- **Post-task commit:** structural parse (YAML load succeeds)
- **Post-plan:** push-to-main observation (GitHub Actions → GHCR)
- **Pre-verify-work:** manual inspection of Actions UI + `gh api /user/packages/container/hudsonfam/versions | jq '.[0].metadata.container.tags'`

---

## Per-Task Verification Map

| Task ID | Plan | Requirement | Verify | File Exists | Status |
|---------|------|-------------|--------|-------------|--------|
| 25-01-01 | 01 Create workflow file | CICD-01, CICD-02, CICD-03 | YAML parses; top-level keys match D-01..D-12; grep for `docker/build-push-action@v5`, `docker/setup-buildx-action@v3`, `docker/login-action@v3`, `actions/checkout@v4`, `linux/amd64`, `type=gha`, `date -u +%Y%m%d%H%M%S`, `concurrency`, `cancel-in-progress: true`, `packages: write` | ❌ W0 (new file) | ⬜ pending |
| 25-01-02 | 01 Commit + push | all 3 | `git log --oneline -1` shows commit with phase-25 tag; `.github/workflows/build-and-push.yml` tracked | ❌ W0 | ⬜ pending |
| 25-01-03 | 01 (optional) First-build observational | CICD-01 SC #1/#2, CICD-02 SC #1, CICD-03 SC #5 | After push: `gh run list --workflow=build-and-push.yml --limit 1` shows success; `gh api /user/packages/container/hudsonfam/versions` shows timestamp+latest tags | ❌ manual | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `.github/workflows/build-and-push.yml` — NEW file, ~50 lines of YAML
- [ ] No new npm deps; no Dockerfile changes (D-09)
- [ ] No new tests in `src/__tests__/` — Phase 25 has zero application-code surface

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| First build succeeds end-to-end | CICD-01, CICD-02 | The workflow runs in GitHub's infra; no way to unit-test it locally | After commit lands on main: open `github.com/hudsor01/hudsonfam/actions`; confirm `build-and-push` workflow ran green; click into run to confirm timestamp output + build-push step produced `ghcr.io/hudsor01/hudsonfam:<timestamp>` + `:latest`; entire run under 10 min |
| GHCR package visibility (pre-existing) | Phase 26 handoff | Prior manual push exists; visibility setting is 1-click in GHCR UI | Open `github.com/users/hudsor01/packages/container/hudsonfam/settings`; note current visibility (public vs private); record for Phase 26 planning — if private, Phase 26 needs a GHCR PAT for Flux pull |
| Workflow_dispatch trigger works | CICD-01 SC #5 | Manual trigger from Actions UI | After first successful push-triggered run: Actions → build-and-push → "Run workflow" → main → confirm green + new timestamp |

---

## Validation Sign-Off

- [ ] Task 01 workflow file created and YAML parses
- [ ] Task 02 committed and pushed to main
- [ ] Task 03 (observational) first-run green + GHCR shows new tag
- [ ] STATE.md records Phase 26 handoff note (GHCR visibility to verify)

**Approval:** approved pre-execution — plan is 2 tasks + 1 observational; structural checks are sufficient for Nyquist given infrastructure nature.
