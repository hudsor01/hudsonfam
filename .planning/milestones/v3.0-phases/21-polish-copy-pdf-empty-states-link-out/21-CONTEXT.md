# Phase 21: Polish (Copy + PDF + Empty States + Link-out) - Context

**Gathered:** 2026-04-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Complete the owner's read+act loop on AI artifacts surfaced by Phase 20. Five REQs, surface-level but with one scope expansion below:

1. **AI-ACTION-01** — Copy tailored resume to clipboard + sonner toast confirmation
2. **AI-ACTION-02** — Download tailored resume as PDF (owner override of roadmap SC #2: no `.md` fallback — see D-03)
3. **AI-RENDER-04** — Distinct empty-state copy for "never generated" vs "generated but empty", on all three LLM sections (cover letter, tailored resume, company research)
4. **AI-RENDER-05** — Color-coded quality-score badge on cover letters (driven by `cover_letters.quality_score`)
5. **AI-RENDER-06** — Company-website link-out on the company name in the sheet header (`target="_blank"`, `rel="noopener noreferrer"`, ExternalLink icon)

**Scope expansion (not in ROADMAP.md, owner-driven during discuss-phase):** AI-ACTION-02 cannot honestly ship as PDF-only until the n8n `Job Search: Tailored Resume` workflow emits `pdf_data` and the `tailored_resumes` table has the column. Phase 21 now includes that pipeline + migration work so the PDF button actually functions end-to-end. See `<decisions>` D-04 for the full list of additions.

**Phase 20 revision (precedes Phase 21 planning, separate commit):** `FreshnessBadge` swaps the "3 days ago" relative-time string for a compact formal date (`4/21/26`, America/Chicago). Amber stale dot + 14d/60d thresholds stay unchanged. See D-06 through D-10.

**Not in this phase (belongs elsewhere):**
- Manual regenerate triggers for any artifact → Phases 23 + 24
- Silent-success warning state → Phase 24
- Salary intelligence rendering → Phase 22
- Inline edit / revert-to-original → v3.1
- Quality-score badge on tailored resume (no `quality_score` column exists) → only cover letter gets the badge
- Side-by-side JD↔cover-letter view, keyword-match highlighting, Glassdoor/LinkedIn search link-outs, research-pack copy button → v3.2+
- Auto-scheduled `company_research` across all jobs → explicit anti-feature (`REQUIREMENTS.md` Out-of-Scope)

</domain>

<decisions>
## Implementation Decisions

### Resume actions — copy (AI-ACTION-01)

- **D-01:** Icon-only ghost `Button` (shadcn) in the resume meta row; `size-4` Lucide `Copy` icon; Radix `Tooltip` with content `"Copy to clipboard"`. On click: `navigator.clipboard.writeText(detail.tailored_resume.content)`, icon morphs to `Check` for ~2s, then reverts. Simultaneously fires `toast.success("Resume copied to clipboard")` via the already-mounted sonner `Toaster` (see `src/components/providers.tsx:12`).
- **D-02:** Clipboard contents = `detail.tailored_resume.content` **verbatim** (raw markdown). No plain-text flattening. Rationale: modern ATS forms, Gmail rich-text, LinkedIn Easy Apply, and Google Docs all auto-render the markdown when pasted. Zero transformation = zero surprise if the pipeline tweaks output format.
- **D-03:** PDF-only download button — **NO `.md` fallback**. Owner override of ROADMAP.md Phase 21 SC #2 (which specified `.md` fallback when `pdf_data` is null). Rationale: resumes are a PDF-only artifact in every real-world use case; `.md` files just add noise. Consequence: if `pdf_data` is null, the button behavior falls under D-04 (the pipeline must exist for the button to function). ROADMAP.md + REQUIREMENTS.md should be updated by the planner to reflect the dropped fallback.

### Resume actions — PDF download (AI-ACTION-02, Phase 21 scope expansion)

- **D-04:** Shipping AI-ACTION-02 as PDF-only requires the n8n pipeline to actually produce PDFs. Phase 21 now includes **all six tasks** needed for end-to-end function:
  1. **n8n workflow edit** — `Job Search: Tailored Resume` adds a PDF-generation node emitting base64 `pdf_data` alongside the existing `content` column (mirrors cover letter workflow precedent — see `.planning/research/FEATURES.md` T3 option a)
  2. **n8n DB migration** — `ALTER TABLE tailored_resumes ADD COLUMN pdf_data TEXT` (on the `n8n` database reached via `JOBS_DATABASE_URL`)
  3. **Schema-drift guard** — `scripts/check-jobs-schema.ts:37-39` EXPECTED map: add `"pdf_data"` to the `tailored_resumes` column array
  4. **Zod schema** — `src/lib/jobs-schemas.ts` `TailoredResumeSchema`: add `pdf_data: z.string().nullable()`
  5. **Query layer** — `src/lib/jobs-db.ts` `getJobDetail()` SELECT adds `tr.pdf_data AS tr_pdf_data`; populate the `tailored_resume` object with `pdf_data: null` in the detail view (match cover-letter pattern at line 326, which omits large base64 blobs); add `getTailoredResumePdf(jobId)` mirror of `getCoverLetterPdf()` at line 402-408
  6. **API route** — `src/app/api/jobs/[id]/tailored-resume-pdf/route.ts`: direct mirror of `cover-letter-pdf/route.ts` with `requireRole(["owner"])`, base64 decode, `Content-Disposition: attachment; filename="tailored-resume-job-<id>.pdf"`
- **D-05:** Meta-row layout after copy + download land: `[FileText icon] Tailored Resume .......... [FreshnessBadge] [Copy icon button] [Download PDF link]`. Copy sits left of Download because copy is the more frequent action per FEATURES.md T2 prioritization. Download uses an `<a href="/api/jobs/{id}/tailored-resume-pdf" download>` anchor (identical pattern to cover letter at `job-detail-sheet.tsx:156-163`) — not a button — so right-click "Save as" behaves naturally.

### FreshnessBadge date-format revision (Phase 20 revision, standalone commit preceding Phase 21 planning)

- **D-06:** `FreshnessBadge` prop renames `relativeTime: string` → `generatedDate: string`. Display becomes `Generated 4/21/26 · gpt-4o-mini` instead of `Generated 3 days ago · gpt-4o-mini`. Amber stale dot + threshold-driven tooltip stay unchanged (owner retains the "this needs regeneration" visual signal).
- **D-07:** `job-actions.ts:attachFreshness` swaps the relative-time computation for `Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", month: "numeric", day: "numeric", year: "2-digit" }).format(new Date(artifact.generated_at))` — produces the `M/D/YY` form. Return shape becomes `{ generatedDate, isStale, ageDays }`. America/Chicago is mandated by CLAUDE.md §Key Decisions ("Explicit timezone on all date formatters") — keeps the app's existing timezone posture.
- **D-08:** Amber stale dot logic (`isStale` boolean + `ageDays` integer) stays exactly as Plan 20-04 shipped. Formal date is the factual piece; the dot is the actionable signal. Owner never has to mentally compute "4/21/26 vs today" — the dot answers "is this stale?" directly.
- **D-09:** Test updates: rename all `relativeTime` references in `src/__tests__/app/freshness-badge.test.tsx` + any `attachFreshness` tests to `generatedDate`; replace "3 days ago" assertions with exact `4/21/26`-style matches (use a frozen reference date in tests to avoid flakiness).
- **D-10:** Revision delivery = **standalone commit before Phase 21 plan begins**, with Plan 20-04 summary appended with a "Revision 2026-04-21: relativeTime → formatted date" note. ROADMAP.md Phase 20 section stays as-is (8/8 complete) — this is a small behavioral tweak, not a rework of the requirement. Planner should sequence this as "Task 21-00" or a pre-Phase-21 chore.

### Empty-state messaging (AI-RENDER-04)

- **D-11:** All three LLM sections (Cover Letter, Tailored Resume, Company Research) render an empty-state block when the artifact is absent or empty. Keeps the detail sheet a predictable shape regardless of pipeline state — owner always sees three section headings and knows immediately which artifacts this job has.
- **D-12:** Copy tone = **direct, state-only**. No CTAs, no references to the Phase 23 "Research" button that doesn't exist yet. Literal strings:
  - **Never generated** (artifact row missing):
    - `"No cover letter yet."`
    - `"No tailored resume yet."`
    - `"No company research yet."`
  - **Generated but empty** (row exists, content fields empty):
    - `"Cover letter was generated but is empty."`
    - `"Tailored resume was generated but is empty."`
    - `"Company research was generated but is empty."` — matches ROADMAP.md Phase 21 SC #3 wording literally
- **D-13:** Visual weight = section shell preserved. Same `[Lucide icon] {Section Name}` heading at `text-sm font-semibold`, same `<Separator />` cadence, same meta row (FreshnessBadge suppressed — no `generated_at` to show when the row is missing; suppressed when empty-body as well for consistency). Body is a single `text-sm text-muted-foreground italic` line replacing the markdown/grid content.
- **D-14:** Detection is **pure presentational** — zero schema changes, zero `job-actions.ts` changes:
  - `artifact === null` → "never generated" copy
  - `artifact && !artifact.content?.trim()` → "generated but empty" copy (cover letter + tailored resume both have a `content` string)
  - For `company_research` (no single `content` field), the "empty body" heuristic checks all LLM-derived fields: `!artifact.ai_summary?.trim() && (!artifact.tech_stack?.length) && !artifact.recent_news?.trim() && artifact.glassdoor_rating === null && artifact.employee_count === null` — **exact predicate is Claude's discretion during planning** (may refine based on what a real "empty company_research" row looks like post-Phase-23)

### Quality-score badge (AI-RENDER-05)

- **D-15:** Quality-score scale is **verified during planning, not predetermined in context**. Plan Task 0 reads the n8n `Job Search: Cover Letter` workflow's grader node AND runs `SELECT quality_score FROM cover_letters ORDER BY generated_at DESC LIMIT 5` to see the actual value distribution. Thresholds + color-band boundaries are locked in the plan doc after verification. Rationale: FEATURES.md D10 guessed "0–1 (<0.6 red, >0.8 green)" but the Zod schema is `z.number().nullable()` with no scale constraint — guessing risks shipping wrong bands.
- **D-16:** Color tokens = `destructive` (low score / red), `warning` (mid score / amber), `success` (high score / green). All three exist in `src/styles/globals.css` — no new tokens needed. Used as Tailwind classes `text-destructive` / `text-warning` / `text-success` on the badge.
- **D-17:** Component = shadcn `<Badge variant="outline">` with a dynamic color class on the text. Lives in the cover-letter meta row, **left of the FreshnessBadge**. Reads:
  `[FileText] Cover Letter .......... [Badge: Quality 0.83] [Generated 4/21/26 · gpt-4o-mini + dot] [Download PDF]`
  Radix Tooltip on the Badge: `"Cover letter quality score: 0.83 (high)"` (content substitution done in the component; wording may tweak per D-15's verified scale).
- **D-18:** When `cover_letters.quality_score` is **null**, render nothing — no placeholder, no "No score" pill, no "N/A" text. Matches FreshnessBadge's null-branch precedent from Plan 20-04. Owner never has to read a "no data" label for metadata they don't care about.

### Company link-out source (AI-RENDER-06)

- **D-19:** URL resolution = `company_research?.company_url ?? job.company_url`. If both are null, hide the link entirely (don't wrap the company name in `<a>`, don't append the ExternalLink icon). LLM-researched URL preferred because it's more likely the canonical homepage; feed-provided URL is the fallback because it's always populated on ingest but often a tracking redirect.
- **D-20:** Placement = the company name in the sheet header (`job-detail-sheet.tsx:111-116`). Wraps the existing `<span>` in an `<a target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:underline">` + appends a `<ExternalLink className="size-3 opacity-60" />` icon after the company name. Header-position chosen because it's visible pre-scroll, higher-traffic than the Company Intel section.
- **D-21:** Click behavior = new tab, no side effects on job status. The Apply button at `job-detail-sheet.tsx:72-76` is the only status-changer in the sheet. Security: `rel="noopener noreferrer"` is mandatory (same posture as the existing Apply button) to prevent `window.opener` tabnabbing from the third-party site.
- **D-22:** URL normalization helper (small pure function, colocated in the detail-sheet component or extracted to `src/lib/url-helpers.ts` — planner's choice):
  - Input starts with `http://` or `https://` → return as-is
  - Input starts with `www.` OR contains a `.` with no whitespace OR matches a plausible domain pattern → prepend `https://`
  - Anything else (e.g., `"N/A"`, `"-"`, empty string, garbage) → return `null` (triggers D-19's hide-the-link branch)
- **D-23:** **No Zod URL validation** at the `jobs-schemas.ts` boundary. Rationale: `z.string().url()` would fail the `safeParse` on a malformed URL and null out the *entire* row under the fail-open policy (D-11 from Phase 20), blanking both the company name itself and every other Company Intel field. Keep the schema lenient; normalize in the component.

### Claude's Discretion

- Copy-button icon morph timing (~2s default; owner can fine-tune post-ship)
- Exact "empty-body" predicate for `company_research` (D-14 — planner refines based on real post-Phase-23 rows)
- Quality-score scale + color-band thresholds (D-15 — planner verifies from live data)
- Toast wording for `toast.success` (current draft: `"Resume copied to clipboard"`)
- Tooltip wording for the Copy button + Quality badge
- ExternalLink icon size (`size-3` vs `size-3.5`) in the header link-out
- Whether the URL normalization helper lives inline or in `src/lib/url-helpers.ts`
- Whether the three empty-state strings live inline in each section or in a small constant map (e.g., `EMPTY_STATE_COPY`)

### Folded Todos

None — `todo.match-phase 21` returned 0 matches. The 11 open homelab-repo todos are unrelated to hudsonfam Phase 21 scope.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements and scope
- `.planning/REQUIREMENTS.md` — Phase 21 owns AI-ACTION-01, AI-ACTION-02, AI-RENDER-04, AI-RENDER-05, AI-RENDER-06
- `.planning/ROADMAP.md` §"Phase 21: Polish" — goal, success criteria, dependencies (Phase 20). Note: SC #2's `.md` fallback is overridden by D-03; planner must update ROADMAP + REQUIREMENTS to reflect this
- `.planning/notes/ai-pipeline-integration-context.md` — data topology, n8n workflow list, explicit scope decisions

### Prior phase context (carry-forward decisions)
- `.planning/phases/20-foundation-freshness-zod-tailored-resume/20-CONTEXT.md` — Phase 20 decisions; in particular D-03 (stale-indicator pattern), D-09/D-10 (ErrorBoundary granularity), D-11 (Zod fail-open policy), D-12 (Streamdown default pipeline)
- `.planning/phases/20-foundation-freshness-zod-tailored-resume/20-06-SUMMARY.md` — the `attachFreshness` helper pattern Plan 20-06 established, which the Phase 20 revision (D-06–D-10) modifies

### Research
- `.planning/research/FEATURES.md` §"Table Stakes" — T1 (render resume, shipped), T2 (copy), T3 (PDF download), T6 (empty states), T10 (company link-out), D10 (quality score)
- `.planning/research/FEATURES.md` §"Implementation Risks" — T3 pipeline-side-PDF decision (this phase takes that path)
- `.planning/research/STACK.md` — Streamdown config (already shipped, but quality-score Badge uses shadcn primitives the research catalogued)
- `.planning/research/ARCHITECTURE.md` — ErrorBoundary pattern (sections already wrapped by Phase 20; Phase 21 doesn't add boundaries)
- `.planning/research/SUMMARY.md` — top-5 pitfalls mapping; Pitfall 6 (stale cache) is partially mitigated by the formal-date revision

### Existing code this phase reads or modifies
- `src/app/(admin)/admin/jobs/job-detail-sheet.tsx` — primary edit surface: header company-name link-out, cover-letter quality badge, all three empty-state blocks
- `src/app/(admin)/admin/jobs/tailored-resume-section.tsx` — adds copy button + download link to meta row; adds empty-state branch
- `src/app/(admin)/admin/jobs/freshness-badge.tsx` — Phase 20 revision surface (D-06)
- `src/lib/job-actions.ts:attachFreshness` — Phase 20 revision surface (D-07); adds `getTailoredResumePdf`-calling route nothing new here since PDF route reads jobs-db directly
- `src/lib/jobs-db.ts:272-400` — adds `tr.pdf_data` to SELECT; adds `getTailoredResumePdf(jobId)` helper mirroring `getCoverLetterPdf` at line 402-408
- `src/lib/jobs-schemas.ts` — `TailoredResumeSchema` gains `pdf_data: z.string().nullable()`
- `src/app/api/jobs/[id]/cover-letter-pdf/route.ts` — the mirror template for the new `tailored-resume-pdf/route.ts`
- `scripts/check-jobs-schema.ts:37-39` — EXPECTED map entry for `tailored_resumes` gains `"pdf_data"`
- `src/components/providers.tsx:12` — sonner `Toaster` already mounted; copy button wires into it via `import { toast } from "sonner"`
- `src/styles/globals.css:23,31,32` — `--color-destructive` / `--color-warning` / `--color-success` already defined; no new tokens

### Project-level
- `CLAUDE.md` §"Color System" — every color must be a semantic token (no raw Tailwind color names); quality-badge color classes comply
- `CLAUDE.md` §"Testing" — Vitest + happy-dom + Testing Library; new tests colocate with components
- `CLAUDE.md` §"Key Decisions" — America/Chicago timezone mandate applies to D-07
- `CLAUDE.md` §"Component Patterns" — shadcn `<Badge>` for the quality score; shadcn `<Button>` for copy; sonner `toast` for confirmations

### External (read if touching the PDF pipeline for D-04)
- [Next.js App Router API routes with Buffer responses](https://nextjs.org/docs/app/building-your-application/routing/route-handlers) — `NextResponse` with `application/pdf` Content-Type pattern
- [n8n HTTP Request node for base64 PDF capture](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.httprequest/) — if the n8n side uses an external PDF-generation API
- [sonner `toast.success` API](https://sonner.emilkowal.ski/) — already the project pattern (18+ call sites); reference for action-toast variants if the planner wants an "Undo" button

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`src/components/providers.tsx:12`** — sonner `<Toaster position="bottom-right" />` already mounted at root. Copy button wires in via `import { toast } from "sonner"; toast.success("Resume copied to clipboard")`. Same pattern used in 18 files already (grep `src/app/**/*.tsx` for `from "sonner"`).
- **`src/app/api/jobs/[id]/cover-letter-pdf/route.ts`** — 32-LoC template that the new `tailored-resume-pdf/route.ts` clones verbatim (only the table name and filename change). `requireRole(["owner"])`, `Buffer.from(base64, "base64")`, `Content-Disposition: attachment`.
- **`src/lib/jobs-db.ts:402-408`** — `getCoverLetterPdf(jobId)` is the 6-LoC template for `getTailoredResumePdf(jobId)`. Same `SELECT pdf_data FROM X WHERE job_id = $1` shape, same `?? null` return.
- **`src/app/(admin)/admin/jobs/job-detail-sheet.tsx:141-171`** — cover-letter block is the exact visual+code template for what the tailored-resume + company-research empty states look like. Same heading shape, same metadata row structure, same `<Download>` link component.
- **`src/app/(admin)/admin/jobs/job-detail-sheet.tsx:72-76`** — `handleApply` already models the `window.open(url, "_blank", "noopener,noreferrer")` pattern; the header link-out (D-20) uses the `<a>` equivalent.
- **41 shadcn components in `src/components/ui/`** — `Badge`, `Button`, `Tooltip`, `ScrollArea`, `Separator`, `Sheet` all already imported by the detail sheet. No new shadcn installs.

### Established Patterns
- **Dual URL source precedent** — `job-detail-sheet.tsx:74` uses `detail.url` (the job listing URL) for the Apply button; header Building2-icon currently renders company name as plain text. D-19 introduces a second dual-source pattern (research URL → feed URL fallback) that matches the existing one mechanically.
- **Null-branch = render-nothing** — Plan 20-04's `FreshnessBadge` hides itself when `relativeTime` is empty. D-18 (quality-badge) + D-19 (null URL case) follow the same pattern — no "No data" placeholders anywhere.
- **Sheet section order** — current order: Header → Apply button → Cover Letter → Tailored Resume → Company Intel → Description. Empty states (D-11) preserve that order; every section always renders, only the body varies.
- **Detail view omits large blobs** — `jobs-db.ts:326` sets `pdf_data: null` in the detail-view cover letter object even though the column has bytes. Pattern: the detail endpoint doesn't ship base64 to the browser; the dedicated PDF route does. D-04 task #5 replicates this for tailored resume.
- **`requireRole(["owner"])` on every admin API route** — already enforced at `src/app/api/jobs/[id]/cover-letter-pdf/route.ts:9`. D-04's new route gets the same first line.
- **Presentational detection over data-layer enrichment** — D-14 deliberately keeps empty-state logic in the component, not in `attachFreshness`. Matches FreshnessBadge's posture: `attachFreshness` is pure data transform; display/empty/error concerns stay in JSX.

### Integration Points
- **`src/app/(admin)/admin/jobs/job-detail-sheet.tsx`** — edits concentrate here: company-name link-out in header (D-20), quality badge in cover-letter meta row (D-17), empty-state branches in all three section blocks (D-11 through D-14)
- **`src/app/(admin)/admin/jobs/tailored-resume-section.tsx`** — adds Copy icon-button + Download anchor to meta row; adds empty-state branch when `resume === null` (currently early-returns `null`)
- **`src/app/(admin)/admin/jobs/freshness-badge.tsx`** — Phase 20 revision: prop rename + display-text change (D-06)
- **`src/lib/job-actions.ts`** (inside `attachFreshness`) — Phase 20 revision: swap relative-time computation for `Intl.DateTimeFormat` (D-07)
- **`src/lib/jobs-db.ts:272-400`** — adds one column to the SELECT, one line to the TailoredResume interface, one line to the returned object, one new 6-LoC helper function at the bottom
- **`src/lib/jobs-schemas.ts`** — one new field on `TailoredResumeSchema`
- **`src/app/api/jobs/[id]/tailored-resume-pdf/route.ts`** — NEW FILE (clone of cover-letter-pdf)
- **`scripts/check-jobs-schema.ts:37-39`** — one-string edit to the EXPECTED map
- **n8n homelab repo** — `Job Search: Tailored Resume` workflow edit + `ALTER TABLE tailored_resumes ADD COLUMN pdf_data TEXT` migration. NOT in this repo; tracked via separate plan task that lives in the homelab repo
- **`src/__tests__/app/freshness-badge.test.tsx`** + any freshness-related tests under `src/__tests__/lib/` — update assertions for the Phase 20 revision

</code_context>

<specifics>
## Specific Ideas

- **Copy button UX reference** — `shadcn.io/button/copy` pattern (icon morph Copy → Check for 2s, ghost variant, tooltip via Radix). Directly quoted in FEATURES.md §Table Stakes T2.
- **Date format** — owner said `"4/21/26 would suffice"`. America/Chicago per CLAUDE.md. `Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", month: "numeric", day: "numeric", year: "2-digit" })`.
- **Empty-state copy** — owner wants "Direct, state-only — no CTAs." Never mention Phase 23 triggers that don't exist yet. Exact strings are locked in D-12.
- **Quality-score verification** — plan Task 0 queries `SELECT quality_score FROM cover_letters ORDER BY generated_at DESC LIMIT 5` + reads the n8n cover-letter workflow's grader node. Don't guess the scale.
- **Company link-out security** — `rel="noopener noreferrer"` is mandatory; matches the existing Apply button at `job-detail-sheet.tsx:75`.
- **PDF-only, no .md fallback** — owner explicitly overrode roadmap SC #2. "Resumes should only be in pdf." ROADMAP + REQUIREMENTS need text updates to match.
- **FreshnessBadge stale dot stays** — formal date is factual signal; amber dot remains the "needs regeneration" cue. Don't conflate the two.

</specifics>

<deferred>
## Deferred Ideas

**Discussed and moved to later phases:**
- Manual regenerate buttons on cover letter + company research → Phase 23 (AI-ACTION-03, AI-ACTION-04)
- Manual regenerate buttons on tailored resume + salary intel → Phase 24 (AI-ACTION-05, AI-ACTION-06)
- Silent-success warning banner when regenerate reports OK but timestamp doesn't advance → Phase 24 (AI-ACTION-07)
- Salary intelligence rendering + provenance tags → Phase 22 (AI-RENDER-03, AI-RENDER-07)
- Quality-score badge on sections other than cover letter — `tailored_resumes` has no `quality_score` column, `company_research` doesn't have one either. Out of scope unless/until pipeline adds them.

**Considered and explicitly dropped during this discussion:**
- `.md` fallback for the tailored-resume download button — owner override (D-03). PDF-only.
- Zod `z.string().url()` at the schema boundary — would null-out entire rows on one bad URL under fail-open policy (D-23). Keep schema lenient; normalize in component.
- Empty-state copy hinting at Phase 23 "click Research" / "click Regenerate" triggers — buttons don't exist yet; would ship with placeholder or require rewrite. Direct state-only wording (D-12) instead.
- Predetermined quality-score thresholds — FEATURES.md D10 guessed 0–1 / <0.6 / >0.8 but nothing confirms the scale. Verified in plan Task 0 instead (D-15).
- Two explicit download buttons (PDF + .md) — obsolete after the PDF-only decision.
- Mark-as-interested side effect on company link-out click — Apply button is the only status-changer; implicit side effects are surprising (D-21).

**Deferred to v3.1+:**
- Inline-edit resume + cover letter (EDIT-01, EDIT-02, EDIT-03) — user-validation-gated
- Revert-to-original on edited artifacts — only after inline-edit lands
- Aggregate pipeline-health dashboard (DASH-01 / SEED-001) — v3.1+

**Deferred to v3.2+ or later:**
- Side-by-side JD ↔ cover letter view (FEATURES.md D4)
- Keyword-match highlighting (FEATURES.md D9) — requires D4 first
- Glassdoor / LinkedIn search link-outs (FEATURES.md D6)
- Research-pack copy button on Company Intel (FEATURES.md D5) — trivial after copy infrastructure lands, low owner demand
- Salary distribution visualization (FEATURES.md D3)

**Explicit anti-features (confirm no drift in planning):**
- PDF preview in iframe inside the sheet (REQUIREMENTS.md out-of-scope A10)
- Email from admin (A11)
- Bulk regenerate (A7)
- Streaming token output during regenerate (A4)
- In-app chat with a model (A5)
- Notifications/toasts on pipeline completion (A6)

**Roadmap deviation note for the planner:**
The owner's D-03 decision (PDF-only, no `.md` fallback) deviates from ROADMAP.md Phase 21 SC #2 which says "or a `.md` fallback with Content-Disposition: attachment". REQUIREMENTS.md's AI-ACTION-02 wording is compatible with either interpretation. Planner must include a task that updates both files to reflect the locked decision, OR flag it at plan-approval time.

The D-04 scope expansion (n8n workflow + migration + API route) is not currently listed under Phase 21 in ROADMAP.md's Plan count / success criteria. Planner should update the Phase 21 section's "Plans: TBD" and Goal wording to reflect the pipeline work.

</deferred>

---

*Phase: 21-polish-copy-pdf-empty-states-link-out*
*Context gathered: 2026-04-21*
