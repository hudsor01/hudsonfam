# Phase 24: Regenerate Expansion - Pattern Map

**Mapped:** 2026-04-23
**Files analyzed:** 14 (2 renames, 5 edits, 2 new, 2 test edits + 1 unchanged target, optional predicates file + test)
**Analogs found:** 14 / 14 (100% — pattern-copy phase; every file has a direct Phase 23 precedent)

---

## Overview

Phase 24 is a pattern-extension phase. 85% of the code is clone-and-rename from Phase 23 primitives. The file-modification matrix:

| Class | Count | Files |
|-------|-------|-------|
| **RENAME (with generalization)** | 2 | `regenerate-cover-letter-button.tsx` → `regenerate-button.tsx`; `regenerate-cover-letter-button.test.tsx` → `regenerate-button.test.tsx` |
| **NEW** | 2-3 | `src/__tests__/lib/job-actions.regenerate.test.ts`; (optional) `src/lib/regenerate-predicates.ts` + `src/__tests__/lib/regenerate-predicates.test.ts` |
| **EDIT** | 5 | `src/lib/job-actions.ts` (+2 exports); `src/app/(admin)/admin/jobs/{job-detail-sheet,tailored-resume-section,salary-intelligence-section}.tsx`; extensions in 2 existing section test files + sheet test |
| **UNCHANGED (reused)** | 4 | `src/lib/webhooks.ts`, `src/lib/session.ts`, `src/lib/jobs-db.ts`, `src/styles/globals.css` |

**The single net-new UX primitive** is the `silent-success` button state variant (D-06) and its inline `<p className="text-warning text-xs mt-1 italic">` render branch (D-05). Everything else is a rename or a prop-shape generalization.

---

## File Classification

| File | Role | Data Flow | Closest Analog | Match Quality |
|------|------|-----------|----------------|---------------|
| `src/app/(admin)/admin/jobs/regenerate-button.tsx` (from rename) | client component (state machine + polling) | event-driven + request-response | `src/app/(admin)/admin/jobs/regenerate-cover-letter-button.tsx` (pre-rename self) | **exact** — file IS the analog, generalized |
| `src/lib/job-actions.ts` (+2 exports) | Server Action (mutation) | request-response | `regenerateCoverLetter` at `src/lib/job-actions.ts:171-198` | **exact** — same file, adjacent declarations |
| `src/lib/regenerate-predicates.ts` (OPTIONAL) | utility (pure helpers) | transform | `src/lib/score-color.ts` (pure exhaustive-threshold helpers) | **role-match** |
| `src/app/(admin)/admin/jobs/tailored-resume-section.tsx` (EDIT) | client component | request-response | Its own populated-branch meta row at line 128 — add 4th sibling like Phase 23 CL meta row at `job-detail-sheet.tsx:210-244` | **exact** |
| `src/app/(admin)/admin/jobs/salary-intelligence-section.tsx` (EDIT) | client component | request-response | Its own populated-branch meta row at line 81 — add 2nd sibling | **exact** |
| `src/app/(admin)/admin/jobs/job-detail-sheet.tsx` (EDIT) | client component (orchestrator) | request-response | `job-detail-sheet.tsx:240-243` CL mount (rewired) + `:277-287` SalaryIntelligenceSection call (prop threading) | **exact** |
| `src/__tests__/components/regenerate-button.test.tsx` (from rename) | component test | event-driven | `src/__tests__/components/regenerate-cover-letter-button.test.tsx` (pre-rename self) | **exact** |
| `src/__tests__/lib/job-actions.regenerate.test.ts` (NEW) | Server Action contract test | request-response | `src/__tests__/lib/job-actions.trigger.test.ts` (Plan 23-02 precedent — SAME SHAPE, two new actions instead of two original) | **exact** |
| `src/__tests__/lib/regenerate-predicates.test.ts` (OPTIONAL) | unit test (pure) | transform | (no direct analog; closest: `src/__tests__/lib/score-color.test.ts` if exists, otherwise minimal scaffold) | **role-match** |
| `src/__tests__/components/tailored-resume-section.test.tsx` (EDIT) | component test | request-response | existing assertions in same file (add 1 mount guard) | **exact** |
| `src/__tests__/components/salary-intelligence-section.test.tsx` (EDIT) | component test | request-response | existing assertions in same file (add 1 mount guard + `jobId` prop threading) | **exact** |
| `src/__tests__/components/job-detail-sheet.test.tsx` (EDIT) | component test | request-response | existing G-4 + import assertions (update CL ref, add `SalaryIntelligenceSection jobId=` prop guard) | **exact** |

---

## Pattern Assignments

### 1. `src/app/(admin)/admin/jobs/regenerate-button.tsx` (client component — from rename + generalization)

**Role:** client component; 4-state machine (`idle | in-progress | error | silent-success`); `setInterval` polling with 60-tick cap; `"use client"` directive.
**Data Flow:** event-driven (onClick → useTransition + Server Action) + request-response (fetchJobDetail poll).

**Closest Analog:** `src/app/(admin)/admin/jobs/regenerate-cover-letter-button.tsx` (the file IS the starting point; rename + generalize per D-01).

**Imports pattern** (lines 1-11 of analog — preserve verbatim, add `regenerateTailoredResume` + `regenerateSalaryIntelligence` wiring happens in mount sites not here; the component receives `action` as a prop):

```typescript
"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchJobDetail } from "@/lib/job-actions";
import type { ErrorSentinel } from "@/lib/webhooks";
import type { FreshJobDetail } from "@/lib/jobs-db";
```

**Delta vs analog:**
- DELETE the direct `regenerateCoverLetter` import (line 7 of analog) — the specific action is injected via the `action` prop (D-01).
- KEEP `fetchJobDetail` import — the polling fetch is artifact-agnostic; always polls full detail and delegates the per-artifact check to the `isDone` predicate prop.

**Props pattern** (analog lines 13-27 → generalize per D-01):

```typescript
// ANALOG (pre-rename, lines 13-27):
interface RegenerateCoverLetterButtonProps {
  jobId: number;
  baselineGeneratedAt: string;
}

// PHASE 24 (post-generalize — D-01 locked):
interface RegenerateButtonProps {
  jobId: number;
  artifact: "cover_letter" | "tailored_resume" | "salary_intelligence";
  label: string;
  action: (jobId: number) => Promise<RegenerateResult>;
  isDone: (detail: FreshJobDetail | null, serverBaseline: string | null) => boolean;
  baselineGeneratedAt: string | null;  // nullable (salary has date strings, can be null on INSERT-wait)
}
type RegenerateResult =
  | { ok: true; baseline: string | null }
  | { ok: false; sentinel: ErrorSentinel };
```

**State machine pattern** (analog lines 29-32 → extend per D-06):

```typescript
// ANALOG (pre-rename, lines 29-32):
type ButtonState =
  | { kind: "idle" }
  | { kind: "in-progress"; serverBaseline: string }
  | { kind: "error"; sentinel: ErrorSentinel };

// PHASE 24 (D-06 — 4th variant added):
type ButtonState =
  | { kind: "idle" }
  | { kind: "in-progress"; serverBaseline: string | null }  // nullable (D-01)
  | { kind: "error"; sentinel: ErrorSentinel }
  | { kind: "silent-success" };  // NEW — D-05 / D-06
```

**isDone predicate pattern** (analog lines 42-51 — DELETE from file if extracted per D-02):

The analog has an inline `isDone` function. Phase 24 replaces it with the `isDone` prop call (`props.isDone(detail, serverBaseline)` — inside the polling callback). If extracted to `src/lib/regenerate-predicates.ts`, the component file becomes strictly thinner.

**useEffect cleanup pattern** (analog lines 112-119 — PRESERVE VERBATIM — Pitfall 6 Phase 23 / sheet-close-mid-poll):

```typescript
useEffect(() => {
  return () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };
}, []);
```

**Polling cap-exit fork** (analog lines 146-163 — this is where D-06 makes its surgical change):

```typescript
// ANALOG (pre-rename, lines 146-163):
if (currentCount >= 60) {
  if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
  setState({ kind: "error", sentinel: "unavailable" });
}

// PHASE 24 (D-06 — because `in-progress` state is ONLY reachable after res.ok === true,
// the 60-tick exit UNCONDITIONALLY transitions to silent-success):
if (currentCount >= 60) {
  if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
  setState({ kind: "silent-success" });
}
```

**Apply this same fork to both tick-success-but-predicate-false path AND catch-branch cap-exit.** Analog has the same 60-cap guard in 2 places (lines 146 main path + lines 157 catch path) — BOTH get the silent-success fork per Pitfall 2 (Phase 24 RESEARCH.md).

**handleClick pattern** (analog lines 168-182 — preserve the `res.ok=false → {kind:"error"}` direct transition + the `res.ok=true → {kind:"in-progress"}` + polling-start flow; the ONLY change is swap `regenerateCoverLetter` for `action` prop + swap `isDone` for prop):

```typescript
const handleClick = () => {
  startTransition(async () => {
    const res = await action(jobId);  // D-01: action is a prop (was direct regenerateCoverLetter call)
    if (!res.ok) {
      setState({ kind: "error", sentinel: res.sentinel });
      return;
    }
    const serverBaseline = res.baseline ?? baselineGeneratedAt;
    setState({ kind: "in-progress", serverBaseline });
    startPolling(serverBaseline);
  });
};
```

**Render tree pattern** (analog lines 184-204 — add the silent-success branch per D-05):

```tsx
return (
  <div>
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleClick}
      disabled={isDisabled}
      className={isPolling ? "text-muted-foreground" : ""}
      aria-busy={isPolling}
    >
      {isPolling ? <Loader2 className="animate-spin" /> : <RefreshCw />}
      {label}                                         {/* D-01: label is a prop (was literal "Regenerate cover letter") */}
    </Button>
    {state.kind === "error" && (
      <p className="text-destructive text-xs mt-1">
        Error: {state.sentinel}
      </p>
    )}
    {state.kind === "silent-success" && (             {/* NEW — D-05 / G-8 */}
      <p className="text-warning text-xs mt-1 italic">
        Regeneration reported success but no new content was written — check n8n logs.
      </p>
    )}
  </div>
);
```

**G-8 verbatim-copy lock:** the em-dash is U+2014 (`—`, not `--`). Copy-paste from UI-SPEC §Copywriting Contract — do NOT re-type. One occurrence in the component file; one DOM assertion in the test file.

**What NOT to do (anti-patterns inherited from Phase 23 RESEARCH + Phase 24 Pitfalls 1-3):**
- No `Date.now()` anywhere (G-6 extended to this file — zero occurrences).
- No merging `silent-success` into `error` with a 5th sentinel value (Pitfall 2 — breaks 4-value bounded `ErrorSentinel` contract).
- No auto-revert from `silent-success` to `idle` after N seconds (owner may look away — stays until re-click).
- No toggling button visibility on silent-success — button stays visible + re-enabled (matches sentinel-error UX; enables retry).

---

### 2. `src/lib/job-actions.ts` — 2 new Server Action exports (EDIT)

**Role:** Server Action (mutation); `"use server"` at top of file (line 1 — inherited).
**Data Flow:** request-response (HMAC-signed POST to n8n) + pre-webhook DB read.

**Closest Analog:** `regenerateCoverLetter` at `src/lib/job-actions.ts:171-198` (CITED Phase 24 RESEARCH §Sources).

**Imports pattern** (ALREADY PRESENT at `job-actions.ts:1-22` — no new imports required; every symbol the new actions need is already imported):

```typescript
"use server";

import { randomUUID } from "node:crypto";
import { requireRole } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { /* ... */ getJobDetail } from "@/lib/jobs-db";
import { sendSignedWebhook, type ErrorSentinel } from "@/lib/webhooks";
```

**Auth pattern (D-12 CI grep gate — first-line adjacency locked)** — clone from analog line 177 verbatim:

```typescript
await requireRole(["owner"]);  // MUST be the first statement; Plan 23-04's readFileSync regex auto-validates
```

**Core CRUD-clone pattern** (analog lines 171-198 — copy-paste with 2 swap sites per Phase 24 RESEARCH §3):

```typescript
// regenerateTailoredResume (D-03):
export async function regenerateTailoredResume(
  jobId: number,
): Promise<
  | { ok: true; baseline: string | null }
  | { ok: false; sentinel: ErrorSentinel }
> {
  await requireRole(["owner"]);

  let baseline: string | null = null;
  try {
    const detail = await getJobDetail(jobId);
    baseline = detail?.tailored_resume?.generated_at ?? null;  // SWAP: tailored_resume instead of cover_letter
  } catch {
    return { ok: false, sentinel: "unavailable" };  // T-23-02-05 pattern — no webhook fire on DB error
  }

  const idempotencyKey = randomUUID();
  const res = await sendSignedWebhook(
    "regenerate-tailored-resume",  // SWAP: new webhook path
    { job_id: jobId },
    idempotencyKey,
  );
  if (!res.ok) return { ok: false, sentinel: res.sentinel };
  revalidatePath("/admin/jobs");
  return { ok: true, baseline };
}

// regenerateSalaryIntelligence (D-04):
// SAME SHAPE — swap:
//   baseline = detail?.salary_intelligence?.search_date ?? null  (date string, NOT timestamp — D-04 note)
//   path     = "regenerate-salary-intelligence"
```

**Error handling pattern** (analog lines 182-187 — PRESERVE T-23-02-05 / Pitfall 3 Phase 23):

```typescript
try {
  const detail = await getJobDetail(jobId);
  baseline = detail?.<ARTIFACT>?.<FIELD> ?? null;
} catch {
  // DB error — no raw e.message across the boundary; webhook NOT fired (T-23-02-05)
  return { ok: false, sentinel: "unavailable" };
}
```

**No `e.message` leak. No `console.error` that crosses the return boundary.** The sentinel union is the ONLY client-facing error channel (D-08 Phase 23 bounded).

**Placement in file:** declare both new actions IMMEDIATELY AFTER `regenerateCoverLetter` (end of file post-line 198). Adjacent declarations make the Plan 23-04 CI grep gate's "within 10 lines of export" check trivially pass.

---

### 3. `src/lib/regenerate-predicates.ts` (OPTIONAL NEW — Claude's Discretion per D-02; UI-SPEC + RESEARCH recommend extraction)

**Role:** utility (pure helpers — no state, no `new Date()` at top level, no `window.*`).
**Data Flow:** transform (string → boolean).

**Closest Analog:** `src/lib/score-color.ts` (pure exhaustive-threshold helper; see code excerpt below).

**Analog doc-comment + pure-function pattern** (`src/lib/score-color.ts:1-36`):

```typescript
/**
 * Quality-score → semantic color / label helpers.
 * [...]
 * Pure functions — no state, no `new Date()`, no `window.*` — safe to
 * call from Server Components and Client Components alike.
 */

export type QualityLabel = "low" | "medium" | "high";

export function scoreColor(score: number): string {
  if (score < 0.6) return "text-destructive";
  if (score < 0.8) return "text-warning";
  return "text-success";
}
```

**Delta for regenerate-predicates.ts** — 3 parallel exports with docblock-first convention (from score-color.ts §1-22 preamble shape):

```typescript
// src/lib/regenerate-predicates.ts (NEW — RESEARCH.md §Pattern 1 literal)
/**
 * Per-artifact isDone predicates for the generalized RegenerateButton polling loop.
 *
 * Pure functions — no `Date.now()`, no `window.*`. `new Date(...)` calls parse
 * ISO / date strings only (G-6 extended: wall-clock reads prohibited in the
 * component that consumes these, but runtime ISO parsing is explicitly allowed
 * per Phase 23 Plan 23-06 clarification).
 */
import type { FreshJobDetail } from "@/lib/jobs-db";

export function coverLetterIsDone(detail: FreshJobDetail | null, serverBaseline: string | null): boolean {
  const current = detail?.cover_letter?.generated_at;
  if (!current) return false;
  if (serverBaseline === null) return true;  // INSERT-wait fallback
  return new Date(current).getTime() > new Date(serverBaseline).getTime();
}

export function tailoredResumeIsDone(detail: FreshJobDetail | null, serverBaseline: string | null): boolean {
  const current = detail?.tailored_resume?.generated_at;
  if (!current) return false;
  if (serverBaseline === null) return true;
  return new Date(current).getTime() > new Date(serverBaseline).getTime();
}

export function salaryIntelligenceIsDone(detail: FreshJobDetail | null, serverBaseline: string | null): boolean {
  // D-04: search_date is Postgres `date` (YYYY-MM-DD), not ISO timestamp.
  // UTC-midnight parse avoids TZ drift across browser locales.
  const current = detail?.salary_intelligence?.search_date;
  if (!current) return false;
  if (serverBaseline === null) return true;
  return (
    new Date(current + "T00:00:00Z").getTime() >
    new Date(serverBaseline + "T00:00:00Z").getTime()
  );
}
```

**Date-granularity note (AI-ACTION-06 / Pitfall 1):** `salaryIntelligenceIsDone` is INTENTIONALLY date-granular (YYYY-MM-DD comparison). Same-day re-runs will return `false` across all 60 polls, triggering silent-success. This is the documented rough edge. NOT a bug; `v3.2+` adds a `generated_at` timestamp column to disambiguate (deferred).

---

### 4. `src/app/(admin)/admin/jobs/tailored-resume-section.tsx` (EDIT — add regenerate mount)

**Role:** client component (section render).
**Data Flow:** request-response.

**Closest Analog:** its own populated-branch meta row at `tailored-resume-section.tsx:128-164` — mount as rightmost sibling after `Download PDF` anchor. Behavioral precedent is the Phase 23 Cover Letter meta row at `job-detail-sheet.tsx:210-244` where Regenerate sits as rightmost sibling after the Download PDF anchor.

**Import delta** — add at top of file:

```typescript
import { RegenerateButton } from "./regenerate-button";
import { regenerateTailoredResume } from "@/lib/job-actions";
import { tailoredResumeIsDone } from "@/lib/regenerate-predicates";  // OR inline predicate if D-02 chose inlining
```

**Mount pattern** (insert after the existing Download PDF anchor at `tailored-resume-section.tsx:156-163` — rightmost sibling in the existing `flex items-center gap-3 flex-wrap` meta row at line 128):

```tsx
<div className="flex items-center gap-3 flex-wrap">
  <FreshnessBadge ... />  {/* existing */}
  <Tooltip>...</Tooltip>  {/* existing Copy button */}
  <a href={...}>          {/* existing Download PDF */}
    <Download className="size-3" />
    Download PDF
  </a>
  <RegenerateButton
    jobId={jobId}                              /* prop already exists on this section — line 37 */
    artifact="tailored_resume"
    label="Regenerate tailored resume"          /* G-5 verbatim from ROADMAP SC #1 Phase 24 */
    action={regenerateTailoredResume}
    isDone={tailoredResumeIsDone}
    baselineGeneratedAt={/* planner picks: resume.freshness.raw OR plumb new baselineGeneratedAtIso prop */}
  />
</div>
```

**Prop-plumbing concern** (from UI-SPEC §3 Mount B note): `resume.freshness.generatedDate` is the pre-formatted display string ("4/21/26"), NOT an ISO timestamp. The button's `baselineGeneratedAt` expects an ISO-8601 string so the `tailoredResumeIsDone` predicate can `new Date(...).getTime()` compare. Planner either (a) adds `baselineGeneratedAtIso: string | null` to the `TailoredResumeView` interface and threads from `job-detail-sheet.tsx:258-269`, or (b) adds it as a separate prop on `TailoredResumeSection`. Recommended: (a) — keeps the server-primitive bundle intact.

**Visibility gating:** the button is INSIDE the populated-branch return (lines 121-172 of analog). The two empty-state early returns (lines 78-104) do NOT mount the button — matches D-09 "only renders when `detail.tailored_resume !== null`".

**Anti-pattern to avoid:** do NOT lift the Regenerate button out of `TailoredResumeSection` to the parent sheet (Pitfall 4 rejected option 2). The section OWNS its meta row — matches `FreshnessBadge` + `Copy Tooltip` + `Download` co-locality established by Plan 20-05.

---

### 5. `src/app/(admin)/admin/jobs/salary-intelligence-section.tsx` (EDIT — add props + mount)

**Role:** client component (section render).
**Data Flow:** request-response.

**Closest Analog:** its own populated-branch meta row at `salary-intelligence-section.tsx:81-88` — currently has ONLY `FreshnessBadge`; add `RegenerateButton` as rightmost sibling.

**Import delta** — add at top of file:

```typescript
import { RegenerateButton } from "./regenerate-button";
import { regenerateSalaryIntelligence } from "@/lib/job-actions";
import { salaryIntelligenceIsDone } from "@/lib/regenerate-predicates";  // OR inline
```

**Props delta** (current interface at lines 26-28 has ONLY `salary: SalaryIntelligenceView | null`):

```typescript
// BEFORE (lines 26-28):
interface Props {
  salary: SalaryIntelligenceView | null;
}

// AFTER (D-09 + Pitfall 4):
interface Props {
  salary: SalaryIntelligenceView | null;
  jobId: number;                        // NEW — required for regenerate action
  baselineSearchDate: string | null;    // NEW — YYYY-MM-DD date string (D-04)
}
```

**Mount pattern** (insert after `FreshnessBadge` at line 87 — rightmost sibling in existing `flex items-center gap-3 flex-wrap` at line 81):

```tsx
<div className="flex items-center gap-3 flex-wrap">
  <FreshnessBadge ... />  {/* existing */}
  <RegenerateButton
    jobId={jobId}
    artifact="salary_intelligence"
    label="Regenerate salary intelligence"      /* G-5 verbatim from ROADMAP SC #2 Phase 24 */
    action={regenerateSalaryIntelligence}
    isDone={salaryIntelligenceIsDone}
    baselineGeneratedAt={baselineSearchDate}    /* date string YYYY-MM-DD; name reused from prop contract */
  />
</div>
```

**Visibility gating:** the button sits in the 3rd branch return (lines 74-118), which requires `salary !== null && (hasProse || headline)`. The two empty-state early returns (lines 43-72) do NOT mount — matches D-09.

---

### 6. `src/app/(admin)/admin/jobs/job-detail-sheet.tsx` (EDIT — 3 changes: CL mount rewire + 2 prop threads)

**Role:** client component (orchestrator / sheet).
**Data Flow:** request-response.

**Closest Analog:** the file's own current mounts at lines 240-243 (CL), 258-269 (TailoredResumeSection), 277-287 (SalaryIntelligenceSection).

**Import delta** — swap at line 42:

```typescript
// BEFORE (line 42):
import { RegenerateCoverLetterButton } from "./regenerate-cover-letter-button";

// AFTER:
import { RegenerateButton } from "./regenerate-button";
import { regenerateCoverLetter } from "@/lib/job-actions";  // ADD — previously only imported inside the button file
import { coverLetterIsDone } from "@/lib/regenerate-predicates";  // OR inline
```

**Mount rewire — Cover Letter (lines 240-243 — D-02):**

```tsx
// BEFORE:
<RegenerateCoverLetterButton
  jobId={detail.id}
  baselineGeneratedAt={detail.cover_letter.generated_at}
/>

// AFTER:
<RegenerateButton
  jobId={detail.id}
  artifact="cover_letter"
  label="Regenerate cover letter"             /* G-5 — unchanged from Phase 23 SC #2 */
  action={regenerateCoverLetter}
  isDone={coverLetterIsDone}
  baselineGeneratedAt={detail.cover_letter.generated_at}
/>
```

**Zero visual change** — the Phase 23 CL button's state machine, icon swap, and render tree are byte-for-byte preserved; only the import path and prop shape change.

**SalaryIntelligenceSection prop threading (lines 277-287 — for Pitfall 4 Recommendation):**

```tsx
<SalaryIntelligenceSection
  salary={...}                                 /* existing */
  jobId={detail.id}                            /* NEW — required for regenerate action */
  baselineSearchDate={detail.salary_intelligence?.search_date ?? null}  /* NEW */
/>
```

**TailoredResumeSection prop threading (lines 258-269 — if using Recommendation (a) above):**

Add `baselineGeneratedAtIso` to the `resume` shape (nested inside the existing conditional) or as a new sibling prop. Planner picks; UI-SPEC §3 defers this to planning.

---

### 7. `src/__tests__/components/regenerate-button.test.tsx` (from rename + extension — D-07)

**Role:** component test (Vitest + Testing Library + fake timers).
**Data Flow:** event-driven.

**Closest Analog:** `src/__tests__/components/regenerate-cover-letter-button.test.tsx` (pre-rename self — 17 Phase 23 cases + 4 grep gates at lines 310-338).

**Imports pattern** (analog lines 1-24) — delta: import renamed component + build fixture helpers:

```typescript
import type { ReactElement } from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render as rtlRender, fireEvent, act } from "@testing-library/react";
import { readFileSync } from "node:fs";
import path from "node:path";
import { RegenerateButton } from "@/app/(admin)/admin/jobs/regenerate-button";  // RENAMED
import { coverLetterIsDone, tailoredResumeIsDone, salaryIntelligenceIsDone } from "@/lib/regenerate-predicates";

// Hoisted mocks — Plan 23-02 vi.hoisted + vi.mock + dynamic-import pattern (PATTERNS.md §7)
const { mockRegenerateCoverLetter, mockRegenerateTailoredResume, mockRegenerateSalaryIntelligence, mockFetchJobDetail } = vi.hoisted(() => ({
  mockRegenerateCoverLetter: vi.fn(),
  mockRegenerateTailoredResume: vi.fn(),
  mockRegenerateSalaryIntelligence: vi.fn(),
  mockFetchJobDetail: vi.fn(),
}));

vi.mock("@/lib/job-actions", () => ({
  regenerateCoverLetter: mockRegenerateCoverLetter,
  regenerateTailoredResume: mockRegenerateTailoredResume,
  regenerateSalaryIntelligence: mockRegenerateSalaryIntelligence,
  fetchJobDetail: mockFetchJobDetail,
}));
```

**Fake-timer setup pattern** (analog lines 32-40 — PRESERVE VERBATIM):

```typescript
beforeEach(() => {
  vi.useFakeTimers();
  mockRegenerateCoverLetter.mockClear();
  mockRegenerateTailoredResume.mockClear();
  mockRegenerateSalaryIntelligence.mockClear();
  mockFetchJobDetail.mockClear();
});

afterEach(() => {
  vi.useRealTimers();
});
```

**Fixture helper pattern** (from Phase 24 RESEARCH §Pitfall 5 remediation — NEW scaffold needed):

```typescript
const DEFAULT_BASELINE = "2026-04-20T00:00:00.000Z";
const NEWER_DATE = "2026-04-22T14:00:00.000Z";

function renderCoverLetter(props: Partial<RegenerateButtonProps> = {}) {
  return rtlRender(
    <RegenerateButton
      jobId={1}
      artifact="cover_letter"
      label="Regenerate cover letter"
      action={mockRegenerateCoverLetter}
      isDone={coverLetterIsDone}
      baselineGeneratedAt={DEFAULT_BASELINE}
      {...props}
    />,
  );
}
function renderTailoredResume(props: Partial<RegenerateButtonProps> = {}) { /* same shape, artifact="tailored_resume" */ }
function renderSalaryIntelligence(props: Partial<RegenerateButtonProps> = {}) { /* same shape, artifact="salary_intelligence", baselineGeneratedAt="2026-04-20" */ }
```

**17 ported test cases** (analog lines 42-307 — describe block "RegenerateCoverLetterButton — behavior (AI-ACTION-04 + D-06 amended)"):
- Each test rewrites the `render(<RegenerateCoverLetterButton .../>)` call to `renderCoverLetter({ ... })`.
- Test names stay identical (the contract is unchanged for cover_letter).
- Specifically port lines 42-74 (render + click), 76-96 (aria-busy G-1), 98-126 (3s polling), 128-168 (UPDATE-wait predicate), 170-200 (server-baseline precedence), 202-228 (prop-baseline INSERT-wait fallback), 257-284 (unmount cleanup Pitfall 6), 286-307 (4-sentinel it.each G-3).

**Critical rewrite — the 60-poll cap test** (analog lines 230-255): this test's ASSERTION CHANGES for Phase 24. Pre-rename asserts `Error: unavailable`; Phase 24 asserts `silent-success` helper copy.

```typescript
// ANALOG (pre-rename, lines 230-255): asserts Error: unavailable
// POST-PORT (Phase 24 D-06): asserts the verbatim silent-success copy — no more "Error: unavailable"
it("shows silent-success on webhook ok=true + 60-poll exhaustion (AI-ACTION-07)", async () => {
  mockRegenerateCoverLetter.mockResolvedValue({ ok: true, baseline: DEFAULT_BASELINE });
  mockFetchJobDetail.mockResolvedValue({ cover_letter: { generated_at: DEFAULT_BASELINE } });
  const { getByRole, getByText, queryByText } = renderCoverLetter({ jobId: 1 });
  await act(async () => { fireEvent.click(getByRole("button")); });
  for (let i = 0; i < 60; i++) {
    await act(async () => { await vi.advanceTimersByTimeAsync(3000); });
  }
  // G-8 verbatim assertion:
  expect(
    getByText("Regeneration reported success but no new content was written — check n8n logs."),
  ).toBeInTheDocument();
  // Mutual exclusion assertion (D-06):
  expect(queryByText("Error: unavailable")).not.toBeInTheDocument();
  expect(getByRole("button")).not.toBeDisabled();  // re-enables for retry
});
```

**NEW describe block: tailored-resume variant** — clone the 17-case happy-path flow using `renderTailoredResume` + `mockRegenerateTailoredResume` + `mockFetchJobDetail.mockResolvedValue({ tailored_resume: { generated_at: NEWER_DATE } })`.

**NEW describe block: salary-intelligence variant** — same shape but use YYYY-MM-DD date strings:
```typescript
const SALARY_BASELINE = "2026-04-20";
const SALARY_NEWER = "2026-04-21";
// mockFetchJobDetail.mockResolvedValue({ salary_intelligence: { search_date: SALARY_NEWER } })
```

**NEW: same-day salary rough-edge test** (D-07 explicit):
```typescript
it("salary_intelligence same-day regenerate triggers silent-success (known rough edge, Pitfall 1)", async () => {
  const today = "2026-04-23";
  mockRegenerateSalaryIntelligence.mockResolvedValue({ ok: true, baseline: today });
  mockFetchJobDetail.mockResolvedValue({ salary_intelligence: { search_date: today } });  // no advance
  const { getByRole, getByText } = renderSalaryIntelligence({ jobId: 1, baselineGeneratedAt: today });
  await act(async () => { fireEvent.click(getByRole("button")); });
  for (let i = 0; i < 60; i++) {
    await act(async () => { await vi.advanceTimersByTimeAsync(3000); });
  }
  expect(getByText("Regeneration reported success but no new content was written — check n8n logs.")).toBeInTheDocument();
});
```

**Grep gate tests** (analog lines 310-338 — G-1, G-2, G-5, G-6 on `regenerate-cover-letter-button.tsx`; RETARGET to `regenerate-button.tsx`):

```typescript
describe("regenerate-button.tsx — UI-SPEC grep gates (inherited + extended + new)", () => {
  const BTN_PATH = path.join(process.cwd(), "src/app/(admin)/admin/jobs/regenerate-button.tsx");  // RETARGET per D-01 + D-10
  const btnSource = readFileSync(BTN_PATH, "utf-8");

  it("G-1: aria-busy attribute is present", () => { expect(btnSource).toMatch(/aria-busy=\{/); });
  it("G-2: no raw Tailwind color classes", () => {
    expect(btnSource).not.toMatch(/(text|bg|border)-(red|amber|yellow|green|emerald|orange|blue|gray|zinc|slate)-\d/);
  });
  it("G-6 (extended): Date.now() does not appear in regenerate-button.tsx (D-10)", () => {
    const matches = (btnSource.match(/Date\.now\(\)/g) || []).length;
    expect(matches).toBe(0);
  });
  it("G-8 (NEW): silent-success copy appears EXACTLY ONCE verbatim (D-10)", () => {
    const copy = "Regeneration reported success but no new content was written — check n8n logs.";
    const matches = btnSource.split(copy).length - 1;
    expect(matches).toBe(1);
  });
  // G-5 has moved to mount-site tests (3 labels at 3 different call sites — the shared component no longer owns a label literal)
});
```

---

### 8. `src/__tests__/lib/job-actions.regenerate.test.ts` (NEW — D-08)

**Role:** Server Action contract test (Vitest with hoisted mocks).
**Data Flow:** request-response.

**Closest Analog:** `src/__tests__/lib/job-actions.trigger.test.ts` (Plan 23-02 — CITED Phase 24 RESEARCH §Sources; covers the ORIGINAL 2 actions — `triggerCompanyResearch` + `regenerateCoverLetter`; this NEW file covers the 2 NEW actions using identical shape).

**Imports + hoisted mocks pattern** (analog lines 1-54 — PRESERVE VERBATIM with identical mock names):

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockRequireRole, mockSendSignedWebhook, mockGetJobDetail, mockRevalidatePath,
} = vi.hoisted(() => ({
  mockRequireRole: vi.fn().mockResolvedValue({ user: { role: "owner" } }),
  mockSendSignedWebhook: vi.fn(),
  mockGetJobDetail: vi.fn(),
  mockRevalidatePath: vi.fn(),
}));

vi.mock("@/lib/session", () => ({ requireRole: mockRequireRole }));
vi.mock("@/lib/webhooks", () => ({ sendSignedWebhook: mockSendSignedWebhook }));
vi.mock("@/lib/jobs-db", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getJobDetail: mockGetJobDetail,
}));
vi.mock("next/cache", () => ({ revalidatePath: mockRevalidatePath }));

beforeEach(() => {
  mockRequireRole.mockClear().mockResolvedValue({ user: { role: "owner" } });
  mockSendSignedWebhook.mockClear();
  mockGetJobDetail.mockClear();
  mockRevalidatePath.mockClear();
});

const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
```

**Per-action 5-case pattern** (analog lines 107-175 — `regenerateCoverLetter` describe block is the CLONE template):

For each of `regenerateTailoredResume` + `regenerateSalaryIntelligence`, clone these 5 cases with the appropriate swap:

| Case # | Behavior | Swap vs cover_letter |
|--------|----------|---------------------|
| 1 | `returns { ok: true, baseline } with server-read <field>` | `getJobDetail` returns `{ tailored_resume: { generated_at: ... } }` or `{ salary_intelligence: { search_date: ... } }`; webhook path asserted as `"regenerate-tailored-resume"` or `"regenerate-salary-intelligence"` |
| 2 | `returns { ok: true, baseline: null } when job has no <artifact> yet` | `mockGetJobDetail.mockResolvedValue({ tailored_resume: null })` etc. |
| 3 | `returns { ok: false, sentinel } and does NOT throw when webhook fails after baseline read` | Identical shape; sentinel value cycled through the 4-value union |
| 4 | `returns { ok: false, sentinel: 'unavailable' } when DB read throws — sendSignedWebhook never called (T-23-02-05)` | `mockGetJobDetail.mockRejectedValue(new Error("ETIMEDOUT"))` |
| 5 | `rejects non-owner via requireRole — neither getJobDetail nor sendSignedWebhook fire` | Identical |

**Template — case 1 for regenerateTailoredResume** (clone of analog lines 108-129):

```typescript
describe("regenerateTailoredResume — Server Action contract (AI-ACTION-05)", () => {
  it("returns { ok: true, baseline } with server-read tailored_resume.generated_at", async () => {
    const serverBaseline = "2026-04-20T12:34:56.000Z";
    mockGetJobDetail.mockResolvedValue({
      tailored_resume: { generated_at: serverBaseline, content: "x", model_used: null },
    });
    mockSendSignedWebhook.mockResolvedValue({ ok: true });

    const { regenerateTailoredResume } = await import("@/lib/job-actions");
    const result = await regenerateTailoredResume(42);

    expect(result).toEqual({ ok: true, baseline: serverBaseline });
    expect(mockSendSignedWebhook).toHaveBeenCalledWith(
      "regenerate-tailored-resume",  // D-03 webhook path
      { job_id: 42 },
      expect.stringMatching(UUID_V4_REGEX),
    );
    expect(mockRevalidatePath).toHaveBeenCalledWith("/admin/jobs");
  });
  // ... 4 more cases per table above
});

describe("regenerateSalaryIntelligence — Server Action contract (AI-ACTION-06)", () => {
  // SAME SHAPE — use search_date (YYYY-MM-DD string, D-04); path "regenerate-salary-intelligence"
});
```

**Dynamic-import pattern** (analog line 119 — `const { X } = await import("@/lib/job-actions")`): MUST use dynamic import AFTER `vi.mock` calls — hoisting requires the actual module to load after mocks are installed.

---

### 9. Test file extensions (job-detail-sheet.test.tsx + 2 section tests)

**Role:** component test (existing files — add assertions).
**Data Flow:** request-response.

**Closest Analog:** existing grep-gate assertions in each file (G-4 pattern — readFileSync-based guards from Plan 23-06).

**job-detail-sheet.test.tsx delta:**
- Update G-4 regex from `<RegenerateCoverLetterButton` → `<RegenerateButton artifact="cover_letter"`.
- Add new `SalaryIntelligenceSection jobId={detail.id}` prop-threading assertion (per Pitfall 4 A4).
- Verify import line 42 swapped from `./regenerate-cover-letter-button` → `./regenerate-button`.

**tailored-resume-section.test.tsx delta:**
- Add 1 assertion that `<RegenerateButton artifact="tailored_resume">` appears in populated-branch render.
- Verify the button does NOT render in the two empty-state branches (D-09 visibility gate).

**salary-intelligence-section.test.tsx delta:**
- Add `jobId` + `baselineSearchDate` props to every existing render call (existing tests need prop-threading updates; Pitfall 4 A4 says "LOW risk" because tests mock at higher granularity).
- Add 1 assertion for `<RegenerateButton artifact="salary_intelligence">` in populated branch.
- Verify it does NOT render in the 2 empty-state branches.

---

## Shared Patterns (cross-cutting — apply to all relevant plans)

### Pattern A: Phase 23 D-06 Server-Baseline (pre-webhook DB read)

**Source:** `src/lib/job-actions.ts:179-187` (`regenerateCoverLetter` body).
**Apply to:** both new Server Actions in Plan 24-02 (Wave 2).

```typescript
let baseline: string | null = null;
try {
  const detail = await getJobDetail(jobId);
  baseline = detail?.<ARTIFACT>?.<FIELD> ?? null;
} catch {
  return { ok: false, sentinel: "unavailable" };  // T-23-02-05: no webhook fire on DB error
}
// ... webhook call below returns `baseline` in the ok response for client to use
```

**Why locked:** Pitfall 4 Phase 23 (client-clock skew). The baseline originates server-side; client never reads the wall clock; polling compares `new Date(current).getTime() > new Date(baseline).getTime()` where both values came from the server.

---

### Pattern B: Fake-Timer Polling Test Scaffold

**Source:** `src/__tests__/components/regenerate-cover-letter-button.test.tsx:32-40` (beforeEach/afterEach + fake-timer pattern from Plan 23-05 + 23-06).
**Apply to:** `regenerate-button.test.tsx` (all 17 ported + ~12 new cases).

```typescript
beforeEach(() => {
  vi.useFakeTimers();
  // clear all fn mocks
});
afterEach(() => {
  vi.useRealTimers();
});

// Inside tests — advance the 3-second polling clock:
await act(async () => { await vi.advanceTimersByTimeAsync(3000); });

// 60-tick exhaustion loop:
for (let i = 0; i < 60; i++) {
  await act(async () => { await vi.advanceTimersByTimeAsync(3000); });
}
```

**Why locked:** `setInterval(3000)` + 60-cap is the contract from Plan 23-06 Pattern 2. Real timers would make tests take 180s; fake timers run instantly. The `act(async () => await vi.advanceTimersByTimeAsync(...))` wrapper is required because the `.then()` callbacks schedule state updates that React needs to flush.

---

### Pattern C: Discriminated-Union Server Action Return

**Source:** `src/lib/webhooks.ts` `ErrorSentinel` type + `src/lib/job-actions.ts:173-176` return-type signature.
**Apply to:** both new Server Actions.

```typescript
): Promise<
  | { ok: true; baseline: string | null }
  | { ok: false; sentinel: ErrorSentinel }
>
```

**Why locked:** D-08 Phase 23 — Server Actions NEVER throw to the client; the discriminated union is the single error channel. `ErrorSentinel` is a bounded 4-value union (`"timeout" | "auth" | "rate limit" | "unavailable"`) — do NOT expand it for silent-success (Pitfall 2 explicitly rejects a 5th sentinel value).

---

### Pattern D: `requireRole(["owner"])` First-Line Adjacency

**Source:** `src/lib/job-actions.ts:40, 73, 108, 124, 142, 177` (every Server Action begins with this call).
**Apply to:** both new Server Actions (Plan 23-04 CI grep gate auto-validates).

```typescript
export async function regenerateTailoredResume(jobId: number): Promise<...> {
  await requireRole(["owner"]);  // MUST be first statement — D-12 grep gate from Plan 23-04 checks 10-line adjacency
  // ...
}
```

**Why locked:** Plan 23-04 ships a `readFileSync(...)` grep test that parses `job-actions.ts` for every `export async function` and asserts `await requireRole(["owner"])` appears within 10 lines. Placing it as the first statement is the most robust posture. The test auto-validates the 2 new exports on next run without modification.

---

### Pattern E: G-6 + G-8 Grep Gates (Static Verification)

**Source:** `src/__tests__/components/regenerate-cover-letter-button.test.tsx:310-338` (G-1, G-2, G-5, G-6 at 4 assertions).
**Apply to:** `src/__tests__/components/regenerate-button.test.tsx` (retarget file path + extend G-6 + add G-8).

```typescript
describe("regenerate-button.tsx — UI-SPEC grep gates", () => {
  const BTN_PATH = path.join(process.cwd(), "src/app/(admin)/admin/jobs/regenerate-button.tsx");
  const btnSource = readFileSync(BTN_PATH, "utf-8");

  // G-6 extended (D-10): target file is now the shared component
  it("G-6: Date.now() does not appear in regenerate-button.tsx", () => {
    const matches = (btnSource.match(/Date\.now\(\)/g) || []).length;
    expect(matches).toBe(0);
  });

  // G-8 NEW (D-10): silent-success copy verbatim + exactly one occurrence
  it("G-8: silent-success copy appears EXACTLY ONCE verbatim", () => {
    const copy = "Regeneration reported success but no new content was written — check n8n logs.";
    expect(btnSource.split(copy).length - 1).toBe(1);
  });
});
```

**Why locked:** G-6 prevents client-clock skew regressions (D-06 Phase 23 / Pitfall 4). G-8 prevents verbatim-copy drift — the literal SC #3 string is part of the owner-committed contract; a renamed variable or punctuation swap silently degrades the AI-ACTION-07 UX. Two-prong enforcement (source-grep + DOM assertion) catches both coding-time AND test-only drift.

**Em-dash character sensitivity:** U+2014 (`—`, NOT `--`, NOT `-`). Byte-exact grep.

---

### Pattern F: Mount-Inside-Section (Pitfall 4 Recommendation)

**Source:** the `tailored-resume-section.tsx` `FreshnessBadge` + `Copy Tooltip` + `Download PDF` meta row (lines 128-164) — the section OWNS its meta row; the parent sheet just passes `resume` + `jobId` props.
**Apply to:** tailored_resume + salary_intelligence regenerate-button mounts.

**Why:** the alternative (lift buttons to `job-detail-sheet.tsx` inline like CL) would require breaking the section-component encapsulation. The CL mount is inline in the sheet ONLY because no CoverLetterSection component was ever extracted — the asymmetry is historical, not intentional. For tailored_resume + salary_intelligence, the section already owns the meta row, so the button goes there. G-4 boundary assertions split across three files (sheet for CL, each section component for the other two) — planner adapts the test scaffold (Pitfall 4 explicit note).

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| — | — | — | None — Phase 24 is a pattern-extension phase; every file has a direct Phase 23 or Phase 22 analog. The `silent-success` state variant (D-06) is the only net-new UX primitive and even it is structurally identical in shape to the existing `{ kind: "error", sentinel }` terminal state (4-state discriminated union with parallel render branches). |

---

## Metadata

**Analog search scope:**
- `src/app/(admin)/admin/jobs/` — 4 files analyzed (regenerate-cover-letter-button, job-detail-sheet, tailored-resume-section, salary-intelligence-section)
- `src/lib/` — 2 files analyzed (job-actions.ts, score-color.ts)
- `src/__tests__/components/` — 1 file analyzed (regenerate-cover-letter-button.test.tsx — 338 lines / 17 test cases)
- `src/__tests__/lib/` — 1 file analyzed (job-actions.trigger.test.ts — 176 lines / 9 test cases)
- Phase 23 context: `.planning/phases/23-.../*` — CONTEXT + SUMMARY + UI-SPEC (transitively via Phase 24 UI-SPEC inheritance)
- Phase 22 context: `.planning/phases/22-.../22-CONTEXT.md` — salary_intelligence schema truth (search_date not generated_at)

**Files scanned:** 10 direct analogs + 3 phase-context docs

**Pattern extraction date:** 2026-04-23

**Pattern-copy posture:** 85% of Phase 24 code is clone-and-rename. The 15% net-new is:
1. `silent-success` state variant + render branch (D-05/D-06) in the shared component
2. 2 new Server Action exports (clones of `regenerateCoverLetter` with 2 swap points each)
3. 2 new section-component mount sites (button placement inside existing `flex items-center gap-3 flex-wrap` meta rows)
4. 1 prop-interface expansion on `SalaryIntelligenceSection` (add `jobId` + `baselineSearchDate`)
5. G-8 grep gate (new; parallel shape to G-6)
