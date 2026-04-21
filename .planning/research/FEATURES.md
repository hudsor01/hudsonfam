# Feature Research — v3.0 AI Integration

**Domain:** Solo-owner admin UI for surfacing LLM-generated job-search artifacts (tailored resumes, salary intelligence, company research, cover letters) in an existing Next.js admin panel.
**Researched:** 2026-04-21
**Confidence:** HIGH

---

## Scope Reminder

This milestone **only surfaces existing n8n pipeline output**; it does not change pipeline logic (except SEED-001-adjacent fixes tracked as homelab tasks). Solo-owner UI — no multi-user, no collaboration, no audit logs, no sharing. `interview_prep` and `recruiter_outreach` are explicitly out of scope per `.planning/notes/ai-pipeline-integration-context.md`.

**Existing UI to extend:** `src/app/(admin)/admin/jobs/job-detail-sheet.tsx` — a right-side `Sheet` that stacks sections top-down (badge/title/meta → Apply button → Cover Letter → Company Intel → Description). New sections must compose into that same sheet without turning it into an unscannable wall of text.

**Existing patterns that set precedent:**
- Cover letter PDF is served from **upstream base64** (n8n renders PDF → stores `pdf_data` column → Next.js API route streams bytes). The Next.js app does not render PDFs itself.
- n8n webhooks are fired via `fireWebhook()` (fire-and-forget) or awaited with `AbortSignal.timeout(180000)` in `triggerOutreach()` for workflows that return UI-ready data.
- Sections are separated by `<Separator />`; headings use `text-sm font-semibold` with a Lucide icon at `size-4`.

---

## Feature Landscape

### Table Stakes (Must Have for v3.0)

| # | Feature | Why Expected | Complexity | Notes |
|---|---------|--------------|------------|-------|
| T1 | **Render tailored resume content** in detail sheet | Data exists (6 rows), query exists, UI missing — this is the headline gap | **S** | Mirror the cover-letter block pattern. `<pre>` / `whitespace-pre-wrap` at first pass. One new collapsed section. |
| T2 | **Copy tailored resume to clipboard** | Solo owner pastes into ATS forms, Google Docs, LinkedIn Easy Apply. Copy is the highest-leverage action for resume text. | **S** | shadcn Copy Button pattern (icon morph copy→check, auto-reset 2–3s). Already used elsewhere — just apply here. |
| T3 | **Download tailored resume as PDF** | Parity with cover letter. Most application portals take PDFs only; owner needs one-click export. | **M** | **Decision point:** either (a) mirror cover-letter architecture — have the n8n resume workflow emit `pdf_data` base64 and add a `/api/jobs/[id]/tailored-resume-pdf` route (preferred; consistent with existing arch), or (b) render Markdown→HTML→PDF in Next.js with Puppeteer (heavier dep, new cold-path). Option (a) unless pipeline cost is high. |
| T4 | **Show generation timestamp** on each AI artifact | "When was this written?" is the single most important question when reviewing machine-generated content. Freshness signal. | **S** | `generated_at` already on `CoverLetter` / `TailoredResume` / `CompanyResearch`. Render as "Generated 3h ago • gpt-4o-mini" in muted-foreground near each section header. Use existing `America/Chicago` formatter pattern. |
| T5 | **Show model used** on each artifact | Owner needs to distinguish "this was gpt-3.5 from last week" from "this was gpt-4o from today" when judging quality. | **S** | Already in schema (`model_used`). Render inline with T4. No extra query. |
| T6 | **Empty-state messaging** when artifact missing | `company_research` has 0 rows; `salary_intelligence` has 0 rows. Today the UI silently hides the whole block, which is indistinguishable from "pipeline hasn't run yet" vs "pipeline failed". | **S** | Render a muted placeholder: "No company research yet — fires when job is marked Interested" with a secondary link to manually trigger (T8). |
| T7 | **Render salary_intelligence summary** (model + query) | Milestone scope item #3. Once workflow is fixed (Task #11), data lands in `report_json`. Must display at minimum: target range (min/median/max), LLM analysis paragraph, data sources count. | **M** | Needs new TS type (`SalaryIntelligence`), new `LEFT JOIN` in `getJobDetail()`, new sheet section. Schema decision before UI work. |
| T8 | **Manual "Regenerate" trigger** per artifact (company research, tailored resume, salary intel) | Owner will find stale or low-quality output. Without a regen button, the only recourse is SSH into n8n. Unacceptable for a UI claiming to surface AI output. | **M** | Mirror `triggerOutreach()` pattern: server action → awaited webhook with timeout → `revalidatePath()`. One webhook per artifact type. Pessimistic UI (button shows Loader2 until return). |
| T9 | **Error state when workflow returned but produced nothing** | Pipeline can succeed (HTTP 200) yet write nothing (e.g. rate-limited LLM). Today this is indistinguishable from "never ran". | **S** | If artifact is null AND `job.updated_at` is recent (say, <24h after job creation), show "Generation attempted but no output — check n8n logs" with a link to n8n UI. Heuristic only — fine for solo owner. |
| T10 | **Link-out to company's website** from Company Intel | `company_url` column already exists; owner wants one click to validate AI claims before applying. | **S** | Add an icon link next to company name. Already have `ExternalLink` Lucide icon. |

### Differentiators (Phase 2 / Nice-to-Have)

| # | Feature | Value Proposition | Complexity | Notes |
|---|---------|-------------------|------------|-------|
| D1 | **Inline edit resume content** before copy/download | Owner often wants small tweaks (remove one bullet, swap a verb) before sending. Round-tripping through an external editor is friction. | **M** | `Textarea` swap-in with Save-to-DB server action. Writing to `tailored_resumes.content` is safe since the pipeline is content producer, not consumer. Keep `generated_at` pinned (do not rewrite) and add `edited_at` column in a migration. |
| D2 | **Inline edit cover letter** before download/copy | Same rationale as D1. Today the cover letter is read-only `whitespace-pre-wrap`. | **M** | Same pattern as D1. Requires PDF regeneration decision: either (a) accept that edits-after-download go text-only and only the original is PDF'd, or (b) migrate PDF generation to Next.js. Solo owner can tolerate (a). |
| D3 | **Salary distribution visualization** (percentile chart) | `report_json` is expected to contain multi-source search results. Rendering a simple range bar (min / p25 / median / p75 / max) turns a JSON blob into at-a-glance insight. Matches how LinkedIn Salary and Levels.fyi present comparable data. | **M** | Pure CSS/SVG bar with four tick marks. No chart library needed. Depends on final `report_json` shape (T7 must land first). |
| D4 | **Side-by-side: job description ↔ cover letter** | Teal's signature feature — lets the reviewer verify the cover letter actually addresses the JD. High value on desktop. | **M** | Two-column layout inside the sheet (or expand sheet to full-screen `Dialog`). Pure layout; no diff algorithm needed. Highlighting matched keywords is a D-tier stretch (D9 below). |
| D5 | **"Research pack" copy button** on Company Intel | Single-click copies a formatted block (company + rating + tech stack + summary + recent news) to clipboard for pasting into notes/Obsidian/Notion. Zero cost after T2 exists. | **S** | Same Copy Button component; different source string. |
| D6 | **Glassdoor / LinkedIn search link-outs** from Company Intel | `https://glassdoor.com/Search/results.htm?keyword=<company>` etc. — not deep links, just search shortcuts. Saves two clicks. | **S** | Template URLs. No API. Trivial. |
| D7 | **"Edited" badge** + "Revert to original" on inline-edited artifacts | Safety net for D1/D2. Owner edits, regrets, wants original back. | **S** | Requires D1/D2. Store original in a `original_content` column or use an append-only revisions table (overkill for solo owner — prefer simple `original_content`). |
| D8 | **Collapsed-by-default long sections** (resume, description) | Detail sheet currently scrolls as one continuous flow. Adding resume + salary + company-research triples the vertical length. Collapsible wrappers keep scan-ability. | **S** | Already importing `Collapsible` in the file. Use it for T1 and T7 immediately — probably promote to Table Stakes during implementation if the sheet feels cramped. |
| D9 | **Keyword-match highlighting** between JD and resume/cover letter | Takes D4 to the next level — visually marks which JD requirements are addressed in the resume/letter. | **L** | Requires tokenization + stemming + scoring. Out of scope for v3.0; revisit if D4 proves valuable. |
| D10 | **Quality score surfacing** on cover letter | `cover_letters.quality_score` column already exists but never rendered. Low-cost signal: red badge if <0.6, green if >0.8. | **S** | Lookup in schema confirms column exists; pipeline populates it. |

### Anti-Features (Explicitly Do Not Build)

| # | Feature | Why Requested | Why Problematic | Alternative |
|---|---------|---------------|-----------------|-------------|
| A1 | **Edit history / revision log / audit trail** | "What if I need to see what changed?" | Solo owner. Noise. Two writes/month. Complexity cost > insight value. Violates solo-owner constraint. | D7's single-slot "revert to original" is enough. |
| A2 | **Comments / annotations on AI output** | Review workflows typically have this. | No reviewers exist. Solo user. Dead feature. | Skip entirely. |
| A3 | **Sharing / export to collaborator / public link** | "Send to a friend for a second opinion" | Not a SaaS. Not a team product. Auth model (`requireRole(["owner"])`) rules it out architecturally. | Owner copies text and pastes into email/DM manually. |
| A4 | **Real-time streaming of regenerate output** | LLM chat UIs do this (ChatGPT, Claude). Feels modern. | n8n workflow is long (60–180s), batch-oriented, writes to Postgres, not a token stream. Wedging SSE/WebSocket on top requires rewriting the pipeline. Zero owner-value over "loading spinner → revalidate". | Pessimistic UI with `Loader2` + final `revalidatePath()`. Already the pattern for `triggerOutreach()`. |
| A5 | **In-app chat with a model** ("ask about this job") | Trendy in 2026 agent UIs. | Duplicates every other chat UI the owner already uses (Claude.ai, ChatGPT). No unique data advantage — everything in the DB is already rendered in the sheet. Scope creep. | If owner wants to chat, they paste the text into their preferred chat tool. |
| A6 | **Notifications / toasts when pipeline finishes in background** | Nice DX. | Pipeline runs on cron. Owner discovers output by opening the admin panel. Adding push/email/ntfy for pipeline completion = another moving part to maintain. ntfy exists for alerting (per MEMORY), but not wired to n8n workflow completion. Defer to SEED-001 pipeline-health dashboard. | Rely on timestamp freshness (T4) on next visit. |
| A7 | **Bulk regenerate** ("regen all stale tailored resumes") | Efficiency argument. | Expensive ($$ on LLM tokens), rare use case, and easy to do by hand for a solo owner with 6 resumes. Risk of runaway cost. | Per-artifact buttons (T8) are sufficient. |
| A8 | **Markdown preview toggle for resume** | Looks professional in demos. | Tailored resume from n8n is likely plain prose, not Markdown-formatted. Without pipeline emitting Markdown, preview adds nothing. | If pipeline output is Markdown, upgrade `whitespace-pre-wrap` rendering to `react-markdown`. Simpler than a toggle. |
| A9 | **Configurable regenerate prompts** ("rewrite more concise") | Parameterized regen feels powerful. | Needs prompt UI, schema for prompt storage, webhook param plumbing, n8n workflow changes. Large scope. | Owner edits prompt in n8n directly when not happy. |
| A10 | **PDF preview in an iframe** inside the sheet | Want-to-see-before-downloading intuition. | 2400px-wide PDF iframes are awkward inside a 512px-wide sheet. Owner's own PDF viewer opens instantly on download. Zero value. | Download button → local PDF viewer. |
| A11 | **Email the tailored resume from the admin panel** | Send-as-application convenience. | Requires SMTP wiring, attachment handling, deliverability worries, spam compliance. Owner already has Gmail. | Download + drag-into-Gmail. Two clicks. Done. |

---

## Feature Dependencies

```
Pipeline-side prerequisites (upstream, NOT in this milestone's code scope):
    [Company research workflow fix] ────enables──> T6 rendering non-empty company intel
    [Salary intel batch-INSERT fix]   ────enables──> T7 rendering any salary data (prerequisite)

Table stakes dependency graph:
    T1 (render resume) ───> T2 (copy) ───> T3 (download PDF)
    T1 ───> T8.resume (regen)
    T7 (render salary) ───requires──> [Salary intel workflow fix]
    T7 ───> T8.salary (regen)
    T6 (empty states)  ───enhances──> T8 (regen button appears in empty state)
    T9 (error state)   ───enhances──> T6

Differentiators:
    D1 / D2 (inline edit) ───requires──> schema migration (edited_at + original_content)
    D1 / D2 ───enables──> D7 (revert)
    D3 (salary viz) ────requires──> T7 landed + report_json shape confirmed
    D4 (side-by-side)  ────requires──> layout decision (expand sheet → full Dialog)
    D9 (match highlight) ──requires──> D4 first
    D8 (collapsible) ───likely-promote-to──> Table Stakes during implementation once sheet gets long
```

### Dependency Notes

- **T3 depends on pipeline-side PDF generation:** Follow the cover-letter precedent — have n8n's tailored-resume workflow emit a `pdf_data` base64 column on `tailored_resumes`. This keeps PDF rendering out of the Next.js app and matches existing architecture. Adding Puppeteer to Next.js introduces a heavy new dependency path that does not pay for itself when the pipeline already has rendering capability.
- **T7 blocks D3:** The salary histogram/percentile chart (D3) is only worth building after the data shape in `report_json` is frozen. Attempting both in the same sprint risks the chart assuming a shape that changes.
- **D1/D2 force a schema change:** Edits must not stomp `generated_at` or `model_used`. Add `edited_at TIMESTAMPTZ NULL` and `original_content TEXT NULL` columns. Solo-owner scale — no migration risk.
- **T8 is gated on n8n having per-artifact webhook endpoints:** Only `job-outreach`, `job-feedback-sync`, and `job-company-intel` are currently wired in `job-actions.ts`. Regenerate for tailored resume and salary intel requires adding new n8n webhook triggers (tracked as pipeline work, not app work).
- **D8 is cheap and likely promotes:** If the detail sheet exceeds ~4 screens of vertical content after T1 + T7 land, D8 moves to Table Stakes before merge.

---

## MVP Definition

### Launch With (v3.0 milestone scope)

Minimum to close the "we render AI output" claim honestly.

- [ ] **T1** Render tailored resume content
- [ ] **T2** Copy tailored resume to clipboard
- [ ] **T3** Download tailored resume as PDF (preferred path: pipeline emits `pdf_data`)
- [ ] **T4** Show `generated_at` on every AI section (cover letter, company intel, tailored resume, salary intel)
- [ ] **T5** Show `model_used` on every AI section
- [ ] **T6** Empty-state messaging for missing artifacts
- [ ] **T7** Render salary intelligence section (gated on Task #11 workflow fix producing real rows)
- [ ] **T10** Company website link-out

**Conditional-include (promote if implementation reveals):**
- [ ] **D8** Collapsible sections — promote to MVP if the sheet feels cramped after T1 + T7 merge
- [ ] **D10** Cover letter quality score badge — near-zero effort, ship it opportunistically

### Add After Validation (v3.1)

Triggered by owner feedback after using the MVP for ~2 weeks.

- [ ] **T8** Manual regenerate trigger — add when owner first hits "I want to redo this" in the wild
- [ ] **T9** Error state for silent-success failures — add after first real workflow failure teaches what signals to show
- [ ] **D1 / D2** Inline edit resume + cover letter — add when first observed "I want to tweak this" friction
- [ ] **D5** Research pack copy button — trivial, ship anytime after T2 lands

### Future Consideration (v3.2+)

Defer until owner has shipped real applications with the MVP.

- [ ] **D3** Salary distribution visualization — requires stable `report_json` shape
- [ ] **D4** Side-by-side JD ↔ cover letter — requires full-screen layout decision
- [ ] **D6** Glassdoor/LinkedIn search link-outs — cosmetic
- [ ] **D7** Revert-to-original — only after D1/D2 ship
- [ ] **D9** Keyword-match highlighting — only if D4 proves valuable

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority | Upstream Dependency? |
|---------|------------|---------------------|----------|----------------------|
| T1 Render resume | HIGH | LOW | **P1** | No — data exists |
| T2 Copy resume | HIGH | LOW | **P1** | No |
| T3 Resume PDF | HIGH | MEDIUM | **P1** | Yes — pipeline must emit `pdf_data` (preferred path) |
| T4 Generated-at timestamp | HIGH | LOW | **P1** | No |
| T5 Model-used label | MEDIUM | LOW | **P1** | No |
| T6 Empty states | HIGH | LOW | **P1** | No |
| T7 Render salary intel | HIGH | MEDIUM | **P1** | **Yes — Task #11 workflow fix is hard prerequisite** |
| T8 Regenerate trigger | MEDIUM | MEDIUM | **P2** | Yes — n8n webhook endpoints per artifact |
| T9 Workflow error state | MEDIUM | LOW | **P2** | No |
| T10 Company website link | MEDIUM | LOW | **P1** | No |
| D1 Inline edit resume | MEDIUM | MEDIUM | **P2** | No — but needs migration |
| D2 Inline edit cover letter | MEDIUM | MEDIUM | **P2** | No — but needs migration |
| D3 Salary viz | MEDIUM | MEDIUM | **P3** | Yes — T7 shape must be stable |
| D4 Side-by-side JD view | MEDIUM | MEDIUM | **P3** | No |
| D5 Research pack copy | LOW | LOW | **P3** | No |
| D6 Glassdoor/LI links | LOW | LOW | **P3** | No |
| D7 Revert edits | LOW | LOW | **P3** | Requires D1/D2 |
| D8 Collapsible sections | MEDIUM | LOW | **P1/P2** | No — likely promote |
| D9 Keyword match highlight | LOW | HIGH | **P3** | Requires D4 |
| D10 Quality score badge | LOW | LOW | **P2** | No |

**Priority key:**
- P1: Ship in v3.0
- P2: Ship in v3.1 (next milestone) if owner feedback warrants
- P3: Revisit after v3.1

---

## Competitor Feature Analysis

| Feature | Teal | Kickresume | Jobscan | Our Approach (v3.0) |
|---------|------|------------|---------|---------------------|
| Tailored resume display | Yes — markdown editor | Yes — WYSIWYG builder | Read-only scan view | Plain text + copy + PDF download. No WYSIWYG — pipeline produces the text. |
| Cover letter regenerate | Yes — unlimited on paid tier | Yes — "rewrite any part" with GPT-4 | No | T8 via n8n webhook — coarser (whole artifact) but sufficient for solo owner |
| Side-by-side JD view | Yes — signature feature | No | Yes (match score view) | D4 deferred — single-column acceptable for solo review workflow |
| PDF export | Yes | Yes | N/A | Cover letter yes (upstream); tailored resume via same mechanism (T3) |
| Salary intelligence | Salary tools tab (separate) | No | No | Per-job embedded summary (T7) — unique because our pipeline already researches per-job |
| Inline edit | Yes | Yes | No | D1/D2 deferred to v3.1 |
| Model/timestamp transparency | No (black box) | No | No | **Differentiator** — T4 + T5 surface which model + when, because solo owner cares about artifact freshness |
| Comments/sharing | Yes (Teal+) | No | No | **A2/A3 explicit anti-features** — solo user |

**Why our scope is smaller than Teal:** Teal is a multi-tenant SaaS optimizing for subscription retention across many workflows. This is a single-owner pipeline viewer. Every feature Teal ships that supports discovery, onboarding, or upsell is dead weight here.

---

## Implementation Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| `report_json` shape unknown until Task #11 fix lands | T7 type-design churn | Write the TS `SalaryIntelligence` interface only after one successful workflow run. Don't speculate the shape. |
| PDF generation path not decided | T3 slips | Decide before T3 starts: default to pipeline-emits-pdf_data unless the n8n side is infeasible. Document the decision in STATE.md. |
| Sheet becomes unscannable with 5 AI sections | Poor review UX | Promote D8 (collapsible) during implementation. Use `defaultOpen={false}` on long sections (description, salary report detail). |
| n8n regenerate webhooks don't exist yet | T8 blocked on pipeline work | Ship P1 without T8. Add T8 in v3.1 after n8n webhook endpoints are created — tracked as separate homelab task. |
| Inline edits create merge conflict with next pipeline regen | D1/D2 data loss | Store `original_content`; on regen, either (a) overwrite both (accept edit loss with a warning) or (b) prompt "You edited this — overwrite?". (a) is simpler, solo owner can deal. |

---

## Sources

- [Teal — cover letter generator with side-by-side editor + regenerate](https://www.tealhq.com/post/best-ai-resume-builders) — MEDIUM confidence (marketing-heavy source)
- [Kickresume — full customization, regenerate any part](https://www.kickresume.com/en/ai-cover-letter-writer/) — MEDIUM confidence
- [LinkedIn Salary — percentile + histogram presentation](https://www.linkedin.com/blog/engineering/data-modeling/statistical-modeling-for-linkedin-salary) — HIGH confidence (official engineering blog; confirms 10th/median/90th percentile UI pattern)
- [LinkedIn Salary Insights public product](https://www.linkedin.com/blog/member/product/introducing-salary-insights-on-jobs) — HIGH confidence
- [shadcn Copy Button pattern — icon morph + auto-reset](https://www.shadcn.io/button/copy) — HIGH confidence (reference implementation)
- [shadcn tabs vs accordion for dense admin UIs](https://www.shadcn.io/ui/tabs) — MEDIUM confidence (guidance-level; hybrid is standard)
- [Next.js + Puppeteer PDF generation](https://dev.to/jordykoppen/turning-react-apps-into-pdfs-with-nextjs-nodejs-and-puppeteer-mfi) — HIGH confidence (well-documented pattern; relevant only if we reject pipeline-side PDF)
- [n8n webhook trigger from Next.js](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/) — HIGH confidence (official docs — matches existing `triggerOutreach()` pattern in codebase)
- [React-admin Confirm component — pessimistic mutation pattern](https://marmelab.com/react-admin/Confirm.html) — HIGH confidence
- [Salary distribution visualization — boxplot + percentile conventions](https://hranalytics101.com/analyzing-salary-data-with-r-part-2-essential-visualization-techniques-6/) — MEDIUM confidence (reference; our D3 implementation is simpler than a full boxplot)

---

*Feature research for: v3.0 AI Integration milestone, hudsonfam admin panel.*
*Researched: 2026-04-21*
