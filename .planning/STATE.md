# State

## Current Position

Milestone: v1.4 complete
Status: Ready for v2.0
Last activity: 2026-04-08 — v1.4 milestone archived

## What's Done

- v1.0 — Core Site: Complete
- v1.1 — UI Enhancement: Complete (5 phases)
- v1.2 — Integration Solidification: Complete (7 phases, 6-12)
- v1.3 — Services, Infra & Job Search: Complete
- v1.4 — Admin Dashboard Production Readiness: Complete (3 phases, 13-15)
  - Phase 13: Production Deployment — image 20260408173607 deployed via Flux
  - Phase 14: Functional/Perf Verification — 9/9 requirements verified
  - Phase 15: UAT Automation — 30+ browser operations all passed
  - Audit: 15/15 requirements satisfied, all findings resolved
- 41 shadcn/ui components, 268 tests passing, build clean
- Zero hardcoded Tailwind colors in any .tsx file

## What's Next

v2.0 — define requirements and roadmap

## Last Session

2026-04-08 — v1.4 milestone completed and archived. All code fixes applied (dead code removal, kanban useMemo refactor, hydration fix, first-user bootstrap, comment cleanup). Code smells reference created.

## Key Decisions

- TanStack Form (NOT react-hook-form) for all forms
- TanStack Table for admin data tables
- Never remove unused shadcn components — integrate instead
- All colors via globals.css @theme tokens — zero hardcoded Tailwind colors
- Jobs DB is separate PostgreSQL (JOBS_DATABASE_URL), not in Prisma schema
- Flux image tags use YYYYMMDDHHmmss timestamps
- Single PR branch per milestone, merge only when complete
- useMemo for derived state, not useEffect prop-to-state sync
- Explicit timezone (America/Chicago) on all date formatters
- First registered user auto-promoted to owner via databaseHooks
- Production postgres uses postgres-rw (direct CNPG), not postgres-pooler
