# Phase 33: Homepage Restructure - Context

**Gathered:** 2026-06-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Rebuild the public homepage (`src/app/(public)/page.tsx`) to **lead with Grandma Hudson's Recipes** and surface live **Photos** and **Events** data, with zero dependency on the removed blog/updates subsystems. Covers HOME-01, HOME-02, HOME-03.

Post-Phase-32 starting state: the homepage is `Hero` + an orphaned `Sidebar` (events/photos rail) floating alone in a `max-w-7xl` container — the blog featured/recent sections were already stripped (Phase 32 D-05). This phase builds the real recipes-first homepage on that clean base.

**Out of scope:** the navbar/footer redesign (Phase 35), the photo *rendering* fix (Phase 34 — this phase just surfaces photos via the existing `/api/images` proxy pattern), and any new recipe content. Visual specifics (spacing, exact card styling, typography) are locked in `/gsd:ui-phase 33`, not here.

</domain>

<decisions>
## Implementation Decisions

### Recipes Lead (HOME-01)
- **D-01: Hero CTA + featured recipes.** Rework the Hero to headline the recipe collection with a prominent "Browse Recipes" CTA (→ `/recipes`) plus the existing cmdk `RecipeSearch` as an above-the-fold action. Immediately below, a small **featured-recipes card row**. This is the first content a visitor sees.

### Featured-Recipe Selection (HOME-01)
- **D-02: Curated hardcoded list.** Featured recipes come from a small handpicked constant of ~4–6 recipe slugs in code (e.g. `FEATURED_RECIPE_SLUGS`), resolved via `getRecipeBySlug`/`getRecipeIndex`. Stable, intentional, **no randomness/hydration risk**, easy for the family to edit later. Render each as title + category + link; gracefully skip any slug that doesn't resolve. (Default slugs chosen during planning/ui-phase.)

### Homepage Layout (HOME-01/02)
- **D-03: Single-column stacked full-width sections.** Order: **Hero → Recipes (CTA + search + featured row) → Photos → Events**. Retire the orphaned narrow `Sidebar` rail layout — repurpose its events/photos rendering (and existing empty states) into full-width sections, or replace with section components. Each section has a "View all" link to its index (`/recipes`, `/photos`, `/events`). Mobile-first.

### Hero Copy (HOME-01)
- **D-04: Recipes-forward Hero.** Keep the `The Hudson Family` headline + `Est. 2024 • Dallas, Texas` eyebrow. Replace the blog-era subcopy (`Stories, photos, and life updates from our corner of the world`) with copy that foregrounds Grandma Hudson's recipe collection + family moments. Exact wording finalized in ui-phase/planning.

### Photos + Events (HOME-02)
- **D-05: Live data, clean empty states.** Surface latest Photos (thumbnails via the `/api/images/[id]?size=thumbnail` proxy + `PhotoGridPreview` pattern) and upcoming Events from Prisma, each with an intentional empty state (reuse the existing `Sidebar` copy: "No photos yet" / "No upcoming events"). Keep the existing queries (`event.findMany` upcoming PUBLIC; `photo.findMany` latest).

### Zero blog dependency / build-green (HOME-03)
- **D-06:** The homepage renders correctly with `content/blog/` deleted and `BlogPost`/`FamilyUpdate` absent (already true post-Phase-32). No `getAllPosts`/`FeaturedPost`/`PostCard`. `npm run build` exits 0, no console errors.

### Claude's Discretion
- The default featured-recipe slugs, exact Hero/section copy, and whether to refactor the `Sidebar` sub-renders into new section components vs inline — within the locked structure above. UI-SPEC locks the visuals.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase planning
- `.planning/ROADMAP.md` §"Phase 33: Homepage Restructure" — goal + 4 success criteria
- `.planning/REQUIREMENTS.md` — HOME-01, HOME-02, HOME-03
- `.planning/PROJECT.md` — v5.0 milestone, surviving IA, YAGNI principle
- `.planning/phases/32-prune-dashboard-cleanup/32-CONTEXT.md` §D-05 — why the homepage is currently Hero + orphaned Sidebar (blog dep stripped in Phase 32)

### Project conventions
- `CLAUDE.md` — recipes are file-based MDX (`content/recipes/`, no DB), colors via globals.css tokens, photos via `/api/images` proxy, shadcn primitives

No external ADRs/specs — requirements fully captured in decisions above.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/recipes.ts` — `getPublishedRecipes`, `getRecipeBySlug`, `getRecipeIndex`, `getAllCategories`, `anchor()` (recipe data; 1,003 recipes, static MDX, no "featured" flag)
- `src/components/public/recipe-search.tsx` — cmdk `RecipeSearch` (Cmd/Ctrl+K + visible button) → reuse as the Hero search action
- `src/components/public/photo-grid-preview.tsx` — `PhotoGridPreview` (3-col thumbnail grid linking to `/photos`, uses `/api/images/${id}?size=thumbnail`)
- `src/components/public/sidebar.tsx` — current events + photos rendering with empty states ("No upcoming events" / "No photos yet") → repurpose into full-width sections
- `src/components/public/hero.tsx` — current Hero (to be reworked, D-04)
- `src/components/ui/section-header.tsx` — `SectionHeader` with `label` + `action` ("View all") → reuse for section headers
- `src/components/public/event-card.tsx` — event rendering

### Current State (restructure target)
- `src/app/(public)/page.tsx` — `Hero` + `Separator` + `Sidebar(events, photos)` in `max-w-7xl`; queries `event.findMany` (upcoming PUBLIC, take 5) + `photo.findMany` (latest, take 6)

### Integration Points
- Prisma queries already in `page.tsx` — keep/extend (events upcoming, photos latest)
- Recipes are static MDX (file-based, no DB) — read via `src/lib/recipes.ts`
- Page is a Server Component (`await connection()`); `RecipeSearch` is a client component already used on `/recipes`

</code_context>

<specifics>
## Specific Ideas

- Featured recipes = a curated, family-editable slug constant (D-02) — intentional, not random.
- The homepage's first content block leads with recipes (CTA + search + featured row), then Photos, then Events (D-01/D-03).
- Recipes-forward Hero copy, dropping the blog-era "life updates" line (D-04).

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope. (Visual polish → `/gsd:ui-phase 33`; photo rendering fix → Phase 34; nav/footer → Phase 35 — existing roadmap work, not deferred ideas.)

</deferred>

---

*Phase: 33-homepage-restructure*
*Context gathered: 2026-06-02*
