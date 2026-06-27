# Roadmap

## v1.0 — Core Site (Complete)

- Plan 1: Project scaffolding + auth ✅
- Plan 2: Public site (design system, homepage, blog) ✅
- Plan 3: Photos, events, family updates ✅
- Plan 4: Admin panel (CRUD, member management) ✅
- Plan 5: Homelab dashboard (Glance replacement) ✅
- Plan 6: K8s deployment + migration ✅
- Bug fixes + audit ✅
- Tests (274 passing) ✅
- Memorial page (Richard Hudson Sr.) ✅
- Quick wins (RSS, iCal, sitemap, SEO, favicon, 404, loading states) ✅

## v1.1 — UI Enhancement (Complete)

- Phase 1: Foundation (theme tokens, OKLCH, shadcn bridge) ✅
- Phase 2: Core shadcn components (sonner, avatar, alert-dialog, sheet, tooltip, skeleton, select, switch) ✅
- Phase 3: Dashboard overhaul (breadcrumbs, tabs, dropdown menus) ✅
- Phase 4: Public site polish (animations, separators, scroll area) ✅
- Phase 5: Advanced (command palette, photo effects) ✅

## v1.2 — Integration Solidification (Complete)

- Phase 6: Theme alignment — fix CSS variable naming to shadcn standard, hardcoded colors, cn() patterns ✅
- Phase 7: Tailwind v4 quick wins — text-balance, text-pretty, field-sizing, accent-color, caret-color, open/not-* variants ✅
- Phase 8: Tailwind v4 advanced — container queries, shadow colors, scroll snap, 3D effects, accessibility variants, logical properties ✅
- Phase 9: shadcn sidebar upgrade — replace static aside with full SidebarProvider, collapsible, mobile-responsive ✅
- Phase 10: TanStack Form — install @tanstack/react-form + zod, migrate all forms to client-side validation ✅
- Phase 10.5: TanStack Table — install @tanstack/react-table, replace manual admin list rendering with data tables ✅
- Phase 10.7: TanStack Query evaluation — deferred (server-first architecture, no clear benefit) ✅
- Phase 11: Component integration — wire Calendar, Dialog, Drawer, Pagination, Popover, Progress into actual pages ✅
- Phase 12: Ecosystem tooling — shadcn skills, radix migration, blocks evaluation, additional components ✅

## v1.3 — Services, Infra & Job Search (Complete)

- Family services page (/dashboard/services) with live health status ✅
- Google OAuth redirect fix (callbackURL) ✅
- Photo auto-compression (2400px WebP q85) ✅
- Production fixes: "use client" directives, NAS write permissions ✅
- Flux image automation: timestamp tags replacing alphabetical SHA ✅
- Redis auth: REDIS_URL with password for K8s ✅
- Prisma connection pooling + Redis error handling ✅
- Job Search Dashboard (/admin/jobs) — table + kanban views ✅
- .env.example updated with all required vars ✅

## v1.4 — Admin Dashboard Production Readiness (Complete)

- 3 phases (13-15), 15/15 requirements, completed 2026-04-08 — [archive](milestones/v1.4-ROADMAP.md)

## v2.0 — Code Quality Enhancement (✅ Shipped 2026-04-08)

4 phases (16-19), 4 plans, 22 REQs. Systematically audited + fixed React/Next.js code smells: zero unnecessary useEffects, clean component architecture, no SSR/client mismatches, full loading.tsx + error.tsx coverage, 268+ tests pass.

→ Full archive: [milestones/v2.0-ROADMAP.md](milestones/v2.0-ROADMAP.md) · requirements: [v2.0-REQUIREMENTS.md](milestones/v2.0-REQUIREMENTS.md)

<details>
<summary>Phase one-liners (collapsed)</summary>

- Phase 16 (useEffect Audit): zero unnecessary useEffects — 1 plan, 8 REQs (EFFECT-01..08), 2026-04-08
- Phase 17 (Component Structure & State Patterns): no nested components, immutable updates, optimal "use client" — 1 plan, 7 REQs (COMP-01/02 + BOUNDARY-01..05), 2026-04-08
- Phase 18 (Server/Client Boundaries & Hydration): zero hydration mismatches; loading.tsx + error.tsx for every route group — 1 plan, 4 REQs (HYDRATION-01/02 + RESILIENCE-01/02), 2026-04-08
- Phase 19 (Verification & Production Deploy): clean build, 268+ tests pass, prod deploy without regressions — 1 plan, 3 REQs (VERIFY-01/02/03), 2026-04-08

</details>

## v3.0 — AI Integration (✅ Shipped 2026-04-23 code-complete · production-verified 2026-04-25 via v3.5-P4 retroactive UAT)

5 phases (20-24), ~14 plans, 24 REQs. Closed the rendering gap between the n8n Job Search pipeline's LLM output and `/admin/jobs`. HMAC + idempotency safety scaffolding shipped (n8n-side verify deferred to SEED-006).

→ Full archive: [milestones/v3.0-ROADMAP.md](milestones/v3.0-ROADMAP.md) · requirements: [v3.0-REQUIREMENTS.md](milestones/v3.0-REQUIREMENTS.md)

<details>
<summary>Phase one-liners (collapsed)</summary>

- Phase 20 (Foundation): isStale util, Zod safeParse at jobs-db boundary, CSP on /admin/*, tailored resume rendered, schema-drift CI guardrail — 2026-04-21
- Phase 21 (Polish): Copy-to-clipboard with sonner toast, PDF download, empty-state copy, external-link icon, quality-score badge — 2026-04-22 (prod UAT 2026-04-25 = 5/5 PASS via CICD-12)
- Phase 22 (Salary Intelligence): SalaryIntelligenceSection with null-branch defensive render + provenance tags + LEFT JOIN LATERAL skeleton — 2026-04-22
- Phase 23 (Owner-Triggered Workflows): sendSignedWebhook primitive (HMAC + X-Idempotency-Key) + 4-sentinel error union + Research/Regenerate buttons — 2026-04-23
- Phase 24 (Regenerate Expansion): Generalized RegenerateButton + Resume/Salary Server Actions + silent-success warning state (4th variant) — 2026-04-23

</details>

## v3.5 — CI/CD Hardening (✅ Shipped 2026-04-25)

4 phases (25-28), 5 plans, 13/13 CICD REQs satisfied. Tag `v3.5-complete` (`f02440c`). 6-moving-part Forgejo+Woodpecker pipeline → 2-moving-part GitHub Actions + GHCR (per CLAUDE.md original intent). v3.0 prod-UAT debt cleared via Phase 28 retroactive UAT.

→ Full archive: [milestones/v3.5-ROADMAP.md](milestones/v3.5-ROADMAP.md) · summary: [v3.5-MILESTONE-SUMMARY.md](milestones/v3.5-cicd-hardening/v3.5-MILESTONE-SUMMARY.md) · audit: [v3.5-MILESTONE-AUDIT.md](milestones/v3.5-MILESTONE-AUDIT.md)

<details>
<summary>Phase one-liners (collapsed)</summary>

- Phase 25 (v3.5-P1 Pipeline Build): `.github/workflows/build-and-push.yml` shipped + first GHCR build green; warm-cache 2-6 min vs 10-min budget — 1 plan, 3 REQs, 2026-04-23
- Phase 26 (v3.5-P2 Flux Reconfig): Pod live on `ghcr.io/hudsor01/hudsonfam:20260424023904`; first templated ExternalSecret in homelab — 2 plans, 3 REQs, 2026-04-24
- Phase 27 (v3.5-P3 Decommission): 6 destructive ops across 4 systems retired the Forgejo+Woodpecker rollback safety net; pod stayed `ready=true restarts=0` — 1 plan, 3 REQs, 2026-04-25
- Phase 28 (v3.5-P4 Smoke + Retroactive UAT): 11m13s end-to-end smoke; CLAUDE.md §Deployment rewrite; Plan 21-08 + Phase 22/23/24 retroactive UAT closed v3.0 prod-UAT debt — 1 plan, 4 REQs, 2026-04-25

</details>

## v4.0 — Cloud Re-platform & Recipes Experience (✅ Shipped 2026-06-02)

3 phases (29-31), 8 plans, 21/21 REQs. Took thehudsonfam.com off the flooded K3s homelab onto managed cloud (Vercel + Neon + Cloudflare R2, no self-hosted dependency), deleted the job-search subsystem and homelab-monitoring admin entirely, and shipped the recipes UX layer (search, checkboxes, print, breadcrumbs+prev/next, build-your-own-menu) over the 1,000-recipe collection. Milestone audit PASSED. Tag `v4.0`.

→ Full archive: [milestones/v4.0-ROADMAP.md](milestones/v4.0-ROADMAP.md) · requirements: [v4.0-REQUIREMENTS.md](milestones/v4.0-REQUIREMENTS.md) · audit: [v4.0-MILESTONE-AUDIT.md](milestones/v4.0-MILESTONE-AUDIT.md)

<details>
<summary>Phase one-liners (collapsed)</summary>

- Phase 29 (Decommission Job Pipeline): job admin UI + API + lib + tests + schema-drift tooling + env deleted; build + suite green — 2 plans, 7 REQs (JOB-01..07), 2026-06-01
- Phase 30 (Cloud Re-platform): Prisma→Neon, Redis dropped, images→Cloudflare R2, homelab admin removed (`/admin` 404s), deps aged-pinned, K8s/Flux/Docker deleted, Vercel deploy + Cloudflare DNS cut over valid HTTPS — 3 plans, 9 REQs (CLOUD-01..09), 2026-06-02
- Phase 31 (Recipes Experience): cmdk search + breadcrumbs/prev-next, localStorage checkboxes, print/kitchen view, build-your-own-menu (`/my-menu`) — 3 plans, 5 REQs (RECIPE-01..05), 2026-06-02
- Post-100% enhancements: global light/dark theme (Ivory & Terracotta default / navy dark, next-themes), full-recipe menu printout, photo-thumbnail proxy fix

</details>

---

## v5.0 — Site Consolidation & Navigation Redesign (✅ Shipped 2026-06-03)

5 phases (32-36), 11 plans, 24/24 REQs. Consolidated the site to its real surface — removed Blog + Family Updates end-to-end (routes, content, Prisma models, dashboard CRUD, 308 redirects), made the homepage recipes-first, fixed the broken R2 photo pipeline (two root-cause bugs), rebuilt the navbar/footer to the surviving IA with active-route + a11y, and closed a clean quality gate. Shipped + verified live on thehudsonfam.com. Tag `v5.0`.

→ Full archive: [milestones/v5.0-ROADMAP.md](milestones/v5.0-ROADMAP.md) · requirements: [v5.0-REQUIREMENTS.md](milestones/v5.0-REQUIREMENTS.md)

<details>
<summary>Phase one-liners (collapsed)</summary>

- Phase 32 (Prune & Dashboard Cleanup): Blog + Family Updates removed end-to-end (public routes, MDX content, BlogPost/FamilyUpdate Prisma models, dashboard CRUD, 308 redirects); dashboard consolidated to surviving areas — 3 plans, 8 REQs (PRUNE-01..05, DASH-01..03), 2026-06-02
- Phase 33 (Homepage Restructure): recipes-first homepage — Hero (Browse Recipes CTA + RecipeSearch), 6 featured cards, live Photos + Events sections, Sidebar + WeatherWidget retired — 1 plan, 3 REQs (HOME-01..03), 2026-06-02
- Phase 34 (Photo Pipeline Fix): two root-cause bugs fixed — album-less auth-gate (D-01 data fix: delete orphan, assign album) + R2_ENDPOINT bucket-suffix normalization in getR2Client; photos render end-to-end, verified live in prod (200/image/webp) — 3 plans, 4 REQs (PHOTO-01..04), 2026-06-03
- Phase 35 (Navbar & Footer IA): navbar = Home·Recipes·Photos·Events·In Memory with active-route (nav-link.tsx + usePathname + aria-current, shared isNavActive helper) + mobile drawer; footer matches IA — 2 plans, 5 REQs (NAV-01..03, FOOT-01..02), 2026-06-03
- Phase 36 (Quality Gate): build/test/lint clean (lint 0, 233 tests, build 1036 pages), permanent v5.0 prune-guard regression test, 8-page console sweep (0 errors) + 375px human-UAT — 2 plans, 4 REQs (QUAL-01..04), 2026-06-03

</details>

---

## v6.0 — Photo Management Overhaul (🚧 In Progress)

**Milestone Goal:** Give the owner real control over the photo experience — a curated homepage grid, collection-based organization, and a friction-free dashboard — without re-uploading anything.

**Phases:** 37-40 (4 phases)
**Requirements:** 12 (FEAT-01..04, COLL-01..03, PHOTOS-01..03, VIS-01..02)
**Branch:** `milestone/v6.0-photos`

## Phases

- [x] **Phase 37: Data Model & Actions Foundation** — Single-collection enforcement, All-Photos query, `featured` surface collection model, visibility defaults applied (completed 2026-06-27)
- [x] **Phase 38: Public Surfaces** — Homepage 3×3 featured grid, /photos = collection cards + All Photos section, filenames suppressed everywhere public (completed 2026-06-27)
- [x] **Phase 39: Dashboard Management** — Featured manager (live preview + add-from-library + drag, max 9), per-collection manage page (add + reorder), publish toggle removed (completed 2026-06-27)
- [ ] **Phase 40: Data Setup & Quality Gate** — Delete "Moving to Dallas" / keep photos, seed 3 starter collections + featured surface collection, verify live, lint/test/build green

## Phase Details

### Phase 37: Data Model & Actions Foundation
**Goal**: The data layer enforces collection exclusivity and exposes the queries public and dashboard surfaces need — a photo can belong to at most one collection, "All Photos" returns uncollected photos, and a `featured` surface collection exists to drive the homepage grid
**Depends on**: Nothing (first phase of v6.0; builds on v5.0 baseline)
**Requirements**: COLL-01, FEAT-04, VIS-01, VIS-02
**Success Criteria** (what must be TRUE):
  1. Assigning a photo to a collection via any server action removes it from any previous collection in the same operation (no photo appears in two collections)
  2. The "All Photos" query returns exactly the photos with no `collectionId` — adding a photo to a collection removes it from this set, removing it from a collection returns it here
  3. A `featured` surface collection (kind=surface, name=featured) row exists in the database and its `CollectionPhoto` join rows drive the homepage grid (same pattern as `memorial`)
  4. All existing photos have `published=true` in the database; newly uploaded photos default to `published=true`; no owner action is required to publish
**Plans**: 2 plans
- [x] 37-01-PLAN.md — Album exclusivity (COLL-01) + max-9 featured guard (FEAT-04) in addPhotoToCollection + tests
- [x] 37-02-PLAN.md — getUncollectedPhotos() All-Photos helper + upload default published:true (VIS-01/VIS-02) + tests

### Phase 38: Public Surfaces
**Goal**: Visitors see a curated 3×3 featured grid on the homepage and a reorganized /photos page — collection cards on top, uncollected photos below — with no filenames rendered anywhere
**Depends on**: Phase 37
**Requirements**: FEAT-01, PHOTOS-01, PHOTOS-02, PHOTOS-03
**Success Criteria** (what must be TRUE):
  1. The homepage shows up to 9 featured photos in a grid; if fewer than 9 are in the featured set, only those tiles render (no empty placeholders)
  2. Visiting /photos shows every collection as a card at the top of the page
  3. Below the collection cards, /photos shows an "All Photos" section containing every photo that is in no collection
  4. No photo filename, file path, or title text is visible anywhere on the public site — not on the homepage grid, not on /photos, not inside the lightbox
**Plans**: 2 plans
- [x] 38-01-PLAN.md — getFeaturedPhotos() query + unit tests; homepage 3×3 featured grid (no placeholder tiles, graceful empty) [FEAT-01]
- [x] 38-02-PLAN.md — /photos All Photos via getUncollectedPhotos() + keep collection cards; strip title/caption overlays from album grid & lightbox; prod-readiness assertions [PHOTOS-01/02/03]
**UI hint**: yes

### Phase 39: Dashboard Management
**Goal**: The owner can curate the featured homepage grid (live preview, add from library, drag to reorder, max 9) and manage each collection's photos (add from library, reorder) — all from the dashboard — with the publish toggle gone
**Depends on**: Phase 37
**Requirements**: FEAT-02, FEAT-03, COLL-02
**Success Criteria** (what must be TRUE):
  1. The owner opens the featured manager and sees a live preview that mirrors how the homepage grid will appear, including the current order of featured photos
  2. The owner can add any photo from the full library to the featured set and drag to reorder; the set enforces a maximum of 9 with no duplicates
  3. The owner can open a per-collection manage page, add photos from the library (which removes them from any other collection), and drag to reorder photos within the collection
  4. No publish toggle, publish button, or publish-related UI element appears anywhere in the dashboard photo or upload flows
**Plans**: 3 plans
- [x] 39-01-PLAN.md — Featured manager (/dashboard/photos/featured): live 3×3 preview + SortablePhotoGrid reorder + add-from-library, max-9 surfaced, graceful when featured collection absent; generalize PhotoLibraryPicker [FEAT-02, FEAT-03]
- [x] 39-02-PLAN.md — Per-collection manage page: add-from-library (getUncollectedPhotos → addPhotoToCollection album-exclusive) alongside existing reorder grid [COLL-02]
- [x] 39-03-PLAN.md — Remove publish toggle (photo-actions Switch + upload checkbox → always published:true), quiet status label instead of filename + Featured link on photos page, source-level regression tests [crit-4 / VIS-02 UI]
**UI hint**: yes

### Phase 40: Data Setup & Quality Gate
**Goal**: Live data matches the intended state — "Moving to Dallas" collection removed (photos preserved), three starter collections exist, the featured surface collection is seeded — and the build is clean
**Depends on**: Phase 38, Phase 39
**Requirements**: COLL-03
**Success Criteria** (what must be TRUE):
  1. The "Moving to Dallas" collection no longer exists; photos that were in it appear in the "All Photos" section on /photos (no photos deleted)
  2. Three collections exist in the live database: "Extending 1407 Judy Driveway", "Richard Jr's 38th Birthday Dinner", "Dad's Trips to Japan"
  3. The featured surface collection exists and the homepage featured grid renders correctly on thehudsonfam.com
  4. `npm run lint`, `npm test`, and `npm run build` all exit 0 with no new errors or warnings
**Plans**: TBD

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 37. Data Model & Actions Foundation | 2/2 | Complete    | 2026-06-27 |
| 38. Public Surfaces | 2/2 | Complete    | 2026-06-27 |
| 39. Dashboard Management | 3/3 | Complete    | 2026-06-27 |
| 40. Data Setup & Quality Gate | 0/TBD | Not started | - |
