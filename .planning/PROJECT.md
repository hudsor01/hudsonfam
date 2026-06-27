# thehudsonfam.com

## What This Is
Custom family website. Next.js 16 App Router with Tailwind CSS v4, shadcn/ui, Prisma v7, Better Auth, on managed cloud (Vercel + Neon + Cloudflare R2). The family content hub — Grandma Hudson's digitized 1,000-recipe collection with a full UX layer (search, checkboxes, print, breadcrumbs, build-your-own-menu), plus Photos, Events, and an In Memory page — under a global light/dark theme. **Blog and Family Updates were removed entirely in v5.0** (the site was consolidated to what it has real content for); the job-search pipeline was removed in v4.0; homelab monitoring is parked until the cluster returns.

## Core Value
A single home for the Hudson family — content for everyone, and Grandma Hudson's recipes preserved and made readable for even the oldest relatives.

## Tech Stack
- Next.js 16.2 (App Router, Server Components)
- Tailwind CSS v4.2 + shadcn/ui (41 components)
- TypeScript
- Prisma v7 + PostgreSQL on **Neon** (serverless, pooled + direct URLs)
- Better Auth + Google OAuth + email/password — **Postgres-backed sessions (Redis removed in v4.0)**
- TanStack Form + TanStack Table
- sharp (image processing — WebP 2400px cap) → **Cloudflare R2 storage** (proxied via `/api/images`)
- MDX (recipes content, file-based in `content/recipes/`)
- Vitest + MSW

## Architecture
Single Next.js monolith with route groups:
- `(public)` — public site (homepage, **recipes**, photos, events, In Memory/memorial; My Menu contextual)
- `(auth)` — login, signup, forgot, reset, verify
- `(dashboard)` — content management for family (photos, albums, events, members, memorial)
- `(admin)` — homelab monitoring (owner only; **parked** until the cluster returns). Job-search pipeline **removed** in v4.0; Blog/Family Updates **removed** in v5.0.

## Deployment
git push to `main` → Vercel builds + deploys → Cloudflare DNS routes `thehudsonfam.com` (apex 308→`www`) to Vercel.
Postgres on Neon; images on Cloudflare R2 (proxied through `/api/images/[...path]`). `R2_ENDPOINT` must be the account host only (no `/bucket` segment); `getR2Client` normalizes it at runtime as a guard.
_(Pre-v4.0 the app deployed via GitHub Actions → GHCR → Flux → K3s behind a Cloudflare Tunnel; that pipeline is retired.)_

## Current State

**Shipped:** **v6.0 Photo Management Overhaul — closed 2026-06-27.** Owner-curated photos: a 3×3 featured homepage grid driven by a `featured` surface collection (dashboard manager with live preview + drag + capped add-from-library), collections as the single organizing unit (a photo lives in ≤1 collection; everything else is "All Photos"), public /photos = collection cards + All Photos, no rendered filenames, and no publish step (every upload is public). 12/12 REQs across 4 phases (37–40). Shipped to production + gated live-DB setup (featured + 3 starter collections seeded, "Moving to Dallas" removed keeping its photos, all photos visible); verified live. _(Prior: v5.0 Site Consolidation — closed 2026-06-03, tag `v5.0`.)_

**Current milestone:** none active — ready to start the next milestone (`/gsd:new-milestone`).
**Re-platform context:** K3s homelab offline indefinitely (flood; equipment in storage). Data is safe but disconnected — recoverable later via FUTURE-01.

## Last Milestone: v6.0 Photo Management Overhaul (shipped 2026-06-27)

**Goal:** Give the owner real control over the photo experience — a curated homepage grid, collection-based organization, and a friction-free dashboard — without re-uploading anything.

**Target features:**
- **Featured homepage grid** — a 3×3 (up to 9) curated set, managed in the dashboard with a live preview + add-from-library + drag-to-arrange (a "surface" collection drives it, mirroring how `memorial` works). Fewer than 9 → fewer tiles, no empty slots.
- **Collections as the organizing unit** — a photo belongs to at most one collection; adding it to one removes it from All Photos / any other. Per-collection manage page (add from library, reorder). Delete the "Moving to Dallas" collection (keep its photos); seed three empty starter collections ("Extending 1407 Judy Driveway", "Richard Jr's 38th Birthday Dinner", "Dad's Trips to Japan").
- **Public /photos = collections (cards) on top, then All Photos** (= photos in no collection). Homepage shows the featured grid only.
- **No publish step** — every uploaded photo is public (in All Photos or its collection); the homepage is controlled solely by the featured grid. Existing photos all set visible; new uploads default visible; the publish toggle UI is removed.
- **No filenames rendered publicly** anywhere (photos page, lightbox, homepage).

**Reuse:** `Collection`/`CollectionPhoto` (surface vs album `kind`), `SortablePhotoGrid` + `PhotoLibraryPicker` (dashboard memorial/media pattern), `AlbumPhotoGrid` + `Lightbox`. Migrations are deliberate, owner-confirmed steps (not auto-applied on deploy).

### Validated (all milestones)
- v1.0: Core site, auth, CRUD, homelab dashboard, K8s deployment, memorial
- v1.1: Theme tokens, 28→41 shadcn components, animations, command palette
- v1.2: Theme alignment, TW4 features, sidebar, TanStack Form/Table, component integration
- v1.3: Services page, infra hardening, job search dashboard, photo compression, color consolidation
- v1.4: Jobs dashboard production deployment, 15/15 requirements verified, exhaustive browser UAT
- v2.0: useEffect audit, component structure cleanup, server/client boundaries, hydration fixes
- v3.0: Freshness + Zod safeParse at DB boundary, empty-state/link-out polish, salary defensive render, HMAC-signed owner-triggered webhooks, generalized regenerate pattern. 23 REQs; 564/564 tests green.
- v3.5: Migrated deploy from Forgejo+Woodpecker to GitHub Actions + GHCR + Flux; 13 CICD REQs. _(Pipeline retired in v4.0's cloud move.)_
- Recipes digitization (superpowers track): 1,000 recipes typed from the 1924 Modern Priscilla Cook Book into `content/recipes/`, categorized in book order, text-only, public.
- **v4.0 (2026-06-02):** Cloud re-platform (Vercel + Neon + Cloudflare R2; Redis dropped) · job-search + homelab admin deleted · recipes UX layer · global light/dark theme · 21/21 REQs, audit PASSED.
- **v5.0 (2026-06-03):** Blog + Family Updates pruned end-to-end (routes, MDX, `BlogPost`/`FamilyUpdate` models + migration, dashboard CRUD, redirects, prune-guard test) · recipes-first homepage · R2 photo pipeline fixed (album-less auth-gate D-01 data fix + `R2_ENDPOINT` normalization) · navbar/footer rebuilt to surviving IA (Home · Recipes · Photos · Events · In Memory) with active-route + a11y · quality gate (lint 0, 233 tests, build 1036 pages). 24/24 REQs (PRUNE/HOME/PHOTO/NAV/FOOT/DASH/QUAL). Shipped + verified live.
- **v6.0 (2026-06-27):** Photo Management Overhaul — `featured` surface collection drives a 3×3 homepage grid curated from a dashboard manager (live preview + drag + max-9 add-from-library); collections are the single organizing unit (album-exclusive membership, "All Photos" = uncollected); public /photos = collection cards + All Photos; no rendered filenames; no publish step (all uploads public). 3 starter collections seeded, "Moving to Dallas" removed (photos kept). 12/12 REQs (FEAT/COLL/PHOTOS/VIS) across phases 37–40. Shipped + verified live. _(Note: the Events feature and the light/dark theme switcher were also removed in standalone work between v5.0 and v6.0; nav is now Home · Recipes · Photos · In Memory, light-only.)_

## Next Milestone

None defined. Run `/gsd:new-milestone` to scope the next one (questioning → research → requirements → roadmap).

**Carried forward (FUTURE backlog):**
- **FUTURE-01:** Restore homelab Postgres → migrate data into Neon once equipment is back online (data safe but disconnected).
- **FUTURE-02:** Re-enable live homelab monitoring (un-park the CLOUD-04 admin dashboard) when the cluster returns. `src/proxy.ts` CSP scaffold kept dormant.
- **FUTURE-03:** Remaining recipe back-matter from the physical book — Menu Making prose, the ~100-menu Menus section (pairs with build-your-own-menu), Table Service.
- **FUTURE-04:** Recipe full-text search across ingredients/steps (search is name-only).

**Tech debt / deferred (from v5.0 close):**
- WR-04: `extractExifDate` parses EXIF datetime as server-local then stores UTC-naive — timestamps shift by server offset (needs a tz-semantics decision).
- 6 pre-existing `tsc --noEmit` errors in `nav-footer.test.ts` (`next build` doesn't typecheck tests, so no gate catches them) — consider adding a `typecheck` gate.
- Original NAS-era seed photo `d9c2e950…` was deleted (D-01); re-add via FUTURE-01 when the NAS data returns.

**Canonical refs:** `.planning/ROADMAP.md`, `.planning/milestones/v5.0-*.md`, `.planning/MILESTONES.md`, CLAUDE.md.

## Key Decisions
- TanStack Form (NOT react-hook-form) for all forms
- TanStack Table for admin data tables
- Never remove unused shadcn components — integrate instead
- All colors via globals.css @theme tokens — zero hardcoded Tailwind colors
- Single PR branch per milestone, merge only when complete
- **(v4.0)** Host on Vercel; Postgres on Neon; images on Cloudflare R2 — all free tier, no self-hosted dependency
- **(v4.0)** Sessions via better-auth on Postgres — Redis dropped entirely
- **(v4.0)** Job-search pipeline removed; homelab monitoring parked until cluster returns
- **(v4.0)** Recipes are file-based MDX in `content/recipes/`, text-only, public — no DB, no login
- **(v5.0)** YAGNI — removed Blog + Family Updates entirely rather than maintain empty surfaces; a permanent prune-guard test prevents re-introduction
- **(v5.0)** Surviving public IA: Home · Recipes · Photos · Events · In Memory (My Menu stays contextual, not top-level nav)
- **(v5.0)** Album-less photos are intentionally private (auth-gated); the photo-render fix assigns photos to albums rather than weakening the gate
- **(v5.0)** `R2_ENDPOINT` is the account host only; `getR2Client` strips a trailing `/<bucket>` at runtime as a defensive guard
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

Last updated: 2026-06-03 — v5.0 Site Consolidation & Navigation Redesign shipped (tag `v5.0`)
