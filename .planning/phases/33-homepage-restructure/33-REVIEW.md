---
phase: 33-homepage-restructure
reviewed: 2026-06-02T00:00:00Z
depth: standard
files_reviewed: 4
files_reviewed_list:
  - src/lib/featured-recipes.ts
  - src/__tests__/lib/recipes.test.ts
  - src/components/public/hero.tsx
  - src/app/(public)/page.tsx
findings:
  critical: 0
  warning: 3
  info: 2
  total: 5
status: issues_found
---

# Phase 33: Code Review Report

**Reviewed:** 2026-06-02
**Depth:** standard
**Files Reviewed:** 4
**Status:** issues_found

## Summary

Phase 33 restructures the homepage to lead with recipes, adds a `RecipeSearch` client leaf, and introduces a `FEATURED_RECIPE_SLUGS` resolver. The Server/Client component boundary is handled correctly: `Hero` is a Server Component that passes a plain serializable `RecipeIndexEntry[]` to the `"use client"` `RecipeSearch` leaf — no event handlers or non-serializable objects cross the boundary. The `Promise.all` parallel fetch eliminates waterfall. The featured-recipe resolution correctly skips unresolved slugs via `.filter`. The Wave-0 test does make real assertions (not no-ops) against the live filesystem index. No raw Tailwind color tokens were found; all usages reference theme tokens.

Three warnings and two info items are documented below.

## Warnings

### WR-01: Recipes section has no empty-state message — inconsistent with other sections

**File:** `src/app/(public)/page.tsx:56-72`

**Issue:** When `featuredRecipes.length === 0` (all six slugs unresolved — e.g. after renaming recipe files), the recipes section silently renders only the `SectionHeader` and nothing else. Both the Photos section (line 83) and the Events section (line 116) have explicit `<p>` fallback messages. The inconsistency means a broken slug list produces a confusing empty block with a "View all recipes" link but no content and no explanation.

**Fix:**
```tsx
{featuredRecipes.length > 0 ? (
  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
    {featuredRecipes.map((recipe) => ( ... ))}
  </div>
) : (
  <p className="text-sm text-text-dim italic">No featured recipes</p>
)}
```

---

### WR-02: `SectionHeader` action links use `<a>` (full reload) instead of `<Link>` (client navigation)

**File:** `src/components/ui/section-header.tsx:33` and `:52`

**Issue:** The `action.href` links ("View all recipes", "View all photos", "View all events") are rendered as plain `<a>` elements inside `SectionHeader`. In a Next.js App Router app, bare `<a>` triggers a full-page reload and loses the prefetch/client-transition benefit of `<Link>`. This file was not changed in Phase 33 but it is called from the new homepage for all three sections — the regression is exposed by this phase.

**Fix:** In `src/components/ui/section-header.tsx`, import `Link` from `next/link` and replace `<a href={action.href}>` with `<Link href={action.href}>` in both the `title` branch and the label branch.

---

### WR-03: `getRecipeIndex` test is filesystem-coupled with no skip guard — fragile in detached CI

**File:** `src/__tests__/lib/recipes.test.ts:116-129`

**Issue:** The `FEATURED_RECIPE_SLUGS` describe block calls `getRecipeIndex()`, which performs real `fs.readdir`/`fs.readFile` calls against `content/recipes/`. If this test is ever run in a CI environment where the `content/` tree is not checked out (e.g. a shallow clone, a monorepo split, or a build that separates content from source), `readAllRecipes` silently returns `[]`, and every `expect(entry).toBeDefined()` fails with a confusing "slug X not found in published index" message rather than "content directory missing". There is no `beforeAll` check, no `.skipIf`, and no descriptive setup assertion.

**Fix:** Add a `beforeAll` guard that skips the suite when the directory is absent:
```ts
import fs from "fs";
import path from "path";

describe("FEATURED_RECIPE_SLUGS", () => {
  const RECIPES_DIR = path.join(process.cwd(), "content", "recipes");
  const hasContent = fs.existsSync(RECIPES_DIR);

  it.skipIf(!hasContent)("every curated slug resolves to a published recipe ...", async () => {
    // existing assertions
  });
});
```

## Info

### IN-01: `new Date(event.startDate)` wrapping is redundant

**File:** `src/app/(public)/page.tsx:100,106`

**Issue:** `event.startDate` is typed as `DateTime` in the Prisma schema and is returned as a JavaScript `Date` object by `@prisma/adapter-pg`. Wrapping it in `new Date(...)` a second time is a no-op. It does not cause incorrect behavior, but it implies the value might not already be a `Date`, which is misleading.

**Fix:** Use `event.startDate.toLocaleDateString(...)` directly.

---

### IN-02: `toLocaleDateString` has no `timeZone` option — date display depends on server locale

**File:** `src/app/(public)/page.tsx:100,106-109`

**Issue:** Both calls to `toLocaleDateString("en-US", ...)` omit a `timeZone` option. When Vercel runs in UTC, an event stored as `2026-07-04T00:00:00Z` displays as July 4. If the server timezone were ever different (or if event records are stored with midnight in a non-UTC local time), displayed dates could shift by one day. This is server-rendered HTML (no hydration mismatch risk), but the output is not pinned to a canonical zone.

**Fix:** Add `timeZone: "UTC"` (or the appropriate zone for the family) to both `toLocaleDateString` calls:
```ts
new Date(event.startDate).toLocaleDateString("en-US", {
  timeZone: "UTC",
  day: "numeric",
})
```

---

_Reviewed: 2026-06-02_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
