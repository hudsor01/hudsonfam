---
phase: 35
slug: navbar-footer-ia
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-03
---

# Phase 35 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Derived from 35-RESEARCH.md §"Validation Architecture".

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest + happy-dom + Testing Library |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npm test -- src/__tests__/nav-footer.test.ts` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | quick <10s · full ~30s |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- src/__tests__/nav-footer.test.ts`
- **After every plan wave:** Run `npm test`
- **Before `/gsd:verify-work`:** Full suite green + 375px mobile + keyboard-focus browser smoke
- **Max feedback latency:** ~10s (quick) / ~30s (full)

---

## Per-Task Verification Map

| Requirement | Behavior | Test Type | Automated Command | File Exists |
|-------------|----------|-----------|-------------------|-------------|
| NAV-01 | navLinks = exactly 5: Home, Recipes, Photos, Events, In Memory (label "Recipes", not "Grandma Hudson's Recipes") | unit (file read) | `npm test -- src/__tests__/nav-footer.test.ts` | ❌ W0 |
| NAV-01 | navLinks order: Home → Recipes → Photos → Events → In Memory | unit (file read) | same | ❌ W0 |
| NAV-02 | Mobile drawer renders all 5 links | unit (RTL render) | same | ❌ W0 |
| NAV-03 | Desktop NavLink renders `aria-current="page"` for active route | unit (RTL + mock usePathname) | same | ❌ W0 |
| NAV-03 | Mobile link renders `aria-current="page"` for active route | unit (RTL + mock usePathname) | same | ❌ W0 |
| FOOT-01 | Footer links to /recipes, /photos, /events, /richard-hudson-sr | unit (file read or RTL) | same | ❌ W0 |
| FOOT-01 | Footer has NO /blog or /family links | unit (file read) | same | ❌ W0 |
| FOOT-02 | Footer has `flex-col sm:flex-row` (column stacking on mobile) | unit (file read) | same | ❌ W0 |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/__tests__/nav-footer.test.ts` — covers NAV-01, NAV-02, NAV-03, FOOT-01, FOOT-02. Mix of file-read assertions against `layout.tsx` (same pattern as `prod-readiness.test.ts:930`) and RTL render tests for the new `nav-link.tsx` + `mobile-nav.tsx` with a mocked `usePathname`.

*Existing test suite (207 tests) remains the regression baseline.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| 375px mobile: drawer opens, all 5 links reachable, no overflow/clipping | NAV-02 | Requires real viewport render | Browser at 375px → open hamburger → all 5 links visible, no horizontal scroll |
| Tab focus traverses all nav items, returns to trigger on drawer close (no trap) | NAV-03 | Requires real keyboard interaction | Tab through desktop nav; open drawer, Tab through, Esc → focus returns to hamburger |
| Active route visually indicated (desktop + mobile) | NAV-03 | Requires visual render per route | Navigate to each route → active link styled distinctly |
| Footer responsive, visually consistent with navbar | FOOT-02 | Requires visual render | Browser at 375px + desktop → footer stacks cleanly, no overflow |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (`nav-footer.test.ts`)
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
