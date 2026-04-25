---
phase: 22
slug: salary-intelligence-defensive-render
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-22
---

# Phase 22 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 3.x (happy-dom + @testing-library/react + MSW) |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npm test -- --run src/__tests__/lib/jobs-schemas.test.ts src/__tests__/lib/jobs-db.test.ts src/__tests__/components/salary-intelligence-section.test.tsx` |
| **Full suite command** | `npm run test -- --run` |
| **Estimated runtime** | ~2–3 seconds (quick) / ~5–8 seconds (full, ~395+ tests) |

---

## Sampling Rate

- **After every task commit:** Run quick command scoped to the files the task touched (derive from `files_modified`).
- **After every plan wave:** Run full suite command.
- **Before `/gsd-verify-work`:** Full suite green + `npm run build` succeeds + `npm run lint` 0 errors.
- **Max feedback latency:** 5 seconds for quick; 10 seconds for full.

---

## Per-Task Verification Map

> Populated by the planner during `/gsd-plan-phase`. Planner reads the ordered task hints in `22-RESEARCH.md` §10 and emits one row per task (TXX-YY) with the automated command that proves the task's acceptance criteria.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 22-01-* | 01 SalaryIntelligenceSchema | 1 | AI-DATA-02 | — | `parseOrLog` fail-open never throws on malformed `report_json` | unit | `npm test -- --run src/__tests__/lib/jobs-schemas.test.ts -t "SalaryIntelligenceSchema"` | ❌ W0 (new test) | ⬜ pending |
| 22-02-* | 02 getJobDetail LEFT JOIN LATERAL | 1 | AI-DATA-01 | — | JOIN returns `null` for all rows today (predicate = false); no crash | unit | `npm test -- --run src/__tests__/lib/jobs-db.test.ts -t "salary_intelligence"` | ❌ W0 (new test) | ⬜ pending |
| 22-03-* | 03 Currency cascade (`?? "USD"` removal) | 1 | SC #5 | — | Block hides when `salary_currency` is null; no `$` mislabel on GBP/EUR | unit | `npm test -- --run src/__tests__/lib/jobs-db.test.ts -t "salary_currency"` + `npm test -- --run src/__tests__/components/job-detail-sheet.test.tsx -t "currency"` | ❌ W0 (new test) | ⬜ pending |
| 22-04-* | 04 Schema-drift EXPECTED map | 1 | D-04 | — | Pre-push hook asserts salary_intelligence table shape (7 cols) | unit | `npm run test:schema` + `npm test -- --run src/__tests__/scripts/check-jobs-schema.test.ts` (if present, else schema script exit code 0) | ⚠️ partial (script exists, test may not) | ⬜ pending |
| 22-05-* | 05 Provenance helpers (`provenanceColor`/`provenanceLabel`) | 2 | AI-RENDER-07 | — | Pure function returns correct token + label per 4 sources | unit | `npm test -- --run src/__tests__/lib/provenance.test.ts` | ❌ W0 (new file + test) | ⬜ pending |
| 22-06-* | 06 SalaryIntelligenceSection component | 2 | AI-RENDER-03 | — | Empty / populated / unrecognized-JSON branches render without crashing; Streamdown XSS suppressed (`skipHtml` + `linkSafety.enabled:false`) | unit | `npm test -- --run src/__tests__/components/salary-intelligence-section.test.tsx` | ❌ W0 (new file) | ⬜ pending |
| 22-07-* | 07 Mount in job-detail-sheet + provenance grep gate | 2 | AI-RENDER-03 + AI-RENDER-07 | — | Every `formatSalary(` in `job-detail-sheet.tsx` is followed within 5 lines by `<Badge variant="outline"` OR sits inside a provenance-tagged component | integration + grep | `npm test -- --run src/__tests__/components/job-detail-sheet.test.tsx` + the grep gate embedded in the plan-checker verification | ❌ W0 (new test cases) | ⬜ pending |
| 22-08-* | 08 Meta-doc finalization (ROADMAP SC #3 + #5, REQUIREMENTS, STATE, SUMMARY) | 3 | AI-RENDER-03, AI-RENDER-07, AI-DATA-01, AI-DATA-02 | — | ROADMAP SC #5 line number updated `328` → `349`; SC #3 wording fix; 4 REQs marked complete in traceability table | doc | `grep -E "AI-RENDER-03\|AI-RENDER-07\|AI-DATA-01\|AI-DATA-02" .planning/REQUIREMENTS.md` shows each REQ with complete marker | ❌ planner emits during execution | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

**Planner note:** expand each task-ID row when PLAN.md files are written. Rows above represent plan-level groupings; per-task rows use the `22-PP-TT` pattern (plan-task).

---

## Wave 0 Requirements

- [ ] `src/__tests__/lib/jobs-schemas.test.ts` — extend with `SalaryIntelligenceSchema` fail-open cases (malformed `report_json`, malformed `llm_analysis`, missing `search_date`)
- [ ] `src/__tests__/lib/jobs-db.test.ts` — extend with `salary_intelligence` LEFT JOIN LATERAL cases (null-row case today; future-shape tolerance via mock)
- [ ] `src/__tests__/lib/provenance.test.ts` — NEW; 4-case truth-table for `provenanceColor` + `provenanceLabel`
- [ ] `src/__tests__/components/salary-intelligence-section.test.tsx` — NEW; empty / populated (MIN_MEDIAN_MAX) / populated (PERCENTILES) / unrecognized-JSON branches
- [ ] `src/__tests__/components/job-detail-sheet.test.tsx` — extend with provenance-tag grep-gate assertion + currency-hidden-when-null assertion
- [ ] No new framework installs — vitest 3.x + happy-dom already wired (Phase 20-01 baseline)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Visual provenance-tag readability in detail sheet | AI-RENDER-07 | Tag color + typography hierarchy cannot be verified via grep alone; owner perception test | After Phase 22 merge, open `/admin/jobs/[id]` for 3 sample jobs (scraped-only, scraped + company_research, hypothetical populated salary_intel via fixture). Confirm each dollar figure has a visible tag, tag text is legible at `text-[10px]`, and color differentiation is perceptible. |
| Real `salary_intelligence` row render smoke test | AI-RENDER-03, AI-DATA-01 | Zero live rows today — renders cannot be end-to-end tested until n8n task #11 lands | Blocked pending n8n task #11 fix. When real row materializes: open detail sheet for that job, confirm Streamdown prose renders, headline row detects or degrades gracefully, FreshnessBadge shows appropriate staleness per `search_date`. Flag this checkbox in SUMMARY.md. |
| Currency-hidden-when-null visual smoke | SC #5 | Verifies UI does not render empty wrapper divs | Seed a test job with `salary_min = 100000, salary_max = 150000, salary_currency = null`. Confirm salary block does NOT render on detail sheet (no empty space, no `$` figure). |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies (planner emits `automated: <command>` on every task)
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify (meta-doc task 22-08 can be doc-verified, but preceded by automated tasks)
- [ ] Wave 0 covers all MISSING references (6 test files enumerated above)
- [ ] No watch-mode flags (every command uses `--run`)
- [ ] Feedback latency < 10s (estimated 2–8s)
- [ ] `nyquist_compliant: true` set in frontmatter (after planner emits per-task rows and the nyquist auditor passes)

**Approval:** pending — awaiting planner's per-task row emission and nyquist auditor run after Phase 22 completion.
