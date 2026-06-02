# thehudsonfam.com

## What This Is
Custom family website. Next.js 16 App Router with Tailwind CSS v4, shadcn/ui, Prisma v7, Better Auth. As of v4.0, **re-platformed onto managed cloud** (Vercel + Neon + Cloudflare R2) after the K3s homelab went offline indefinitely (flood). Serves as the family content hub (blog, photos, events, memorial) plus a digitized 1,000-recipe collection ("Grandma Hudson's Recipes") with a full UX layer (search, checkboxes, print, breadcrumbs, build-your-own-menu) and a global light/dark theme. The job-search pipeline was removed in v4.0; homelab monitoring is parked until the cluster returns.

## Core Value
A single home for the Hudson family — content for everyone, and Grandma Hudson's recipes preserved and made readable for even the oldest relatives.

## Tech Stack
- Next.js 16.2 (App Router, Server Components)
- Tailwind CSS v4.2 + shadcn/ui (41 components)
- TypeScript
- Prisma v7 + PostgreSQL on **Neon** (serverless, pooled + direct URLs)
- Better Auth + Google OAuth + email/password — **Postgres-backed sessions (Redis removed in v4.0)**
- TanStack Form + TanStack Table
- sharp (image processing — WebP 2400px cap) → **Cloudflare R2 storage**
- MDX (blog + recipes content, file-based in `content/`)
- Vitest + MSW

## Architecture
Single Next.js monolith with 4 route groups:
- `(public)` — public site (homepage, blog, photos, events, family, memorial, **recipes**)
- `(auth)` — login, signup, forgot, reset, verify
- `(dashboard)` — content management for family (posts, photos, albums, events, updates, members, memorial)
- `(admin)` — homelab monitoring (owner only; **parked** in v4.0 until the cluster returns). Job-search pipeline **removed** in v4.0.

## Deployment
**v4.0+:** git push to `main` → Vercel builds + deploys → Cloudflare DNS routes `thehudsonfam.com` to Vercel.
Postgres on Neon; images on Cloudflare R2.
_(Pre-v4.0 the app deployed via GitHub Actions → GHCR → Flux → K3s behind a Cloudflare Tunnel; that pipeline is retired in Phase 30.)_

## Current Milestone: v5.0 Site Consolidation & Navigation Redesign

**Goal:** Refactor the site down to what it actually has content for (YAGNI) — remove dead/redundant surfaces, make the survivors work perfectly, and rebuild the navbar + footer IA around them. No new content/features unless a gap forces one.

**Target features:**
- Prune Blog (both MDX *and* DB `BlogPost`) and Family Updates (`/family`, `FamilyUpdate`) end-to-end — public routes, content, Prisma models, dashboard CRUD (`/dashboard/posts`, `/dashboard/updates`), `/api/blog/rss`, and all references (command-palette, sitemap, not-found, layouts, components, libs, tests)
- Restructure the homepage to lead with Recipes + Photos + Events (drop the blog dependency)
- Fix the broken photo render end-to-end (debug the R2 image that shows a placeholder; rebuild the pipeline if it proves fundamentally broken) — no placeholders
- Redesign the navbar — IA cleanup (Home · Recipes · Photos · Events · In Memory) + mobile/responsive polish; no visual rebrand
- Redesign the footer to match the real IA (currently links the dead/thin sections and omits Recipes)
- Dashboard cleanup — remove dead CRUD and refactor structure to match surviving content (Photos, Events, Members, Memorial)
- Quality — dead-code sweep, surviving pages polished and working, full test suite green

**Surviving public IA:** Home · Recipes · Photos · Events · In Memory (My Menu stays contextual — floating indicator + from recipes, not top-level nav).

## Current State

**Shipped:** **v4.0 Cloud Re-platform & Recipes Experience — closed 2026-06-02 (tag `v4.0`).** The site is fully live on managed cloud — Vercel + Neon + Cloudflare R2, no self-hosted dependency — at https://thehudsonfam.com over valid HTTPS. The job-search subsystem and homelab-monitoring admin are deleted; the 1,000-recipe collection has its full UX layer; the site has a global light/dark theme. Milestone audit PASSED (21/21 REQs).
**Current milestone:** v5.0 Site Consolidation & Navigation Redesign — active (started 2026-06-02). See "Current Milestone" section above.
**Re-platform context:** K3s homelab offline indefinitely (flood; equipment in storage). Data is safe but disconnected — recoverable later via FUTURE-01.

### Validated (all milestones)
- v1.0: Core site, auth, CRUD, homelab dashboard, K8s deployment, memorial
- v1.1: Theme tokens, 28→41 shadcn components, animations, command palette
- v1.2: Theme alignment, TW4 features, sidebar, TanStack Form/Table, component integration
- v1.3: Services page, infra hardening, job search dashboard, photo compression, color consolidation
- v1.4: Jobs dashboard production deployment, 15/15 requirements verified, exhaustive browser UAT
- v2.0: useEffect audit, component structure cleanup, server/client boundaries, hydration fixes
- v3.0: Freshness + Zod safeParse at DB boundary (Phase 20); empty-state copy + link-out polish (Phase 21); salary_intelligence defensive render (Phase 22); HMAC-signed + idempotency-keyed owner-triggered webhooks with sentinel errors (Phase 23); generalized regenerate pattern across all 3 AI artifacts + silent-success warning (Phase 24). 23 REQs shipped; 564/564 tests green. Production UAT for all 5 phases deferred to v3.5-P4 (deploy pipeline broken; see SEED-005).
- v3.5: Migrated deploy from Forgejo+Woodpecker to GitHub Actions + GHCR + Flux (Phases 25-28); 13 CICD REQs; cleared v3.0 prod-UAT debt. _(This entire pipeline is now retired in v4.0's cloud move.)_
- Recipes digitization (superpowers track): 1,000 recipes typed from the 1924 Modern Priscilla Cook Book into `content/recipes/`, categorized in book order, text-only, public.
- **v4.0 (2026-06-02):** Cloud re-platform (Vercel + Neon + Cloudflare R2, no self-hosted dep; Redis dropped) · job-search subsystem + homelab-monitoring admin deleted · recipes UX layer (cmdk search, localStorage checkboxes, print/kitchen view, breadcrumbs + prev/next, build-your-own-menu) · global light/dark theme (Ivory & Terracotta default / navy dark) · 21/21 REQs (JOB-01..07, CLOUD-01..09, RECIPE-01..05), audit PASSED.

## Next Milestone

v5.0 Site Consolidation & Navigation Redesign is active (see "Current Milestone" above). Requirements + roadmap defined 2026-06-02.

**Carried forward (FUTURE backlog):**
- **FUTURE-01:** Restore homelab Postgres → migrate data into Neon once equipment is back online (data safe but disconnected).
- **FUTURE-02:** Re-enable live homelab monitoring (un-park the CLOUD-04 admin dashboard) when the cluster returns. `src/proxy.ts` CSP scaffold kept dormant for this.
- **FUTURE-03:** Remaining recipe back-matter from the physical book — Menu Making prose, the ~100-menu Menus section (pairs with build-your-own-menu), Table Service.
- **FUTURE-04:** Recipe full-text search across ingredients/steps (v4.0 search is name-only).
- Migrate the one restored seed photo (`d9c2e950…`) NAS → R2 so it stops rendering the placeholder.

**Canonical refs:** `.planning/ROADMAP.md`, `.planning/milestones/v4.0-*.md`, CLAUDE.md.

## Key Decisions
- TanStack Form (NOT react-hook-form) for all forms
- TanStack Table for admin data tables
- Never remove unused shadcn components — integrate instead
- All colors via globals.css @theme tokens — zero hardcoded Tailwind colors
- Single PR branch per milestone, merge only when complete
- **(v4.0)** Host on Vercel; Postgres on Neon; images on Cloudflare R2 — all free tier, no self-hosted dependency
- **(v4.0)** Sessions via better-auth on Postgres — Redis dropped entirely
- **(v4.0)** Job-search pipeline removed (homelab career tool no longer relevant); homelab monitoring parked until cluster returns
- **(v4.0)** Recipes are file-based MDX in `content/recipes/`, text-only, public — no DB, no login
- useMemo for derived state, not useEffect prop-to-state sync
- Explicit timezone (America/Chicago) on all date formatters to prevent hydration mismatch
- First registered user auto-promoted to owner via databaseHooks

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition:**
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions

**After each milestone:**
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

**v5.0 progress (branch `v5.0-site-consolidation`):**
- **Phase 32** complete — Blog + Family Updates removed end-to-end (routes, MDX, `BlogPost`/`FamilyUpdate` models via migration, dashboard CRUD, all residual refs); homepage de-blogged; dashboard consolidated; 308 redirects. PRUNE-01..05 + DASH-01..03 (8/8).
- **Phase 33** complete — recipes-first homepage: recipes-forward Hero (Browse Recipes CTA + cmdk search), 6 curated featured cards, full-width Photos + Events sections, Sidebar/WeatherWidget retired. HOME-01..03 (6/6 + 3/3 human UAT via browser). _Observed: homepage photo thumbnails render broken — pre-existing R2 bug, fixed in Phase 34._
- Remaining: phase 34 (photo pipeline fix), 35 (nav/footer), 36 (quality gate).

Last updated: 2026-06-02 — Phase 33 complete (v5.0 Site Consolidation & Navigation Redesign)
