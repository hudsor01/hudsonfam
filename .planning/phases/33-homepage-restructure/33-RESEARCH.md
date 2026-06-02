# Phase 33: Homepage Restructure - Research

**Researched:** 2026-06-02
**Domain:** Next.js App Router Server/Client boundary, file-based MDX recipes, Prisma queries, component composition
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Hero CTA ("Browse Recipes" → /recipes) + cmdk RecipeSearch trigger above the fold, then a featured-recipes card row.
- **D-02:** Featured recipes = a curated hardcoded slug constant (~4-6), resolved via getRecipeBySlug/getRecipeIndex; skip unresolved slugs gracefully.
- **D-03:** Single-column stacked full-width sections: Hero → Recipes → Photos → Events; retire the orphaned Sidebar rail.
- **D-04:** Recipes-forward Hero copy (UI-SPEC has exact subcopy).
- **D-05:** Live Photos (/api/images proxy + PhotoGridPreview) + Events from Prisma, with existing empty states.
- **D-06:** Zero blog dependency; build green.

### Claude's Discretion
- The default featured-recipe slugs, exact Hero/section copy, and whether to refactor the Sidebar sub-renders into new section components vs inline — within the locked structure above. UI-SPEC locks the visuals.

### Deferred Ideas (OUT OF SCOPE)
- None (Visual polish → ui-phase 33; photo rendering fix → Phase 34; nav/footer → Phase 35)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| HOME-01 | Homepage leads with Grandma Hudson's Recipes — prominent recipes entry point above the fold | D-01/D-02: RecipeSearch + featured card row; getRecipeIndex() call in Server Component; RecipeSearch receives index as prop (confirmed pattern) |
| HOME-02 | Homepage surfaces Photos and Events from live data with clean empty states | D-05: existing Prisma queries confirmed in page.tsx; existing empty state copy confirmed in sidebar.tsx |
| HOME-03 | Homepage has zero dependency on blog/updates data; renders correctly with those subsystems removed | D-06: confirmed — page.tsx has no blog imports post-Phase-32; no getAllPosts/FeaturedPost references in (public)/ |
</phase_requirements>

---

## Summary

Phase 33 is a single-file restructure of `src/app/(public)/page.tsx` with coordinated edits to `src/components/public/hero.tsx`, retirement of `src/components/public/sidebar.tsx` (homepage-only usage confirmed), and a new `FEATURED_RECIPE_SLUGS` constant. All the data sources, components, and patterns already exist — this phase wires them together differently.

The critical implementation fact is that `RecipeSearch` is a `"use client"` component that receives the full recipe index as a prop (`RecipeSearch({ index: RecipeIndexEntry[] })`). The Server Component parent calls `getRecipeIndex()` and passes the result down. This is the exact same pattern used on `/recipes/page.tsx` today — the homepage simply adds a second call site. No context, no separate fetch, no hydration risk.

`src/components/public/sidebar.tsx` is used only by `page.tsx` (confirmed by grep). It imports `WeatherWidget` (a Server Component) and renders events + photos inline. The cleanest retirement path is to inline the events and photos section JSX directly into `page.tsx`, discarding the `Sidebar` component and the `WeatherWidget` import entirely, which removes the weather-related dead code with no other side effects.

**Primary recommendation:** Rewrite `page.tsx` inline (no new component files needed beyond the `FEATURED_RECIPE_SLUGS` constant location). Call `getRecipeIndex()` and two existing Prisma queries in the Server Component. Pass `index` to `RecipeSearch`. Render 4 sections with `Separator` dividers. Retire `Sidebar`.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Hero copy + CTA button | Frontend Server (RSC) | — | Static markup, no interactivity needed |
| RecipeSearch dialog trigger | Browser / Client | Frontend Server (RSC passes data) | `"use client"` — uses useState, router, KeyboardEvent |
| Featured recipe resolution | Frontend Server (RSC) | — | Async fs.readFile in getRecipeBySlug; safe in Server Component |
| Photos Prisma query | Frontend Server (RSC) | — | DB access stays server-side |
| Events Prisma query | Frontend Server (RSC) | — | DB access stays server-side |
| PhotoGridPreview rendering | Frontend Server (RSC) | — | Pure Server Component (no hooks; next/image + Link) |
| Events list rendering | Frontend Server (RSC) | — | Pure JSX from props; no interactivity |
| Empty state copy | Frontend Server (RSC) | — | Static conditional render |

---

## Critical Finding 1: Server/Client Boundary for RecipeSearch

**Verified by:** Direct code inspection of `src/components/public/recipe-search.tsx` and `src/app/(public)/recipes/page.tsx`.

`RecipeSearch` is a `"use client"` component with this prop interface:
```typescript
interface RecipeSearchProps {
  index: RecipeIndexEntry[];
}
```

It does NOT fetch data internally. It receives the index as a prop from its Server Component parent.

The `/recipes` page calls:
```typescript
const index = await getRecipeIndex();
// ...
<RecipeSearch index={index} />
```

**The correct pattern for the homepage** is identical:
```typescript
// In page.tsx (Server Component)
const index = await getRecipeIndex();
// ...
<RecipeSearch index={index} />
```

`getRecipeIndex()` calls `getPublishedRecipes()` which reads all MDX files and returns `{ slug, title, category }[]`. This is safe to call in a Server Component — it is pure Node.js `fs.readFile`, no side effects.

**Pitfall avoided:** Do NOT attempt to import `RecipeSearch` and call `getRecipeIndex()` inside the client component itself — that would require `"use server"` interop or a separate API route, neither of which is needed here.

**Hydration note:** `RecipeIndexEntry[]` serializes cleanly (plain objects with string fields). No Date objects, no class instances, no hydration mismatch risk.

---

## Critical Finding 2: Featured Recipe Resolution

**Verified by:** Code inspection of `getRecipeBySlug` in `src/lib/recipes.ts`.

`getRecipeBySlug(slug)` returns `Recipe | null`. It reads one MDX file with `fs.readFile`. Safe to call N times in a Server Component. `Promise.all` is appropriate for parallel resolution of 4-6 slugs.

**Cheaper path available:** `getRecipeIndex()` is already being called for RecipeSearch. The index is a flat array of `{ slug, title, category }`. Featured recipe data (title + category) can be extracted from the index by slug lookup — **no separate `getRecipeBySlug` calls needed**.

```typescript
// In page.tsx, after const index = await getRecipeIndex()
const featuredRecipes = FEATURED_RECIPE_SLUGS
  .map(slug => index.find(e => e.slug === slug))
  .filter((e): e is RecipeIndexEntry => e !== undefined);
```

This resolves featured recipes with zero additional I/O. The index is already in memory. `getRecipeBySlug` is the full MDX parse (content + frontmatter) — overkill for a card that only needs title + category.

**If `getRecipeBySlug` is used instead** (e.g., for future extensibility): `Promise.all(FEATURED_RECIPE_SLUGS.map(s => getRecipeBySlug(s)))` is safe but unnecessary for this use case.

**Verified default slug set** (all confirmed `status: "published"` in `content/recipes/`):

| Slug | Title | Category |
|------|-------|----------|
| `adas-famous-gingerbread` | Ada's Famous Gingerbread | Cake |
| `almond-cookies` | Almond Cookies | Cookies |
| `coleslaw` | Coleslaw | Salad |
| `shepherds-pie` | Shepherd's Pie | Meat |
| `jelly-roll` | Jelly Roll | Cake |
| `baking-powder-biscuits` | Baking Powder Biscuits | Bread |

Good spread across 5 categories. Two Cake entries is intentional (Ada's gingerbread is a named recipe with family significance). All 6 exist as files and are published.

---

## Critical Finding 3: Sidebar Retirement

**Verified by:** grep across all `src/**/*.tsx` and `src/**/*.ts`.

`src/components/public/sidebar.tsx` is imported in exactly **one place**: `src/app/(public)/page.tsx`. No other file uses it.

It currently renders:
1. Events section (with "No upcoming events" empty state) — inline JSX, reusable
2. Photos section (with "No photos yet" empty state) — delegates to `PhotoGridPreview`
3. Weather section — delegates to `WeatherWidget`

`WeatherWidget` (`src/components/public/weather-widget.tsx`) is imported only by `sidebar.tsx`. Retiring `sidebar.tsx` removes `WeatherWidget` from the render tree with no other side effects.

**Cleanest retirement path:** Delete the `<Sidebar>` call and `import { Sidebar }` line from `page.tsx`. Inline the events and photos section JSX directly in `page.tsx` using the patterns from `sidebar.tsx` (confirmed match to UI-SPEC contract). The `Sidebar` component file (`sidebar.tsx`) and `WeatherWidget` file (`weather-widget.tsx`) can be deleted — both become dead code. Check `weather-widget.tsx` for any remaining imports before deleting.

**Do not extract to new component files:** UI-SPEC says "no new components required." The sections are small enough for inline JSX in `page.tsx`.

---

## Critical Finding 4: Existing Prisma Queries

**Verified by:** Code inspection of `src/app/(public)/page.tsx`.

The exact queries already in `page.tsx`:

```typescript
const events = await prisma.event.findMany({
  where: {
    visibility: "PUBLIC",
    startDate: { gte: new Date() },
  },
  orderBy: { startDate: "asc" },
  take: 5,
  select: { id: true, title: true, startDate: true, location: true },
});

const photos = await prisma.photo.findMany({
  orderBy: { createdAt: "desc" },
  take: 6,
  select: { id: true, thumbnailPath: true, title: true },
});
```

These match the UI-SPEC contract exactly (take: 5 events, take: 6 photos). Keep unchanged.

The current `sidebarEvents` and `sidebarPhotos` mapping shims (`.map()` calls) exist only because `Sidebar` has its own interface types with `date: string` instead of `startDate: Date`. When the Sidebar is retired and sections are inlined, these shims are removed. The inline event JSX works directly with `startDate: Date` (matching the UI-SPEC pattern: `new Date(event.startDate).toLocaleDateString(...)`).

---

## Critical Finding 5: Blog Dependency (HOME-03)

**Verified by:** grep of `src/app/(public)/` for `blog`, `getAllPosts`, `FeaturedPost`, `PostCard`, `getFamilyUpdates`.

**Result: zero matches.** The public route group has no blog imports. Phase 32 fully cleaned this. HOME-03 is already satisfied by the current codebase state — this phase just needs to not re-introduce any blog dependencies (trivially avoided given the implementation scope).

---

## Critical Finding 6: Hero Component

**Verified by:** Code inspection of `src/components/public/hero.tsx`.

Current hero is a pure Server Component (no `"use client"`, no hooks). It currently renders:
- Eyebrow: `Est. 2024 • Dallas, Texas`
- H1: `The Hudson Family`
- Subcopy: `Stories, photos, and life updates from our corner of the world` (blog-era, to be replaced)
- No CTA row, no RecipeSearch

**Changes needed (D-04 + D-01):**
1. Update subcopy to: `Grandma Hudson's recipes, family photos, and moments that matter — all in one place.`
2. Add eyebrow `text-sm` correction: current hero uses `text-xs tracking-[4px]` — UI-SPEC says `text-sm tracking-[4px]`. Adjust class.
3. Add CTA row: `<Link>` "Browse Recipes" button + `<RecipeSearch index={index} />` trigger

**Props change:** Hero needs to accept `index: RecipeIndexEntry[]` to pass to RecipeSearch, since RecipeSearch is `"use client"` and must be a child, not a sibling, of the Server Component that fetched the index.

Two valid patterns:
- **Pattern A (simpler):** Keep Hero as a pure markup component; put the CTA row (including `<RecipeSearch>`) inline in `page.tsx` below the Hero or have Hero accept `children`. The `page.tsx` Server Component holds the `index` and renders `<RecipeSearch index={index}>` directly.
- **Pattern B:** Add `index: RecipeIndexEntry[]` prop to Hero component, Hero renders RecipeSearch internally.

Pattern A is cleaner: Hero stays stateless/prop-free. `page.tsx` composes:
```tsx
<Hero />
<div className="flex flex-col sm:flex-row items-center justify-center gap-3">
  <Link href="/recipes">Browse Recipes</Link>
  <RecipeSearch index={index} />
</div>
```

However, the UI-SPEC says the CTA row is **inside the Hero section**, so Pattern B (Hero receives index) or moving the CTA row into the Hero's JSX while passing `index` as a prop is the correct interpretation. Either works — no server/client violation since Hero is a Server Component calling another Server Component that renders a Client Component as a leaf.

**Recommended:** Pass `index` prop to Hero. Hero renders the full CTA row including `<RecipeSearch index={index} />`. This keeps the Hero section self-contained per the UI-SPEC contract.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Recipe index for search | Custom data fetch in client | `getRecipeIndex()` already exists | Already used on /recipes; identical signature |
| Featured recipe data | Separate `getRecipeBySlug` calls | Index lookup from already-fetched `index` array | Zero additional I/O |
| Empty state copy | New design | Exact copy from existing Sidebar: "No photos yet" / "No upcoming events" | Already matches UI-SPEC |
| Section header pattern | Custom heading+link JSX | `SectionHeader` with `label` + `action` props | Already does exactly this |
| Photo thumbnails | Direct R2 URL | `/api/images/${id}?size=thumbnail` proxy | Existing pipeline; direct R2 access is forbidden |
| Event date formatting | Custom formatter | Inline `toLocaleDateString` calls | Existing sidebar.tsx pattern; EventCard.tsx not needed (different UI) |

---

## Architecture Patterns

### Recommended page.tsx Structure

```
page.tsx (Server Component)
  await connection()
  const [events, photos, index] = await Promise.all([
    prisma.event.findMany(...),
    prisma.photo.findMany(...),
    getRecipeIndex(),
  ])
  const featuredRecipes = FEATURED_RECIPE_SLUGS
    .map(slug => index.find(e => e.slug === slug))
    .filter(Boolean)

  return <>
    <Hero index={index} />              ← Server Component, passes index to RecipeSearch leaf
    <Separator />
    <section>                           ← Recipes section
      <SectionHeader label="RECIPES" action={...} />
      <div className="grid ...">
        {featuredRecipes.map(r => <Link key={r.slug} href={...}>card JSX</Link>)}
      </div>
    </section>
    <Separator />
    <section>                           ← Photos section
      <SectionHeader label="PHOTOS" action={...} />
      <div className="bg-card ...">
        {photos.length > 0 ? <PhotoGridPreview photos={photos} /> : empty state}
      </div>
    </section>
    <Separator />
    <section>                           ← Events section
      <SectionHeader label="EVENTS" action={...} />
      <div className="bg-card ...">
        {events.length > 0 ? <ul>...</ul> : empty state}
      </div>
    </section>
  </>
```

**Parallelized data fetching:** `Promise.all` for the three async calls eliminates waterfall. `getRecipeIndex()` reads ~1003 MDX files (frontmatter only via gray-matter) — this is the most expensive call but is already done on every `/recipes` page load.

### Data flow diagram

```
page.tsx (Server Component)
  │
  ├── Promise.all ─────────────────────────────────────────────────────┐
  │     │                                                               │
  │     ├── prisma.event.findMany()  →  events[]                       │
  │     ├── prisma.photo.findMany()  →  photos[]                       │
  │     └── getRecipeIndex()         →  index[] (RecipeIndexEntry[])    │
  │                                                                     │
  │   index.filter(FEATURED_SLUGS)   →  featuredRecipes[]              │
  │                                                                     ▼
  ├── <Hero index={index}>
  │     └── <RecipeSearch index={index} />  [CLIENT LEAF]
  │           └── CommandDialog (cmdk)
  │
  ├── Recipes section
  │     └── featuredRecipes.map → card JSX (Server)
  │
  ├── Photos section
  │     └── <PhotoGridPreview photos={photos} />  (Server)
  │           └── next/image src="/api/images/{id}?size=thumbnail"
  │
  └── Events section
        └── events.map → li row JSX (Server)
```

---

## Common Pitfalls

### Pitfall 1: Calling getRecipeIndex() inside RecipeSearch
**What goes wrong:** `RecipeSearch` is `"use client"` — async calls are not allowed inside client components at the top level.
**Why it happens:** Assuming the component fetches its own data.
**How to avoid:** Always pass `index` as a prop from the Server Component. The Server Component owns all async data fetching.
**Warning signs:** TypeScript error "async/await is only allowed in async functions" or React error about calling async function inside render.

### Pitfall 2: Passing non-serializable data to Client Components
**What goes wrong:** Hydration mismatch or "cannot serialize" error.
**Why it happens:** Passing Prisma objects, Dates, or class instances across the Server/Client boundary.
**How to avoid:** `RecipeIndexEntry[]` is `{ slug: string; title: string; category: string }[]` — fully serializable. `featuredRecipes` filtered from the same array is safe.
**Warning signs:** Next.js build error "only plain objects, and a few built-ins can be passed to Client Components from Server Components."

### Pitfall 3: Forgetting to remove the sidebarEvents/sidebarPhotos shims
**What goes wrong:** Dead mapping code left in page.tsx creates confusion or type errors after Sidebar is removed.
**Why it happens:** Incremental refactor that removes the Sidebar call but leaves the `.map()` shims.
**How to avoid:** When removing `<Sidebar>`, also remove the `sidebarEvents` and `sidebarPhotos` const declarations. The inline sections use `events` and `photos` directly.
**Warning signs:** TypeScript "unused variable" warning on `sidebarEvents`/`sidebarPhotos`.

### Pitfall 4: Forgetting Promise.all parallelization
**What goes wrong:** Sequential awaits create a waterfall: event query → photo query → recipe index read, adding ~100-300ms to TTFB.
**Why it happens:** Naive sequential `await` pattern.
**How to avoid:** `const [events, photos, index] = await Promise.all([...])` — all three start simultaneously.

### Pitfall 5: Using EventCard component for homepage events
**What goes wrong:** `EventCard` (`src/components/public/event-card.tsx`) has a different interface (`description`, `endDate`, `allDay` fields) and is designed for a full event detail card with hover shadow. The UI-SPEC uses the simpler Sidebar row pattern (day number badge + title + date•location).
**Why it happens:** Seeing an event-rendering component and using it without checking the UI contract.
**How to avoid:** Use the inline row pattern from `sidebar.tsx` (confirmed in UI-SPEC §4). `EventCard` is not used on the homepage.

### Pitfall 6: SectionHeader label size discrepancy
**What goes wrong:** `SectionHeader` inline label mode renders `text-xs font-semibold tracking-[3px]`. The UI-SPEC wants `text-sm`. Current component uses `text-xs`.
**Why it happens:** UI-SPEC says `text-sm` but the actual component has `text-xs`.
**How to avoid:** The component accepts `className` via `HTMLAttributes<HTMLDivElement>` spread. However, the `h3` inside uses a hardcoded `text-xs` class. **The planner must decide:** accept `text-xs` (existing component behavior, minor spec deviation) or update `section-header.tsx` to `text-sm`. Touching section-header.tsx affects all its usages (dashboard + public). **Recommendation:** Accept `text-xs` for this phase; the UI-SPEC typography section confirms `text-sm` is for the eyebrow tier, but the label size in the existing component (`text-xs`) is a minor deviation that doesn't block the phase.

---

## Component Inventory (Implementation Map)

| Component | File | Change Needed | Notes |
|-----------|------|---------------|-------|
| `Hero` | `src/components/public/hero.tsx` | Yes — add `index` prop, add CTA row, fix subcopy, fix eyebrow `text-xs`→`text-sm` | Keep `motion-safe:animate-fade-in-up` |
| `RecipeSearch` | `src/components/public/recipe-search.tsx` | None | Receives `index` prop, already works |
| `SectionHeader` | `src/components/ui/section-header.tsx` | None (or minor: text-xs → text-sm per above pitfall) | Reuse inline label mode |
| `PhotoGridPreview` | `src/components/public/photo-grid-preview.tsx` | None | Accepts same `{ id, thumbnailPath, title }[]` shape |
| `Separator` | `src/components/ui/separator` | None | Between sections |
| `Sidebar` | `src/components/public/sidebar.tsx` | DELETE (homepage-only usage confirmed) | |
| `WeatherWidget` | `src/components/public/weather-widget.tsx` | DELETE (only imported by Sidebar) | Verify no other imports before deleting |
| `page.tsx` | `src/app/(public)/page.tsx` | Full rewrite | Remove Sidebar; add index fetch; inline 4 sections |

**New code:**
- `FEATURED_RECIPE_SLUGS` constant — in `src/lib/featured-recipes.ts` (preferred) or top of `page.tsx`
- Featured recipe card JSX (inline in `page.tsx`, ~10 lines per card template)

---

## Package Legitimacy Audit

No new packages required. This phase uses only existing installed dependencies:
- `next/link`, `next/server` — Next.js core
- `@/lib/recipes` — project lib
- `@/lib/prisma` — project lib
- All components from existing `src/components/`

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| Sidebar rail (320px aside) | Full-width stacked sections | Eliminated; all content full-width |
| Blog featured post as homepage lead | Recipes section as homepage lead | Phase 33 implements |
| `sidebarEvents`/`sidebarPhotos` shim mapping | Direct `events`/`photos` Prisma result | Remove shims when retiring Sidebar |
| WeatherWidget in Sidebar | Removed (no replacement in scope) | Clean delete with Sidebar |

---

## Environment Availability

Step 2.6: SKIPPED — this phase is code/config changes only. No external CLI tools, services, or runtimes beyond the existing Next.js dev server and Prisma/Neon (both confirmed operational from prior phases).

---

## Validation Architecture

`workflow.nyquist_validation` key is absent from `.planning/config.json` — treated as enabled.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest + happy-dom + Testing Library |
| Config file | `vitest.config.ts` (root) |
| Quick run command | `npm test` |
| Full suite command | `npm test` |
| Build check | `npm run build` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| HOME-01 | Recipe section renders above fold; RecipeSearch receives index | Build + smoke | `npm run build` (no import errors) | N/A — Server Component, not unit-testable |
| HOME-01 | `getRecipeIndex()` returns entries with slug/title/category | Unit | `npm test` (existing `recipes.test.ts`) | ✅ exists |
| HOME-01 | Featured slugs all resolve from index | Manual | Check browser, or new unit test | ❌ Wave 0 gap |
| HOME-02 | Photos section renders PhotoGridPreview or empty state | Build + manual | `npm run build` + visual check | N/A |
| HOME-02 | Events section renders list or empty state | Build + manual | `npm run build` + visual check | N/A |
| HOME-03 | No blog/updates imports in (public)/ | Lint/grep | `npm run lint` + `grep -r "getAllPosts\|FeaturedPost" src/app/\(public\)/` | N/A — grep |
| HOME-03 | Build succeeds with blog MDX absent | Build | `npm run build` | N/A |

### Observable Success Criteria

| Criterion | How to Verify |
|-----------|--------------|
| `npm run build` exits 0 | CI/terminal output |
| Homepage renders recipes section above fold | `npm run dev` → localhost:3000; Recipes section visible without scroll on 1280px viewport |
| All 6 featured recipe cards render with title + category | localhost:3000 — count cards in Recipes section |
| Graceful skip for bad slug | Add a bogus slug to FEATURED_RECIPE_SLUGS, verify no error, remove it |
| Photos section renders (empty state if no photos) | "No photos yet" or PhotoGridPreview at bottom of page |
| Events section renders (empty state if no events) | "No upcoming events" or event list |
| Sidebar component no longer in render tree | DevTools Elements inspector — no `<aside>` on homepage |
| No blog imports | `grep -r "getAllPosts\|FeaturedPost\|PostCard\|getFamilyUpdates" src/app/\(public\)/` returns empty |
| `npm test` passes | All existing Vitest tests green (no new test breakage) |
| `npm run lint` passes | No ESLint errors/warnings |

### Wave 0 Gaps

- [ ] `src/__tests__/lib/recipes.test.ts` — add test: `FEATURED_RECIPE_SLUGS.every(slug => index.find(e => e.slug === slug))` to confirm default slugs exist in published index. Low-value unit test but useful as regression guard.
- Otherwise: existing test infrastructure covers all phase requirements (recipes lib unit tests exist; no homepage render tests exist or are needed for this phase's scope).

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `WeatherWidget` has no other importers besides `sidebar.tsx` | Critical Finding 3 | If wrong, deleting `weather-widget.tsx` breaks a compile. Mitigated by grep confirming only `sidebar.tsx` imports it. |

**All other claims verified by direct code inspection.** The grep for WeatherWidget importers showed exactly two files: `sidebar.tsx` (importer) and `weather-widget.tsx` (definition). [VERIFIED by grep]

---

## Open Questions

1. **SectionHeader label size: `text-xs` vs `text-sm`**
   - What we know: `section-header.tsx` uses hardcoded `text-xs` in the label `h3`. UI-SPEC calls for `text-sm`.
   - What's unclear: Whether the planner should update `section-header.tsx` (affects all usages) or accept the deviation.
   - Recommendation: Accept `text-xs` for Phase 33. Document as a candidate fix for Phase 35 (navbar/footer UI pass) where the component may be revisited.

2. **`src/lib/featured-recipes.ts` vs inline constant**
   - What we know: UI-SPEC says "in `page.tsx` or `src/lib/featured-recipes.ts`". CONTEXT.md says "Claude's Discretion."
   - Recommendation: `src/lib/featured-recipes.ts` for discoverability — the family can find and edit it without navigating to a Server Component file.

---

## Sources

### Primary (HIGH confidence — direct code inspection)
- `src/app/(public)/page.tsx` — current homepage structure, Prisma queries, Sidebar usage
- `src/components/public/recipe-search.tsx` — confirmed prop interface `{ index: RecipeIndexEntry[] }`, confirmed "use client"
- `src/app/(public)/recipes/page.tsx` — confirmed `getRecipeIndex()` → `<RecipeSearch index={index} />` pattern
- `src/lib/recipes.ts` — confirmed `getRecipeIndex()` returns `RecipeIndexEntry[]`; confirmed `getRecipeBySlug` is full MDX parse
- `src/components/public/sidebar.tsx` — confirmed events/photos/empty-state patterns; confirmed `WeatherWidget` import
- `src/components/ui/section-header.tsx` — confirmed label mode API; confirmed `text-xs` (not `text-sm`)
- `src/components/public/hero.tsx` — confirmed current structure, classes, no props
- `src/components/public/photo-grid-preview.tsx` — confirmed prop interface
- `src/components/public/event-card.tsx` — confirmed incompatible interface for homepage use
- `content/recipes/` — verified 6 default featured slugs exist and are `status: "published"`
- grep output — confirmed Sidebar used only in `page.tsx`; confirmed WeatherWidget used only in `sidebar.tsx`; confirmed zero blog imports in `(public)/`

### Secondary (MEDIUM — config files)
- `.planning/config.json` — `nyquist_validation` key absent → treated as enabled
- `src/__tests__/lib/recipes.test.ts` — existing test coverage for recipes lib confirmed

---

## Metadata

**Confidence breakdown:**
- Server/Client boundary pattern: HIGH — verified by reading both the component source and its existing usage
- Featured slug selection: HIGH — verified all 6 slugs exist as files with `status: "published"`
- Sidebar retirement scope: HIGH — grep confirms homepage-only usage
- Prisma query shape: HIGH — read directly from existing page.tsx
- SectionHeader label size discrepancy: HIGH — read directly from component source

**Research date:** 2026-06-02
**Valid until:** Stable — this phase covers a single well-understood file. No time-sensitive dependencies.
