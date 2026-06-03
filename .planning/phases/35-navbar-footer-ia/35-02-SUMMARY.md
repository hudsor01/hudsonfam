---
phase: 35-navbar-footer-ia
plan: "02"
subsystem: navigation
tags: [navbar, footer, accessibility, tdd-green, aria-current, ia]
dependency_graph:
  requires: ["35-01"]
  provides: [NAV-01, NAV-02, NAV-03, FOOT-01, FOOT-02]
  affects: [src/app/(public)/layout.tsx, src/components/public/nav-link.tsx, src/components/public/mobile-nav.tsx]
tech_stack:
  added: []
  patterns: [usePathname active detection, root-guard isActive, Suspense for dynamic client hooks in Server Component layout]
key_files:
  created: []
  modified:
    - src/components/public/nav-link.tsx
    - src/app/(public)/layout.tsx
    - src/components/public/mobile-nav.tsx
decisions:
  - "Wrap desktop NavLink group in Suspense (same pattern as MobileNav) because usePathname() is dynamic data — builds failed on /photos/[album] without it"
  - "Active style: text-foreground font-medium border-b border-primary (all token-based, no raw Tailwind colors)"
metrics:
  duration: "~7 minutes"
  completed: "2026-06-03T01:51:21Z"
  tasks_completed: 3
  tasks_total: 3
  files_changed: 3
---

# Phase 35 Plan 02: Navbar/Footer IA — TDD GREEN Wave Summary

Active-route NavLink client component with `usePathname` + `aria-current="page"`, navLinks reordered and relabeled, footer expanded with Recipes + In Memory, mobile drawer gets `aria-current`. All 16 nav-footer tests GREEN; 223/223 suite GREEN; build passes.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Extract active-route NavLink client component | 6351126 | src/components/public/nav-link.tsx |
| 2 | Fix navLinks order/label, wire NavLink, add footer links | bc544a8 | src/app/(public)/layout.tsx |
| 3 | Add aria-current to active mobile drawer link | 5e08868 | src/components/public/mobile-nav.tsx |

## What Was Built

**nav-link.tsx** — Replaced the Wave 0 stub with a real `"use client"` component:
- `usePathname()` with root-guard isActive: exact match for `/`, `pathname.startsWith(href)` for others
- `aria-current={isActive ? "page" : undefined}`
- Active class: `text-foreground font-medium border-b border-primary` (all globals.css tokens)
- Inactive class: `text-muted-foreground hover:text-foreground`
- `cn()` for class merging

**layout.tsx** — Five changes:
1. navLinks reordered: Home, Recipes, Photos, Events, In Memory (Recipes before Photos)
2. Recipes label: "Grandma Hudson's Recipes" -> "Recipes"
3. `import { NavLink } from "@/components/public/nav-link"` added; inline `NavLink` function removed
4. Desktop nav links wrapped in `<Suspense>` fallback (static spans) — required because `usePathname()` is dynamic data; mirrors the existing MobileNav Suspense pattern
5. Footer expanded: Recipes + In Memory links added, order: Recipes, Photos, Events, In Memory

**mobile-nav.tsx** — Single line: `aria-current={isActive ? "page" : undefined}` added to the mapped nav Link. All existing logic (isActive computation, onClick, className) unchanged.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Desktop NavLink group needed Suspense wrapper**

- **Found during:** Task 2 — `npm run build` failed on `/photos/[album]`
- **Issue:** `NavLink` calls `usePathname()` (dynamic uncached data). When rendered directly in the Server Component `<nav>` without Suspense, Next.js 16 throws "Uncached data was accessed outside of <Suspense>" on dynamic routes. The same issue already existed for `MobileNav`, which is why the layout had `<Suspense>` around it. The desktop nav group was not in scope in the original plan.
- **Fix:** Wrapped the `navLinks.map(...)` in `<Suspense fallback={...}>` where the fallback renders static `<span>` elements with the inactive text style — identical pattern to the MobileNav wrapper already present.
- **Files modified:** `src/app/(public)/layout.tsx`
- **Commit:** bc544a8 (included in Task 2 commit)

## Test Results

- `npm test -- src/__tests__/nav-footer.test.ts`: **16/16 pass** (was 10 pass / 6 RED)
- `npm test` full suite: **223/223 pass**
- `npm run build`: **exits 0** (1036 static pages generated)

## Known Stubs

None — all three components are fully wired.

## Threat Flags

None — no new network endpoints, auth paths, or trust-boundary surface introduced. External "Built by" link preserves `rel="noopener noreferrer"` (T-35-03 mitigated).

## Self-Check: PASSED

- src/components/public/nav-link.tsx — exists, "use client" line 1, usePathname, aria-current, token-only styles
- src/app/(public)/layout.tsx — navLinks order correct, NavLink import present, inline function removed, Suspense wrapper added, footer has /recipes + /richard-hudson-sr
- src/components/public/mobile-nav.tsx — aria-current on active link, isActive logic unchanged
- Commits 6351126, bc544a8, 5e08868 — all present in git log
