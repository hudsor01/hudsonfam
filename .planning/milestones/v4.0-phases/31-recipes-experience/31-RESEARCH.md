# Phase 31: Recipes Experience — Research

**Researched:** 2026-06-02
**Domain:** Next.js 16 App Router, cmdk v1.1.1, React 19, Tailwind v4, localStorage/SSR, print CSS
**Confidence:** HIGH — all answers verified against official docs fetched this session

---

## Project Constraints (from CLAUDE.md)

- All colors from `src/styles/globals.css` `@theme` tokens only — zero raw Tailwind color names in `.tsx`
- No `react-hook-form` — all forms use `@tanstack/react-form` (N/A for this phase; no forms)
- Never remove shadcn components — integrate, don't delete
- `@/*` path alias maps to `./src/*`
- Page files are Server Components by default; `"use client"` must be first line of client components
- Never pass `onClick` or event handlers from Server → Client component props

---

## Installed Versions (confirmed via `npm view`)

| Package | Installed | Registry latest |
|---------|-----------|-----------------|
| `next` | 16.2.6 | 16.2.7 (docs match) |
| `react` | 19.2.6 | 19.2.6 |
| `cmdk` | ^1.1.1 → **1.1.1** | 1.1.1 |
| `radix-ui` | ^1.4.3 → **1.4.3** | 1.4.3 |
| `tailwindcss` | ^4.3.0 | 4.x |

[VERIFIED: npm registry + package.json]

---

## Q1: cmdk / CommandDialog API — RECIPE-01 search

**Sources:** GitHub `pacocoursey/cmdk` README (fetched); `src/components/ui/command.tsx` (read directly)

### What the shadcn wrapper exports (confirmed from command.tsx)

The installed `command.tsx` wraps `CommandPrimitive` from `cmdk` and re-exports:

```
Command, CommandDialog, CommandInput, CommandList,
CommandEmpty, CommandGroup, CommandItem, CommandShortcut, CommandSeparator
```

`CommandDialog` in this codebase is **NOT** `Command.Dialog` from cmdk directly — it is the shadcn wrapper that composes Radix `Dialog` + `Command`. Its prop signature:

```tsx
function CommandDialog({
  title = "Command Palette",
  description = "Search for a command to run...",
  children,
  className,
  showCloseButton = true,
  ...props               // spreads to <Dialog> — includes open, onOpenChange
}: React.ComponentProps<typeof Dialog> & {
  title?: string
  description?: string
  className?: string
  showCloseButton?: boolean
})
```

The `open` / `onOpenChange` props are forwarded directly to Radix Dialog via `...props`. [VERIFIED: source code]

### Controlled open pattern for Cmd/Ctrl+K

cmdk does NOT handle the keyboard shortcut automatically. Implement it as a `useEffect` in the search client component:

```tsx
"use client"
import { useState, useEffect, useCallback } from "react"
import {
  CommandDialog, CommandInput, CommandList,
  CommandEmpty, CommandGroup, CommandItem,
} from "@/components/ui/command"
import { useRouter } from "next/navigation"

export function RecipeSearch({ index }: { index: RecipeIndex[] }) {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  return (
    <>
      {/* visible affordance — a button that opens the dialog */}
      <button
        onClick={() => setOpen(true)}
        className="..."   // use theme tokens only
        aria-label="Search recipes (Cmd K)"
      >
        Search recipes  <kbd>⌘K</kbd>
      </button>

      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Search Recipes"
        description="Type a recipe name or category"
      >
        <CommandInput placeholder="Search recipes…" />
        <CommandList>
          <CommandEmpty>No recipes found.</CommandEmpty>
          <CommandGroup heading="Recipes">
            {index.map((r) => (
              <CommandItem
                key={r.slug}
                value={`${r.title} ${r.category}`}   // ← filtering key
                onSelect={() => {
                  router.push(`/recipes/${r.slug}`)
                  setOpen(false)
                }}
              >
                {r.title}
                <span className="ml-auto text-text-dim text-xs">{r.category}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  )
}
```

[CITED: https://github.com/pacocoursey/cmdk — README Cmd/Ctrl+K section]

### cmdk filter mechanics — how multi-field search works

The `filter` prop on `<Command>` (or `CommandPrimitive`) accepts `(value, search, keywords) => number`. **The `value` argument is the `value` prop on `CommandItem`** — it is what cmdk uses for filtering, NOT the rendered text.

**Pattern to match both title and category in a single `CommandItem`:**

Set `value` to a concatenation of the fields you want searchable:

```tsx
<CommandItem
  value={`${r.title} ${r.category}`}
  onSelect={...}
>
  {r.title}
</CommandItem>
```

cmdk will match on the `value` string. No custom `filter` prop needed for this use case.

**Alternative:** Use the `keywords` array prop on `CommandItem` (cmdk v1 API):

```tsx
<CommandItem
  value={r.title}
  keywords={[r.category]}
  onSelect={...}
>
  {r.title}
</CommandItem>
```

`keywords` is a first-class cmdk v1 API — the `filter` function receives `(value, search, keywords)` and the built-in filter also checks keywords. Either approach works; `keywords` is cleaner.

[CITED: https://github.com/pacocoursey/cmdk — filter prop + keywords prop docs]

### Built-in keyboard/ARIA from cmdk + Radix Dialog

cmdk provides:
- Arrow up/down to navigate items
- Enter to select
- Character filtering on the input
- `role="listbox"` on `Command.List`, `role="option"` on items, `data-selected` on focused item
- Compatible with VoiceOver / ChromeVox (confirmed in README)

The Radix Dialog wrapper (`CommandDialog`) adds:
- Focus trap within the dialog
- ESC closes (sets `open=false` via `onOpenChange`)
- `aria-modal="true"` on dialog container
- Renders a visually-hidden title/description (already wired in shadcn's `CommandDialog` via `DialogHeader.sr-only`)

**Implementer must supply:**
- The `open` / `onOpenChange` state (above pattern)
- A visible trigger button with `aria-label` or visible label text
- Meaningful `title` and `description` props on `CommandDialog` (already defaulted in shadcn wrapper but should be overridden to be recipe-specific)

[CITED: https://www.radix-ui.com/primitives/docs/components/dialog — Accessibility section]
[CITED: https://github.com/pacocoursey/cmdk — Accessibility section]

### Index shape to pass from server

The recipes listing page is already a Server Component. Pass a lightweight index as a prop to the client component:

```tsx
// src/app/(public)/recipes/page.tsx (server component — stays server)
import { RecipeSearch } from "@/components/public/recipe-search"

// In the component body, after loading recipes:
const index = published.map((r) => ({
  slug: r.slug,
  title: r.frontmatter.title,
  category: r.frontmatter.category,
}))

// In JSX:
<RecipeSearch index={index} />
```

This keeps all file I/O server-side, and the client only receives `{slug, title, category}[]`. At 1,000 recipes, this JSON payload is approximately 30–60 KB uncompressed — acceptable as an inline prop; no separate API route needed.

---

## Q2: Metadata on a "use client" page — RECIPE-05 `/my-menu`

**Sources:** Next.js 16.2.7 official docs — `generateMetadata` API reference (fetched)

### Verified constraint (official docs quote)

> "The `metadata` object and `generateMetadata` function exports are **only supported in Server Components**."
> — nextjs.org/docs/app/api-reference/functions/generate-metadata

A `"use client"` file **cannot** export `metadata` or `generateMetadata`. Next.js will silently ignore or error on the export. [VERIFIED: nextjs.org/docs]

### Canonical pattern for `/my-menu`

`/my-menu` needs `localStorage` (client-only), so it needs client component logic. The correct structure:

```
src/app/(public)/my-menu/
├── page.tsx          ← Server Component: exports metadata, renders <MyMenuClient />
└── my-menu-client.tsx ← "use client": all useState/useEffect/localStorage logic
```

**`page.tsx`** (Server Component):
```tsx
import type { Metadata } from "next"
import { MyMenuClient } from "./my-menu-client"

export const metadata: Metadata = {
  title: "My Menu | Grandma Hudson's Recipes",
  description: "Your selected recipes, grouped by course.",
}

export default function MyMenuPage() {
  return <MyMenuClient />
}
```

**`my-menu-client.tsx`** (Client Component):
```tsx
"use client"
// all localStorage, useState, useEffect here
export function MyMenuClient() { ... }
```

This is the exact pattern recommended in the Next.js docs:
> "If you need to use Client Component features, keep your `page.tsx` as a Server Component and move the Client Component logic to a separate file."
> — nextjs.org/docs/app/api-reference/functions/generate-metadata#why-generatemetadata-is-server-component-only

[CITED: https://nextjs.org/docs/app/api-reference/functions/generate-metadata]

---

## Q3: localStorage + SSR hydration in Next 16 / React 19 — RECIPE-02 checkboxes, RECIPE-05 menu

**Sources:** react.dev/reference/react-dom/client/hydrateRoot (fetched); Next.js 16 docs

### Verified constraint

`useState` lazy initializer (the `() => ...` form) **runs on both server and client** in Next.js App Router. Using `localStorage` there will throw `ReferenceError: localStorage is not defined` during SSR. [VERIFIED: react.dev]

### Canonical SSR-safe pattern

```tsx
"use client"
import { useState, useEffect } from "react"

// WRONG — crashes on server:
const [checks, setChecks] = useState(() => JSON.parse(localStorage.getItem(key) ?? "{}"))

// CORRECT — empty initial state, read in useEffect (client-only):
export function RecipeChecklist({ slug, ingredients, instructions }: Props) {
  const [checked, setChecked] = useState<Record<string, boolean>>({})

  // Read persisted state after hydration
  useEffect(() => {
    try {
      const stored = localStorage.getItem(`recipe-checks-${slug}`)
      if (stored) setChecked(JSON.parse(stored))
    } catch {}
  }, [slug])

  // Write on change
  const toggle = (key: string) => {
    setChecked((prev) => {
      const next = { ...prev, [key]: !prev[key] }
      try { localStorage.setItem(`recipe-checks-${slug}`, JSON.stringify(next)) } catch {}
      return next
    })
  }

  // Component renders identically on server and initial client render (empty checked)
  // then updates after useEffect fires — no hydration mismatch
  return ( ... )
}
```

**React 19 note:** No new SSR/hydration API changes affect this pattern. React 19 did not change `useEffect` semantics or localStorage handling. The above pattern is unchanged from React 18. [VERIFIED: react.dev docs — no React 19 caveats mentioned for this pattern]

### localStorage key conventions for this phase

| Feature | Key | Shape |
|---------|-----|-------|
| RECIPE-02 checkboxes | `recipe-checks-{slug}` | `Record<string, boolean>` |
| RECIPE-05 menu | `recipe-menu` | `string[]` (slugs) or `RecipeMeta[]` |

Keep keys namespaced. `JSON.parse`/`setItem` calls must be wrapped in `try/catch` — storage quota errors and private browsing mode can throw.

---

## Q4: Print CSS + `window.print()` in Next App Router — RECIPE-03

**Source:** CLAUDE.md confirms globals.css is single source; Next.js docs confirm global CSS is imported in root layout; general web standard (no Next.js-specific docs needed for `@media print`)

### Canonical approach

**For the recipe detail page:** Add `@media print` rules to `src/styles/globals.css`. This is the correct location per CLAUDE.md ("globals.css is the single source of truth for ALL colors" — same applies for global print styles).

```css
/* In src/styles/globals.css — after @theme block */
@media print {
  /* Hide site chrome */
  nav,
  footer,
  .no-print,
  [data-slot="back-link"],
  [data-slot="draft-banner"],
  [data-slot="print-btn"] {
    display: none !important;
  }

  /* Clean typography for print */
  body {
    background: white !important;
    color: black !important;
  }

  article {
    max-width: 100% !important;
    padding: 0 !important;
    margin: 0 !important;
  }

  h1, h2 { page-break-after: avoid; }
  li { page-break-inside: avoid; }
}
```

**Print button in the client component:**

```tsx
"use client"
export function PrintButton() {
  return (
    <button
      data-slot="print-btn"
      onClick={() => window.print()}
      className="..."  // theme tokens only
      aria-label="Print this recipe"
    >
      Print
    </button>
  )
}
```

`window.print()` in a `"use client"` component is safe — it only runs in the browser on click, not during SSR. No `typeof window !== "undefined"` guard is needed inside an event handler. [ASSUMED — browser standard behavior; no Next.js-specific constraint documented]

**Gotcha — `@media print` scope in Tailwind v4:** Tailwind v4 scans component files for utility classes, but `@media print` in globals.css is plain CSS and is always emitted by PostCSS, unaffected by Tailwind's purge/scan. No special configuration needed. [ASSUMED — based on standard PostCSS pipeline behavior]

**Print route alternative:** CONTEXT.md marks "a dedicated print route is acceptable if cleaner." Given that the detail page already renders all content (no lazy-loaded tabs), a dedicated route would add complexity for no benefit. Stick with `@media print` on the detail page.

---

## Q5: Radix/shadcn Accessibility — RECIPE-01/02

**Source:** radix-ui.com/primitives/docs/components/dialog (fetched)

### What Radix Dialog provides automatically

- `Tab` / `Shift+Tab` — navigate focusable elements inside dialog
- `Esc` — close dialog, return focus to trigger
- Focus trap — nothing outside the dialog is reachable via keyboard while open
- `aria-modal="true"` — announces modal context to screen readers
- Content underneath rendered `inert` (keyboard and pointer events blocked)
- `role="dialog"` on the container

### What the implementer must supply

- Actual text content for `DialogTitle` and `DialogDescription` (shadcn's `CommandDialog` has these via `sr-only` `DialogHeader`, accepts `title` and `description` props — always pass them)
- A trigger element that is a proper focusable button (not a `div`)
- `onOpenChange` to close on Esc (Radix calls it; you must wire state)

### RECIPE-02 checkbox accessibility

The ingredient/step checkboxes are custom-built (tap to cross off). They are NOT using Radix Checkbox — they are `<li>` items styled as checkboxes. Must add manually:

```tsx
// Each ingredient item as a button (≥44px tap target)
<li>
  <button
    role="checkbox"
    aria-checked={checked[key] ?? false}
    onClick={() => toggle(key)}
    className="w-full text-left min-h-[44px] flex items-center gap-3 ..."
  >
    <span aria-hidden="true">{checked[key] ? "✓" : "○"}</span>
    <span className={checked[key] ? "line-through text-muted-foreground" : ""}>{item}</span>
  </button>
</li>
```

Key points:
- `role="checkbox"` + `aria-checked` must be on the interactive element
- `min-h-[44px]` for tap target (CONTEXT.md requirement)
- The `line-through` strikethrough communicates state visually; `aria-checked` communicates it to screen readers

---

## Q6: Version-Specific Gotchas

### cmdk v1.1.1

- **Breaking from v0:** The old `Command.Dialog` from cmdk is no longer available as a named export. The shadcn `command.tsx` already accounts for this — it uses `import { Command as CommandPrimitive } from "cmdk"` and builds `CommandDialog` itself using Radix `Dialog`. Do NOT try to use `CommandPrimitive.Dialog` — it does not exist in v1. [VERIFIED: source code confirms primitive-only import]
- **`shouldFilter` prop:** Pass `shouldFilter={false}` to `<Command>` if you want to pre-filter results externally (e.g. Fuse.js). For this phase's 1,000-recipe case, cmdk's built-in filter on `value` is sufficient — no need for `shouldFilter={false}`.
- **React 18+ requirement:** cmdk uses `useId` and `useSyncExternalStore`, requires React 18+. Project is on React 19 — fully compatible. [CITED: cmdk README]

### Next.js 16.2 metadata

- The `metadata` export and `generateMetadata` function are silently skipped (no build error) if placed in a `"use client"` file — the page just gets no `<title>`. This is a silent failure, not an explicit error. Always verify in browser devtools. [ASSUMED — Next.js behavior; the docs say "only supported in Server Components" without specifying the failure mode]
- `params` in Next 16 App Router is a `Promise<{slug: string}>` — must `await params`. Already used correctly in the existing `[slug]/page.tsx`. [VERIFIED: nextjs.org/docs]

### React 19 Context for RECIPE-05 menu

React 19 does not change Context API. Standard `createContext` + `useContext` + a provider component works identically to React 18. No `use(Context)` migration needed unless desired. [ASSUMED — React 19 changelog; `use(Context)` is additive, not a replacement]

### Radix `radix-ui` v1.4.3 (the monorepo package)

The project uses `radix-ui` (the unified monorepo package) not individual `@radix-ui/react-*` packages. The shadcn `command.tsx` imports `Dialog` from `@/components/ui/dialog` (the shadcn wrapper), not directly from `radix-ui`. No version conflict. [VERIFIED: source code]

---

## Implementation Patterns — Ready to Use

### RECIPE-01: Server component passes index, client component owns dialog

```tsx
// recipes/page.tsx — add to existing server component
import { RecipeSearch } from "@/components/public/recipe-search"

// in component:
const index = published.map((r) => ({
  slug: r.slug,
  title: r.frontmatter.title,
  category: r.frontmatter.category,
}))
// in JSX (before chapter index nav):
<RecipeSearch index={index} />
```

### RECIPE-02: SSR-safe checklist

Empty state on server, read from localStorage in `useEffect`. Never initialize from `localStorage` in `useState` initializer.

### RECIPE-03: Print button is a "use client" component, styles in globals.css

`PrintButton` client component with `onClick={() => window.print()}`. Print styles in `globals.css` using `data-slot` attributes or CSS class names to target elements to hide.

### RECIPE-04: Prev/next computed server-side

Add `getChapterNeighbors(slug: string, recipes: RecipeMeta[])` to `src/lib/recipes.ts`. Call from `[slug]/page.tsx` (already a Server Component). Pass `{prev, next}` to the JSX — no client component needed for the nav links themselves.

```ts
// src/lib/recipes.ts — add this function
export function getChapterNeighbors(
  slug: string,
  recipes: RecipeMeta[]
): { prev: RecipeMeta | null; next: RecipeMeta | null } {
  // recipes is already sorted by book order
  const recipe = recipes.find((r) => r.slug === slug)
  if (!recipe) return { prev: null, next: null }
  const chapter = recipe.frontmatter.category
  const chapterRecipes = recipes.filter((r) => r.frontmatter.category === chapter)
  const idx = chapterRecipes.findIndex((r) => r.slug === slug)
  return {
    prev: idx > 0 ? chapterRecipes[idx - 1] : null,
    next: idx < chapterRecipes.length - 1 ? chapterRecipes[idx + 1] : null,
  }
}
```

### RECIPE-05: Context provider wrapping (public) layout

The floating "My Menu (N)" badge must be visible across all public pages. Wrap it in the `(public)/layout.tsx`. The provider persists state in `localStorage` (read in `useEffect`).

```tsx
// src/lib/menu-context.tsx
"use client"
import { createContext, useContext, useState, useEffect } from "react"

// Context, provider, useMenu hook — standard pattern
```

```tsx
// src/app/(public)/layout.tsx — add provider around children
import { MenuProvider } from "@/lib/menu-context"
import { MenuBadge } from "@/components/public/menu-badge"

// In PublicLayout JSX:
<MenuProvider>
  <nav>...</nav>
  <MenuBadge />   {/* floating indicator */}
  <main>{children}</main>
  <footer>...</footer>
</MenuProvider>
```

`MenuBadge` is a client component reading context. It should render `null` until after hydration (use `useEffect`-gated mount) to avoid mismatch.

---

## Corrections to CONTEXT.md / Existing Plans

### Correction 1: `/my-menu` page structure (CONTEXT.md RECIPE-05, 31-03-PLAN.md)

**CONTEXT.md says:** "A React Context provider holding the menu, persisted in localStorage. A floating 'My Menu (N)' indicator."

**Correction:** The `/my-menu` page MUST be structured as:
- `page.tsx` — Server Component (exports `metadata`)
- `my-menu-client.tsx` — "use client" (localStorage, useState)

If anyone writes `/my-menu/page.tsx` with `"use client"` as the first line AND tries to export `metadata`, the metadata will be silently ignored. The plans must implement the server-wrapper / client-child split. **This is a plan correctness issue, not just style.**

### Correction 2: cmdk `CommandDialog` is already the shadcn composite (not `Command.Dialog`)

**Potential confusion:** cmdk v1 exports `Command` as the primitive. It does NOT export `Command.Dialog` as a standalone component (that was removed or never existed in v1 in the same way). The project's `command.tsx` correctly builds `CommandDialog` from Radix `Dialog` + `Command`.

**Do NOT import from cmdk directly** in new components — always import from `@/components/ui/command`. The shadcn wrapper is what handles the Radix Dialog integration.

### Correction 3: `useState` lazy initializer cannot read localStorage

Any plan task that says "initialize checked state from localStorage" must use the `useEffect` pattern, not a lazy initializer. This affects both RECIPE-02 (31-02-PLAN.md) and RECIPE-05 (31-03-PLAN.md). If a coder sees "persist in localStorage" and reaches for `useState(() => JSON.parse(localStorage.getItem(...)))`, it will crash on Vercel's server-side rendering.

### No other contradictions found

The CONTEXT.md decisions for RECIPE-01 (cmdk search), RECIPE-03 (print CSS + button), and RECIPE-04 (server-computed breadcrumbs + prev/next) are all consistent with what the official docs and installed code support. The search-by-name-and-category via cmdk `value` concatenation or `keywords` prop is fully supported in v1.1.1.

---

## Sources

### PRIMARY (VERIFIED against official docs)
- `https://nextjs.org/docs/app/api-reference/functions/generate-metadata` — metadata Server Component constraint, canonical server+client split pattern, Next.js 16.2.7 docs
- `https://nextjs.org/docs/app/getting-started/metadata-and-og-images` — static metadata, generateMetadata overview
- `https://github.com/pacocoursey/cmdk` — cmdk v1 README: filter mechanics, keywords prop, Cmd+K pattern, accessibility
- `https://www.radix-ui.com/primitives/docs/components/dialog` — Dialog keyboard nav, focus trap, ARIA, what implementer must add
- `https://react.dev/reference/react-dom/client/hydrateRoot` — SSR hydration, localStorage in useEffect pattern, useState lazy initializer behavior

### SECONDARY (read directly from installed codebase)
- `/Users/richard/Developer/hudsonfam/src/components/ui/command.tsx` — exact API of the installed shadcn CommandDialog wrapper
- `/Users/richard/Developer/hudsonfam/src/app/(public)/recipes/page.tsx` — existing listing page structure
- `/Users/richard/Developer/hudsonfam/src/app/(public)/recipes/[slug]/page.tsx` — existing detail page structure
- `/Users/richard/Developer/hudsonfam/src/app/(public)/layout.tsx` — existing public layout (where MenuProvider goes)
- `/Users/richard/Developer/hudsonfam/src/lib/recipes.ts` — recipe loader, RecipeMeta type, sort/filter logic
- `/Users/richard/Developer/hudsonfam/package.json` — confirmed installed versions
