---
phase: 33-homepage-restructure
fixed_at: 2026-06-02T18:09:00Z
review_path: .planning/phases/33-homepage-restructure/33-REVIEW.md
iteration: 1
findings_in_scope: 5
fixed: 5
skipped: 0
status: all_fixed
---

# Phase 33: Code Review Fix Report

**Fixed at:** 2026-06-02
**Source review:** .planning/phases/33-homepage-restructure/33-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 5
- Fixed: 5
- Skipped: 0

## Fixed Issues

### WR-01: Recipes section has no empty-state message

**Files modified:** `src/app/(public)/page.tsx`
**Commit:** 7da4df9
**Applied fix:** Converted `{featuredRecipes.length > 0 && (...)}` to a ternary with an else branch that renders `<p className="text-sm text-text-dim italic">No featured recipes</p>`, consistent with the Photos and Events sections.

---

### IN-01: `new Date(event.startDate)` wrapping is redundant

**Files modified:** `src/app/(public)/page.tsx`
**Commit:** 7da4df9
**Applied fix:** Removed both `new Date(...)` wrappers — both `toLocaleDateString` calls now invoke directly on `event.startDate` (already a `Date` from Prisma). Committed together with IN-02 since both changes were on the same two lines.

---

### IN-02: `toLocaleDateString` has no `timeZone` option

**Files modified:** `src/app/(public)/page.tsx`
**Commit:** 7da4df9
**Applied fix:** Added `timeZone: "America/Chicago"` to both `toLocaleDateString("en-US", ...)` calls (day-only badge and month+day text), matching the project convention from `events/columns.tsx`. Note: fix guidance suggested UTC but per the project's documented Key Decision and the precedent in `columns.tsx`, `America/Chicago` was applied instead.

---

### WR-02: `SectionHeader` action links use `<a>` instead of `<Link>`

**Files modified:** `src/components/ui/section-header.tsx`
**Commit:** e6a7c31
**Applied fix:** Added `import Link from "next/link"` and replaced both bare `<a href={action.href}>` elements (title-variant branch and label-variant branch) with `<Link href={action.href}>`. All classNames preserved unchanged.

---

### WR-03: `getRecipeIndex` test is filesystem-coupled with no skip guard

**Files modified:** `src/__tests__/lib/recipes.test.ts`
**Commit:** 2154006
**Applied fix:** Added `import fs from "fs"` and `import path from "path"` at top of file. In the `FEATURED_RECIPE_SLUGS` describe block, computed `RECIPES_DIR` and `hasContent = fs.existsSync(RECIPES_DIR)` at describe-level. Changed the slug-resolution `it(...)` to `it.skipIf(!hasContent)(...)` so it skips cleanly when `content/recipes/` is absent. The `has between 1 and 6 slugs` test (pure array check, no filesystem) is left as a normal `it`.

---

_Fixed: 2026-06-02_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
