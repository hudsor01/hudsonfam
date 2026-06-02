---
phase: 32
slug: prune-dashboard-cleanup
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-06-02
---

# Phase 32 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> This is a removal/refactor phase — validation is dominated by static grep assertions (zero residual references), the production build gate, the Prisma migration gate, and the existing Vitest suite staying green. No new test files are created (Wave 0 empty).

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (happy-dom + Testing Library + MSW) |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npm test -- --run` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~30–60 seconds (suite shrinks as blog/familyUpdate tests are removed) |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- --run` (no watch mode) + the task's static grep assertion
- **After every plan wave:** Run `npm test` + `npm run build`
- **Before `/gsd:verify-work`:** `npm run build` AND `npm test` both green; all grep assertions return 0
- **Max feedback latency:** ~60 seconds

---

## Per-Task Verification Map

Task IDs are assigned at planning. Rows are keyed by requirement; each requirement's plan task(s) inherit the matching automated check. Every check is automated (static grep, filesystem, build, migration, or test suite) except the post-deploy redirect smokes (see Manual-Only).

| Req | Wave | Behavior | Test Type | Automated Command (must pass) | File Exists |
|-----|------|----------|-----------|-------------------------------|-------------|
| PRUNE-01 | 1 | No blog imports in `src/` | static grep | `grep -rn "getAllPosts\|lib/blog\|featured-post\|post-card" src/` returns 0 | ✅ |
| PRUNE-01 | 1 | `content/blog/` deleted | filesystem | `ls content/blog/` fails (ENOENT) | ✅ |
| PRUNE-02 | 1 | No familyUpdate imports in `src/` | static grep | `grep -rn "familyUpdate\|FamilyUpdate\|update-card" src/` returns 0 | ✅ |
| PRUNE-03 | 1 | Migration applies; client regenerates | build gate | `npx prisma migrate dev` exits 0; `npx prisma generate` exits 0 | ✅ |
| PRUNE-03 | 1 | No `blogPost`/`familyPost` model usage (tsc catches) | typescript | `npm run build` exits 0 | ✅ |
| PRUNE-04 | 1 | Dashboard posts/updates routes gone | filesystem | `find src/app -type d \( -name posts -o -name updates \) -path "*/dashboard/*"` returns nothing | ✅ |
| PRUNE-04 | 1 | Post/update server actions removed | static grep | `grep -n "createPost\|deletePost\|updatePost\|createUpdate\|deleteUpdate\|quickCreateUpdate" src/lib/dashboard-actions.ts` returns 0 | ✅ |
| PRUNE-05 | 1 | No blog/family links in public layout | static grep | `grep -rn '"/blog"\|"/family"' "src/app/(public)/layout.tsx"` returns 0 | ✅ |
| PRUNE-05 | 1 | No RSS link in root layout | static grep | `grep "api/blog/rss" src/app/layout.tsx` returns 0 | ✅ |
| PRUNE-05 | 1 | Sitemap has no /blog or /family | static grep | `grep '"/blog"\|"/family"' src/app/sitemap.ts` returns 0 | ✅ |
| PRUNE-05 | 1 | Command palette has no blog/posts/updates/family | static grep | `grep -E '/blog\|/family\|dashboard/posts\|dashboard/updates' src/components/command-palette.tsx` returns 0 | ✅ |
| DASH-01 | 2 | Dashboard nav: no Posts/Updates | static grep | `grep -E '"Posts"\|"Updates"\|dashboard/posts\|dashboard/updates' "src/app/(dashboard)/layout.tsx"` returns 0 | ✅ |
| DASH-02 | 2 | Dashboard overview: no blogPost/familyUpdate queries | static grep | `grep -E 'blogPost\|familyUpdate' "src/app/(dashboard)/dashboard/page.tsx"` returns 0 | ✅ |
| DASH-03 | 2 | No orphaned dashboard route dirs; survivors consolidated | filesystem | posts/updates dirs absent; `npm run build` exits 0 | ✅ |
| D-05 | 1 | Homepage has no blog deps | static grep | `grep -E 'getAllPosts\|FeaturedPost\|PostCard\|lib/blog' "src/app/(public)/page.tsx"` returns 0 | ✅ |
| D-06 | every wave | Test suite green | test suite | `npm test` exits 0 | ✅ |
| QUAL-01 (phase gate) | final | Build succeeds | build | `npm run build` exits 0 | ✅ |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. No new test files — this phase deletes/reduces existing tests (`__tests__/lib/blog.test.ts` removed; `dashboard-actions.test.ts`, `prod-readiness.test.ts`, `production-bugs.test.ts`, `mocks/prisma.ts` trimmed of blog/familyUpdate references).

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| `/blog`, `/blog/[slug]`, `/family` return HTTP 308 → `/` | PRUNE-01, PRUNE-02 | Redirect behavior is only observable against the deployed Vercel build; locally the build verifies the redirect rule exists + the route is gone | After deploy: `curl -I https://thehudsonfam.com/blog` (and `/blog/anything`, `/family`) → expect `308` + `location: /`. Locally: confirm `redirects()` in `next.config.ts` + absent route dirs. |

---

## Validation Sign-Off

- [x] All tasks have an automated verify (grep/filesystem/build/migration/test) or are listed Manual-Only with instructions
- [x] Sampling continuity: `npm test` + grep run every wave; no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (none — deletion-only phase)
- [x] No watch-mode flags (`npm test -- --run` used for quick runs)
- [x] Feedback latency < 60s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-06-02
