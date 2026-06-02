---
phase: 32-prune-dashboard-cleanup
fixed_at: 2026-06-02T16:46:00Z
review_path: .planning/phases/32-prune-dashboard-cleanup/32-REVIEW.md
iteration: 1
findings_in_scope: 9
fixed: 9
skipped: 0
status: all_fixed
---

# Phase 32: Code Review Fix Report

**Fixed at:** 2026-06-02T16:46:00Z
**Source review:** .planning/phases/32-prune-dashboard-cleanup/32-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 9
- Fixed: 9
- Skipped: 0

## Fixed Issues

### CR-01: `deletePhoto` orphans R2 objects — storage leak on every delete

**Files modified:** `src/lib/dashboard-actions.ts`
**Commit:** 47a9e8b
**Applied fix:** Added `prisma.photo.findUnique` to read `originalPath`/`thumbnailPath` before deleting the DB row. After deletion, calls the existing `deleteImageFiles(id, originalPath)` from `src/lib/images.ts` which removes all three R2 objects (`originals/{albumId}/{id}.webp`, `derived/{id}-thumbnail.webp`, `derived/{id}-medium.webp`). Guard on `photo?.originalPath` handles null/missing keys gracefully; `deleteImageFiles` already swallows `NoSuchKey` errors.

### CR-02: `DialogFooter` rendered in Drawer branch — submit button broken on mobile

**Files modified:** `src/app/(dashboard)/dashboard/quick-actions.tsx`
**Commit:** 79221a4
**Applied fix:** Removed `DialogFooter` import and replaced the `<DialogFooter>` wrapper around the submit button with `<div className="flex justify-end pt-2">`. This plain flex container renders correctly in both `DialogContent` (desktop) and the `<div className="px-4">` content area of `DrawerContent` (mobile), eliminating the mismatched layout context.

### WR-01: Dead `Services: AppWindow` entry in sidebar `iconMap`

**Files modified:** `src/components/dashboard/app-sidebar.tsx`
**Commit:** 09b8093
**Applied fix:** Removed `AppWindow` from the lucide-react import and removed the `Services: AppWindow` entry from `iconMap`. Combined with WR-02 in the same commit.

### WR-02: "Settings" popover link navigates to `/dashboard` (wrong destination)

**Files modified:** `src/components/dashboard/app-sidebar.tsx`
**Commit:** 09b8093
**Applied fix:** Removed the Settings `<Link>` (pointing to `/dashboard`) and its `Settings` icon import entirely. No `/dashboard/settings` route exists; the link was misleading. The popover now shows only the Home and Sign Out actions.

### WR-03: `rel="noopener"` missing `noreferrer` on external links

**Files modified:** `src/app/(public)/layout.tsx`, `src/app/not-found.tsx`
**Commit:** 6f190c8
**Applied fix:** Updated `rel="noopener"` to `rel="noopener noreferrer"` on both footer anchor tags linking to `hudsondigitalsolutions.com`, preventing referrer header leakage from the private family site to a third-party domain.

### WR-04: `proxy.ts` comment references "blog MDX" — stale after blog removal

**Files modified:** `src/proxy.ts`
**Commit:** 84dc2c9
**Applied fix:** Updated two comment sites: (1) the JSDoc `Scope:` paragraph now reads "photo OG tags, memorial, and other public pages" instead of "blog MDX, photo OG tags, memorial media embeds"; (2) the `config.matcher` comment now reads "photo OG tags, memorial, and public pages use inline styles / external images" instead of "blog MDX and other public surfaces may rely on inline patterns".

### IN-01: Root metadata description refers to "Stories" — vestigial blog copy

**Files modified:** `src/app/layout.tsx`
**Commit:** 8483691
**Applied fix:** Replaced `"Stories, photos, and life updates from our corner of the world"` with `"Photos, events, and memories from our corner of the world"` in all three metadata locations: `description`, `openGraph.description`, and `twitter.description`.

### IN-02: `prod-readiness.test.ts` file header claims to cover "GFM tables" — no such test

**Files modified:** `src/__tests__/prod-readiness.test.ts`
**Commit:** 3122bd7
**Applied fix:** Removed "GFM tables" from the JSDoc bullet: `- Bug fix verification (photo URLs, GFM tables, event relative time)` became `- Bug fix verification (photo URLs, event relative time)`.

### IN-03: MSW imports in `production-bugs.test.ts` are unused (suppressed with `void`)

**Files modified:** `src/__tests__/production-bugs.test.ts`
**Commit:** ef60f78
**Applied fix:** Removed `import { server } from './mocks/server'`, `import { http, HttpResponse } from 'msw'`, and the three `void server; void http; void HttpResponse;` suppression lines at EOF. All 194 tests continue to pass.

---

**Verification:** `npm run build` exits 0 (1036 routes generated, TypeScript clean). `npm test -- --run` passes 194/194 tests across 9 test files.

_Fixed: 2026-06-02T16:46:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
