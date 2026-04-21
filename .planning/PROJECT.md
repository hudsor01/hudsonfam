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
- `(dashboard)` — content management for family (posts, photos, albums, events, updates, members, memorial, services)
- `(admin)` — homelab monitoring + job search pipeline (owner only)

## Deployment
Docker → GHCR → Flux GitOps (timestamp tags) → K3s cluster
URL: thehudsonfam.com via Cloudflare Tunnel

## Current State

**Shipped:** v2.0 Code Quality Enhancement (2026-04-08)
**Production image:** ghcr.io/hudsor01/hudsonfam:20260408173607
**Current milestone:** v3.0 — AI Integration

### Validated (all milestones)
- v1.0: Core site, auth, CRUD, homelab dashboard, K8s deployment, memorial
- v1.1: Theme tokens, 28→41 shadcn components, animations, command palette
- v1.2: Theme alignment, TW4 features, sidebar, TanStack Form/Table, component integration
- v1.3: Services page, infra hardening, job search dashboard, photo compression, color consolidation
- v1.4: Jobs dashboard production deployment, 15/15 requirements verified, exhaustive browser UAT
- v2.0: useEffect audit, component structure cleanup, server/client boundaries, hydration fixes

## Current Milestone: v3.0 AI Integration

**Goal:** Surface the existing n8n Job Search pipeline's AI output in /admin/jobs and fix the upstream data gaps that leave the UI blank.

**Target features:**
- Render `tailored_resumes` in the job detail sheet (data exists, query exists, UI missing)
- Make `company_research` actually populate (UI renders it; upstream workflow produces nothing)
- Model + render `salary_intelligence` in the app, plus fix the workflow's batch-INSERT parameter-limit bug

**Out of scope (explicit):** `interview_prep`, `recruiter_outreach` — owner direction.
**Deferred (SEED-001):** aggregate pipeline-health dashboard — revisit after detail-sheet gaps close.

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
