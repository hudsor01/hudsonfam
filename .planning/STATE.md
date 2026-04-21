---
gsd_state_version: 1.0
milestone: v3.0
milestone_name: AI Integration
status: active
last_updated: "2026-04-21T00:00:00.000Z"
last_activity: 2026-04-21
progress:
  total_phases: 5
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
---

# State

## Current Position

Phase: 20 (Foundation — Freshness + Zod + Tailored Resume)
Plan: —
Status: Roadmap created; awaiting phase planning
Last activity: 2026-04-21 — v3.0 roadmap committed (5 phases, 24/24 requirements mapped)

Progress: [                    ] 0/5 phases (0%)

## What's Done

- v1.0 — Core Site: Complete
- v1.1 — UI Enhancement: Complete
- v1.2 — Integration Solidification: Complete
- v1.3 — Services, Infra & Job Search: Complete
- v1.4 — Admin Dashboard Production Readiness: Complete
- v2.0 — Code Quality Enhancement: Complete (useEffect audit, component structure, server/client boundaries, hydration)
- v3.0 research: STACK, ARCHITECTURE, FEATURES, PITFALLS, SUMMARY — all HIGH confidence
- v3.0 requirements defined: 24 v1 REQs across AI Artifact Rendering, Owner-Triggered Actions, Safety & Hardening, Data Layer
- v3.0 roadmap: 5 phases (20–24) derived from requirements; 24/24 requirements mapped to phases
- 41 shadcn/ui components, 268 tests passing, build clean
- Zero hardcoded Tailwind colors in any .tsx file

## What's Next

v3.0 — AI Integration Phase 20 (Foundation): isStale util + Zod safeParse + tailored resume render + CSP + schema-drift CI guardrail

Phase order:
- Phase 20: Foundation (Freshness + Zod + Tailored Resume) — no dependencies
- Phase 21: Polish (Copy + PDF + Empty States + Link-out) — depends on Phase 20; parallel-safe with Phase 22
- Phase 22: Salary Intelligence (Defensive Render) — depends on Phase 20; ships before homelab task #11
- Phase 23: Owner-Triggered Workflows (Pattern Setter) — depends on Phase 20
- Phase 24: Regenerate Expansion — depends on Phases 22 + 23

## Last Session

2026-04-21 — v3.0 AI Integration roadmap created. 5 phases derived from the 24 v1 REQs:
  - Phase 20 (Foundation): 7 REQs — AI-RENDER-01/02, AI-SAFETY-01/05/06, AI-DATA-03/04
  - Phase 21 (Polish): 5 REQs — AI-ACTION-01/02, AI-RENDER-04/05/06
  - Phase 22 (Salary Intel defensive): 4 REQs — AI-RENDER-03/07, AI-DATA-01/02
  - Phase 23 (Owner-triggered pattern-setter): 5 REQs — AI-ACTION-03/04, AI-SAFETY-02/03/04
  - Phase 24 (Regenerate expansion): 3 REQs — AI-ACTION-05/06/07

Top-5 pitfalls mapped to phases:
  - Pitfall 1 (LLM-text XSS) → Phase 20 (AI-SAFETY-01/05/06)
  - Pitfall 4 (schema drift) → Phase 20 + Phase 22 (AI-DATA-01/02/04 + AI-SAFETY-06)
  - Pitfall 6 (stale cache) → Phase 20 (timestamps) + Phase 23 (polling) + Phase 24 (silent-success)
  - Pitfall 3 (webhook unsigned + verbose errors) → Phase 23 (AI-SAFETY-02/03/04)
  - Pitfall 5 (salary provenance) → Phase 22 (AI-RENDER-07)

Scope constraints honored: interview_prep / recruiter_outreach out of scope; DASH-01 (SEED-001) and EDIT-01/02/03 deferred to v3.1; Phase 22 does NOT block on homelab task #11.

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
- v3.0: Streamdown over react-markdown (React 19 / Tailwind v4 / shadcn-native)
- v3.0: Recharts via shadcn chart only if salary range viz ships (fallback: hand-rolled SVG)
- v3.0: No PDF viewer library — download-only pattern preserved
- v3.0: Server Actions (not Route Handlers) for regenerate — no public surface, owner-only session auth
- v3.0: HMAC-SHA256 + X-Idempotency-Key + sentinel-error scrubbing on every n8n webhook
- v3.0: Zod safeParse at jobs-db.ts query boundary — fail-open with log, never crash the page
- v3.0: Pure isStale() util; freshness computed in server fetch layer, not SQL, not client (hydration-safe)
- v3.0: CSP header on /admin/* (default-src 'self'; object-src 'none'; frame-ancestors 'none')
- v3.0: Phase 22 (Salary Intel render) ships BEFORE homelab task #11 — defensive LEFT JOIN LATERAL tolerates empty data via AI-RENDER-04 empty state
