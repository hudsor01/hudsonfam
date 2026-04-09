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

## v1.4 — Admin Dashboard Production Readiness (Complete)
- 3 phases (13-15), 15/15 requirements, completed 2026-04-08 — [archive](milestones/v1.4-ROADMAP.md)

## v2.0 — Code Quality Enhancement

**Goal:** Systematically audit and fix all React/Next.js code smells across the entire codebase using `docs/react-nextjs-code-smells.md` as the reference.

### Phases

- [x] **Phase 16: useEffect Audit** — scan every useEffect in the codebase, eliminate unnecessary ones, fix the rest (completed 2026-04-08)
- [x] **Phase 17: Component Structure & State Patterns** — fix nested components, direct state mutation, push "use client" to leaves (completed 2026-04-08)
- [x] **Phase 18: Server/Client Boundaries & Hydration** — fix serialization, data fetching patterns, add loading/error boundaries, fix hydration mismatches (completed 2026-04-08)
- [x] **Phase 19: Verification & Production Deploy** — build, test, lint, deploy, browser UAT (completed 2026-04-08)

### Phase Details

#### Phase 16: useEffect Audit
**Goal**: Zero unnecessary useEffects remain in the codebase — every remaining useEffect is genuinely synchronizing with an external system
**Depends on**: Nothing (first phase)
**Requirements**: EFFECT-01, EFFECT-02, EFFECT-03, EFFECT-04, EFFECT-05, EFFECT-06, EFFECT-07, EFFECT-08
**Success Criteria** (what must be TRUE):
  1. No useEffect derives state from props or other state — useMemo or inline calculation used instead
  2. No useEffect adjusts/resets state on prop change — key prop or render-time adjustment used instead
  3. No chained useEffects that trigger each other — consolidated into event handlers
  4. No useEffect for parent notification, POST requests, or shared event logic — moved to event handlers
  5. Every remaining useEffect has proper cleanup or synchronizes with a genuine external system
**Plans**: 1 plan

#### Phase 17: Component Structure & State Patterns
**Goal**: Clean component architecture — no nested definitions, no direct mutation, optimal "use client" placement
**Depends on**: Phase 16
**Requirements**: COMP-01, COMP-02, BOUNDARY-01, BOUNDARY-02, BOUNDARY-03, BOUNDARY-04, BOUNDARY-05
**Success Criteria** (what must be TRUE):
  1. No component is defined inside another component
  2. All state updates create new object/array references
  3. "use client" is at the lowest possible leaf component
  4. No non-serializable props cross the server/client boundary
  5. Data fetching happens in server components, not client useEffect/SWR
**Plans**: 1 plan

#### Phase 18: Server/Client Boundaries & Hydration
**Goal**: Zero hydration mismatches and full error/loading boundary coverage
**Depends on**: Phase 17
**Requirements**: HYDRATION-01, HYDRATION-02, RESILIENCE-01, RESILIENCE-02
**Success Criteria** (what must be TRUE):
  1. No browser-dependent rendering that differs between SSR and client
  2. All date/time formatting uses explicit timezone
  3. Every route group has loading.tsx
  4. Every route group has error.tsx
**Plans**: 1 plan

#### Phase 19: Verification & Production Deploy
**Goal**: Ship the clean codebase to production and verify nothing broke
**Depends on**: Phase 18
**Requirements**: VERIFY-01, VERIFY-02, VERIFY-03
**Success Criteria** (what must be TRUE):
  1. `npm run build` passes with zero errors
  2. All 268+ tests pass
  3. Production deployment verified with no new console errors
**Plans**: 1 plan

### Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 16. useEffect Audit | 1/0 | Complete    | 2026-04-08 |
| 17. Component Structure & State Patterns | 1/0 | Complete    | 2026-04-08 |
| 18. Server/Client Boundaries & Hydration | 1/0 | Complete    | 2026-04-08 |
| 19. Verification & Production Deploy | 1/0 | Complete    | 2026-04-08 |

## v3.0 — AI Integration (Future)
- Qwen 3.5 photo captions + alt text
- Qdrant + qwen-embed semantic search
- N8N upload automation
- Resend email notifications
- Tdarr video transcoding
- Jellyfin media embeds
