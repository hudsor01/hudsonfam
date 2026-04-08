# Roadmap

## v1.0 — Core Site (Complete)
- Plan 1: Project scaffolding + auth ✅
- Plan 2: Public site (design system, homepage, blog) ✅
- Plan 3: Photos, events, family updates ✅
- Plan 4: Admin panel (CRUD, member management) ✅
- Plan 5: Homelab dashboard (Glance replacement) ✅
- Plan 6: K8s deployment + migration ✅
- Bug fixes + audit ✅
- Tests (274 passing) ✅
- Memorial page (Richard Hudson Sr.) ✅
- Quick wins (RSS, iCal, sitemap, SEO, favicon, 404, loading states) ✅

## v1.1 — UI Enhancement (Complete)
- Phase 1: Foundation (theme tokens, OKLCH, shadcn bridge) ✅
- Phase 2: Core shadcn components (sonner, avatar, alert-dialog, sheet, tooltip, skeleton, select, switch) ✅
- Phase 3: Dashboard overhaul (breadcrumbs, tabs, dropdown menus) ✅
- Phase 4: Public site polish (animations, separators, scroll area) ✅
- Phase 5: Advanced (command palette, photo effects) ✅

## v1.2 — Integration Solidification (Complete)
- Phase 6: Theme alignment — fix CSS variable naming to shadcn standard, hardcoded colors, cn() patterns ✅
- Phase 7: Tailwind v4 quick wins — text-balance, text-pretty, field-sizing, accent-color, caret-color, open/not-* variants ✅
- Phase 8: Tailwind v4 advanced — container queries, shadow colors, scroll snap, 3D effects, accessibility variants, logical properties ✅
- Phase 9: shadcn sidebar upgrade — replace static aside with full SidebarProvider, collapsible, mobile-responsive ✅
- Phase 10: TanStack Form — install @tanstack/react-form + zod, migrate all forms to client-side validation ✅
- Phase 10.5: TanStack Table — install @tanstack/react-table, replace manual admin list rendering with data tables ✅
- Phase 10.7: TanStack Query evaluation — deferred (server-first architecture, no clear benefit) ✅
- Phase 11: Component integration — wire Calendar, Dialog, Drawer, Pagination, Popover, Progress into actual pages ✅
- Phase 12: Ecosystem tooling — shadcn skills, radix migration, blocks evaluation, additional components ✅

## v1.3 — Services, Infra & Job Search (Complete)
- Family services page (/dashboard/services) with live health status ✅
- Google OAuth redirect fix (callbackURL) ✅
- Photo auto-compression (2400px WebP q85) ✅
- Production fixes: "use client" directives, NAS write permissions ✅
- Flux image automation: timestamp tags replacing alphabetical SHA ✅
- Redis auth: REDIS_URL with password for K8s ✅
- Prisma connection pooling + Redis error handling ✅
- Job Search Dashboard (/admin/jobs) — table + kanban views ✅
- .env.example updated with all required vars ✅

## v1.4 — Admin Dashboard Production Readiness

**Goal:** Ship the jobs dashboard to production, optimize performance, and verify end-to-end via browser automation.

### Phases

- [x] **Phase 13: Production Deployment** — get the production pod running with all secrets and no startup errors (completed 2026-04-08)
- [ ] **Phase 14: Functional and Performance Verification** — confirm all jobs dashboard features work correctly in production within performance targets
- [ ] **Phase 15: UAT Automation** — autonomous browser tests prove end-to-end flow from login to kanban render

### Phase Details

#### Phase 13: Production Deployment
**Goal**: The jobs dashboard and all v1.3/v1.4 fixes are running in the production K3s cluster with no startup errors
**Depends on**: Nothing (first phase of milestone)
**Requirements**: DEPLOY-01, DEPLOY-02, DEPLOY-03
**Success Criteria** (what must be TRUE):
  1. A new image tag is deployed to the K3s cluster and the jobs dashboard routes resolve in production
  2. The JOBS_DATABASE_URL secret is mounted in the production pod and the jobs page returns data (not an error)
  3. The production pod starts cleanly — no Redis NOAUTH crash, no Prisma connection timeout, no unhandled event handler error in pod logs
**Plans**: 1 plan
Plans:
- [x] 13-01-PLAN.md — Merge branch, trigger build, reconcile Flux, verify pod health

#### Phase 14: Functional and Performance Verification
**Goal**: Every jobs dashboard feature the admin relies on works correctly in production and meets latency targets
**Depends on**: Phase 13
**Requirements**: FUNC-01, FUNC-02, FUNC-03, FUNC-04, FUNC-05, FUNC-06, PERF-01, PERF-02, PERF-03
**Success Criteria** (what must be TRUE):
  1. Admin can switch between table view (with column sort, filter, and pagination) and kanban view — both render real job data from the production database
  2. Admin can drag a job card from one kanban column to another and the new status persists after a full page refresh
  3. Admin can open a job detail sheet and see the cover letter and company intel without a spinner visible for more than 1 second
  4. Admin can filter the jobs list by source, status, and score range and the visible results match the applied filters
  5. Admin can dismiss a job (remove from active view) and restore it — state persists after refresh; the server-side data fetch that drives all of this completes in under 2 seconds
**Plans**: TBD
**UI hint**: yes

#### Phase 15: UAT Automation
**Goal**: Automated browser tests independently verify the production login, navigation, and kanban render without human intervention
**Depends on**: Phase 14
**Requirements**: UAT-01, UAT-02, UAT-03
**Success Criteria** (what must be TRUE):
  1. An automated browser session completes Google OAuth login and lands on /dashboard without manual steps
  2. The automated session navigates to /admin/jobs and the page loads without a JavaScript error or HTTP error status
  3. The automated session asserts that the kanban board is visible and contains at least one job card
**Plans**: TBD

### Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 13. Production Deployment | 1/1 | Complete    | 2026-04-08 |
| 14. Functional and Performance Verification | 0/? | Not started | - |
| 15. UAT Automation | 0/? | Not started | - |

## v2.0 — AI Integration (Future)
- Qwen 3.5 photo captions + alt text
- Qdrant + qwen-embed semantic search
- N8N upload automation
- Resend email notifications
- Tdarr video transcoding
- Jellyfin media embeds
