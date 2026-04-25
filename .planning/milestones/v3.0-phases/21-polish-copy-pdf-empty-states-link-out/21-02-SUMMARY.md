---
phase: 21
plan: 02
subsystem: runtime-validation + schema-drift-guard
tags: [zod, schema, tailored-resume, pdf, guardrail, tdd]
dependency_graph:
  requires:
    - 21-01 (ALTER TABLE tailored_resumes ADD COLUMN pdf_data TEXT — live on n8n DB 2026-04-22)
    - 20-03 (parseOrLog + TailoredResumeSchema baseline)
    - 20-08 (schema-drift guard + EXPECTED map pattern)
  provides:
    - TailoredResumeSchema with pdf_data: z.string().nullable() — runtime row shape validation for the new column
    - EXPECTED-map coverage of tailored_resumes.pdf_data — schema-drift guard now enforces the new column on git push
    - 4 new Zod test cases locking in pdf_data null / base64 / wrong-type / missing-field branches
  affects:
    - 21-03 (must populate pdf_data in the raw object inside getJobDetail — schema is .nullable() but REQUIRED, so omitting the key fails safeParse and parseOrLog nulls out the whole tailored_resume field)
tech_stack:
  added: []
  patterns:
    - Runtime validation lock-in — schema extension precedes data-layer wiring (fail-fast on Plan 21-03 wiring bug)
    - Schema-drift EXPECTED-map extension — hudsonfam side of the bi-directional guard (DB side landed in 21-01)
    - .nullable() NOT .nullable().optional() — matches CoverLetterSchema.pdf_data cadence; forces Plan 21-03 to explicitly set the key
key_files:
  created: []
  modified:
    - src/lib/jobs-schemas.ts (added pdf_data: z.string().nullable() to TailoredResumeSchema)
    - scripts/check-jobs-schema.ts (added "pdf_data" to tailored_resumes EXPECTED array)
    - src/__tests__/lib/jobs-db-zod.test.ts (4 new test cases + pdf_data: null added to existing passing tailored_resume test)
decisions:
  - TailoredResumeSchema.pdf_data is REQUIRED (.nullable(), not .nullable().optional()) — this matches CoverLetterSchema.pdf_data (Plan 20-03 precedent); the practical effect is that Plan 21-03 MUST populate pdf_data: null in the raw object built inside getJobDetail, otherwise parseOrLog will null out the whole tailored_resume field under fail-open (D-11). This is intentional — catches wiring bugs at runtime rather than build time
  - EXPECTED map uses the array-ordering convention inherited from Plan 20-08 (id, job_id, content, pdf_data, model_used, generated_at) — insertion order is cosmetic; the set semantics of the check are what matters
  - Updated the existing "accepts a valid tailored_resume with null model_used" test to include pdf_data: null rather than removing it — preserves test coverage for the null-model-used branch, just extends the row shape to the new schema
metrics:
  duration_seconds: 180
  duration_readable: "~3m"
  completed_at: "2026-04-22T13:35:00Z"
  tasks: 1
  commits: 1
  files_changed: 3
  tests_before: 310
  tests_after: 314
---

# Phase 21 Plan 02: Tailored Resume PDF Runtime Validation + Schema-Drift Extension

**Plan 21-02** extends the runtime-validation boundary and the pre-push schema-drift guard to cover the new `tailored_resumes.pdf_data` column that Plan 21-01 landed on the live n8n Postgres.

Three-file, one-line-per-file edit: TailoredResumeSchema gets a `pdf_data: z.string().nullable()` field, the schema-drift EXPECTED map's `tailored_resumes` array grows by one element, and the Zod test suite grows by four cases (plus one updated existing case).

## One-liner

`TailoredResumeSchema` now validates `pdf_data: string | null` at the `getJobDetail` return boundary; pre-push schema-drift guard enforces `tailored_resumes.pdf_data` against the live DB; Zod test suite covers null / base64-string / wrong-type / missing-field branches (314/314 tests green).

## What was built

### 1. `src/lib/jobs-schemas.ts` — TailoredResumeSchema extension

```diff
 export const TailoredResumeSchema = z.object({
   id: z.number(),
   content: z.string(),
+  pdf_data: z.string().nullable(),
   model_used: z.string().nullable(),
   generated_at: z.string(),
 });
```

The file now has exactly 2 occurrences of `pdf_data: z.string().nullable()` — one on `CoverLetterSchema` (line 24, from Plan 20-03) and one on `TailoredResumeSchema` (line 49). Matching cadence intentionally.

### 2. `scripts/check-jobs-schema.ts` — EXPECTED-map extension

```diff
   tailored_resumes: [
-    "id", "job_id", "content", "model_used", "generated_at",
+    "id", "job_id", "content", "pdf_data", "model_used", "generated_at",
   ],
```

Live-DB validation against the n8n cluster Postgres confirmed the column lines up:

```
 column_name
--------------
 id
 job_id
 content
 model_used
 generated_at
 created_at
 pdf_data
(7 rows)
```

The EXPECTED-map's 6 columns are all present; `created_at` is intentionally NOT in EXPECTED per CONTEXT.md D-08 (jobs-db.ts does not SELECT it, so it's not drift-from-our-perspective).

### 3. `src/__tests__/lib/jobs-db-zod.test.ts` — Zod test extension

Added 4 new cases inside the existing `describe("jobs-schemas parseOrLog (fail-open)", ...)` block:

- `"accepts a tailored_resume with pdf_data as null"` — `pdf_data: null` passes safeParse
- `"accepts a tailored_resume with pdf_data as a base64 string"` — `pdf_data: "JVBERi0xLjQKJeLjz9M="` (%PDF-1.4 base64 prefix) passes
- `"rejects a tailored_resume with pdf_data as a non-string non-null value"` — `pdf_data: 123` fails safeParse
- `"rejects a tailored_resume when pdf_data is missing (schema is required, not optional)"` — asserts `result.success === false` and that the issue list contains a `path: ["pdf_data"]` entry

Also updated the existing `"accepts a valid tailored_resume with null model_used"` test to include `pdf_data: null` in its row — the schema change would have broken this test otherwise (the row no longer round-trips through safeParse without the field).

One minor test-infrastructure addition: `import type { ZodIssue } from "zod"` at the top of the file, so the missing-field test's `.find((i: ZodIssue) => i.path.includes("pdf_data"))` call is typed correctly.

## TDD gate sequence

- RED: extended tests written first → focused `vitest run` showed 3 failures (the 2 "reject" cases and the existing test that no longer round-tripped because Zod strips unknown keys by default) ✓
- GREEN: added `pdf_data: z.string().nullable()` to `TailoredResumeSchema` → focused test file 12/12 green; full suite 314/314 green ✓
- REFACTOR: not needed — change is additive, no structural cleanup opportunity ✓

One atomic commit for the whole task (TDD RED → GREEN happened in a single commit per the plan's `tdd="true"` guidance on this simple schema extension).

## Commit

| Task | Type | Hash | Files |
| --- | --- | --- | --- |
| 1 | feat | `586c238` | src/lib/jobs-schemas.ts, scripts/check-jobs-schema.ts, src/__tests__/lib/jobs-db-zod.test.ts |

```
feat(21-02): add pdf_data to TailoredResumeSchema + EXPECTED map
```

## Verification

| Gate | Status | Notes |
| --- | --- | --- |
| `npm test -- src/__tests__/lib/jobs-db-zod.test.ts --run` | 12/12 passing | 8 baseline + 4 new |
| `npm test -- --run` | 314/314 passing | 310 baseline + 4 new; existing tailored_resume test updated in-place (not duplicated) |
| `npm run build` | exit 0 | Only pre-existing warnings (Redis ENOTFOUND, Better Auth env-not-set, next.config.ts NFT) — none introduced by this plan |
| `npm run test:schema` (locally) | exit 0 (skip) | `JOBS_DATABASE_URL` unset locally; guard skips gracefully per Plan 20-08 decision. Real guard runs in pre-push hook context |
| Schema-drift check vs live n8n DB | agrees | Verified directly via `kubectl exec` — `tailored_resumes` has `id, job_id, content, model_used, generated_at, created_at, pdf_data` (7 cols); EXPECTED map (6 cols) is a valid subset |

### Why `npm run test:schema` couldn't run against the live DB from this host

`JOBS_DATABASE_URL` is stored in the hudsonfam k8s secret and points to `postgres-rw.homelab.svc.cluster.local:5432/n8n` — a cluster-internal service name. From outside the K3s cluster, this hostname doesn't resolve. The documented-skip-with-exit-0 branch (Plan 20-08) covers this cleanly: fresh clones and dev hosts without the env var don't fail the check; the real guard fires on push from a host where the URL resolves, or in CI.

As a paranoia check, I did query the live DB directly via `kubectl exec -n homelab postgres-1 -c postgres -- psql ...` and confirmed the `pdf_data` column is present on `tailored_resumes`, so the EXPECTED-map edit is consistent with prod.

## Deviations from Plan

None. Plan was executed as written, three files edited per the exact diffs specified in PLAN.md and `21-RESEARCH.md §"Exact Zod schema diff"` + `§"Exact schema-drift script diff"`.

## Acceptance criteria (from PLAN.md)

- [x] `grep -c "pdf_data: z.string().nullable()" src/lib/jobs-schemas.ts` returns `2` (CoverLetter + TailoredResume) — verified via `Grep` tool (2 matches at lines 24 + 49)
- [x] `grep -n "pdf_data" scripts/check-jobs-schema.ts` returns 2 matches (cover_letters + tailored_resumes arrays) — verified
- [x] `tailored_resumes` EXPECTED array has `"pdf_data"` as 4th element (6 items total, was 5) — verified
- [x] `grep -c "pdf_data" src/__tests__/lib/jobs-db-zod.test.ts` returns ≥4 — returns 10 (4 new test literals + updates to existing row object)
- [x] Focused Zod test file passes (12/12)
- [x] Full suite passes (314/314)
- [x] Production build exits 0
- [x] `npm run test:schema` exits 0 locally (graceful skip) — real guard validated against live DB via direct `kubectl exec` query

## Next

Plan 21-03 (wave 2, serialized after this) now unblocked: it will add `pdf_data` to the raw object built inside `getJobDetail` in `src/lib/jobs-db.ts` and ship the `/api/jobs/[id]/tailored-resume-pdf` Route Handler. If it forgets to populate `pdf_data` in the raw row, the test suite in this plan + the runtime `parseOrLog` fail-open will catch the omission — tailored_resume will null out on the detail sheet, and the Zod drift log will print.

## Self-Check

Verifying file existence and commit integrity:

- src/lib/jobs-schemas.ts: line 49 contains `pdf_data: z.string().nullable(),` → **FOUND**
- scripts/check-jobs-schema.ts: line 38 contains `"id", "job_id", "content", "pdf_data", "model_used", "generated_at"` → **FOUND**
- src/__tests__/lib/jobs-db-zod.test.ts: 4 new tests present (`accepts a tailored_resume with pdf_data as null`, `... as a base64 string`, `rejects ... as a non-string non-null`, `rejects ... when pdf_data is missing`) → **FOUND**
- Commit `586c238`: `git log --oneline --all | grep 586c238` → **FOUND**

## Self-Check: PASSED
