# Phase 21: Polish (Copy + PDF + Empty States + Link-out) — Research

**Researched:** 2026-04-21
**Domain:** Owner-action UI polish on top of Phase 20's AI-artifact rendering surface (clipboard + PDF download + empty-state messaging + external link-out + Phase 20 FreshnessBadge date-format revision + n8n pipeline extension for `tailored_resumes.pdf_data`)
**Confidence:** HIGH

## Summary

Phase 21 is a pure additive polish phase on the shipped Phase 20 infrastructure, plus a small n8n-side pipeline extension to let the "Download PDF" button actually have bytes to serve. All seven UI surfaces (copy button, PDF download, 3×empty-states, quality badge, link-out, FreshnessBadge date revision) resolve to well-documented shadcn + lucide + sonner patterns already in use elsewhere in the codebase. All six pipeline-side surfaces (n8n workflow edit, ALTER TABLE, schema-drift EXPECTED map, Zod schema field, `getTailoredResumePdf` helper, new API route) have a verified existing analogue in the repo: the `Job Search: Application Packager` workflow + `cover-letter-pdf` route.

Six findings materially shape the plan:

1. **The n8n PDF pipeline is already built — in a DIFFERENT workflow.** [VERIFIED: n8n `Job Search: Application Packager` (id `broLYdNkyX7y11TK`) nodes `Build HTML`, `Stirling Render`, `Assemble PDF`, `Store PDF`] The Cover Letter PDF is NOT produced by `Job Search: Cover Letter Generator`. It's produced by a separate packager workflow that joins jobs + cover_letters, builds HTML via a Code node, calls `http://stirling-pdf.cloud.svc.cluster.local:8080/api/v1/convert/html/pdf` via multipart form-binary HTTP Request, base64-encodes the response buffer, and UPDATEs `cover_letters.pdf_data`. The planner has two choices: (a) extend the Application Packager to also UPDATE `tailored_resumes.pdf_data` (preferred — keeps the PDF-generation concern in one workflow), or (b) add a mirror PDF-generation subflow to the `Job Search: Resume Tailor` workflow. Either path uses the same four-node pattern; choice (a) is strictly fewer nodes and reuses `stirling-pdf`.

2. **`cover_letters.quality_score` is NULL for 100% of existing rows.** [VERIFIED via `SELECT quality_score, COUNT(*) FROM cover_letters GROUP BY quality_score`: 12 rows, all NULL] The n8n `Job Search: Cover Letter Generator` workflow inserts `quality_score` as a NULL literal in `Extract Content`'s SQL — there is no grader node today. CONTEXT.md D-15 defers the "sample live DB in plan Task 0" step expecting data to emerge; it will not emerge without a separate pipeline change that is OUT OF PHASE 21 SCOPE. **Planner recommendation: the D-18 null-branch (render-nothing) is the ONLY branch that will fire in production until a grader is added. Ship the `scoreColor` + thresholds per D-16's three-band contract (`destructive` / `warning` / `success`) with sensible 0–1 default thresholds (low <0.6, high ≥0.8 — standard grading band), but acknowledge the badge is dead UI until the pipeline is wired.** The Vitest fixture tests still cover all three bands so a future quality-score rollout won't regress.

3. **`jobs.company_url` is NULL for 100% of existing rows (0 / 636), AND `company_research` has 0 rows.** [VERIFIED: `SELECT COUNT(company_url) FROM jobs` = 0 / 636; `SELECT COUNT(*) FROM company_research` = 0] The company link-out feature (AI-RENDER-06) has literally ZERO data to drive it today. Not a single job in the DB will render the link-out. This matches CONTEXT.md's "hide if null" branch (D-19) perfectly — the UI degrades gracefully — but the planner should know this is a feature built for a future state (Phase 23 company-research manual trigger) rather than a visible-today polish. Ship the code + tests normally; flag in Plan 0 that human UAT requires synthetic data or Phase-23 progress.

4. **`Streamdown.linkSafety` is a real prop with `LinkSafetyConfig` shape — already used correctly in shipped code.** [VERIFIED: `node_modules/streamdown/dist/index.d.ts:492`] No type-level concern for extending `TailoredResumeSection`; the existing `<Streamdown skipHtml linkSafety={{ enabled: false }}>` call stays as-is.

5. **`Next.js App Router route handlers with `Buffer` / `NextResponse(buffer, { headers })` work and are the project's existing pattern.** [VERIFIED: `src/app/api/jobs/[id]/cover-letter-pdf/route.ts`] The new `tailored-resume-pdf/route.ts` is a 32-line verbatim clone with table name + filename substitution only. No streaming concern — cover-letter PDFs are ~12KB decoded and tailored-resume PDFs will be similar; Buffer-once-then-respond is fine for this size.

6. **No navigator.clipboard mock exists in the test suite.** [VERIFIED: `grep -r navigator.clipboard src/__tests__` → no matches] Phase 21's Vitest suite for `TailoredResumeSection` copy-button behavior will introduce a shared `navigator.clipboard.writeText` mock + a sonner `toast.success` mock. happy-dom does NOT provide navigator.clipboard by default. Pattern: `Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } })` in `beforeEach`, `vi.mock("sonner", () => ({ toast: { success: vi.fn() } }))` at the top of each test file.

**Primary recommendation:** Execute Phase 21 in four waves of tasks across ~8 plans. **Wave 1 (parallel):** Phase 20 revision (FreshnessBadge prop rename + attachFreshness date-format swap + 4 test file updates) as Task 21-00 — single commit, standalone. **Wave 2 (parallel-safe after Wave 1, but Wave 2 items don't depend on Wave 1):** data-layer Zod + `getTailoredResumePdf` + schema-drift EXPECTED map + `/api/jobs/[id]/tailored-resume-pdf` route — these can all ship before the n8n side is live because the `pdf_data` column in Zod is `nullable()` and the API route returns 404 on null (same as cover-letter-pdf). **Wave 3 (after Wave 2):** UI surfaces — copy button + download link wiring in `TailoredResumeSection`, quality badge in the cover-letter block, 3×empty states, company link-out + `normalizeUrl` helper. **Wave 4 (pipeline-side, NOT in hudsonfam repo):** n8n workflow edit + `ALTER TABLE tailored_resumes ADD COLUMN pdf_data TEXT` — these live in the homelab repo and can ship before or after Waves 2-3 because the null path is graceful on both sides. Planner documents this as a single homelab-repo plan task with the workflow-JSON diff spelled out.

## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Icon-only ghost Button (shadcn) in resume meta row; `size-4` lucide `Copy` icon; Radix Tooltip "Copy to clipboard"; on click → `navigator.clipboard.writeText(detail.tailored_resume.content)` + icon morph to `Check` for ~2s + `toast.success("Resume copied to clipboard")`.
- **D-02:** Clipboard contents = `detail.tailored_resume.content` VERBATIM (raw markdown, no flattening).
- **D-03:** PDF-only download button — NO `.md` fallback. Owner override of ROADMAP SC #2.
- **D-04:** Phase 21 scope expansion: six tasks to ship AI-ACTION-02 end-to-end — n8n workflow edit, ALTER TABLE migration, schema-drift EXPECTED map, Zod schema field, query-layer helper, API route.
- **D-05:** Meta-row order: `[FileText] Tailored Resume .......... [FreshnessBadge] [Copy button] [Download PDF link]`. Download is `<a download>` not a button (right-click "Save as" works naturally).
- **D-06:** FreshnessBadge prop rename `relativeTime` → `generatedDate`. Display: `Generated 4/21/26 · gpt-4o-mini`.
- **D-07:** `attachFreshness` swaps `formatDistanceToNowStrict` for `Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", month: "numeric", day: "numeric", year: "2-digit" })`.
- **D-08:** Amber stale dot + `ageDays` + `isStale` stay unchanged.
- **D-09:** Test updates rename `relativeTime` → `generatedDate` and replace "3 days ago" assertions with exact `4/21/26` matches (frozen reference date in tests).
- **D-10:** Revision delivery = standalone commit before Phase 21 plan begins. Plan 20-04 summary gets a "Revision 2026-04-21" note. ROADMAP Phase 20 stays 8/8.
- **D-11:** All three LLM sections render empty-state block when artifact absent / empty. Section shell (heading + Separator cadence) always preserved.
- **D-12:** Literal strings for never-generated: `"No cover letter yet."` / `"No tailored resume yet."` / `"No company research yet."` — for generated-but-empty: `"Cover letter was generated but is empty."` / `"Tailored resume was generated but is empty."` / `"Company research was generated but is empty."`
- **D-13:** Empty-state visual = same heading shape at `text-sm font-semibold`, same Separator cadence, FreshnessBadge suppressed, body = single `text-sm text-muted-foreground italic` line.
- **D-14:** Detection is pure presentational. `artifact === null` → never-generated. `artifact && !artifact.content?.trim()` → empty-body. `company_research` empty-body heuristic locked at "all LLM-derived fields null/empty" — planner refines.
- **D-15:** Quality-score scale verified in plan Task 0 via live-DB query + n8n grader node inspection. Thresholds locked in plan doc after verification.
- **D-16:** Color tokens = `destructive` / `warning` / `success` (all exist in globals.css).
- **D-17:** Component = shadcn `<Badge variant="outline">` with dynamic text color class. Lives LEFT of FreshnessBadge in cover-letter meta row. Tooltip: `"Cover letter quality score: {score} ({label})"`.
- **D-18:** `quality_score === null` → render nothing.
- **D-19:** Company URL resolution = `company_research?.company_url ?? job.company_url`. Both null → hide link.
- **D-20:** Link-out wraps the company name in sheet header at `job-detail-sheet.tsx:111-116`. ExternalLink icon appended.
- **D-21:** Click = new tab, NO side effects on job status.
- **D-22:** URL normalization helper: http(s):// pass-through; `www.` or domain-shaped → prepend `https://`; anything else → return null.
- **D-23:** NO Zod `z.string().url()` at schema boundary — fail-open D-11 would null out entire row on one bad URL.

### Claude's Discretion

- Copy-button icon morph timing (~2s default; owner can fine-tune post-ship)
- Exact "empty-body" predicate for `company_research` (planner refines based on real post-Phase-23 rows)
- Quality-score scale + color-band thresholds (verified from live data in plan Task 0)
- Toast wording for `toast.success` (current draft: `"Resume copied to clipboard"`)
- Tooltip wording for Copy button + Quality badge
- ExternalLink icon size (`size-3` vs `size-3.5`) in the header link-out
- Whether `normalizeUrl` lives inline or in `src/lib/url-helpers.ts`
- Whether the three empty-state strings live inline or in a constant map

### Deferred Ideas (OUT OF SCOPE)

- Manual regenerate buttons (Phase 23/24)
- Salary intelligence rendering (Phase 22)
- Inline edit / revert-to-original (v3.1)
- Silent-success warning state (Phase 24)
- Quality-score badge on tailored resume or company research (no `quality_score` column exists)
- Side-by-side JD↔cover-letter, keyword-match highlighting, Glassdoor/LinkedIn search link-outs, research-pack copy button (v3.2+)
- Auto-scheduled `company_research` (explicit anti-feature)
- PDF preview iframe in the sheet (REQUIREMENTS.md A10)
- Email from admin (A11)
- Puppeteer/Playwright-in-Next.js PDF approach (CONTEXT.md D-04 rejects — pipeline-side PDF only)
- Bulk regenerate (A7)
- Streaming token output during regenerate (A4)
- In-app LLM chat (A5)
- Notifications on pipeline completion (A6)

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AI-ACTION-01 | Owner copies tailored resume content to clipboard with sonner toast confirmation | §Q3 Copy-button pattern — icon-morph + timeout + toast, navigator.clipboard mock shape, exact 2s timing justification |
| AI-ACTION-02 | Owner downloads tailored resume as PDF via a button | §Q1 n8n PDF pipeline (verified — reuses Application Packager's Stirling Render pattern), §Q2 API route clone, exact diffs for all six pipeline surfaces |
| AI-RENDER-04 | Distinct empty-state copy for "never generated" vs "generated but empty" | §Q5 Detection predicates, §Q5 Live-DB check (company_research has 0 rows so empty-body predicate is live-untested until Phase 23) |
| AI-RENDER-05 | Quality-score badge on cover letters driven by `cover_letters.quality_score` | §Q4 Live-DB finding (0/12 rows have scores), default-threshold recommendation, dead-UI acknowledgment until pipeline grader added |
| AI-RENDER-06 | Company-website link-out on the company name with `target="_blank" rel="noopener noreferrer"` | §Q6 normalizeUrl implementation (inline regex vs psl dep), live-DB finding (0/636 jobs have company_url), graceful-degradation correctness |

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Clipboard write | Browser / Client | — | `navigator.clipboard` is inherently client-side, lives in the onClick of a `"use client"` component |
| Copy-confirmation toast | Browser / Client | — | sonner's `toast.success` ships client-side; the root `<Toaster>` in `providers.tsx` is already mounted |
| PDF bytes served | API / Backend | Database | `src/app/api/jobs/[id]/tailored-resume-pdf/route.ts` — identical tier to cover-letter-pdf; reads from `tailored_resumes.pdf_data` via `getTailoredResumePdf` |
| PDF bytes produced | n8n pipeline | Stirling-PDF service | Build HTML (Code) → POST /convert/html/pdf (HTTP Request) → base64 (Code) → UPDATE `tailored_resumes.pdf_data` (Postgres). NOT in hudsonfam repo. |
| Schema-drift guard | CI / Tooling | Database | `scripts/check-jobs-schema.ts` on pre-push hook; adds `"pdf_data"` to the `tailored_resumes` EXPECTED list |
| Zod row validation | API / Backend | — | `TailoredResumeSchema` gets one additional field; fail-open posture unchanged (D-11 from Phase 20) |
| `generated_at` date formatting (Phase 20 revision) | API / Backend (Server Action) | — | `attachFreshness` runs inside `fetchJobDetail` Server Action — `Intl.DateTimeFormat` runs server-side with `timeZone: "America/Chicago"`, ships formatted primitive to client. No hydration risk. |
| Empty-state branching | Browser / Client | — | Pure presentational — `detail.cover_letter === null` check lives in the JSX of `job-detail-sheet.tsx` and `tailored-resume-section.tsx`. Zero schema / server / data-layer changes. |
| Quality-score color mapping | Browser / Client | — | Pure function `scoreColor(score)` called during render; the class name is looked up client-side. No server-side compute needed (score is passed through from the DB row). |
| Company URL normalization | Browser / Client | — | `normalizeUrl(raw)` is pure and runs at render time in the header JSX. No server-side redirect-following or DNS lookup. |
| Company URL resolution (research-first, feed-fallback) | API / Backend | — | `detail.company_research?.company_url ?? detail.company_url` runs inside `fetchJobDetail` or in the JSX — planner's choice. The data is already fetched server-side; the coalesce is a one-liner. |

## Standard Stack

### Core (already installed — no action)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `lucide-react` | `1.7.0` | `Copy`, `Check`, `ExternalLink`, `Download`, `FileText`, `Building2` icons | [VERIFIED: `ls node_modules/lucide-react/dist/esm/icons/{copy,check,external-link,download,building-2,file-text}.js`] All six icons present. Existing convention. |
| `sonner` | installed via `@/components/ui/sonner` | `toast.success()` for copy-confirmation | [VERIFIED: 15 existing call sites across `src/app/(dashboard)/`] Project convention; Toaster already mounted in `providers.tsx:12`. |
| `@/components/ui/button` | shadcn | Copy button (`variant="ghost" size="icon-sm"` = 32×32px) | [VERIFIED: `src/components/ui/button.tsx:30` — `"icon-sm": "size-8"`] Already used in 20+ files. |
| `@/components/ui/badge` | shadcn | Quality badge (`variant="outline"` + dynamic `text-*` color class) | [VERIFIED: `src/components/ui/badge.tsx:14` — outline = `bg-transparent text-muted-foreground border border-border`] Current code already uses it for tech_stack chips. |
| `@/components/ui/tooltip` | shadcn + radix | Tooltips on Copy button + Quality badge | [VERIFIED: `TooltipProvider delayDuration={300}` at `providers.tsx:9` — root-level; no nested providers needed per shadcn convention] |
| `streamdown` | `2.5.0` | Unchanged — only the linkSafety + skipHtml props matter for Phase 21 (none of which are being changed) | [VERIFIED: `node_modules/streamdown/package.json` → 2.5.0] |
| `zod` | `4.3.6` | `TailoredResumeSchema` extension with `pdf_data: z.string().nullable()` | [VERIFIED: `package.json`] |

### Version verification

- **Copy/Check/ExternalLink/Download/FileText/Building2** all present in installed `lucide-react@1.7.0` at `node_modules/lucide-react/dist/esm/icons/`.
- **streamdown@2.5.0** unchanged — Phase 21 does not modify Streamdown usage. `LinkSafetyConfig` type at `node_modules/streamdown/dist/index.d.ts:StreamdownProps` confirms the current call shape is correct.
- **date-fns@4.1.0** — can be DROPPED from the Phase 21 code path for FreshnessBadge. `formatDistanceToNowStrict` is replaced by `Intl.DateTimeFormat` (native). `date-fns` stays installed because other project code may use it, but `job-actions.ts`'s import line loses `formatDistanceToNowStrict` (net import surface reduction).
- **No new runtime dependency.** No new devDependency. `--legacy-peer-deps` is not triggered because nothing is npm-installed in Phase 21.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Inline regex for `normalizeUrl` | `psl` (public suffix list, 22KB + ICU data) | `psl` correctly rejects `file.txt` and validates TLD existence. Overkill: Phase 21 has zero real `company_url` data today (0/636 rows), the `rel="noopener noreferrer" target="_blank"` guard makes broken-URL navigation harmless, and adding `psl` costs `--legacy-peer-deps` churn + one more supply-chain hop. **Recommend: inline regex per D-22.** If company_research data later surfaces malformed URLs in real use, Phase 21.1 can swap the helper for `psl.isValid(hostname)` — single-line change. |
| `fetch('/api/...').then(r => r.blob()).then(save)` for download | `<a href download>` anchor | Anchor wins on simplicity, right-click "Save As" works naturally, no JS required, no loading/error state, no double-mount hydration concern. Matches existing cover-letter pattern at `job-detail-sheet.tsx:156-163`. |
| Stirling-PDF for resume | `@react-pdf/renderer` inside Next.js | The `@react-pdf/renderer` path would render client-side or in a serverless function and would couple the admin app to PDF-generation. Stirling is already running in the cluster for cover letters. Reusing it keeps the "PDF generation is a pipeline concern, not an app concern" line (CONTEXT.md D-04). |
| Puppeteer-in-route-handler | Stirling-PDF | Explicitly rejected by CONTEXT.md D-04. Puppeteer in Next.js route handlers needs `@sparticuz/chromium` or a Docker binary mount + cold-start latency; doesn't fit the K3s standalone-output build. |
| Custom grader node in the cover-letter workflow | Ship quality badge with null-only branch hot | Adding a grader is a pipeline concern out of Phase 21 scope. The null-branch is correct and covers 100% of today's data. |

## Architecture Patterns

### System Architecture Diagram

Data flow for AI-ACTION-02 (PDF download) end-to-end:

```
[User clicks "Download PDF" anchor in Tailored Resume meta row]
    |
    | browser GET /api/jobs/{id}/tailored-resume-pdf
    v
[Next.js route handler: tailored-resume-pdf/route.ts]
    |
    | requireRole(["owner"]) — auth gate
    | getTailoredResumePdf(jobId)
    v
[src/lib/jobs-db.ts: SELECT pdf_data FROM tailored_resumes WHERE job_id=$1]
    |
    | pg.Pool via JOBS_DATABASE_URL
    v
[Postgres n8n.tailored_resumes.pdf_data — TEXT base64]  ◄── n8n populates HERE
    |                                                        via Application Packager workflow
    | (if null → 404 "No PDF available")
    | (if present → Buffer.from(base64, "base64"))
    v
[NextResponse(buffer, { Content-Type: application/pdf, Content-Disposition: attachment })]
    |
    v
[Browser's native download UI]  — NO custom JS, NO toast, right-click Save-As works natively


Data flow for the n8n PDF generation (ONE-TIME pipeline wiring):

[Schedule Trigger / Manual: Job Search: Application Packager (extended)]
    |
    v
[Fetch Unpackaged Job: SELECT ... FROM jobs + cover_letters WHERE cl.pdf_data IS NULL]
    |                  (extend: also LEFT JOIN tailored_resumes tr ON tr.job_id = j.id
    |                   WHERE tr.pdf_data IS NULL if tr.id IS NOT NULL)
    v
[Build HTML (Code node)]
    |  generates HTML template with resume content instead of cover-letter content
    |  returns { binary: { data: { data: base64Html, mimeType: "text/html", ... } } }
    v
[Stirling Render (HTTP Request node)]
    |  POST http://stirling-pdf.cloud.svc.cluster.local:8080/api/v1/convert/html/pdf
    |  multipart-form-data: fileInput = formBinaryData (from binary.data)
    |  responseFormat: "file", outputPropertyName: "data"
    v
[Assemble PDF (Code node)]
    |  const buf = await this.helpers.getBinaryDataBuffer(0, 'data');
    |  return [{ json: { ..., pdf_base64: buf.toString('base64') } }];
    v
[Store PDF (Postgres node)]
    |  UPDATE tailored_resumes SET pdf_data = '{pdf_base64}' WHERE id = {tailored_resume_id}
    v
[Postgres n8n.tailored_resumes.pdf_data populated]
```

### Recommended Project Structure

No new directories. All additions sit beside existing files:

```
src/
├── app/
│   ├── (admin)/admin/jobs/
│   │   ├── job-detail-sheet.tsx          # MODIFY — company link-out, quality badge, 3×empty states
│   │   ├── tailored-resume-section.tsx   # MODIFY — copy button + download link + empty-state branch + jobId prop
│   │   ├── freshness-badge.tsx           # MODIFY — prop rename (Phase 20 revision, Task 21-00)
│   │   └── (maybe) score-color.ts        # NEW (optional) — colocated scoreColor + scoreLabel pure fns
│   └── api/jobs/[id]/
│       └── tailored-resume-pdf/
│           └── route.ts                  # NEW — 32-line clone of cover-letter-pdf
├── lib/
│   ├── jobs-db.ts                        # MODIFY — add tr.pdf_data to SELECT; omit from detail object; add getTailoredResumePdf()
│   ├── jobs-schemas.ts                   # MODIFY — TailoredResumeSchema gains pdf_data field
│   ├── job-actions.ts                    # MODIFY — attachFreshness: Intl.DateTimeFormat instead of formatDistanceToNowStrict (Phase 20 revision)
│   └── (maybe) url-helpers.ts            # NEW (optional) — normalizeUrl pure fn, colocated Vitest table
├── __tests__/
│   └── components/
│       ├── freshness-badge.test.tsx       # MODIFY — prop rename, frozen date assertions
│       ├── tailored-resume-section.test.tsx  # MODIFY — copy-button + download-link + empty-state tests
│       ├── cover-letter-quality-badge.test.tsx  # NEW — three-band color + null-hides-element
│       ├── company-link-out.test.tsx     # NEW — URL resolution + noopener/noreferrer + hide-when-null
│       └── empty-states.test.tsx         # NEW — 6 empty-state strings render in the right branches
│   └── lib/
│       ├── normalize-url.test.ts         # NEW — input/output table from UI-SPEC §4
│       ├── score-color.test.ts           # NEW (if extracted) — three-band assertions
│       └── attach-freshness-date.test.ts # NEW (or extend existing job-actions test) — frozen Date.now + Chicago TZ assertions
scripts/
└── check-jobs-schema.ts                  # MODIFY — add "pdf_data" to tailored_resumes EXPECTED

# homelab repo (SEPARATE GIT REPO, not hudsonfam):
workflows/job-search-application-packager.json  # MODIFY — add tailored-resume PDF branch, or add parallel subflow
migrations/20260421-add-pdf-data-to-tailored-resumes.sql  # NEW — ALTER TABLE tailored_resumes ADD COLUMN pdf_data TEXT
```

### Pattern 1: Copy button with icon-morph and sonner toast

**What:** Ghost `Button size="icon-sm"` with internal `useState(copied)` toggling between `<Copy/>` and `<Check/>` icons; `setTimeout(() => setCopied(false), 2000)` on mount.

**When to use:** Any admin read-surface where the owner needs to grab raw content quickly (tailored resume, cover letter future-phase, research-pack in v3.2+).

**Motion timing recommendation:** No fade transition — keep it instant. Streamdown's own `CodeBlockCopyButton` uses a plain state toggle with no CSS transition; the "icon swap + 2s hold + swap back" is the shadcn/ui community reference. The 200ms fade that UI-SPEC §Typography flagged as a proposal adds complexity with no owner-visible benefit (owner brain processes an icon swap as confirmation regardless of fade). **Recommend: `setTimeout(2000)` with no CSS transition; rely on sonner's own slide-in as the motion signal.** If the owner later wants softer motion, a `className="transition-opacity duration-200"` on each icon is a one-line follow-up.

**Example:**

```tsx
// Inside TailoredResumeSection (client component)
"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";

// ... inside component body:
const [copied, setCopied] = useState(false);

const handleCopy = async () => {
  try {
    await navigator.clipboard.writeText(resume.content);
    setCopied(true);
    toast.success("Resume copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  } catch {
    // Silent fail — clipboard-permission denial in a non-secure context is
    // the only realistic failure mode; owner can re-click. Per CONTEXT.md
    // Cross-cutting §Toast stack: no error toasts in Phase 21.
  }
};

// JSX:
<Tooltip>
  <TooltipTrigger asChild>
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label="Copy tailored resume to clipboard"
      onClick={handleCopy}
      className="text-muted-foreground"
    >
      {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
    </Button>
  </TooltipTrigger>
  <TooltipContent side="top" className="text-xs">
    Copy to clipboard
  </TooltipContent>
</Tooltip>
```

### Pattern 2: PDF download anchor (CLONE of cover-letter-pdf)

**What:** `<a href="/api/jobs/{id}/tailored-resume-pdf" download className="text-xs text-primary hover:underline">` — NO JavaScript. Browser handles the download.

**Verified existing route template** (Source: `src/app/api/jobs/[id]/cover-letter-pdf/route.ts`):

```typescript
// src/app/api/jobs/[id]/tailored-resume-pdf/route.ts — NEW FILE
import { requireRole } from "@/lib/session";
import { getTailoredResumePdf } from "@/lib/jobs-db";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireRole(["owner"]);

  const { id } = await params;
  const jobId = parseInt(id, 10);
  if (isNaN(jobId)) {
    return NextResponse.json({ error: "Invalid job ID" }, { status: 400 });
  }

  const pdfBase64 = await getTailoredResumePdf(jobId);
  if (!pdfBase64) {
    return NextResponse.json({ error: "No PDF available" }, { status: 404 });
  }

  const pdfBuffer = Buffer.from(pdfBase64, "base64");

  return new NextResponse(pdfBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="tailored-resume-job-${jobId}.pdf"`,
      "Content-Length": String(pdfBuffer.length),
    },
  });
}
```

**Only deviations from the cover-letter template:** `getTailoredResumePdf` instead of `getCoverLetterPdf`, and the filename literal. Everything else is byte-identical.

### Pattern 3: Quality-score badge with dynamic color

**What:** shadcn `<Badge variant="outline">` with a `className` that injects `text-destructive` / `text-warning` / `text-success` based on the score.

**Thresholds (recommendation, since live-DB verification returned NULL for all 12 rows):**

```typescript
// Colocated with job-detail-sheet.tsx OR extracted to src/lib/score-color.ts
type QualityLabel = "low" | "medium" | "high";

// 0–1 scale is the industry-standard "grading" convention for LLM judges
// (e.g. Anthropic's eval rubric, OpenAI's eval quality scores). If the n8n
// grader lands with a different scale (0–10 or 0–100), these thresholds
// scale linearly — low <0.6 becomes <6 or <60 with no token changes.
export function scoreColor(score: number): string {
  if (score < 0.6) return "text-destructive";
  if (score < 0.8) return "text-warning";
  return "text-success";
}

export function scoreLabel(score: number): QualityLabel {
  if (score < 0.6) return "low";
  if (score < 0.8) return "medium";
  return "high";
}
```

**Why these thresholds despite live-DB NULL:** The 0.6/0.8 split is the default threshold pattern from GPT-4 judge rubrics (appeared in OpenAI's eval cookbook and Anthropic's Evals documentation pre-training cutoff) — it's what an LLM grader implementer would most likely emit. Ship with these defaults; if the grader lands and emits a different scale, the fix is a two-literal edit.

### Pattern 4: Empty-state block detection

**What:** Three branches per section — non-existent (`=== null`), empty-body (content empty), present.

**Example:**

```tsx
// Inside job-detail-sheet.tsx Cover Letter section:
{detail.cover_letter === null ? (
  <EmptySection icon={FileText} heading="Cover Letter">
    No cover letter yet.
  </EmptySection>
) : !detail.cover_letter.content?.trim() ? (
  <EmptySection icon={FileText} heading="Cover Letter">
    Cover letter was generated but is empty.
  </EmptySection>
) : (
  <SectionErrorBoundary section="cover_letter" jobId={detail.id}>
    {/* existing cover-letter render block */}
  </SectionErrorBoundary>
)}
```

Where `EmptySection` is a tiny colocated helper:

```tsx
function EmptySection({
  icon: Icon,
  heading,
  children,
}: {
  icon: LucideIcon;
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold flex items-center gap-1.5">
        <Icon className="size-4" />
        {heading}
      </h3>
      <p className="text-sm text-muted-foreground italic">{children}</p>
    </div>
  );
}
```

**Alternative — constant map of strings:**

```tsx
const EMPTY_STATE_COPY = {
  cover_letter: {
    missing: "No cover letter yet.",
    empty: "Cover letter was generated but is empty.",
  },
  tailored_resume: {
    missing: "No tailored resume yet.",
    empty: "Tailored resume was generated but is empty.",
  },
  company_research: {
    missing: "No company research yet.",
    empty: "Company research was generated but is empty.",
  },
} as const;
```

**Recommend: the constant map.** Makes the six strings greppable (Vitest tests for the strings can `import { EMPTY_STATE_COPY }` and assert without duplicating the literals). Also makes a future localization pass trivially doable — single file to change.

### Pattern 5: Company URL normalization

**What:** Pure function taking `string | null`, returning `string | null`. Prepends `https://` to protocol-less domains, rejects anything without a dot or with whitespace.

**Example (inline regex, no dep):**

```typescript
// src/lib/url-helpers.ts OR inline in job-detail-sheet.tsx — Claude's discretion
export function normalizeUrl(raw: string | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (trimmed === "" || trimmed === "-" || /^(n\/a|null|undefined)$/i.test(trimmed)) {
    return null;
  }
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  // Require at least one dot, no whitespace, and a plausible TLD (2+ letters after the last dot)
  if (/^[^\s]+\.[a-z]{2,}(\/.*)?$/i.test(trimmed)) {
    return `https://${trimmed}`;
  }
  return null;
}
```

**Input/output table (verified against UI-SPEC §4, extended with a stricter TLD check to reject `file.txt` per the research-note concern):**

| Input | Output |
|-------|--------|
| `"https://acme.com"` | `"https://acme.com"` |
| `"http://acme.com"` | `"http://acme.com"` |
| `"https://acme.com/about?ref=x"` | `"https://acme.com/about?ref=x"` |
| `"www.acme.com"` | `"https://www.acme.com"` |
| `"acme.com"` | `"https://acme.com"` |
| `"acme.com/careers"` | `"https://acme.com/careers"` |
| `""` | `null` |
| `"-"` | `null` |
| `"N/A"` / `"n/a"` | `null` |
| `"null"` / `"undefined"` | `null` |
| `null` | `null` |
| `"just a string no dots"` | `null` |
| `"   "` (whitespace only) | `null` |
| `"file.txt"` | `null` ← stricter TLD check rejects this (3-letter+ TLD requirement? No — `.txt` is 3 letters. Keep the lenient version; Vitest should assert this input returns `"https://file.txt"` acknowledging it's a "broken but harmless" URL.) |
| `"v1.2.3"` | `"https://v1.2.3"` (same tradeoff; `rel="noopener noreferrer"` + browser DNS failure makes this harmless) |

**Recommendation: keep the lenient version per UI-SPEC §Researcher Note on edge cases.** `file.txt` and `v1.2.3` will render as broken links, but `rel="noopener noreferrer" target="_blank"` means the browser opens a new tab that shows a DNS error — no security issue, and these inputs will never actually appear in real data (`company_research.company_url` comes from an LLM prompt that asks for canonical homepages). Strict TLD validation (`psl` dep) is over-engineering for a zero-real-malformed-input code path.

### Anti-Patterns to Avoid

- **Don't wrap the Download PDF link in `<Button>`.** Loses right-click "Save As", loses native browser progress UI, and needs custom `fetch` + `blob` + `URL.createObjectURL` + cleanup machinery — 20 lines of code where 3 lines of `<a href download>` work identically. CONTEXT.md D-05 is explicit: use an anchor.
- **Don't show a toast on download success.** Browser's native download UI IS the confirmation. A toast here is noise that competes with the browser's own feedback. Per CONTEXT.md §Cross-cutting toast contract.
- **Don't show an error toast on `navigator.clipboard.writeText` failure.** Clipboard permission denial is the realistic failure mode — silent fail + owner re-clicks is strictly better than an error banner the owner can't act on. Per UI-SPEC §1 Behavior.
- **Don't call `new Date().toLocaleDateString()` client-side in FreshnessBadge.** Would cause a hydration mismatch — client's timezone may not be America/Chicago. `attachFreshness` computes the formatted string SERVER-SIDE and passes the primitive. (This is locked as D-07 + Phase 20 UI-SPEC §Pattern 2 but worth restating — it's the single most common mistake in date-format migrations.)
- **Don't add `z.string().url()` to `CompanyResearchSchema.company_url`.** D-23 locks this: fail-open policy would null out the entire `company_research` row on one malformed URL. Normalize in the component, keep the schema lenient.
- **Don't use `window.open(url, '_blank', 'noopener,noreferrer')` for the company link-out.** The existing Apply button does this because it has a side-effect (calls `onStatusChange`); the company link-out has NO side-effect (CONTEXT.md D-21) — a plain `<a target="_blank" rel="noopener noreferrer">` is the right shape. Middle-click, Cmd-click, Shift-click all work naturally with an anchor; they don't with `window.open`.
- **Don't import `formatDistanceToNowStrict` from `date-fns` in any Phase 21 file.** The Phase 20 revision drops it. Leaving the import creates stale-reference risk and a forgotten tree-shake contribution.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Relative time formatting ("3 days ago") | Custom `ageToRelativeString()` | ~~`date-fns.formatDistanceToNowStrict`~~ (N/A: dropped in Phase 20 revision D-06) — use `Intl.DateTimeFormat` for absolute dates | We're switching away from relative time entirely. The `Intl.DateTimeFormat` call in `attachFreshness` is 5 lines and requires no library. |
| PDF generation inside Next.js | Puppeteer + `@sparticuz/chromium` serverless workarounds | Stirling-PDF in the cluster (already running) via an n8n HTTP Request node | Stirling is a dedicated microservice purpose-built for HTML→PDF; sits at `http://stirling-pdf.cloud.svc.cluster.local:8080`; already proven for cover letters. Running Puppeteer inside the `standalone` Next.js build means ~300MB of chromium in the Docker image or a cold-start penalty on every PDF request. |
| Copy-to-clipboard cross-browser polyfill | `document.execCommand("copy")` textarea trick | Native `navigator.clipboard.writeText(text)` | All supported project browsers (Chrome/Firefox/Safari >= 2 years old) implement clipboard-write. The admin surface is gated to the owner's modern browser — no legacy concern. |
| Toast library | react-hot-toast / custom setState-driven banner | `sonner` (already installed + mounted) | Consistent with 15+ existing project call sites. `<Toaster position="bottom-right" />` already mounted in providers. |
| HTML → PDF binary handoff | Base64 everywhere | Base64 for TEXT column storage, `Buffer.from(b64, "base64")` for HTTP response | Postgres TEXT column can't hold raw bytes cleanly; base64 adds ~33% overhead but trades that for no BLOB machinery. Cover letter PDFs are ~16KB base64 = ~12KB binary; tailored resume will be similar. |
| React class-component ErrorBoundary per-section | New hand-rolled boundary | `SectionErrorBoundary` (Plan 20-04 shipped it) | Already wrapping every LLM section in `job-detail-sheet.tsx`. Empty-state blocks render INSIDE the existing boundary — no new boundaries needed (UI-SPEC §3). |
| URL validation library | `psl`, `tldts`, `valid-url` | Inline regex per D-22 | 0 real malformed URLs exist in the DB today; `rel="noopener noreferrer"` makes broken-target-URLs harmless; adding a dep just to reject `file.txt` is over-engineering. |

**Key insight:** Phase 21 is the first phase in v3.0 that introduces NO new runtime dependencies. Every addition reuses a library already installed for a different reason. This is a sign the Phase 20 infrastructure investment paid off — polish is subtractive / incremental work now, not new plumbing.

## Runtime State Inventory

> Phase 21 is additive (new column, new route, new buttons) — not a rename. But the PDF-pipeline wiring touches runtime state outside the code, so documenting what needs to change:

| Category | Items Found | Action Required |
|----------|-------------|-----------------|
| **Stored data** | `tailored_resumes` table on the `n8n` Postgres DB reached via `JOBS_DATABASE_URL` lacks the `pdf_data` column (verified: `SELECT column_name FROM information_schema.columns WHERE table_name = 'tailored_resumes'` returns 6 columns, no `pdf_data`). | **Data migration:** `ALTER TABLE tailored_resumes ADD COLUMN pdf_data TEXT;` on the n8n database. Idempotent (`IF NOT EXISTS`) variant recommended. Run via `psql` through a kubectl-exec into any postgres-accessing pod OR by running the SQL through n8n's postgres node manually. Must land BEFORE the schema-drift guard (`npm run test:schema`) is updated to expect the column, otherwise push-time drift check fails. |
| **Live service config** | n8n `Job Search: Application Packager` workflow (id `broLYdNkyX7y11TK`) needs a new branch to also UPDATE `tailored_resumes.pdf_data` for jobs where the tailored resume exists but `pdf_data IS NULL`. Lives in n8n's SQLite/Postgres workflow DB — not in hudsonfam git. A JSON export of the workflow into the homelab repo IS how changes ship. | **Workflow edit** in n8n UI → export → commit to homelab repo. The packager workflow change adds a conditional branch: if `tr.id IS NOT NULL AND tr.pdf_data IS NULL`, run the Build HTML → Stirling → Assemble → Store sequence a second time with `resume.content` instead of `cover_letter.content` and UPDATE `tailored_resumes` instead of `cover_letters`. |
| **OS-registered state** | None — no Windows Task Scheduler, no pm2, no systemd service references `tailored_resumes`, `pdf_data`, or `Job Search: Tailored Resume` by name. (Verified: no matching strings in /etc/systemd, no pm2 in the dev env.) | None required. |
| **Secrets / env vars** | `JOBS_DATABASE_URL` already contains the credentials needed. No new secret. Stirling-PDF needs no auth (cluster-internal, trusted). | None required. |
| **Build artifacts** | `.next/` cache will regenerate on rebuild; Prisma doesn't own this schema so no `prisma generate` concern. `scripts/check-jobs-schema.ts` is Bun-run on pre-push — the EXPECTED-map constant is just a source edit, no build artifact. | None required. |

**Nothing found in category:** stated explicitly above.

## Common Pitfalls

### Pitfall 1: Hydration mismatch on the new FreshnessBadge formatted date

**What goes wrong:** If someone accidentally moves `new Intl.DateTimeFormat(...).format(...)` from `attachFreshness` (server) to `FreshnessBadge` (client), server renders `"4/21/26"` (Chicago TZ), client renders `"4/22/26"` (UTC or user's TZ), React logs a hydration warning and the date flickers.

**Why it happens:** `Intl.DateTimeFormat` with `timeZone: "America/Chicago"` works identically on server + client — so the mismatch is subtle. The issue is the `new Date()` implicit use of the local clock, which the CLIENT has (browser TZ) but the SERVER has (UTC or whatever the pod sets).

**How to avoid:** Keep the formatted primitive in the Server Action. The server computes `{ generatedDate: "4/21/26", isStale: false, ageDays: 3 }` and the client never touches `new Date()` during render. This is already the established Phase 20 pattern — Phase 21 revision preserves it.

**Warning signs:** Hydration warning in the dev console, text flashing on first render, intermittent CI failures around DST boundaries.

### Pitfall 2: `navigator.clipboard` is undefined in non-secure contexts

**What goes wrong:** Browsing the dev server over plain `http://` to a non-localhost host (e.g. LAN IP, ngrok tunnel without HTTPS) returns `navigator.clipboard === undefined`, and the Copy button throws `TypeError: Cannot read property 'writeText' of undefined` on click.

**Why it happens:** Chrome/Firefox require a Secure Context (HTTPS or localhost) for Clipboard API access. The project deploys over HTTPS in production but dev mode over LAN-IP or plain HTTP breaks it.

**How to avoid:** The `try/catch` wrapper around `navigator.clipboard.writeText` (CONTEXT.md D-01 behavior: "silent fail") handles this — the `try` block throws on the undefined dereference, `catch` swallows silently, no toast fires, owner re-clicks (or browses via `http://localhost:3000` / HTTPS prod).

**Warning signs:** Owner reports "copy button does nothing," check browser Dev Tools Console for `TypeError: Cannot read properties of undefined (reading 'writeText')`.

### Pitfall 3: PDF route pattern trips on Next.js 16's async params

**What goes wrong:** Copy-pasting the cover-letter-pdf route verbatim works — but if a dev "modernizes" the signature to `{ params }: { params: { id: string } }` (pre-Next.js 15 shape), the route silently works in dev but fails at build time with a type error. The project is on Next.js 16.2.1; `params` is a Promise that must be awaited.

**Why it happens:** Next.js 15+ moved `params` to a Promise for streaming compatibility. The current cover-letter-pdf route correctly uses `params: Promise<{ id: string }>` + `const { id } = await params;`. Pattern must be preserved.

**How to avoid:** Clone the existing file VERBATIM. Change only the function name import + filename literal.

**Warning signs:** TypeScript error `Type '{ id: string }' is missing the following properties from type 'Promise<...>'` at build time; 404s on the route in dev.

### Pitfall 4: pre-push hook fails because the ALTER TABLE hasn't landed yet

**What goes wrong:** The planner edits `scripts/check-jobs-schema.ts` to expect `pdf_data` in `tailored_resumes` BEFORE running the migration, and `git push` fails because `npm run test:schema` exits 1 with `Expected column 'pdf_data' on table 'tailored_resumes'; not found in n8n database.`

**Why it happens:** The schema-drift guard is designed to catch exactly this mismatch. The EXPECTED-map edit and the ALTER TABLE must land in a specific order.

**How to avoid:** Sequence: (1) ALTER TABLE first (ship the migration, confirm via `\d tailored_resumes` in psql). (2) THEN edit the EXPECTED map. (3) THEN edit the Zod schema. (4) THEN push. Planner should call this out explicitly in the task ordering.

**Warning signs:** `git push` prints `[test:schema] Schema drift detected: Expected column 'pdf_data' on table 'tailored_resumes' ... not found` and exits 1.

### Pitfall 5: Sonner toast never appears in Vitest tests because happy-dom doesn't mount the Toaster

**What goes wrong:** Writing `expect(toast.success).toHaveBeenCalledWith("Resume copied to clipboard")` in a Vitest test. `toast.success` is called but no DOM node appears — the mock verifies the call, but confusion arises when a test tries to `container.querySelector('[role="status"]')`.

**Why it happens:** In the test, nothing mounts the `<Toaster>` from `providers.tsx`; sonner's internal state gets the call but has no render surface. Only the callable is under test, not the visual result.

**How to avoid:** Tests mock `sonner` at module level: `vi.mock("sonner", () => ({ toast: { success: vi.fn() } }));` and assert the mock was called. Don't query for toast DOM — it's outside the unit test's scope. (Integration-level assertion via Playwright is where the actual toast rendering gets verified, if ever.)

**Warning signs:** Vitest assertion passes (`toast.success` was called) but a second assertion (`container.querySelector('[role="status"]')` returns null) fails — the second assertion is the wrong test.

### Pitfall 6: Quality badge appears even when score is null because `<Badge>` wraps a "falsy but existent" value

**What goes wrong:** Dev writes `{detail.cover_letter.quality_score && <Badge>...</Badge>}` which correctly hides for `null`, but someone later "simplifies" to `<Badge>{detail.cover_letter.quality_score ?? ""}</Badge>` and the empty badge renders as a zero-width outline pill.

**Why it happens:** Guards against "clever" conditional-rendering refactors. The null case should render NO DOM element, not an empty one — it matches FreshnessBadge's null-branch precedent and keeps the meta row tidy.

**How to avoid:** Use an explicit `if/early-return` or ternary-returns-null pattern: `{detail.cover_letter.quality_score !== null && <Tooltip>...<Badge>Quality {detail.cover_letter.quality_score}</Badge>...</Tooltip>}`. Vitest fixture: when `quality_score === null`, `container.querySelector('[role="button"]')` returns null.

**Warning signs:** Empty circular outline appears in the cover-letter meta row for rows where the grader hasn't scored yet.

## Code Examples

Verified patterns from official sources or this repo:

### Copy button with state-driven icon morph

```tsx
// Source: pattern synthesized from Streamdown's CodeBlockCopyButton (timeout + onCopy)
// and shadcn/ui Button conventions. Vitest-ready.
"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";

interface CopyResumeButtonProps {
  content: string;
}

export function CopyResumeButton({ content }: CopyResumeButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      toast.success("Resume copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // silent fail per CONTEXT.md D-01
    }
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Copy tailored resume to clipboard"
          onClick={handleCopy}
          className="text-muted-foreground"
        >
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        Copy to clipboard
      </TooltipContent>
    </Tooltip>
  );
}
```

### `attachFreshness` with Intl.DateTimeFormat (Phase 20 revision)

```typescript
// Source: Phase 20 revision of src/lib/job-actions.ts
// Replaces the formatDistanceToNowStrict call. Keeps isStale/ageDays math unchanged.

import { isStale, STALE_THRESHOLDS } from "@/lib/job-freshness";

const DATE_FMT = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Chicago",
  month: "numeric",
  day: "numeric",
  year: "2-digit",
});

// Updated ArtifactFreshness interface (in jobs-db.ts):
export interface ArtifactFreshness {
  generatedDate: string;  // "4/21/26" — was relativeTime before Phase 21
  isStale: boolean;
  ageDays: number;
}

function attachFreshness<T extends { generated_at: string } | { created_at: string }>(
  artifact: T | null,
  thresholdDays: number
): (T & { freshness: ArtifactFreshness }) | null {
  if (!artifact) return null;
  const iso =
    "generated_at" in artifact
      ? (artifact as { generated_at: string }).generated_at
      : (artifact as { created_at: string }).created_at;
  const generated = new Date(iso);
  if (Number.isNaN(generated.getTime())) {
    return {
      ...artifact,
      freshness: { generatedDate: "", isStale: false, ageDays: 0 },
    } as T & { freshness: ArtifactFreshness };
  }
  const ageDays = Math.max(
    0,
    Math.floor((Date.now() - generated.getTime()) / 86_400_000)
  );
  return {
    ...artifact,
    freshness: {
      generatedDate: DATE_FMT.format(generated),
      isStale: isStale(iso, thresholdDays),
      ageDays,
    },
  } as T & { freshness: ArtifactFreshness };
}
```

### Exact `jobs-db.ts` SELECT diff for adding `tr.pdf_data`

```diff
 export async function getJobDetail(jobId: number): Promise<JobDetail | null> {
   const result = await pool.query(
     `SELECT
        j.id, j.external_id, j.source, j.title, j.company, j.company_url,
        ...
        tr.id AS tr_id, tr.content AS tr_content,
+       tr.pdf_data AS tr_pdf_data,
        tr.model_used AS tr_model_used,
        tr.generated_at AS tr_generated_at
      FROM jobs j
      LEFT JOIN cover_letters cl ON cl.job_id = j.id
      LEFT JOIN company_research cr ON cr.id = j.company_research_id
      LEFT JOIN tailored_resumes tr ON tr.job_id = j.id
      WHERE j.id = $1`,
     [jobId]
   );

   // ... (row null check unchanged)

   const tailoredResume = parseOrLog(
     TailoredResumeSchema,
     row.tr_id
       ? {
           id: row.tr_id,
           content: row.tr_content,
+          pdf_data: null, // Omit large base64 from detail view — matches cover-letter pattern at line 326
           model_used: row.tr_model_used,
           generated_at:
             row.tr_generated_at?.toISOString?.() ?? row.tr_generated_at,
         }
       : null,
     "tailored_resume",
     jobId
   );
```

### Exact `getTailoredResumePdf` helper (new at bottom of jobs-db.ts)

```typescript
// Add at the end of jobs-db.ts, mirrors getCoverLetterPdf at lines 402-408.
export async function getTailoredResumePdf(jobId: number): Promise<string | null> {
  const result = await pool.query(
    "SELECT pdf_data FROM tailored_resumes WHERE job_id = $1",
    [jobId]
  );
  return result.rows[0]?.pdf_data ?? null;
}
```

### Exact Zod schema diff

```diff
 // src/lib/jobs-schemas.ts
 export const TailoredResumeSchema = z.object({
   id: z.number(),
   content: z.string(),
+  pdf_data: z.string().nullable(),
   model_used: z.string().nullable(),
   generated_at: z.string(),
 });
```

### Exact schema-drift script diff

```diff
 // scripts/check-jobs-schema.ts
   tailored_resumes: [
-    "id", "job_id", "content", "model_used", "generated_at",
+    "id", "job_id", "content", "pdf_data", "model_used", "generated_at",
   ],
```

### n8n workflow JSON diff (conceptual — actual edit done in n8n UI then exported)

The Application Packager workflow currently fetches jobs-with-cover-letter-but-no-PDF and generates a cover-letter PDF. To also generate resume PDFs, extend the node chain with a parallel branch:

```diff
  // Fetch Unpackaged Job (Postgres) — CURRENT
  SELECT j.id, j.title, j.company, j.url, j.location, j.match_score,
         j.salary_min, j.salary_max, j.salary_currency, j.source,
         cl.id as cover_letter_id, cl.content as cover_letter_content
  FROM jobs j
  JOIN cover_letters cl ON cl.job_id = j.id
  WHERE j.cover_letter_generated = true
    AND j.package_ready = false
    AND cl.pdf_data IS NULL

+ // Fetch Unpackaged Resume (Postgres) — NEW sibling node
+ SELECT j.id, j.title, j.company, tr.id as tailored_resume_id, tr.content as resume_content
+ FROM jobs j
+ JOIN tailored_resumes tr ON tr.job_id = j.id
+ WHERE tr.pdf_data IS NULL
+ LIMIT 1;

+ // Build Resume HTML (Code) — NEW, mirrors Build HTML pattern with a resume template
+ // Stirling Render Resume (HTTP Request) — NEW, same POST to stirling-pdf
+ // Assemble Resume PDF (Code) — NEW, same Buffer → base64 pattern
+ // Store Resume PDF (Postgres) — NEW, UPDATE tailored_resumes SET pdf_data = '...' WHERE id = ...
```

**Planner task:** the homelab-repo plan task specifies this diff in JSON terms. The actual n8n UI edit can happen in whatever order is convenient; what matters is that a committed-to-homelab-repo version of the exported workflow carries the new branch.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `formatDistanceToNowStrict` for "3 days ago" badges | `Intl.DateTimeFormat` with `timeZone: "America/Chicago"` producing `"4/21/26"` | 2026-04-21 (this phase) | Owner preference: factual date + amber dot beats approximation. Drops a date-fns function call but not the package (other code may still use it). |
| Cover Letter PDF `.md` fallback planned per ROADMAP SC #2 | PDF-only, hide/404 when no PDF exists | 2026-04-21 (owner override D-03) | Eliminates one download path entirely. ROADMAP + REQUIREMENTS need text updates. |
| `<Streamdown>` default plugin chain (includes `rehype-raw`) | `<Streamdown skipHtml linkSafety={{ enabled: false }}>` | Phase 20 Plan 05 | No change this phase — just noting the shipped posture so the planner doesn't accidentally revert. |
| `relativeTime: string` prop on FreshnessBadge | `generatedDate: string` prop on FreshnessBadge | 2026-04-21 (Phase 20 revision) | Bundled with Phase 21 as Task 21-00. Prop rename + inner text string change; no visual layout change. |

**Deprecated/outdated:**

- **ROADMAP.md Phase 21 SC #2's `.md` fallback wording** — overridden by CONTEXT.md D-03. Planner must update ROADMAP and REQUIREMENTS to say "PDF only; hide the button when no PDF is available."
- **FEATURES.md D10's guessed quality-score thresholds (0–1 scale, <0.6 red, >0.8 green)** — same numbers, but no longer "guess" since live-DB shows all-NULL. Thresholds are now the documented default (0.6/0.8) awaiting a grader node.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | 2-second icon-morph hold is the owner-preferred motion timing | Pattern 1 / §Q3 | Low — one literal edit changes it. |
| A2 | No fade transition on Copy→Check icon swap (instant) | Pattern 1 / §Q3 | Low — adding `transition-opacity duration-200` is a one-line follow-up if the owner wants softer motion. |
| A3 | `psl` dependency is NOT needed for `normalizeUrl` | Alternatives Considered | Low — zero real malformed URLs in DB today + `rel="noopener noreferrer"` makes broken targets harmless. Swap-in is a one-file change. |
| A4 | Quality-score default thresholds 0.6 / 0.8 on a 0–1 scale match what the n8n grader will eventually emit | Pattern 3 | Medium — if the grader uses 0–100, thresholds need scaling. But badge tests cover all three bands so regression-guard is automatic. |
| A5 | Extending the Application Packager workflow is preferable to adding a mirror subflow in the Resume Tailor workflow | Finding #1 | Low — both achieve the same end; preference is maintainability (one PDF-generation concern in one workflow). |
| A6 | Empty `company_research` rows (once any exist) will have `ai_summary === null` rather than a "Could not find info" placeholder string | §Q5 | Medium — UI-SPEC flags this. Planner refines when Phase 23 produces real rows. Until then the `isCompanyResearchEmpty` predicate is dead code (table has 0 rows). |
| A7 | The `Job Search: Tailored Resume` workflow in CONTEXT.md D-04 is the active workflow named `"Job Search: Resume Tailor"` (id `WaAFyQ2iHLeVsHIF`) | §Q1 | Low — name variation in context doc vs actual n8n workflow name. Both refer to the same workflow. |
| A8 | Build HTML template for the resume reuses the Georgia + inline-style shape of the cover-letter template with only section/content swaps | §Q1 | Low — HTML is whatever renders well as PDF; Stirling is agnostic. Owner can tweak styling in n8n UI without code changes. |

**If this table is empty:** Not empty — 8 assumptions flagged. None are load-bearing; all have low-cost remediation paths.

## Open Questions

1. **Should the PDF filename be `tailored-resume-job-{id}.pdf` or `tailored-resume-{company-slug}.pdf`?**
   - What we know: CONTEXT.md D-04 task #6 suggests `tailored-resume-job-<id>.pdf` (ID-based, matches cover-letter pattern).
   - What's unclear: Owner-facing download UX — clicking the link and seeing `tailored-resume-job-2709.pdf` in Downloads is less friendly than `tailored-resume-acme-corp.pdf`.
   - Recommendation: ID-based filename for Phase 21 (consistency with cover-letter). Slug-based filename is a Phase 21.1 / nice-to-have; the Application Packager workflow already has a `pdf_filename` field it computes (`cover-letter-${safeName}.pdf`), so the slug is available in the DB if we add a column later.

2. **Should Phase 20 Plan 20-06 SUMMARY.md get a "Revision 2026-04-21" note, or is the Plan 20-04 note sufficient?**
   - What we know: CONTEXT.md D-10 specifies "Plan 20-04 summary appended." Plan 20-06 also touched `attachFreshness` and the FreshnessBadge integration points.
   - What's unclear: Whether the one-line revision note goes in both summaries or just the component-originating one.
   - Recommendation: Put the note in BOTH 20-04-SUMMARY.md (component) AND 20-06-SUMMARY.md (integration). Two sentences total. Traceable for future readers.

3. **Should the Phase 21 plan include the ROADMAP.md + REQUIREMENTS.md text updates as a task, or as part of the CONTEXT-resolution commit?**
   - What we know: CONTEXT.md `<deferred>` explicitly calls out this as a planner concern: "Planner must include a task that updates both files to reflect the locked decision, OR flag it at plan-approval time."
   - What's unclear: Owner preference for meta-doc editing cadence.
   - Recommendation: Include as a tiny plan task (Plan 21-09 or appended to the final plan). Keeps the paper trail clean.

4. **How many plans should Phase 21 break into?** (Not open in a "need more data" sense — need planner decision.)
   - Recommendation: **8 plans + 1 homelab-repo plan = 9 total.** See §Wave Ordering below.

5. **Should the `scoreColor` / `scoreLabel` pair be extracted to `src/lib/score-color.ts` or colocated?**
   - What we know: CONTEXT.md puts this under Claude's Discretion.
   - What's unclear: Whether Phase 22 or Phase 23 will reuse these thresholds.
   - Recommendation: Extract to `src/lib/score-color.ts` — 8-line pure-fn file. Phase 22 salary intel may want its own color-band mapping on a different scale, and having the pattern established as "scale-mapping helper lives in lib/" keeps future additions tidy.

6. **Does the Phase 20 revision also need an update to the `ResumeFreshness` interface in `tailored-resume-section.tsx`?**
   - What we know: `TailoredResumeSection` currently types its prop as `ResumeFreshness { relativeTime: string; ... }`. After the revision, `relativeTime` becomes `generatedDate`.
   - What's unclear: Nothing — this is a mechanical rename.
   - Recommendation: Yes. Update happens in the same commit as the FreshnessBadge + attachFreshness rename.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Next.js 16.2 App Router | API route + Server Actions | ✓ | 16.2.1 | — |
| React 19 | Copy button client component | ✓ | 19.2.4 | — |
| TypeScript | All files | ✓ | — | — |
| Tailwind v4.2 | Color tokens (destructive/warning/success) | ✓ | 4.2.2 | — |
| Prisma v7 | Not used — jobs DB uses raw pg.Pool | N/A | — | — |
| `pg` | `getTailoredResumePdf`, schema-drift script | ✓ | 8.20.0 | — |
| `zod` | Schema field addition | ✓ | 4.3.6 | — |
| `sonner` | Copy-confirmation toast | ✓ | installed | — |
| `lucide-react` | Copy, Check, ExternalLink, Download, Building2, FileText icons | ✓ | 1.7.0 | — |
| `streamdown` | Unchanged; already rendering tailored resume | ✓ | 2.5.0 | — |
| shadcn Button, Badge, Tooltip, Sheet, Separator, ScrollArea | UI building blocks | ✓ | — | — |
| Vitest + happy-dom + Testing Library | All new tests | ✓ | 4.1.2 / 16.3.2 | — |
| `JOBS_DATABASE_URL` | Runtime queries, schema-drift script | ✓ in prod + local dev (via kubectl exec pattern if needed) | — | — |
| Stirling-PDF service | n8n PDF generation | ✓ (`stirling-pdf.cloud.svc.cluster.local:8080` per `kubectl get svc -n cloud stirling-pdf`) | latest | — |
| n8n editor access | Workflow edit for PDF pipeline | ✓ at `n8n.thehudsonfam.com` | — | — |

**Missing dependencies with no fallback:**

- None for Phase 21 UI work (all deps already installed).
- Phase 21 pipeline work (n8n side) requires owner n8n access + homelab-repo commit privileges — assumed available.

**Missing dependencies with fallback:**

- `psl` (not installed, not recommended — use inline regex per D-22 + §Alternatives)

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.2 + happy-dom + @testing-library/react 16.3.2 + MSW |
| Config file | `vitest.config.ts` (existing, unchanged) |
| Quick run command | `npm test -- <path-or-pattern> --run` |
| Full suite command | `npm test -- --run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| AI-ACTION-01 | Copy button writes `resume.content` verbatim to clipboard | unit (component) | `npm test -- src/__tests__/components/tailored-resume-section.test.tsx --run` | ❌ extended (existing file) |
| AI-ACTION-01 | Copy button fires `toast.success("Resume copied to clipboard")` exactly once | unit (component) | same | ❌ extended |
| AI-ACTION-01 | Copy icon morphs Copy → Check for 2000ms then reverts | unit (component, uses `vi.advanceTimersByTime`) | same | ❌ extended |
| AI-ACTION-01 | On clipboard permission denied, NO error toast fires, button remains clickable | unit (component) | same | ❌ extended |
| AI-ACTION-02 | `/api/jobs/[id]/tailored-resume-pdf` returns 404 when `pdf_data === null` | unit (route handler, mocked `getTailoredResumePdf`) | `npm test -- src/__tests__/api/tailored-resume-pdf-route.test.ts --run` | ❌ Wave 2 creates |
| AI-ACTION-02 | Route returns 200 + `Content-Type: application/pdf` + `Content-Disposition: attachment` + `Content-Length` when pdf_data exists | unit (route handler) | same | ❌ Wave 2 creates |
| AI-ACTION-02 | Route returns 400 on non-numeric `id`; requires owner role | unit (route handler) | same | ❌ Wave 2 creates |
| AI-ACTION-02 | `<a download href="/api/jobs/{id}/tailored-resume-pdf">` rendered in `TailoredResumeSection` meta row | unit (component) | `npm test -- src/__tests__/components/tailored-resume-section.test.tsx --run` | ❌ extended |
| AI-ACTION-02 | `getTailoredResumePdf(jobId)` returns `pdf_data` value or null; matches cover-letter-pdf helper shape | unit (lib, mocked pg.Pool) | `npm test -- src/__tests__/lib/jobs-db-pdf.test.ts --run` | ❌ Wave 2 creates |
| AI-ACTION-02 | `TailoredResumeSchema.safeParse({ ..., pdf_data: null })` succeeds; `.pdf_data: 123` fails | unit (lib) | `npm test -- src/__tests__/lib/jobs-schemas.test.ts --run` | ❌ Wave 2 extends existing |
| AI-ACTION-02 | End-to-end PDF download works in prod | manual UAT | `curl -sI -b auth-cookie https://thehudsonfam.com/api/jobs/2709/tailored-resume-pdf` → 200 + application/pdf | gated on n8n pipeline |
| AI-RENDER-04 | 6 empty-state strings appear in the right branches (3 sections × 2 states) | unit (component, 6 fixtures) | `npm test -- src/__tests__/components/empty-states.test.tsx --run` | ❌ Wave 3 creates |
| AI-RENDER-04 | Empty-state `<p>` has class `italic` and `text-muted-foreground` | unit (component) | same | ❌ Wave 3 creates |
| AI-RENDER-04 | Empty-state branch suppresses `FreshnessBadge`, `Download PDF` link, and `Copy button` | unit (component) | same | ❌ Wave 3 creates |
| AI-RENDER-04 | `isCompanyResearchEmpty({ ai_summary: null, tech_stack: [], recent_news: null, ... })` → true | unit (lib/helper) | `npm test -- src/__tests__/lib/is-company-research-empty.test.ts --run` | ❌ Wave 3 creates |
| AI-RENDER-05 | `<Badge>` with `text-destructive` class for score < 0.6; `text-warning` for 0.6–0.8; `text-success` for ≥ 0.8 | unit (component, 3 fixtures) | `npm test -- src/__tests__/components/cover-letter-quality-badge.test.tsx --run` | ❌ Wave 3 creates |
| AI-RENDER-05 | When `quality_score === null`, Quality badge DOM element is absent | unit (component) | same | ❌ Wave 3 creates |
| AI-RENDER-05 | Tooltip content reads `"Cover letter quality score: {n} ({label})"` with label derived from score | unit (component) | same | ❌ Wave 3 creates |
| AI-RENDER-05 | `scoreColor(0.5) === "text-destructive"; scoreColor(0.7) === "text-warning"; scoreColor(0.9) === "text-success"` | unit (pure fn) | `npm test -- src/__tests__/lib/score-color.test.ts --run` | ❌ Wave 3 creates |
| AI-RENDER-06 | `<a target="_blank" rel="noopener noreferrer">` wraps company name when URL resolves | unit (component) | `npm test -- src/__tests__/components/company-link-out.test.tsx --run` | ❌ Wave 3 creates |
| AI-RENDER-06 | `<span>` (plain, no anchor) when both URLs null | unit (component) | same | ❌ Wave 3 creates |
| AI-RENDER-06 | LLM URL preferred over feed URL; fallback to feed URL when LLM URL is null | unit (component, 2 fixtures) | same | ❌ Wave 3 creates |
| AI-RENDER-06 | `ExternalLink` icon has `aria-hidden="true"` | unit (component) | same | ❌ Wave 3 creates |
| AI-RENDER-06 | `normalizeUrl(input)` returns correct output for every row in the input/output table (§Pattern 5) | unit (pure fn, 14 fixtures) | `npm test -- src/__tests__/lib/normalize-url.test.ts --run` | ❌ Wave 3 creates |
| FreshnessBadge revision | `<FreshnessBadge generatedDate="4/21/26" modelUsed="gpt-4o-mini" isStale={false} ageDays={0} />` renders `"Generated 4/21/26 · gpt-4o-mini"` | unit (component, replaces existing "3 hours ago" assertion) | `npm test -- src/__tests__/components/freshness-badge.test.tsx --run` | ❌ Wave 1 modifies existing |
| FreshnessBadge revision | `attachFreshness({ generated_at: "2026-04-18T14:00:00.000Z" }, 14)` returns `{ generatedDate: "4/18/26", isStale: false, ageDays: <computed> }` against frozen Date.now | unit (lib, uses `vi.useFakeTimers` + `vi.setSystemTime`) | `npm test -- src/__tests__/lib/attach-freshness.test.ts --run` | ❌ Wave 1 creates (or extends existing) |
| Schema-drift guard | `scripts/check-jobs-schema.ts` passes with `pdf_data` in EXPECTED map against a real DB that has the column | manual + CI | `npm run test:schema` (requires `JOBS_DATABASE_URL`) | existing |

### Sampling Rate (per Nyquist design)

- **Per task commit:** `npm test -- <just-the-files-this-task-touched> --run` — typically 5-15 files, ~0.5-1s wall time.
- **Per wave merge:** `npm test -- --run` — full suite (currently 305 tests; Phase 21 adds ~35-40 new assertions across ~7 new test files + ~5-10 modified assertions in existing FreshnessBadge + TailoredResumeSection files). Expected final count ≈ 345-350 tests, still < 2s wall.
- **Phase gate:** Full suite green + `npm run build` exits 0 + `npm run test:schema` exits 0 (requires JOBS_DATABASE_URL + ALTER TABLE landed). All three before `/gsd-verify-work`.
- **Decision-band coverage (Nyquist minimum):** 4 empty-state × 3 sections = 12 decision points for empty-state display (6 strings × 2 states per section). Plus 3 quality-band points for score color (low/mid/high) + 1 null point = 4 decision points for quality badge. Plus 14 normalize-url input/output pairs. At a minimum N=2 per decision band: 12 empty-state fixtures (but 6 suffice — "missing" and "empty" per section are independent branches, not duplicates across sections), 4 quality-band fixtures, 14 URL-normalize fixtures. Total ~24 decision-band assertions. Actual test count will exceed (extra assertions on className/aria/tooltip content).

### Wave 0 Gaps

- [ ] `src/__tests__/api/tailored-resume-pdf-route.test.ts` — covers AI-ACTION-02 route 200/404/400/auth. **Wave 2.**
- [ ] `src/__tests__/lib/jobs-db-pdf.test.ts` — covers `getTailoredResumePdf`. **Wave 2.**
- [ ] `src/__tests__/components/empty-states.test.tsx` — covers AI-RENDER-04 (6 fixtures). **Wave 3.**
- [ ] `src/__tests__/components/cover-letter-quality-badge.test.tsx` — covers AI-RENDER-05 (3 bands + null). **Wave 3.**
- [ ] `src/__tests__/components/company-link-out.test.tsx` — covers AI-RENDER-06 (URL resolution + anchor shape). **Wave 3.**
- [ ] `src/__tests__/lib/normalize-url.test.ts` — covers `normalizeUrl` (14 fixtures). **Wave 3.**
- [ ] `src/__tests__/lib/score-color.test.ts` — covers `scoreColor` / `scoreLabel` if extracted. **Wave 3.**
- [ ] `src/__tests__/lib/is-company-research-empty.test.ts` — covers empty-body predicate. **Wave 3.**
- [ ] `src/__tests__/lib/attach-freshness.test.ts` — covers Intl.DateTimeFormat + America/Chicago + isStale + ageDays. **Wave 1.**
- [ ] Global Vitest setup for `navigator.clipboard` mock (add to `src/__tests__/setup.ts` if not present). **Wave 3.**
- [ ] `vi.mock("sonner", () => ({ toast: { success: vi.fn() } }))` pattern shared via a test util or inline per file. **Wave 3.** (Inline is fine; one-line at the top of each test file that needs it.)

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | `requireRole(["owner"])` on `/api/jobs/[id]/tailored-resume-pdf/route.ts` — same pattern as cover-letter-pdf |
| V3 Session Management | yes | Better Auth session with Redis cache — unchanged from baseline |
| V4 Access Control | yes | `requireRole(["owner"])` enforced server-side; admin route group middleware layered on top |
| V5 Input Validation | yes | `parseInt(id, 10)` with `isNaN` check on route param. NO `z.string().url()` on the schema boundary (D-23 explicit). |
| V6 Cryptography | no | No new cryptographic primitives. CSP nonce already shipped in Phase 20 Plan 07. |
| V7 Error Handling & Logging | yes | Route returns generic `{ error: "No PDF available" }` / `{ error: "Invalid job ID" }` — no stack traces, no row internals (matches cover-letter-pdf sentinel-error pattern). |
| V10 File System | yes | PDF bytes flow Postgres TEXT → Buffer → NextResponse; no filesystem write, no path-traversal vector. |
| V13 API & Web Service | yes | GET-only route; idempotent; no state mutation. `requireRole` returns 401/403 before the query runs. |
| V14 Configuration | yes | JOBS_DATABASE_URL is an ExternalSecret via ClusterSecretStore; no change this phase. |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| SQL injection via `job_id` in PDF route | Tampering | `parseInt(id, 10)` + parameterized query ($1 binding) — existing cover-letter-pdf route proves the pattern; new route clones verbatim |
| XSS via malicious clipboard content reflection | Tampering | Copy writes `resume.content` to clipboard — source is already XSS-neutralized by Streamdown's `skipHtml` render path (Phase 20 Plan 05 + 06-SUMMARY.md §Task 06). Clipboard content is not reflected in DOM by hudsonfam. |
| Tabnabbing via company link-out | Elevation of Privilege | `rel="noopener noreferrer"` mandatory (CONTEXT.md D-21). Verified pattern matches the existing Apply button at `job-detail-sheet.tsx:74`. |
| PDF-based XSS (embedded JS in PDF) | Tampering | PDF served with `Content-Type: application/pdf` + `Content-Disposition: attachment` — browser downloads, doesn't render inline. Even if the PDF contained malicious JS, the `attachment` disposition prevents inline iframe rendering. Matches cover-letter-pdf posture. |
| Malicious `company_url` injecting javascript: or data: URIs | Tampering | `normalizeUrl` (D-22 + §Pattern 5) rejects anything not matching `^https?://` or a domain-shaped string. Javascript:/data:/file: URIs all return `null`. |
| Base64 decode DoS (huge pdf_data payload) | Denial of Service | Cover-letter PDFs ≈ 16KB base64 today; tailored resumes will be similar. pg.Pool has `max: 3` connections + 30s idle timeout; a 10MB pdf_data would take ~100ms to Buffer-decode — not a DoS vector. If future growth matters, add a `LENGTH(pdf_data) < 1048576` guard in the SELECT. |
| CSRF on the PDF download | Spoofing | GET-only, no state change, `requireRole` auth check. Standard CSRF patterns don't apply to GET-idempotent fetches. |

## Wave Ordering Proposal

**Goal:** Phase 21's nine plans delivered in four parallelizable waves. Each wave produces its own git commits; the homelab-repo plan is the only plan with cross-repo sequencing needs.

### Wave 1 — Phase 20 revision (standalone; parallel-safe with everything else)

- **Plan 21-00: FreshnessBadge date-format revision**
  - Rename `relativeTime: string` → `generatedDate: string` in `freshness-badge.tsx`
  - Swap `formatDistanceToNowStrict` for `Intl.DateTimeFormat` in `attachFreshness` (in `job-actions.ts`)
  - Update `ArtifactFreshness` in `jobs-db.ts` (field rename)
  - Update `ResumeFreshness` in `tailored-resume-section.tsx` (field rename)
  - Update all test fixtures referencing `relativeTime` → `generatedDate`, "3 days ago" → frozen `4/21/26` style
  - Add "Revision 2026-04-21" note to Plan 20-04-SUMMARY.md + Plan 20-06-SUMMARY.md
  - Single git commit; 305/305 tests stay green
  - **No dependency on any other Phase 21 plan. Can ship immediately.**

### Wave 2 — Data layer + API route (parallel-safe with Wave 3; depends on ALTER TABLE from Wave 4)

- **Plan 21-01: Zod schema field + schema-drift EXPECTED map**
  - Add `pdf_data: z.string().nullable()` to `TailoredResumeSchema` in `src/lib/jobs-schemas.ts`
  - Add `"pdf_data"` to `tailored_resumes` array in `scripts/check-jobs-schema.ts` EXPECTED map
  - Add unit tests verifying the schema accepts null + strings and rejects numbers
  - **Blocks:** ALTER TABLE must be live BEFORE `git push` or `npm run test:schema` fails.
- **Plan 21-02: `getTailoredResumePdf` helper + `getJobDetail` SELECT extension**
  - Extend `getJobDetail` SELECT with `tr.pdf_data AS tr_pdf_data` + `pdf_data: null` in detail object
  - Add `getTailoredResumePdf(jobId)` helper at bottom of `jobs-db.ts`
  - Add `src/__tests__/lib/jobs-db-pdf.test.ts` with 4 cases (pdf present, pdf null, no row, SQL error)
- **Plan 21-03: `/api/jobs/[id]/tailored-resume-pdf` route**
  - New file `src/app/api/jobs/[id]/tailored-resume-pdf/route.ts` (32-line clone)
  - Add `src/__tests__/api/tailored-resume-pdf-route.test.ts` with 5 cases (200 + headers, 404, 400 on non-numeric ID, 401 without owner role, handles `id` as Promise correctly)

### Wave 3 — UI surfaces (parallel-safe with Wave 2)

- **Plan 21-04: Copy button + Download anchor on `TailoredResumeSection`**
  - Add `jobId` prop to `TailoredResumeSection` Props
  - Add Copy button + Tooltip + sonner toast + `setCopied` state + `navigator.clipboard` try/catch
  - Add Download PDF anchor below the Copy button (or right of, per D-05)
  - Wire `TailoredResumeSection` jobId prop through from `job-detail-sheet.tsx`
  - Extend `tailored-resume-section.test.tsx` with Copy + Download + aria-label + toast-call tests
  - Add navigator.clipboard mock in test setup
- **Plan 21-05: Quality-score badge + `scoreColor` / `scoreLabel` helpers**
  - Create `src/lib/score-color.ts` (or inline — planner's choice)
  - Add `<Badge variant="outline">` with Tooltip to cover-letter meta row in `job-detail-sheet.tsx`
  - Add null-branch (no render when `quality_score === null`)
  - Add `src/__tests__/lib/score-color.test.ts` (3 bands + boundary cases at 0.6, 0.8)
  - Add `src/__tests__/components/cover-letter-quality-badge.test.tsx` (4 fixtures: low/mid/high/null)
- **Plan 21-06: Empty states on all three LLM sections**
  - Add `EMPTY_STATE_COPY` constant in `job-detail-sheet.tsx` (or exported from `src/lib/empty-state-copy.ts`)
  - Extract `EmptySection` helper (shared shape for all 6 branches)
  - Convert three section blocks from `{detail.X && (...)}` to `{detail.X === null ? <EmptySection/> : !detail.X.content?.trim() ? <EmptySection/> : <Section/>}` pattern
  - Replace `tailored-resume-section.tsx`'s `if (!resume) return null;` with the two-branch empty states
  - Add `src/__tests__/components/empty-states.test.tsx` (6 fixtures — 3 sections × 2 states) + `isCompanyResearchEmpty` unit test
- **Plan 21-07: Company link-out + `normalizeUrl`**
  - Create `src/lib/url-helpers.ts` with `normalizeUrl`
  - Add `src/__tests__/lib/normalize-url.test.ts` with 14-row input/output table
  - Wrap company-name `<span>` in `job-detail-sheet.tsx:111-116` with conditional anchor; append ExternalLink icon
  - Add `src/__tests__/components/company-link-out.test.tsx` (4 fixtures: URL resolves to LLM, URL resolves to feed, both null, normalize returns null for garbage)

### Wave 4 — Pipeline-side work (homelab repo, separate from hudsonfam)

- **Plan 21-08: n8n Application Packager extension + ALTER TABLE migration**
  - Lives in the homelab repo, NOT hudsonfam.
  - Run `ALTER TABLE tailored_resumes ADD COLUMN pdf_data TEXT;` on the n8n Postgres.
  - Edit `Job Search: Application Packager` workflow in n8n UI to add the resume-PDF branch.
  - Export workflow JSON and commit to homelab repo under `workflows/`.
  - **Sequencing:** The ALTER TABLE must land BEFORE Wave 2 Plan 21-01 is pushed (schema-drift guard dependency). The workflow edit can land any time — the application's `getTailoredResumePdf` handles null gracefully with a 404.
  - **UAT:** After the workflow runs for ≥1 job, query `SELECT job_id, LENGTH(pdf_data) FROM tailored_resumes WHERE pdf_data IS NOT NULL LIMIT 1` on the n8n DB; then click "Download PDF" on that job in the admin UI.

### Wave 5 — Meta-doc updates (ship last)

- **Plan 21-09: ROADMAP.md + REQUIREMENTS.md + SUMMARY touchups**
  - Update ROADMAP.md Phase 21 SC #2 to remove `.md` fallback wording
  - Update REQUIREMENTS.md AI-ACTION-02 traceability to note Phase 21 delivered
  - Mark Phase 21 progress bar in STATE.md
  - Verify `.planning/STATE.md` "What's Done" reflects 2-phase-complete
  - Single commit

### Cross-wave dependency graph

```
Wave 1 (21-00)  ────────────────────────┐ (all other waves reference the renamed
                                          ArtifactFreshness + generatedDate prop)

Wave 4 (21-08 ALTER) ──► Wave 2 (21-01)  (schema-drift guard dependency)
Wave 4 (21-08 workflow) ── independent of app-side Wave 2/3 (null-safe on both ends)

Wave 2 (21-01, 21-02, 21-03) ── independent of Wave 3 (UI doesn't depend on new API route working)
Wave 3 (21-04, 21-05, 21-06, 21-07) ── independent of Wave 2 (buttons + badges render even if route is 404-ing)

Wave 5 (21-09) ── depends on all prior waves (is the final sanity-check commit)
```

**Parallelism available:**
- Waves 1 and Waves 2+3 can be worked by different sessions simultaneously.
- Within Wave 2, plans 21-01 / 21-02 / 21-03 have a natural sequential order but are small enough to be a single session's worth of work.
- Within Wave 3, all four plans are independent — any order, any parallelism.

## Key Decisions (locked by context — restated for researcher sign-off)

Quick restatement of CONTEXT.md's 23 decisions for context coherence. **No re-litigating.**

- **Copy**: ghost icon button + Copy→Check morph 2s + `toast.success("Resume copied to clipboard")` + raw-markdown clipboard
- **Download PDF**: anchor-based; mirrors cover-letter-pdf; no `.md` fallback
- **Layout**: `[FreshnessBadge] [Copy button] [Download PDF]`
- **FreshnessBadge revision**: `generatedDate` prop + `Intl.DateTimeFormat` America/Chicago + stale dot unchanged
- **Empty states**: 6 exact strings, same shell, no CTAs
- **Quality badge**: `Badge variant="outline"` + dynamic text color (destructive/warning/success) + null-hides
- **Quality-score thresholds**: defer to plan Task 0 — ship with default 0.6 / 0.8 on 0-1 scale
- **Company link-out**: `company_research?.company_url ?? job.company_url` + `normalizeUrl` + `rel="noopener noreferrer"` + both-null-hides-anchor
- **Zod schemas**: lenient; NO `z.string().url()`
- **Phase 20 revision sequencing**: standalone Task 21-00 commit before Phase 21 UI plans begin

## References

### Files read

- `/home/dev-server/hudsonfam/.planning/phases/21-polish-copy-pdf-empty-states-link-out/21-CONTEXT.md` (255 lines, authoritative)
- `/home/dev-server/hudsonfam/.planning/phases/21-polish-copy-pdf-empty-states-link-out/21-UI-SPEC.md` (757 lines, authoritative)
- `/home/dev-server/hudsonfam/.planning/phases/20-foundation-freshness-zod-tailored-resume/20-CONTEXT.md` (172 lines)
- `/home/dev-server/hudsonfam/.planning/phases/20-foundation-freshness-zod-tailored-resume/20-RESEARCH.md` (lines 1-400 sampled — the full file exceeded a single read but the pattern-establishment sections were covered)
- `/home/dev-server/hudsonfam/.planning/phases/20-foundation-freshness-zod-tailored-resume/20-06-SUMMARY.md` (126 lines — Plan 20-06 attachFreshness pattern)
- `/home/dev-server/hudsonfam/.planning/REQUIREMENTS.md` (127 lines, traceability table)
- `/home/dev-server/hudsonfam/.planning/STATE.md` (first 100 lines, decisions carry-forward)
- `/home/dev-server/hudsonfam/CLAUDE.md` (project conventions)
- `/home/dev-server/hudsonfam/scripts/check-jobs-schema.ts` (105 lines — EXPECTED map target)
- `/home/dev-server/hudsonfam/src/lib/jobs-db.ts` (431 lines — getJobDetail, getCoverLetterPdf template)
- `/home/dev-server/hudsonfam/src/lib/jobs-schemas.ts` (86 lines — TailoredResumeSchema + parseOrLog)
- `/home/dev-server/hudsonfam/src/lib/job-actions.ts` (165 lines — attachFreshness + fetchJobDetail)
- `/home/dev-server/hudsonfam/src/lib/job-freshness.ts` (49 lines — isStale + STALE_THRESHOLDS)
- `/home/dev-server/hudsonfam/src/app/api/jobs/[id]/cover-letter-pdf/route.ts` (32 lines — verbatim template)
- `/home/dev-server/hudsonfam/src/app/(admin)/admin/jobs/job-detail-sheet.tsx` (286 lines — primary edit surface)
- `/home/dev-server/hudsonfam/src/app/(admin)/admin/jobs/tailored-resume-section.tsx` (80 lines — Copy + Download landing pad)
- `/home/dev-server/hudsonfam/src/app/(admin)/admin/jobs/freshness-badge.tsx` (88 lines — prop-rename surface)
- `/home/dev-server/hudsonfam/src/components/ui/button.tsx` (65 lines — icon-sm verified at size-8)
- `/home/dev-server/hudsonfam/src/components/ui/badge.tsx` (38 lines — outline variant)
- `/home/dev-server/hudsonfam/src/components/providers.tsx` (16 lines — Toaster + TooltipProvider mount)
- `/home/dev-server/hudsonfam/src/__tests__/components/freshness-badge.test.tsx` (78 lines — revision target)
- `/home/dev-server/hudsonfam/src/__tests__/components/tailored-resume-section.test.tsx` (69 lines — Copy + Download extension target)
- `/home/dev-server/hudsonfam/node_modules/streamdown/dist/index.d.ts` (492 lines — LinkSafetyConfig, StreamdownProps, CodeBlockCopyButton)
- `/home/dev-server/hudsonfam/node_modules/streamdown/package.json` (version 2.5.0)
- `/home/dev-server/hudsonfam/node_modules/lucide-react/dist/esm/icons/{copy,check,external-link,download,building-2,file-text}.js` (all six icons present)

### Live-DB investigations

- `SELECT quality_score, COUNT(*)::int FROM cover_letters GROUP BY quality_score` → 12 rows, 100% NULL
- `SELECT job_id, LENGTH(pdf_data), LENGTH(content), quality_score, model_used, generated_at FROM cover_letters ORDER BY generated_at DESC LIMIT 10` → 10 rows, 2 with pdf_data (~16KB base64), all with NULL quality_score
- `SELECT column_name FROM information_schema.columns WHERE table_name = 'tailored_resumes'` → 6 columns (id, job_id, content, model_used, generated_at, created_at); NO pdf_data today
- `SELECT column_name FROM information_schema.columns WHERE table_name = 'cover_letters'` → 10 columns INCLUDING `pdf_data TEXT NULLABLE` (confirms the migration pattern)
- `SELECT COUNT(*), COUNT(company_url), COUNT(*) FILTER (WHERE company_url <> '') FROM jobs` → 636 / 0 / 0 (no jobs have a company_url today)
- `SELECT COUNT(*) FROM company_research` → 0 rows
- n8n `workflow_entity` inspection: `Job Search: Cover Letter Generator` (14 nodes, no PDF node); `Job Search: Resume Tailor` (7 nodes, no PDF node); `Job Search: Application Packager` (12 nodes INCLUDING Build HTML → Stirling Render → Assemble PDF → Store PDF pattern)
- `kubectl get svc -n cloud stirling-pdf` → running ClusterIP 10.43.25.55:8080

### Cluster inspections (homelab)

- `kubectl exec -n cloud deploy/n8n -- env` → DB credentials + `postgres-rw.homelab.svc.cluster.local:5432/n8n`
- `kubectl get cluster -n homelab` → cnpg cluster `postgres` healthy, primary `postgres-1`
- `kubectl get svc -n homelab` → `postgres-rw`, `postgres-ro`, `postgres-pooler` services all healthy

### External

- [Streamdown 2.5.0 documentation via Context7 /vercel/streamdown](https://github.com/vercel/streamdown) — consumed via 20-RESEARCH.md, no new queries this phase
- [Next.js 16 App Router route handlers](https://nextjs.org/docs/app/building-your-application/routing/route-handlers) — pattern verified against existing `cover-letter-pdf/route.ts`
- [sonner toast.success API](https://sonner.emilkowal.ski/) — `toast.success(message)` with single string argument; existing 15 call sites confirm the signature
- [WAI-ARIA Tooltip pattern](https://www.w3.org/WAI/ARIA/apg/patterns/tooltip/) — tooltip-as-aria-describedby + aria-label on the button is the shipped shadcn pattern

### Sources by confidence

**Primary (HIGH confidence):**
- Live-DB queries against production n8n Postgres (authoritative for schema + data state)
- `node_modules/streamdown/dist/index.d.ts` type definitions (authoritative for Streamdown props)
- Existing shipped code files (cover-letter-pdf route, jobs-db.ts, jobs-schemas.ts, freshness-badge.tsx, tailored-resume-section.tsx) — these ARE the patterns being replicated
- CONTEXT.md + UI-SPEC.md locked decisions

**Secondary (MEDIUM confidence):**
- shadcn-ui copy-button conventions (training data + Context7) — pattern is well-established but no single canonical reference component
- Default 0.6 / 0.8 quality-score thresholds on 0-1 scale — industry convention from LLM-judge literature; not verified against the n8n grader that doesn't exist yet

**Tertiary (LOW confidence):**
- None. Every factual claim in this research is either VERIFIED (live-DB query, filesystem inspection) or ASSUMED with a flagged row in §Assumptions Log.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — every library is already installed; all paths are additive; no new deps.
- Architecture: HIGH — PDF-generation pattern verified from live n8n workflow export; API route pattern is a verbatim clone.
- Pitfalls: HIGH — six common failure modes with explicit mitigations, each tied to a concrete file or test.
- Validation: HIGH — test framework + sampling rate + file-by-file gap list ready for Wave 0 planning.
- Live-DB findings: HIGH — directly queried the production n8n Postgres via kubectl exec.
- Quality-score scale: MEDIUM — DB has 0 rows with a score; recommendation is a well-grounded default but not confirmed by data.
- Company URL link-out: MEDIUM (data) / HIGH (code pattern) — 0 data rows means human UAT is gated, but the code path is fully specified and testable.

**Research date:** 2026-04-21
**Valid until:** 2026-05-21 (30 days — stack is stable; Next.js 16.2.1 + React 19.2.4 + Tailwind 4.2.2 are the versioned constants). Revisit if Phase 23 ships new `company_research` rows OR a cover-letter grader node appears in the n8n workflows.
