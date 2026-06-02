# Phase 32: Prune & Dashboard Cleanup - Context

**Gathered:** 2026-06-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Remove the **Blog** (MDX *and* DB `BlogPost`) and **Family Updates** (`FamilyUpdate`) subsystems from the entire codebase — public routes, content, Prisma models, dashboard CRUD, API routes, and all cross-cutting references — and clean up the dashboard to match surviving content. The site must build and deploy cleanly at the phase boundary.

Covers: PRUNE-01..05, DASH-01..03. (HOME restructure = Phase 33; photo fix = Phase 34; nav/footer = Phase 35; full lint/test gate = Phase 36.)

</domain>

<decisions>
## Implementation Decisions

### Database Migration (PRUNE-03)
- **D-01: Verify-then-drop.** During execution, check `BlogPost` and `FamilyUpdate` row counts first. If both are empty → drop both tables in a single Prisma migration. If either is non-empty → dump those rows to a file (e.g. a SQL dump under `.planning/`) **before** dropping, so nothing is silently lost. Never leave orphan tables in Neon. Migrations run via `DIRECT_DATABASE_URL` (`npx prisma migrate dev`, per `prisma.config.ts`).

### Removed-Route Behavior (PRUNE-01, PRUNE-02)
- **D-02: Redirect, not 404.** `/blog`, `/blog/[slug]`, and `/family` issue a **308 permanent redirect to `/`** (preserves any existing bookmarks/links). Implement in `next.config.ts` `redirects()` with a wildcard for `/blog/:slug*`.
- **Supersedes** the literal "return 404" wording in PRUNE-01/PRUNE-02 — the intent (no live blog/family page, no link surfaced in UI) is met via redirect.
- **Carve-out for QUAL-03 (Phase 36):** the "grep for `/blog` `/family` finds zero matches in `src/`" check must allow the redirect rules in `next.config.ts` — those reference the paths as redirect *sources*, not as a live feature.

### Dashboard Cleanup Depth (DASH-01/02/03)
- **D-03: Prune + consolidate.** Remove `/dashboard/posts*` and `/dashboard/updates*` pages, their nav entries, and dead server actions/tests. **AND** restructure the surviving dashboard areas (Photos, Events, Members, Memorial) — unify their layouts using the shared `src/components/dashboard/` primitives and rework the dashboard overview/home to reflect only surviving content. Goal: a coherent dashboard, not just a deletion.

### Blog Content (PRUNE-01)
- **D-04: Delete all.** Remove `content/blog/` entirely (all 3 MDX posts: welcome-to-the-hudsons, our-dallas-adventure, building-a-family-website). No salvage. Homepage copy is authored fresh in Phase 33.

### Build-green sequencing (integration, not new scope)
- **D-05: Neutralize the homepage's blog dependency in Phase 32.** The homepage (`src/app/(public)/page.tsx`) imports `getAllPosts` and renders `FeaturedPost`/`PostCard`. Deleting `lib/blog.ts` + `content/blog` + those components breaks the build. Phase 32 strips the blog sections from the homepage (leaving the events/photos sidebar) so the build stays green. The recipes-first restructure (HOME-01/02) is Phase 33 — Phase 32 only removes blog so nothing is broken. This directly enables HOME-03.
- **D-06: Keep `npm test` green continuously.** Phase 32 deletes/updates the tests that reference blog/familyUpdate as part of the removal (don't defer broken tests to Phase 36). Phase 36 remains the final full-suite gate.

### Claude's Discretion
- Migration file naming, redirect status-code mechanics, and exactly how far to consolidate the surviving dashboard layouts (within "coherent + uses shared primitives") are Claude's call during planning.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase planning
- `.planning/ROADMAP.md` §"Phase 32: Prune & Dashboard Cleanup" — goal + 5 success criteria
- `.planning/REQUIREMENTS.md` — PRUNE-01..05, DASH-01..03 (and the QUAL-03 grep carve-out noted in D-02)
- `.planning/PROJECT.md` — v5.0 milestone, surviving public IA, YAGNI principle, key decisions

### Project conventions
- `CLAUDE.md` — stack, dashboard primitives location (`src/components/dashboard/`), color tokens, TanStack Table, Prisma output dir, deployment (Vercel auto-deploy on push to main)

No external ADRs/specs — requirements fully captured in decisions above.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/dashboard/` primitives (collapsible-card, metric-card, app-sidebar, data-table) — reuse for the consolidated surviving dashboard (D-03).
- `src/components/dashboard/data-table.tsx` + `@tanstack/react-table` — surviving area tables.

### Removal Surface (delete / clean — full map)
**Blog (MDX):**
- `content/blog/*.mdx` (3 files), `src/lib/blog.ts` (`getAllPosts`), `src/app/api/blog/rss/route.ts`
- `src/app/(public)/blog/page.tsx`, `src/app/(public)/blog/[slug]/page.tsx`
- `src/components/public/featured-post.tsx`, `src/components/public/post-card.tsx`

**Blog (DB):**
- `BlogPost` model in `prisma/schema.prisma`
- `src/app/(dashboard)/dashboard/posts/{page,new,[id]}.tsx` + `posts-data-table.tsx`
- `deletePost` (+ any create/update post actions) in `src/lib/dashboard-actions.ts`

**Family Updates:**
- `FamilyUpdate` model in `prisma/schema.prisma`
- `src/app/(public)/family/page.tsx` + `src/app/(public)/family/load-more-updates.tsx`
- `src/components/public/update-card.tsx`
- `src/app/(dashboard)/dashboard/updates/{page,new}.tsx` + its server actions in `dashboard-actions.ts`

### Cross-cutting refs to clean (PRUNE-05)
- `src/app/(public)/layout.tsx` — `navLinks` array + footer links (drop Blog + Family/In Memory footer mismatch handled in Phase 35; here just remove Blog/Family)
- `src/components/public/mobile-nav.tsx` — receives `links` from layout (auto-updates)
- `src/components/command-palette.tsx` — blog references
- `src/app/sitemap.ts` — blog/family URLs
- `src/app/not-found.tsx` — blog references
- `src/app/layout.tsx` (root) — any RSS/blog metadata link
- `src/app/(public)/page.tsx` — homepage `getAllPosts`/`FeaturedPost`/`PostCard` (strip per D-05)

### Tests touching removed code (update/remove per D-06)
- `src/__tests__/lib/blog.test.ts`, `src/__tests__/lib/dashboard-actions.test.ts`
- `src/__tests__/prod-readiness.test.ts`, `src/__tests__/production-bugs.test.ts`
- `src/__tests__/mocks/prisma.ts` (prune BlogPost/FamilyUpdate mocks)

### Integration Points
- **Surviving Prisma models (DO NOT touch):** Album, Photo, Event, Memory, MemorialMedia, MemorialContent, InviteToken, User, Session, Account, Verification.
- **Surviving dashboard areas:** Photos, Events, Members, Memorial.
- Migration uses `DIRECT_DATABASE_URL` (bypasses PgBouncer) per `prisma.config.ts`.

</code_context>

<specifics>
## Specific Ideas

- Old blog/family URLs redirect to the homepage `/` (D-02) — not a 404.
- The dashboard should feel coherent after consolidation, not just have two pages removed (D-03).

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope. (Recipes-first homepage = Phase 33, photo render fix = Phase 34, nav/footer IA = Phase 35, full lint/test gate = Phase 36 — these are existing roadmap phases, not deferred ideas.)

</deferred>

---

*Phase: 32-prune-dashboard-cleanup*
*Context gathered: 2026-06-02*
