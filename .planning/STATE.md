---
gsd_state_version: 1.0
milestone: v5.0
milestone_name: Site Consolidation & Navigation Redesign
status: planning
last_updated: "2026-06-02T19:39:50.541Z"
last_activity: 2026-06-02
progress:
  total_phases: 0
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
  percent: 0
---

# State

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-06-02)

**Core value:** A single home for the Hudson family — content for everyone, and Grandma Hudson's recipes preserved and made readable for even the oldest relatives.
**Current focus:** v5.0 Site Consolidation & Navigation Redesign — prune Blog + Family Updates, restructure homepage around recipes/photos/events, fix photo rendering, rebuild navbar + footer IA, dashboard cleanup. YAGNI: build for what we have content for now.

## Current Position

Phase: Not started (defining requirements)
Plan: —
Status: Defining requirements
Last activity: 2026-06-02 — Milestone v5.0 started

## What's Done

- Recipes digitization (superpowers track, pre-v4.0): 1,000 recipes in `content/recipes/` — categorized, book-ordered, text-only, public.
- v4.0 planning artifacts: PROJECT.md updated, REQUIREMENTS.md (JOB-01..07, CLOUD-01..08, RECIPE-01..05), ROADMAP.md §v4.0 (phases 29-31), STATE.md reset.
- **Phase 29 Plan 01 (2026-06-01):** Deleted job admin UI dir (14 files) + job API PDF routes (2 files); removed Jobs nav from admin layout and owner dashboard layout. Build green. Commits: 9530118, 9df610c.
- **Phase 30 Plan 01 (2026-06-02):** CLOUD-02 Redis stripped from auth.ts + ioredis removed; CLOUD-01 Neon runtime verified (integration test + live seed counts); CLOUD-09 deps aged-pinned, bun.lock regenerated, renovate.json security-only. Deviations: eslint pinned to 9.x (10.x broke plugin-react), kysely resolution-pinned to 0.28.17 (0.29.x broke better-auth adapter), @prisma/adapter-pg + @prisma/client added as explicit deps. Commits: 09ffc25, 622e1f8, 0602bfc.
- **Phase 30 Plan 02 (2026-06-01):** CLOUD-03 photo pipeline to R2: processImage PutObjects 3 keys, read route GetObjects from R2, NoSuchKey->307 placeholder. CLOUD-04 homelab admin removed: /admin 404s, lib/dashboard + 7 widgets + 4 tests + api/dashboard route deleted, Admin nav link removed, SONARR/RADARR/JELLYFIN env vars purged from src. @aws-sdk/client-s3@3.1057.0 aged-pinned. Commits: d29cb04 (RED), a872fe1 (CLOUD-03), 1b7fad1 (CLOUD-04).
- **Phase 31 Plan 01 (2026-06-02):** RECIPE-01 cmdk search (RecipeSearch client component, Cmd/Ctrl+K, visible button, dual-field filter by title+category, router navigation). RECIPE-04 breadcrumbs (Recipes › Category › Recipe, shared anchor() helper) + chapter prev/next (computeChapterNeighbors, IO-free pure helper, 13 unit tests). Build 1047 pages + 245 tests green. Commits: 41c8802, 752a2cd, b3a3594.
- **Phase 31 Plan 02 (2026-06-02):** RECIPE-02 tap-to-cross-off checklist (RecipeChecklist, per-slug localStorage, SSR-safe useEffect hydration, ≥44px tap targets, reset affordance). RECIPE-03 print view (RecipePrintButton, window.print(), @media print rules in globals.css hiding chrome, clean black-on-white one-page output). Build 1047 pages + 245 tests green. Commits: 67fd27a, 3dcad07, 12f7c16.
- **Phase 31 Plan 03 (2026-06-02):** RECIPE-05 build-your-own-menu (MenuProvider React Context + localStorage hudson-menu key, AddToMenuButton toggle on listing + detail, floating MenuIndicator in layout, /my-menu server wrapper with metadata + client view grouped by category with remove/clear/print). Build 1048 pages + 245 tests green. Commits: 62881a4, 13529d9, 0ac58e5, 3c5e2f1.

## What's Next

### Immediate next step

v5.0 Site Consolidation & Navigation Redesign started 2026-06-02. Requirements + roadmap being defined (phase numbering continues from 31 → 32+). After roadmap approval: `/gsd:plan-phase 32`.

## Deferred Items

| Category | Item | Status |
|----------|------|--------|
| future | FUTURE-01: Restore homelab Postgres → migrate data into Neon | when cluster returns |
| future | FUTURE-02: Re-enable live homelab monitoring (un-park CLOUD-04 dashboard) | when cluster returns |
| future | FUTURE-03: Remaining recipe back-matter (Menu Making, Menus section ~100, Table Service) | pairs with build-your-own-menu (shipped — preset menus future idea) |
| future | FUTURE-04: Recipe full-text search (ingredients/steps) | post-v4.0 (search is name-only) |
| data | Migrate restored seed photo `d9c2e950…` NAS → R2 (renders placeholder) | pairs with FUTURE-01 |
| seed | SEED-001/002/003/004 | dormant — homelab-dependent AI/media ideas, blocked until cluster returns |
| seed | SEED-006/007 | obsolete — tied to the deleted n8n/job pipeline |

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
