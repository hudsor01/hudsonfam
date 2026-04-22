---
phase: 23
slug: owner-triggered-workflows-pattern-setter
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-22
---

# Phase 23 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (happy-dom + @testing-library/react + MSW) |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npm test -- --run src/__tests__/lib/webhooks.test.ts src/__tests__/lib/job-actions.requireRole.test.ts src/__tests__/lib/job-actions.trigger.test.ts src/__tests__/components/trigger-company-research-button.test.tsx src/__tests__/components/regenerate-cover-letter-button.test.tsx` |
| **Full suite command** | `npm run test -- --run` |
| **Estimated runtime** | ~3–4 seconds (quick) / ~5–8 seconds (full, ~450+ tests post-Phase-22 baseline) |

---

## Sampling Rate

- **After every task commit:** Run quick command scoped to touched files.
- **After every plan wave:** Run full suite command.
- **Before `/gsd-verify-work`:** Full suite green + `npm run build` succeeds + `npm run lint` 0 errors.
- **Max feedback latency:** 5s (quick) / 10s (full).

---

## Per-Task Verification Map

> Populated by planner from RESEARCH §12 task hints. Rows below are plan-level groupings; per-task rows use `23-PP-TT` pattern (plan-task).

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 23-01-* | 01 sendSignedWebhook + sentinels | 1 | AI-SAFETY-02, AI-SAFETY-03, AI-SAFETY-04 | Pitfall 3 | HMAC-SHA256 over `${ts}.${path}.${body}`; X-Idempotency-Key per call; 4 error sentinels; no raw error leaks | unit | `npm test -- --run src/__tests__/lib/webhooks.test.ts` | ❌ W0 (new file + test) | ⬜ pending |
| 23-02-* | 02 triggerCompanyResearch + regenerateCoverLetter Server Actions | 1 | AI-ACTION-03, AI-ACTION-04 | Pitfall 9 | requireRole first line; return discriminated union { ok, sentinel?, baseline? }; clock-safe `previousGeneratedAt` baseline for regenerateCoverLetter | unit | `npm test -- --run src/__tests__/lib/job-actions.trigger.test.ts` | ❌ W0 (new test) | ⬜ pending |
| 23-03-* | 03 fireWebhook retrofit (3 call sites) | 1 | AI-SAFETY-02, AI-SAFETY-03 | Pitfall 3 | All 3 legacy fireWebhook calls replaced with sendSignedWebhook; fireWebhook helper deleted | unit + source grep | `npm test -- --run src/__tests__/lib/job-actions.test.ts` + grep source = 0 matches for `fireWebhook` | ❌ W0 (new test + source edit) | ⬜ pending |
| 23-04-* | 04 CI grep rule — requireRole on every export | 1 | SC #5 | Pitfall 9 | Every `export async function` in job-actions.ts has `await requireRole(["owner"])` within 10 lines | unit | `npm test -- --run src/__tests__/lib/job-actions.requireRole.test.ts` | ❌ W0 (new file + test) | ⬜ pending |
| 23-05-* | 05 TriggerCompanyResearchButton client component | 2 | AI-ACTION-03 | — | Pessimistic spinner during poll; 3s interval; 60 cap; unmount-safe cleanup; sentinel error display | unit + component | `npm test -- --run src/__tests__/components/trigger-company-research-button.test.tsx` (with vi.useFakeTimers) | ❌ W0 (new file + test) | ⬜ pending |
| 23-06-* | 06 RegenerateCoverLetterButton client component | 2 | AI-ACTION-04 | Pitfall 6 | Pessimistic spinner; poll predicate uses server-returned baseline (NOT client Date.now()); 3s interval, 60 cap | unit + component | `npm test -- --run src/__tests__/components/regenerate-cover-letter-button.test.tsx` | ❌ W0 (new file + test) | ⬜ pending |
| 23-07-* | 07 Mount in job-detail-sheet + env docs | 2 | AI-ACTION-03, AI-ACTION-04 | — | Both buttons mounted in respective section meta rows; TriggerCompanyResearch visible only when `company_research === null`; Regenerate visible when `cover_letter !== null`; N8N_WEBHOOK_SECRET documented in .env.example + CLAUDE.md | integration | `npm test -- --run src/__tests__/components/job-detail-sheet.test.tsx` + grep .env.example | ❌ W0 (new test cases) | ⬜ pending |
| 23-08-* | 08 Meta-doc finalization | 3 | all 5 | — | ROADMAP SC #5 wording corrected (job-outreach mention dropped); REQUIREMENTS traceability updated; STATE advanced; 23-SUMMARY.md created | doc | `grep -E "AI-ACTION-03\|AI-ACTION-04\|AI-SAFETY-02\|AI-SAFETY-03\|AI-SAFETY-04" .planning/REQUIREMENTS.md` shows each with Complete marker | ❌ planner emits during execution | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/webhooks.ts` — NEW; HMAC helper + sentinel mapping
- [ ] `src/__tests__/lib/webhooks.test.ts` — NEW; signature correctness, idempotency header, 4 failure-mode → sentinel mappings, no raw-error leakage
- [ ] `src/__tests__/lib/job-actions.trigger.test.ts` — NEW; triggerCompanyResearch + regenerateCoverLetter return shapes + requireRole denial cases
- [ ] `src/__tests__/lib/job-actions.requireRole.test.ts` — NEW; readFileSync + regex loop asserting every export has requireRole adjacency
- [ ] `src/__tests__/components/trigger-company-research-button.test.tsx` — NEW; fake-timer polling test
- [ ] `src/__tests__/components/regenerate-cover-letter-button.test.tsx` — NEW; fake-timer + baseline predicate test
- [ ] `src/__tests__/components/job-detail-sheet.test.tsx` — extend with button mount + visibility conditions (company_research===null gates TriggerCompanyResearchButton; cover_letter!==null gates RegenerateCoverLetterButton)
- [ ] No new framework installs — Vitest/happy-dom already wired (Phase 20-01 baseline)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| End-to-end HMAC verification in n8n | AI-SAFETY-02 | n8n is remote; hudsonfam signs but n8n verifies — homelab-repo PR adds verification; cross-repo integration requires manual smoke | After homelab PR merges: open a job without company_research, click "Research this company", wait for polling to resolve; inspect n8n execution history for a signed-validated run; replay the same execution via n8n CLI and confirm the duplicate X-Idempotency-Key is rejected. |
| End-to-end idempotency dedup in n8n | AI-SAFETY-03 | Same reason as above | Part of the same manual smoke — replay with same UUID should skip; new click with new UUID should run. |
| Polling UX on a real slow LLM call | AI-ACTION-03 / AI-ACTION-04 | 3-second polling cadence + button spinner interaction requires human perception check | After Phase 23 merge, trigger the button on a job with an uncached LLM; confirm spinner visible the whole time, button disabled, no flash-of-unpolled, completion transitions cleanly to FreshnessBadge visible. |
| Sentinel error UX under a real failure mode | AI-SAFETY-04 | Hard to reliably reproduce 429/401/503 from n8n in integration tests | After Phase 23 merge, temporarily revoke the `N8N_WEBHOOK_SECRET` env var on hudsonfam; click the button; confirm the user sees "auth" sentinel and the server log contains the full error with stack (via `kubectl logs deployment/hudsonfam -n homepage`). |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies (planner emits `automated: <command>` on every task)
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (6 NEW test files enumerated)
- [ ] No watch-mode flags (every command uses `--run`)
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter (after planner emits per-task rows and nyquist auditor passes post-Phase-23)

**Approval:** pending — awaiting planner's per-task row emission and nyquist auditor run.
