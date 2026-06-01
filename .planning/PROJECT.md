# thehudsonfam.com

## What This Is
Custom family website. Next.js 16 App Router with Tailwind CSS v4, shadcn/ui, Prisma v7, Better Auth. As of v4.0, **re-platformed onto managed cloud** (Vercel + Neon + Cloudflare R2) after the K3s homelab went offline indefinitely (flood). Serves as the family content hub (blog, photos, events, memorial) plus a digitized 1,000-recipe collection ("Grandma Hudson's Recipes"). The job-search pipeline is being removed in v4.0; homelab monitoring is parked until the cluster returns.

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

## Current State

**Shipped:** v3.5 CI/CD Hardening — closed 2026-04-25 (tag `v3.5-complete`, commit `f02440c`). Also shipped between v3.5 and v4.0 on the superpowers track: **Grandma Hudson's Recipes digitization** — 1,000 public-domain recipes (Modern Priscilla Cook Book, 1924) transcribed to MDX in `content/recipes/`, categorized in book order, text-only.
**Current milestone:** **v4.0 Cloud Re-platform & Recipes Experience — ACTIVE (started 2026-06-01).**
**Re-platform trigger:** K3s homelab offline indefinitely (flood; equipment in storage). Data is safe but disconnected. Moving to managed cloud: Vercel + Neon + Cloudflare R2.

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

## Current Milestone: v4.0 Cloud Re-platform & Recipes Experience

**Goal:** Get thehudsonfam.com back online on managed cloud (homelab down indefinitely after a flood), remove the job-search subsystem entirely, and make the 1,000-recipe collection genuinely usable for the family.

**Locked stack (all free tier):** Vercel (host) · Neon (Postgres) · Cloudflare R2 (images) · better-auth on Postgres (no Redis) · Cloudflare DNS → Vercel.

**Three phases (29-31):**
- **Phase 29 — Decommission Job Pipeline:** delete all job-search code, deps, env, tests, admin UI, and schema-drift tooling. (JOB-01..07)
- **Phase 30 — Cloud Re-platform:** Prisma → Neon; drop Redis; images → Cloudflare R2; park homelab-monitoring admin; fix lockfile; remove K8s/Flux/Docker artifacts; deploy to Vercel; cut Cloudflare DNS. (CLOUD-01..08)
- **Phase 31 — Recipes Experience:** search, ingredient/step checkboxes, print/kitchen view, breadcrumbs + prev/next, build-your-own-menu (localStorage). (RECIPE-01..05)

**Out of scope (explicit):** restoring/re-platforming the homelab itself (awaiting physical recovery); migrating the n8n job pipeline (it is deleted, not moved); new family-content features beyond recipes; any paid provider tier.
**Canonical refs:** `.planning/REQUIREMENTS.md`, `.planning/ROADMAP.md` §v4.0, `.planning/ui-enhancement-analysis.md`, CLAUDE.md.

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

Last updated: 2026-06-01 — v4.0 Cloud Re-platform & Recipes Experience milestone started
