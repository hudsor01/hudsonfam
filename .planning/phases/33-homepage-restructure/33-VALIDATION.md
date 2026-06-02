---
phase: 33
slug: homepage-restructure
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-06-02
---

# Phase 33 — Validation Strategy

> Per-phase validation contract for the homepage restructure. The homepage is a Server Component (not unit-testable as a render), so validation leans on the production build, static grep assertions, one new unit test for the curated featured slugs, and the existing Vitest suite staying green.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (happy-dom + Testing Library + MSW) |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npm test -- --run` |
| **Full suite command** | `npm test` |
| **Build check** | `npm run build` |
| **Estimated runtime** | ~30–60 seconds |

---

## Sampling Rate

- **After every task commit:** `npm test -- --run` + the task's grep/build assertion
- **After the wave:** `npm test` + `npm run build`
- **Before `/gsd:verify-work`:** `npm run build` exit 0 AND `npm test` green AND grep assertions pass
- **Max feedback latency:** ~60 seconds

---

## Per-Requirement Verification Map

Task IDs assigned at planning. The homepage render itself is verified by build + the new featured-slug unit test + visual smoke; structure/copy by grep against the source.

| Req | Behavior | Test Type | Automated Command (must pass) |
|-----|----------|-----------|-------------------------------|
| HOME-01 | Featured curated slugs all resolve in the published recipe index | unit (Wave 0) | `npm test -- --run` includes a test asserting `FEATURED_RECIPE_SLUGS.every(s => index.find(e => e.slug === s))` |
| HOME-01 | `page.tsx` renders the Recipes section (CTA + RecipeSearch + featured row) above Photos/Events | static grep + build | `grep -q "RecipeSearch" "src/app/(public)/page.tsx"` AND Recipes section precedes Photos/Events in source; `npm run build` exit 0 |
| HOME-01 | Hero subcopy is recipes-forward (no blog-era "life updates") | static grep | `grep -q "life updates" src/components/public/hero.tsx` returns 0 (string gone) |
| HOME-02 | Photos section renders live data + empty state | static grep + build | `page.tsx` keeps `photo.findMany`; empty-state copy "No photos yet" present in render path; build exit 0 |
| HOME-02 | Events section renders live data + empty state | static grep + build | `page.tsx` keeps `event.findMany` (upcoming PUBLIC); empty-state copy "No upcoming events" present; build exit 0 |
| HOME-03 | No blog/updates imports in `(public)/` | static grep | `grep -rnE "getAllPosts|FeaturedPost|PostCard|familyUpdate|lib/blog" "src/app/(public)/"` returns 0 |
| HOME-03 | Sidebar + WeatherWidget removed (homepage-only) | filesystem | `ls src/components/public/sidebar.tsx src/components/public/weather-widget.tsx` both fail (ENOENT); no remaining imports |
| HOME-03 | Build succeeds with blog absent | build | `npm run build` exit 0 |
| (all) | Existing suite stays green | test suite | `npm test -- --run` exits 0 |

*Status: ⬜ pending · ✅ green · ❌ red*

---

## Wave 0 Requirements

- [ ] `src/__tests__/lib/recipes.test.ts` (or colocated) — add a test asserting every entry of `FEATURED_RECIPE_SLUGS` resolves to a published recipe in `getRecipeIndex()`. Regression guard so a future content prune can't silently break the homepage featured row.

Otherwise existing infrastructure covers the phase (recipes lib unit tests exist; the homepage Server Component render is covered by build + visual smoke, no homepage render test needed for this scope).

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Recipes section is above the fold on desktop | HOME-01 | Above-the-fold is viewport-dependent, not unit-testable | `npm run dev` → localhost:3000 at 1280px; Recipes CTA + search visible without scrolling |
| Featured cards + sections render visually per UI-SPEC | HOME-01/02 | Visual layout fidelity | Visual check: 6 featured cards (title + category), Photos grid, Events list |
| Bad slug skipped gracefully | HOME-01 (D-02) | Resilience check | Temporarily add a bogus slug to `FEATURED_RECIPE_SLUGS` → no error, card omitted; remove it |

---

## Validation Sign-Off

- [ ] Featured-slug unit test created (Wave 0) and green
- [ ] All grep/filesystem/build assertions pass
- [ ] `npm run build` exit 0; `npm test` green
- [ ] No watch-mode flags (`npm test -- --run`)
- [ ] Feedback latency < 60s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending Wave 0 (featured-slug test) — created during execution
