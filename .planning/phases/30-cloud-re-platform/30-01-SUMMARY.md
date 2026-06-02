---
phase: 30-cloud-re-platform
plan: "01"
subsystem: infra
tags: [neon, postgres, redis-removal, deps, renovate, better-auth, safe-chain]
dependency_graph:
  requires: []
  provides:
    - src/lib/auth.ts — Redis-free, Postgres-backed sessions
    - src/lib/prisma.ts — verified Neon runtime connection via @prisma/adapter-pg
    - package.json — aged-pinned deps, Safe Chain 48h gate cleared
    - bun.lock — regenerated from pinned package.json
    - renovate.json — security-only policy, minimumReleaseAge 48h
  affects:
    - better-auth session store (Redis → Postgres)
    - bun install (no age-gate errors)
    - CI/CD build (lockfile stable)
tech_stack:
  added:
    - renovate.json (security-only dep update policy)
  patterns:
    - Postgres-backed better-auth sessions (secondaryStorage removed)
    - Aikido Safe Chain 48h-aligned exact-version pinning
key_files:
  created:
    - renovate.json
    - src/__tests__/lib/neon-connection.test.ts
  modified:
    - src/lib/auth.ts
    - package.json
    - bun.lock
    - .env.example
decisions:
  - Pin exact versions for any package Safe Chain suppresses; use bun resolutions for transitive conflicts
  - eslint pinned to 9.39.4 (10.x breaks eslint-plugin-react 7.x contextOrFilename API)
  - kysely resolution-pinned to 0.28.17 (better-auth@1.6.12 kysely-adapter incompatible with 0.29.x export changes)
  - No automated dep-bumper found; churn source is interactive bun install resolving caret ranges
metrics:
  duration: "~30 minutes"
  completed: "2026-06-02"
  tasks_completed: 3
  files_modified: 7
---

# Phase 30 Plan 01: Foundation — Neon Connection, Redis Removal, Dep Stabilization Summary

**One-liner:** Redis stripped from auth.ts; better-auth on Postgres-backed sessions via prismaAdapter; deps aged-pinned so `bun install` clears the Aikido Safe Chain 48h gate with no skip flag; security-only Renovate policy added.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Remove Redis from auth.ts (CLOUD-02) | 09ffc25 | src/lib/auth.ts, package.json, .env.example |
| 2 | Verify Neon runtime connection (CLOUD-01) | 622e1f8 | src/__tests__/lib/neon-connection.test.ts |
| 3 | Aged-pin deps + Renovate + bun.lock regen (CLOUD-09) | 0602bfc | package.json, bun.lock, renovate.json |

## Must-Have Confirmation

| Must-Have | Status |
|-----------|--------|
| App runtime connects to Neon via @prisma/adapter-pg over pooled DATABASE_URL | DONE — prisma.ts uses PrismaPg(process.env.DATABASE_URL); neon-connection.test.ts passes against live Neon seed |
| No Redis code path, dependency, or env reference remains | DONE — ioredis removed from package.json and auth.ts; REDIS_URL removed from .env.example; `rg` returns CLEAN |
| bun install resolves under Aikido Safe Chain age gate with no skip flag | DONE — bun install exits clean; `bun install --frozen-lockfile` exits 0; no age-gate suppression text |
| Renovate configured security-only with minimumReleaseAge >=48h | DONE — renovate.json created with minimumReleaseAge "48 hours", vulnerabilityAlerts, osvVulnerabilityAlerts, routine bumps disabled |

## Verification Results

```
Redis artifacts check:  CLEAN (rg returns nothing)
bun install:            No age-gate suppression; Checked 859 installs across 900 packages (no changes)
bun install --frozen:   Exit 0
minimumReleaseAge:      "48 hours" appears 3x in renovate.json
Pre-release carets:     None
Tests:                  275 passed | 1 skipped (276 total) — neon-connection skips cleanly when DATABASE_URL unset
Lint:                   Exit 0 (1 pre-existing warning: TanStack Table useReactTable memoization)
Build:                  next build exit 0; 1049 static pages generated
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] ESLint 10 breaks eslint-plugin-react 7.x**
- **Found during:** Task 3 (post bun install regen)
- **Issue:** The old stale bun.lock had eslint@9.39.4 despite package.json specifying `^10.4.1`. After bun.lock regen, eslint resolved to 10.4.1, which removed the `contextOrFilename.getFilename` API that eslint-plugin-react 7.37.5 depends on.
- **Fix:** Pinned `eslint` to exact `9.39.4` in package.json (eslint-config-next 16.2.6 peerDep allows `>=9.0.0`).
- **Files modified:** package.json, bun.lock
- **Commit:** 0602bfc

**2. [Rule 1 - Bug] kysely 0.29.x incompatible with better-auth@1.6.12 kysely-adapter**
- **Found during:** Task 3 (`next build` post regen)
- **Issue:** The old bun.lock had kysely@0.28.14 (transitive through better-auth). After regen, kysely resolved to 0.29.2. The better-auth kysely-adapter bundled in 1.6.12 imports `DEFAULT_MIGRATION_LOCK_TABLE` from the kysely main index, which kysely 0.29.x removed (moved to kysely/migration module). Build failed with 12 Turbopack errors.
- **Fix:** Added `resolutions: { kysely: "0.28.17" }` to package.json to pin the transitive dep to an aged stable version compatible with better-auth@1.6.12.
- **Files modified:** package.json, bun.lock
- **Commit:** 0602bfc

**3. [Rule 2 - Missing direct deps] @prisma/adapter-pg and @prisma/client added as explicit direct deps**
- **Found during:** Task 3 (reviewing bun.lock workspace deps vs package.json)
- **Issue:** `src/lib/prisma.ts` imports `@prisma/adapter-pg` directly, but it was only a transitive dep in the old bun.lock (under @prisma/client). `@prisma/client` was also not listed explicitly.
- **Fix:** Added `@prisma/adapter-pg@7.8.0` and `@prisma/client@7.8.0` as explicit direct dependencies.
- **Files modified:** package.json
- **Commit:** 0602bfc

## Dep Churn Source Investigation

No automated dep-bumper found. Checked:
- `.github/renovate.json` — absent
- `.github/dependabot.yml` — absent  
- `package.json` postinstall/preinstall hooks — none
- `launchd` agents targeting this repo — none
- `.agents/skills/` — only `neon-postgres` skill (docs only, no scripts)
- Local crontab — no bun/npm entries

**Root cause:** Interactive `bun install` during discuss-phase and planning sessions resolves caret ranges to same-day-latest. The old bun.lock was a stale snapshot from an earlier session. The fix (exact-version pins for all Safe Chain-blocked packages) prevents future churn from caret resolution.

## Pinned Versions Summary

| Package | Was | Pinned to | Published | Reason |
|---------|-----|-----------|-----------|--------|
| next | 16.2.7 | 16.2.6 | 2026-05-07 | published today |
| react | 19.2.7 | 19.2.6 | 2026-05-06 | published today |
| react-dom | 19.2.7 | 19.2.6 | 2026-05-06 | published today |
| eslint-config-next | 16.2.7 | 16.2.6 | 2026-05-07 | published today |
| better-auth | ^1.6.13 | 1.6.12 | 2026-05-29 | 1.6.13 published today |
| vitest | ^4.1.8 | 4.1.7 | 2026-05-20 | 4.1.8 published today |
| @types/react | ^19.2.16 | 19.2.15 | 2026-05-19 | 19.2.16 published today |
| eslint | ^10.4.1 | 9.39.4 | 2026-03-06 | ESLint 10 breaks plugin-react |
| kysely (resolution) | 0.29.2 | 0.28.17 | 2026-05-03 | 0.29.x removed export used by better-auth adapter |

## Threat Surface Scan

No new network endpoints, auth paths, file access patterns, or schema changes introduced in this plan. The Redis removal reduces attack surface (eliminates the hardcoded `redis.homelab.svc.cluster.local` fallback that would have leaked internal topology). Mitigations T-30-01 and T-30-SC applied as planned.

## Self-Check: PASSED

- src/lib/auth.ts — exists, exports `auth` and `Session`, no Redis
- src/__tests__/lib/neon-connection.test.ts — exists
- package.json — exists, contains better-auth@1.6.12, no ioredis
- bun.lock — exists, regenerated
- renovate.json — exists with minimumReleaseAge
- Commits: 09ffc25 (Task 1), 622e1f8 (Task 2), 0602bfc (Task 3) — all present in git log
