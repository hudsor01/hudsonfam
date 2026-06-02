---
phase: 30-cloud-re-platform
plan: "03"
subsystem: deployment
tags: [vercel, docker-removal, flux-removal, standalone-removal, cloud-migration]
dependency_graph:
  requires:
    - 30-02  # R2 image pipeline, homelab admin removal
  provides:
    - next.config.ts — Vercel-native (no standalone output)
    - CLAUDE.md — Deployment section rewritten for Vercel
  affects:
    - GitHub Actions (GHCR build workflow deleted)
    - Deploy pipeline (GHCR/Flux/K3s retired; Vercel git-push replaces)
tech_stack:
  added: []
  patterns:
    - Vercel git integration (push main → auto-deploy)
    - Cloudflare DNS CNAME/A → Vercel (Tunnel retired, owner action pending)
key_files:
  created: []
  modified:
    - next.config.ts
    - CLAUDE.md
  deleted:
    - Dockerfile
    - .dockerignore
    - .github/workflows/build-and-push.yml
    - .github/workflows/ghcr-retention.yml
decisions:
  - Delete artifacts outright (no archival branch) — homelab is offline and the pipeline is permanently dead
  - CLAUDE.md Deployment section replaced entirely (no homelab failure modes retained)
metrics:
  duration: "~10 minutes"
  completed: "2026-06-01"
  tasks_completed: 1
  files_modified: 2
  files_deleted: 4
---

# Phase 30 Plan 03: Delete Deploy Artifacts + Vercel Reconciliation Summary

**One-liner:** Deleted Dockerfile/.dockerignore and both GitHub Actions workflows; removed `output: "standalone"` from next.config.ts; rewrote CLAUDE.md Deployment section for Vercel git-push model — repo is now Vercel-native with no Docker/GHCR/Flux/K3s artifacts.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 (CLOUD-05) | Delete deploy artifacts + remove standalone output | f2f9515 | Dockerfile, .dockerignore, 2 workflows (deleted); next.config.ts, CLAUDE.md (modified) |

## Owner Checkpoints Remaining

| Task | Type | Gate | Status |
|------|------|------|--------|
| CLOUD-06 | checkpoint:human-action | blocking | Awaiting — Vercel project link + env vars + Google OAuth redirect URIs |
| CLOUD-07 | checkpoint:human-action | blocking | Awaiting — Cloudflare DNS cut, Tunnel retirement |
| CLOUD-08 | checkpoint:human-verify | blocking | Awaiting — live boot verification (auth, recipes, R2 upload) |

## CLOUD-05 Must-Have Confirmation

| Must-Have | Status |
|-----------|--------|
| Dockerfile deleted | DONE — `test ! -e Dockerfile` passes |
| .dockerignore deleted | DONE — `test ! -e .dockerignore` passes |
| build-and-push.yml deleted | DONE — `test ! -e .github/workflows/build-and-push.yml` passes |
| ghcr-retention.yml deleted | DONE — `test ! -e .github/workflows/ghcr-retention.yml` passes |
| `output: "standalone"` removed from next.config.ts | DONE — `grep -c 'output.*standalone' next.config.ts` = 0 |
| CLAUDE.md Deployment section describes Vercel | DONE — GHCR/Flux/K3s/Tunnel content replaced with Vercel git-push model |
| `npm run build` exits 0 | DONE — 1047 pages, exit 0 |
| `npm test` passes | DONE — 238 passed, 1 skipped |
| `npm run lint` clean | DONE — 0 errors, 1 pre-existing TanStack Table warning |

## Verification Results

```
test ! -e Dockerfile:                       PASS
test ! -e .dockerignore:                    PASS
test ! -e .github/workflows/build-and-push.yml: PASS
test ! -e .github/workflows/ghcr-retention.yml: PASS
grep -c 'output.*standalone' next.config.ts: 0 (CLEAN)
npm run build:                              Exit 0 (1047 pages)
npm test:                                   238 passed | 1 skipped
npm run lint:                               0 errors, 1 pre-existing warning
```

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — this task is infrastructure deletion only; no data-rendering code touched.

## Threat Surface Scan

| Assessment | Details |
|------------|---------|
| T-30-08 (env vars on Vercel) | PENDING OWNER ACTION — secrets must be entered in Vercel project Settings → Env Vars (Production scope); nothing in repo; .env.local stays gitignored |
| T-30-09 (OAuth redirect on new host) | PENDING OWNER ACTION — BETTER_AUTH_URL must be set to https://thehudsonfam.com in Vercel; Google Authorized redirect URIs must include the Vercel URL |
| T-30-10 (dangling Cloudflare Tunnel) | PENDING OWNER ACTION — Tunnel route deletion happens at CLOUD-07 DNS cut |
| T-30-11 (deploy pipeline change) | ACCEPTED — Vercel git integration deploys from main; controlled by GitHub + Vercel project membership |

No new threat surface introduced by this task (deletions only + config simplification).

## Self-Check: PASSED

- Dockerfile — DELETED (confirmed)
- .dockerignore — DELETED (confirmed)
- .github/workflows/build-and-push.yml — DELETED (confirmed)
- .github/workflows/ghcr-retention.yml — DELETED (confirmed)
- next.config.ts — exists, no `standalone` string
- CLAUDE.md — Deployment section references Vercel, not GHCR/Flux/K3s
- Commit f2f9515 — present in git log
