---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: — Core Site
status: planning
last_updated: "2026-04-08T17:40:56.306Z"
last_activity: 2026-04-08
progress:
  total_phases: 3
  completed_phases: 1
  total_plans: 1
  completed_plans: 1
  percent: 100
---

# State

## Current Position

Phase: 14
Plan: Not started
Status: Ready to plan
Last activity: 2026-04-08

## What's Done

- v1.0 — Core Site: Complete
- v1.1 — UI Enhancement: All 5 phases complete
  - Phase 1: Foundation — OKLCH colors, theme tokens, shadcn bridge
  - Phase 2: Core Components — Sonner, Avatar, AlertDialog, Sheet, Tooltip, Skeleton, Select, Switch
  - Phase 3: Dashboard — Breadcrumbs, Tabs, DropdownMenu row actions
  - Phase 4: Public Site — fade-in-up animations, Separator, ScrollArea
  - Phase 5: Advanced — Command palette, photo hover effects
- v1.2 — Integration Solidification: All 7 phases complete (6-12)
  - Phase 6: Theme Alignment — shadcn-standard variable naming, destructive tokens, cn() fixes, 12 new components (40 total)
  - Phase 7: TW4 Quick Wins — text-balance/text-pretty, caret-primary, open:/not-last: variants
  - Phase 8: TW4 Advanced — container queries, themed shadows, OKLCH gradients, scroll snap, 3D hover, contrast-more/less, logical properties
  - Phase 9: Sidebar Upgrade — shadcn SidebarProvider with collapsible, mobile Sheet, active state, Cmd+B shortcut
  - Phase 10: TanStack Form — @tanstack/react-form + zod, migrated all 5 forms
  - Phase 10.5: TanStack Table — DataTable component, posts/events/members tables with sort/filter/pagination
  - Phase 10.7: TanStack Query — evaluated, deferred (server-first architecture)
  - Phase 11: Component Integration — Calendar date picker, Dialog/Drawer quick actions, Pagination, Progress, Popover user profile
  - Phase 12: Ecosystem Tooling — unified radix-ui package, Collapsible/HoverCard integration
- 41 shadcn/ui components installed at src/components/ui/
- 268 tests passing, build clean
- v1.3 — Services, Infra & Job Search: Complete
  - Family Services page (/dashboard/services) — 5 services, live health status, LAN badge, auto-refresh
  - Google OAuth redirect fix — callbackURL: "/dashboard" on login and signup
  - Photo auto-compression — originals capped at 2400px wide, WebP q85 on upload
  - "use client" fix — FeaturedPost and PostCard had onClick without directive
  - NAS volume fix — readOnly: false for photo uploads
  - Flux image automation fix — timestamp tags replacing alphabetical SHA ordering
  - Redis auth fix — REDIS_URL added to K8s secrets for authenticated Redis
  - Job Search Dashboard (/admin/jobs) — TanStack Table + Kanban with @hello-pangea/dnd
    - 6-stage pipeline: new → interested → applied → interview → offer → rejected
    - Filters sidebar, stats bar, detail sheet, cover letter PDF route
    - Separate JOBS_DATABASE_URL for external jobs DB
    - N8N webhook integration for job operations

## What's Next

Phase 13: Production Deployment — deploy jobs dashboard to K3s, wire JOBS_DATABASE_URL secret, confirm pod starts clean

## Last Session

2026-04-08 — v1.4 roadmap created (3 phases: 13 Production Deployment, 14 Functional/Perf Verification, 15 UAT Automation)

## Key Decisions

- Use TanStack Form (NOT react-hook-form) for form validation — user requirement
- Use TanStack Table for admin data tables — user requirement
- Never remove unused shadcn components — integrate them into the project instead
- Photo originals compressed to WebP 2400px max on upload — space savings
- Hudson AI health check skipped — LAN-only, not reachable from K8s cluster
- Flux image tags use YYYYMMDDHHmmss timestamps — alphabetical SHA ordering was broken
- Job search uses separate PostgreSQL database (JOBS_DATABASE_URL), not the main app DB
