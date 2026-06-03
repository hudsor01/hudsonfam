# Phase 35: Navbar & Footer IA — Research

**Researched:** 2026-06-03
**Domain:** Next.js 16 App Router navigation components — IA cleanup, active-route indication, mobile responsiveness, a11y
**Confidence:** HIGH (all findings from direct source inspection — no assumed knowledge)

## Summary

Phase 35 is a targeted refinement of two existing files: `src/app/(public)/layout.tsx` (which owns both the desktop nav and footer) and `src/components/public/mobile-nav.tsx` (the mobile Sheet drawer). No new primitives are needed — all required shadcn components (`Sheet`, `Link`) are already installed and in use.

The five success criteria are partially satisfied by the current code. Two criteria have specific, surgical gaps:

1. **NAV-01 gap:** The desktop nav link label for the recipes section reads `"Grandma Hudson's Recipes"` but the ROADMAP success criterion specifies the label `"Recipes"`. Every other link label matches. The link order in `navLinks` is `Home → Photos → Recipes → Events → In Memory` but the ROADMAP success criterion lists `Home → Recipes → Photos → Events → In Memory`.
2. **NAV-03 gap (desktop):** The `NavLink` component in `layout.tsx` is a Server Component with no `usePathname()` — it applies no active-route visual and no `aria-current`. The mobile drawer (`MobileNav`) already correctly computes `isActive` and applies active styling, but does NOT emit `aria-current="page"`.
3. **FOOT-01 gap:** The footer link list contains only `Photos` and `Events`. It is missing `Recipes` and `In Memory`. It also correctly omits Blog and Family (already pruned).
4. **NAV-02 / FOOT-02:** Mobile layout and footer responsiveness are structurally correct — the Sheet opens from left, `flex-col sm:flex-row` stacking is in place. No rewrite needed; only the label/order/link-set changes cascade into mobile automatically because both desktop and mobile derive from the same `navLinks` constant.
5. **NAV-03 (focus / a11y):** The Sheet is built on Radix Dialog, which provides correct modal a11y: focus trap while open, Esc to close, focus restoration on close. This is correct a11y for a modal drawer. The success criterion "without getting trapped" means global tab order works and focus returns after close — both already satisfied by Radix. No additional work needed beyond adding `aria-current`.

**Primary recommendation:** Three surgical changes to two files: (1) fix `navLinks` array in `layout.tsx` — correct label and order; (2) extract `NavLink` into a `"use client"` component that reads `usePathname()` and applies active styles + `aria-current`; (3) add `Recipes` and `In Memory` links to the footer in `layout.tsx`.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| NAV-01 | Navbar surfaces only: Home, Recipes, Photos, Events, In Memory — no dead links | navLinks array: label and order gaps documented below |
| NAV-02 | Navbar works on mobile — drawer opens, every link reachable, no overflow | Sheet drawer functional; inherits fix from NAV-01 automatically |
| NAV-03 | Active-route indication + keyboard/focus a11y in both desktop nav and mobile menu | Desktop NavLink: no usePathname, no active style, no aria-current; mobile: has active style, missing aria-current |
| FOOT-01 | Footer links = Recipes, Photos, Events, In Memory; no Blog/Family | Footer has Photos + Events only; missing Recipes + In Memory |
| FOOT-02 | Footer responsive, consistent with navbar; column stacking on mobile | flex-col sm:flex-row already in place — inherits from FOOT-01 link additions |
</phase_requirements>

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Desktop nav links + active-route | Frontend Server (layout shell) → Client leaf | — | layout.tsx is a Server Component; active-route requires `usePathname()` which is client-only; extract NavLink as a `"use client"` leaf component |
| Mobile drawer (Sheet) | Client (mobile-nav.tsx) | — | Already "use client"; Sheet requires browser interactivity |
| Footer links | Frontend Server (layout shell) | — | Static markup; no interactivity needed |
| Theme toggle | Client (theme-toggle.tsx) | — | Already "use client"; next-themes requires browser |
| User nav (sign in / avatar) | Client (user-nav.tsx) | — | Already "use client"; reads authClient.useSession() |
| MenuIndicator | Client (menu-indicator.tsx) | — | Already "use client"; reads useMenu() context |

---

## Current State Map (Exact Code Findings)

### navLinks array (layout.tsx line 10-16)

```typescript
const navLinks = [
  { href: "/", label: "Home" },
  { href: "/photos", label: "Photos" },
  { href: "/recipes", label: "Grandma Hudson's Recipes" },
  { href: "/events", label: "Events" },
  { href: "/richard-hudson-sr", label: "In Memory" },
];
```

**GAP vs. success criterion 1:**
- Order: `Home → Photos → Recipes → Events → In Memory`. ROADMAP requires `Home → Recipes → Photos → Events → In Memory` (Recipes before Photos).
- Label: `"Grandma Hudson's Recipes"` vs. ROADMAP `"Recipes"`. The ROADMAP success criterion says "Recipes" for the link label. This is a deliberate IA decision the planner must lock: the link label should be the short form `"Recipes"` (the page title `Grandma Hudson's Recipes` is on the page itself). **Flag for planner: confirm "Recipes" is the intended nav label.**
- Route: `/richard-hudson-sr` → verified: `src/app/(public)/richard-hudson-sr/page.tsx` exists.
- All 5 required routes exist in the codebase.

**This array is shared:** `MobileNav` receives `navLinks` as a prop, so fixing it in `layout.tsx` fixes both desktop and mobile simultaneously.

### Desktop NavLink (layout.tsx lines 95-110)

```typescript
function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="text-muted-foreground hover:text-foreground transition-colors contrast-more:underline"
    >
      {children}
    </Link>
  );
}
```

**GAP vs. NAV-03:**
- `NavLink` is defined in a Server Component file — it has no `"use client"` directive and cannot call `usePathname()`.
- No active visual style is applied to the current route.
- No `aria-current` attribute is set.
- Fix: extract `NavLink` into a new `"use client"` component (or convert the function in-file with a `"use client"` boundary at the top of a separate file), add `usePathname()`, apply active class, add `aria-current="page"`.

### Mobile nav (mobile-nav.tsx)

```typescript
const isActive =
  link.href === "/"
    ? pathname === "/"
    : pathname.startsWith(link.href);
```

Active styling:
```typescript
className={`
  px-3 py-2.5 rounded-md text-sm transition-colors
  ${isActive ? "text-foreground bg-background" : "text-muted-foreground hover:text-foreground hover:bg-background"}
`}
```

**Status:**
- `usePathname()` is already called — active detection is correct.
- Active visual style is applied (foreground color + bg-background).
- **GAP:** No `aria-current="page"` on the active link.
- `Sheet` is Radix Dialog (`import { Dialog as SheetPrimitive } from "radix-ui"`): provides focus trap while open, Esc to close, focus restoration on close. This is correct ARIA modal behavior.
- `SheetDescription` is rendered with `className="sr-only"` — accessible to screen readers.
- `SheetTitle` is rendered visibly — the dialog is correctly labeled.
- On link click: `onClick={() => setOpen(false)}` closes the drawer and returns focus to the trigger.

**Focus trap clarification for planner:** Radix Dialog intentionally traps Tab focus within the open Sheet. This is correct per ARIA `dialog` role spec. WCAG SC 2.1.2 (No Keyboard Trap) permits trapping focus in a dialog as long as Esc closes it and focus returns to the trigger — both are true here. The success criterion "without getting trapped" means the nav item Tab sequence works and users can exit the drawer — already satisfied. No additional a11y work needed for the Sheet itself beyond adding `aria-current`.

### Footer (layout.tsx lines 59-90)

```typescript
<footer className="border-t border-border">
  <div className="px-5 sm:px-7 py-6 flex flex-col sm:flex-row justify-between gap-4">
    <div className="flex flex-col gap-1">
      <span className="text-sm text-muted-foreground font-medium">The Hudson Family</span>
      <span className="text-xs text-text-dim">Dallas, TX</span>
    </div>
    <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-text-dim">
      <Link href="/photos" className="hover:text-muted-foreground transition-colors">Photos</Link>
      <Link href="/events" className="hover:text-muted-foreground transition-colors">Events</Link>
    </div>
  </div>
  ...copyright row...
</footer>
```

**GAP vs. FOOT-01:**
- Footer has: Photos, Events.
- Required: Recipes, Photos, Events, In Memory.
- Missing: Recipes (`/recipes`), In Memory (`/richard-hudson-sr`).
- Blog and Family are correctly absent (pruned in Phase 32).

**FOOT-02 status:**
- `flex-col sm:flex-row` is already in place on the main footer row — column stacking on mobile is already correct.
- `flex-wrap gap-x-6 gap-y-2` on the link group handles overflow gracefully when 4 links are present.
- No overflow issue anticipated from adding 2 more links.

### Color token compliance

All current nav/footer classes use only semantic tokens: `text-muted-foreground`, `text-foreground`, `border-border`, `bg-background`, `bg-card`, `text-text-dim`, `text-accent`. Zero raw Tailwind color names (confirmed by inspection). Active-route styling additions MUST continue this pattern.

**Available tokens for active state:**
- `text-foreground` + `bg-background` — already used in mobile active state (consistent choice)
- `text-primary` — terracotta (`#c0673f` light / OKLCH blue dark) — suitable for an active underline/accent
- `font-medium` or `font-semibold` — weight change for active

---

## Architecture Patterns

### Pattern 1: Active NavLink as "use client" Leaf

The correct Next.js 16 App Router pattern is to keep `layout.tsx` as a Server Component and extract only the interactive leaf into a `"use client"` component. [ASSUMED — Next.js App Router standard pattern, consistent with CLAUDE.md "use client only at leaves"]

```typescript
// src/components/public/nav-link.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface NavLinkProps {
  href: string;
  children: React.ReactNode;
}

export function NavLink({ href, children }: NavLinkProps) {
  const pathname = usePathname();
  const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "transition-colors contrast-more:underline",
        isActive
          ? "text-foreground font-medium"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      {children}
    </Link>
  );
}
```

The in-file `NavLink` function in `layout.tsx` would be replaced with this import.

### Pattern 2: Shared navLinks array as the single source

Both desktop nav and mobile nav already derive from the same `navLinks` constant. The footer link set differs from nav (no Home) — this is intentional and correct. Footer should have its own inline constant or array.

### Recommended footer link set

```typescript
const footerLinks = [
  { href: "/recipes", label: "Recipes" },
  { href: "/photos", label: "Photos" },
  { href: "/events", label: "Events" },
  { href: "/richard-hudson-sr", label: "In Memory" },
];
```

This can be rendered in the existing `flex-wrap` container in the footer.

### Anti-Patterns to Avoid

- **Don't use `navigation-menu.tsx` (Radix NavigationMenu):** The current nav is a simple horizontal link list — NavigationMenu adds dropdown/hover panel infrastructure that is not needed and would increase complexity. The existing `Link` + `usePathname()` pattern is correct for this IA.
- **Don't call `usePathname()` in a Server Component:** It will throw. Extract to a `"use client"` leaf.
- **Don't use raw Tailwind colors in active state:** Use `text-foreground`, `text-primary`, etc. from globals.css tokens only.
- **Don't use `String.prototype.startsWith` for exact-match routes without the root-path guard:** The current code already handles this correctly (`href === "/" ? pathname === "/" : pathname.startsWith(href)`).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Mobile drawer | Custom CSS drawer/offcanvas | `Sheet` from `@/components/ui/sheet` | Already in use; Radix Dialog provides focus trap, Esc, ARIA, animation |
| Nav links | Custom router hook | Next.js `usePathname()` | Built-in, SSR-safe, already used in MobileNav |
| Focus management | Custom focus trap | Radix Dialog (via Sheet) | WAI-ARIA compliant, Esc handling, return focus — all automatic |

---

## Common Pitfalls

### Pitfall 1: `usePathname()` in Server Component
**What goes wrong:** TypeScript compile error + Next.js runtime error: "You're importing a component that needs `usePathname`. This only works in a Client Component."
**Why it happens:** `layout.tsx` is a Server Component. The inline `NavLink` function has no `"use client"` directive.
**How to avoid:** Extract `NavLink` to a separate file with `"use client"` as the first line.
**Warning signs:** "You're importing a component that needs..." error in the build output.

### Pitfall 2: `pathname.startsWith("/recipes")` matching `/richard-hudson-sr`
**What goes wrong:** Not a problem here — no link prefix overlaps. `/richard-hudson-sr` does not start with any other link's href. Safe as-is.

### Pitfall 3: `pathname.startsWith("/r")` style ambiguity
**What goes wrong:** If `/recipes` and `/richard-hudson-sr` shared a prefix. They share `/r` but the full startsWith check is on the full href, so no collision.

### Pitfall 4: Footer link hover class color
**What goes wrong:** Current footer links use `hover:text-muted-foreground` — this actually darkens text from `text-text-dim`. Adding new links must keep the same hover class for visual consistency.
**How to avoid:** Copy the existing `className` exactly when adding the two missing links.

### Pitfall 5: `SheetContent` `className` prop — bg-card vs bg-background
**What goes wrong:** The mobile drawer currently uses `className="w-[280px] bg-card"`. This is a semantic token and correct. Do not change.

---

## Validation Architecture

> `workflow.nyquist_validation` key is absent in `.planning/config.json` — treated as enabled.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 2.x + happy-dom + Testing Library |
| Config file | `vitest.config.ts` |
| Quick run command | `npm test` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| NAV-01 | navLinks array contains exactly 5 links: Home, Recipes, Photos, Events, In Memory; label "Recipes" not "Grandma Hudson's Recipes" | unit (file read) | `npm test -- --reporter=verbose src/__tests__/nav-footer.test.ts` | ❌ Wave 0 |
| NAV-01 | navLinks order: Home → Recipes → Photos → Events → In Memory | unit (file read) | same | ❌ Wave 0 |
| NAV-02 | Mobile: all 5 links present in MobileNav render | unit (RTL render) | same | ❌ Wave 0 |
| NAV-03 | Desktop NavLink renders `aria-current="page"` for active route | unit (RTL + mock usePathname) | same | ❌ Wave 0 |
| NAV-03 | Mobile link renders `aria-current="page"` for active route | unit (RTL + mock usePathname) | same | ❌ Wave 0 |
| FOOT-01 | Footer contains links to /recipes, /photos, /events, /richard-hudson-sr | unit (file read or RTL) | same | ❌ Wave 0 |
| FOOT-01 | Footer does NOT contain /blog or /family | unit (file read) | same | ❌ Wave 0 |
| FOOT-02 | Footer has flex-col sm:flex-row class (column stacking on mobile) | unit (file read) | same | ❌ Wave 0 |

**Manual-only checks (cannot be automated):**
- 375px viewport: no overflow/clipping — visual browser check
- Tab key focus traversal through all nav items — browser keyboard navigation check
- Visual active state at each route — browser navigation check

### Sampling Rate
- **Per task commit:** `npm test`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/__tests__/nav-footer.test.ts` — new test file covering NAV-01, NAV-02, NAV-03, FOOT-01, FOOT-02

**Approach:** A mix of file-read assertions (checking layout.tsx source for link presence — same pattern as the existing `prod-readiness.test.ts` line 930 backlink test) and RTL render tests for the `NavLink` component with a mocked `usePathname`.

---

## Security Domain

This phase touches only static navigation markup and a `usePathname()` client hook. No auth, no input, no data fetching, no crypto.

| ASVS Category | Applies | Note |
|---------------|---------|------|
| V2 Authentication | no | No auth changes |
| V3 Session Management | no | No session changes |
| V4 Access Control | no | All routes public nav links |
| V5 Input Validation | no | No user input |
| V6 Cryptography | no | No crypto |

**No security work required in this phase.**

---

## Exact Gap Summary (the planner's task list)

| # | File | Change | Req |
|---|------|--------|-----|
| 1 | `src/app/(public)/layout.tsx` | Fix `navLinks` order to `Home → Recipes → Photos → Events → In Memory` | NAV-01 |
| 2 | `src/app/(public)/layout.tsx` | Change label `"Grandma Hudson's Recipes"` → `"Recipes"` | NAV-01 |
| 3 | `src/components/public/nav-link.tsx` (new file) | Extract `NavLink` as `"use client"` component with `usePathname()`, active style (`text-foreground font-medium`), `aria-current="page"` | NAV-03 |
| 4 | `src/app/(public)/layout.tsx` | Replace inline `NavLink` function with import from new nav-link.tsx | NAV-03 |
| 5 | `src/components/public/mobile-nav.tsx` | Add `aria-current={isActive ? "page" : undefined}` to the active link | NAV-03 |
| 6 | `src/app/(public)/layout.tsx` footer section | Add `<Link href="/recipes">Recipes</Link>` and `<Link href="/richard-hudson-sr">In Memory</Link>` to the footer link group, matching existing className | FOOT-01 |
| 7 | `src/__tests__/nav-footer.test.ts` (new file) | Wave 0 tests covering all 5 criteria | NAV-01/02/03, FOOT-01/02 |

**No other files need to change.** `MobileNav` automatically gets the corrected link array because it receives `navLinks` as a prop. Footer responsiveness is already correct — adding two links does not change the flex layout.

---

## Open Questions

1. **Nav link label: "Recipes" vs "Grandma Hudson's Recipes"**
   - What we know: ROADMAP success criterion specifies "Recipes". Current code has the full "Grandma Hudson's Recipes".
   - What's unclear: Whether the longer label was an intentional identity choice or an oversight.
   - Recommendation: Default to "Recipes" per ROADMAP spec. The page itself has the full title. Planner should treat this as confirmed unless owner overrides.

2. **Desktop active-route visual: underline vs background vs font-weight**
   - What we know: Mobile uses `bg-background text-foreground`. Desktop currently has no active state.
   - What's unclear: Whether the owner prefers underline (lighter touch) vs bg highlight vs font-weight only.
   - Recommendation: Use `text-foreground font-medium` with an optional bottom-border `border-b border-primary` for the desktop. This is visually distinct but not heavy. Keep mobile's existing `bg-background text-foreground` style unchanged.

---

## Environment Availability

Step 2.6: SKIPPED — Phase 35 is pure code changes to two existing files with no external dependencies. All tools (Node.js, npm, Next.js) are already verified working from Phase 34.

---

## Package Legitimacy Audit

**No new packages are installed in this phase.** All required primitives (`Sheet`, `Link`, `usePathname`) are already in the project. No audit required.

---

## Sources

### Primary (HIGH confidence — direct source inspection)
- `src/app/(public)/layout.tsx` — navLinks array, NavLink component, footer markup (read directly)
- `src/components/public/mobile-nav.tsx` — Sheet usage, active-route detection, focus handling (read directly)
- `src/components/ui/sheet.tsx` — Radix Dialog import, SheetContent, focus trap behavior (read directly)
- `src/styles/globals.css` — color token definitions, all semantic tokens (read directly)
- `src/__tests__/prod-readiness.test.ts` line 930 — file-read test pattern for layout assertions (read directly)
- `.planning/REQUIREMENTS.md` — NAV-01/02/03, FOOT-01/02 requirement text (read directly)
- `.planning/ROADMAP.md` Phase 35 — 5 success criteria (read directly)

### Secondary (MEDIUM confidence)
- [ASSUMED] Next.js 16 App Router pattern: `"use client"` only at leaves, Server Components cannot call `usePathname()` — consistent with CLAUDE.md architecture rules and project history (Phases 16-18)

---

## Metadata

**Confidence breakdown:**
- Current state mapping: HIGH — read from source files directly
- Gap analysis: HIGH — direct comparison of code vs. ROADMAP success criteria
- Active-route pattern: HIGH — consistent with CLAUDE.md rules and existing mobile-nav.tsx implementation
- Radix Dialog focus behavior: HIGH — confirmed from sheet.tsx source (`Dialog as SheetPrimitive` from radix-ui)
- Test pattern: HIGH — mirrors existing prod-readiness.test.ts file-read pattern

**Research date:** 2026-06-03
**Valid until:** Stable — these are static files with no external dependencies
