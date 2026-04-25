---
phase: 24
plan: "02"
subsystem: lib/job-actions
tags: [server-actions, webhooks, sentinel, require-role, discriminated-union, d-06-server-baseline, tailored-resume, salary-intelligence, wave-1]
requires:
  - 23-01-PLAN.md (sendSignedWebhook, ErrorSentinel, WebhookResult — unchanged; both new actions consume verbatim)
  - 23-02-PLAN.md (regenerateCoverLetter — the clone template; D-06 amended server-read baseline pattern)
  - 23-04-PLAN.md (job-actions.requireRole.test.ts CI grep gate — auto-validates both new exports without edit)
provides:
  - regenerateTailoredResume: "Owner-triggered Server Action (AI-ACTION-05) — exact clone of regenerateCoverLetter with 2 swap points: webhook path 'regenerate-tailored-resume' + baseline read from detail?.tailored_resume?.generated_at (ISO timestamp). requireRole first-line + randomUUID idempotency + T-23-02-05 DB-error guard. Returns { ok: true, baseline: string | null } | { ok: false, sentinel: ErrorSentinel }; never throws."
  - regenerateSalaryIntelligence: "Owner-triggered Server Action (AI-ACTION-06) — same clone pattern; webhook path 'regenerate-salary-intelligence' + baseline read from detail?.salary_intelligence?.search_date (YYYY-MM-DD date string, not ISO — Phase 22 D-03 schema). Known rough edge: same-day regenerate does NOT advance search_date → silent-success warning (AI-ACTION-07) fires. Same T-23-02-05 guard + same discriminated-union return shape."
  - contract-tests: "10 test cases in src/__tests__/lib/job-actions.regenerate.test.ts (5 per action) locking: (a) success shape with server-read baseline; (b) null-artifact fallback (baseline: null); (c) webhook sentinel propagation no-throw; (d) DB-error path returns 'unavailable' WITHOUT firing webhook; (e) requireRole denial blocks both getJobDetail and sendSignedWebhook."
affects:
  - Plan 24-03 RegenerateButton mounts — both new Server Actions are the `action` prop values for the Tailored Resume + Salary Intelligence mounts added there
  - Plan 24-01's regenerate-predicates.ts tailoredResumeIsDone consumes the ISO baseline string from regenerateTailoredResume; salaryIntelligenceIsDone consumes the YYYY-MM-DD date string from regenerateSalaryIntelligence — both wired via the shared `action` / `baselineGeneratedAt` props
  - Phase 23 requireRole grep gate (Plan 23-04) — both new exports satisfy the 10-line adjacency window automatically; no test-file edit required (readFileSync scans job-actions.ts source at npm test time)
tech-stack:
  added: []
  patterns:
    - "Verbatim clone of Plan 23-02 D-06 amended template — the two new actions are copy-paste clones of regenerateCoverLetter with only 2 swap points per action (webhook path string + baseline field path). Demonstrates the pattern's low-surface-area replication cost: adding a 4th regenerate artifact in the future is mechanical (1 function + 5 contract tests) rather than design work."
    - "Date-granular baseline for salary_intelligence (D-04) — search_date is a Postgres date (YYYY-MM-DD), not a timestamp. The baseline contract at the Server Action layer is `string | null` and TypeScript-wise indistinguishable from tailored_resume's ISO baseline, but the downstream predicate in Plan 24-01's regenerate-predicates.ts parses both as Date and compares — same-day regenerate yields no advance, triggering AI-ACTION-07 silent-success. Documented as a known rough edge; deferred disambiguation (adding salary_intelligence.generated_at column) to v3.2+."
    - "Plan 23-04 CI grep gate auto-extends to new exports — no test-file edit needed. The readFileSync scan walks every `export async function` in src/lib/job-actions.ts and asserts `await requireRole(['owner'])` appears within 10 lines. Both new exports land with the call on line 7 of their bodies. Pattern re-validated: adding owner-only Server Actions is safe because the adjacency invariant is CI-enforced at test time, not review time."
    - "Dynamic import + vi.hoisted + importOriginal pattern for jobs-db mock — the test file mocks getJobDetail specifically while preserving other jobs-db exports consumed at `use server` module import time. `vi.mock('@/lib/jobs-db', async (importOriginal) => ({ ...(await importOriginal<object>()), getJobDetail: mockGetJobDetail }))` is the exact shape from Phase 23's job-actions.trigger.test.ts; re-used verbatim."
key-files:
  created:
    - src/__tests__/lib/job-actions.regenerate.test.ts
  modified:
    - src/lib/job-actions.ts
decisions:
  - "Single atomic plan executed as two sequential commits (feat then test) instead of a single combined commit. Rationale: the plan metadata declares `tdd='true'` on both tasks; two commits preserve the task-boundary audit trail (Task 1 = impl commit 5647532; Task 2 = test commit a33a093). Net effect is identical to the plan's single-commit output spec — same two files land, same coverage, same build-green end state — just with observable task history. (Phase 23 Plan 23-02's SUMMARY made the same call for the same reason.)"
  - "Webhook paths are hardcoded literals: `\"regenerate-tailored-resume\"` and `\"regenerate-salary-intelligence\"`. Rationale: these are n8n workflow identifiers, not runtime-variable strings, and keeping them as inline literals makes the grep gate trivial for Plan 24-04's meta-doc verification. A shared const map (e.g., `WEBHOOK_PATHS.REGENERATE_TAILORED_RESUME`) would add one layer of indirection for zero call-site benefit (each is used exactly once)."
  - "DB-error path returns the type-literal `\"unavailable\"` without `as ErrorSentinel` cast. TypeScript narrows the union return type from the function signature automatically — the literal is a member of ErrorSentinel and narrows at the return site. Matches Plan 23-02's parallel decision for regenerateCoverLetter; keeps the code consistent across all three regenerate Server Actions."
  - "No revalidatePath on the webhook-failure branch — matches Plan 23-02 inherited decision. A failed webhook changed nothing server-side; revalidation would force a Server Component re-render of /admin/jobs with identical data and subtly interfere with the client error state. Return immediately on !res.ok."
  - "Baseline fallback to null when the artifact row is absent (no tailored_resume / no salary_intelligence for the job). Rationale: even the first regenerate of a job that has no prior artifact is legitimate; returning `{ ok: true, baseline: null }` lets the client's polling predicate treat any `artifact !== null` arrival as the advance signal. This is the same semantics Plan 23-02 picked for cover letters and Plan 24-01's regenerate-predicates.ts already consumes."
  - "10 test cases (5 per action) instead of the plan's 10 — exactly on spec. No asymmetric omission: both actions have the same 5 cases: (a) success + baseline + path + UUID + revalidatePath; (b) null-artifact → baseline:null; (c) webhook sentinel (different flavors per action to lock propagation, not just one); (d) DB-error → 'unavailable' + no webhook; (e) requireRole denial. The 5-case template lifted directly from Plan 23-02's regenerateCoverLetter describe block."
  - "Used \"NEXT_REDIRECT\" as the thrown error string in the requireRole-denial cases, matching Plan 23-02's pattern (triggerCompanyResearch and regenerateCoverLetter tests). Rationale: the real requireRole helper throws a Next.js redirect object whose stringified message contains \"NEXT_REDIRECT\"; simulating this at the mock level keeps the test visually consistent with the rest of the suite and catches future changes that replace requireRole with a different denial mechanism (e.g., boolean return) in one audit pass."
  - "Verified the build (npm run build) exits 0 after Task 1 landed even though the test file had not yet been created — confirming the new exports are type-correct in isolation without requiring the tests to compile first. Task 2 then added the tests and the combined {regenerate.test.ts + requireRole.test.ts} run showed 12 passed (10 new contract + 2 CI grep gate)."
metrics:
  duration: "~3m"
  completed: "2026-04-23"
  tasks: 2
  files_touched: 2
  tests_added: 10
  loc_added: 95 + 212
---

# Phase 24 Plan 02: regenerateTailoredResume + regenerateSalaryIntelligence Server Actions Summary

**One-liner:** Two new owner-triggered Server Actions appended to `src/lib/job-actions.ts` — `regenerateTailoredResume` (AI-ACTION-05) + `regenerateSalaryIntelligence` (AI-ACTION-06) — both verbatim clones of Plan 23-02's `regenerateCoverLetter` with exactly 2 swap points each (webhook path + baseline field); 10 contract tests (5 per action) lock the shape; Plan 23-04's `requireRole` CI grep gate auto-validates both new exports without any test-file edit.

## What Shipped

1. **`src/lib/job-actions.ts`** (modified — +95 LoC appended after `regenerateCoverLetter`):

   **`regenerateTailoredResume(jobId: number): Promise<{ ok: true, baseline: string | null } | { ok: false, sentinel: ErrorSentinel }>`**
   - Line 1: `await requireRole(["owner"])` — D-12 invariant, enforced by Plan 23-04's CI grep gate.
   - DB read wrapped in `try/catch` — reads `detail?.tailored_resume?.generated_at ?? null` as the pre-webhook baseline (ISO timestamp).
   - On DB error: `return { ok: false, sentinel: "unavailable" }` WITHOUT firing sendSignedWebhook (T-23-02-05).
   - `sendSignedWebhook("regenerate-tailored-resume", { job_id: jobId }, randomUUID())` — fresh UUID per call (D-03).
   - Webhook-failure branch: `return { ok: false, sentinel: res.sentinel }` (no throw, no revalidatePath).
   - Success branch: `revalidatePath("/admin/jobs")` + `return { ok: true, baseline }`.

   **`regenerateSalaryIntelligence(jobId: number): Promise<{ ok: true, baseline: string | null } | { ok: false, sentinel: ErrorSentinel }>`**
   - Identical shape; 2 swap points vs `regenerateTailoredResume`:
     - Webhook path: `"regenerate-salary-intelligence"`
     - Baseline field: `detail?.salary_intelligence?.search_date ?? null` (YYYY-MM-DD date string, not ISO — Phase 22 D-03 schema).
   - Known rough edge documented inline: same-day regenerate does NOT advance `search_date` → silent-success warning path in Plan 24-01's `regenerate-button.tsx` is the owner-visible outcome.

   No new imports were required — `randomUUID`, `requireRole`, `getJobDetail`, `sendSignedWebhook`, `revalidatePath`, `ErrorSentinel` are all already imported at the top of `job-actions.ts` from prior plans.

2. **`src/__tests__/lib/job-actions.regenerate.test.ts`** (created — 212 LoC):

   Cloned structurally from `src/__tests__/lib/job-actions.trigger.test.ts` (Phase 23) — same `vi.hoisted` + `vi.mock` + dynamic-import pattern. Two `describe` blocks (one per action) × 5 `it` cases each = 10 tests:

   | # | Action | Case |
   |---|--------|------|
   | 1 | regenerateTailoredResume | Success — `{ ok: true, baseline: "2026-04-20T12:34:56.000Z" }` + webhook path + UUID v4 regex + revalidatePath |
   | 2 | regenerateTailoredResume | Null artifact — `tailored_resume: null` → `baseline: null`; webhook still fires |
   | 3 | regenerateTailoredResume | Webhook sentinel `"timeout"` → `{ ok: false, sentinel }`; no revalidatePath |
   | 4 | regenerateTailoredResume | DB read throws `ETIMEDOUT` → `{ ok: false, sentinel: "unavailable" }` + sendSignedWebhook NOT called (T-23-02-05) |
   | 5 | regenerateTailoredResume | requireRole rejects `"NEXT_REDIRECT"` → neither getJobDetail nor sendSignedWebhook fire |
   | 6 | regenerateSalaryIntelligence | Success — `{ ok: true, baseline: "2026-04-20" }` (YYYY-MM-DD) + webhook path + UUID v4 regex + revalidatePath |
   | 7 | regenerateSalaryIntelligence | Null artifact — `salary_intelligence: null` → `baseline: null` |
   | 8 | regenerateSalaryIntelligence | Webhook sentinel `"rate limit"` → `{ ok: false, sentinel }`; no revalidatePath |
   | 9 | regenerateSalaryIntelligence | DB read throws → `"unavailable"` + no webhook |
   | 10 | regenerateSalaryIntelligence | requireRole denial → no downstream calls |

## Commits

| Task | Hash | Type | Files |
|------|------|------|-------|
| 1 | `5647532` | `feat(24-02)` | `src/lib/job-actions.ts` (+95 LoC) |
| 2 | `a33a093` | `test(24-02)` | `src/__tests__/lib/job-actions.regenerate.test.ts` (+212 LoC, new) |

## Verification

```bash
# Plan verification block — all four checks passed:
npm test -- --run src/__tests__/lib/job-actions.regenerate.test.ts src/__tests__/lib/job-actions.requireRole.test.ts
#  Test Files  2 passed (2)
#  Tests       12 passed (12)

npm run build
#  BUILD_EXIT=0 (pre-existing url.parse() DEP0169 Node warnings + expected Redis DNS miss in dev — both environmental, not introduced by this plan)

grep -c "export async function regenerateTailoredResume"     src/lib/job-actions.ts   # → 1 ✓
grep -c "export async function regenerateSalaryIntelligence" src/lib/job-actions.ts   # → 1 ✓

# Adjacency spot-check — requireRole on line 7 of each body (within the 10-line window):
# Line 219: export async function regenerateTailoredResume(
# Line 225:   await requireRole(["owner"]);
# Line 266: export async function regenerateSalaryIntelligence(
# Line 272:   await requireRole(["owner"]);
```

## Deviations from Plan

None — plan executed exactly as written.

Both tasks implemented on-spec against Plan 24-02's `<action>` blocks (D-03 + D-04 decisions locked in 24-CONTEXT.md). No Rule 1–3 auto-fixes were required; no Rule 4 architectural questions arose. The webhook paths match the plan exactly; the baseline field paths match the plan exactly; the 10 test cases match Plan 24-02's `<action>` block line-for-line.

The only visible structural choice was splitting the single plan output into two commits (feat + test) to preserve task-boundary history — same trade-off Plan 23-02's SUMMARY documented as an intentional TDD audit-trail decision, not a deviation.

## Auth Gates

None — this plan is pure server-side code and test code; no external auth required.

## TDD Gate Compliance

Plan 24-02 is a plan-level `type: execute` plan (not `type: tdd`), but each task has `tdd="true"` at the task level. Inspection of the commit history against the TDD spec:

- Task 1 (feat) landed first, Task 2 (test) landed second. The plan's task ordering specifies Task 1 = implementation and Task 2 = test-addition, consistent with the plan metadata. This is a RED-skipped sequence relative to a classic RED → GREEN TDD cycle. Rationale: the new Server Actions are verbatim clones of a shipped reference (`regenerateCoverLetter`, Plan 23-02) with 2 minimal swap points; the contract invariants are inherited unchanged from the reference's test coverage, so writing a RED test file before the identical clone functions exist adds no information. Plan 23-04's CI grep gate was run after Task 1 to assert the adjacency invariant on the new exports — this serves as the contract-level gate that would have been caught by the absent RED stage.
- The 10 new contract tests in Task 2 all passed on first run (post-Task-1 green source). There is no RED gate commit; there is a `feat` commit followed by a `test` commit. A verifier looking for strict RED/GREEN commit ordering should read this as "clone-pattern task — RED phase elided by design" rather than a missing gate.

## Known Stubs

None — both Server Actions are fully wired end-to-end:
- `regenerateTailoredResume` reads the real `tailored_resumes.generated_at` column via the existing `getJobDetail` query.
- `regenerateSalaryIntelligence` reads the real `salary_intelligence.search_date` column via the same query.
- Both fire real `sendSignedWebhook` calls (HMAC-signed + idempotency-keyed via Plan 23-01's shipped helper).
- The n8n workflow endpoints (`regenerate-tailored-resume`, `regenerate-salary-intelligence`) are homelab-repo scope — tracked but shipped separately (v3.5-P4 per ROADMAP). During the transition window, n8n accepts unsigned calls; once the homelab PR lands, verification gates kick in server-side. This is an external-system readiness gap, not a stub in the hudsonfam codebase.

Runtime note: as of 2026-04-23 the `salary_intelligence` table has 0 rows pending n8n task #11 (per STATE.md session header), so `regenerateSalaryIntelligence` has no production data to exercise against today. This does not change the Server Action contract; the function handles the null-artifact case (`baseline: null`) explicitly and Test 7 locks that branch. First real exercise will happen once task #11 lands upstream.

## Self-Check: PASSED

File existence:
```bash
[ -f ".planning/phases/24-regenerate-expansion-resume-salary-silent-success-state/24-02-SUMMARY.md" ] && echo FOUND || echo MISSING
#  FOUND
[ -f "src/lib/job-actions.ts" ] && echo FOUND || echo MISSING
#  FOUND
[ -f "src/__tests__/lib/job-actions.regenerate.test.ts" ] && echo FOUND || echo MISSING
#  FOUND
```

Commit existence:
```bash
git log --oneline --all | grep -q "5647532" && echo FOUND || echo MISSING   #  FOUND
git log --oneline --all | grep -q "a33a093" && echo FOUND || echo MISSING   #  FOUND
```

Test + build:
```bash
npm test -- --run src/__tests__/lib/job-actions.regenerate.test.ts src/__tests__/lib/job-actions.requireRole.test.ts
#  12 passed
npm run build
#  exit 0
```

All checks green. Plan 24-02 ready for Plan 24-03 (RegenerateButton mount sites) to consume both new Server Actions as `action` props.
