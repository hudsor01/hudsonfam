---
gsd_state_version: 1.0
milestone: v6.0
milestone_name: Photo Management Overhaul
status: planning
last_updated: "2026-06-26T23:19:19.616Z"
last_activity: 2026-06-26
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
**Current focus:** Milestone complete

## Current Position

Phase: Not started (defining requirements)
Plan: —
Status: Defining requirements
Last activity: 2026-06-26 — Milestone v6.0 started

## What's Done

- Recipes digitization (superpowers track, pre-v4.0): 1,000 recipes in `content/recipes/` — categorized, book-ordered, text-only, public.
- v4.0 planning artifacts: PROJECT.md updated, REQUIREMENTS.md (JOB-01..07, CLOUD-01..08, RECIPE-01..05), ROADMAP.md §v4.0 (phases 29-31), STATE.md reset.
- **Phase 29 Plan 01 (2026-06-01):** Deleted job admin UI dir (14 files) + job API PDF routes (2 files); removed Jobs nav from admin layout and owner dashboard layout. Build green. Commits: 9530118, 9df610c.
- **Phase 30 Plan 01 (2026-06-02):** CLOUD-02 Redis stripped from auth.ts + ioredis removed; CLOUD-01 Neon runtime verified (integration test + live seed counts); CLOUD-09 deps aged-pinned, bun.lock regenerated, renovate.json security-only. Deviations: eslint pinned to 9.x (10.x broke plugin-react), kysely resolution-pinned to 0.28.17 (0.29.x broke better-auth adapter), @prisma/adapter-pg + @prisma/client added as explicit deps. Commits: 09ffc25, 622e1f8, 0602bfc.
- **Phase 30 Plan 02 (2026-06-01):** CLOUD-03 photo pipeline to R2: processImage PutObjects 3 keys, read route GetObjects from R2, NoSuchKey->307 placeholder. CLOUD-04 homelab admin removed: /admin 404s, lib/dashboard + 7 widgets + 4 tests + api/dashboard route deleted, Admin nav link removed, SONARR/RADARR/JELLYFIN env vars purged from src. @aws-sdk/client-s3@3.1057.0 aged-pinned. Commits: d29cb04 (RED), a872fe1 (CLOUD-03), 1b7fad1 (CLOUD-04).
- **Phase 31 Plan 01 (2026-06-02):** RECIPE-01 cmdk search (RecipeSearch client component, Cmd/Ctrl+K, visible button, dual-field filter by title+category, router navigation). RECIPE-04 breadcrumbs (Recipes › Category › Recipe, shared anchor() helper) + chapter prev/next (computeChapterNeighbors, IO-free pure helper, 13 unit tests). Build 1047 pages + 245 tests green. Commits: 41c8802, 752a2cd, b3a3594.
- **Phase 31 Plan 02 (2026-06-02):** RECIPE-02 tap-to-cross-off checklist (RecipeChecklist, per-slug localStorage, SSR-safe useEffect hydration, ≥44px tap targets, reset affordance). RECIPE-03 print view (RecipePrintButton, window.print(), @media print rules in globals.css hiding chrome, clean black-on-white one-page output). Build 1047 pages + 245 tests green. Commits: 67fd27a, 3dcad07, 12f7c16.
- **Phase 31 Plan 03 (2026-06-02):** RECIPE-05 build-your-own-menu (MenuProvider React Context + localStorage hudson-menu key, AddToMenuButton toggle on listing + detail, floating MenuIndicator in layout, /my-menu server wrapper with metadata + client view grouped by category with remove/clear/print). Build 1048 pages + 245 tests green. Commits: 62881a4, 13529d9, 0ac58e5, 3c5e2f1.
- **v5.0 roadmap defined (2026-06-02):** Phases 32-36 created. 24/24 requirements mapped. Ready to plan Phase 32.
- **Phase 32 Plan 01 (2026-06-02):** PRUNE-01/02/05 blog+family public surface removed: deleted 11 files (MDX content, lib/blog.ts, RSS route, blog/family public routes+components, blog.test.ts); stripped homepage to Hero+Sidebar (D-05); cleaned nav/footer/sitemap/command-palette/not-found/root-layout; added 308 redirects for /blog, /blog/:slug*, /family → /. Build 1041 pages + 220 tests green. Commits: ae82bce, 92d669a, 77b499e.
- **Phase 32 Plan 02 (COMPLETE, 2026-06-02):** Deleted dashboard posts/ (7 files) + updates/ (3 files) CRUD routes; removed createPost/updatePost/deletePost/createUpdate/deleteUpdate/quickCreateUpdate from dashboard-actions.ts; removed QuickUpdateDialog from quick-actions.tsx; surgical test cleanup in dashboard-actions.test.ts, mocks/prisma.ts, production-bugs.test.ts; de-blogged dashboard/page.tsx data layer (3-stat grid, Recent Photos card, QuickEventDialog only). D-01 verify-then-drop: BlogPost=0, FamilyUpdate=0 — no dump needed. Migration 20260602212415_remove_blog_familyupdate applied to Neon (DROP TABLE BlogPost; DROP TABLE FamilyUpdate; DROP TYPE PostStatus). Rule 1 auto-fix: album.name → album.title in dashboard/page.tsx. Build exits 0; 194 tests green. Commits: cf8939c, f23cbd7, 51b2fbb, 975c086, 7972112, 468b7ed.
- **Phase 32 Plan 03 (COMPLETE, 2026-06-02):** DASH-01/02/03 — removed Posts/Updates from navLinks in layout.tsx and iconMap in app-sidebar.tsx (FileText+Bell imports gone); upgraded Upcoming Events empty state to heading+body spec form per UI-SPEC copywriting contract. Build exits 0; 194 tests green. Commits: b6d5dd5, 60948c7.
- **Phase 33 Plan 01 (COMPLETE, 2026-06-02):** HOME-01/02/03 — recipes-first homepage: FEATURED_RECIPE_SLUGS constant (6 slugs) + Wave-0 regression test; Hero reworked (Browse Recipes CTA + RecipeSearch + text-sm eyebrow + new subcopy); page.tsx rewritten with Promise.all fetch (Hero → Recipes featured cards → Photos → Events), Sidebar + WeatherWidget deleted. Build exits 0; 196 tests green. Commits: 7e1764e, 06cb829, 5bc7c2d.

- **Phase 34 Plan 02 (COMPLETE, 2026-06-03):** D-01 data fix — deleteMany d9c2e950 (NAS-era orphan, 0 R2 objects, idempotent); update f77dbd54 albumId=cmn8hinqw0005p1ttk12g9wa8 (Moving to Dallas, originalPath unchanged); verify-db-state.ts ALL PASS. Commits: 20cddc3.
- **Phase 34 Plan 03 (COMPLETE, 2026-06-03):** E2E verification — 199 tests green (9 files), verify-db-state ALL PASS, round-trip 37,160 bytes image/webp. Browser smoke UAT: f77dbd54 renders as real photo on homepage Photos section (broken-ALT-TEXT symptom resolved); /api/images proxy 200/image/webp/81,950 bytes; /photos album grid + /photos/moving-to-dallas album detail render correctly; empty states intact. PHOTO-04 verified. Vercel R2_ENDPOINT cleanup = owner action item (code guard is primary). Phase 34 COMPLETE — all four PHOTO reqs satisfied.

## What's Next

### Immediate next step

Phase 35 COMPLETE — run /gsd:verify-work for visual UAT (375px drawer, active route indicator, footer stacking).
Phase 36: next in roadmap.

## Deferred Items

| Category | Item | Status |
|----------|------|--------|
| future | FUTURE-01: Restore homelab Postgres → migrate data into Neon | when cluster returns |
| future | FUTURE-02: Re-enable live homelab monitoring (un-park CLOUD-04 dashboard) | when cluster returns |
| future | FUTURE-03: Remaining recipe back-matter (Menu Making, Menus section ~100, Table Service) | pairs with build-your-own-menu (shipped — preset menus future idea) |
| future | FUTURE-04: Recipe full-text search (ingredients/steps) | post-v4.0 (search is name-only) |
| data | Migrate restored seed photo `d9c2e950…` NAS → R2 if FUTURE-01 proceeds | d9c2e950 deleted (D-01); reversible via FUTURE-01 re-seed |
| seed | SEED-001/002/003/004 | dormant — homelab-dependent AI/media ideas, blocked until cluster returns |
| seed | SEED-006/007 | obsolete — tied to the deleted n8n/job pipeline |
| ops | Owner: clean up Vercel `R2_ENDPOINT` env var (drop `/hudsonfam-photos` suffix) | optional — code guard `normalizeR2Endpoint` already fixes prod on merge (Phase 34, owner-chosen) |
| tech-debt | WR-04: `extractExifDate` parses EXIF datetime as server-local then stores UTC-naive — timestamps shift by server offset | deferred from Phase 34 code review — pre-existing, orthogonal to render bug; needs its own tz-semantics decision |
| tech-debt | `src/__tests__/nav-footer.test.ts` has 6 `tsc --noEmit` TS2769 errors (React.createElement(NavLink,…) overload) | pre-existing from Phase 35; `next build` does NOT typecheck test files so no gate catches them; consider adding a `typecheck` gate + fixing in a follow-up |

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
- v5.0 surviving public IA: Home · Recipes · Photos · Events · In Memory (My Menu contextual only)
- v5.0 YAGNI: no new blog/CMS, no new social feed, no visual rebrand — remove dead surfaces, make survivors work
- D-02 redirects: /blog, /blog/:slug*, /family → / (permanent 308) in next.config.ts (not middleware, no runtime cost)
- D-05 homepage stripped to Hero + Sidebar only; Phase 33 adds recipes content
- D-03 dashboard consolidation complete: Posts/Updates nav entries removed, iconMap cleaned, Upcoming Events empty state upgraded to spec heading+body form (DASH-01/02/03 all complete)
- Phase 33: recipes-first homepage — featured recipes via FEATURED_RECIPE_SLUGS constant in src/lib/featured-recipes.ts (family-editable); resolved via in-memory getRecipeIndex() lookup (zero extra I/O); Sidebar + WeatherWidget retired; SectionHeader text-xs accepted (deferred Phase 35)
- Phase 34 Plan 01: Bug 2 fixed code-side — getR2Client strips trailing /<bucket> from R2_ENDPOINT; homepage filtered to albumId: { not: null }; Wave 0 round-trip script PASSES (37,160 bytes image/webp); auth gate unchanged
- Phase 34 Plan 02: Used prisma.photo.deleteMany for idempotent orphan delete (count:0 instead of throw on missing row); changed ONLY albumId on f77dbd54 — originalPath (R2 key) left as originals/unassigned/... per Pitfall 2
- Phase 34 Plan 03: Checkpoint B resolved as owner action item — getR2Client normalization (Plan 01) makes production correct on any deploy; Vercel R2_ENDPOINT env cleanup is defense-in-depth (owner will clean up independently)
- Phase 35 Plan 02: Desktop NavLink group wrapped in Suspense — usePathname() is dynamic data; mirrors existing MobileNav Suspense pattern; build failure on /photos/[album] auto-fixed (Rule 1)
- Phase 36 Plan 01: eslint-disable-next-line (Option A) chosen for react-hooks/incompatible-library in data-table.tsx — targeted, self-documenting, no React Compiler behavior change; prune guard uses pure Node fs and excludes __tests__/ to prevent self-invalidation

## Blockers

(none)

## Operator Next Steps

- Start the next milestone with /gsd-new-milestone
