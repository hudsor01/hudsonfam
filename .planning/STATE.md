---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: — Core Site
status: executing
last_updated: "2026-04-21T19:07:39Z"
last_activity: 2026-04-21 — Plan 20-07 complete (middleware.ts CSP + per-request nonce on /admin/*; AI-SAFETY-05 closed; Rule 1 deviation: proxy.ts → middleware.ts because Next.js 16.2.1 doesn't recognize the new proxy convention)
progress:
  total_phases: 5
  completed_phases: 0
  total_plans: 8
  completed_plans: 7
  percent: 88
---

# State

## Current Position

Phase: 20 (Foundation — Freshness + Zod + Tailored Resume) — EXECUTING
Plan: 7 of 8 complete (20-01, 20-02, 20-03, 20-04, 20-05, 20-07, 20-08); next is 20-06 (attach freshness + wire TailoredResumeSection into job-detail-sheet.tsx)
Status: Executing Phase 20
Last activity: 2026-04-21 — Plan 20-07 complete (middleware.ts CSP + per-request nonce on /admin/*; AI-SAFETY-05 closed; Rule 1 deviation: proxy.ts → middleware.ts because Next.js 16.2.1 doesn't recognize the new proxy convention)

Progress: [######### ] 7/8 plans in phase 20 (88%)

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

v3.0 — AI Integration Phase 20 (Foundation) — Plan 20-06 next: attach freshness in fetchJobDetail (pre-compute relativeTime + isStale + ageDays server-side via attachFreshness helper) and wire FreshnessBadge + SectionErrorBoundary + TailoredResumeSection into job-detail-sheet.tsx. This is the last remaining plan in Phase 20 (7/8 complete).

Phase order:

- Phase 20: Foundation (Freshness + Zod + Tailored Resume) — no dependencies
- Phase 21: Polish (Copy + PDF + Empty States + Link-out) — depends on Phase 20; parallel-safe with Phase 22
- Phase 22: Salary Intelligence (Defensive Render) — depends on Phase 20; ships before homelab task #11
- Phase 23: Owner-Triggered Workflows (Pattern Setter) — depends on Phase 20
- Phase 24: Regenerate Expansion — depends on Phases 22 + 23

## Last Session

2026-04-21 19:07 UTC — Plan 20-07 executed. CSP middleware shipped at `/home/dev-server/hudsonfam/middleware.ts` (77 lines) with per-request base64 nonce (`Buffer.from(crypto.randomUUID()).toString('base64')`), full CSP shape per D-04 (`default-src 'self'`, `script-src 'self' 'nonce-{n}' 'strict-dynamic'` + dev-mode `'unsafe-eval'`, `style-src 'self' 'unsafe-inline'`, `object-src 'none'`, `frame-ancestors 'none'`, `base-uri 'self'`, `form-action 'self'`), dual-written to both `request.headers` (for Server Components via `next/headers`) and `response.headers` (for browser enforcement). matcher scoped strictly to `['/admin/:path*']` per D-05 — public site / blog MDX unaffected. `src/app/(admin)/layout.tsx` updated with `const nonce = (await headers()).get('x-nonce'); void nonce;` — latent plumbing, retrofit-ready for any future `<Script nonce={nonce}>`. One Rule 1 deviation during the human-verify checkpoint: plan specified `proxy.ts` + `export function proxy` per Next.js 16 docs (via Context7 /vercel/next.js), but empirical testing in Next.js 16.2.1 showed the middleware-manifest stays empty and no header is served. Renamed `proxy.ts` → `middleware.ts` and `export function proxy` → `export function middleware` (commit 97a60c5); production mode then served the CSP correctly on first attempt. Known issue: Turbopack dev mode (`npm run dev`) does not invoke middleware despite correct compilation — upstream Turbopack limitation, NOT our code; production (`next build && next start`) works. Verified via `curl -sI http://localhost:3002/admin/jobs | grep -i content-security-policy` → full CSP with random per-request nonce; `curl -sI http://localhost:3002/` → no CSP (matcher correctly excludes). AI-SAFETY-05 complete. Three task commits (f91707f, dfa95a3, 97a60c5). Next: plan 20-06 (last remaining in Phase 20 — wire freshness + TailoredResumeSection into job-detail-sheet.tsx). See .planning/phases/20-foundation-freshness-zod-tailored-resume/20-07-SUMMARY.md.

2026-04-21 18:53 UTC — Plan 20-05 executed. `TailoredResumeSection` client component shipped at `src/app/(admin)/admin/jobs/tailored-resume-section.tsx` (80 lines) — renders `detail.tailored_resume.content` as formatted markdown via `<Streamdown skipHtml linkSafety={{ enabled: false }}>`, matching UI-SPEC §1 render tree exactly (FileText size-4 heading, FreshnessBadge meta, bg-card/50 rounded-lg p-4 border border-border max-h-96 overflow-y-auto body). Returns null when artifact absent (Phase 21 adds empty-state copy). Exports `TailoredResumeView` + `ResumeFreshness` types for Plan 20-06 server-side plumbing. 11 new Vitest cases across two files: 5 XSS regression assertions in `tailored-resume-xss.test.tsx` (3 payloads × no-<script>/no-<iframe>/no-onerror/no-on*-attrs + safe-markdown happy path + javascript:-URI href-stripping) + 6 render-shape tests in `tailored-resume-section.test.tsx` (heading+icon, Streamdown output via data-streamdown="strong" selector, null-returns-null, stale amber dot aria-label, model in meta line, no whitespace-pre-wrap). Two Rule 1 auto-fixes caught in TDD RED phase: (1) Streamdown's `skipHtml` is STRONGER than plan assumed — it strips `<script>/<iframe>` entirely (empty output) and replaces `<img onerror>` with a "[Image blocked]" placeholder span; tests updated to assert the stronger "no executable DOM emitted" invariant plus "no on* handler on any element". (2) Streamdown emits `<span data-streamdown="strong">` not `<strong>` for bold markdown; selector updated. Zero changes to production component code — both fixes were in test assertions only. Full suite 305/305 green (294 baseline + 11 new). Production build clean (only pre-existing env-var warnings). AI-RENDER-01 + AI-SAFETY-01 complete. Next: plan 20-06 (attach freshness in fetchJobDetail + mount TailoredResumeSection inside SectionErrorBoundary in job-detail-sheet.tsx). See .planning/phases/20-foundation-freshness-zod-tailored-resume/20-05-SUMMARY.md.

2026-04-21 18:43 UTC — Plan 20-04 executed. Two reusable client components shipped for Phase 20 AI artifact sections: `FreshnessBadge` (src/app/(admin)/admin/jobs/freshness-badge.tsx, 87 lines) renders `Generated {relativeTime} · {modelUsed}` with optional amber stale-dot (bg-warning) + shadcn Tooltip on stale state, and `SectionErrorBoundary` (src/app/(admin)/admin/jobs/section-error-boundary.tsx, 79 lines) is a hand-rolled React class boundary with getDerivedStateFromError + componentDidCatch that logs `[ai-section]` payloads server-side only + renders a muted italic fallback per UI-SPEC §3 ("Couldn't render this section — the data may have changed shape."). TDD RED→GREEN for both tasks (no REFACTOR needed). 11 new Vitest cases: 5 for FreshnessBadge (fresh+model, no-model, stale-dot+ARIA, null-when-empty, typography classes) + 6 for SectionErrorBoundary (happy path, fallback copy, server-log payload, boundary isolation, muted-not-destructive classes, per-section labels). Full suite 294/294 green (283 baseline + 11 new). Production build clean. Zero deviations. Zero new deps. AI-RENDER-02 complete. Next: plan 20-05 (TailoredResumeSection + XSS test). See .planning/phases/20-foundation-freshness-zod-tailored-resume/20-04-SUMMARY.md.

2026-04-21 18:37 UTC — Plan 20-08 executed. Schema-drift pre-push hook shipped. `scripts/check-jobs-schema.ts` (104 lines) queries `information_schema.columns` against an EXPECTED map of 6 tables × 62 columns audited from `src/lib/jobs-db.ts`. Exits 1 with `Expected column '<col>' on table '<table>' (referenced in jobs-db.ts); not found in n8n database.` on drift, exits 0 with skip warning when `JOBS_DATABASE_URL` unset. `scripts/install-hooks.sh` (29 lines) installs `.git/hooks/pre-push` (`npm run test:schema || exit 1`); idempotent, self-chmods. `package.json` gets `"test:schema": "bun scripts/check-jobs-schema.ts"`; CLAUDE.md §Commands documents the one-time install. Zero new npm deps (no husky per CONTEXT.md D-07). Human-verify checkpoint passed with 4 scenarios: baseline OK (6 tables / 62 columns), synthetic drift → exit 1 with correct error line, `git hook run pre-push` → exit 1, actual `git push origin HEAD:refs/heads/drift-test` → ABORTED client-side before any ref reached origin. No deviations. AI-DATA-04 complete. Next: plan 20-04 (FreshnessBadge + SectionErrorBoundary). See .planning/phases/20-foundation-freshness-zod-tailored-resume/20-08-SUMMARY.md.

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
- v3.0 Plan 20-08: Native git hooks over husky for this repo — CONTEXT.md D-07 anti-dep stance locks in "zero new deps for a single hook"; husky's cross-platform indirection is unjustified for a solo-dev project
- v3.0 Plan 20-08: Schema-drift audit scope is narrow — EXPECTED map covers only columns `jobs-db.ts` actually SELECTs/INSERTs. n8n schema additions during its own upgrade cadence are not drift from this app's perspective (CONTEXT.md D-08)
- v3.0 Plan 20-08: `JOBS_DATABASE_URL` unset → graceful skip with exit 0 — lets fresh clones push without provisioning the jobs DB locally; maintainer's machine runs the real guard
- v3.0 Plan 20-08: Hook bypass via `git push --no-verify` explicitly accepted per threat T-20-08-02 (solo-dev assumption A3). CI enforcement is the documented escalation path if bypasses occur
- v3.0 Plan 20-08: Host-only connection-string logging — `JOBS_DATABASE_URL.split('@')[1]` prints `host:port/db`, never the password in the prefix (T-20-08-03 mitigation)
- v3.0 Plan 20-08: Phase 22 (salary_intelligence) must extend the EXPECTED map at `scripts/check-jobs-schema.ts` when it lands — otherwise silent-drift false-negative for that table. Tracked as forward reminder in 20-08-SUMMARY.md.
- v3.0 Plan 20-04: FreshnessBadge is pure-display — never calls `new Date()` client-side. All date math (relativeTime + isStale + ageDays) is server-computed and passed through as primitives. Hydration-safe per UI-SPEC §Pattern 2
- v3.0 Plan 20-04: Hand-rolled React class SectionErrorBoundary over react-error-boundary dep per CONTEXT.md D-09. 4 boundaries total in the codebase; 30-LoC class is plenty
- v3.0 Plan 20-04: Both new components require `"use client"` — FreshnessBadge needs Radix Tooltip state; SectionErrorBoundary is a class component (cannot SSR in Next.js 16 App Router)
- v3.0 Plan 20-04: TooltipProvider wrapped INSIDE FreshnessBadge's stale branch, not in the caller — badge is drop-in; caller never has to know whether an artifact is stale
- v3.0 Plan 20-04: Separator is U+00B7 middle-dot (not hyphen, not pipe) with `aria-hidden="true"` — visual-only; screen readers read "Stale artifact Generated 3 days ago gpt-4o-mini" without the dot glyph
- v3.0 Plan 20-04: Fallback UI uses `text-muted-foreground italic` NOT `text-destructive`. Stale-data and render-shape drift are informational; `text-destructive` stays reserved for Phase 23 regenerate failures (actionable)
- v3.0 Plan 20-04: Fallback is terminal for Phase 20 (no "Retry" button). Retry belongs with regenerate in Phase 23; coupling display to action UI that doesn't exist yet would be premature
- v3.0 Plan 20-04: Log prefix `[ai-section]` on componentDidCatch's `console.error` + structured payload `{ section, jobId, error, stack, componentStack }` — greppable in kubectl logs and JSON-parseable by downstream log tooling. Error detail never leaves the server
- v3.0 Plan 20-04: Curly apostrophe + em-dash encoded as `&rsquo;`/`&mdash;` HTML entities in JSX; renders as the correct Unicode glyph in the DOM; Vitest assertions match the Unicode form (not the entity)
- v3.0 Plan 20-05: Streamdown posture for this repo — ALWAYS pass BOTH `skipHtml` AND `linkSafety={{ enabled: false }}`. Omitting `skipHtml` lets `rehype-raw` parse LLM HTML (default pipeline); omitting `linkSafety` defaults to the modal-confirmation flow that's friction on an owner-only surface. CONTEXT.md D-12's "default pipeline is safe" wording is misleading and RESEARCH.md §Q2 is the authoritative correction
- v3.0 Plan 20-05: Streamdown's `skipHtml` behavior is stronger than the plan assumed — `<script>` and `<iframe>` are stripped entirely (empty output), `<img onerror>` is replaced with an "[Image blocked]" placeholder span. XSS tests assert the stronger "no executable DOM / no on* attrs anywhere" invariant, not the weaker "payload visible as literal text" form
- v3.0 Plan 20-05: Streamdown emits `<span class="font-semibold" data-streamdown="strong">` for `**bold**` markdown, NOT a `<strong>` element — tests use `[data-streamdown="strong"]` selector. Same marker pattern applies to other semantic roles (headings get classed `<hN>` but em/strong/code get data-streamdown markers on styled spans)
- v3.0 Plan 20-05: `TailoredResumeView` + `ResumeFreshness` types colocated with the component (exported from `tailored-resume-section.tsx`), not lifted to `src/lib/types.ts` — matches `freshness-badge.tsx` cadence; Plan 20-06 imports from `@/app/(admin)/admin/jobs/tailored-resume-section` cleanly
- v3.0 Plan 20-05: `javascript:`-URI href-stripping is covered as a bonus test — rehype-harden (bundled with Streamdown) filters the scheme independent of `skipHtml`, so this guard is free and catches a realistic XSS path (malicious markdown link, not raw HTML)
- v3.0 Plan 20-07: File MUST be `middleware.ts` + `export function middleware`, NOT `proxy.ts` — Next.js 16 docs claim proxy convention but 16.2.1's middleware-manifest empirically only recognizes middleware.ts. The proxy convention may be active in 16.3+; until then traditional naming is required. Documented in the middleware.ts file header for future upgrade awareness
- v3.0 Plan 20-07: CSP set on BOTH request and response headers — request so Server Components can read nonce via `headers()`, response so browser enforces. Setting only one is a silent miss
- v3.0 Plan 20-07: `'unsafe-eval'` included in script-src only when `NODE_ENV === 'development'` — required for Turbopack HMR eval()-based module loading; production excludes it for strict enforcement
- v3.0 Plan 20-07: `'strict-dynamic'` in script-src is load-bearing — lets Next.js's `_next/static/chunks/*.js` webpack runtime (loaded by nonce-allowed script) work without per-chunk nonce plumbing
- v3.0 Plan 20-07: Known issue — Turbopack dev mode (`npm run dev`) does not invoke middleware despite correct compilation; upstream Turbopack limitation, NOT our code. Production (`next build && next start`) works correctly. Local-dev CSP testing requires production mode. No impact on deployed container (K3s runs production)
- v3.0 Plan 20-07: Real CSP from day one, NOT Report-Only — tailored resume (Plan 20-05) is the first markdown-rendered surface, so block now and iterate later if a false positive appears

## Blockers

None.

## Performance Metrics

| Phase | Plan  | Duration | Tasks | Files | Completed            |
|-------|-------|----------|-------|-------|----------------------|
| 20    | 20-01 | 3m 10s   | 2     | 3     | 2026-04-21T18:04:12Z |
| 20    | 20-02 | 1m 19s   | 1     | 2     | 2026-04-21T18:09:57Z |
| 20    | 20-03 | ~4m      | 2     | 3     | 2026-04-21T18:24:00Z |
| 20    | 20-08 | ~10m     | 1     | 4     | 2026-04-21T18:37:00Z |
| 20    | 20-04 | ~3m      | 2     | 4     | 2026-04-21T18:43:30Z |
| 20    | 20-05 | 4m       | 1     | 3     | 2026-04-21T18:53:07Z |
| 20    | 20-07 | ~30m     | 3     | 2     | 2026-04-21T19:07:00Z |

**Planned Phase:** 20 (Foundation (Freshness + Zod + Tailored Resume)) — 8 plans — 2026-04-21T17:09:58.121Z
