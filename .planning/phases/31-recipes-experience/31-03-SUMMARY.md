---
phase: 31-recipes-experience
plan: "03"
subsystem: recipes
tags: [menu, localStorage, context, print, floating-indicator]
dependency_graph:
  requires: [31-01, 31-02]
  provides: [recipe-menu, menu-provider, menu-indicator, my-menu-page]
  affects:
    - src/components/public/menu-provider.tsx
    - src/components/public/add-to-menu-button.tsx
    - src/components/public/menu-indicator.tsx
    - src/app/(public)/layout.tsx
    - src/app/(public)/recipes/page.tsx
    - src/app/(public)/recipes/[slug]/page.tsx
    - src/app/(public)/my-menu/page.tsx
    - src/app/(public)/my-menu/menu-client.tsx
    - src/styles/globals.css
tech_stack:
  added: []
  patterns: [react-context, useEffect-localStorage-hydration, server-client-split-page, media-print-css]
key_files:
  created:
    - src/components/public/menu-provider.tsx
    - src/components/public/add-to-menu-button.tsx
    - src/components/public/menu-indicator.tsx
    - src/app/(public)/my-menu/page.tsx
    - src/app/(public)/my-menu/menu-client.tsx
  modified:
    - src/app/(public)/layout.tsx
    - src/app/(public)/recipes/page.tsx
    - src/app/(public)/recipes/[slug]/page.tsx
    - src/styles/globals.css
decisions:
  - "Server page.tsx / client menu-client.tsx split for /my-menu: a 'use client' page cannot export metadata (silently ignored), so server wrapper is mandatory for the tab title"
  - "MenuProvider wraps both <main> and <MenuIndicator /> in layout.tsx so useMenu() resolves on every public page without a separate provider"
  - "localStorage hydrated in useEffect only (empty initial state) to avoid SSR hydration mismatch — same pattern as recipe-checklist.tsx in 31-02"
  - "eslint-disable block on menu-provider.tsx SSR-safe useEffect — react-hooks/set-state-in-effect rule is overly broad for this canonical pattern"
  - ".print-menu added to @media print alongside .print-recipe (extend selector list, no duplication)"
metrics:
  duration: "~20 minutes"
  completed: "2026-06-02T11:30:00Z"
  tasks_completed: 4
  files_changed: 9
---

# Phase 31 Plan 03: Build-Your-Own-Menu Summary

## One-liner

React Context menu provider (localStorage key `hudson-menu`) wired into the public layout with a floating My Menu indicator, Add to menu buttons on listings + detail, and a /my-menu page (server metadata wrapper + client view) grouped by category with remove/clear/print.

## What Was Built

### Task 1 — MenuProvider context + useMenu hook

Created `src/components/public/menu-provider.tsx`:
- `"use client"` directive
- `MenuItem = { slug: string; title: string; category: string }`
- `MenuContext` with `{ items, add, remove, clear, has, count }`
- localStorage key: `hudson-menu` storing JSON `MenuItem[]`
- SSR-safe: state initializes empty (server + first paint match), `useEffect` hydrates after mount
- `loadFromStorage`: try/catch JSON.parse, validates array of `{slug, title, category}` strings; corrupt data falls back to `[]` (T-31-05 mitigation)
- `add` is idempotent by slug (no duplicates)
- `useMenu()` throws if used outside provider
- `hydrated` flag prevents writing back to localStorage before hydration is complete

### Task 2a — AddToMenuButton + MenuIndicator

Created `src/components/public/add-to-menu-button.tsx`:
- `"use client"`, props `{ slug, title, category }`
- Toggle: "In menu ✓" (secondary variant) / "+ Add to menu" (outline variant)
- `min-h-11` tap target, `aria-pressed` + `aria-label` for accessibility
- Calls `add({ slug, title, category })` or `remove(slug)` via `useMenu()`

Created `src/components/public/menu-indicator.tsx`:
- `"use client"`, fixed bottom-right floating pill, `z-50`
- Shows "My Menu (N)" with clipboard SVG icon; hidden when `count === 0`
- `no-print` class, `min-h-11`, theme tokens only (`bg-card border-border text-foreground hover:border-primary/40 hover:text-primary`)

### Task 2b — Layout + page wiring

Updated `src/app/(public)/layout.tsx`:
- Imports `MenuProvider` + `MenuIndicator`
- Replaced `<main className="flex-1">{children}</main>` with `<MenuProvider><main className="flex-1">{children}</main><MenuIndicator /></MenuProvider>`
- `MenuIndicator` is a child of `MenuProvider` — `useMenu()` resolves on every public page

Updated `src/app/(public)/recipes/page.tsx`:
- `AddToMenuButton` rendered in each listing `li` alongside the recipe `Link`
- Passes `r.slug`, `r.frontmatter.title`, `r.frontmatter.category || "Other"`

Updated `src/app/(public)/recipes/[slug]/page.tsx`:
- `AddToMenuButton` rendered in the breadcrumbs row (alongside `RecipePrintButton`)
- Row already carries `no-print` class — button is hidden on print

### Task 3 — /my-menu page

Created `src/app/(public)/my-menu/page.tsx` (server component):
- Exports `const metadata: Metadata = { title: "My Menu | Hudson Family", ... }`
- Renders `<MenuView />` from `"./menu-client"` — tab title is honored

Created `src/app/(public)/my-menu/menu-client.tsx` (`"use client"`):
- Reads `useMenu()` — works because `/my-menu` is inside the `(public)` layout which wraps in `MenuProvider`
- Groups items by category into a `Map`, renders each as a `<section>` with heading + list
- Each item: recipe title `Link` to `/recipes/{slug}` + "Remove" button (`min-h-11`)
- Header buttons: "Print menu" (`window.print()`) + "Clear all" — both `no-print`
- Empty state: "Your menu is empty" message + Browse recipes link
- Back-to-recipes link at bottom (`no-print`)

Updated `src/styles/globals.css`:
- Extended `.print-recipe` selector to `.print-recipe, .print-menu` so `/my-menu` printable region renders in the same `@media print` block — no duplication

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] ESLint error: react-hooks/set-state-in-effect in menu-provider.tsx**
- **Found during:** Task 3 lint run (same error class as 31-02 recipe-checklist.tsx)
- **Issue:** `react-hooks/set-state-in-effect` fires on both `setItems(loadFromStorage())` and `setHydrated(true)` inside the mount `useEffect`. The canonical SSR-safe localStorage hydration pattern has no alternative that avoids this — state must be empty on server, then set client-side after mount.
- **Fix:** Added `/* eslint-disable react-hooks/set-state-in-effect */` / `/* eslint-enable */` block around the two calls, with rationale comment. Same approach as 31-02.
- **Files modified:** `src/components/public/menu-provider.tsx`
- **Commit:** 3c5e2f1

## Known Stubs

None. Menu is wired end-to-end: localStorage persists across reload, indicator reflects live count, /my-menu reads from context, print is functional.

## Threat Flags

No new threat surface beyond plan's threat model.
- T-31-05 (tampered localStorage payload): mitigated by `loadFromStorage` try/catch + shape validation.
- T-31-06 (menu contents): accepted — public recipe titles/categories only, no PII.
- T-31-SC: no new packages installed.

## Self-Check: PASSED

- `src/components/public/menu-provider.tsx` — FOUND
- `src/components/public/add-to-menu-button.tsx` — FOUND
- `src/components/public/menu-indicator.tsx` — FOUND
- `src/app/(public)/my-menu/page.tsx` — FOUND (exports metadata, no "use client")
- `src/app/(public)/my-menu/menu-client.tsx` — FOUND (has "use client", useMenu, window.print, no-print)
- `src/styles/globals.css` contains `.print-menu` in @media print — FOUND
- Commit 62881a4 (Task 1 MenuProvider) — FOUND
- Commit 13529d9 (Task 2a components) — FOUND
- Commit 0ac58e5 (Task 2b wiring) — FOUND
- Commit 3c5e2f1 (Task 3 /my-menu page) — FOUND
- `npm run build` — exit 0, /my-menu static route generated
- `npm test` — 245 passed, 1 skipped
- `npm run lint` — 0 errors, 1 pre-existing warning (data-table.tsx)
