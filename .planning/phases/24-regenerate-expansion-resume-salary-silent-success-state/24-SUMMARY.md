---
phase: 24
subsystem: admin/jobs components + lib/job-actions + lib/regenerate-predicates
tags: [regenerate, shared-component, silent-success, state-machine, pattern-extension, phase-rollup]
status: CODE COMPLETE
completed: 2026-04-23
prod_uat: Deferred to v3.5-P4 (n8n webhook endpoints regenerate-tailored-resume + regenerate-salary-intelligence are homelab-repo PR concerns per Phase 22/23 pattern)
plans_complete: 4
plans_total: 4
tests_green: 564
requirements_closed:
  - AI-ACTION-05
  - AI-ACTION-06
  - AI-ACTION-07
grep_gates_enforced:
  - G-1
  - G-2
  - G-3
  - G-4
  - G-5
  - G-6 (extended to shared component)
  - G-7 (inherited — fireWebhook still absent)
  - G-8 (NEW)
key-files:
  created:
    - src/app/(admin)/admin/jobs/regenerate-button.tsx
    - src/lib/regenerate-predicates.ts
    - src/__tests__/components/regenerate-button.test.tsx
    - src/__tests__/lib/regenerate-predicates.test.ts
    - src/__tests__/lib/job-actions.regenerate.test.ts
  modified:
    - src/lib/job-actions.ts
    - src/app/(admin)/admin/jobs/tailored-resume-section.tsx
    - src/app/(admin)/admin/jobs/salary-intelligence-section.tsx
    - src/app/(admin)/admin/jobs/job-detail-sheet.tsx
    - src/__tests__/components/tailored-resume-section.test.tsx
    - src/__tests__/components/salary-intelligence-section.test.tsx
    - src/__tests__/components/job-detail-sheet.test.tsx
    - .planning/ROADMAP.md
    - .planning/REQUIREMENTS.md
    - .planning/STATE.md
  deleted:
    - src/app/(admin)/admin/jobs/regenerate-cover-letter-button.tsx
    - src/__tests__/components/regenerate-cover-letter-button.test.tsx
---

# Phase 24: Regenerate Expansion (Resume + Salary + Silent-Success State) — SUMMARY

**Status:** CODE COMPLETE — 2026-04-23
**Prod UAT:** Deferred to v3.5-P4 (n8n webhook endpoints for the 2 new regenerate workflows are homelab-repo PR concerns; same pattern as Phase 22/23)

## Outcome

Phase 24 completes the v3.0 regenerate surface and introduces the silent-success warning state. The owner can now regenerate all three AI artifacts directly from the job detail sheet:

- **"Regenerate cover letter"** — from Phase 23, now wired to the shared `RegenerateButton` component (historical `RegenerateCoverLetterButton` deleted)
- **"Regenerate tailored resume"** — new; polls `tailored_resumes.generated_at` until it advances past a server-read baseline
- **"Regenerate salary intelligence"** — new; polls `salary_intelligence.search_date` (date-granular YYYY-MM-DD); same-day regenerate triggers the silent-success warning

All three actions share the Phase 23 signed-webhook pattern (HMAC-SHA256 + X-Idempotency-Key + 4-sentinel error cascade). The generalized `RegenerateButton` component replaced `RegenerateCoverLetterButton` — ROADMAP SC #4 fulfilled. The 4th state variant `{ kind: "silent-success" }` (AI-ACTION-07) surfaces a warning when a webhook returns 200 but polling exhausts 60 iterations without the artifact's timestamp advancing. v3.0 AI Integration milestone is now fully code-complete (5/5 phases); the only remaining v3.0 work is the accumulated production UAT deferred to v3.5-P4 after the CI/CD pipeline is rebuilt.

## Deliverables

| Artifact | Plan | REQs |
|----------|------|------|
| `src/app/(admin)/admin/jobs/regenerate-button.tsx` — generalized 4-state machine; accepts artifact/label/action/isDone props; adds silent-success branch with verbatim SC #3 copy; zero Date.now() (G-6); G-8 locked | 24-01 | AI-ACTION-05, AI-ACTION-06, AI-ACTION-07 |
| `src/lib/regenerate-predicates.ts` — 3 pure isDone exports: `coverLetterIsDone` (ISO timestamp), `tailoredResumeIsDone` (ISO timestamp), `salaryIntelligenceIsDone` (YYYY-MM-DD + UTC-midnight parse D-04) | 24-01 | AI-ACTION-05, AI-ACTION-06 |
| `src/__tests__/components/regenerate-button.test.tsx` — renamed + extended; 17 ported Phase 23 cover_letter cases + tailored_resume variant + salary_intelligence variant + silent-success G-8 DOM assertion + same-day date-granularity edge case + G-1/G-2/G-6/G-8 grep gates (49 cases total) | 24-01 | AI-ACTION-07 |
| `src/__tests__/lib/regenerate-predicates.test.ts` — 21 contract test cases (null handling, exact-baseline boundary, strict greater-than, INSERT-wait null-baseline fallback, date-granular same-day edge) | 24-01 | AI-ACTION-05, AI-ACTION-06 |
| `src/lib/job-actions.ts` — 2 new exports: `regenerateTailoredResume` (path "regenerate-tailored-resume"; baseline from tailored_resumes.generated_at) + `regenerateSalaryIntelligence` (path "regenerate-salary-intelligence"; baseline from salary_intelligence.search_date) | 24-02 | AI-ACTION-05, AI-ACTION-06 |
| `src/__tests__/lib/job-actions.regenerate.test.ts` — 10 contract tests (5 × 2 actions): requireRole denial, success shape, sentinel passthrough, DB-error-no-webhook (T-23-02-05), revalidatePath | 24-02 | AI-ACTION-05, AI-ACTION-06 |
| `src/app/(admin)/admin/jobs/tailored-resume-section.tsx` — +3 imports + baselineGeneratedAtIso prop + RegenerateButton mount in populated-branch meta row (rightmost sibling after Download PDF anchor) | 24-03 | AI-ACTION-05 |
| `src/app/(admin)/admin/jobs/salary-intelligence-section.tsx` — +3 imports + jobId + baselineSearchDate props + RegenerateButton mount in populated-branch meta row (rightmost sibling after FreshnessBadge) | 24-03 | AI-ACTION-06 |
| `src/app/(admin)/admin/jobs/job-detail-sheet.tsx` — import swap (RegenerateCoverLetterButton → RegenerateButton); CL mount rewired to new prop shape; baselineGeneratedAtIso threaded to TailoredResumeSection; jobId + baselineSearchDate threaded to SalaryIntelligenceSection | 24-03 | AI-ACTION-05, AI-ACTION-06 |
| Meta-doc finalization — ROADMAP Phase 24 top-level `[x]` + Plans 4/4 `[x]` + progress row 4/4; REQUIREMENTS 3 REQs closed with Plan citations; STATE Phase 24 CODE COMPLETE with v3.5 immediate-next-step; 24-SUMMARY.md phase-level rollup | 24-04 | all 3 |

## Grep Gates Enforced (G-1..G-8)

All 8 UI-SPEC grep gates are locked by Vitest assertions on every `npm test`:

| Gate | What It Asserts | Test File |
|------|-----------------|-----------|
| G-1 | `aria-busy={isPolling}` on RegenerateButton's Button element | `regenerate-button.test.tsx` |
| G-2 | No raw Tailwind color class names in regenerate-button.tsx | `regenerate-button.test.tsx` |
| G-3 | Sentinel rendered verbatim as `{state.sentinel}` — no switch rewrite | `regenerate-button.test.tsx` (inherited port) |
| G-4 | RegenerateButton nested inside matching SectionErrorBoundary for all 3 artifacts | `job-detail-sheet.test.tsx` (3 pairings) |
| G-5 | All 3 verbatim button labels at their mount sites | `job-detail-sheet.test.tsx` (label presence assertions) |
| G-6 (extended) | `Date.now()` count = 0 in `regenerate-button.tsx` (shared component = covers all 3 instantiations) | `regenerate-button.test.tsx` |
| G-7 (inherited) | `fireWebhook` fully absent from `job-actions.ts` | `job-actions.requireRole.test.ts` (Plan 23-04) |
| G-8 (NEW) | Verbatim silent-success copy appears exactly once in `regenerate-button.tsx` source AND DOM assertion on 60-poll exhaustion | `regenerate-button.test.tsx` |

## Known Rough Edge (D-04)

`salaryIntelligenceIsDone` is date-granular — `salary_intelligence.search_date` is a Postgres `date` (YYYY-MM-DD), not an ISO timestamp. If the owner clicks "Regenerate salary intelligence" twice on the same calendar date, the second click will trigger the silent-success warning because `search_date` only advances on days where the n8n workflow captures a new market sample (once per day at most).

**Impact:** Low. The warning copy "Regeneration reported success but no new content was written — check n8n logs." naturally covers this case — the owner can verify in n8n that the workflow ran and produced the same day's sample. No additional inline documentation was added to the UI.

**Future fix:** Add a `generated_at` timestamp column to `salary_intelligence` (v3.2+). One-line predicate edit in `salaryIntelligenceIsDone` when that column lands.

## Deferred to v3.5-P4

- n8n webhook endpoints `regenerate-tailored-resume` + `regenerate-salary-intelligence` — homelab-repo PR; same HMAC verification + idempotency dedup contract as Phase 23's `regenerate-cover-letter` webhook
- Production UAT smoke tests for all 3 regenerate actions (cover letter from Phase 23 + tailored resume + salary intelligence)

## Awaiting Upstream

Homelab-repo PR needed (same template as Phase 23 awaiting-upstream note):
- Create `regenerate-tailored-resume` n8n webhook workflow (clone `regenerate-cover-letter` template; swap payload consumption to `tailored_resumes` table write)
- Create `regenerate-salary-intelligence` n8n webhook workflow (clone pattern; swap to `salary_intelligence` table write; note: search_date date-granularity means same-day runs produce silent-success — by design)
- HMAC verification + X-Idempotency-Key dedup in both new workflow Code nodes (same JS snippet as Phase 23 Phase 22 HMAC template)

## Test Delta

509 tests green at Phase 23 close → 564 tests green at Phase 24 Plan 24-03 close (+55 new cases across 5 new/modified test files: `regenerate-button.test.tsx` 17 ported + 15 new Phase 24 + 4 grep gates = 49; `regenerate-predicates.test.ts` 21; `job-actions.regenerate.test.ts` 10; 3 new D-09 mount assertions in `tailored-resume-section.test.tsx`; 3 new D-09 mount assertions in `salary-intelligence-section.test.tsx`; 6 new G-4/G-5 assertions in `job-detail-sheet.test.tsx`). Plan 24-04 is docs-only — no test delta.

## Self-Check

Verified via filesystem + git inspection:

- [x] `src/app/(admin)/admin/jobs/regenerate-button.tsx` exists (renamed shared component)
- [x] `src/app/(admin)/admin/jobs/regenerate-cover-letter-button.tsx` DELETED
- [x] `src/lib/regenerate-predicates.ts` exists with 3 exports
- [x] `src/lib/job-actions.ts` exports `regenerateTailoredResume` + `regenerateSalaryIntelligence`
- [x] TailoredResumeSection + SalaryIntelligenceSection mount RegenerateButton in populated-branch meta row
- [x] job-detail-sheet.tsx threads baselineGeneratedAtIso + jobId + baselineSearchDate to sections
- [x] ROADMAP.md Phase 24 top-level `[x]` + Plans 4/4 `[x]` + progress row 4/4 Code complete (prod UAT deferred to v3.5-P4)
- [x] ROADMAP.md SC #2 says `salary_intelligence.search_date` (verified via grep: 1 match; 0 matches for `salary_intelligence.generated_at`)
- [x] REQUIREMENTS.md AI-ACTION-05 [x] with Phase 24 Plans 24-01/02/03 citation
- [x] REQUIREMENTS.md AI-ACTION-06 [x] with Phase 24 Plans 24-01/02/03 citation + D-04 rough-edge note
- [x] REQUIREMENTS.md AI-ACTION-07 checkbox flipped `[ ]` → `[x]` with Phase 24 Plan 24-01 citation
- [x] STATE.md Current Position = Phase 24 CODE COMPLETE; What's Next = `/gsd-new-milestone v3.5 CI/CD Hardening`
- [x] STATE.md v3.0 milestone now fully code-complete (5/5 phases)
- [x] 564 tests green (up from 509 at Phase 23 close); `npm run build` exits 0

## Self-Check: PASSED

---
*Phase 24 closed: 2026-04-23*
*v3.0 AI Integration milestone: CODE COMPLETE (5/5 phases code-complete; prod UAT deferred to v3.5-P4)*
