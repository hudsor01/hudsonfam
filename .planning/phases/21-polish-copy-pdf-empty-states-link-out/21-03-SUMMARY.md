---
phase: 21
plan: 03
subsystem: jobs-db-query-layer + pdf-route-handler
tags: [pdf, route-handler, pg-pool, owner-only, nextjs-16-async-params, vi-hoisted]
dependency_graph:
  requires:
    - 21-01 (ALTER TABLE tailored_resumes ADD COLUMN pdf_data TEXT — live on n8n DB 2026-04-22)
    - 21-02 (TailoredResumeSchema.pdf_data z.string().nullable() + EXPECTED map)
    - 20-03 (parseOrLog + nested-artifact-independent validation pattern)
  provides:
    - getTailoredResumePdf(jobId) helper — 6-line verbatim mirror of getCoverLetterPdf
    - TailoredResume.pdf_data interface field (string | null)
    - /api/jobs/[id]/tailored-resume-pdf route handler — owner-only, PDF download
    - tr.pdf_data SELECTed in getJobDetail but scrubbed to null in the detail-view response
    - vi.hoisted() pg-Pool mock pattern for testing jobs-db.ts helpers
  affects:
    - 21-04 (Download anchor will target /api/jobs/[id]/tailored-resume-pdf)
    - AI-ACTION-02 (server-side half delivered; UI anchor in 21-04 closes the requirement end-to-end)
tech_stack:
  added: []
  patterns:
    - Dedicated PDF helper pattern (not embedded in getJobDetail) — keeps large base64 off the detail-sheet wire
    - vi.hoisted() for smuggling mock state across vi.mock() factory hoist
    - Class-based MockPool (not vi.fn arrow) — required for `new pg.Pool()` in the jobs-db singleton
    - Next.js 16 async-params regression test pattern (params: Promise.resolve({...}))
key_files:
  created:
    - src/app/api/jobs/[id]/tailored-resume-pdf/route.ts (31 lines, verbatim clone of cover-letter-pdf/route.ts)
    - src/__tests__/lib/jobs-db-pdf.test.ts (53 lines, 4 helper tests)
    - src/__tests__/api/tailored-resume-pdf-route.test.ts (98 lines, 5 route tests)
  modified:
    - src/lib/jobs-db.ts (SELECT tr.pdf_data, pdf_data: null in detail-view raw obj, TailoredResume interface +pdf_data, new getTailoredResumePdf helper)
decisions:
  - pdf_data is SELECTed in getJobDetail but scrubbed to null in the detail-view response — matches the cover-letter pattern at line 326. The base64 blob (~10KB per row) never rides the detail-sheet wire; the dedicated PDF route is the only transport
  - TailoredResume interface gains pdf_data: string | null to keep the TS shape consistent with the Zod schema that Plan 21-02 locked in. The interface is still hand-maintained (not z.infer) per Plan 20-03 precedent
  - Helper tests mock pg at the module level using vi.hoisted() because jobs-db.ts constructs `new pg.Pool(...)` at import time. A class-based MockPool inside the vi.mock factory is the only shape that satisfies `new` — a plain `vi.fn(() => ({ query }))` arrow throws "is not a constructor" because vi.fn's default implementation isn't a constructor
  - Route-handler tests mock @/lib/session + @/lib/jobs-db at the module level and test the GET export directly against a plain Request + a params: Promise.resolve({ id }) shape. The async-params shape has its own regression test per Pitfall 3
  - Route handler is a BYTE-FOR-BYTE clone of cover-letter-pdf/route.ts with exactly two substitutions — getCoverLetterPdf → getTailoredResumePdf and "cover-letter-job-" → "tailored-resume-job-". No stylistic variance, no additional comments, no added error handling — any divergence would be a maintenance liability
metrics:
  duration_seconds: 240
  duration_readable: "~4m"
  completed_at: "2026-04-22T14:07:00Z"
  tasks: 2
  commits: 2
  files_changed: 4
  tests_before: 314
  tests_after: 323
---

# Phase 21 Plan 03: jobs-db Query Layer + /api/jobs/[id]/tailored-resume-pdf Route

**Plan 21-03** ships the server-side half of AI-ACTION-02. `getJobDetail` now SELECTs `tr.pdf_data` (so the dedicated helper can reuse the pool wiring pattern) but explicitly scrubs the value to `null` in the detail-view response (so the ~10KB base64 blob never rides the detail-sheet wire — matches the cover-letter pattern at line 326). A new `getTailoredResumePdf(jobId)` helper is a 6-line verbatim mirror of `getCoverLetterPdf`. The new `/api/jobs/[id]/tailored-resume-pdf` route handler is a byte-for-byte clone of the cover-letter-pdf route with exactly two substitutions (`getCoverLetterPdf` → `getTailoredResumePdf`, filename `cover-letter-job-` → `tailored-resume-job-`).

## One-liner

`getJobDetail` SELECTs `tr.pdf_data` but nulls it in the response to keep the detail-sheet wire lean; new `getTailoredResumePdf(jobId)` helper + `/api/jobs/[id]/tailored-resume-pdf` route handler serve base64-decoded PDFs with `Content-Type: application/pdf` + `Content-Disposition: attachment; filename="tailored-resume-job-<id>.pdf"` + `Content-Length`, gated by `requireRole(["owner"])` and `parseInt/isNaN` input validation; 9 new tests (4 helper + 5 route) lift the suite to 323/323 green, production build exits 0.

## What was built

### Task 1 — `src/lib/jobs-db.ts` extension + helper tests (commit `21d3462`)

Four edits to `src/lib/jobs-db.ts`:

**1. Interface** — line 76-82:
```diff
 export interface TailoredResume {
   id: number;
   content: string;
+  pdf_data: string | null;
   model_used: string | null;
   generated_at: string;
 }
```

**2. SELECT** — line 306-308 (getJobDetail):
```diff
        tr.id AS tr_id, tr.content AS tr_content,
+       tr.pdf_data AS tr_pdf_data,
        tr.model_used AS tr_model_used,
        tr.generated_at AS tr_generated_at
```

**3. Detail-view raw object** — line 360-373 (inside parseOrLog block):
```diff
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

This is load-bearing. Plan 21-02 made `TailoredResumeSchema.pdf_data` `.nullable()` required (not `.nullable().optional()`) — so omitting the key fails `safeParse` and `parseOrLog` returns `null`, blanking the whole `tailored_resume` field in the detail sheet. Explicitly writing `pdf_data: null` is the correct way to satisfy the schema while keeping the blob off the detail-view wire.

**4. Helper** — appended at line 410 (after `getCoverLetterPdf`, before `getPipelineStats`):
```typescript
export async function getTailoredResumePdf(jobId: number): Promise<string | null> {
  const result = await pool.query(
    "SELECT pdf_data FROM tailored_resumes WHERE job_id = $1",
    [jobId]
  );
  return result.rows[0]?.pdf_data ?? null;
}
```

One new test file `src/__tests__/lib/jobs-db-pdf.test.ts` with 4 cases:

| Test | Branch |
|------|--------|
| returns the base64 string when a row with pdf_data exists | happy path + SQL-text assertion |
| returns null when the row exists but pdf_data is null | nullable column |
| returns null when no row exists | empty rows array |
| propagates pg errors (route handler returns 500) | error bubbles to caller |

The `vi.mock("pg", ...)` factory needs to return a real class (not a `vi.fn()` arrow) because `jobs-db.ts` does `new pg.Pool(...)` at module import — a `vi.fn()` arrow throws "is not a constructor". The pattern settled on:

```typescript
const { mockQuery } = vi.hoisted(() => ({ mockQuery: vi.fn() }));

vi.mock("pg", () => {
  class MockPool {
    query = mockQuery;
  }
  return { default: { Pool: MockPool } };
});
```

`vi.hoisted()` is required because `vi.mock()` factories are lifted above the imports and cannot close over plain top-level `const` references — hoisting-order mismatch throws `ReferenceError: Cannot access 'mockQuery' before initialization`. This is the canonical vitest escape hatch for shared mock state.

### Task 2 — route + tests (commit `734acd5`)

New file `src/app/api/jobs/[id]/tailored-resume-pdf/route.ts` (31 lines) — verbatim clone of `src/app/api/jobs/[id]/cover-letter-pdf/route.ts` with exactly two substitutions:
- `getCoverLetterPdf` → `getTailoredResumePdf`
- `"cover-letter-job-${jobId}.pdf"` → `"tailored-resume-job-${jobId}.pdf"`

```typescript
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

Key properties (all tested):
- `requireRole(["owner"])` is the FIRST line of the handler body — runs BEFORE `parseInt` so an unauthenticated caller cannot even probe the id format (T-21-03-01 mitigation)
- `parseInt + isNaN` guard before the DB call — double-defense for SQL injection on top of the `$1`-bound parameterized helper (T-21-03-03)
- `Content-Length` set explicitly to `String(pdfBuffer.length)` so the browser doesn't re-buffer (T-21-03-02)
- `Content-Disposition: attachment` forces download rather than inline render, defusing PDF-embedded XSS (T-21-03-05 — accepted risk, not exploitable on hudsonfam origin)
- Error bodies are sentinel-only strings (`"No PDF available"`, `"Invalid job ID"`) — no stack traces, no error.message, no internal IPs (T-21-03-04)
- `params: Promise<{ id: string }>` — Next.js 16 async-params shape; preserved literally. A dedicated test asserts this works by passing `{ params: Promise.resolve({ id: "456" }) }` and verifying `getTailoredResumePdf` was called with the integer `456` (Pitfall 3 regression guard)

One new test file `src/__tests__/api/tailored-resume-pdf-route.test.ts` with 5 cases:

| Test | Asserts |
|------|---------|
| returns 200 + PDF headers when pdf_data is present | 200, Content-Type=application/pdf, Content-Disposition filename, Content-Length=9 (decoded "%PDF-1.4\n" bytes) |
| returns 404 when pdf_data is null | 404, body = {error:"No PDF available"} |
| returns 400 on non-numeric id | 400, body = {error:"Invalid job ID"}, helper never called |
| throws when requireRole rejects (non-owner session) | GET rejects with the thrown error, helper never called |
| awaits the params Promise correctly (Next.js 16 async params) | 200, helper called with integer id (not string "456") |

Mocks `@/lib/session` + `@/lib/jobs-db` via the `vi.hoisted() + (...args: unknown[]) => mockFn(...args)` pattern already established by `prod-readiness.test.ts` and `dashboard-actions.test.ts`.

### Helper dir creation

Created `src/app/api/jobs/[id]/tailored-resume-pdf/` — Write auto-creates parent dirs on file creation. The Next.js build verified the route is wired into the manifest (output line `ƒ /api/jobs/[id]/tailored-resume-pdf` alongside the existing cover-letter-pdf sibling).

## Commits

| Task | Type | Hash      | Files |
|------|------|-----------|-------|
| 1    | feat | `21d3462` | `src/lib/jobs-db.ts`, `src/__tests__/lib/jobs-db-pdf.test.ts` |
| 2    | feat | `734acd5` | `src/app/api/jobs/[id]/tailored-resume-pdf/route.ts`, `src/__tests__/api/tailored-resume-pdf-route.test.ts` |

Commit messages:
```
feat(21-03): extend getJobDetail SELECT + add getTailoredResumePdf helper
feat(21-03): add /api/jobs/[id]/tailored-resume-pdf route handler
```

## TDD gate sequence

**Task 1:**
- RED — `npm test -- src/__tests__/lib/jobs-db-pdf.test.ts --run` → 4 failures, all with `TypeError: getTailoredResumePdf is not a function` ✓
- GREEN — 4 jobs-db.ts edits → `npm test -- src/__tests__/lib/jobs-db-pdf.test.ts --run` → 4/4 green; full suite 314 → 318 green ✓
- REFACTOR — not needed ✓

**Task 2:**
- RED — `npm test -- src/__tests__/api/tailored-resume-pdf-route.test.ts --run` → vitest fails to resolve the `@/app/api/jobs/[id]/tailored-resume-pdf/route` module (doesn't exist yet) ✓
- GREEN — route file created → focused 5/5 green; full suite 318 → 323 green; `npm run build` exits 0 ✓
- REFACTOR — not needed ✓

Two false-start iterations during Task 1 RED were documented inline (not as deviations — they were mock-infrastructure adjustments, not production code issues):
1. First attempt used `vi.fn(() => ({ query: mockQuery }))` as the Pool constructor — threw `is not a constructor`. Fixed to a real `class MockPool`.
2. Second attempt declared `class MockPool` at module top-level referenced inside `vi.mock("pg", ...)` factory — threw `ReferenceError: Cannot access 'MockPool' before initialization` because the factory is hoisted above the class declaration. Fixed by moving the class declaration INSIDE the factory closure and sharing `mockQuery` via `vi.hoisted()`.

Both fixes happened before any RED green or any production-code edit — they're part of "getting the RED test to fail for the RIGHT reason" (the helper not existing), not deviations.

## Verification

| Gate | Status | Notes |
|------|--------|-------|
| `npm test -- src/__tests__/lib/jobs-db-pdf.test.ts --run` | 4/4 passing | Helper branch coverage |
| `npm test -- src/__tests__/api/tailored-resume-pdf-route.test.ts --run` | 5/5 passing | Route handler branch coverage |
| `npm test -- --run` | 323/323 passing | 314 baseline + 4 helper + 5 route |
| `npm run build` | exit 0 | `ƒ /api/jobs/[id]/tailored-resume-pdf` listed in route manifest |
| No hardcoded Tailwind colors introduced | N/A | No .tsx edits in this plan |
| No new npm deps | verified | `package.json` not modified |
| Schema-drift guard | unchanged | Plan 21-02 already covers the EXPECTED-map entry for tailored_resumes.pdf_data |

### Grep acceptance criteria (Task 1)

| Criterion | Result |
|-----------|--------|
| `grep -n "tr.pdf_data AS tr_pdf_data" src/lib/jobs-db.ts` | exactly 1 match (line 308) |
| `grep -n "pdf_data: null, // Omit large base64" src/lib/jobs-db.ts` | 2 matches (cover_letter at ~326, tailored_resume at ~365) |
| `grep -n "export async function getTailoredResumePdf" src/lib/jobs-db.ts` | exactly 1 match (line 413) |
| `grep -n "SELECT pdf_data FROM tailored_resumes" src/lib/jobs-db.ts` | exactly 1 match (line 415) |
| TailoredResume interface contains `pdf_data: string \| null` | verified |
| jobs-db-pdf.test.ts has 4 `it(` cases | 4/4 |

### Grep acceptance criteria (Task 2)

| Criterion | Result |
|-----------|--------|
| `src/app/api/jobs/[id]/tailored-resume-pdf/route.ts` exists | yes |
| `export async function GET` count | exactly 1 |
| `await requireRole(["owner"]);` is first line of handler body | line 9 |
| `params: Promise<{ id: string }>` | line 7 |
| `filename="tailored-resume-job-${jobId}.pdf"` | line 27 |
| `Content-Length` header | line 28 |
| tailored-resume-pdf-route.test.ts has 5 `it(` cases | 5/5 |

## Deviations from Plan

None. Plan was executed as written. Exact diffs from `21-RESEARCH.md §"Exact jobs-db.ts SELECT diff"` + `§"Exact getTailoredResumePdf helper"` applied verbatim; route handler is a byte-for-byte clone of `cover-letter-pdf/route.ts` with the two specified substitutions.

No Rule 1/2/3 auto-fixes required. The mock-infrastructure iterations in Task 1 RED (documented in TDD gate section) were not deviations — they were test-setup adjustments that happened before any production code was written.

## Threat Flags

None. All files created/modified are either extensions of patterns already threat-modeled (cover-letter-pdf route) or pure query-layer plumbing on tables already in the threat register. No new network endpoints outside the explicit AI-ACTION-02 route, no new auth paths, no new file-system access, no schema changes.

## Next

**Plan 21-04 unblocked (Wave 3):** now has the complete server-side contract for the Download anchor — `<a download href="/api/jobs/{id}/tailored-resume-pdf">` will land real PDF bytes as soon as it ships. AI-ACTION-02 closes end-to-end when 21-04 merges.

**Plan 21-08 (end-to-end UAT):** will `curl -sI -b "<owner-session-cookie>" https://thehudsonfam.com/api/jobs/<id>/tailored-resume-pdf` against `tailored_resume_id = 1` (the row Plan 21-01 proved has `pdf_data` populated) and verify the full header set.

**REQ AI-ACTION-02 traceability:** still open in REQUIREMENTS.md — Plan 21-04 delivers the UI half. ROADMAP Phase 21 plans row for 21-03 flips to `[x]`; AI-ACTION-02 checkbox stays `[ ]` until 21-04 lands the anchor.

## Self-Check

- `src/app/api/jobs/[id]/tailored-resume-pdf/route.ts` → **FOUND** (31 lines)
- `src/__tests__/lib/jobs-db-pdf.test.ts` → **FOUND** (53 lines, 4 `it(` blocks)
- `src/__tests__/api/tailored-resume-pdf-route.test.ts` → **FOUND** (98 lines, 5 `it(` blocks)
- `src/lib/jobs-db.ts` — `getTailoredResumePdf` at line 413, `tr.pdf_data AS tr_pdf_data` at line 308, `pdf_data: null` detail-view scrub at line 365, TailoredResume.pdf_data at line 78 → **FOUND**
- Commit `21d3462` (feat: Task 1) → `git log --oneline | grep 21d3462` → **FOUND**
- Commit `734acd5` (feat: Task 2) → `git log --oneline | grep 734acd5` → **FOUND**

## Self-Check: PASSED
