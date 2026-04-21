# Research Summary — v3.0 AI Integration

**Project:** hudsonfam (thehudsonfam.com)
**Milestone:** v3.0 AI Integration — surface n8n LLM output in /admin/jobs
**Domain:** Additive brownfield UI + data wiring on an already-validated Next.js 16 / Tailwind v4 / shadcn / Prisma v7 / Better Auth stack
**Researched:** 2026-04-21
**Confidence:** HIGH

## Executive Summary

This milestone is not greenfield. The stack is fixed; the admin panel exists; the n8n pipeline already produces tailored resumes (6 rows), cover letters (11 rows), company research (0 rows — trigger gap), and salary intelligence (0 rows — workflow bug, task #11). The real job is to close a rendering gap — tailored resumes are queried but never rendered; salary intel is unmodeled app-side — and to add a small amount of owner-controlled UX (a manual "Research this company" trigger, regenerate buttons, freshness/model badges) without inventing new architectural patterns.

The recommended approach adds exactly two runtime dependencies (`streamdown` for markdown rendering, `recharts` via shadcn `chart` for an optional salary range viz) and otherwise composes entirely from primitives already in the project: `Collapsible`, `Sheet`, `sonner`, `lucide-react`, `pg.Pool`, the `triggerOutreach`-style awaited Server Action webhook pattern, and `requireRole(["owner"])`. Everything lives in the existing `job-detail-sheet.tsx` surface — no new route segment, no new page, no aggregate dashboard (SEED-001 territory, deferred).

The two material risks are cross-system: (1) LLM-produced markdown arriving on a trusted admin origin without a sanitizer or CSP header (Pitfall 1), and (2) schema drift between n8n workflows and the Next.js render path, since n8n owns the writes and TypeScript interfaces in `jobs-db.ts` are a hope rather than a check (Pitfall 4). Both are mitigated in the same PRs that introduce the new rendering — sanitize at render time (prefer Streamdown's default-safe pipeline, never enable `rehype-raw`), add a CSP directive set, wrap each artifact section in its own error boundary, and runtime-validate rows with Zod so drift fails open with a log instead of crashing the sheet. The `company_research` trigger gap is explicitly a manual-only workflow — the UI must add a "Research this company" button and must not auto-schedule across 467 jobs.

## Key Findings

### Recommended Stack

Existing stack treated as fixed. Detail in `.planning/research/STACK.md`.

**Core additions (exactly two):**
- `streamdown@^2.5.0` — Vercel-maintained markdown renderer built against React 19 / Tailwind v4 / shadcn design tokens. Chosen over `react-markdown@10.x` because the incumbent has open React 19 / `@types/react@19` JSX-namespace issues (#877, #882, #920). Requires one `@source` directive in `src/styles/globals.css`.
- `recharts@^3.8.1` via `npx shadcn@latest add chart` — only ships if the salary-range visualization lands. v3 uses `var(--chart-*)` tokens matching our OKLCH-via-CSS-custom-property pattern. Hand-rolled SVG is an acceptable fallback if Recharts' React 19 transitive causes any resolution friction.

**Explicitly rejected:** `react-pdf` / `@pdf-viewer/react` (1.5 MB worker bundle for zero user-requested value), generic JSON tree viewers for `report_json` (schema is known once workflow ships; structured React wins), `react-copy-to-clipboard` (trivial native + existing `sonner`), `react-hook-form` (project is TanStack Form).

### Expected Features

Solo-owner admin UI. `interview_prep` and `recruiter_outreach` out of scope per context. Detail in `.planning/research/FEATURES.md`.

**Must have (table stakes, v3.0 MVP):**
- T1 Render tailored resume (S) — data exists, UI missing; the headline gap
- T2 Copy to clipboard (S) — highest-leverage action for ATS paste workflows
- T3 Download resume as PDF (M) — decision: n8n emits `pdf_data` column (matches existing arch, avoids Puppeteer)
- T4/T5 Show `generated_at` + `model_used` (S) — freshness signal; schema-present, never rendered
- T6 Empty-state messaging (S) — distinguishes "never ran" from "ran but produced nothing"
- T7 Render salary intelligence (M) — gated on task #11; rendering can proceed against defensive Zod schema
- T10 Company website link-out (S)

**Should have (v3.1 / differentiators):**
- T8 Manual regenerate per artifact (M) + "Research this company" trigger closing company_research gap
- T9 Error state for silent-success workflow failures (S)
- D1/D2 Inline edit resume + cover letter (M) — needs `edited_at` + `original_content` migration
- D8 Collapsible long sections (S) — likely auto-promotes to MVP during implementation
- D10 Cover letter quality score badge (S) — column exists, near-zero effort

**Defer (v3.2+ / explicit anti-features):**
- Edit history / audit log, comments, sharing, real-time streaming of regen, in-app chat, notifications on pipeline completion, bulk regenerate, configurable prompts, inline PDF preview, email-from-admin
- Aggregate pipeline-health dashboard (SEED-001) — owner explicitly deferred

### Architecture Approach

No new architectural boundaries. Extend existing "shared n8n Postgres + fire-and-forget OR awaited webhook" pattern. Detail in `.planning/research/ARCHITECTURE.md`.

**Major components (delta only):**
1. `src/lib/jobs-db.ts` — add `SalaryIntelligence` TS type, extend `JobDetail`, add defensive `LEFT JOIN LATERAL` for salary_intelligence (tolerates both `job_id` and `company` keying)
2. `src/lib/job-actions.ts` — add 4 `regenerate*` Server Actions + `triggerCompanyResearch(jobId)` built on existing `triggerOutreach` pattern
3. `src/lib/job-freshness.ts` (NEW) — pure `isStale()` util; keeps date math out of SQL and client render
4. `src/app/(admin)/admin/jobs/job-detail-sheet.tsx` — 2 new collapsible sections (Tailored Resume, Salary Intel), regenerate + research buttons, freshness/model badges
5. `src/app/(admin)/admin/jobs/regenerate-button.tsx` (NEW) — reusable client component using `useTransition` + optimistic spinner + `onSuccess` callback

**Key decisions:**
- **ADR-01:** Salary intelligence lives as collapsible section in the detail sheet, joined 1:1 to `jobs.id` via `LEFT JOIN LATERAL` defensive to both `job_id` and `company` keys. Not a new `/admin/jobs/salary` page.
- Server Actions over Route Handlers for regenerate — no public HTTP surface, no CSRF/CORS/auth duplication.
- HMAC header + idempotency key on every webhook call (new `N8N_WEBHOOK_SECRET`) — closes Pitfall 3 in the same PR that introduces regenerate.
- Static spinner, not token streaming. 30s spinner on infrequent solo-owner action isn't worth SSE/RSC-stream plumbing.
- No shared types package, no codegen. Postgres DDL is the contract; `jobs-db.ts` is the view. Add a lightweight `information_schema` column-existence test as drift guardrail.

### Critical Pitfalls

Top 5 from `.planning/research/PITFALLS.md` (9 documented total):

1. **LLM text treated as safe because owner-only** (Pitfall 1) — Once markdown renders, React's auto-escape is gone. Use Streamdown's default-safe pipeline; never enable `rehype-raw`; add CSP header on `/admin/*` (`default-src 'self'; object-src 'none'; frame-ancestors 'none'`). Include a `<script>alert(1)</script>` test fixture.
2. **Schema drift between n8n and Next.js** (Pitfall 4) — Add Zod `safeParse` at `jobs-db.ts` query boundary, fail-open with `console.error` (keep page alive), error boundary per LLM section.
3. **Stale cache mistaken for fresh regeneration** (Pitfall 6) — Render `generated_at` + `model_used` on every artifact; optimistic-clear on regenerate; poll `fetchJobDetail` every 3s (cap 60) until timestamp moves; visible freshness dot.
4. **Webhook unsigned + verbose errors** (Pitfall 3) — Existing `fireWebhook()` has no auth and `triggerOutreach` leaks raw `e.message`. Add HMAC-SHA256 via `N8N_WEBHOOK_SECRET` + `X-Idempotency-Key`; whitelist error sentinels. Retrofit existing callsites.
5. **Scraped salary figures displayed as authoritative** (Pitfall 5) — Three salary surfaces will disagree. Render with source tag + confidence visual treatment. Remove `?? "USD"` default at `jobs-db.ts:328`.

Secondary:
- **Pitfall 8** — Task #11's "parameter-limit" framing is a red herring per context note. Real bug: `'={{ JSON.stringify(...) }}'::jsonb` inlines LLM dollar figures (`"$128,663"`) that pg then parses as `$N` parameter refs. Fix with structured Insert op or named `$1, $2` params.
- **Pitfall 9** — `requireRole(["owner"])` must be first line of every new Server Action. Add CI grep/ESLint rule.
- **Pitfall 2** — Keep download-only PDF. Do not reintroduce `pdf_data` into `JobDetail`. No `data:` URI iframes.

## Implications for Roadmap

### Phase 1: Foundation — freshness util + Zod validation + tailored resume render
**Rationale:** Closes most visible gap (6 rows of invisible resumes) with smallest change and establishes three cross-cutting concerns (Zod parsing, error boundaries per section, pure freshness util) every later phase depends on.
**Delivers:** `job-freshness.ts` + Vitest; Zod schemas in `jobs-schemas.ts`; `getJobDetail` safeParse; error boundaries per section; tailored resume section with Streamdown; `generated_at` + `model_used` badges; CSP header on `/admin/*`; `<script>` injection test fixture; `@source` directive in globals.css.
**Addresses:** T1, T4, T5, partial T6
**Avoids:** Pitfalls 1, 4, 6 baseline

### Phase 2: Copy + PDF + Empty states + Company link-out
**Rationale:** Low-complexity shipping polish depending only on Phase 1. All P1 features except T7/T8. Can run parallel with Phase 3.
**Delivers:** T2 copy buttons via `navigator.clipboard` + `sonner`; T3 `/api/jobs/[id]/tailored-resume-pdf` route (gated on n8n `pdf_data`; interim `.md` download if pipeline slips); T6 empty states; T10 `ExternalLink`; D10 quality score badge (opportunistic).
**Addresses:** T2, T3, T6, T10, D10

### Phase 3: Salary Intelligence — model, query, render (defensive)
**Rationale:** Can proceed against defensive schema before task #11 ships. 0 rows = section hidden. ADR-01 defines the shape.
**Delivers:** `SalaryIntelligence` Zod schema + TS type; `LEFT JOIN LATERAL` tolerating both keyings; salary intel section (`llm_analysis` via Streamdown, structured headline, optional recharts range bar behind feature flag); `formatSalary()` accepting source/confidence; remove `?? "USD"` default; conflict display when `jobs.salary_max` vs `company_research.salary_range_max` diverge >20%.
**Addresses:** T7 + retroactive salary display fix
**Avoids:** Pitfalls 4, 5
**Depends on:** Homelab task #11 for non-empty data; rendering does not block

### Phase 4: Owner-triggered workflows — "Research this company" + regenerate pattern
**Rationale:** Pattern-setter PR. Closes company_research TRIGGER gap (manual-only, per context) and establishes HMAC + idempotency + pessimistic-UI pattern.
**Delivers:** `regenerate-button.tsx`; `triggerCompanyResearch(jobId)` + button (closes gap without auto-scheduling); `regenerateCoverLetter` as pattern template; `N8N_WEBHOOK_SECRET` env + ExternalSecret; HMAC-SHA256 + `X-Idempotency-Key` helper; error-sentinel scrubbing; polling loop (3s / 60 cap); retrofit existing `fireWebhook()` callsites; CI grep rule for `requireRole`.
**Addresses:** T8 (partial — cover letter), company_research gap
**Avoids:** Pitfalls 3, 6, 9
**Depends on:** n8n webhook endpoint for `regenerate-cover-letter`

### Phase 5: Regenerate expansion
**Rationale:** Copy-paste of Phase 4 pattern.
**Delivers:** `regenerateTailoredResume`, `regenerateSalaryIntel`; buttons wired into Phase 1 + Phase 3 sections; T9 silent-success error state.
**Addresses:** T8 (remaining), T9
**Depends on:** n8n webhook endpoints for remaining artifacts

### Phase 6 (optional, v3.1): Inline edit
**Rationale:** Gated on owner feedback after using v3.0 MVP ~2 weeks.
**Delivers:** Migration (`edited_at`, `original_content`); Textarea swap-in with TanStack Form; D7 revert-to-original.
**Addresses:** D1, D2, D7

### Phase Ordering Rationale

- Phase 1 first: Zod + error boundaries + freshness util are infra every later phase consumes. Bundling with T1 gives smallest coherent change.
- Phase 2 parallel with 3: no conceptual dependency; different sections. Phase 2 can ship faster (all S-complexity); Phase 3 may slip on workflow-shape uncertainty — do not couple.
- Phase 3 before Phase 5: Phase 5's `regenerateSalaryIntel` needs the section to exist.
- Phase 4 before Phase 5: Phase 4 is pattern-setter; shipping Phase 5 first would mean retrofitting HMAC into three actions instead of one.
- v3.1 Phase 6 deferred: prevents scope creep; informed by real usage.

### Research Flags

Needs deeper research (invoke `/gsd-research-phase` before PLAN):
- **Phase 3 (Salary Intelligence):** Once task #11 ships, inspect 2–3 actual `salary_intelligence` rows before finalizing Zod schema.
- **Phase 1 (tailored resume render):** Pre-phase micro-research — inspect 2–3 actual `tailored_resumes.content` rows to confirm markdown vs plain text vs HTML fragments.

Standard patterns (skip research):
- Phase 2 (trivial native APIs + existing patterns)
- Phase 4 (direct copy of `triggerOutreach`; standard HMAC + idempotency)
- Phase 5 (copy-paste from Phase 4)

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All package versions verified against current npm; React 19 / Next 16 compatibility checked; integration points mapped to actual file lines. |
| Features | HIGH | Grounded in actual row counts, existing UI surface, explicit owner scope from context note. |
| Architecture | HIGH | Every decision backed by existing code references (file + line). No speculative architecture. |
| Pitfalls | HIGH (project) / MEDIUM (library advice) | 9 pitfalls with file-line grounding. Library advice (Streamdown sanitizer defaults) MEDIUM because Streamdown is newer than react-markdown + rehype-sanitize. |

**Overall confidence:** HIGH

### Gaps to Address

- **Salary intelligence schema shape** — 0 rows today. Phase 3's Zod schema must be finalized against real data. `LEFT JOIN LATERAL` + collapsible `<pre>` fallback lets app render something useful against fluid shapes.
- **n8n webhook endpoints for regenerate** — Do not exist yet; tracked as homelab pipeline work. Phases 1–3 are independent of this.
- **Streamdown sanitizer defaults** — Gate Phase 1 merge on a `<script>` passthrough test.
- **Tailored resume PDF path** — Preferred: n8n emits `pdf_data`. Fallback: markdown download. Decide in Phase 2 PLAN; do not default to Puppeteer.
- **Company_research TRIGGER policy** — Manual UI button only, no auto-schedule. Document as anti-feature in Phase 4 PLAN.

## Sources

### Primary (HIGH) — in-repo code + docs
- `/home/dev-server/hudsonfam/src/lib/jobs-db.ts`
- `/home/dev-server/hudsonfam/src/lib/job-actions.ts`
- `/home/dev-server/hudsonfam/src/app/(admin)/admin/jobs/job-detail-sheet.tsx`
- `/home/dev-server/hudsonfam/src/app/api/jobs/[id]/cover-letter-pdf/route.ts`
- `/home/dev-server/hudsonfam/next.config.ts`
- `/home/dev-server/hudsonfam/.planning/notes/ai-pipeline-integration-context.md`
- `/home/dev-server/hudsonfam/CLAUDE.md`

### Primary (HIGH) — external
- vercel/streamdown (GitHub) + Vercel changelog
- react-markdown issues #877, #882, #920
- recharts 3.8.1 + shadcn chart docs + Recharts 3.0 migration guide
- n8n Webhook node docs (header-based auth support)
- LinkedIn Salary engineering blog (percentile UX reference)

### Secondary (MEDIUM)
- Teal / Kickresume / Jobscan competitor comparison (marketing-sourced; justifies anti-features)
- `rehype-sanitize` + `defaultSchema` composition (defense-in-depth if Streamdown defaults slip)
- CSP directive recommendations for Next.js 16 admin routes

### Tertiary (LOW) — none

---
*Research completed: 2026-04-21*
*Ready for roadmap: yes*
*Underlying research: STACK.md, FEATURES.md, ARCHITECTURE.md, PITFALLS.md*
