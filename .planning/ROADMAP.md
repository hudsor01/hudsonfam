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

## v3.0 — AI Integration

**Goal:** Close the rendering gap between the n8n Job Search pipeline's LLM output and the /admin/jobs dashboard so the owner can actually use what the pipeline produces. Render tailored resumes, model + fix salary intelligence, add manual company-research trigger, and introduce regenerate + freshness + safety scaffolding.

**Reference:** `.planning/research/SUMMARY.md`, `.planning/notes/ai-pipeline-integration-context.md`, `.planning/REQUIREMENTS.md`

**Out of scope (explicit):** interview_prep rendering, recruiter_outreach rendering, streaming regenerate, inline PDF preview, collaboration/sharing/comments, audit log of edits, in-app chat, bulk regenerate, configurable prompts, email-from-admin, auto-scheduled company_research.

**Deferred to v3.1+:** SEED-001 aggregate pipeline-health dashboard (DASH-01), inline editing (EDIT-01/02/03).

### Phases

- [x] **Phase 20: Foundation (Freshness + Zod + Tailored Resume)** — pure isStale util, Zod safeParse at jobs-db boundary, CSP on /admin/*, tailored resume rendered with Streamdown + generated_at/model badges, schema-drift CI guardrail — 2026-04-21
- [ ] **Phase 21: Polish (Copy + PDF + Empty States + Link-out)** — copy-to-clipboard, tailored-resume PDF download (pipeline-extended end-to-end via n8n Application Packager + tailored_resumes.pdf_data migration), 3 empty-state blocks, company-website link-out, cover-letter quality-score badge, bundled Phase 20 FreshnessBadge date-format revision
- [ ] **Phase 22: Salary Intelligence (Defensive Render)** — SalaryIntelligence Zod + TS type, LEFT JOIN LATERAL tolerating both job_id and company_name keying, llm_analysis + structured headline render, per-figure provenance tags (scraped / LLM / research)
- [ ] **Phase 23: Owner-Triggered Workflows (Pattern Setter)** — "Research this company" manual trigger, regenerate cover letter, HMAC-SHA256 + X-Idempotency-Key + sentinel-error scrubbing pattern established and retrofit to existing fireWebhook
- [ ] **Phase 24: Regenerate Expansion (Resume + Salary + Silent-Success State)** — regenerate tailored resume, regenerate salary intelligence, silent-success warning state when workflow returns OK without updating timestamp

### Phase Details

#### Phase 20: Foundation (Freshness + Zod + Tailored Resume)
**Goal**: Owner can read the 6 existing tailored resumes rendered as sanitized markdown with a trustworthy generated-at/model badge, and every LLM artifact row is runtime-validated at the DB boundary so schema drift never crashes the page.
**Depends on**: Nothing (first phase of milestone; builds on v2.0 baseline)
**Requirements**: AI-RENDER-01, AI-RENDER-02, AI-SAFETY-01, AI-SAFETY-05, AI-SAFETY-06, AI-DATA-03, AI-DATA-04
**Success Criteria** (what must be TRUE):
  1. Owner opens the job detail sheet for a job with a tailored resume and sees the markdown content rendered with headings, lists, and bold — not `whitespace-pre-wrap` plaintext
  2. A `<script>alert(1)</script>` payload pasted into any artifact's content field renders as literal visible text in the browser (mitigates Pitfall 1 — LLM output XSS)
  3. Every existing AI section (cover letter, company research, tailored resume) shows a "Generated {relative time} ago · {model_used}" badge under its heading (mitigates Pitfall 6 — stale cache mistaken for fresh)
  4. Owner loads /admin/jobs with a database row that is missing a column `jobs-db.ts` expects; the page does not crash, the affected section shows an error-boundary fallback, and `console.error` logs the Zod parse failure with jobId (mitigates Pitfall 4 — schema drift)
  5. Browser DevTools shows a `Content-Security-Policy` response header on `/admin/*` including `object-src 'none'` and `frame-ancestors 'none'`; `npm test` includes a passing test that calls `information_schema.columns` and fails loudly if a column `jobs-db.ts` reads has been removed upstream
**Plans:** 8 plans
Plans:
- [x] 20-01-PLAN.md — Install streamdown + Tailwind v4 @source directive (foundation; unblocks Plans 02, 04, 05) — 2026-04-21
- [x] 20-02-PLAN.md — Pure isStale util + STALE_THRESHOLDS constants + Vitest coverage (AI-DATA-03) — 2026-04-21
- [x] 20-03-PLAN.md — Zod schemas (jobs-schemas.ts) + parseOrLog fail-open wrapper at jobs-db.ts return boundary + Vitest (AI-SAFETY-06) — 2026-04-21
- [x] 20-04-PLAN.md — FreshnessBadge + SectionErrorBoundary client components + Vitest (AI-RENDER-02) — 2026-04-21
- [x] 20-05-PLAN.md — TailoredResumeSection + Streamdown XSS regression fixture + Vitest (AI-RENDER-01, AI-SAFETY-01) — 2026-04-21
- [x] 20-06-PLAN.md — Wire fetchJobDetail freshness + mount sections/boundaries in job-detail-sheet.tsx (AI-RENDER-01, AI-RENDER-02) — 2026-04-21
- [x] 20-07-PLAN.md — Next.js 16 middleware.ts (renamed from proxy.ts — 16.2.1 compat) with per-request CSP nonce scoped to /admin/* (AI-SAFETY-05) — 2026-04-21
- [x] 20-08-PLAN.md — scripts/check-jobs-schema.ts + pre-push hook + install-hooks.sh (AI-DATA-04) — 2026-04-21

#### Phase 21: Polish (Copy + PDF + Empty States + Link-out)
**Goal**: Owner can act on a tailored resume (copy, download PDF) in one click, and every missing AI artifact shows a distinct, explanatory empty state instead of a silent blank section. Scope includes an end-to-end PDF pipeline extension (n8n `Job Search: Application Packager` extended with a parallel resume-PDF branch + `ALTER TABLE tailored_resumes ADD COLUMN pdf_data TEXT` migration), a company-website link-out on the sheet header, a color-coded quality-score badge on cover letters, and a bundled Phase 20 revision replacing FreshnessBadge relative-time with a formal America/Chicago M/D/YY date.
**Depends on**: Phase 20
**Requirements**: AI-ACTION-01, AI-ACTION-02, AI-RENDER-04, AI-RENDER-05, AI-RENDER-06
**Success Criteria** (what must be TRUE):
  1. Owner clicks the copy-icon button next to the tailored resume heading, sees a sonner toast confirming success, and finds the resume markdown on their clipboard ready to paste into an ATS
  2. Owner clicks "Download PDF" on the tailored resume and receives a `.pdf` file named `tailored-resume-job-<id>.pdf` (served by the new `/api/jobs/[id]/tailored-resume-pdf` route handler; the `tailored_resumes.pdf_data` column is populated by the extended n8n Application Packager workflow — PDF-only per owner override, no `.md` fallback)
  3. Owner opens a job whose `company_research` is empty and sees "No company research yet." (distinct from a row where research was attempted but returned an empty body, which shows "Company research was generated but is empty." — AI-RENDER-04)
  4. Owner sees a quality-score badge (color-coded destructive/warning/success via theme tokens) on any cover letter whose `quality_score` column is populated
  5. Owner clicks the company name in the sheet header and is taken to the company's website in a new tab (with `rel="noopener noreferrer"` and an ExternalLink icon)
**Plans:** 10 plans
Plans:
- [x] 21-00-PLAN.md — Phase 20 revision: FreshnessBadge relativeTime → generatedDate + attachFreshness Intl.DateTimeFormat(America/Chicago) — 2026-04-22
- [x] 21-01-PLAN.md — Homelab: ALTER TABLE tailored_resumes ADD COLUMN pdf_data + n8n Application Packager workflow extension (AI-ACTION-02 pipeline, autonomous=false) — 2026-04-22
- [x] 21-02-PLAN.md — Zod TailoredResumeSchema.pdf_data + schema-drift EXPECTED map (AI-ACTION-02) — 2026-04-22
- [x] 21-03-PLAN.md — getJobDetail SELECT tr.pdf_data + getTailoredResumePdf helper + /api/jobs/[id]/tailored-resume-pdf route (AI-ACTION-02) — 2026-04-22
- [x] 21-04-PLAN.md — Copy button + Download anchor in TailoredResumeSection (AI-ACTION-01, AI-ACTION-02) — 2026-04-22
- [x] 21-05-PLAN.md — scoreColor/scoreLabel helpers + Quality badge in cover-letter meta row (AI-RENDER-05) — 2026-04-22
- [x] 21-06-PLAN.md — EMPTY_STATE_COPY constant + isCompanyResearchEmpty predicate + empty-state branches on all 3 LLM sections (AI-RENDER-04) — 2026-04-22
- [x] 21-07-PLAN.md — normalizeUrl helper + conditional company anchor in sheet header (AI-RENDER-06) — 2026-04-22
- [⏳] 21-08-PLAN.md — **DEFERRED-to-v3.5**: End-to-end production UAT checkpoint blocked by broken Forgejo+Woodpecker CI/CD pipeline (see `.planning/notes/ci-cd-fragility-analysis.md`); will execute retroactively once GitHub Actions + GHCR migration lands (SEED-005). Code itself is complete + 395/395 tests green.
- [x] 21-09-PLAN.md — Meta-doc finalization + v3.5 deferral capture (ROADMAP + REQUIREMENTS + STATE + notes + seed updates) — 2026-04-22

#### Phase 22: Salary Intelligence (Defensive Render)
**Goal**: Owner sees salary intelligence rendered in the job detail sheet with every figure source-tagged, and the data layer tolerates both the `job_id`-keyed and `company_name`-keyed shapes the upstream workflow may produce — the section ships before homelab task #11 lands.
**Depends on**: Phase 20
**Requirements**: AI-RENDER-03, AI-RENDER-07, AI-DATA-01, AI-DATA-02
**Success Criteria** (what must be TRUE):
  1. Once a `salary_intelligence` row exists for a job, owner opens the detail sheet and sees a Salary Intelligence section with the LLM analysis prose (rendered via Streamdown) plus structured headline figures (min/median/max or p25/p50/p75 — whichever the row provides)
  2. Every dollar figure rendered anywhere in the detail sheet (base salary, salary range, salary-intel headline, company_research salary range) carries a source tag — "scraped (jobicy)", "LLM estimate", "company research" — and no figure appears without a label (mitigates Pitfall 5 — scraped numbers displayed as authoritative)
  3. When zero `salary_intelligence` rows exist for a job, the detail sheet shows the AI-RENDER-04 empty-state messaging for that section and does NOT crash — the defensive `LEFT JOIN LATERAL` returns null cleanly for both `job_id` and `company_name` keying
  4. `src/lib/jobs-db.ts` exports both a `SalaryIntelligence` TypeScript type and a matching Zod schema; a Vitest test constructs a malformed row and asserts the Zod parse returns a fail-open result with a logged warning rather than throwing
  5. The `?? "USD"` currency default at `jobs-db.ts:328` is removed; when `salary_currency` is null the salary block hides entirely rather than mislabeling a GBP/EUR figure with `$`
**Plans**: TBD

#### Phase 23: Owner-Triggered Workflows (Pattern Setter)
**Goal**: Owner can manually trigger the company-research workflow and regenerate a cover letter for any job; every webhook leaving the app is HMAC-signed, idempotency-keyed, and returns only sanitized error sentinels — establishing the pattern Phase 24 will copy.
**Depends on**: Phase 20
**Requirements**: AI-ACTION-03, AI-ACTION-04, AI-SAFETY-02, AI-SAFETY-03, AI-SAFETY-04
**Success Criteria** (what must be TRUE):
  1. Owner opens a job with no company research, clicks "Research this company", sees an in-progress spinner + disabled button, and after the n8n workflow completes (poll every 3s, cap 60) the Company Intel section populates with the new row — closing the company_research TRIGGER gap without auto-scheduling across 467 jobs
  2. Owner clicks "Regenerate cover letter" on a job; button shows pessimistic spinner, polling waits for `cover_letters.generated_at` to advance past the click timestamp, then sheet re-renders with the new content and a fresh timestamp badge (mitigates Pitfall 6 — stale cache)
  3. An inspector capturing the POST from `hudsonfam` to `n8n.cloud.svc.cluster.local` sees an `X-Hudsonfam-Signature` HMAC-SHA256 header and an `X-Hudsonfam-Timestamp`; replaying the same body with the same `X-Idempotency-Key` does not produce a second LLM run in n8n execution history (mitigates Pitfall 3 — webhook unsigned + replayable)
  4. When an n8n call fails (network error, 500, connect-refused), the owner sees one of four fixed strings — "timeout", "auth", "rate limit", or "unavailable" — and the server-side log captures the full error with stack (no raw `e.message`, no internal cluster IPs, leak to the browser)
  5. Existing `fireWebhook` callsites (`job-feedback-sync`, `job-company-intel`, `job-outreach`) are retrofit to the new signed + idempotency-keyed helper in the same PR; a CI grep rule asserts every exported function in `src/lib/job-actions.ts` contains `requireRole(["owner"])` (mitigates Pitfall 9)
**Plans**: TBD

#### Phase 24: Regenerate Expansion (Resume + Salary + Silent-Success State)
**Goal**: Owner can regenerate every AI artifact the app renders, and any regenerate that completes "successfully" without actually updating the artifact produces a visible warning instead of silent failure.
**Depends on**: Phase 22, Phase 23
**Requirements**: AI-ACTION-05, AI-ACTION-06, AI-ACTION-07
**Success Criteria** (what must be TRUE):
  1. Owner clicks "Regenerate" on the tailored resume section; follows the Phase 23 pattern (pessimistic spinner → poll for `tailored_resumes.generated_at` advance → re-render with new timestamp badge)
  2. Owner clicks "Regenerate" on the salary intelligence section; same pattern — polls `salary_intelligence.generated_at` until it advances or the 60-poll cap expires
  3. When a regenerate webhook returns 200 but the artifact's `generated_at` timestamp does not advance within the polling window, owner sees a distinct warning banner — "Regeneration reported success but no new content was written — check n8n logs" — not a silent revert to pre-click state (AI-ACTION-07)
  4. All three regenerate actions (cover letter from Phase 23, tailored resume, salary intelligence) share the same `regenerate-button.tsx` component and the same signed-webhook helper; adding a fourth regenerate action in the future requires one Server Action + one button prop, not a new pattern
**Plans**: TBD

### Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 20. Foundation (Freshness + Zod + Tailored Resume) | 8/8 | Complete | 2026-04-21 |
| 21. Polish (Copy + PDF + Empty States + Link-out) | 9/10 | Code complete (prod UAT deferred to v3.5) | 2026-04-22 |
| 22. Salary Intelligence (Defensive Render) | 0/0 | Not started | - |
| 23. Owner-Triggered Workflows (Pattern Setter) | 0/0 | Not started | - |
| 24. Regenerate Expansion (Resume + Salary + Silent-Success State) | 0/0 | Not started | - |

### Deferred production UAT

- **Plan 21-08** — end-to-end UAT on `https://thehudsonfam.com/admin/jobs` is gated on v3.5 rebuilding the deploy pipeline (Forgejo+Woodpecker is broken; `forgejo-admin/hudsonfam` repo no longer exists on Forgejo). After v3.5 lands, execute 21-08 retroactively against the freshly-deployed code. See `.planning/phases/21-polish-copy-pdf-empty-states-link-out/21-08-SUMMARY.md` for the retroactive execution path.

## v3.5 — CI/CD Hardening (planned)

**Goal:** Eliminate the "CI breaks every time" DX pattern by migrating hudsonfam deploy from self-hosted Forgejo+Woodpecker to the CLAUDE.md-intended GitHub Actions + GHCR pattern. Preserve Flux-driven K3s rollout; keep Forgejo for homelab-manifests-repo concerns only.

**Context:** During Phase 21 production UAT (2026-04-22), investigation found 6 moving parts in the deploy path (5 self-hosted), with `forgejo-admin/hudsonfam` Forgejo repo missing + `default/imagerepository/hudsonfam` Flux resource in persistent failed state. CLAUDE.md described a GitHub Actions + GHCR pipeline that was never actually implemented. Full analysis: `.planning/notes/ci-cd-fragility-analysis.md`. Seed: `SEED-005-cicd-hardening-migration.md`.

**Proposed phases** (4 phases, ~4 hours total):

| Phase | Proposed goal |
|---|---|
| v3.5-P1 | `.github/workflows/build-and-push.yml` — build + push to ghcr.io/hudsor01/hudsonfam with YYYYMMDDHHmmss tags |
| v3.5-P2 | Flux reconfiguration — imagerepository + imagepolicy watch GHCR; GHCR pull secret via ExternalSecret |
| v3.5-P3 | Decommission old pipeline — Woodpecker repo registration + broken default/imagerepository + orphaned git.homelab registry entries |
| v3.5-P4 | End-to-end smoke test + CLAUDE.md docs + retroactive Plan 21-08 UAT against newly-deployed Phase 21 code |

**Trigger:** v3.0 Phase 22+23+24 can execute without v3.5 landing first (their code will also queue up behind the same deploy block). Optimal sequencing: complete v3.0 AI work through Phase 24, then v3.5 unblocks production rollout of the accumulated v3.0 backlog in a single deploy. Alternative: insert v3.5 between any two v3.0 phases if deployment becomes urgent.

**Not yet started.** Planning artifacts will be created via `/gsd-new-milestone` when owner decides to activate.
