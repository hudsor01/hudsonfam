# Phase 31: Recipes Experience - Context

**Gathered:** 2026-06-02
**Status:** Ready for planning
**Source:** original brainstorm (Mealie/Tandoor/RecipeSage conventions) + REQUIREMENTS RECIPE-01..05

<domain>
## Phase Boundary

The UI/UX layer over the finished 1,000-recipe collection. The recipe content/import is DONE — this phase adds five usability features, all readability-first for older relatives. Recipes are file-based MDX in `content/recipes/`, loaded by `src/lib/recipes.ts`, rendered under `src/app/(public)/recipes/`. Public, no auth, no DB. Stack: Next 16 App Router, React 19, Tailwind v4, shadcn (cmdk already installed).
</domain>

<decisions>
## Implementation Decisions (locked)

### Overarching
- **Readability-first:** large text, high contrast, big tap targets (≥44px) for older relatives. All colors via `globals.css` `@theme` tokens (no raw Tailwind colors). Stay **text-only** — no scan images.
- **No login / no DB** for any of this — client-side state lives in `localStorage`.

### RECIPE-01 — Search
- Use **cmdk** (already installed). A visible search affordance on the recipes listing (a search box/button) AND keyboard shortcut (Cmd/Ctrl+K).
- Instant client-side filter by recipe **name** (and ideally category) over a lightweight index of `{slug, title, category}` for all ~1,000 recipes (passed from the server component — titles only, small payload). Selecting a result navigates to `/recipes/{slug}`.
- Keyboard-accessible and screen-reader friendly.

### RECIPE-02 — Ingredient + step checkboxes
- Client component on the recipe detail page. Tap an ingredient or step to cross it off (checkbox + strikethrough). **Large tap targets**, clear checked state.
- Persist checked state **per recipe** in `localStorage` keyed by slug, so progress survives reload while cooking. A small "reset/clear checks" affordance.

### RECIPE-03 — Print / kitchen view
- A clean one-page printout: title + ingredients + numbered steps only (no nav/chrome/menu). Implement via **print CSS (`@media print`)** on the detail page plus a "Print" button calling `window.print()`. (A dedicated print route is acceptable if cleaner, but print CSS on the detail page is the default.)

### RECIPE-04 — Breadcrumbs + prev/next
- Breadcrumbs `Recipes › {Chapter/Category} › {Recipe}` on the detail page.
- Prev/next navigation **within the same chapter**, in book order (the `order` frontmatter field, same sort the listing uses). Computed server-side from the sorted recipe list; show chapter boundaries gracefully (no prev on first, no next on last in chapter).

### RECIPE-05 — Build-your-own-menu
- "Add to menu" control on recipe **cards** (listing) and the **detail** page.
- A **React Context** provider holding the menu, persisted in `localStorage` (no login). A floating **"My Menu (N)"** indicator visible across the public site that links to `/my-menu`.
- `/my-menu` page: picked recipes **grouped by course/category**, each with remove; plus **clear all** and **print** (reuse the print approach from RECIPE-03). Pattern modeled on Mealie/Tandoor/RecipeSage "add to plan."
</decisions>

<canonical_refs>
## Canonical References

- `.planning/REQUIREMENTS.md` — RECIPE-01..05 acceptance criteria (authoritative)
- `.planning/ROADMAP.md` §Phase 31 — plan/REQ mapping (31-01 search+breadcrumbs+prev/next, 31-02 checkboxes+print, 31-03 build-your-own-menu)
- `src/lib/recipes.ts` — recipe loader (slug, title, category, order, ingredients, instructions)
- `src/app/(public)/recipes/page.tsx` — listing (chapter-grouped, book order)
- `src/app/(public)/recipes/[slug]/page.tsx` — detail page (text-first)
- `src/components/ui/` — shadcn primitives incl. cmdk command palette
- `src/styles/globals.css` — color tokens (single source)
</canonical_refs>

<deferred>
## Deferred Ideas

- Full-text search across ingredients/steps (RECIPE-01 is name/category only). [FUTURE-04]
- Importing the book's back-matter Menus section (~100 menus) as preset menus — pairs with RECIPE-05 but needs the source transcribed first. [FUTURE-03]
- Servings scaling / unit conversion — not in scope.
</deferred>

---

*Phase: 31-recipes-experience*
*Context gathered: 2026-06-02*
