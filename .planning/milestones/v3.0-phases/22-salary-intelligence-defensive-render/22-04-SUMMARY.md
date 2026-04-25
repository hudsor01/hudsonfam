---
phase: 22-salary-intelligence-defensive-render
plan: 04
subsystem: infra
tags:
  - schema-drift
  - ci
  - pre-push-hook
  - expected-map
  - bun
  - postgres

requires:
  - phase: 20-foundation-freshness-zod-tailored-resume
    provides: scripts/check-jobs-schema.ts EXPECTED map + scripts/install-hooks.sh pre-push hook infrastructure (Plan 20-08)
provides:
  - EXPECTED map entry for salary_intelligence (7 columns) at scripts/check-jobs-schema.ts
  - Pre-push drift guard now catches salary_intelligence column rename/drop on upstream n8n Postgres
affects:
  - Phase 22 remaining plans (22-02 LEFT JOIN LATERAL, 22-05/06 renderer) — drift on the 7 columns will now fail pre-push before silent renderer breakage
  - Phase 24 (regenerate expansion) if salary_intelligence is ever re-keyed

tech-stack:
  added: []
  patterns:
    - EXPECTED-map extension idempotence (additive dict key, no runtime order dependency — main() iterates Object.entries)

key-files:
  created: []
  modified:
    - scripts/check-jobs-schema.ts

key-decisions:
  - "Placed salary_intelligence entry between tailored_resumes and recruiter_outreach (pipeline-chronological ordering — resume → salary → recruiter reach-out → application). Matches CONTEXT.md §Phase Boundary ordering."
  - "Per-row literal formatting: 5-col first line (id, search_date, report_json, raw_results, llm_analysis) + 2-col second line (created_at, updated_at). Keeps diff to 4 lines and mirrors the existing cover_letters / company_research formatting cadence at lines 27-36."

patterns-established:
  - "EXPECTED-map extension for new upstream n8n tables: single dict entry, additive, no code changes to main()"
  - "Paranoia-validation pattern: cross-check EXPECTED-map entries against live DB via kubectl exec psql before committing (confirms column spellings match live schema)"

requirements-completed:
  - AI-DATA-02

# Metrics
duration: 1m 16s
completed: 2026-04-22
---

# Phase 22 Plan 04: Salary Intelligence Schema-Drift Guard Summary

**Pre-push hook now catches salary_intelligence column rename/drop on upstream n8n Postgres — 7-column EXPECTED entry added to scripts/check-jobs-schema.ts, validated against live DB (70 total columns across 7 tables, zero drift).**

## Performance

- **Duration:** 1m 16s
- **Started:** 2026-04-22T20:00:28Z
- **Completed:** 2026-04-22T20:01:44Z
- **Tasks:** 3 (2 edit/verify + 1 commit)
- **Files modified:** 1

## Accomplishments

- `scripts/check-jobs-schema.ts` EXPECTED map grows from 6 tables / 62 columns to 7 tables / 70 columns (baseline 63 expected + updated since Plan 21-02's `pdf_data` addition pushed total to 70).
- `npm run test:schema` runs clean end-to-end — Mode A (live n8n DB via `kubectl port-forward` + psql credential) emitted `OK — verified 7 tables, 70 columns.`; Mode B (no JOBS_DATABASE_URL) emitted the graceful skip warning. Both exit 0.
- Pre-push hook (Plan 20-08's `.git/hooks/pre-push` — no re-install needed) now transitively guards the 7 salary_intelligence columns because the hook runs `npm run test:schema` which reads EXPECTED at invocation time.
- CONTEXT.md D-04 satisfied.

## Task Commits

1. **Task 22-04-01 + 22-04-02 + 22-04-03: Add salary_intelligence entry + verify + commit** — `8aedff6` (feat) — single-task commit covering all three plan tasks because Tasks 01 and 02 only modify file state + run verify respectively; Task 03 was the explicit commit step.

_Note: This plan bundled the edit, the verify, and the commit into one atomic commit. No TDD RED→GREEN split applied because the "test" here is the CLI script `npm run test:schema` itself — the edit IS the test assertion going from "entry missing" to "entry present and matches live DB"._

## Files Created/Modified

- `scripts/check-jobs-schema.ts` — added 4-line EXPECTED-map entry for `salary_intelligence` between `tailored_resumes` and `recruiter_outreach`:
  ```typescript
  salary_intelligence: [
    "id", "search_date", "report_json", "raw_results", "llm_analysis",
    "created_at", "updated_at",
  ],
  ```

## Diff

```diff
  tailored_resumes: [
    "id", "job_id", "content", "pdf_data", "model_used", "generated_at",
  ],
+ salary_intelligence: [
+   "id", "search_date", "report_json", "raw_results", "llm_analysis",
+   "created_at", "updated_at",
+ ],
  recruiter_outreach: [
    "id", "job_id", "contact_name", "contact_role", "context",
    "linkedin_connect", "linkedin_dm", "warm_email", "full_output",
```

Exactly 4 net-added lines as the plan `<output>` section predicted.

## Decisions Made

None beyond what CONTEXT.md D-04 already locked. Plan executed verbatim.

## Deviations from Plan

None — plan executed exactly as written.

## Verification Mode Used

**BOTH modes ran.** Mode B fires automatically from the default `npm run test:schema` invocation (no JOBS_DATABASE_URL set). For extra paranoia, also ran Mode A via `kubectl port-forward -n homelab svc/postgres-rw 5433:5432` + credential pulled from `kubectl get secret -n homelab postgres-app`:

- **Mode B output:** `[test:schema] JOBS_DATABASE_URL not set — skipping drift check (non-failure)` — exit 0
- **Mode A output:** `[test:schema] connecting to 127.0.0.1:5433/n8n` → `[test:schema] OK — verified 7 tables, 70 columns.` — exit 0

Plus independent side-channel live-DB verification via `kubectl exec -n homelab postgres-1 -c postgres -- psql -U postgres -d n8n -c "SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'salary_intelligence' ORDER BY ordinal_position;"` — returned all 7 columns in declared order. Zero drift.

## Pre-Push Hook Status

**Continues to work without re-install.** `scripts/install-hooks.sh` (Plan 20-08) installed `.git/hooks/pre-push` with body `npm run test:schema || exit 1`. That hook is unchanged — it reads the EXPECTED map at invocation time, so the new salary_intelligence entry is transitively picked up on the next `git push`. No action required by future developers.

## Issues Encountered

None.

## User Setup Required

None.

## Next Phase Readiness

- Plan 22-02 (LEFT JOIN LATERAL in getJobDetail) can proceed — if the n8n workflow renames or drops any of the 7 columns while Plan 22-02 is being written, the pre-push hook fails loudly instead of silently producing null SalaryIntelligence objects.
- Plan 22-05/22-06 (SalaryIntelligenceSection renderer) inherit the same guardrail — renderer never silently breaks on column drift because the hook catches it before the commit lands on `origin/main`.
- Plans 22-01, 22-02, 22-03 in this phase are parallel-safe with this plan (disjoint files — `src/lib/jobs-schemas.ts` / `src/lib/jobs-db.ts` / `src/app/(admin)/admin/jobs/job-detail-sheet.tsx` vs `scripts/check-jobs-schema.ts` only).

## Threat Flags

None — no new network surface, no new auth paths, no new trust boundaries. This plan modifies a CI/CD guardrail script only; it reads `information_schema.columns` via an already-existing pg.Pool connection using an already-existing credential env var (JOBS_DATABASE_URL). No incremental attack surface.

## Known Stubs

None.

## Self-Check: PASSED

**File existence:**
- `scripts/check-jobs-schema.ts` — FOUND (modified, line count grew from 104 to 108)

**Commit existence:**
- `8aedff6` (feat(22-04): ...) — FOUND in git log

**Behavioral checks:**
- `grep -c "salary_intelligence:" scripts/check-jobs-schema.ts` → 1 (PASS)
- `npm run test:schema` Mode B → exit 0 with skip message (PASS)
- `npm run test:schema` Mode A → exit 0 with `OK — verified 7 tables, 70 columns` (PASS)
- Live-DB side-channel: 7 columns returned matching EXPECTED entry (PASS)

---

*Phase: 22-salary-intelligence-defensive-render*
*Completed: 2026-04-22*
