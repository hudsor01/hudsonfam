---
phase: 23
plan: 03
type: execute
wave: 3
status: complete
completed_at: 2026-04-23
requirements:
  - AI-SAFETY-02
  - AI-SAFETY-03
commits:
  - 6dff261  # feat(23-03): retrofit 3 fireWebhook call sites to sendSignedWebhook; delete helper (G-7/AI-SAFETY-02/-03)
---

# Plan 23-03 — SUMMARY

## Outcome

Plan 23-03 retrofitted the 3 existing `fireWebhook(...)` call sites in `src/lib/job-actions.ts` to the new `sendSignedWebhook(path, body, crypto.randomUUID())` primitive (Plan 23-01) and DELETED the legacy `fireWebhook` helper. G-7 grep gate now green (`fireWebhook` count = 0 in `src/`). Fire-and-forget posture preserved (`void` on all 3 status-sync calls) since these are background sync side effects, not owner-visible actions.

## Deliverables

- `src/lib/job-actions.ts`:
  - DELETED `fireWebhook` helper (formerly lines 25-38) — no deprecation wrapper
  - REPLACED 3 call sites with `void sendSignedWebhook(path, body, crypto.randomUUID())`:
    - `updateJobStatus` → `"rejected"` branch: `void sendSignedWebhook("job-feedback-sync", { job_id: jobId, action: "reject" }, crypto.randomUUID())`
    - `updateJobStatus` → `"interested"` branch: `void sendSignedWebhook("job-company-intel", { job_id: jobId, company_name: job.company, company_url: job.company_url }, crypto.randomUUID())`
    - `dismissJob`: `void sendSignedWebhook("job-feedback-sync", { job_id: jobId, action: "dismiss" }, crypto.randomUUID())`
  - `N8N_WEBHOOK_BASE` const removed (webhooks.ts owns base URL construction)

## Grep Gates

- **G-7 (fireWebhook absence):** `grep -c 'fireWebhook' src/lib/job-actions.ts` → 0 ✓
- Plan 23-04's CI grep gate (`src/__tests__/lib/job-actions.requireRole.test.ts`) now all-green on both `requireRole` adjacency AND G-7.

## Verification

- `npm test -- --run src/__tests__/lib/webhooks.test.ts src/__tests__/lib/job-actions.trigger.test.ts src/__tests__/lib/job-actions.requireRole.test.ts` → 28/28 green (previously 1 transient RED on G-7)
- `npm run build` → exit 0
- `grep -c 'sendSignedWebhook' src/lib/job-actions.ts` → 7 (2 Server Action exports + 3 retrofits + 1 import + 1 type import)

## Deviations

Zero production-logic deviations. The executor agent hit Anthropic-side rate limits after committing `6dff261` and before emitting SUMMARY + STATE/ROADMAP/REQUIREMENTS updates — these were finalized by the orchestrator based on the already-landed retrofit commit. No re-execution required.

## Self-Check

- [x] fireWebhook helper deleted
- [x] 3 call sites retrofit to sendSignedWebhook
- [x] Fire-and-forget posture preserved (void on all 3)
- [x] G-7 passes (0 fireWebhook matches)
- [x] All 3 retrofit paths have distinct UUIDs per call (crypto.randomUUID() inline)
- [x] Full webhooks.test.ts + job-actions.trigger.test.ts + job-actions.requireRole.test.ts suite green (28/28)
- [x] Build clean

## Handoff

Wave 3 continues with Plans 23-05 (TriggerCompanyResearchButton) and 23-06 (RegenerateCoverLetterButton) running in parallel — both consume `triggerCompanyResearch` / `regenerateCoverLetter` from `@/lib/job-actions` via imports. `job-actions.ts` is now stable (no more shared-file waves); buttons can spawn in parallel without contention.
