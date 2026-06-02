# Requirements: thehudsonfam.com — v5.0 Site Consolidation & Navigation Redesign

**Defined:** 2026-06-02
**Core Value:** A single home for the Hudson family — content for everyone, and Grandma Hudson's recipes preserved and made readable for even the oldest relatives.
**Milestone principle:** YAGNI — build and keep only what we have content for *now*, not speculative future features. No new content/features unless a removal exposes a gap that forces one.

## v5.0 Requirements

Requirements for the v5.0 milestone. Each maps to exactly one roadmap phase.

### Prune — Remove Blog & Family Updates

- [x] **PRUNE-01**: Blog is removed end-to-end — `/blog` and `/blog/[slug]` return 404, MDX content (`content/blog/`), `lib/blog.ts`, `/api/blog/rss`, and blog-only components (featured-post, post-card) are deleted, and no blog link appears anywhere on the public site
- [x] **PRUNE-02**: Family Updates is removed end-to-end — `/family` returns 404, the updates feed page + `load-more-updates` + `update-card` are deleted, and no "Family"/"Updates" link appears in nav or footer
- [x] **PRUNE-03**: The `BlogPost` and `FamilyUpdate` Prisma models are removed via a migration; `npx prisma generate` succeeds and the app boots against the migrated schema
- [x] **PRUNE-04**: Blog/Updates dashboard CRUD is removed — `/dashboard/posts*` and `/dashboard/updates*` routes are deleted and gone from dashboard navigation, along with their server actions in `dashboard-actions.ts`
- [x] **PRUNE-05**: All cross-cutting references to the removed features are cleaned — `command-palette`, `sitemap.ts`, `not-found.tsx`, root layout, and public layout no longer reference blog/family, with no dead imports left behind

### Homepage — Restructure Around Real Content

- [x] **HOME-01**: The homepage leads with Grandma Hudson's Recipes — a prominent recipes entry point is above the fold (the blog featured-post is no longer the lead element)
- [x] **HOME-02**: The homepage surfaces Photos and Events from live data with clean, intentional empty states when there is nothing to show
- [x] **HOME-03**: The homepage has zero dependency on blog/updates data and renders correctly with those subsystems removed

### Photos — Fix Rendering End-to-End

- [ ] **PHOTO-01**: A photo stored in R2 renders correctly on its album page and anywhere it is surfaced — a valid image never shows the placeholder fallback
- [ ] **PHOTO-02**: The current broken seed image either renders correctly or is cleanly removed, so no broken/placeholder image is visible anywhere on the public site
- [ ] **PHOTO-03**: The photo pipeline (upload → R2 → `/api/images/[...path]` → display) is verified working end-to-end, rebuilt if debugging proves it fundamentally broken
- [ ] **PHOTO-04**: Photos empty states are intentional and unbroken for both an album with zero photos and the no-albums case

### Navbar — IA Cleanup & Mobile Polish

- [ ] **NAV-01**: The navbar surfaces only surviving sections — Home, Recipes, Photos, Events, In Memory — with no dead or redundant links
- [ ] **NAV-02**: The navbar works on mobile — the menu/drawer opens, every link is reachable, and there is no layout breakage across small-to-large widths
- [ ] **NAV-03**: Active-route indication and keyboard/focus accessibility work in both the desktop nav and the mobile menu

### Footer — Match Real IA

- [ ] **FOOT-01**: The footer links match the real IA (Recipes, Photos, Events, In Memory) and omits all removed sections
- [ ] **FOOT-02**: The footer is responsive and visually consistent with the navbar (no rebrand — consistency only)

### Dashboard — Cleanup to Match Surviving Content

- [x] **DASH-01**: Dashboard navigation lists only surviving management areas — Photos, Events, Members, Memorial — with Posts and Updates removed
- [x] **DASH-02**: The dashboard overview reflects only surviving content (no blog/updates counts, cards, or widgets)
- [x] **DASH-03**: Dashboard structure is refactored — shared primitives reused, dead components/actions removed, and no orphaned routes remain

### Quality — Everything Left Works Perfectly

- [ ] **QUAL-01**: `npm run build` succeeds with no errors and no references to removed features
- [ ] **QUAL-02**: `npm test` passes — tests for removed features are deleted, and surviving features remain covered
- [ ] **QUAL-03**: `npm run lint` passes with no warnings, and there are no dead imports, unused exports, or orphaned files left by the prune
- [ ] **QUAL-04**: Every surviving public page (Home, Recipes, recipe detail, Photos, album detail, Events, In Memory, My Menu) loads without errors and is responsive on mobile

## Future Requirements

Deferred to future milestones. Tracked but not in the v5.0 roadmap.

### Homelab Recovery (blocked until cluster returns)

- **FUTURE-01**: Restore homelab Postgres → migrate data into Neon once equipment is back online
- **FUTURE-02**: Re-enable live homelab monitoring (un-park the CLOUD-04 admin dashboard); `src/proxy.ts` CSP scaffold kept dormant for this

### Recipes Depth

- **FUTURE-03**: Remaining recipe back-matter from the physical book — Menu Making prose, the ~100-menu Menus section (pairs with build-your-own-menu), Table Service
- **FUTURE-04**: Recipe full-text search across ingredients/steps (v5.0 search remains name-only)

## Out of Scope

Explicitly excluded from v5.0 to prevent scope creep.

| Feature | Reason |
|---------|--------|
| New blog/CMS to replace the removed Blog | YAGNI — no content pipeline justifies it; recipes + photos + events are the content |
| New family-updates / social feed | YAGNI — removed for lack of content, not to be rebuilt this milestone |
| Visual rebrand of nav/footer | This milestone is IA + responsiveness only; the Ivory & Terracotta theme stays as-is |
| Recipe full-text search | Deferred to FUTURE-04 |
| New photo content / album seeding | Fix the rendering only; the family adds photos via the dashboard |
| Homelab data restoration / monitoring | Blocked until the cluster returns (FUTURE-01/02) |

## Traceability

Which phases cover which requirements. Populated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| PRUNE-01 | Phase 32 | Complete |
| PRUNE-02 | Phase 32 | Complete |
| PRUNE-03 | Phase 32 | Complete |
| PRUNE-04 | Phase 32 | Complete |
| PRUNE-05 | Phase 32 | Complete |
| DASH-01 | Phase 32 | Complete |
| DASH-02 | Phase 32 | Complete |
| DASH-03 | Phase 32 | Complete |
| HOME-01 | Phase 33 | Complete |
| HOME-02 | Phase 33 | Complete |
| HOME-03 | Phase 33 | Complete |
| PHOTO-01 | Phase 34 | Pending |
| PHOTO-02 | Phase 34 | Pending |
| PHOTO-03 | Phase 34 | Pending |
| PHOTO-04 | Phase 34 | Pending |
| NAV-01 | Phase 35 | Pending |
| NAV-02 | Phase 35 | Pending |
| NAV-03 | Phase 35 | Pending |
| FOOT-01 | Phase 35 | Pending |
| FOOT-02 | Phase 35 | Pending |
| QUAL-01 | Phase 36 | Pending |
| QUAL-02 | Phase 36 | Pending |
| QUAL-03 | Phase 36 | Pending |
| QUAL-04 | Phase 36 | Pending |

**Coverage:**
- v5.0 requirements: 24 total
- Mapped to phases: 24 ✓
- Unmapped: 0 ✓

---
*Requirements defined: 2026-06-02*
*Last updated: 2026-06-02 — traceability filled after roadmap creation (phases 32-36)*
