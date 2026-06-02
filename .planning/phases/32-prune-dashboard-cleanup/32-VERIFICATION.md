---
phase: 32-prune-dashboard-cleanup
verified: 2026-06-02T21:51:34Z
status: passed
score: 8/8 must-haves verified
overrides_applied: 0
reverified: 2026-06-02T21:55:00Z
gaps_resolved:
  - truth: "npm run build and npm test pass with no prisma.blogPost / prisma.familyUpdate usage"
    resolution: "Fixed in commit 9553951 — prod-readiness.test.ts:939 assertion updated from toContain('rel=\"noopener\"') to toContain('rel=\"noopener noreferrer\"') to match the WR-03 security fix. npm test -- --run now passes 194/194 (9 files); npm run build exits 0. Gap closed."
---

# Phase 32: Blog + Family Prune & Dashboard Cleanup Verification Report

**Phase Goal:** Blog and Family Updates are gone from the entire codebase — no public routes, no Prisma models, no dashboard CRUD, no residual references — and the site builds and deploys cleanly after the removal.
**Verified:** 2026-06-02T21:51:34Z (re-verified 2026-06-02T21:55:00Z)
**Status:** passed — 8/8 (the lone gap, a stale `rel="noopener"` test assertion, was closed by commit `9553951`; `npm test` 194/194, `npm run build` exit 0)
**Re-verification:** Yes — initial run found 7/8; gap resolved and confirmed

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Old blog/family URLs 308-redirect to homepage (no live page, no broken link) | VERIFIED | `next.config.ts` has `async redirects()` with `source: "/blog"`, `source: "/blog/:slug*"`, `source: "/family"`, all `permanent: true`, `destination: "/"`. Route dirs `(public)/blog` and `(public)/family` are absent from the build output and filesystem. |
| 2 | No blog or family link on public site or command palette | VERIFIED | grep for `"/blog"\|"/family"` in `(public)/layout.tsx` → 0. grep for `/blog\|/family\|dashboard/posts\|dashboard/updates` in `command-palette.tsx` → 0. `not-found.tsx` has no `/blog` link and CTA reads "View Photos" → `/photos`. |
| 3 | Homepage renders Hero + Sidebar with zero blog dependency | VERIFIED | `(public)/page.tsx` grep for `getAllPosts\|FeaturedPost\|PostCard\|lib/blog` → 0. Queries are `prisma.event.findMany` + `prisma.album.findMany` only. |
| 4 | BlogPost + FamilyUpdate models removed via migration; Visibility intact | VERIFIED | `prisma/schema.prisma` has no `model BlogPost`, `model FamilyUpdate`, or `enum PostStatus`. `enum Visibility` is present. Migration `prisma/migrations/20260602212415_remove_blog_familyupdate/migration.sql` exists with correct `DROP TABLE "BlogPost"; DROP TABLE "FamilyUpdate"; DROP TYPE "PostStatus";`. |
| 5 | Dashboard posts and updates CRUD routes no longer exist | VERIFIED | `find src/app -type d \( -name posts -o -name updates \) -path "*/dashboard/*"` returns nothing. All 10 CRUD route files confirmed absent. |
| 6 | Post/update server actions removed; no prisma.blogPost / prisma.familyUpdate usage in src/ | VERIFIED | grep for `createPost\|deletePost\|updatePost\|createUpdate\|deleteUpdate\|quickCreateUpdate` in `dashboard-actions.ts` → 0. grep for `prisma\.blogPost\|prisma\.familyUpdate` across all `src/` → 0. QuickUpdateDialog absent from `quick-actions.tsx`. |
| 7 | Dashboard nav shows only Overview, Photos, Events (+ owner: Members, Memorial); overview has 3-stat grid + Recent Photos + Upcoming Events | VERIFIED | `(dashboard)/layout.tsx` navLinks: Overview, Photos, Events + owner push of Members, Memorial. No Posts/Updates entries. `app-sidebar.tsx` iconMap: Overview, Photos, Events, Members, Memorial — no FileText/Bell imports. `dashboard/page.tsx`: 3-stat array (Photos, Albums, Events), `@sm:grid-cols-3`, `CollapsibleCard title="Recent Photos"` with `/api/images/${photo.id}?size=thumbnail` proxy, `CollapsibleCard title="Upcoming Events"`, `QuickEventDialog` only. No blogPost/familyUpdate/QuickUpdateDialog references. |
| 8 | npm run build exits 0 AND npm test -- --run exits 0 | FAILED (partial) | `npm run build` exits 0 (no /blog or /family routes in build output, no module-not-found errors). `npm test -- --run` exits 1 — 193/194 tests pass. 1 test fails: see Gaps Summary. |

**Score:** 7/8 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `next.config.ts` | 308 redirects for /blog, /blog/:slug*, /family | VERIFIED | `async redirects()` present with all three sources, `permanent: true`, `destination: "/"` |
| `src/app/(public)/page.tsx` | De-blogged homepage (Hero + Sidebar only) | VERIFIED | No blog imports; Prisma queries for events and albums only |
| `src/app/sitemap.ts` | No /blog, /family, or getAllPosts references | VERIFIED | grep for `"/blog"\|"/family"` → 0; no `getAllPosts` import |
| `prisma/schema.prisma` | BlogPost, FamilyUpdate, PostStatus removed; Visibility intact | VERIFIED | Confirmed by grep |
| `prisma/migrations/20260602212415_remove_blog_familyupdate/` | Versioned destructive migration | VERIFIED | migration.sql exists with correct DROP statements |
| `src/lib/dashboard-actions.ts` | No post/update server actions | VERIFIED | grep for post/update action names → 0 |
| `src/app/(dashboard)/layout.tsx` | navLinks without Posts/Updates | VERIFIED | Only Overview, Photos, Events (+ owner push) |
| `src/components/dashboard/app-sidebar.tsx` | iconMap without Posts/Updates; FileText/Bell gone | VERIFIED | iconMap: Overview, Photos, Events, Members, Memorial only |
| `src/app/(dashboard)/dashboard/page.tsx` | 3-stat grid + Recent Photos + Upcoming Events; no blog refs | VERIFIED | Fully wired with real Prisma queries |
| `src/__tests__/prod-readiness.test.ts` | Test assertion matches WR-03 layout change | STUB (stale assertion) | Line 939 asserts `rel="noopener"` but layout now has `rel="noopener noreferrer"` — test fails |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `next.config.ts` | `/` | `redirects()` permanent:true (308) | VERIFIED | All three rules present with correct source patterns |
| `(public)/layout.tsx` | navLinks | Blog + Family entries removed | VERIFIED | grep returns 0 for `"/blog"\|"/family"` |
| `dashboard-actions.ts` | prisma | no blogPost/familyUpdate queries | VERIFIED | grep `prisma\.blogPost\|prisma\.familyUpdate` → 0 |
| `prisma/schema.prisma` | `generated/prisma` | prisma generate after migration | VERIFIED | Client regenerated per SUMMARY-02; PostStatus gone from src/ |
| `dashboard/page.tsx` | `/api/images` | Recent Photos thumbnail proxy | VERIFIED | `src={\`/api/images/${photo.id}?size=thumbnail\`}` wired to live `prisma.photo.findMany` query |
| `app-sidebar.tsx` | iconMap | Posts/Updates keys removed | VERIFIED | Only Overview/Photos/Events/Members/Memorial in iconMap |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|--------------------|--------|
| `dashboard/page.tsx` | `photoCount`, `albumCount`, `eventCount` | `prisma.photo.count()`, `prisma.album.count()`, `prisma.event.count()` | Yes — live DB queries | FLOWING |
| `dashboard/page.tsx` | `recentPhotos` | `prisma.photo.findMany({ orderBy: createdAt desc, take: 4 })` | Yes — live DB query | FLOWING |
| `dashboard/page.tsx` | `upcomingEvents` | `prisma.event.findMany({ where: startDate >= now, take: 5 })` | Yes — live DB query | FLOWING |
| `(public)/page.tsx` | homepage data | `prisma.event.findMany`, `prisma.album.findMany` | Yes — live DB queries; no blog deps | FLOWING |

---

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| `/blog` route absent from build | grep build output for blog routes | No `/blog` or `/family` routes in build | PASS |
| Dashboard posts/updates dirs gone | `find src/app -type d \( -name posts -o -name updates \) -path "*/dashboard/*"` | Returns nothing | PASS |
| 308 redirect rules present | grep `next.config.ts` for redirect sources | All three sources confirmed | PASS |
| `npm run build` exits 0 | `npm run build` | Exit 0 (DeprecationWarning for module.register() only — Node.js runtime warning, not a build error) | PASS |
| `npm test -- --run` exits 0 | `npm test -- --run` | **Exit 1 — 1 test fails** | FAIL |

---

### Probe Execution

Step 7c: SKIPPED — no probe scripts found under `scripts/*/tests/probe-*.sh`.

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|---------|
| PRUNE-01 | 32-01 | Blog removed end-to-end | SATISFIED | `content/blog/` gone, `lib/blog.ts` gone, `(public)/blog/` gone, `api/blog/rss` gone, `featured-post.tsx` / `post-card.tsx` gone, no blog links in public layout |
| PRUNE-02 | 32-01 | Family Updates removed end-to-end | SATISFIED | `(public)/family/` gone, `load-more-updates.tsx` gone, `update-card.tsx` gone, no "Family" link in nav/footer; grep for `familyUpdate\|FamilyUpdate\|update-card` in src/ → 0 |
| PRUNE-03 | 32-02 | BlogPost/FamilyUpdate Prisma models removed via migration | SATISFIED | Migration `20260602212415_remove_blog_familyupdate` applied; schema confirmed clean; Visibility intact |
| PRUNE-04 | 32-02 | Blog/Updates dashboard CRUD removed | SATISFIED | Dashboard posts/updates route dirs absent; createPost/updatePost/deletePost/createUpdate/deleteUpdate/quickCreateUpdate gone from dashboard-actions.ts; QuickUpdateDialog gone |
| PRUNE-05 | 32-01 | Cross-cutting refs cleaned | SATISFIED | command-palette, sitemap.ts, not-found.tsx, root layout, public layout all clean (grep → 0 for each) |
| DASH-01 | 32-03 | Dashboard nav: Posts/Updates removed | SATISFIED | navLinks has Overview/Photos/Events + owner push only; no Posts/Updates entries |
| DASH-02 | 32-03 | Dashboard overview: surviving content only | SATISFIED | 3-stat grid (Photos/Albums/Events), Recent Photos CollapsibleCard with proxy thumbnails, Upcoming Events CollapsibleCard; no blog/update refs |
| DASH-03 | 32-03 | Dashboard structure refactored; no dead components | SATISFIED | Shared primitives (CollapsibleCard, Card) reused; FileText/Bell imports gone from sidebar; no orphaned route dirs |

**Note on REQUIREMENTS.md traceability status:** REQUIREMENTS.md marks PRUNE-03 and PRUNE-04 as `[ ] Pending` and `Pending` in the traceability table. The codebase evidence confirms both are fully implemented. The REQUIREMENTS.md checkboxes appear to not have been updated after Phase 32 completion — this is a documentation inconsistency, not a code gap.

**Note on scope boundary:** QUAL-01 (`npm run build` exits 0) and QUAL-02 (`npm test` passes) are assigned to Phase 36 in REQUIREMENTS.md. The build gate (QUAL-01) is satisfied for Phase 32's scope. QUAL-02 is NOT satisfied due to the test failure documented in the gap above — this must be resolved before Phase 36 verifies it, and it is a gap introduced in Phase 32 (WR-03 commit changed layout without updating test).

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/__tests__/prod-readiness.test.ts` | 939 | Stale test assertion: `toContain('rel="noopener"')` after WR-03 changed layout to `rel="noopener noreferrer"` | BLOCKER | `npm test -- --run` exits 1; 1/194 tests fail; phase success criterion not met |

No TBD/FIXME/XXX/TODO markers found in phase-modified files. No placeholder/stub returns found in wired artifacts.

---

### Human Verification Required

#### 1. Post-deploy 308 redirect smoke test

**Test:** After Vercel deploy: `curl -I https://thehudsonfam.com/blog`, `curl -I https://thehudsonfam.com/blog/some-post`, `curl -I https://thehudsonfam.com/family`
**Expected:** Each returns HTTP 308 with `Location: /` (or `Location: https://thehudsonfam.com/`)
**Why human:** Redirect behavior is only observable against the deployed Vercel build. Local verification confirms the rule exists and routes are absent, but the actual 308 response is only confirmable post-deploy.

---

### Gaps Summary

**1 blocker gap** — test suite not green.

**Root cause:** The WR-03 post-review fix (commit 6f190c8, `fix(32): WR-03 add noreferrer to noopener on external target=_blank links`) correctly improved the layout's external link security by changing `rel="noopener"` to `rel="noopener noreferrer"`. However, `src/__tests__/prod-readiness.test.ts` line 939 was not updated to match. The assertion `expect(layout).toContain('rel="noopener"')` fails because the actual string in the layout is `rel="noopener noreferrer"` — the closing double-quote comes after `noreferrer`, so `rel="noopener"` (with closing quote) is not a substring.

**Fix required (one line):** In `src/__tests__/prod-readiness.test.ts` line 939, change:
```
expect(layout).toContain('rel="noopener"');
```
to:
```
expect(layout).toContain('rel="noopener noreferrer"');
```

After this fix, `npm test -- --run` should exit 0 and all 194 tests should pass.

---

_Verified: 2026-06-02T21:51:34Z_
_Verifier: Claude (gsd-verifier)_
