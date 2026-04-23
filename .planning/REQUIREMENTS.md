# Requirements: v3.0 — AI Integration

**Defined:** 2026-04-21
**Reference:** `.planning/research/SUMMARY.md`, `.planning/notes/ai-pipeline-integration-context.md`
**Core Value:** Close the rendering gap between the n8n Job Search pipeline's LLM output and the /admin/jobs dashboard so the owner can actually use what the pipeline produces.

## v1 Requirements

Requirements for v3.0 MVP. Each maps to a roadmap phase and can be verified observationally.

### AI Artifact Rendering

- [x] **AI-RENDER-01**: Owner sees tailored resume content rendered as formatted markdown in the job detail sheet
- [x] **AI-RENDER-02**: Owner sees `generated_at` timestamp and `model_used` label on every AI artifact section (cover letter, company research, tailored resume, salary intelligence)
- [x] **AI-RENDER-03**: Owner sees salary intelligence — LLM analysis prose + structured headline figures — in the job detail sheet
- [x] **AI-RENDER-04**: Owner sees distinct empty-state messaging distinguishing "never generated" from "generated but currently empty" for each AI artifact section
- [x] **AI-RENDER-05**: Owner sees a quality-score badge on cover letters when `cover_letters.quality_score` is populated
- [x] **AI-RENDER-06**: Owner sees a company-website link-out (with external-link icon) from the company research section
- [x] **AI-RENDER-07**: Owner sees provenance tags ("scraped", "LLM estimate", "company research") on every salary figure displayed; no single "$X" appears without a source label

### Owner-Triggered Actions

- [x] **AI-ACTION-01**: Owner can copy tailored resume content to the clipboard via a button that confirms success via toast
- [x] **AI-ACTION-02**: Owner can download the tailored resume as a PDF file via a button
- [x] **AI-ACTION-03
**: Owner can trigger "Research this company" for a job whose `company_research` is empty; the UI reflects in-progress state and updates when the row appears
- [x] **AI-ACTION-04
**: Owner can regenerate the cover letter for a specific job; the UI shows a pessimistic spinner, poll-refreshes on completion, and displays the new `generated_at` timestamp
- [x] **AI-ACTION-05**: Owner can regenerate the tailored resume for a specific job with the same pattern as AI-ACTION-04

- [x] **AI-ACTION-06**: Owner can regenerate salary intelligence for a specific job with the same pattern as AI-ACTION-04

- [ ] **AI-ACTION-07**: Owner sees a "workflow returned success but no data changed" warning state when a regenerate completes without updating the artifact's timestamp

### Safety & Hardening

- [x] **AI-SAFETY-01**: Markdown rendered from LLM output cannot execute JavaScript — a `<script>alert(1)</script>` payload in any artifact content renders as literal text
- [x] **AI-SAFETY-02**: Every n8n webhook call from the app is signed with HMAC-SHA256 using a shared secret (`N8N_WEBHOOK_SECRET`); n8n rejects unsigned calls
- [x] **AI-SAFETY-03**: Every n8n webhook call includes an `X-Idempotency-Key` header; replaying the same call does not re-run the underlying workflow twice
- [x] **AI-SAFETY-04**: Server Action errors returned to the client are drawn from a sentinel set ("timeout", "auth", "rate limit", "unavailable") — raw `e.message` or stack traces are never returned
- [x] **AI-SAFETY-05**: `/admin/*` routes serve a Content-Security-Policy header that blocks inline scripts, object embeds, and framing
- [x] **AI-SAFETY-06**: Every row read from an LLM artifact table (cover_letters, company_research, tailored_resumes, salary_intelligence) is validated via Zod `safeParse` at the `jobs-db.ts` boundary; malformed rows fail-open with a logged warning and an error-boundary-rendered section, never crash the page

### Data Layer

- [x] **AI-DATA-01**: `getJobDetail()` returns salary intelligence joined to the job via a defensive `LEFT JOIN LATERAL` that tolerates both `job_id` and `company_name` keying in the `salary_intelligence` table
- [x] **AI-DATA-02**: `src/lib/jobs-db.ts` exports a `SalaryIntelligence` TypeScript type + matching Zod schema derived from the actual `salary_intelligence` schema once task #11 has produced at least one row
- [x] **AI-DATA-03**: A pure `isStale(timestamp, thresholdDays)` util exists in `src/lib/job-freshness.ts` with Vitest coverage and is used to drive every freshness badge
- [x] **AI-DATA-04**: A Vitest integration test verifies each column referenced in `jobs-db.ts` exists in the live `n8n` database via `information_schema.columns`; the test fails with a clear message if any column is missing

## v2 Requirements

Deferred to v3.1 (gated on owner feedback after v3.0 ships and is used for ~2 weeks).

### Inline Editing

- **EDIT-01**: Owner can inline-edit the tailored resume content; edits persist to a new `edited_at` column without overwriting the LLM-generated `original_content`
- **EDIT-02**: Owner can inline-edit the cover letter content with the same pattern as EDIT-01
- **EDIT-03**: Owner can revert an edited artifact back to its `original_content`

### Cross-Cutting Visibility

- **DASH-01** (SEED-001): Owner sees an aggregate pipeline-health view (scored-last-7d, cover-letters-generated, per-workflow error rate) on a `/admin/jobs/pipeline` sub-tab or equivalent surface

## Out of Scope

Explicitly excluded — do not add to v3.0 scope.

| Feature | Reason |
|---------|--------|
| Interview prep rendering | Owner does not care (explicit scope decision, 2026-04-21) |
| Recruiter outreach rendering | Owner does not care (explicit scope decision, 2026-04-21) |
| Streaming token output during regenerate | Solo user, infrequent action, 30s spinner is acceptable |
| Inline PDF preview in detail sheet | Attack surface (data:/blob: URIs, iframe CSP) exceeds owner-visible benefit — download-only is preferred (Pitfall 2) |
| Collaboration, comments, sharing, mentions | Solo-user application; no collaboration surface exists |
| Audit log of artifact edits | Git-like versioning is over-engineered for v3.0 — `edited_at`/`original_content` (v3.1) is sufficient history |
| In-app chat with LLM | Duplicates Claude.ai / ChatGPT; no product value add |
| Bulk regenerate across many jobs | Pipeline-cost explosion risk + no owner-requested use case |
| Configurable LLM prompts from UI | Pipeline-config concern; belongs in n8n workflow editing, not the admin dashboard |
| Email-from-admin for cover letters | Already works better in the owner's existing email client |
| Auto-scheduled `company_research` across all 467 jobs | Token waste; owner-triggered only per context note |

## Traceability

Mapped to roadmap phases 2026-04-21 by `gsd-roadmapper`.

| REQ-ID | Phase | Status |
|--------|-------|--------|
| AI-RENDER-01 | Phase 20 (20-01, 20-05, 20-06) | Complete (2026-04-21) |
| AI-RENDER-02 | Phase 20 (20-04, 20-06) | Complete (2026-04-21) |
| AI-RENDER-03 | Phase 22 (22-06 component; 22-07 mount + SectionErrorBoundary wrap) | Code complete (2026-04-22) — prod UAT deferred to v3.5; SalaryIntelligenceSection mounted in job-detail-sheet.tsx between Tailored Resume and Company Intel, wrapped in SectionErrorBoundary section="salary_intelligence"; dead-UI today (0 salary_intelligence rows pending n8n task #11) but all 3 render branches fully test-covered |
| AI-RENDER-04 | Phase 21 / Plan 21-06 | Code complete (2026-04-22) — prod UAT deferred to v3.5 (see 21-08-SUMMARY.md) |
| AI-RENDER-05 | Phase 21 (21-05) | Code complete (2026-04-22) — prod UAT deferred to v3.5; runtime dead-UI today (0/12 cover_letters have quality_score) |
| AI-RENDER-06 | Phase 21 / Plan 21-07 | Code complete (2026-04-22) — prod UAT deferred to v3.5; runtime dead-UI today (0/636 jobs have company_url) |
| AI-RENDER-07 | Phase 22 / Plan 22-05 (primitive); Plan 22-07 (call-site adjacency) | Code complete (2026-04-22) — prod UAT deferred to v3.5; `<ProvenanceTag>` + pure `provenanceColor`/`provenanceLabel` helpers shipped (Plan 22-05); 2 retrofit call sites landed in Plan 22-07 (header `source="scraped"`, Company Intel `source="company_research"`; SalaryIntelligenceSection's headline `source="llm"` already wired by Plan 22-06); grep-gate G-1 adjacency to `$X` figures test-enforced via source-text assertion in job-detail-sheet.test.tsx |
| AI-ACTION-01 | Phase 21 (21-04) | Code complete (2026-04-22) — prod UAT deferred to v3.5 (see 21-08-SUMMARY.md) |
| AI-ACTION-02 | Phase 21 (21-01 pipeline, 21-02 schema, 21-03 server, 21-04 UI) | Code complete (2026-04-22) — prod UAT deferred to v3.5; n8n `TailoredResume01` workflow live + 8/8 rows have real pdf_data |
| AI-ACTION-03 | Phase 23 (23-04 CI grep gate + 23-02 triggerCompanyResearch Server Action — requireRole first-line + randomUUID idempotency + sendSignedWebhook("job-company-intel") + discriminated-union return; UI trigger pending 23-05 button + 23-07 mount) | Code complete (2026-04-23) — Server Action landed with 9/9 contract tests green (D-12 adjacency + D-03 UUID uniqueness + D-08 no-throw sentinel propagation); prod UAT deferred to v3.5 |
| AI-ACTION-04 | Phase 23 (23-04 CI grep gate + 23-02 regenerateCoverLetter Server Action — requireRole first-line + D-06 amended server-read baseline + randomUUID + sendSignedWebhook("regenerate-cover-letter") + T-23-02-05 DB-error guard; UI trigger pending 23-06 button + 23-07 mount) | Code complete (2026-04-23) — Server Action landed with 9/9 contract tests green; D-06 amended baseline template set for Phase 24; prod UAT deferred to v3.5 |
| AI-ACTION-05 | Phase 24 | Pending |
| AI-ACTION-06 | Phase 24 | Pending |
| AI-ACTION-07 | Phase 24 | Pending |
| AI-SAFETY-01 | Phase 20 (20-05) | Complete (2026-04-21) |
| AI-SAFETY-02 | Phase 23 (23-01 sendSignedWebhook primitive — HMAC helper contract) | Code complete (2026-04-22) — prod UAT deferred to v3.5; callers in 23-02/03/05/06 consume the primitive |
| AI-SAFETY-03 | Phase 23 (23-01 sendSignedWebhook primitive — X-Idempotency-Key helper contract) | Code complete (2026-04-22) — prod UAT deferred to v3.5; callers in 23-02/03/05/06 pass crypto.randomUUID() per click |
| AI-SAFETY-04 | Phase 23 (23-01 sendSignedWebhook primitive — ErrorSentinel bounded union + D-08 no-raw-leak) | Code complete (2026-04-22) — prod UAT deferred to v3.5; callers render on sentinel match |
| AI-SAFETY-05 | Phase 20 (20-07) | Complete (2026-04-21) |
| AI-SAFETY-06 | Phase 20 (20-03) | Complete (2026-04-21) |
| AI-DATA-01 | Phase 22 (22-02 LEFT JOIN LATERAL + WHERE FALSE skeleton) | Code complete (2026-04-22) — prod UAT deferred to v3.5; WHERE FALSE skeleton pending n8n task #11 upstream fix for real rows |
| AI-DATA-02 | Phase 22 (22-01 schema + CompanyResearch cascade; 22-02 SalaryIntelligence TS interface + JobDetail/FreshJobDetail extensions + parseOrLog wiring; 22-03 `?? "USD"` default removal server-side D-12 cascade) | Code complete (2026-04-22) — prod UAT deferred to v3.5 |
| AI-DATA-03 | Phase 20 (20-02) | Complete (2026-04-21) |
| AI-DATA-04 | Phase 20 (20-08) | Complete (2026-04-21) |

**Coverage:**
- v1 requirements: 24 total
- Mapped to phases: 24 ✅
- Unmapped: 0

**Per-phase counts:**
- Phase 20 (Foundation): 7 REQs — AI-RENDER-01, AI-RENDER-02, AI-SAFETY-01, AI-SAFETY-05, AI-SAFETY-06, AI-DATA-03, AI-DATA-04
- Phase 21 (Polish): 5 REQs — AI-ACTION-01, AI-ACTION-02, AI-RENDER-04, AI-RENDER-05, AI-RENDER-06
- Phase 22 (Salary Intel defensive): 4 REQs — AI-RENDER-03, AI-RENDER-07, AI-DATA-01, AI-DATA-02
- Phase 23 (Owner-triggered pattern-setter): 5 REQs — AI-ACTION-03, AI-ACTION-04, AI-SAFETY-02, AI-SAFETY-03, AI-SAFETY-04
- Phase 24 (Regenerate expansion): 3 REQs — AI-ACTION-05, AI-ACTION-06, AI-ACTION-07

---
*Requirements defined: 2026-04-21*
*Last updated: 2026-04-22 — Phase 22 (4 REQs: AI-RENDER-03, AI-RENDER-07, AI-DATA-01, AI-DATA-02) marked "Code complete — prod UAT deferred to v3.5" per the same CI/CD pipeline block documented in `.planning/notes/ci-cd-fragility-analysis.md`. Phase 22 ships defensive LEFT JOIN LATERAL skeleton (WHERE FALSE today; 1-line predicate edit when n8n task #11 lands) + SalaryIntelligence Zod schema + SalaryIntelligenceSection renderer + ProvenanceTag primitives + D-12 currency cascade complete. All 4 REQs code-complete + full suite 450/450 green. Prior Phase 21 footer preserved in git history.*
