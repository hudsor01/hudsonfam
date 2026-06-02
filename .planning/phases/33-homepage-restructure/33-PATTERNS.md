# Phase 33: Homepage Restructure - Pattern Map

**Mapped:** 2026-06-02
**Files analyzed:** 5 (2 modified, 1 new constant file, 2 deletions)
**Analogs found:** 5 / 5

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/app/(public)/page.tsx` | page (Server Component) | request-response + CRUD | `src/app/(public)/recipes/page.tsx` | exact (Server Component, async data, RecipeSearch pattern) |
| `src/components/public/hero.tsx` | component | request-response | `src/app/(public)/recipes/page.tsx` header block (Link + RecipeSearch composition) | role-match |
| `src/lib/featured-recipes.ts` | utility / constant | transform | `src/lib/recipes.ts` (exports consumed by Server Components) | role-match |
| `src/components/public/sidebar.tsx` | — | — | **DELETE** (homepage-only; patterns lifted inline) | — |
| `src/components/public/weather-widget.tsx` | — | — | **DELETE** (only imported by sidebar.tsx) | — |

---

## Pattern Assignments

### `src/app/(public)/page.tsx` (page, request-response + CRUD)

**Analog:** `src/app/(public)/recipes/page.tsx`

**Imports pattern** (recipes/page.tsx lines 1–13 + current page.tsx lines 1–5):
```typescript
// From recipes/page.tsx — the full recipe + Server Component import pattern
import { getRecipeIndex, anchor, type RecipeMeta } from "@/lib/recipes";
import Link from "next/link";
import { RecipeSearch } from "@/components/public/recipe-search";

// From current page.tsx — Prisma + connection() pattern
import prisma from "@/lib/prisma";
import { connection } from "next/server";
import { Separator } from "@/components/ui/separator";

// New for Phase 33
import { Hero } from "@/components/public/hero";
import { SectionHeader } from "@/components/ui/section-header";
import { PhotoGridPreview } from "@/components/public/photo-grid-preview";
import { FEATURED_RECIPE_SLUGS } from "@/lib/featured-recipes";
import type { RecipeIndexEntry } from "@/lib/recipes";
```

**Connection + parallel data fetch pattern** (current page.tsx lines 7–35, recipes/page.tsx lines 21–25):
```typescript
export default async function HomePage() {
  await connection();

  // Parallel fetch — eliminates waterfall
  const [events, photos, index] = await Promise.all([
    prisma.event.findMany({
      where: {
        visibility: "PUBLIC",
        startDate: { gte: new Date() },
      },
      orderBy: { startDate: "asc" },
      take: 5,
      select: { id: true, title: true, startDate: true, location: true },
    }),
    prisma.photo.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      select: { id: true, thumbnailPath: true, title: true },
    }),
    getRecipeIndex(),
  ]);

  // Featured recipe resolution — zero extra I/O (index already in memory)
  const featuredRecipes = FEATURED_RECIPE_SLUGS
    .map((slug) => index.find((e) => e.slug === slug))
    .filter((e): e is RecipeIndexEntry => e !== undefined);
```

**NOTE:** Remove the `sidebarEvents` and `sidebarPhotos` shim `.map()` calls (current page.tsx lines 37–48) — they only existed to satisfy the Sidebar interface. Inline sections use `events` and `photos` directly.

**RecipeSearch Server→Client prop pass pattern** (recipes/page.tsx lines 46–50):
```typescript
// The EXACT pattern to replicate — Hero receives index, passes to RecipeSearch
{index.length > 0 && (
  <div className="mt-4">
    <RecipeSearch index={index} />
  </div>
)}
```
On the homepage this becomes `<Hero index={index} />` where Hero passes it through.

**Section container pattern** (adapted from recipes/page.tsx line 36):
```typescript
// Recipe section container — matches UI-SPEC §Page Structure Contract
<section className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
  <SectionHeader label="RECIPES" action={{ text: "View all recipes", href: "/recipes" }} />
  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
    {featuredRecipes.map((recipe) => (
      <Link key={recipe.slug} href={`/recipes/${recipe.slug}`}>
        <div className="bg-card border border-border rounded-xl p-4 hover:border-accent/40 hover:shadow-card transition-all group">
          <p className="text-sm text-accent font-sans font-semibold tracking-[2px] uppercase mb-1.5">
            {recipe.category}
          </p>
          <h3 className="text-lg font-serif text-foreground leading-snug text-balance group-hover:text-primary transition-colors">
            {recipe.title}
          </h3>
        </div>
      </Link>
    ))}
  </div>
</section>
```

**Photos section pattern** (lifted from sidebar.tsx lines 61–68):
```typescript
<section className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
  <SectionHeader label="PHOTOS" action={{ text: "View all photos", href: "/photos" }} />
  <div className="bg-card border border-border rounded-xl p-5">
    {photos.length > 0 ? (
      <PhotoGridPreview photos={photos} />
    ) : (
      <p className="text-sm text-text-dim italic">No photos yet</p>
    )}
  </div>
</section>
```

**Events section pattern** (lifted from sidebar.tsx lines 27–57):
```typescript
<section className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
  <SectionHeader label="EVENTS" action={{ text: "View all events", href: "/events" }} />
  <div className="bg-card border border-border rounded-xl p-5">
    {events.length > 0 ? (
      <ul className="space-y-3">
        {events.map((event) => (
          <li key={event.id} className="flex gap-3">
            <div className="flex-shrink-0 size-10 rounded-lg bg-accent/15 flex items-center justify-center">
              <span className="text-accent text-sm font-bold font-sans">
                {new Date(event.startDate).toLocaleDateString("en-US", { day: "numeric" })}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-sm text-foreground font-medium truncate">{event.title}</p>
              <p className="text-sm text-text-dim">
                {new Date(event.startDate).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
                {event.location && ` • ${event.location}`}
              </p>
            </div>
          </li>
        ))}
      </ul>
    ) : (
      <p className="text-sm text-text-dim italic">No upcoming events</p>
    )}
  </div>
</section>
```

**Key diff from sidebar.tsx:** Use `event.startDate` (Date) directly instead of `event.date` (string). No string→Date conversion needed — Prisma returns the Date object.

**Full return structure skeleton:**
```typescript
  return (
    <div>
      <Hero index={index} />
      <Separator />
      {/* Recipes section — see above */}
      <Separator />
      {/* Photos section — see above */}
      <Separator />
      {/* Events section — see above */}
    </div>
  );
}
```

---

### `src/components/public/hero.tsx` (component, request-response)

**Analog:** `src/components/public/hero.tsx` (current file — rework in place)

**Current structure** (hero.tsx lines 1–15) — keep all classes except two changes:
1. `text-xs tracking-[4px]` → `text-sm tracking-[4px]` on the eyebrow `<p>` (line 4)
2. Replace subcopy text (line 10)
3. Add `index: RecipeIndexEntry[]` prop + CTA row

**Imports to add:**
```typescript
import Link from "next/link";
import { RecipeSearch } from "@/components/public/recipe-search";
import type { RecipeIndexEntry } from "@/lib/recipes";
```

**New prop signature:**
```typescript
interface HeroProps {
  index: RecipeIndexEntry[];
}

export function Hero({ index }: HeroProps) {
```

**Eyebrow fix** (current line 4 — change `text-xs` to `text-sm`):
```typescript
// BEFORE
<p className="text-xs tracking-[4px] text-accent mb-3 font-sans uppercase">

// AFTER
<p className="text-sm tracking-[4px] text-accent mb-3 font-sans uppercase">
```

**Subcopy replacement** (current line 10):
```typescript
// BEFORE
<p className="text-muted-foreground italic text-base sm:text-lg max-w-xl mx-auto text-pretty">
  Stories, photos, and life updates from our corner of the world
</p>

// AFTER (add mb-8 per UI-SPEC)
<p className="text-muted-foreground italic text-base max-w-xl mx-auto text-pretty mb-8">
  Grandma Hudson&rsquo;s recipes, family photos, and moments that matter &mdash; all in one place.
</p>
```

**CTA row to add** (after the subcopy `<p>`, inside the `<section>`):
```typescript
<div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-2">
  <Link
    href="/recipes"
    className="bg-primary text-primary-foreground px-6 py-2.5 rounded-lg text-sm font-sans font-semibold hover:bg-primary/90 transition-colors min-h-11 inline-flex items-center"
  >
    Browse Recipes
  </Link>
  {index.length > 0 && <RecipeSearch index={index} />}
</div>
```

**Primary button styling source:** `bg-primary text-primary-foreground` — consistent with the button pattern used throughout the dashboard (see `src/components/ui/button.tsx` default variant). `min-h-11` matches the RecipeSearch trigger's existing `min-h-11` class (recipe-search.tsx line 47).

**RecipeSearch trigger existing classes** (recipe-search.tsx line 47 — do NOT modify):
```typescript
className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors min-h-11 w-full sm:w-auto sm:max-w-xs"
```

---

### `src/lib/featured-recipes.ts` (utility/constant, transform)

**Analog:** Pattern from `src/lib/recipes.ts` — a lib module that exports constants/functions consumed by Server Components.

**Full file content to write:**
```typescript
/**
 * Curated featured recipe slugs shown on the homepage.
 * Edit this list to change which recipes are featured.
 * All slugs must match files in content/recipes/ with status: "published".
 */
export const FEATURED_RECIPE_SLUGS: string[] = [
  "adas-famous-gingerbread",
  "almond-cookies",
  "coleslaw",
  "shepherds-pie",
  "jelly-roll",
  "baking-powder-biscuits",
];
```

**Why a separate file:** Discoverability — the family can find and update the featured list without navigating into a Server Component page file. Matches the `src/lib/` convention for project-level constants.

**Import in page.tsx:**
```typescript
import { FEATURED_RECIPE_SLUGS } from "@/lib/featured-recipes";
```

---

## Shared Patterns

### SectionHeader label mode
**Source:** `src/components/ui/section-header.tsx` lines 45–65
**Apply to:** All three sections in page.tsx (RECIPES, PHOTOS, EVENTS)

```typescript
// label mode: pass label + action; no title prop
<SectionHeader
  label="RECIPES"
  action={{ text: "View all recipes", href: "/recipes" }}
/>
// Renders: text-xs font-sans font-semibold tracking-[3px] text-primary uppercase
// NOTE: component uses text-xs; UI-SPEC asks for text-sm — accept text-xs for Phase 33
```

### Empty state
**Source:** `src/components/public/sidebar.tsx` lines 56 and 66
**Apply to:** Photos section and Events section

```typescript
<p className="text-sm text-text-dim italic">No upcoming events</p>
<p className="text-sm text-text-dim italic">No photos yet</p>
```

### Section card container
**Source:** `src/components/public/sidebar.tsx` lines 27 and 61
**Apply to:** Photos section and Events section content wrapper

```typescript
<div className="bg-card border border-border rounded-xl p-5">
  {/* section content or empty state */}
</div>
```

### Prisma query pattern (Server Component)
**Source:** `src/app/(public)/page.tsx` lines 7–35
**Apply to:** page.tsx rewrite — keep queries unchanged, switch to Promise.all

```typescript
// Keep these queries verbatim; just wrap in Promise.all
const [events, photos, index] = await Promise.all([
  prisma.event.findMany({
    where: { visibility: "PUBLIC", startDate: { gte: new Date() } },
    orderBy: { startDate: "asc" },
    take: 5,
    select: { id: true, title: true, startDate: true, location: true },
  }),
  prisma.photo.findMany({
    orderBy: { createdAt: "desc" },
    take: 6,
    select: { id: true, thumbnailPath: true, title: true },
  }),
  getRecipeIndex(),
]);
```

### Category badge / accent token pattern
**Source:** `src/app/(public)/recipes/page.tsx` lines 62–73 (category pill nav)
**Apply to:** Featured recipe card category label

```typescript
// Existing category pill pattern (recipes/page.tsx line 64-71):
className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-sm text-foreground hover:border-primary/40 hover:text-primary transition-colors"

// Featured card badge (simpler, no hover):
className="text-sm text-accent font-sans font-semibold tracking-[2px] uppercase mb-1.5"
```

### Recipe link hover pattern
**Source:** `src/app/(public)/recipes/page.tsx` line 93
**Apply to:** Featured recipe card title hover

```typescript
// Existing recipe link hover:
className="text-foreground hover:text-primary transition-colors"

// Featured card title (group-hover variant for card-level hover):
className="text-lg font-serif text-foreground leading-snug text-balance group-hover:text-primary transition-colors"
```

---

## Deletions

Files to delete — no analog needed, no other importers:

| File | Role | Reason |
|------|------|--------|
| `src/components/public/sidebar.tsx` | component | Homepage-only (confirmed by grep — single importer: page.tsx). Events/photos JSX lifted inline into page.tsx. |
| `src/components/public/weather-widget.tsx` | component | Only imported by sidebar.tsx. No replacement in Phase 33 scope. Verified: no other importers. |

**Pre-deletion check (already verified in RESEARCH.md Critical Finding 3):**
- `grep -r "Sidebar" src/` → only `page.tsx` imports it
- `grep -r "WeatherWidget" src/` → only `sidebar.tsx` imports it

---

## Metadata

**Analog search scope:** `src/app/(public)/`, `src/components/public/`, `src/components/ui/`, `src/lib/`
**Files read:** 8 source files
**Pattern extraction date:** 2026-06-02
