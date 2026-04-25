# thehudsonfam.com

## What This Is
Custom family website replacing Glance dashboard. Next.js 16 App Router with Tailwind CSS v4, shadcn/ui, Prisma v7, Better Auth, deployed on K3s. Serves as family content hub (blog, photos, events, memorial) and owner admin panel (homelab monitoring, job search pipeline).

## Core Value
A single home for the Hudson family — content management for everyone, homelab and career tools for the owner.

## Tech Stack
- Next.js 16.2.1 (App Router, Server Components)
- Tailwind CSS v4.2 + shadcn/ui (41 components)
- TypeScript
- Prisma v7 + PostgreSQL (via CloudNativePG, direct connection)
- Better Auth + Google OAuth + Redis session cache
- TanStack Form + TanStack Table
- @hello-pangea/dnd (kanban drag-drop)
- sharp (image processing — WebP 2400px cap)
- MDX (blog content)
- Vitest + MSW (268 tests)

## Architecture
Single Next.js monolith with 4 route groups:
- `(public)` — public site (homepage, blog, photos, events, family, memorial)
- `(auth)` — login, signup, forgot, reset, verify
- `(dashboard)` — content management for family (posts, photos, albums, events, updates, members, memorial)
- `(admin)` — homelab monitoring + job search pipeline (owner only)

## Deployment
GitHub Actions → GHCR (timestamp tags) → Flux ImageRepository scan → ImagePolicy promote → IUA writes to `flux-image-updates` branch → 2-min CronJob fast-forwards `main` → Flux Kustomization apply → K3s rolling update
URL: thehudsonfam.com via Cloudflare Tunnel

## Current State

**Shipped:** v3.5 CI/CD Hardening — closed 2026-04-25 (tag `v3.5-complete`, commit `f02440c`). v3.0 AI Integration also shipped (was deploy-blocked pre-v3.5; now fully production-verified via Phase 28 retroactive UAT).
**Production image:** auto-rolled per push (current at audit time: `ghcr.io/hudsor01/hudsonfam:20260425*`)
**Current milestone:** None active — ready for v4.0 planning when owner is ready

### Validated (all milestones)
- v1.0: Core site, auth, CRUD, homelab dashboard, K8s deployment, memorial
- v1.1: Theme tokens, 28→41 shadcn components, animations, command palette
- v1.2: Theme alignment, TW4 features, sidebar, TanStack Form/Table, component integration
- v1.3: Services page, infra hardening, job search dashboard, photo compression, color consolidation
- v1.4: Jobs dashboard production deployment, 15/15 requirements verified, exhaustive browser UAT
- v2.0: useEffect audit, component structure cleanup, server/client boundaries, hydration fixes
- v3.0: Freshness + Zod safeParse at DB boundary (Phase 20); empty-state copy + link-out polish (Phase 21); salary_intelligence defensive render (Phase 22); HMAC-signed + idempotency-keyed owner-triggered webhooks with sentinel errors (Phase 23); generalized regenerate pattern across all 3 AI artifacts + silent-success warning (Phase 24). 23 REQs shipped; 564/564 tests green. Production UAT for all 5 phases deferred to v3.5-P4 (deploy pipeline broken; see SEED-005).

## Current Milestone: v3.5 CI/CD Hardening

**Goal:** Eliminate the "CI breaks every time" DX pattern by migrating hudsonfam deploy from broken self-hosted Forgejo+Woodpecker pipeline to the CLAUDE.md-intended GitHub Actions + GHCR pattern. Unlock retroactive production UAT for the accumulated v3.0 backlog (Phases 21-24).

**Target features:**
- GitHub Actions workflow (`.github/workflows/build-and-push.yml`) that builds Dockerfile and pushes to GHCR with `YYYYMMDDHHmmss` tags on push-to-main
- Flux reconfiguration so `imagerepository/hudsonfam` watches `ghcr.io/hudsor01/hudsonfam` (via a GHCR PAT provisioned through the ExternalSecret pattern)
- Decommission the broken `default/imagerepository/hudsonfam`, orphaned Woodpecker repo registration, and stale `git.homelab` registry entries
- End-to-end smoke test (no-op commit → GitHub Actions build → GHCR push → Flux reconcile → K3s rollout) + CLAUDE.md docs update reflecting the live pipeline
- Retroactive execution of all deferred v3.0 production UAT (Plan 21-08 + Phases 22/23/24 prod smoke tests) in a single v3.5-P4 pass

**Out of scope (explicit):** Migration of homelab-manifests-repo deploy path (homelab is a separate concern); new feature work (v3.5 is infra-only); retention of any Forgejo+Woodpecker hudsonfam-specific configuration (full decommission, not coexistence).
**Canonical refs:** `.planning/notes/ci-cd-fragility-analysis.md`, `.planning/seeds/SEED-005-cicd-hardening-migration.md`, CLAUDE.md §Deployment.

## Key Decisions
- TanStack Form (NOT react-hook-form) for all forms
- TanStack Table for admin data tables
- Never remove unused shadcn components — integrate instead
- All colors via globals.css @theme tokens — zero hardcoded Tailwind colors
- Jobs DB is separate PostgreSQL (JOBS_DATABASE_URL), not in Prisma schema
- Flux image tags use YYYYMMDDHHmmss timestamps
- Single PR branch per milestone, merge only when complete
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

Last updated: 2026-04-21 — v3.0 AI Integration milestone started
