---
phase: 33-homepage-restructure
verified: 2026-06-02T18:12:00Z
status: passed
score: 6/6 must-haves verified
overrides_applied: 0
re_verification: true
human_verification_result: "All 3 human-visual items PASSED via Claude-in-Chrome browser automation (1280px dev server). Recipes above the fold ✓, visual fidelity ✓ (6 featured cards + Photos grid + Events list, Ivory & Terracotta), bad-slug graceful skip ✓. Zero console errors. See 33-HUMAN-UAT.md. Note: broken photo thumbnails are the pre-existing R2 bug scoped to Phase 34 (PHOTO-01/02), not a Phase 33 defect."
human_verification:
  - test: "Recipes section is above the fold on desktop"
    expected: "At 1280px viewport, the Browse Recipes CTA + RecipeSearch are visible without scrolling"
    why_human: "Above-the-fold is viewport-dependent — cannot verify programmatically"
  - test: "Featured cards + sections render visually per UI-SPEC"
    expected: "6 featured recipe cards show title + category in correct typography; Photos grid and Events date-badge list render with correct layout"
    why_human: "Visual layout fidelity requires visual inspection"
  - test: "Bad slug graceful skip"
    expected: "Temporarily adding a bogus slug to FEATURED_RECIPE_SLUGS produces no error and the card is silently omitted"
    why_human: "Runtime resilience check — requires code mutation and visual confirmation"
---

# Phase 33: Homepage Restructure Verification Report

**Phase Goal:** The homepage leads with Grandma Hudson's Recipes and surfaces live Photos and Events data — with no dependency whatsoever on the removed blog or updates subsystems.
**Verified:** 2026-06-02T18:12:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| #  | Truth | Status | Evidence |
|----|-------|--------|----------|
| 1  | Visitor sees Recipes entry point (Browse Recipes CTA + RecipeSearch) above Photos and Events | VERIFIED | `hero.tsx` line 28 renders `<RecipeSearch index={index} />`; page.tsx line 55 places RECIPES section before PHOTOS (line 80) and EVENTS (line 94) — strictly ascending |
| 2  | Up to 6 curated featured recipe cards render with category + title, each linking to /recipes/[slug]; unresolved slugs silently skipped | VERIFIED | `page.tsx` lines 43–45 filter with `.filter(Boolean)`; card grid renders only when `featuredRecipes.length > 0` (line 56); all 6 slugs confirmed `status: "published"` in `content/recipes/` |
| 3  | Photos section renders live photo thumbnails via PhotoGridPreview, or the "No photos yet" empty state | VERIFIED | `page.tsx` line 83: `{photos.length > 0 ? <PhotoGridPreview photos={photos} /> : <p ... >No photos yet</p>}`; Prisma query confirmed at lines 30–38 |
| 4  | Events section renders live upcoming events, or the "No upcoming events" empty state | VERIFIED | `page.tsx` line 120: `<p ... >No upcoming events</p>`; Prisma query at lines 16–29 with `visibility: "PUBLIC"` filter and `startDate: { gte: new Date() }` |
| 5  | D-06: Homepage has zero blog/updates imports and renders correctly with blog/updates absent | VERIFIED | `grep -rnE "getAllPosts\|FeaturedPost\|PostCard\|familyUpdate\|lib/blog" src/app/(public)/` — 0 matches; `sidebar.tsx` and `weather-widget.tsx` confirmed ENOENT; no remaining importers |
| 6  | npm run build exits 0 and npm test is green | VERIFIED | Build: "Compiled successfully in 3.0s", 1036/1036 pages — exit 0; Test suite: 196/196 tests pass including new FEATURED_RECIPE_SLUGS describe block |

**Score:** 6/6 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/featured-recipes.ts` | FEATURED_RECIPE_SLUGS constant (6 slugs) | VERIFIED | Exports `FEATURED_RECIPE_SLUGS: string[]` with exactly 6 slugs; family-editable comment present; no runtime logic |
| `src/components/public/hero.tsx` | Recipes-forward Hero with index prop + CTA row (Browse Recipes + RecipeSearch) | VERIFIED | Accepts `HeroProps { index: RecipeIndexEntry[] }`; no `"use client"`; "life updates" string absent; `text-sm tracking-[4px]` eyebrow; Browse Recipes Link + RecipeSearch client leaf |
| `src/app/(public)/page.tsx` | Recipes-first homepage: Hero -> Recipes -> Photos -> Events, no Sidebar | VERIFIED | 127 lines; Promise.all parallel fetch; RECIPES at line 55, PHOTOS at line 80, EVENTS at line 94; no Sidebar/WeatherWidget imports; both empty states present |
| `src/__tests__/lib/recipes.test.ts` | Wave-0 regression test (FEATURED_RECIPE_SLUGS describe block) | VERIFIED | `describe("FEATURED_RECIPE_SLUGS")` block at lines 117–135; `it.skipIf(!hasContent)` runs (content/recipes/ exists); all 15 tests pass |
| `src/components/public/sidebar.tsx` | DELETED (ENOENT) | VERIFIED | File does not exist; zero remaining importers |
| `src/components/public/weather-widget.tsx` | DELETED (ENOENT) | VERIFIED | File does not exist; zero remaining importers |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/app/(public)/page.tsx` | `getRecipeIndex` | `Promise.all` server fetch passed to Hero/RecipeSearch | WIRED | Line 39: `getRecipeIndex()` in Promise.all; result `index` passed to `<Hero index={index} />` (line 49) |
| `src/components/public/hero.tsx` | `RecipeSearch` | `index` prop passed Server→Client leaf | WIRED | Line 28: `{index.length > 0 && <RecipeSearch index={index} />}` |
| `src/app/(public)/page.tsx` | `FEATURED_RECIPE_SLUGS` | `index.find` slug lookup, zero extra I/O | WIRED | Lines 43–45: `FEATURED_RECIPE_SLUGS.map(slug => index.find(e => e.slug === slug)).filter(Boolean)` |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `page.tsx` — Events section | `events` | `prisma.event.findMany` (lines 16–29) | Yes — DB query with `visibility: "PUBLIC"`, `startDate gte now`, `take 5` | FLOWING |
| `page.tsx` — Photos section | `photos` | `prisma.photo.findMany` (lines 30–38) | Yes — DB query `orderBy createdAt desc`, `take 6` | FLOWING |
| `page.tsx` — Recipes section | `featuredRecipes` | `getRecipeIndex()` (MDX filesystem read) → in-memory `.find()` | Yes — reads published MDX frontmatter; 6 slugs confirmed published | FLOWING |
| `hero.tsx` — RecipeSearch | `index` prop | Passed from page.tsx Promise.all result | Yes — plain `{slug, title, category}` strings; fully serializable across RSC boundary | FLOWING |

---

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Build exits 0 | `npm run build` | "Compiled successfully in 3.0s", 1036/1036 pages | PASS |
| All tests green including featured-slug | `npm test -- --run` | 196/196 tests pass | PASS |
| Recipes test file — 15 tests | `npx vitest run src/__tests__/lib/recipes.test.ts` | 15/15 pass | PASS |
| Section ordering (RECIPES < PHOTOS < EVENTS) | Line number grep | RECIPES:55, PHOTOS:80, EVENTS:94 | PASS |
| No blog/updates imports in (public)/ | `grep -rnE "getAllPosts\|FeaturedPost\|PostCard\|familyUpdate\|lib/blog" src/app/(public)/` | 0 matches | PASS |
| Deleted files absent | `ls sidebar.tsx weather-widget.tsx` | ENOENT both | PASS |
| No raw Tailwind color names in modified files | grep pattern on hero.tsx and page.tsx | 0 matches | PASS |
| Hero stays Server Component | `grep '"use client"' hero.tsx` | non-zero (absent) | PASS |
| No toISOString shim | `grep "toISOString" page.tsx` | non-zero (absent) | PASS |
| "life updates" removed | `grep "life updates" hero.tsx` | non-zero (absent) | PASS |
| America/Chicago timezone applied | grep in page.tsx | 2 matches — day badge and meta line | PASS |
| SectionHeader action uses Link not `<a>` | grep section-header.tsx | `import Link from "next/link"` + Link at lines 31, 57 | PASS |

---

### Probe Execution

No probe scripts declared for this phase. VALIDATION.md identifies static grep assertions and build/test checks — all executed above.

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| HOME-01 | 33-01-PLAN.md | Homepage leads with Grandma Hudson's Recipes — prominent entry point above the fold | SATISFIED | Hero renders Browse Recipes CTA + RecipeSearch; RECIPES section precedes PHOTOS/EVENTS in source; "life updates" removed; 6 featured cards from real MDX data |
| HOME-02 | 33-01-PLAN.md | Homepage surfaces Photos and Events from live data with clean empty states | SATISFIED | Prisma queries for events (PUBLIC, upcoming) and photos (latest 6) with explicit "No photos yet" / "No upcoming events" empty states |
| HOME-03 | 33-01-PLAN.md | Homepage has zero dependency on blog/updates and renders correctly without them | SATISFIED | 0 matches for blog/updates symbols in `(public)/`; sidebar.tsx and weather-widget.tsx deleted with no remaining importers; `npm run build` exits 0 |

---

### Anti-Patterns Found

No anti-patterns found. Scanned `src/lib/featured-recipes.ts`, `src/components/public/hero.tsx`, `src/app/(public)/page.tsx`, `src/__tests__/lib/recipes.test.ts` for TBD/FIXME/XXX/TODO/HACK/PLACEHOLDER markers, empty return stubs, hardcoded empty state props, and raw Tailwind color names. All clean.

---

### Human Verification Required

#### 1. Recipes Above the Fold

**Test:** Start `npm run dev`, open localhost:3000 at 1280px viewport width.
**Expected:** The Browse Recipes CTA button and RecipeSearch trigger are visible without any scrolling.
**Why human:** Above-the-fold is viewport-dependent; cannot verify programmatically.

#### 2. Visual Layout Fidelity

**Test:** With dev server running at localhost:3000, inspect the homepage.
**Expected:** 6 featured recipe cards show category label (small uppercase) and title (serif); Photos section shows thumbnails or "No photos yet" italicized; Events section shows date badge with day number and meta line or "No upcoming events" italicized.
**Why human:** Visual layout fidelity and typographic correctness require visual inspection.

#### 3. Bad Slug Graceful Skip

**Test:** Temporarily add `"does-not-exist"` to `FEATURED_RECIPE_SLUGS` in `src/lib/featured-recipes.ts`, run the dev server, open the homepage.
**Expected:** The bogus slug card is silently omitted — no error, no crash, the other 6 cards render normally. Revert the change after confirmation.
**Why human:** Runtime resilience requires code mutation and live observation.

---

### Gaps Summary

No gaps. All 6 must-have truths verified, all artifacts substantive and wired, all key links traced, data flows from real Prisma/MDX sources. The 3 human verification items are standard visual/runtime checks that cannot be automated — they do not represent missing implementation.

---

_Verified: 2026-06-02T18:12:00Z_
_Verifier: Claude (gsd-verifier)_
