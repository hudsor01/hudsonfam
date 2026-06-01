---
gsd_state_version: 1.0
milestone: v4.0
milestone_name: Cloud Re-platform & Recipes Experience
status: active
started: "2026-06-01"
last_updated: "2026-06-01T00:00:00.000Z"
last_activity: "2026-06-01 — v4.0 milestone opened. Stack locked (Vercel + Neon + Cloudflare R2 + better-auth-on-Postgres). Neon project created by owner. PROJECT.md / REQUIREMENTS.md / ROADMAP.md written; STATE.md reset. Next: /gsd:plan-phase 29."
progress:
  total_phases: 3
  completed_phases: 0
  total_plans: 8
  completed_plans: 0
  percent: 0
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

Phase: none planned yet
Plan: none
Status: milestone scaffolding written; ready to plan Phase 29.

## What's Done

- Recipes digitization (superpowers track, pre-v4.0): 1,000 recipes in `content/recipes/` — categorized, book-ordered, text-only, public.
- v4.0 planning artifacts: PROJECT.md updated, REQUIREMENTS.md (JOB-01..07, CLOUD-01..08, RECIPE-01..05), ROADMAP.md §v4.0 (phases 29-31), STATE.md reset.

## What's Next

### Immediate next step

`/gsd:plan-phase 29` — plan the job-pipeline decommission (the cleanest, lowest-risk phase; shrinks surface area before the re-platform).

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
- Park homelab-monitoring admin behind an offline-safe guard, don't delete
- TanStack Form (not react-hook-form); TanStack Table for admin tables
- All colors via globals.css @theme tokens
- Recipes: file-based MDX, text-only, public, no DB/login
- Single PR branch per milestone

## Blockers

- **bun install blocked locally (2026-06-01):** Aikido Safe Chain shim suppresses same-day-latest versions via its minimum-package-age cooldown. `package.json` is being auto-bumped to bleeding-edge (`next 16.2.7`, `react 19.2.7`, `better-auth ^1.6.13`, `vitest ^4.1.8`…), which Safe Chain hides → `bun install` errors "No version matching … (but package exists)". Captured as CLOUD-09 / Plan 30-01. Immediate unblock options: (a) pin deps back to aged-stable + regen lockfile (clean, no flag — recommended), or (b) one-time `bun install --safe-chain-skip-minimum-package-age` to regen the lockfile. Root irritant: an auto-bumper keeps re-churning package.json after pins — must be identified + stopped.
