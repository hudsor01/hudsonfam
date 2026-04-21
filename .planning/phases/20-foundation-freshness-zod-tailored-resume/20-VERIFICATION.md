---
phase: 20-foundation-freshness-zod-tailored-resume
verified: 2026-04-21T19:22:22Z
status: passed
score: 5/5 success criteria verified; 7/7 REQs verified
re_verification:
  previous_status: none
  previous_score: n/a
  gaps_closed: []
  gaps_remaining: []
  regressions: []
---

# Phase 20: Foundation (Freshness + Zod + Tailored Resume) Verification Report

**Phase Goal:** Owner can read the 6 existing tailored resumes rendered as sanitized markdown with a trustworthy generated-at/model badge, and every LLM artifact row is runtime-validated at the DB boundary so schema drift never crashes the page.

**Verified:** 2026-04-21T19:22:22Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### ROADMAP Success Criteria

| # | Success Criterion | Status | Evidence |
|---|---|---|---|
| 1 | Tailored resume markdown renders with headings/lists/bold — not `whitespace-pre-wrap` plaintext | VERIFIED | `tailored-resume-section.tsx:73` uses `<Streamdown>`, body div uses `max-h-96 overflow-y-auto` (NOT `whitespace-pre-wrap`); test `tailored-resume-section.test.tsx` asserts `<h1>`, `[data-streamdown="strong"]`, and absence of `whitespace-pre-wrap`. |
| 2 | `<script>alert(1)</script>` XSS payload renders as non-executable (literal/stripped) | VERIFIED | `tailored-resume-section.tsx:73` passes `skipHtml` prop; `tailored-resume-xss.test.tsx` covers all 3 classic vectors with 4 assertions each (no `<script>`, no `<iframe>`, no `onerror` attr, no `on*` inline handler on any element). |
| 3 | Every AI section shows "Generated {relative} ago · {model_used}" badge | VERIFIED | `job-detail-sheet.tsx` mounts `<FreshnessBadge>` on Cover Letter (L150) and Company Intel (L204); Tailored Resume badge is internal to `TailoredResumeSection` (L65). `FreshnessBadge` renders `Generated {relativeTime}` and conditionally `· {modelUsed}`. |
| 4 | Missing-column row doesn't crash page; shows error-boundary fallback; console.error logs Zod failure with jobId | VERIFIED | `jobs-db.ts:320,337,360` wraps all 3 artifacts in `parseOrLog(..., jobId)` returning `null` on drift; `jobs-schemas.ts:78` emits `console.error("[jobs-db] <label> schema drift", { jobId, issues })`. Each section wrapped in `<SectionErrorBoundary>` (L142, 176, 194) which renders muted fallback copy without leaking error details. |
| 5 | CSP header with `object-src 'none'` + `frame-ancestors 'none'` on /admin/*; `test:schema` fails loudly on missing column | VERIFIED | `middleware.ts:51,54` sets `object-src 'none'` + `frame-ancestors 'none'`; matcher `['/admin/:path*']` (L75). `scripts/check-jobs-schema.ts` exits 1 with `Expected column '<col>' on table '<table>'` on drift; `.git/hooks/pre-push` installed (executable, 192 bytes) runs `npm run test:schema`. |

**Score:** 5/5 roadmap success criteria verified

### Observable Truths (REQ-level)

| # | REQ | Status | Evidence |
|---|---|---|---|
| 1 | AI-RENDER-01 — Tailored resume markdown rendering | VERIFIED | `TailoredResumeSection` uses `<Streamdown skipHtml>` wrapping `resume.content`; wired in `job-detail-sheet.tsx:180-186` between Cover Letter and Company Intel per UI-SPEC §1. |
| 2 | AI-RENDER-02 — `generated_at` + `model_used` badges on every AI section | VERIFIED | `FreshnessBadge` used on all 3 sections (internal for Tailored Resume, external for Cover Letter + Company Intel); server pre-computes `relativeTime` via `formatDistanceToNowStrict` + `isStale` + `ageDays` (hydration-safe). Company Intel passes `modelUsed={null}` (no `model_used` column on `company_research`), `FreshnessBadge` correctly drops separator. |
| 3 | AI-SAFETY-01 — Markdown XSS protection | VERIFIED | `<Streamdown skipHtml linkSafety={{enabled:false}}>`; `tailored-resume-xss.test.tsx` locks 3 payloads + javascript: URI stripping. Observed stronger behavior documented (stripped entirely, not literalized) — still satisfies "not executable" goal. |
| 4 | AI-SAFETY-05 — CSP header on /admin/* | VERIFIED | `middleware.ts` sets per-request base64 nonce + full CSP directive set including `object-src 'none'` and `frame-ancestors 'none'`; matcher scoped to `/admin/:path*`. Production-mode curl verification documented in 20-07 commit (f91707f, dfa95a3, 97a60c5). Known limitation: Turbopack dev mode does not invoke middleware (upstream issue), production works. |
| 5 | AI-SAFETY-06 — Zod safeParse at jobs-db boundary, fail-open | VERIFIED | `jobs-schemas.ts` exports 3 Zod schemas + `parseOrLog` helper; `jobs-db.ts:320,337,360` wraps all 3 LLM artifact builds with `parseOrLog(schema, raw, label, jobId)` returning `null` + `console.error` on failure. 8 tests in `jobs-db-zod.test.ts` cover happy path, missing field, wrong type, null/undefined, pathological input (circular, string, number). |
| 6 | AI-DATA-03 — Pure `isStale()` util with Vitest | VERIFIED | `src/lib/job-freshness.ts:38` exports `isStale(timestamp, thresholdDays, now?)` pure function with injectable `now` for determinism; null/unparseable → `false` (silent); boundary case (age === threshold) → `true` (inclusive). 7 Vitest cases in `job-freshness.test.ts` including threshold boundary, invalid dates, per-artifact thresholds. Used by `attachFreshness` in `job-actions.ts:72`. |
| 7 | AI-DATA-04 — Schema-drift check via `test:schema` + pre-push hook | VERIFIED | `scripts/check-jobs-schema.ts` queries `information_schema.columns` for 6 tables (jobs, cover_letters, company_research, tailored_resumes, recruiter_outreach, applications) with 62 expected columns; fails with `Expected column 'X' on table 'Y' (referenced in jobs-db.ts); not found in n8n database.` `package.json` wires `"test:schema": "bun scripts/check-jobs-schema.ts"`. `.git/hooks/pre-push` installed executable, runs `npm run test:schema || exit 1`. `scripts/install-hooks.sh` provides one-time installer. Verified via synthetic drift + actual `git push` abort (20-08 checkpoint). |

**Score:** 7/7 REQs verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `src/lib/job-freshness.ts` | Pure isStale util + STALE_THRESHOLDS | VERIFIED | 48 LoC; exports `isStale` (pure, `now` injectable) + `STALE_THRESHOLDS` (cover_letter:14, tailored_resume:14, company_research:60, salary_intelligence:30); used in `job-actions.ts`. |
| `src/lib/jobs-schemas.ts` | Zod schemas + parseOrLog wrapper | VERIFIED | 85 LoC; 3 schemas (CoverLetter, CompanyResearch, TailoredResume) + `parseOrLog` helper with `console.error("[jobs-db] <label> schema drift", {jobId, issues})`; imported in `jobs-db.ts:2-7`. |
| `src/lib/jobs-db.ts` | getJobDetail wraps 3 artifacts in parseOrLog | VERIFIED | 3 parseOrLog call sites at L320 (cover_letter), L337 (company_research), L360 (tailored_resume); returns JobDetail with `parseOrLog` results (null on drift). Also adds `ArtifactFreshness` + `FreshJobDetail` types. |
| `src/lib/job-actions.ts` | fetchJobDetail returns FreshJobDetail with freshness attached | VERIFIED | `attachFreshness<T>` helper (L48) dispatches on `'generated_at' in artifact` vs `created_at`; 3 call sites at L100, 104, 108 using `STALE_THRESHOLDS` constants; handles unparseable ISO by silently zeroing freshness. |
| `src/app/(admin)/admin/jobs/freshness-badge.tsx` | FreshnessBadge client component | VERIFIED | 87 LoC, `"use client"`; renders "Generated {relativeTime} · {modelUsed}" with null-model branch dropping separator; stale state adds `bg-warning` dot + shadcn Tooltip with "Generated N days ago; may need regeneration". 5/5 tests pass. |
| `src/app/(admin)/admin/jobs/section-error-boundary.tsx` | Per-section React class boundary | VERIFIED | 79 LoC; hand-rolled class (no react-error-boundary dep) per D-09; `SECTION_LABELS` covers all 4 artifact kinds; fallback UI is muted (NOT destructive) italic copy; logs `[ai-section]` server-side with section + jobId + error/stack, never leaks to DOM. 6/6 tests pass. |
| `src/app/(admin)/admin/jobs/tailored-resume-section.tsx` | Streamdown-based render + XSS posture | VERIFIED | 79 LoC; `<Streamdown skipHtml linkSafety={{enabled:false}}>`; body uses UI-SPEC styling (`bg-card/50 rounded-lg p-4 border max-h-96 overflow-y-auto`, no `whitespace-pre-wrap`); internal FreshnessBadge on meta row. 5/5 tests pass. |
| `src/app/(admin)/admin/jobs/job-detail-sheet.tsx` | Mounts all 3 sections w/ boundaries + badges | VERIFIED | State type switched to `FreshJobDetail`; 3 imports added (L27-29); all 3 LLM sections wrapped in `<SectionErrorBoundary>` (L142, 176, 194); 2 external `<FreshnessBadge>` mounts (L150 cover letter, L204 company intel); `<TailoredResumeSection>` inserted at L180-186 between Cover Letter and Company Intel. |
| `middleware.ts` | Next.js middleware with CSP on /admin/* | VERIFIED | 76 LoC; per-request base64 nonce from `crypto.randomUUID()`; CSP includes `object-src 'none'`, `frame-ancestors 'none'`, `base-uri 'self'`, `script-src 'self' 'nonce-X' 'strict-dynamic'` (+ `'unsafe-eval'` only in dev); matcher `['/admin/:path*']`; sets CSP on both request and response headers. |
| `scripts/check-jobs-schema.ts` | Schema drift guard bun script | VERIFIED | 104 LoC; connects via `JOBS_DATABASE_URL`, queries `information_schema.columns` for 6 tables / 62 columns; graceful skip (exit 0) when env unset; host-only logging (no password); explicit error message per D-08. |
| `.git/hooks/pre-push` | Native git hook runs test:schema | VERIFIED | Installed (4 lines, executable `rwxrwxr-x`); invokes `npm run test:schema || exit 1`. Created by `scripts/install-hooks.sh`. |
| `src/styles/globals.css` | `@source` directive for Streamdown | VERIFIED | L3: `@source "../../node_modules/streamdown/dist/*.js";` present (Tailwind v4 picks up Streamdown utility classes). |

### Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| `TailoredResumeSection` | `Streamdown` | `<Streamdown skipHtml>` | WIRED | Direct import from `"streamdown"` package (in package.json `^2.5.0`); passed `skipHtml` + `linkSafety={{enabled:false}}`; content bound from `resume.content`. |
| `job-detail-sheet.tsx` | `TailoredResumeSection` | JSX import + mount | WIRED | Import L29, mount L180-186 inside SectionErrorBoundary with section="tailored_resume"; props correctly wired from `detail.tailored_resume`. |
| `job-detail-sheet.tsx` | `FreshnessBadge` | JSX import + mount | WIRED | Import L27, mounted at L150 (cover letter) + L204 (company intel); tailored resume badge is internal to TailoredResumeSection. |
| `job-detail-sheet.tsx` | `SectionErrorBoundary` | JSX import + wrap | WIRED | Import L28; 3 wrappers at L142 (cover_letter), L176 (tailored_resume), L194 (company_research). |
| `jobs-db.ts` | `parseOrLog` + schemas | import + call | WIRED | Import L2-7; 3 call sites (L320, 337, 360); each passes the correct Zod schema + label + jobId. |
| `job-actions.ts` | `isStale` + `STALE_THRESHOLDS` | import + call | WIRED | Import L19; `attachFreshness` helper calls `isStale(iso, thresholdDays)` at L74; 3 call sites use `STALE_THRESHOLDS.cover_letter/tailored_resume/company_research`. |
| `fetchJobDetail` | client detail sheet | Server Action | WIRED | `fetchJobDetail` called in `job-detail-sheet.tsx:60`; return type `FreshJobDetail` matches state setter on L52. |
| `.git/hooks/pre-push` | `check-jobs-schema.ts` | npm script | WIRED | Hook runs `npm run test:schema`; package.json wires script to `bun scripts/check-jobs-schema.ts`. |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|---|---|---|---|---|
| `job-detail-sheet.tsx` | `detail` (FreshJobDetail) | `fetchJobDetail(jobId)` → `getJobDetail` → pg pool query on `jobs`+`cover_letters`+`company_research`+`tailored_resumes` | Yes — real SQL LEFT JOIN to 3 tables; Zod parses actual rows; freshness computed from real `generated_at`/`created_at` via `attachFreshness` | FLOWING |
| `TailoredResumeSection` | `resume.content` | `detail.tailored_resume.content` (passed through Zod TailoredResumeSchema) | Yes — rendered via Streamdown | FLOWING |
| `FreshnessBadge` (all 3 mounts) | `relativeTime`, `isStale`, `ageDays` | Computed server-side in `attachFreshness` via `formatDistanceToNowStrict` + `isStale` from real ISO timestamp | Yes — server-side compute, no hydration mismatch | FLOWING |
| `SectionErrorBoundary` | children (sections) | Direct JSX children from sheet | Yes — sections render normally; fallback only engages on thrown error | FLOWING |

### Behavioral Spot-Checks

Per instructions, spot-checks already run during phase execution (not re-run):
- `npm test` = 305/305 passing (verified post-20-06 commit)
- `npm run build` = clean (verified after every plan)
- CSP curl verification on `/admin/jobs` vs `/` (verified during 20-07 checkpoint, documented in commit `97a60c5`)
- Schema drift test run against live n8n DB (6 tables / 62 columns, verified during 20-08 checkpoint via synthetic drift + actual `git push` abort)

### Requirements Coverage

| REQ | Source Plan | Description | Status | Evidence |
|---|---|---|---|---|
| AI-RENDER-01 | 20-01, 20-05, 20-06 | Tailored resume renders as formatted markdown | SATISFIED | `TailoredResumeSection` + Streamdown + wire-up in detail sheet |
| AI-RENDER-02 | 20-04, 20-06 | `generated_at` + `model_used` badges on every AI section | SATISFIED | `FreshnessBadge` component + 3 mount sites |
| AI-SAFETY-01 | 20-05 | Markdown XSS — `<script>` as text | SATISFIED | `skipHtml` + `tailored-resume-xss.test.tsx` with 4 assertions per payload |
| AI-SAFETY-05 | 20-07 | CSP header on /admin/* | SATISFIED | `middleware.ts` with full directive set + production curl verification |
| AI-SAFETY-06 | 20-03 | Zod safeParse at jobs-db boundary, fail-open | SATISFIED | `jobs-schemas.ts` + 3 `parseOrLog` call sites + 8 Vitest cases |
| AI-DATA-03 | 20-02 | Pure `isStale()` util with Vitest | SATISFIED | `job-freshness.ts` (48 LoC) + 7 Vitest cases + integration in `attachFreshness` |
| AI-DATA-04 | 20-08 | Schema-drift via `test:schema` + pre-push | SATISFIED | `check-jobs-schema.ts` + `install-hooks.sh` + executable `pre-push` hook |

No ORPHANED requirements: all 7 REQs mapped to Phase 20 in REQUIREMENTS.md appear in at least one plan frontmatter.

### Anti-Patterns Found

None. Files examined:
- `src/lib/job-freshness.ts` — pure util, no TODOs, returns actual boolean
- `src/lib/jobs-schemas.ts` — real Zod schemas + working helper, no stubs
- `src/lib/jobs-db.ts` — 3 real parseOrLog calls with correct schemas/labels/jobIds
- `src/lib/job-actions.ts` — real `attachFreshness` helper, 3 call sites with correct thresholds
- `middleware.ts` — real CSP string, real crypto.randomUUID(), real matcher
- `scripts/check-jobs-schema.ts` — real pg query, real exit codes, real error messages
- `src/app/(admin)/admin/jobs/*.tsx` — components render real data with real imports; no placeholder text, no empty handlers, no hardcoded `[]` data

### Human Verification Required

None required for Phase 20. The visible rendering behavior (tailored resume markdown, freshness badges) has been verified via automated component tests (`tailored-resume-section.test.tsx`, `freshness-badge.test.tsx`), and the security posture (CSP, XSS) has been verified via both unit tests and production-mode curl at the 20-07 checkpoint. Schema drift has been verified via synthetic drift injection + actual `git push` abort at 20-08.

### Gaps Summary

No gaps found. All 7 REQs (AI-RENDER-01, AI-RENDER-02, AI-SAFETY-01, AI-SAFETY-05, AI-SAFETY-06, AI-DATA-03, AI-DATA-04) have concrete, wired, data-flowing implementations backed by Vitest coverage. The 5 ROADMAP success criteria are all met. Goal-backward tracing confirms:

1. **Goal: "sanitized markdown rendering"** → `<Streamdown skipHtml>` in `TailoredResumeSection`, wired in detail sheet, XSS-tested.
2. **Goal: "trustworthy generated-at/model badge"** → `FreshnessBadge` on all 3 sections, server-computed (hydration-safe), with stale indicator.
3. **Goal: "runtime-validated at DB boundary so drift never crashes"** → `parseOrLog` wraps all 3 artifact constructions in `getJobDetail`, returns `null` + logs `console.error` with jobId on drift; `SectionErrorBoundary` per section catches render-time failures that slip past Zod.

Observations (non-blocking, documented for Phase 21+):
- CSP works in production mode only; Turbopack dev mode does not invoke middleware (upstream Next.js 16.2.1 + Turbopack limitation, not a code defect). Documented in middleware.ts header and commit `97a60c5`.
- Streamdown's default pipeline actually STRIPS XSS elements rather than literalizing them (stronger guarantee than ROADMAP SC #2 wording). XSS test asserts the stronger "element absent" condition.
- Cover Letter keeps `whitespace-pre-wrap` plaintext rendering — explicitly out of Phase 20 scope (only Tailored Resume migrates to Streamdown this phase). Phase 21 may migrate Cover Letter if desired.

---

_Verified: 2026-04-21T19:22:22Z_
_Verifier: Claude (gsd-verifier)_
