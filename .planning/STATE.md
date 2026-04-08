# State

## Current Position

Phase: Not started (defining requirements)
Plan: —
Status: Defining requirements
Last activity: 2026-04-08 — Milestone v2.0 started

## What's Done

- v1.0 — Core Site: Complete
- v1.1 — UI Enhancement: Complete
- v1.2 — Integration Solidification: Complete
- v1.3 — Services, Infra & Job Search: Complete
- v1.4 — Admin Dashboard Production Readiness: Complete
- 41 shadcn/ui components, 268 tests passing, build clean
- Zero hardcoded Tailwind colors in any .tsx file

## What's Next

v2.0 — Code Quality Enhancement: audit and fix all React/Next.js code smells

## Last Session

2026-04-08 — v1.4 archived, v2.0 milestone started. Code smells reference created at docs/react-nextjs-code-smells.md.

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
