# thehudsonfam.com

## What This Is
Custom family website replacing Glance dashboard. Next.js 16 App Router with Tailwind CSS v4, shadcn/ui, Prisma v7, Better Auth, deployed on K3s. Serves as family content hub (blog, photos, events, memorial) and owner admin panel (homelab monitoring, job search pipeline).

## Core Value
A single home for the Hudson family — content management for everyone, homelab and career tools for the owner.

## Tech Stack
- Next.js 16.2.1 (App Router, Server Components)
- Tailwind CSS v4.2 + shadcn/ui (41 components)
- TypeScript
- Prisma v7 + PostgreSQL (via PgBouncer)
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

## Current Milestone: v1.4 Admin Dashboard Production Readiness

**Goal:** Ship the jobs dashboard to production, optimize performance, and verify end-to-end via browser automation.

**Target features:**
- Deploy jobs dashboard + all infra fixes to production
- Performance/latency optimization for jobs DB queries and page load
- Verify jobs dashboard works in prod (data, kanban, filters, detail sheet)
- Autonomous browser UAT: login → /admin/jobs → verify kanban renders

## Requirements

### Validated
- v1.0: Core site, auth, CRUD, homelab dashboard, K8s deployment, memorial
- v1.1: Theme tokens, 28→41 shadcn components, animations, command palette
- v1.2: Theme alignment, TW4 features, sidebar, TanStack Form/Table, component integration
- v1.3: Services page, infra hardening, job search dashboard, photo compression, color consolidation

### Active
- [ ] Jobs dashboard deployed and functional in production
- [ ] Performance optimized for jobs DB and page load
- [ ] End-to-end browser UAT passes

### Out of Scope
- v2.0 AI features (Qwen, Qdrant, N8N, Resend) — next milestone
- New job search features — this milestone is polish and production readiness only

## Key Decisions
- TanStack Form (NOT react-hook-form) for all forms
- TanStack Table for admin data tables
- Never remove unused shadcn components — integrate instead
- All colors via globals.css @theme tokens — zero hardcoded Tailwind colors
- Jobs DB is separate PostgreSQL (JOBS_DATABASE_URL), not in Prisma schema
- Flux image tags use YYYYMMDDHHmmss timestamps
- Single PR branch per milestone, merge only when complete

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

Last updated: 2026-04-08
