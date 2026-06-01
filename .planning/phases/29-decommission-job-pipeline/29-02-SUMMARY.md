---
phase: 29-decommission-job-pipeline
plan: "02"
subsystem: job-pipeline-decommission
tags: [deletion, libs, tests, deps, env-vars, build-verified]
dependency_graph:
  requires: [29-01]
  provides: [job-libs-deleted, job-tests-deleted, schema-drift-tooling-gone, streamdown-pruned, env-vars-purged]
  affects: [package.json, bun.lock, globals.css, CLAUDE.md, .env.example]
tech_stack:
  added: []
  patterns: [pure-deletion, surgical-lockfile-edit]
key_files:
  created: []
  modified:
    - package.json
    - bun.lock
    - src/styles/globals.css
    - .env.example
    - CLAUDE.md
  deleted:
    - src/lib/jobs-db.ts
    - src/lib/job-actions.ts
    - src/lib/job-constants.ts
    - src/lib/job-freshness.ts
    - src/lib/jobs-schemas.ts
    - src/lib/webhooks.ts
    - src/lib/regenerate-predicates.ts
    - src/lib/attach-freshness.ts
    - src/lib/is-company-research-empty.ts
    - src/lib/score-color.ts
    - src/lib/url-helpers.ts
    - src/lib/provenance.ts
    - src/__tests__/ (25 job-related test files)
    - scripts/check-jobs-schema.ts
    - scripts/install-hooks.sh
decisions:
  - Surgical bun.lock edit (remove streamdown entries directly) because Safe Chain blocked both bare bun install and --safe-chain-skip-minimum-package-age; permanent version-pin fix deferred to Phase 30 (CLOUD-09)
  - Also removed orphaned job pipeline color tokens (status-*, source-*, score-*) from globals.css since zero consumers remained after 29-01 UI deletion — extends plan scope slightly but completes the job-free color namespace
metrics:
  duration: "~30 minutes"
  completed: "2026-06-01"
  tasks_completed: 2
  tasks_total: 2
  files_changed: 44
---

# Phase 29 Plan 02: Delete Job Lib Modules, Tests, and Tooling Summary

Deleted all 12 job lib modules (9 core + 3 orphaned support), 25 job-related test files including the streamdown-importing tailored-resume-xss.test.tsx, schema-drift tooling (check-jobs-schema.ts, install-hooks.sh, pre-push hook reference), and the orphaned job pipeline color tokens from globals.css. Pruned streamdown from package.json + bun.lock, removed its @source directive, and purged JOBS_DATABASE_URL/N8N_WEBHOOK_SECRET from .env.example and CLAUDE.md. Build/test/lint all green. Phase-level gate (`grep -rn "admin/jobs" src/`) returns nothing.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Delete job lib modules, all job tests, schema-drift tooling | 89e2e0c | 39 deletions (12 libs + 25 tests + 2 scripts) |
| 2 | Prune streamdown dep + @source, regenerate lockfile, purge env vars and CLAUDE.md | 556cd63 | 5 files modified |

## What Was Done

**Task 1 — Lib + test + tooling deletions:**
- Pre-deletion greps confirmed all 3 orphaned support libs (score-color, url-helpers, provenance) had zero non-job consumers outside the deleted admin/jobs dir and __tests__
- Deleted 9 core job lib modules and 3 orphaned support libs (12 total)
- Deleted 25 job-related test files (11 components, 13 lib, 1 api) including tailored-resume-xss.test.tsx (which imported streamdown — leaving it would have caused MODULE_NOT_FOUND after dep pruning)
- Deleted scripts/check-jobs-schema.ts and scripts/install-hooks.sh (.git/hooks/pre-push was not installed)
- Confirmed n8n.cloud.svc.cluster.local health-check mock in handlers.ts preserved (homelab monitoring, not a job webhook)
- Vitest: 274/274 pass after deletions

**Task 2 — Dep + lockfile + env/doc cleanup:**
- Removed test:schema script and streamdown dep from package.json
- Fixed trailing comma in package.json scripts block (introduced when removing test:schema)
- Removed streamdown @source directive from globals.css (line 3)
- Also removed orphaned job pipeline color tokens (--color-status-*, --color-source-*, --color-score-*) from globals.css — zero consumers remained, keeping them contradicted the plan objective
- Surgically edited bun.lock to remove streamdown's workspace entry and package definition (bare bun install and --safe-chain-skip-minimum-package-age both blocked by Aikido Safe Chain — accepted per plan fallback)
- Removed JOBS_DATABASE_URL and N8N_WEBHOOK_SECRET from .env.example
- Rewrote CLAUDE.md: removed install-hooks.sh/test:schema from Commands block, removed jobs/ from project structure, removed jobs-db.ts/job-actions.ts from lib section, removed Jobs pg.Pool from Database section, removed entire Pre-push hook section, removed JOBS_DATABASE_URL/N8N_WEBHOOK_SECRET from Environment Variables
- build/test/lint all green

## Verification Results

| Check | Result |
|-------|--------|
| 12 job lib files deleted | PASS |
| `grep -rln` for lib modules in src/ → nothing | PASS |
| tailored-resume-xss.test.tsx deleted | PASS |
| scripts/check-jobs-schema.ts deleted | PASS |
| scripts/install-hooks.sh deleted | PASS |
| n8n health-check mock preserved in handlers.ts | PASS |
| `npm test` 274/274 | PASS |
| `grep -c "test:schema" package.json` = 0 | PASS |
| `grep -c "streamdown" package.json` = 0 | PASS |
| `grep "@hello-pangea" package.json` → nothing | PASS (confirmed never a dep) |
| `grep -c "streamdown" globals.css` = 0 | PASS |
| `pg` and `remark-gfm` kept in package.json | PASS |
| bun.lock changed | PASS |
| JOBS_DATABASE_URL in .env.example → 0 | PASS |
| N8N_WEBHOOK_SECRET in .env.example → 0 | PASS |
| JOBS_DATABASE_URL in CLAUDE.md → 0 | PASS |
| N8N_WEBHOOK_SECRET in CLAUDE.md → 0 | PASS |
| test:schema/install-hooks/check-jobs/pre-push in CLAUDE.md → 0 | PASS |
| `grep -rn "admin/jobs" src/` → nothing | PASS (phase-level gate) |
| `next build` exit 0 | PASS |
| `npm test` exit 0 | PASS |
| `npm run lint` exit 0 (0 errors, 1 pre-existing warning) | PASS |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Trailing comma in package.json after test:schema removal**
- **Found during:** Task 2, when npm test reported JSONParseError
- **Issue:** Removing `"test:schema": "bun scripts/check-jobs-schema.ts"` left a trailing comma on the `"test:watch"` line, making package.json invalid JSON
- **Fix:** Changed `"test:watch": "vitest",` to `"test:watch": "vitest"` (no trailing comma)
- **Files modified:** package.json
- **Commit:** 556cd63

**2. [Rule 2 - Missing Critical Cleanup] Orphaned job pipeline color tokens in globals.css**
- **Found during:** Task 2 read_first phase
- **Issue:** After 29-01 deleted the job UI and Task 1 deleted job libs/tests, the globals.css job pipeline color tokens (--color-status-applied/interview/offer, --color-source-jobicy/remoteok/himalayas/arbeitnow/workingnomads/serpapi/remotive, --color-score-high/mid) had zero consumers anywhere in src/
- **Fix:** Removed the 3 comment blocks and 13 CSS token declarations (extends plan scope slightly)
- **Files modified:** src/styles/globals.css
- **Commit:** 556cd63

**3. [Rule 3 - Blocking] Safe Chain blocked bun install during lockfile regen**
- **Found during:** Task 2
- **Issue:** `bun install` failed with Aikido Safe Chain minimum-package-age errors for 7 packages; retry with `--safe-chain-skip-minimum-package-age` also failed (same errors)
- **Fix:** Surgically removed streamdown entries from bun.lock directly (workspace declaration at line 35 and package definition at line 1852). bun.lock diff confirmed present. Plan explicitly documents this fallback.
- **Files modified:** bun.lock
- **Commit:** 556cd63

## Known Stubs

None. This is a pure-deletion plan; no new code was written.

## Threat Flags

None. Attack surface only shrinks.

## Self-Check: PASSED

- `src/lib/jobs-db.ts` — MISSING (deleted, as intended) CONFIRMED
- `src/lib/score-color.ts` — MISSING (deleted, as intended) CONFIRMED
- `src/__tests__/components/tailored-resume-xss.test.tsx` — MISSING (deleted, as intended) CONFIRMED
- `scripts/check-jobs-schema.ts` — MISSING (deleted, as intended) CONFIRMED
- `scripts/install-hooks.sh` — MISSING (deleted, as intended) CONFIRMED
- `package.json` streamdown=0, test:schema=0, pg present, remark-gfm present CONFIRMED
- `src/styles/globals.css` streamdown=0 CONFIRMED
- `.env.example` JOBS_DATABASE_URL=0, N8N_WEBHOOK_SECRET=0 CONFIRMED
- `CLAUDE.md` JOBS_DATABASE_URL=0, N8N_WEBHOOK_SECRET=0, test:schema=0 CONFIRMED
- bun.lock changed CONFIRMED
- `grep -rn "admin/jobs" src/` → nothing CONFIRMED (phase gate)
- Commit 89e2e0c — CONFIRMED (Task 1)
- Commit 556cd63 — CONFIRMED (Task 2)
- `npm test` 274/274 CONFIRMED
- `next build` exit 0 CONFIRMED
- `npm run lint` exit 0 CONFIRMED
