---
phase: 32-prune-dashboard-cleanup
plan: "01"
subsystem: public-surface
tags: [prune, blog, family, redirects, cleanup]
dependency_graph:
  requires: []
  provides: [PRUNE-01, PRUNE-02, PRUNE-05, D-02, D-04, D-05, D-06]
  affects: [homepage, public-layout, sitemap, command-palette, not-found, root-layout]
tech_stack:
  added: []
  patterns: [next.config.ts redirects(), surgical file deletion, test surgery]
key_files:
  created: []
  modified:
    - next.config.ts
    - src/app/(public)/page.tsx
    - src/app/(public)/layout.tsx
    - src/app/layout.tsx
    - src/app/not-found.tsx
    - src/app/sitemap.ts
    - src/components/command-palette.tsx
    - src/__tests__/prod-readiness.test.ts
  deleted:
    - content/blog/ (3 MDX files)
    - src/lib/blog.ts
    - src/app/api/blog/rss/route.ts
    - src/app/(public)/blog/page.tsx
    - src/app/(public)/blog/[slug]/page.tsx
    - src/app/(public)/family/page.tsx
    - src/app/(public)/family/load-more-updates.tsx
    - src/components/public/featured-post.tsx
    - src/components/public/post-card.tsx
    - src/components/public/update-card.tsx
    - src/__tests__/lib/blog.test.ts
decisions:
  - D-02 redirects implemented in next.config.ts (not middleware) — runs at infra layer, zero runtime cost
  - D-05 homepage stripped to Hero + Sidebar only; Phase 33 adds recipes content
  - D-06 prod-readiness.test.ts surgically pruned to remove all blog/RSS test blocks
metrics:
  duration: "~15 minutes"
  completed: "2026-06-02"
  tasks_completed: 3
  tasks_total: 3
  files_changed: 19
---

# Phase 32 Plan 01: Blog + Family Public Surface Removal Summary

Deleted blog and family public surfaces end-to-end (MDX content, lib, RSS route, public routes, public components), stripped the homepage's blog dependency, cleaned every cross-cutting reference in nav/footer/sitemap/command-palette/not-found/root-layout, and added 308 permanent redirects for the now-dead URLs. Build (1041 static pages) and tests (220 passing, 9 files) are green at the plan boundary.

## Tasks Completed

| # | Task | Commit | Result |
|---|------|--------|--------|
| 1 | Delete blog + family public files and components | ae82bce | 9 files deleted |
| 2 | Strip homepage blog dependency + clean cross-cutting refs | 92d669a | 6 files edited |
| 3 | Add 308 redirects; fix test references; build + tests green | 77b499e | 4 files removed + 2 edited |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Blog and family route files still tracked in git**
- **Found during:** Task 3 (build failure)
- **Issue:** The initial filesystem check using zsh glob patterns `src/app/(public)/blog/` showed "MISSING" because zsh expands unquoted parentheses as glob patterns — the directories existed but zsh failed to match them. Task 1 only deleted the listed files that were directly passed to `git rm`; the public route files `blog/page.tsx`, `blog/[slug]/page.tsx`, `family/page.tsx`, `family/load-more-updates.tsx` were in separate directories and were tracked in git but not included in Task 1's `git rm` list.
- **Fix:** `git rm` the 4 remaining route files, removed empty directories
- **Files modified:** `src/app/(public)/blog/page.tsx`, `src/app/(public)/blog/[slug]/page.tsx`, `src/app/(public)/family/page.tsx`, `src/app/(public)/family/load-more-updates.tsx`
- **Commit:** 77b499e

**2. [Rule 3 - Blocking] prod-readiness.test.ts imports @/lib/blog (breaks test suite)**
- **Found during:** Task 3 (npm test failure after build passed)
- **Issue:** `prod-readiness.test.ts` had `import { getAllPosts, getPostBySlug } from '@/lib/blog'` at line 72 plus 4 test blocks using deleted files/functions (RSS block, blog page test, sitemap blog test, Blog Content Handling block, path traversal blog tests).
- **Fix:** Per RESEARCH.md §Files to EDIT → prod-readiness.test.ts, surgically removed the import + all 8 affected test blocks
- **Files modified:** `src/__tests__/prod-readiness.test.ts`
- **Commit:** 77b499e

## Verification Results

All assertions from the plan's `<verify>` sections passed:

```
PASS: content/blog GONE
PASS: lib/blog.ts GONE
PASS: (public)/blog dir GONE
PASS: (public)/family dir GONE
PASS: rss/route.ts GONE
PASS: featured-post.tsx GONE
PASS: post-card.tsx GONE
PASS: update-card.tsx GONE
PASS: blog.test.ts GONE
PASS: homepage clean (0 blog refs)
PASS: public layout clean (0 blog/family refs)
PASS: root layout clean (no rss ref)
PASS: sitemap clean (0 blog/family refs)
PASS: command-palette clean (0 blog/family/posts/updates refs)
PASS: redirects() present in next.config.ts
PASS: /blog/:slug* rule present
PASS: /family rule present
```

Build: `npm run build` exits 0 (1041 static pages)
Tests: `npm test -- --run` exits 0 (220 tests, 9 files)

## Known Stubs

None — no placeholder or stub patterns introduced. Homepage renders Hero + Sidebar with real data from Prisma (events, photos queries intact).

## Threat Flags

None — the deleted RSS route (`T-32-02`) is mitigated as documented in the plan's threat model. No new network endpoints, auth paths, or file access patterns introduced.

## Self-Check: PASSED

All 3 commits confirmed present:
- ae82bce (Task 1)
- 92d669a (Task 2)
- 77b499e (Task 3)

All deleted files confirmed absent. All static grep checks return 0.
