---
phase: 35-navbar-footer-ia
reviewed: 2026-06-02T21:00:00Z
depth: standard
files_reviewed: 4
files_reviewed_list:
  - src/components/public/nav-link.tsx
  - src/app/(public)/layout.tsx
  - src/components/public/mobile-nav.tsx
  - src/__tests__/nav-footer.test.ts
findings:
  critical: 0
  warning: 3
  info: 3
  total: 6
status: issues_found
---

# Phase 35: Code Review Report

**Reviewed:** 2026-06-02T21:00:00Z
**Depth:** standard
**Files Reviewed:** 4
**Status:** issues_found

## Summary

Reviewed the Phase 35 navbar/footer IA changes: the new client-leaf `NavLink`,
the Server Component `layout.tsx` rewiring (reorder, relabel, footer links,
`Suspense` wrapping), the `aria-current` addition in `MobileNav`, and the Wave 0
test suite.

Verified correct on the items called out by the phase brief:
- **Server/Client boundary is intact.** `layout.tsx` has no `"use client"`
  directive and imports no client-only hooks; the dynamic surface is isolated in
  the `NavLink`/`MobileNav` leaves. `"use client"` correctly sits only at the leaves.
- **Suspense is required, not cargo-cult.** `next.config.ts` sets
  `cacheComponents: true`; under Cache Components `usePathname()` is a dynamic API
  that must be wrapped in a `Suspense` boundary or it errors at prerender on
  statically-shelled routes (e.g. `/photos/[album]`). Both boundaries are present
  and the code comments are accurate.
- **No raw Tailwind palette colors.** Full-palette grep (slate/gray/zinc/neutral/
  stone/red/orange/amber/yellow/lime/green/emerald/teal/cyan/sky/blue/indigo/
  violet/purple/fuchsia/pink/rose across text/bg/border/ring/fill/stroke/etc.)
  returned nothing in the three component files. (`text-white` on `layout.tsx:28`
  is pre-existing in the logo badge and untouched by this diff — out of scope.)
- **Accessibility is sound.** `aria-current` uses `"page" : undefined` (omits the
  attribute when inactive rather than emitting `aria-current="false"`), in both
  desktop and mobile. The external "Built by" link has `rel="noopener noreferrer"`.
- **Tests pass** (16/16) and the footer present/absent assertions match the diff.

No blockers. The findings below are a latent active-route prefix-match bug,
duplicated active-route logic, a UX gap in the mobile Suspense fallback, plus
test-coverage and minor info items.

## Warnings

### WR-01: `pathname.startsWith(href)` false-positives on sibling routes sharing a prefix

**File:** `src/components/public/nav-link.tsx:14`, `src/components/public/mobile-nav.tsx:61-64`
**Issue:** Active-route detection for non-root links is `pathname.startsWith(href)`.
This matches not just descendants of `href` but any path whose string begins with
`href`, including unrelated siblings. For `href="/recipes"`, a route at
`/recipes-archive` (or `/recipes-foo`) would resolve `isActive = true` and wrongly
get the active treatment (`border-b border-primary` + `aria-current="page"`).
Same for `/events` → `/events-2026`, `/photos` → `/photos-old`, etc.

It is currently *latent*: no existing `(public)` route is a prefix-sibling of a
nav href (routes are `/recipes`, `/photos`, `/events`, `/richard-hudson-sr`,
`/my-menu`). But it is a correctness landmine that fires silently the moment such
a route is added, and it emits a misleading `aria-current="page"` to assistive
tech. The intent is "this href OR a descendant of it" — match on a path-segment
boundary, not a raw string prefix.

**Fix:** Gate the prefix match on a trailing slash (or exact equality):
```ts
const isActive =
  href === "/"
    ? pathname === "/"
    : pathname === href || pathname.startsWith(`${href}/`);
```
This treats `/recipes` and `/recipes/123` as active while leaving `/recipes-archive`
inactive. Apply identically in both `nav-link.tsx` and `mobile-nav.tsx` (see WR-02).

### WR-02: Active-route logic duplicated across NavLink and MobileNav

**File:** `src/components/public/nav-link.tsx:14`, `src/components/public/mobile-nav.tsx:61-64`
**Issue:** The exact `isActive` computation
(`href === "/" ? pathname === "/" : pathname.startsWith(href)`) is copy-pasted in
two files. The WR-01 fix has to be made in both places or the desktop and mobile
navs will disagree about which link is active — a classic drift bug. Two
independent copies of the same routing predicate is a maintenance hazard
regardless of the WR-01 bug.

**Fix:** Extract a single shared helper and call it from both components:
```ts
// e.g. src/lib/nav.ts
export function isNavActive(pathname: string, href: string): boolean {
  return href === "/"
    ? pathname === "/"
    : pathname === href || pathname.startsWith(`${href}/`);
}
```
Then `const isActive = isNavActive(pathname, href);` in NavLink and
`const isActive = isNavActive(pathname, link.href);` in MobileNav.

### WR-03: Mobile Suspense fallback hides the entire mobile nav, including the theme toggle and menu trigger

**File:** `src/app/(public)/layout.tsx:59-61`
**Issue:** The desktop boundary degrades gracefully — its fallback renders the five
labels as inactive `<span>`s, and `ThemeToggle`/`UserNav` sit *outside* the
boundary so they stay live. The mobile boundary does the opposite: the fallback is
a blank `<div className="md:hidden size-9" />` and the entire `MobileNav` (which
*contains* its own `ThemeToggle` and the hamburger `SheetTrigger`) is *inside* the
boundary. While suspended in the prerendered shell, a mobile user sees an empty
36px box with no way to open navigation and no theme toggle. Desktop and mobile
have inconsistent fallback fidelity for the same dynamic dependency (`usePathname`).

**Fix:** Render a non-interactive but visually-faithful placeholder (theme-toggle
silhouette + hamburger glyph) in the mobile fallback so the control affordance is
visible during the suspended frame, e.g.:
```tsx
<Suspense fallback={
  <div className="md:hidden flex items-center gap-1">
    <div className="size-9" aria-hidden />
    <div className="size-9 flex items-center justify-center text-muted-foreground" aria-hidden>
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    </div>
  </div>
}>
  <MobileNav links={navLinks} />
</Suspense>
```
(The boundary itself is correct and required — this is about fallback fidelity, not removing it.)

## Info

### IN-01: Test suite never exercises the active-route predicate edge cases

**File:** `src/__tests__/nav-footer.test.ts:32-34`
**Issue:** `usePathname` is hard-mocked to a single value (`'/recipes'`). The suite
asserts the happy-path active/inactive split for `/recipes` vs `/photos` but never
covers the predicate's risky branches: the root-path guard (does `href="/"` stay
inactive on `/recipes`?) and the prefix-collision case from WR-01 (does
`/recipes-archive` wrongly activate `/recipes`?). Because the mock is module-level,
these are exactly the cases that would have caught WR-01. The active-route logic is
the only real logic in this phase and it is effectively untested at the boundary.

**Fix:** Add cases that re-mock `usePathname` per-test (or via `vi.mocked`) for
`'/'` (Home active, others inactive) and `'/recipes-archive'` (Recipes inactive
under the fixed predicate). This converts WR-01 from latent to regression-guarded.

### IN-02: Mobile nav uses a template-literal className while NavLink uses `cn()`

**File:** `src/components/public/mobile-nav.tsx:71-74`
**Issue:** `MobileNav` builds its class string with a multi-line template literal
(leading/trailing whitespace baked into `className`), whereas the sibling `NavLink`
uses `cn()` from `@/lib/utils` (the project convention per CLAUDE.md). The raw
template literal also emits stray whitespace/newlines into the rendered `class`
attribute. Inconsistent with the conditional-class pattern used elsewhere in this
phase.

**Fix:** Use `cn()` for the conditional classes:
```tsx
className={cn(
  "px-3 py-2.5 rounded-md text-sm transition-colors",
  isActive
    ? "text-foreground bg-background"
    : "text-muted-foreground hover:text-foreground hover:bg-background"
)}
```

### IN-03: Desktop Suspense fallback renders non-interactive `<span>` labels

**File:** `src/app/(public)/layout.tsx:39-45`
**Issue:** The desktop fallback renders nav labels as plain `<span>`s — not links —
so during the suspended frame the primary navigation is visible but non-clickable
and not keyboard-focusable. This is an acceptable trade-off for a brief
prerender-shell frame (and avoids re-implementing routing in the fallback), but the
fallback is intentionally degraded; noting it so it is a known choice rather than
an oversight. (No `aria-current` in the fallback is correct — active state is
unknown until `usePathname` resolves.)

**Fix:** None required. If a focusable shell is desired, render `<Link>` elements
without active styling in the fallback instead of `<span>`s.

---

_Reviewed: 2026-06-02T21:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
