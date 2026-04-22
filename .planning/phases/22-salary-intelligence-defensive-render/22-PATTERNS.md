# Phase 22: Salary Intelligence (Defensive Render) — Pattern Map

**Mapped:** 2026-04-22
**Files analyzed:** 14 (3 NEW code, 6 EDIT code, 2 NEW tests, 3 EDIT tests)
**Analogs found:** 14 / 14 (every file has a direct in-repo analog)

---

## Overview — Role Map

| Role | Files |
|------|-------|
| **Client component (new)** | `salary-intelligence-section.tsx`, `provenance-tag.tsx` |
| **Client component (edit)** | `job-detail-sheet.tsx` |
| **Pure lib (new)** | `src/lib/provenance.ts` |
| **Lib (edit — DB boundary)** | `src/lib/jobs-db.ts`, `src/lib/jobs-schemas.ts` |
| **Lib (edit — const map)** | `src/lib/empty-state-copy.ts` |
| **Lib (edit — server helper)** | `src/lib/attach-freshness.ts`, `src/lib/job-actions.ts` |
| **CLI script (edit)** | `scripts/check-jobs-schema.ts` |
| **Vitest (new — pure)** | `src/__tests__/lib/provenance.test.ts` |
| **Vitest (new — component)** | `src/__tests__/components/salary-intelligence-section.test.tsx` |
| **Vitest (edit — schema)** | `src/__tests__/lib/jobs-db-zod.test.ts` |
| **Vitest (edit — empty-states)** | `src/__tests__/components/empty-states.test.tsx` (or new `job-detail-sheet.test.tsx`) |

**Data-flow classification:** every Phase 22 file is `request-response` / `CRUD-read` / `pure-function` — zero streaming, zero event-driven, zero write-side surfaces. The section is read-only; the pipeline produces rows externally via n8n and the UI only reads + renders.

---

## File Classification Table

| File | Role | Data Flow | Closest Analog | Match Quality |
|------|------|-----------|----------------|---------------|
| `src/app/(admin)/admin/jobs/salary-intelligence-section.tsx` | client component | CRUD-read / render | `src/app/(admin)/admin/jobs/tailored-resume-section.tsx` | **exact mirror** |
| `src/app/(admin)/admin/jobs/provenance-tag.tsx` | client component (badge+tooltip wrapper) | render | Plan 21-05 quality-badge inline at `job-detail-sheet.tsx:206-218` | **exact pattern** |
| `src/lib/provenance.ts` | pure helper pair | pure-function | `src/lib/score-color.ts` | **exact mirror** |
| `src/lib/jobs-db.ts` (edit) | DB boundary / pg.Pool query | request-response | existing `getJobDetail` LEFT JOINs at lines 311-315 | **same file extension** |
| `src/lib/jobs-schemas.ts` (edit) | Zod boundary validation | pure-function | existing `TailoredResumeSchema` at lines 46-52 | **exact pattern** |
| `src/lib/empty-state-copy.ts` (edit) | const-map extension | pure-const | existing `tailored_resume` key at lines 20-23 | **exact pattern** |
| `src/lib/attach-freshness.ts` (edit) | server-side date math | pure-function | existing dual-field dispatch at lines 33-37 | **exact pattern** |
| `src/lib/job-actions.ts` (edit) | `"use server"` orchestrator | request-response | existing `attachFreshness<T>(...)` calls at lines 60-71 | **exact pattern** |
| `scripts/check-jobs-schema.ts` (edit) | Node CLI / pre-push gate | batch-read | existing `EXPECTED` map entries lines 18-48 | **exact pattern** |
| `src/__tests__/lib/provenance.test.ts` | pure-function test | pure | `src/__tests__/lib/score-color.test.ts` | **exact mirror** |
| `src/__tests__/components/salary-intelligence-section.test.tsx` | component test | render | `src/__tests__/components/tailored-resume-section.test.tsx` + `empty-states.test.tsx` | **exact pattern** |
| `src/__tests__/lib/jobs-db-zod.test.ts` (edit) | schema fail-open | pure | existing `CoverLetterSchema` fail-open cases lines 30-76 | **exact pattern** |
| `src/__tests__/components/empty-states.test.tsx` (edit) | inline-fixture drift guard | render | existing `CoverLetterEmptyFixture` pattern lines 34-66 | **exact pattern** |
| `src/app/(admin)/admin/jobs/job-detail-sheet.tsx` (edit) | mount site + provenance-tag retrofit | render | existing SectionErrorBoundary wrap at lines 244-260 + Badge+Tooltip quality pattern at lines 206-218 | **same file edit** |

Every analog is in-repo. No file needs to fall back to RESEARCH.md patterns.

---

## Pattern Assignments

### 1. `src/app/(admin)/admin/jobs/salary-intelligence-section.tsx` (NEW — client component)

**Analog:** `src/app/(admin)/admin/jobs/tailored-resume-section.tsx` (Plan 20-05 + Plan 21-06 composite). Exact mirror of the 3-branch shape: `null` → missing copy, populated-but-empty → empty copy, populated → rich render.

**Imports pattern** (analog lines 1-14 — copy verbatim, swap icon/copy key):

```tsx
"use client";

import { useState } from "react";
import { Check, Copy, Download, FileText } from "lucide-react";
import { Streamdown } from "streamdown";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { FreshnessBadge } from "./freshness-badge";
import { EMPTY_STATE_COPY } from "@/lib/empty-state-copy";
```

**Phase 22 delta against the imports:**
- Drop `Check`, `Copy`, `Download`, `toast`, `Button` (no Copy / Download / toast — the section is read-only).
- Swap `FileText` for `DollarSign`.
- Add `ProvenanceTag` from `./provenance-tag` (for the per-figure headline-row tags — D-10 / D-11).
- Add `parseSalaryHeadline` + `formatSingleSalary` (helpers defined in `src/lib/parse-salary-report.ts` and `src/lib/format-salary.ts` — UI-SPEC §1 Headline detection).

**Props view-shape pattern** (analog lines 16-32 — define `SalaryIntelligenceView` with identical cadence):

```ts
export interface ResumeFreshness {
  generatedDate: string;
  isStale: boolean;
  ageDays: number;
}

export interface TailoredResumeView {
  content: string;
  model_used: string | null;
  freshness: ResumeFreshness;
}
```

**Phase 22 equivalent** (UI-SPEC §Component Contracts #1):

```ts
interface SalaryIntelligenceView {
  report_json: unknown;                 // D-01: z.unknown() passthrough
  llm_analysis: string | null;
  freshness: { generatedDate: string; isStale: boolean; ageDays: number };
}

interface Props {
  salary: SalaryIntelligenceView | null; // null → missing branch
}
```

Note: `jobId` prop removed vs analog — no PDF download route / no Copy target this phase, so the id is not needed.

**3-branch empty-state pattern** (analog lines 75-104 — copy verbatim, swap icon + copy-map key):

```tsx
export function TailoredResumeSection({ resume, jobId }: Props) {
  const [copied, setCopied] = useState(false);   // hook hoisted above early returns

  if (resume === null) {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-semibold flex items-center gap-1.5">
          <FileText className="size-4" />
          Tailored Resume
        </h3>
        <p className="text-sm text-muted-foreground italic">
          {EMPTY_STATE_COPY.tailored_resume.missing}
        </p>
      </div>
    );
  }

  if (!resume.content?.trim()) {
    return (/* empty-body branch identical shape */);
  }

  // populated branch
  return (/* rich render */);
}
```

**Phase 22 deltas against the branches:**
- Swap `FileText` → `DollarSign`.
- Swap `"Tailored Resume"` → `"Salary Intelligence"`.
- Swap `EMPTY_STATE_COPY.tailored_resume.*` → `EMPTY_STATE_COPY.salary_intelligence.*`.
- Empty-branch predicate: `!resume.content?.trim()` becomes a two-signal check — `!salary.llm_analysis?.trim() && !hasRecognizedHeadlineFigures(salary.report_json)`. The section is "empty" only when BOTH prose AND headline figures are absent (UI-SPEC §Copywriting Contract — mirrors Plan 21-06 `isCompanyResearchEmpty` conservative posture at `src/lib/is-company-research-empty.ts:25-35`).
- No `useState` needed (no clipboard) — drop the hoisted hook. Keep the early-returns order identical.

**Populated-branch Streamdown block** (analog lines 166-170 — copy verbatim):

```tsx
<div className="text-sm text-muted-foreground bg-card/50 rounded-lg p-4 border border-border max-h-96 overflow-y-auto">
  <Streamdown skipHtml linkSafety={{ enabled: false }}>
    {resume.content}
  </Streamdown>
</div>
```

**Phase 22 delta:** render `salary.llm_analysis` instead of `resume.content`. Streamdown XSS posture is **locked** — `skipHtml` + `linkSafety={{ enabled: false }}` are non-negotiable (see `tailored-resume-xss.test.tsx:37`). An analogous `salary-intelligence-xss.test.tsx` is optional (XSS posture already proven for the shared Streamdown config; Phase 22 inherits).

**Populated-branch meta row** (analog lines 123-134 — copy FreshnessBadge wiring verbatim):

```tsx
<div className="flex items-center justify-between">
  <h3 className="text-sm font-semibold flex items-center gap-1.5">
    <FileText className="size-4" />
    Tailored Resume
  </h3>
  <div className="flex items-center gap-3 flex-wrap">
    <FreshnessBadge
      generatedDate={resume.freshness.generatedDate}
      modelUsed={resume.model_used}
      isStale={resume.freshness.isStale}
      ageDays={resume.freshness.ageDays}
    />
    {/* Copy button + Download anchor DELETED for Phase 22 — no actions */}
  </div>
</div>
```

**Phase 22 delta:** `modelUsed={null}` (no `model_used` column on `salary_intelligence` — identical to Company Intel at `job-detail-sheet.tsx:296`). Drop the Tooltip+Button Copy and the Download anchor.

**New UI element (headline row — zero analog in resume section):** per-figure cluster spec from UI-SPEC §1. This is net-new JSX; no analog excerpt. The wrapping `<span className="inline-flex items-center gap-1">` + `<ProvenanceTag source="llm" />` slot-in inherits the "figure + tag = atomic flex item" posture established by the Plan 21-05 Badge+Tooltip cluster.

---

### 2. `src/app/(admin)/admin/jobs/provenance-tag.tsx` (NEW — client component)

**Analog:** inline Plan 21-05 quality-badge at `src/app/(admin)/admin/jobs/job-detail-sheet.tsx:206-218`. Same `Tooltip > TooltipTrigger asChild > Badge variant="outline"` shape; same dynamic-color via pure helper in className; same `max-w-[220px] text-xs` TooltipContent.

**Analog excerpt** (job-detail-sheet.tsx lines 206-218 — copy structure verbatim, swap labels/helpers):

```tsx
<Tooltip>
  <TooltipTrigger asChild>
    <Badge
      variant="outline"
      className={`text-[11px] ${scoreColor(detail.cover_letter.quality_score)} cursor-default`}
    >
      Quality {detail.cover_letter.quality_score}
    </Badge>
  </TooltipTrigger>
  <TooltipContent side="top" className="text-xs max-w-[220px]">
    Cover letter quality score: {detail.cover_letter.quality_score} ({scoreLabel(detail.cover_letter.quality_score)})
  </TooltipContent>
</Tooltip>
```

**Phase 22 deltas against the analog:**
- `text-[11px]` → `text-[10px]` (D-10 — one size smaller than Plan 21-05 quality badge).
- `scoreColor(...)` → `provenanceColor(source)`.
- Badge children `Quality {...}` → `{provenanceLabel(source)}` (verbatim strings from UI-SPEC §Copywriting Contract table).
- TooltipContent text → a lookup into the `TOOLTIPS: Record<ProvenanceSource, string>` const map (4 verbatim strings from UI-SPEC §Copywriting Contract).
- Wrap in a named exported component `ProvenanceTag({ source, className }: ProvenanceTagProps)` so the pattern is reusable across 3+ call sites in `job-detail-sheet.tsx` (header, Company Intel, headline row).

**Badge+Tooltip import pattern** (analog file, lines 10-12 + 28-31 — copy verbatim):

```tsx
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
```

**Badge shape** (from `src/components/ui/badge.tsx:10-15`):

```tsx
const variantStyles: Record<BadgeVariant, string> = {
  // ...
  outline: "bg-transparent text-muted-foreground border border-border",
};
// Base classes (line 23): "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium tracking-wide"
```

**Phase 22 note:** the Badge's default `text-muted-foreground` is overridden by the className-injected `provenanceColor(source)` via Tailwind merge semantics (last-wins on class conflict — verified in UI-SPEC §Researcher Notes "Stack assumptions verified" bullet 2). Do NOT use `cn()` conditional utilities here — a simple template string with space-joined classes matches the `scoreColor` precedent exactly and avoids drift.

**No `aria-label`:** the visible Badge text IS the accessible name (UI-SPEC §2 Accessibility — "Why no aria-label override"). Matches the Plan 21-05 quality badge exactly (no aria-label there either).

---

### 3. `src/lib/provenance.ts` (NEW — pure helper pair)

**Analog:** `src/lib/score-color.ts` (Plan 21-05). Exact mirror — same file-header-comment style, same pure-function pair (`color` + `label`), same tokens (`text-muted-foreground` / `text-warning` / `text-success`), same "safe from Server + Client Components" posture.

**Analog excerpt** (score-color.ts lines 22-36 — copy verbatim, swap 3 bands → 4-source switch):

```ts
/**
 * Pure functions — no state, no `new Date()`, no `window.*` — safe to
 * call from Server Components and Client Components alike.
 */

export type QualityLabel = "low" | "medium" | "high";

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

**Phase 22 equivalent** (UI-SPEC §Color — mapping and signature already specified):

```ts
export type ProvenanceSource =
  | "scraped"
  | "llm"
  | "company_research"
  | "original_posting";

export function provenanceColor(source: ProvenanceSource): string {
  switch (source) {
    case "company_research":
      return "text-success";
    case "llm":
      return "text-warning";
    case "scraped":
    case "original_posting":
      return "text-muted-foreground";
  }
}

export function provenanceLabel(source: ProvenanceSource): string {
  switch (source) {
    case "scraped":            return "scraped";
    case "llm":                return "LLM estimate";
    case "company_research":   return "company research";
    case "original_posting":   return "posted";
  }
}
```

**Deltas vs analog:**
- Discriminator: numeric bands (`score < 0.6`) → exhaustive `switch` on a string-union type. Use `switch` (not if-chain) so TypeScript exhaustiveness-checks the 4-source union.
- Tokens: same 3 semantic tokens (`text-muted-foreground` / `text-warning` / `text-success`), zero new token introductions — CLAUDE.md §Color System rule honored.
- Order of switch branches mirrors the "color ≈ confidence" ordering from D-10 (high-trust → low-trust).
- Preserve the file-header-comment ("Pure functions — safe from Server + Client Components alike") verbatim; it's a hydration-safety guarantee downstream agents rely on.

---

### 4. `src/lib/jobs-db.ts` (EDIT — extend `getJobDetail` with LEFT JOIN LATERAL)

**Analog:** the existing LEFT JOIN pattern at `jobs-db.ts:311-315` plus the Zod `parseOrLog` wrapper pattern at lines 322-376.

**Existing LEFT JOIN pattern** (analog lines 311-315):

```sql
FROM jobs j
LEFT JOIN cover_letters cl ON cl.job_id = j.id
LEFT JOIN company_research cr ON cr.id = j.company_research_id
LEFT JOIN tailored_resumes tr ON tr.job_id = j.id
WHERE j.id = $1
```

**Phase 22 delta** (CONTEXT.md D-03 + RESEARCH.md §Pattern 2 — LATERAL variant needed because `salary_intelligence` has no `job_id` column; keyed on `search_date` DESC; defensive `FALSE` predicate for Phase 22):

```sql
LEFT JOIN LATERAL (
  SELECT id AS si_id,
         search_date AS si_search_date,
         report_json AS si_report_json,
         raw_results AS si_raw_results,
         llm_analysis AS si_llm_analysis,
         created_at AS si_created_at,
         updated_at AS si_updated_at
  FROM salary_intelligence si
  WHERE FALSE    -- Phase 22 skeleton: zero matches pending n8n task #11 fix.
                 -- When real data lands, tighten to e.g.
                 -- si.report_json->>'company_name' ILIKE j.company
  ORDER BY search_date DESC
  LIMIT 1
) si ON TRUE
```

**Existing `parseOrLog` wrapping pattern** (analog lines 362-376 — copy verbatim, swap schema + prefix):

```ts
const tailoredResume = parseOrLog(
  TailoredResumeSchema,
  row.tr_id
    ? {
        id: row.tr_id,
        content: row.tr_content,
        pdf_data: null, // Omit large base64 from detail view
        model_used: row.tr_model_used,
        generated_at: row.tr_generated_at?.toISOString?.() ?? row.tr_generated_at,
      }
    : null,
  "tailored_resume",
  jobId
);
```

**Phase 22 equivalent** (Plan 20-03 `parseOrLog` extended to salary_intelligence):

```ts
const salaryIntelligence = parseOrLog(
  SalaryIntelligenceSchema,
  row.si_id
    ? {
        id: row.si_id,
        search_date:  row.si_search_date?.toISOString?.() ?? row.si_search_date,
        report_json:  row.si_report_json,      // jsonb — already parsed by pg driver
        raw_results:  row.si_raw_results,
        llm_analysis: row.si_llm_analysis,
        created_at:   row.si_created_at?.toISOString?.() ?? row.si_created_at,
        updated_at:   row.si_updated_at?.toISOString?.() ?? row.si_updated_at,
      }
    : null,
  "salary_intelligence",
  jobId
);
```

**Interface extension** (analog lines 76-90 — follow exact same export cadence):

```ts
// Existing:
export interface TailoredResume {
  id: number;
  content: string;
  pdf_data: string | null;
  model_used: string | null;
  generated_at: string;
}

export interface JobDetail extends Job {
  description: string | null;
  company_url: string | null;
  cover_letter: CoverLetter | null;
  company_research: CompanyResearch | null;
  tailored_resume: TailoredResume | null;
}
```

**Phase 22 equivalent:**

```ts
export interface SalaryIntelligence {
  id: number;
  search_date: string;        // ISO after toISOString()
  report_json: unknown;       // D-01: z.unknown() passthrough
  raw_results: string | null;
  llm_analysis: string | null;
  created_at: string;
  updated_at: string;
}

// Extend JobDetail with the new nested field:
export interface JobDetail extends Job {
  // ...existing fields unchanged...
  salary_intelligence: SalaryIntelligence | null;
}

// FreshJobDetail (lines 104-109) also extends:
export interface FreshJobDetail
  extends Omit<JobDetail, "cover_letter" | "tailored_resume" | "company_research" | "salary_intelligence"> {
  cover_letter:         (CoverLetter & { freshness: ArtifactFreshness }) | null;
  tailored_resume:      (TailoredResume & { freshness: ArtifactFreshness }) | null;
  company_research:     (CompanyResearch & { freshness: ArtifactFreshness }) | null;
  salary_intelligence:  (SalaryIntelligence & { freshness: ArtifactFreshness }) | null;
}
```

**Import-list extension** (analog lines 2-7):

```ts
import {
  CoverLetterSchema,
  CompanyResearchSchema,
  TailoredResumeSchema,
  parseOrLog,
} from "./jobs-schemas";
```

Add `SalaryIntelligenceSchema` to this import list.

**`?? "USD"` removal (D-12):** at analog line 349 — delete the coalesce. The existing line reads:

```ts
salary_currency: row.cr_salary_currency ?? "USD",   // <-- DELETE the ?? "USD"
```

Becomes:

```ts
salary_currency: row.cr_salary_currency,
```

Side effect: `company_research.salary_currency` goes from `string` to `string | null` in both the TS interface AND the `CompanyResearchSchema` (`jobs-schemas.ts:37` — change `z.string()` to `z.string().nullable()`). The two render sites that depend on this (`job-detail-sheet.tsx:321-330` + the new SalaryIntelligenceSection header-figure path) guard on `detail.*.salary_currency` truthiness — detailed in Pattern Assignment #7 below.

---

### 5. `src/lib/jobs-schemas.ts` (EDIT — add `SalaryIntelligenceSchema`)

**Analog:** existing `TailoredResumeSchema` at lines 46-52.

**Analog excerpt:**

```ts
export const TailoredResumeSchema = z.object({
  id: z.number(),
  content: z.string(),
  pdf_data: z.string().nullable(),
  model_used: z.string().nullable(),
  generated_at: z.string(),
});
```

**Phase 22 equivalent** (D-01 — permissive `z.unknown()` for `report_json` pending n8n task #11):

```ts
export const SalaryIntelligenceSchema = z.object({
  id: z.number(),
  search_date: z.string(),          // ISO after toISOString() in jobs-db.ts
  report_json: z.unknown(),         // D-01: loose shape until task #11 stabilizes upstream
  raw_results: z.string().nullable(),
  llm_analysis: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});
```

**Key delta vs analog:** `z.unknown()` for `report_json` (not `z.object({...})` — RESEARCH.md §Anti-Patterns explicitly warns against narrowing before live rows exist; `z.unknown()` is the locked D-01 choice). The `parseSalaryHeadline(reportJson: unknown)` runtime narrow in `src/lib/parse-salary-report.ts` (UI-SPEC §1) does the shape detection at render time — not at the Zod boundary.

**`parseOrLog` extension:** zero code change — existing helper at `jobs-schemas.ts:70-86` is already generic on `z.ZodType<T>` and needs no modification. The salary case plugs into the exact same function signature already proven for cover_letter / company_research / tailored_resume.

**D-12 adjacent edit:** change `CompanyResearchSchema.salary_currency` from `z.string()` (line 37) to `z.string().nullable()` — completes the `?? "USD"` removal cascade. Zero-risk: the empty-state predicate at `is-company-research-empty.ts` already treats this row as "empty" when all salary fields are null.

---

### 6. `src/lib/empty-state-copy.ts` (EDIT — add `salary_intelligence` key)

**Analog:** existing 3 entries at lines 15-28.

**Analog excerpt:**

```ts
export const EMPTY_STATE_COPY = {
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

**Phase 22 delta** — add one more key, preserving the 4th-wall cadence (short factual sentence + one period + no CTA):

```ts
salary_intelligence: {
  missing: "No salary intelligence yet.",
  empty: "Salary intelligence was generated but is empty.",
},
```

Position: after `company_research` (alphabetical-by-pipeline-order, matches the existing file's ordering decision). Keep the `as const` modifier — consumers rely on the narrow readonly type.

**Anti-CTA rule (UI-SPEC §Grep-verifiable G-5):** the strings MUST pass the "no imperative verb, no `!`, exactly one period" grep gate. The proposed copy above passes verbatim (verified against the regex list in Plan 21-06's anti-CTA test).

---

### 7. `src/app/(admin)/admin/jobs/job-detail-sheet.tsx` (EDIT — 3 touchpoints)

#### 7a. New section mount site (between Tailored Resume and Company Intel — UI-SPEC §Integration surface)

**Analog:** existing Tailored Resume mount at lines 244-260.

**Analog excerpt** (lines 243-260 — copy verbatim, swap section name + component + view-shape):

```tsx
<Separator />
<SectionErrorBoundary
  section="tailored_resume"
  jobId={detail.id}
>
  <TailoredResumeSection
    jobId={detail.id}
    resume={
      detail.tailored_resume
        ? {
            content: detail.tailored_resume.content,
            model_used: detail.tailored_resume.model_used,
            freshness: detail.tailored_resume.freshness,
          }
        : null
    }
  />
</SectionErrorBoundary>
```

**Phase 22 delta:**

```tsx
<Separator />
<SectionErrorBoundary
  section="salary_intelligence"                     // already in SECTION_LABELS map at section-error-boundary.tsx:10
  jobId={detail.id}
>
  <SalaryIntelligenceSection
    salary={
      detail.salary_intelligence
        ? {
            report_json:  detail.salary_intelligence.report_json,
            llm_analysis: detail.salary_intelligence.llm_analysis,
            freshness:    detail.salary_intelligence.freshness,
          }
        : null
    }
  />
</SectionErrorBoundary>
```

Placement: insert between the existing `</SectionErrorBoundary>` at line 260 (end of Tailored Resume) and the `<Separator />` at line 262 (start of Company Intel). SECTION_LABELS already has `salary_intelligence: "Salary Intelligence"` (verified at `section-error-boundary.tsx:10`) — zero-infrastructure additive change.

**Grep-gate G-4** (UI-SPEC §Grep-verifiable): the boundary wrap MUST be adjacent. The analog pattern above satisfies this by construction.

#### 7b. Header salary figure retrofit (line 158-163) — `<ProvenanceTag source="scraped">`

**Analog:** existing header-salary cell at lines 158-163 (paired with D-12 currency guard).

**Analog excerpt** (before Phase 22):

```tsx
{formatSalary(detail.salary_min, detail.salary_max) && (
  <span className="flex items-center gap-1">
    <DollarSign className="size-3.5" />
    {formatSalary(detail.salary_min, detail.salary_max)}
  </span>
)}
```

**Phase 22 delta** (UI-SPEC §Call site A):

```tsx
{formatSalary(detail.salary_min, detail.salary_max) && detail.salary_currency && (
  <span className="flex items-center gap-1">
    <DollarSign className="size-3.5" />
    {formatSalary(detail.salary_min, detail.salary_max)}
    <ProvenanceTag source="scraped" />
  </span>
)}
```

Two edits in the snippet: (1) add `&& detail.salary_currency` to the truthy guard (D-12 — hide block entirely when currency is null), (2) add `<ProvenanceTag source="scraped" />` as the third child of the `gap-1` flex row. The inherited `gap-1` from the parent `<span>` handles the "thin space" (UI-SPEC §Spacing Scale — resolves the D-11 "thin space" to 4px).

#### 7c. Company Intel salary-range retrofit (lines 321-330) — `<ProvenanceTag source="company_research">`

**Analog:** existing salary-range cell inside the grid at lines 321-330.

**Analog excerpt** (before Phase 22):

```tsx
{(detail.company_research.salary_range_min ||
  detail.company_research.salary_range_max) && (
  <div className="flex items-center gap-1">
    <DollarSign className="size-3.5" />
    {formatSalary(
      detail.company_research.salary_range_min,
      detail.company_research.salary_range_max
    )}
  </div>
)}
```

**Phase 22 delta** (UI-SPEC §Call site B):

```tsx
{(detail.company_research.salary_range_min ||
  detail.company_research.salary_range_max) &&
  detail.company_research.salary_currency && (
    <div className="flex items-center gap-1">
      <DollarSign className="size-3.5" />
      {formatSalary(
        detail.company_research.salary_range_min,
        detail.company_research.salary_range_max
      )}
      <ProvenanceTag source="company_research" />
    </div>
  )}
```

Two edits: (1) add `&& detail.company_research.salary_currency` to the guard (D-12 cascade from the `?? "USD"` removal), (2) add `<ProvenanceTag source="company_research" />` as the third child of the flex row.

**Import additions** (analog lines 1-38):

```tsx
import { SalaryIntelligenceSection } from "./salary-intelligence-section";
import { ProvenanceTag } from "./provenance-tag";
```

**Grep-gate G-1** (UI-SPEC §Grep-verifiable): every `formatSalary(` in this file MUST be followed within 5 lines by `<ProvenanceTag` or `<Badge variant="outline"`, OR be inside a component that tags itself. Call sites A + B above satisfy directly; Call site C (headline row inside `SalaryIntelligenceSection`) satisfies via the "encapsulated" clause.

---

### 8. `src/lib/attach-freshness.ts` (EDIT — extend to tri-field dispatch)

**Analog:** existing dual-field dispatch at lines 28-37.

**Analog excerpt** (lines 28-37 — the "less magic" Plan 21-00 dispatcher):

```ts
export function attachFreshness<T extends { generated_at: string } | { created_at: string }>(
  artifact: T | null,
  thresholdDays: number
): (T & { freshness: ArtifactFreshness }) | null {
  if (!artifact) return null;
  // Company research uses created_at; cover_letter + tailored_resume use generated_at.
  const iso =
    "generated_at" in artifact
      ? (artifact as { generated_at: string }).generated_at
      : (artifact as { created_at: string }).created_at;
  // ...
}
```

**Phase 22 delta** (CONTEXT.md §Claude's Discretion + UI-SPEC §Hydration safety — use `search_date` for the salary section's freshness per the researcher recommendation):

```ts
export function attachFreshness<
  T extends { generated_at: string } | { created_at: string } | { search_date: string }
>(
  artifact: T | null,
  thresholdDays: number
): (T & { freshness: ArtifactFreshness }) | null {
  if (!artifact) return null;
  const iso =
    "generated_at" in artifact
      ? (artifact as { generated_at: string }).generated_at
      : "search_date" in artifact
        ? (artifact as { search_date: string }).search_date
        : (artifact as { created_at: string }).created_at;
  // ...rest unchanged
}
```

3-line diff. The existing `isStale` helper at `job-freshness.ts:38-48` already handles arbitrary ISO strings — no change needed. `STALE_THRESHOLDS.salary_intelligence = 30` is already declared at `job-freshness.ts:22`. Zero-infrastructure additive change.

---

### 9. `src/lib/job-actions.ts` (EDIT — extend `fetchJobDetail`)

**Analog:** existing `attachFreshness<T>(...)` call pattern at lines 60-71.

**Analog excerpt** (lines 58-72):

```ts
return {
  ...detail,
  cover_letter: attachFreshness<CoverLetter>(
    detail.cover_letter,
    STALE_THRESHOLDS.cover_letter
  ),
  tailored_resume: attachFreshness<TailoredResume>(
    detail.tailored_resume,
    STALE_THRESHOLDS.tailored_resume
  ),
  company_research: attachFreshness<CompanyResearch>(
    detail.company_research,
    STALE_THRESHOLDS.company_research
  ),
};
```

**Phase 22 delta** — add one more call, preserving the identical cadence:

```ts
salary_intelligence: attachFreshness<SalaryIntelligence>(
  detail.salary_intelligence,
  STALE_THRESHOLDS.salary_intelligence   // 30 — already declared at job-freshness.ts:22
),
```

**Type imports** (lines 11-17) — add `SalaryIntelligence` to the `type { ... }` import from `@/lib/jobs-db`.

**`"use server"` constraint (CLAUDE.md):** `attach-freshness.ts` MUST stay a separate module (non-async exports disallowed from `"use server"` files per Plan 21-00 Rule 3). Zero code impact — `job-actions.ts` already imports from `@/lib/attach-freshness` at line 19.

---

### 10. `scripts/check-jobs-schema.ts` (EDIT — add `salary_intelligence` to EXPECTED map)

**Analog:** existing EXPECTED map entries at lines 18-48.

**Analog excerpt** (lines 37-39 — simplest 2-column entry, showing the expected literal-array shape):

```ts
tailored_resumes: [
  "id", "job_id", "content", "pdf_data", "model_used", "generated_at",
],
```

**Phase 22 delta** (D-04 — add one entry for the 7-column salary_intelligence table, matching the live-DB schema captured in CONTEXT.md §Phase Boundary):

```ts
salary_intelligence: [
  "id", "search_date", "report_json", "raw_results", "llm_analysis",
  "created_at", "updated_at",
],
```

Position: anywhere in the map (the script iterates via `Object.entries` — insertion order doesn't change output). Recommended position: after `tailored_resumes` (alphabetical) or after `applications` (pipeline-chronological) — match the ordering convention the owner prefers when reading the file; there is no runtime impact.

**Side effect:** `npm run test:schema` will run through 7 new column checks (existing 6 tables × ~6 avg cols + salary_intelligence's 7 = the total printed on pass). Pre-push hook already enabled per `scripts/install-hooks.sh`.

---

### 11. `src/__tests__/lib/provenance.test.ts` (NEW — pure-function test)

**Analog:** `src/__tests__/lib/score-color.test.ts` (Plan 21-05 precedent). Exact mirror — same describe/it cadence, same boundary-value sweep, same label↔color consistency check.

**Analog excerpt** (score-color.test.ts lines 4-57 — the 3-describe pattern, copy verbatim and swap 3-band sweep for 4-source switch):

```tsx
describe("scoreColor — 3-band semantic token mapping", () => {
  it("returns text-destructive at 0.0 (low band — lower boundary)", () => {
    expect(scoreColor(0.0)).toBe("text-destructive");
  });
  // ...boundary sweep: 0.0, 0.59, 0.6, 0.79, 0.8, 1.0
});

describe("scoreLabel — 3-band label mapping", () => {
  // ...mirrors the color test
});

describe("scoreColor ↔ scoreLabel consistency", () => {
  it("aligns 'low' with 'text-destructive', ...", () => {
    for (const n of [0.0, 0.3, 0.59, 0.6, 0.7, 0.79, 0.8, 0.9, 1.0]) {
      const color = scoreColor(n);
      const label = scoreLabel(n);
      if (label === "low")    expect(color).toBe("text-destructive");
      if (label === "medium") expect(color).toBe("text-warning");
      if (label === "high")   expect(color).toBe("text-success");
    }
  });
});
```

**Phase 22 shape** (4 sources × 2 functions = 8 cases minimum; add a consistency-sweep loop):

```tsx
describe("provenanceColor — 4-source semantic token mapping", () => {
  it('returns text-muted-foreground for "scraped" (lowest-trust tier)', () => {
    expect(provenanceColor("scraped")).toBe("text-muted-foreground");
  });
  it('returns text-warning for "llm" (LLM estimate, needs scrutiny)', () => {
    expect(provenanceColor("llm")).toBe("text-warning");
  });
  it('returns text-success for "company_research" (higher-trust — LLM researched)', () => {
    expect(provenanceColor("company_research")).toBe("text-success");
  });
  it('returns text-muted-foreground for "original_posting" (reserved — parity with scraped)', () => {
    expect(provenanceColor("original_posting")).toBe("text-muted-foreground");
  });
});

describe("provenanceLabel — 4-source verbatim label mapping", () => {
  it('returns "scraped" for "scraped"', () => {
    expect(provenanceLabel("scraped")).toBe("scraped");
  });
  it('returns "LLM estimate" for "llm"', () => {
    expect(provenanceLabel("llm")).toBe("LLM estimate");
  });
  it('returns "company research" for "company_research"', () => {
    expect(provenanceLabel("company_research")).toBe("company research");
  });
  it('returns "posted" for "original_posting"', () => {
    expect(provenanceLabel("original_posting")).toBe("posted");
  });
});
```

**Deltas vs analog:** 4 discrete-union cases instead of a boundary-sweep (string unions have no "boundaries"); TooltipContent lookup is not tested here (that's a component test in §12). No `for (const n of [...])` sweep — the 4 sources are the whole domain.

---

### 12. `src/__tests__/components/salary-intelligence-section.test.tsx` (NEW — component test)

**Analog:** composite of `src/__tests__/components/tailored-resume-section.test.tsx` (component mount + fixture shape) and `src/__tests__/components/empty-states.test.tsx` (3-branch assertion pattern + `EMPTY_STATE_COPY` import for drift guard).

**Analog excerpt 1 — mount/TooltipProvider wrapper** (tailored-resume-section.test.tsx lines 21-27):

```tsx
function render(ui: ReactElement) {
  return rtlRender(ui, {
    wrapper: ({ children }) => (
      <TooltipProvider delayDuration={0}>{children}</TooltipProvider>
    ),
  });
}
```

**Phase 22 delta:** copy verbatim. `<ProvenanceTag>` uses Radix Tooltip — same wrapper need.

**Analog excerpt 2 — fixture shape** (tailored-resume-section.test.tsx lines 74-78):

```tsx
const freshView: TailoredResumeView = {
  content: "# Richard Hudson\n\n**Senior Engineer**\n\n- item",
  model_used: "gpt-4o-mini",
  freshness: { generatedDate: "4/21/26", isStale: false, ageDays: 0 },
};
```

**Phase 22 delta** — 3+ fixtures for the 3 render branches + the 2 headline shapes (UI-SPEC §1 validation bullets):

```tsx
const nullSalary = null;

const emptyView: SalaryIntelligenceView = {
  report_json: { random: "junk" },
  llm_analysis: "   ",
  freshness: { generatedDate: "4/21/26", isStale: false, ageDays: 0 },
};

const minMedianMaxView: SalaryIntelligenceView = {
  report_json: { min: 120000, median: 150000, max: 180000, currency: "USD" },
  llm_analysis: "Market tight in H1 2026.",
  freshness: { generatedDate: "4/21/26", isStale: false, ageDays: 0 },
};

const percentilesView: SalaryIntelligenceView = {
  report_json: { p25: 120000, p50: 150000, p75: 180000, currency: "USD" },
  llm_analysis: "Upper-quartile bonus observed.",
  freshness: { generatedDate: "4/21/26", isStale: false, ageDays: 0 },
};
```

**Analog excerpt 3 — `EMPTY_STATE_COPY` import for drift guard** (empty-states.test.tsx lines 7-8 + 46-47):

```tsx
import { EMPTY_STATE_COPY } from "@/lib/empty-state-copy";
// ...
<p className="text-sm text-muted-foreground italic">
  {EMPTY_STATE_COPY.cover_letter.missing}
</p>
```

**Phase 22 delta:** import `EMPTY_STATE_COPY` and assert the rendered `<p>` textContent equals `EMPTY_STATE_COPY.salary_intelligence.missing` / `.empty`. This creates the grep-gate G-3 drift guard: any inline string literal in production fails the test immediately.

**Key assertions to implement** (UI-SPEC §1 validation bullets — 7 cases):

1. `salary === null` → heading renders + body is single `<p className="italic text-muted-foreground">` with textContent `"No salary intelligence yet."`.
2. `emptyView` (whitespace prose + unrecognized JSON) → heading renders + body is single `<p>` with textContent `"Salary intelligence was generated but is empty."`.
3. `minMedianMaxView` → 3 figures rendered with `Min` / `Median` / `Max` labels, 3 `<ProvenanceTag source="llm" />` with class `text-warning`, Streamdown prose container present.
4. `percentilesView` → 3 figures rendered with `25th` / `50th` / `75th` labels.
5. Populated + `report_json: { min: 120000 }` (no currency) → headline row hidden, Streamdown prose still renders (graceful degrade per D-06).
6. Streamdown prose container has class `bg-card/50` + `border-border` (inheritance check vs Phase 20 baseline).
7. Grep-gate simulation: the `<h3>` is ALWAYS present regardless of branch (Plan 21-06 always-render-shell posture).

**XSS posture inheritance:** Phase 22 does not need a new `salary-intelligence-xss.test.tsx` — the shared Streamdown config (`skipHtml` + `linkSafety={{ enabled: false }}`) is already locked by `tailored-resume-xss.test.tsx`. Optional strengthening: add one assertion that re-uses the XSS payload list from `tailored-resume-xss.test.tsx:28-32` via import to prove the posture extends.

---

### 13. `src/__tests__/lib/jobs-db-zod.test.ts` (EDIT — add `SalaryIntelligenceSchema` cases)

**Analog:** existing `CoverLetterSchema` fail-open cases at lines 30-76 + `TailoredResumeSchema` cases at lines 78-120.

**Analog excerpt** (jobs-db-zod.test.ts lines 36-47):

```tsx
it("returns null and logs on missing required field", () => {
  const broken = { ...validCoverLetter } as Record<string, unknown>;
  delete broken.content;
  const result = parseOrLog(CoverLetterSchema, broken, "cover_letter", 42);
  expect(result).toBeNull();
  expect(errorSpy).toHaveBeenCalledTimes(1);
  const [msg, payload] = errorSpy.mock.calls[0] as [string, { jobId: number; issues: unknown[] }];
  expect(msg).toContain("[jobs-db] cover_letter schema drift");
  expect(payload.jobId).toBe(42);
  // ...
});
```

**Phase 22 deltas** — new describe-block for salary-intelligence cases, 4 cases minimum (UI-SPEC §1 validation list + D-01 fail-open posture):

1. **Happy path:** valid `salary_intelligence` fixture (all 7 fields) → returns parsed object.
2. **Missing required field:** delete `search_date` → returns null + logs `"[jobs-db] salary_intelligence schema drift"`.
3. **Permissive `report_json`:** pass `report_json: null` / `42` / `"string"` / `{}` / `{unknown: "shape"}` — ALL should parse successfully (D-01: `z.unknown()` accepts anything).
4. **`llm_analysis` null passes:** `llm_analysis: null` → parses successfully (schema is `.nullable()`).
5. **Passthrough null row:** `parseOrLog(SalaryIntelligenceSchema, null, "salary_intelligence", 1)` → returns null silently, no error log (matches the cover_letter null case at lines 58-62).

The log-prefix pattern (`"[jobs-db] <label> schema drift"`) is a shared convention — Phase 22 inherits by using `"salary_intelligence"` as the label arg.

---

### 14. `src/__tests__/components/empty-states.test.tsx` (EDIT) — OR new `job-detail-sheet.test.tsx`

**Analog:** existing inline-fixture drift-guard pattern at empty-states.test.tsx lines 34-96 (`CoverLetterEmptyFixture` + `CompanyIntelEmptyFixture`).

**Analog excerpt** (empty-states.test.tsx lines 68-96 — the in-file-duplicated-JSX-as-drift-guard pattern):

```tsx
function CompanyIntelEmptyFixture({ cr }: { cr: CompanyResearch | null }) {
  if (cr === null) {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-semibold flex items-center gap-1.5">
          <Building2 className="size-4" />
          Company Intel
        </h3>
        <p className="text-sm text-muted-foreground italic">
          {EMPTY_STATE_COPY.company_research.missing}
        </p>
      </div>
    );
  }
  // ...
}
```

**Phase 22 delta — two options, both acceptable per planner discretion:**

**Option A (extend empty-states.test.tsx):** Phase 22's `SalaryIntelligenceSection` lives in its OWN component file (unlike Company Intel's inline ternary), so the component-owned test in §12 covers the empty branches directly. The only net-new assertion for this file is a `provenance-tag-adjacency` grep-gate assertion over `job-detail-sheet.tsx` source text — one `readFileSync` + regex check ensures G-1 holds.

**Option B (new `job-detail-sheet.test.tsx`):** house the grep-gate assertions separately. The existing empty-states.test.tsx inline-fixture pattern at lines 34-96 is the template; copy it to a new file if the owner prefers separation.

**Recommended (researcher-default):** Option A — extend empty-states.test.tsx with a minimal `describe("provenance-tag adjacency — grep gate G-1")` block. Single `it()` that `readFileSync`s `job-detail-sheet.tsx`, greps for every `formatSalary(` occurrence, and asserts a `<ProvenanceTag|Badge variant="outline"` hit within the next 5 lines. This keeps the empty-states test file cohesive (it's already the file that asserts sheet-level render shape for Phase 21 sections).

**Currency-null assertion:** add a test case for the "no currency → salary block hidden" branch (D-12 grep-gate G-6 is server-side; this adds the client-side equivalent). Fixture: `detail.salary_currency = null` → assert no `<DollarSign>` renders in the header row.

---

## Shared Patterns (cross-cutting)

### SP-1. `parseOrLog` fail-open at the DB boundary (Plan 20-03)

**Source:** `src/lib/jobs-schemas.ts:70-86`
**Apply to:** every new Zod validation in `getJobDetail` (Pattern Assignment #4 + #5)

```ts
export function parseOrLog<T>(
  schema: z.ZodType<T>,
  raw: unknown,
  label: string,
  jobId: number
): T | null {
  if (raw === null || raw === undefined) return null;
  const result = schema.safeParse(raw);
  if (!result.success) {
    console.error(`[jobs-db] ${label} schema drift`, {
      jobId,
      issues: result.error.issues,
    });
    return null;
  }
  return result.data;
}
```

**Why shared:** the helper is already generic over `z.ZodType<T>` — zero code change. Phase 22 adds `parseOrLog(SalaryIntelligenceSchema, raw, "salary_intelligence", jobId)` and inherits the log-prefix convention + null-passthrough + fail-open behavior for free. Every one of the 4 artifacts in `getJobDetail` validates INDEPENDENTLY — drift on one never nulls out the others (D-02 invariant).

### SP-2. `SectionErrorBoundary` per-section wrap (Plan 20-06)

**Source:** `src/app/(admin)/admin/jobs/section-error-boundary.tsx`
**Apply to:** the new `<SalaryIntelligenceSection>` mount in `job-detail-sheet.tsx` (Pattern Assignment #7a)

```tsx
<SectionErrorBoundary section="salary_intelligence" jobId={detail.id}>
  <SalaryIntelligenceSection salary={...} />
</SectionErrorBoundary>
```

**Why shared:** SECTION_LABELS at `section-error-boundary.tsx:10` already includes `salary_intelligence: "Salary Intelligence"` — zero infrastructure change. The boundary catches Zod/Streamdown/render exceptions and renders the muted "Couldn't render this section" fallback without leaking details. The "intentionally empty" and "intentionally missing" branches are normal render paths — they live INSIDE the boundary, not in the fallback.

### SP-3. `EMPTY_STATE_COPY` const map as source of truth (Plan 21-06)

**Source:** `src/lib/empty-state-copy.ts`
**Apply to:** every empty-state string in `SalaryIntelligenceSection` (Pattern Assignment #6 + #1)

```ts
<p className="text-sm text-muted-foreground italic">
  {EMPTY_STATE_COPY.salary_intelligence.missing}
</p>
```

**Why shared:** grep-gate G-3 (UI-SPEC §Grep-verifiable) enforces the import vs inline rule — every empty-state string MUST come from this const map so future i18n is a single-file swap and the anti-CTA grep gate G-5 has one file to scan. Phase 21's Plan 21-06 precedent is exact.

### SP-4. Streamdown XSS posture (Phase 20 baseline)

**Source:** `src/app/(admin)/admin/jobs/tailored-resume-section.tsx:166-170` + regression test `tailored-resume-xss.test.tsx:37`
**Apply to:** every Streamdown render in Phase 22 (Pattern Assignment #1)

```tsx
<Streamdown skipHtml linkSafety={{ enabled: false }}>
  {content}
</Streamdown>
```

**Why shared:** RESEARCH.md §Anti-Patterns explicitly warns — `rehype-raw` + `skipHtml` combined is undefined behavior; `linkSafety={{ enabled: false }}` is correct for `/admin/*` single-owner surface (modal friction without value). Plan 20-07's CSP header provides defense-in-depth. Phase 22's new `<SalaryIntelligenceSection>` Streamdown call MUST use the identical config verbatim.

### SP-5. Pure-function color/label pair (Plan 21-05)

**Source:** `src/lib/score-color.ts` (the template); new `src/lib/provenance.ts` (the Phase 22 instance)
**Apply to:** `provenance-tag.tsx` className + tooltip-content lookup (Pattern Assignment #2)

The extraction decision is locked (D-10 + RESEARCH.md §Alternatives Considered): 4 sources × 2 functions (color + label) + future-phase reuse = extraction wins over inline. The pattern is "pure function returning a Tailwind semantic-token class name as a string."

### SP-6. `attachFreshness` server-side dual/tri-field dispatch (Plan 21-00)

**Source:** `src/lib/attach-freshness.ts:28-37`
**Apply to:** `fetchJobDetail` + `attach-freshness.ts` tri-field extension (Pattern Assignment #8 + #9)

**Why shared:** hydration-safety is a MUST (UI-SPEC §Hydration safety). Every freshness primitive (`generatedDate`, `isStale`, `ageDays`) is computed ONCE on the server and passed to the client as string/boolean/number. No `new Date()` in any Phase 22 client component. The tri-field extension is a 3-line edit that preserves the dual-field posture for existing callers.

### SP-7. Schema-drift EXPECTED map (Plan 20-08)

**Source:** `scripts/check-jobs-schema.ts:18-48`
**Apply to:** Pattern Assignment #10

**Why shared:** `npm run test:schema` runs as a pre-push hook via `scripts/install-hooks.sh`. Phase 22's new `salary_intelligence` entry means the hook now catches both existing 6-table drift AND salary_intelligence-specific drift. Zero new script infrastructure.

### SP-8. Anti-CTA grep gate on empty-state strings (Plan 21-06)

**Source:** existing anti-CTA assertion in the Phase 21 test suite (regex list: `\b(click|regenerate|run|generate now|try|retry|please|start|begin|trigger)\b`, case-insensitive; also `!`; also count-periods-equals-1).
**Apply to:** Pattern Assignment #6 (validates the 2 new salary strings pass the gate)

**Why shared:** the tone contract is project-wide for all LLM-artifact empty-state copy. Phase 22's two strings — `"No salary intelligence yet."` and `"Salary intelligence was generated but is empty."` — both pass verbatim.

---

## No Analog Found

None. Every Phase 22 file has a direct in-repo analog. This is a mechanical-extension phase — zero novel patterns, zero net-new architectural decisions.

---

## Metadata

**Analog search scope:**
- `src/app/(admin)/admin/jobs/*.tsx` — all 13 files scanned (component analogs)
- `src/lib/*.ts` — relevant subset (pure helpers + DB boundary + const maps)
- `src/components/ui/*.tsx` — `badge.tsx`, `tooltip.tsx` (primitive confirmation)
- `src/__tests__/lib/*.test.ts` + `src/__tests__/components/*.test.tsx` — relevant analogs
- `scripts/check-jobs-schema.ts` — CLI extension analog

**Files scanned:** 14 code files + 5 test files + 2 CONTEXT/RESEARCH/UI-SPEC files = 21 total in primary pass.

**Pattern extraction date:** 2026-04-22

**Closest-analog confidence:** HIGH across the board — every file has a direct 1:1 precedent from Phase 20 or Phase 21, and the RESEARCH.md executive summary already confirmed "every load-bearing piece has a direct analog in code."

---
