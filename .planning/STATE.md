---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: — Core Site
status: executing
last_updated: "2026-04-21T18:25:50.165Z"
last_activity: "2026-04-21 — Plan 20-03 complete (Zod safeParse fail-open at jobs-db boundary; 283/283 tests pass)"
progress:
  total_phases: 5
  completed_phases: 0
  total_plans: 8
  completed_plans: 3
  percent: 38
---

# State

## Current Position

Phase: 20 (Foundation — Freshness + Zod + Tailored Resume) — EXECUTING
Plan: 4 of 8 — Plan 20-03 COMPLETE; next is 20-04 (FreshnessBadge + SectionErrorBoundary)
Status: Executing Phase 20
Last activity: 2026-04-21 — Plan 20-03 complete (Zod parseOrLog fail-open wraps cover_letter/company_research/tailored_resume at jobs-db boundary; +8 Vitest cases; 283/283 tests pass)

Progress: [###                 ] 3/8 plans in phase 20 (38%)

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

v3.0 — AI Integration Phase 20 (Foundation) — Plan 20-02: implement pure `isStale()` util (hydration-safe, server-computed freshness). Then 20-03 (Zod safeParse at jobs-db boundary), 20-04 (FreshnessBadge + ErrorBoundary), 20-05 (TailoredResumeSection + XSS test), 20-06 (job-detail-sheet integration), 20-07 (proxy.ts CSP), 20-08 (schema-drift CI guardrail).

Phase order:

- Phase 20: Foundation (Freshness + Zod + Tailored Resume) — no dependencies
- Phase 21: Polish (Copy + PDF + Empty States + Link-out) — depends on Phase 20; parallel-safe with Phase 22
- Phase 22: Salary Intelligence (Defensive Render) — depends on Phase 20; ships before homelab task #11
- Phase 23: Owner-Triggered Workflows (Pattern Setter) — depends on Phase 20
- Phase 24: Regenerate Expansion — depends on Phases 22 + 23

## Last Session

2026-04-21 18:24 UTC — Plan 20-03 executed. Zod safeParse fail-open wrapper (`parseOrLog<T>`) shipped in `src/lib/jobs-schemas.ts` with CoverLetter/CompanyResearch/TailoredResume schemas. `getJobDetail()` now validates all three LLM artifacts INDEPENDENTLY at the return boundary — drift on one does not null out the others. One Rule 3 auto-fix: added the missing `tailored_resume` LEFT JOIN + `TailoredResume` interface + `JobDetail.tailored_resume` field to `jobs-db.ts` (plan 20-06 depends on this being present; plan 20-03 implicitly required it via the 3-parseOrLog acceptance criterion). 8 new Vitest cases in `src/__tests__/lib/jobs-db-zod.test.ts` (valid / missing-field / wrong-type / null / undefined / pathological / tailored_resume-null-model / company_research-nullable). Full suite: 283/283 (275 baseline + 8 new). Build clean. AI-SAFETY-06 complete. Next: plan 20-04 (FreshnessBadge + SectionErrorBoundary). See .planning/phases/20-foundation-freshness-zod-tailored-resume/20-03-SUMMARY.md.

2026-04-21 18:09 UTC — Plan 20-02 executed. Pure `isStale(timestamp, thresholdDays, now?)` util + `STALE_THRESHOLDS` constants + `ArtifactKind` type shipped in `src/lib/job-freshness.ts` with 7 Vitest cases in `src/__tests__/lib/job-freshness.test.ts`. TDD RED→GREEN, no deviations, no auto-fixes. Full suite: 275/275 (268 baseline + 7 new). AI-DATA-03 complete. Next: plan 20-03 (Zod schemas + parseOrLog at jobs-db.ts boundary). See .planning/phases/20-foundation-freshness-zod-tailored-resume/20-02-SUMMARY.md.

2026-04-21 18:04 UTC — Plan 20-01 executed. streamdown@^2.5.0 installed as runtime dep; `@source "../../node_modules/streamdown/dist/*.js"` added at line 3 of globals.css. Build + tests green (268/268). Two Rule 3 auto-fixes: --legacy-peer-deps required (pre-existing zod conflict), @testing-library/dom pinned as explicit devDep. AI-RENDER-01 complete. Next: plan 20-02 (isStale util). See .planning/phases/20-foundation-freshness-zod-tailored-resume/20-01-SUMMARY.md.

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
- v3.0 Plan 20-01: `--legacy-peer-deps` is now required for ALL npm installs in this repo (pre-existing @tanstack/zod-form-adapter zod@^3 vs project zod@^4.3.6 conflict) — tracked as tech-debt to resolve by migrating off zod-form-adapter
- v3.0 Plan 20-01: Tailwind v4 `@source` directive uses single-asterisk glob `dist/*.js` (verified against Vercel's official streamdown docs), NOT the double-asterisk form in CONTEXT.md D-14
- v3.0 Plan 20-01: `@testing-library/dom` pinned as explicit devDep to survive future `--legacy-peer-deps` prunes
- v3.0 Plan 20-02: `isStale` is a zero-dep pure util (no date-fns) — epoch-ms subtraction is one line; date-fns is deferred to Plan 04 for user-facing `formatDistanceToNow`
- v3.0 Plan 20-02: Inclusive staleness boundary (`ageDays >= thresholdDays`) — at exactly 14 days, a cover letter IS stale; test 4 enforces this to prevent off-by-one drift
- v3.0 Plan 20-02: Silent-fail on both `null` and unparseable timestamps — badge is informational (D-03), so a bad DB row degrades to "no badge" rather than crashing the detail sheet
- v3.0 Plan 20-02: `STALE_THRESHOLDS` colocated with `isStale` in the same file — one import for callers, avoids orphan constants file
- v3.0 Plan 20-03: `parseOrLog<T>(schema, raw, label, jobId)` is the project convention for runtime row validation at DB boundaries — null/undefined passthrough, `[jobs-db] <label> schema drift` with `{ jobId, issues }` on drift, returns `null` so the outer JobDetail survives
- v3.0 Plan 20-03: Each nested LLM artifact validated INDEPENDENTLY at the `getJobDetail` return boundary — cover_letter / company_research / tailored_resume each get their own `parseOrLog` call so a drift on one does not null out the others (matches D-11 fail-open invariant)
- v3.0 Plan 20-03: `parseOrLog` signature uses `z.ZodType<T>` (the stable public Zod v4 generic), NOT `z.ZodSchema<T>` from the RESEARCH.md snippet — ZodType is the recommended generic supertype
- v3.0 Plan 20-03: Both `null` AND `undefined` raw inputs pass through `parseOrLog` silently — defensive against LEFT JOIN miss edge cases across callers
- v3.0 Plan 20-03: Added `tailored_resume` LEFT JOIN + `TailoredResume` interface + `JobDetail.tailored_resume` field to jobs-db.ts (Rule 3 deviation) — plan 20-06 depends on detail.tailored_resume being on JobDetail, plan 20-03's 3-parseOrLog acceptance criterion implicitly required this plumbing
- v3.0 Plan 20-03: `row.cr_salary_currency ?? "USD"` default preserved — its removal is scoped to Phase 22 (salary intelligence defensive render) per CONTEXT.md

## Blockers

None.

## Performance Metrics

| Phase | Plan  | Duration | Tasks | Files | Completed            |
|-------|-------|----------|-------|-------|----------------------|
| 20    | 20-01 | 3m 10s   | 2     | 3     | 2026-04-21T18:04:12Z |
| 20    | 20-02 | 1m 19s   | 1     | 2     | 2026-04-21T18:09:57Z |
| 20    | 20-03 | ~4m      | 2     | 3     | 2026-04-21T18:24:00Z |

**Planned Phase:** 20 (Foundation (Freshness + Zod + Tailored Resume)) — 8 plans — 2026-04-21T17:09:58.121Z
