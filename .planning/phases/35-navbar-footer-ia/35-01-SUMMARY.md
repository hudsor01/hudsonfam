---
phase: 35-navbar-footer-ia
plan: "01"
subsystem: nav-footer
tags: [tdd, red-wave, navigation, footer, aria, testing]
dependency_graph:
  requires: []
  provides: [nav-footer-test-contract]
  affects: [src/__tests__/nav-footer.test.ts, src/components/public/nav-link.tsx]
tech_stack:
  added: []
  patterns: [file-read-assertion, rtl-render, vi-mock-usePathname, sheet-fireEvent-open]
key_files:
  created:
    - src/__tests__/nav-footer.test.ts
    - src/components/public/nav-link.tsx
  modified: []
decisions:
  - "NavLink stub created at src/components/public/nav-link.tsx to satisfy Vite static import resolution; stub renders plain Link with no aria-current — matching pre-fix state"
  - "MobileNav tests open the Sheet drawer via fireEvent.click(trigger) before querying links (Radix Dialog renders portal content only when open)"
  - "vi.mock('next/navigation') hoisted at module top; default pathname = /recipes"
metrics:
  duration: "~8 minutes"
  completed: "2026-06-03T01:46:05Z"
  tasks_completed: 1
  files_changed: 2
---

# Phase 35 Plan 01: Wave 0 RED Test Contract Summary

**One-liner:** 16-test Wave 0 suite encoding the nav/footer IA contract (label, order, footer links, aria-current) — 6 fail RED, 10 pass, all correct per plan.

## What Was Built

Created the Wave 0 test file `src/__tests__/nav-footer.test.ts` encoding all 8 rows from the VALIDATION.md Per-Task Verification Map. Created `src/components/public/nav-link.tsx` as a Wave 0 stub (plain Link, no aria-current) so Vite can resolve the import statically.

### Test Coverage (16 tests)

| Req | Behavior | Status |
|-----|----------|--------|
| NAV-01 | label "Recipes" not "Grandma Hudson's Recipes" | FAIL RED |
| NAV-01 | Recipes before Photos in navLinks | FAIL RED |
| NAV-01 | all 5 required hrefs present in source | PASS |
| FOOT-01 | footer /recipes | FAIL RED |
| FOOT-01 | footer /photos | PASS |
| FOOT-01 | footer /events | PASS |
| FOOT-01 | footer /richard-hudson-sr | FAIL RED |
| FOOT-01 | footer NOT /blog | PASS |
| FOOT-01 | footer NOT /family | PASS |
| FOOT-02 | footer flex-col sm:flex-row | PASS |
| NAV-03 | NavLink aria-current="page" when active | FAIL RED |
| NAV-03 | NavLink no aria-current when inactive | PASS |
| NAV-02 | MobileNav renders all 5 labels after drawer open | PASS |
| NAV-03 | active mobile link aria-current="page" | FAIL RED |
| NAV-03 | inactive mobile link no aria-current | PASS |
| NAV-02 | Sign In reachable in mobile drawer | PASS |

**6 fail RED (expected) / 10 pass / total 16**

## Commits

| Hash | Message |
|------|---------|
| dfcea3e | test(35-01): add Wave 0 RED tests for nav/footer IA contract |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Created nav-link.tsx stub to unblock Vite static import resolution**
- **Found during:** Task 1 — running the test suite
- **Issue:** Vite's `vite:import-analysis` plugin resolves all import specifiers statically at transform time, including `import('@/components/public/nav-link')` inside `try/catch` and even when `vi.mock` is declared. When the file doesn't exist, the entire suite fails at transform (0 tests collected) rather than inside individual tests.
- **Fix:** Created `src/components/public/nav-link.tsx` as a Wave 0 stub — a plain `<Link>` wrapper with no `usePathname()` and no `aria-current`. The stub satisfies the import resolver while preserving RED behavior for the aria-current assertions (stub returns `null` where the test expects `"page"`).
- **Files modified:** `src/components/public/nav-link.tsx` (new)
- **Commit:** dfcea3e (included in task commit)

**2. [Rule 3 - Blocking] Added fireEvent.click to open Sheet drawer before querying MobileNav links**
- **Found during:** Task 1 — first MobileNav test run
- **Issue:** Radix Dialog (Sheet) renders its content inside a portal only when `open=true`. Tests querying link labels found only the trigger button; all nav link assertions failed with "Unable to find element with text".
- **Fix:** Added `openDrawer()` helper that finds the "Open menu" button by role and fires a click event. All 4 MobileNav tests now correctly see drawer content.
- **Files modified:** `src/__tests__/nav-footer.test.ts` (fireEvent import + openDrawer helper)
- **Commit:** dfcea3e

**3. [Rule 3 - Blocking] Switched from JSX to React.createElement in .ts file**
- **Found during:** First test run
- **Issue:** File extension `.ts` is not processed as JSX by Vite/Oxc; JSX syntax caused parse error.
- **Fix:** Used `React.createElement(Component, props, children)` throughout. Import `React from 'react'` added.
- **Files modified:** `src/__tests__/nav-footer.test.ts`
- **Commit:** dfcea3e

## Known Stubs

| Stub | File | Reason |
|------|------|--------|
| NavLink renders plain Link, no usePathname, no aria-current | src/components/public/nav-link.tsx | Wave 0 placeholder; Plan 35-02 replaces with real implementation |

## Self-Check: PASSED

- [x] `src/__tests__/nav-footer.test.ts` exists
- [x] `src/components/public/nav-link.tsx` exists (stub)
- [x] Commit dfcea3e exists: `git log --oneline | grep dfcea3e`
- [x] Suite runs RED (6 fail) with correct assertions
- [x] No production nav/footer code modified (layout.tsx and mobile-nav.tsx unchanged)
