---
gsd_state_version: 1.0
milestone: v4.0
milestone_name: Cloud Re-platform & Recipes Experience
status: verifying
last_updated: "2026-06-02T03:42:15.576Z"
progress:
  total_phases: 3
  completed_phases: 1
  total_plans: 5
  completed_plans: 4
  percent: 33
---

# State

## Current Position

**Milestone v4.0 — Cloud Re-platform & Recipes Experience — ACTIVE (opened 2026-06-01).**

The K3s homelab is offline indefinitely (flood; equipment in storage). All data is **safe but disconnected** — recoverable later, not lost. v4.0 moves the app onto managed cloud with no self-hosted dependency, deletes the now-irrelevant job-search subsystem, and ships the recipes UI/UX layer over the finished 1,000-recipe collection.

**Locked stack (all free tier):**

| Concern | Provider |
|---------|----------|
| Host | Vercel |
| Postgres | Neon (project created by owner 2026-06-01) |
| Images | Cloudflare R2 |
| Sessions | better-auth on Postgres (Redis dropped) |
| DNS | Cloudflare → Vercel |

Phase: 30 — Cloud Re-platform
Plan: 30-02 COMPLETE; 30-03 is next
Status: Phase 30 Plan 02 executed 2026-06-01. R2 photo pipeline wired (CLOUD-03): processImage PutObjects 3 keys, /api/images route GetObjects from R2, NoSuchKey → 307 placeholder fallback, @aws-sdk/client-s3@3.1057.0 added. Homelab admin removed (CLOUD-04): /admin 404s, lib/dashboard/ + 7 widgets + 4 tests deleted, Admin nav link removed, SONARR/RADARR/JELLYFIN unreferenced. Build + 238 tests + lint all green. Live R2 upload deferred to owner via Task 4 checkpoint.

## What's Done

- Recipes digitization (superpowers track, pre-v4.0): 1,000 recipes in `content/recipes/` — categorized, book-ordered, text-only, public.
- v4.0 planning artifacts: PROJECT.md updated, REQUIREMENTS.md (JOB-01..07, CLOUD-01..08, RECIPE-01..05), ROADMAP.md §v4.0 (phases 29-31), STATE.md reset.
- **Phase 29 Plan 01 (2026-06-01):** Deleted job admin UI dir (14 files) + job API PDF routes (2 files); removed Jobs nav from admin layout and owner dashboard layout. Build green. Commits: 9530118, 9df610c.
- **Phase 30 Plan 01 (2026-06-02):** CLOUD-02 Redis stripped from auth.ts + ioredis removed; CLOUD-01 Neon runtime verified (integration test + live seed counts); CLOUD-09 deps aged-pinned, bun.lock regenerated, renovate.json security-only. Deviations: eslint pinned to 9.x (10.x broke plugin-react), kysely resolution-pinned to 0.28.17 (0.29.x broke better-auth adapter), @prisma/adapter-pg + @prisma/client added as explicit deps. Commits: 09ffc25, 622e1f8, 0602bfc.
- **Phase 30 Plan 02 (2026-06-01):** CLOUD-03 photo pipeline to R2: processImage PutObjects 3 keys, read route GetObjects from R2, NoSuchKey->307 placeholder. CLOUD-04 homelab admin removed: /admin 404s, lib/dashboard + 7 widgets + 4 tests + api/dashboard route deleted, Admin nav link removed, SONARR/RADARR/JELLYFIN env vars purged from src. @aws-sdk/client-s3@3.1057.0 aged-pinned. Commits: d29cb04 (RED), a872fe1 (CLOUD-03), 1b7fad1 (CLOUD-04).

## What's Next

### Immediate next step

Plan 30-03 — Vercel deploy + DNS cut-over (CLOUD-06/07/08); K8s/Docker/Flux artifacts removal (CLOUD-05); `output: standalone` removal from next.config.ts.

### Sequenced phase order

1. **Phase 29 — Decommission Job Pipeline** (JOB-01..07) — delete job UI/API/lib/tests/tooling/env; build + suite green after.
2. **Phase 30 — Cloud Re-platform** (CLOUD-01..08) — Prisma→Neon, drop Redis, images→R2, park homelab admin, fix lockfile, remove K8s/Flux/Docker, Vercel deploy, DNS cut.
3. **Phase 31 — Recipes Experience** (RECIPE-01..05) — search, checkboxes, print view, breadcrumbs+prev/next, build-your-own-menu.

## Job-decommission surface (Phase 29 reference)

Mapped 2026-06-01 — verify no non-job consumer before each deletion:

- **UI:** `src/app/(admin)/admin/jobs/` (15 files) + admin nav "Jobs" entry
- **API:** `src/app/api/jobs/` (PDF cover-letter + tailored-resume routes)
- **Lib:** `jobs-db.ts`, `job-actions.ts`, `job-constants.ts`, `job-freshness.ts`, `jobs-schemas.ts`, `webhooks.ts`, `regenerate-predicates.ts`, `attach-freshness.ts`
- **Tests:** ~13 files under `src/__tests__/` (job-actions, webhooks, jobs-db-*, regenerate-*, trigger-company-research, empty-states, tailored-resume, is-company-research-empty)
- **Tooling:** `scripts/check-jobs-schema.ts`, `test:schema` npm script, pre-push hook, `scripts/install-hooks.sh`
- **Env:** `JOBS_DATABASE_URL`, `N8N_WEBHOOK_SECRET`
- **Deps to evaluate:** `@hello-pangea/dnd` (kanban — confirm no other consumer)

## Deferred Items

| Category | Item | Status |
|----------|------|--------|
| future | Restore homelab Postgres → migrate data into Neon | when cluster returns |
| future | Re-enable live homelab monitoring (un-park CLOUD-04 dashboard) | when cluster returns |
| future | Remaining recipe back-matter (Menu Making, Menus section ~100, Table Service) | pairs with RECIPE-05 |
| future | Recipe full-text search (ingredients/steps) | post-v4.0 |
| seed | SEED-001/002/003/004 | dormant — homelab-dependent AI/media ideas, blocked until cluster returns |
| seed | SEED-006/007 | obsolete — tied to the n8n/job pipeline being deleted |

## Key Decisions

- Host Vercel; DB Neon; images Cloudflare R2 — all free tier (2026-06-01)
- Drop Redis; better-auth sessions on Postgres
- Delete job pipeline outright (not migrate)
- Delete homelab-monitoring admin entirely (CLOUD-04 decision confirmed) — /admin 404s, FUTURE-02 tracks re-enable when cluster returns
- TanStack Form (not react-hook-form); TanStack Table for admin tables
- All colors via globals.css @theme tokens
- Recipes: file-based MDX, text-only, public, no DB/login
- Single PR branch per milestone
- Pin eslint to 9.39.4 (10.x incompatible with eslint-plugin-react 7.x; wait for plugin update)
- Pin kysely via resolutions to 0.28.17 (better-auth 1.6.x adapter requires 0.28.x export layout)
- Dep churn source: interactive bun install resolving carets; fix = exact-version pins for Safe Chain gate packages

## Blockers

(none)
