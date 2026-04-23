---
phase: 24
slug: regenerate-expansion-resume-salary-silent-success-state
status: approved
nyquist_compliant: true
wave_0_complete: false
created: 2026-04-23
approved_at: 2026-04-23
---

# Phase 24 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (happy-dom + @testing-library/react + MSW) |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npm test -- --run src/__tests__/components/regenerate-button.test.tsx src/__tests__/lib/job-actions.regenerate.test.ts src/__tests__/components/job-detail-sheet.test.tsx` |
| **Full suite command** | `npm run test -- --run` |
| **Estimated runtime** | ~3–4s quick / ~6–9s full (~509+ tests post-Phase-23 baseline, Phase 24 adds ~30 cases) |

---

## Sampling Rate

- **After every task commit:** quick command scoped to touched files.
- **After every plan wave:** full suite.
- **Before `/gsd-verify-work`:** full suite green + `npm run build` exits 0 + `npm run lint` 0 errors.
- **Max feedback latency:** 5s quick / 10s full.

---

## Per-Task Verification Map

> Populated by planner from RESEARCH §9 task hints. Rows below are plan-level groupings.

| Task ID | Plan | Wave | Requirement | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------------|-----------|-------------------|-------------|--------|
| 24-01-* | 01 Generalize regenerate-button + rename test | 1 | AI-ACTION-05, AI-ACTION-06 | 4-state machine; silent-success variant; G-6 no Date.now(); G-8 verbatim warning copy | unit + component | `npm test -- --run src/__tests__/components/regenerate-button.test.tsx` | ❌ W0 (rename + extend) | ⬜ pending |
| 24-02-* | 02 regenerateTailoredResume + regenerateSalaryIntelligence Server Actions | 1 | AI-ACTION-05, AI-ACTION-06 | requireRole first line; D-12 grep gate auto-verifies; discriminated-union return; DB-error guards (T-23-02-05) | unit | `npm test -- --run src/__tests__/lib/job-actions.regenerate.test.ts` | ❌ W0 (new test file) | ⬜ pending |
| 24-03-* | 03 Cover Letter mount rewire + 2 new mounts | 2 | AI-ACTION-05, AI-ACTION-06 | Tailored Resume + Salary Intelligence buttons mounted in respective meta rows; visibility gated by artifact !== null; SectionErrorBoundary wrap preserved | integration | `npm test -- --run src/__tests__/components/job-detail-sheet.test.tsx` | ❌ W0 (test extension) | ⬜ pending |
| 24-04-* | 04 Meta-doc finalization (ROADMAP + REQUIREMENTS + STATE + 24-SUMMARY.md) | 3 | all 3 | ROADMAP SC #2 `search_date` verification (already corrected in-planning); REQUIREMENTS traceability flips for 3 REQs; AI-ACTION-07 checklist `[x]`; STATE advance | doc | `grep -c "AI-ACTION-05\|AI-ACTION-06\|AI-ACTION-07.*Complete" .planning/REQUIREMENTS.md` ≥ 3 | ❌ planner emits | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

**Note:** Silent-success (AI-ACTION-07) wiring is bundled into Plan 24-01 Task 2 (4-state machine + silent-success render branch) + Task 3 (G-8 test assertions). No separate plan; AI-ACTION-07 test coverage lives in `regenerate-button.test.tsx` alongside the other state-machine branches.

---

## Wave 0 Requirements

- [ ] `src/app/(admin)/admin/jobs/regenerate-button.tsx` — RENAMED from regenerate-cover-letter-button.tsx; generalized props; 4-state machine; silent-success branch
- [ ] `src/__tests__/components/regenerate-button.test.tsx` — RENAMED + extended from regenerate-cover-letter-button.test.tsx; 17 Phase 23 cases ported + ~13 new cases (2 artifact variants × ~5 each + silent-success variants)
- [ ] `src/lib/job-actions.ts` — 2 new exports (regenerateTailoredResume + regenerateSalaryIntelligence)
- [ ] `src/__tests__/lib/job-actions.regenerate.test.ts` — NEW; ~8 cases (4 per action: requireRole, success shape, sentinel passthrough, DB-error guard)
- [ ] `src/app/(admin)/admin/jobs/tailored-resume-section.tsx` — extend props to include `jobId` + mount `<RegenerateButton />` in meta row (conditional on `tailored_resume !== null`)
- [ ] `src/app/(admin)/admin/jobs/salary-intelligence-section.tsx` — extend props to include `jobId` + mount `<RegenerateButton />` in meta row (conditional on `salary_intelligence !== null`)
- [ ] `src/app/(admin)/admin/jobs/job-detail-sheet.tsx` — pass `jobId` prop to both section components
- [ ] `src/__tests__/components/job-detail-sheet.test.tsx` — extend with mount assertions for 3 buttons (Cover Letter already exists; Tailored Resume + Salary Intelligence new)
- [ ] Optional: `src/lib/regenerate-predicates.ts` — extracted per-artifact isDone predicates (if planner chooses extraction per RESEARCH Open Question #1)
- [ ] No new framework installs — all primitives inherited from Phase 23

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| End-to-end tailored resume regenerate in n8n | AI-ACTION-05 | Cross-repo (hudsonfam → homelab n8n); n8n workflow must exist + verify HMAC | After homelab PR: open job with tailored resume, click Regenerate, confirm new content + timestamp advance |
| End-to-end salary intelligence regenerate in n8n | AI-ACTION-06 | Cross-repo; n8n workflow must exist | Same as above for salary_intelligence; note date-granularity rough edge (same-day click = silent-success) |
| Silent-success warning in production | AI-ACTION-07 | Requires real n8n workflow that returns 200 without writing data — hard to reproduce outside prod | Temporarily configure a test webhook that returns 200 with no-op body; click any regenerate button; confirm warning copy renders verbatim |
| Visual differentiation between error + silent-success states | AI-ACTION-07 | Color + italic typography requires perception check | Force each terminal state (mock sentinel, mock poll exhaust); confirm error = text-destructive NON-italic; silent-success = text-warning italic |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (8 test files enumerated)
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter (after planner emits per-task rows)

**Approval:** pending — awaiting planner's per-task row emission and nyquist auditor run post-Phase-24.
