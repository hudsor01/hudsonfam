---
phase: 20-foundation-freshness-zod-tailored-resume
plan: 08
subsystem: tooling
tags: [schema-drift, pre-push-hook, data-integrity, ci-guardrail, zero-dep, native-git-hooks]

# Dependency graph
requires:
  - phase: 20-foundation-freshness-zod-tailored-resume
    provides: "jobs-db.ts column surface after Plan 20-03's tailored_resume LEFT JOIN (audited inputs to the EXPECTED map)"
provides:
  - "scripts/check-jobs-schema.ts: standalone bun script querying information_schema.columns against an EXPECTED map derived from jobs-db.ts — exits 1 with a clear greppable error on drift, exits 0 with a skip warning when JOBS_DATABASE_URL is unset (CI/fresh-clone friendly)"
  - "scripts/install-hooks.sh: idempotent one-time installer for .git/hooks/pre-push — zero new dependencies (no husky, no simple-git-hooks)"
  - "package.json test:schema script — bun runtime, consistent with existing seed:content convention"
  - "CLAUDE.md §Commands documents the one-time install-hooks.sh step for fresh clones"
affects:
  - "Future plans adding new LLM-artifact tables (Phase 22 salary_intelligence) must extend the EXPECTED map at scripts/check-jobs-schema.ts or the drift guard will not cover them"
  - "Any column added to a jobs-db.ts query without also being added to EXPECTED is silent drift (false-negative); audit-on-edit discipline is the mitigation"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Native git hooks over husky for single-hook projects — CONTEXT.md D-07 anti-dep stance preserved"
    - "Runtime schema audit via information_schema.columns, NOT a schema-snapshot compare — scope is only columns OUR queries reference per CONTEXT.md D-08"
    - "bun-runtime scripts for standalone operational tooling (seed:content precedent) — avoids tsx/ts-node bloat"
    - "Host-only connection string logging — `process.env.JOBS_DATABASE_URL.split('@')[1]` prints host:port/db, never the password (T-20-08-03 mitigation)"
    - "Graceful skip when JOBS_DATABASE_URL is unset — lets fresh clones push without provisioning the jobs DB locally"

key-files:
  created:
    - "scripts/check-jobs-schema.ts (104 lines): bun script with EXPECTED map for 6 tables (jobs, cover_letters, company_research, tailored_resumes, recruiter_outreach, applications) covering 62 columns; opens a pg.Pool, queries information_schema.columns per table, diffs against EXPECTED, exits 1 with per-column error lines on drift"
    - "scripts/install-hooks.sh (29 lines): writes a pre-push hook invoking `npm run test:schema`, chmods the hook, safe to re-run after fresh clones"
  modified:
    - "package.json: added `test:schema`: `bun scripts/check-jobs-schema.ts` to the scripts block"
    - "CLAUDE.md: added install-hooks.sh + test:schema lines to §Commands code block"
  installed-not-committed:
    - ".git/hooks/pre-push (executable): runs `npm run test:schema || exit 1` — git hooks live outside version control per CONTEXT.md D-07"

key-decisions:
  - "Zero new npm deps — native git hook + pg.Pool (already a prod dep via jobs-db.ts) + bun (already installed for seed:content). Husky explicitly rejected per RESEARCH.md Anti-pattern 5."
  - "EXPECTED map scope is narrow by design — only columns jobs-db.ts actually SELECTs/INSERTs. n8n adds columns on its own upgrade cadence and those are not drift from this app's perspective (CONTEXT.md D-08)."
  - "JOBS_DATABASE_URL unset → exit 0 with skip warning — lets contributors without the jobs DB push freely; hook runs on the maintainer's machine before merge."
  - "Hook bypass via `git push --no-verify` is explicitly accepted per threat register T-20-08-02 (solo-dev project assumption A3). Escalation path: CI enforcement if bypasses occur in practice."
  - "62-column verified count came from a live query against the n8n DB at checkpoint time — NOT the 68 estimated in the plan template. Confirms the EXPECTED map matches actual jobs-db.ts references (6 tables × their distinct columns)."

patterns-established:
  - "Standalone operational scripts live in `scripts/` and run via `bun` (seed:content + check-jobs-schema precedent). Future: `scripts/` is the right home for any next-phase CI guard."
  - "Pre-push hooks install idempotently via `scripts/install-hooks.sh` — adding a second hook (e.g., for a future Phase 22 salary-intel shape check) means appending to the same installer, not introducing husky."
  - "Structured error format `Expected column '<col>' on table '<table>' (referenced in jobs-db.ts); not found in n8n database.` — human-readable at the git-push failure, grep-friendly in kubectl logs if promoted to CI."

requirements-completed:
  - "AI-DATA-04"

# Metrics
duration: 10m
completed: 2026-04-21
---

# Phase 20 Plan 08: Schema Drift Guard + Pre-Push Hook Summary

**Native-git-hook drift guard that queries `information_schema.columns` on every push and aborts client-side if any column `src/lib/jobs-db.ts` references is missing from the n8n database — closes AI-DATA-04 with zero new dependencies.**

## Performance

- **Duration:** ~10 min (wall clock including checkpoint verification)
- **Started:** 2026-04-21T18:27:00Z
- **Completed:** 2026-04-21T18:37:00Z
- **Tasks:** 1 auto + 1 human-verify checkpoint (both complete)
- **Files created/modified:** 4 (2 created scripts, 2 modified for wiring/docs) + 1 git hook installed outside version control

## Accomplishments

- `scripts/check-jobs-schema.ts` audits 6 tables × 62 columns against the live n8n DB via `information_schema.columns` and exits 1 with a clear per-column error on drift.
- `scripts/install-hooks.sh` is idempotent and self-chmods — one-time setup per clone, zero-dep.
- `.git/hooks/pre-push` wired to `npm run test:schema`; proven (see Checkpoint Verification below) to abort actual pushes client-side before any ref hits GitHub.
- `package.json` `test:schema` script added alongside existing `seed:content`/`test` entries.
- `CLAUDE.md` §Commands documents the one-time install step so fresh clones don't silently skip the guard.
- Host-only logging preserved (no password leak) per T-20-08-03 mitigation.

## Task Commits

Each task committed atomically:

1. **Task 1: scripts/check-jobs-schema.ts + install-hooks.sh + package.json + CLAUDE.md** — `6c8935e` (feat)
2. **Task 2: Checkpoint — human-verify drift triggers hook abort** — no commit (verification-only; git hook lives outside version control)

**Plan metadata commit:** [recorded below after final commit]

## Files Created/Modified

- **`scripts/check-jobs-schema.ts` (created, 104 lines)** — Imports `pg`, reads `JOBS_DATABASE_URL`, opens a Pool, iterates the EXPECTED map (6 tables → 62 distinct columns), runs one `SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name=$1` per table, builds a Set of actual columns, pushes a per-column error message for anything missing, exits 1 if errors.length > 0. Defensive: graceful skip when env var unset, host-only log of the connection target, pool.end() in both success and error paths.
- **`scripts/install-hooks.sh` (created, 29 lines)** — Resolves `git rev-parse --show-toplevel`, ensures `.git/hooks/` exists, heredocs the pre-push hook body, chmods it executable, echoes confirmation. Safe to re-run.
- **`package.json` (modified)** — Added `"test:schema": "bun scripts/check-jobs-schema.ts"` to the scripts block; no new dependencies.
- **`CLAUDE.md` (modified)** — Appended two lines inside the §Commands code block: `./scripts/install-hooks.sh` + `npm run test:schema` with concise inline descriptions.
- **`.git/hooks/pre-push` (installed, NOT committed)** — Body: `#!/bin/sh\nnpm run test:schema || exit 1`. Lives outside git object DB per D-07; re-installable via the installer.

## Decisions Made

- **Zero new deps.** Husky rejected per RESEARCH.md Anti-pattern 5 and CONTEXT.md D-07 ("native git hooks, zero-dep"). Single hook, single-developer project — husky's cross-platform indirection is overkill.
- **Narrow scope.** EXPECTED covers exactly what jobs-db.ts reads. n8n schema additions during its own upgrade cadence are not drift from this app's view (CONTEXT.md D-08).
- **Skip on missing env var.** Fresh clones without JOBS_DATABASE_URL get an exit-0 skip warning rather than a push-blocking error. The maintainer's machine (where `.env.local` has the var) runs the real guard; contributors without DB access aren't blocked from cosmetic PRs.
- **Host-only connection log.** `process.env.JOBS_DATABASE_URL.split("@")[1]` prints `host:port/db` — the password in the prefix is never logged (T-20-08-03).
- **Accept `--no-verify` bypass.** Threat T-20-08-02 dispositioned as *accept* per solo-dev assumption A3. CI enforcement is a documented escalation path if bypasses occur.
- **Column count is 62 (live), not the plan's ~68 estimate.** Verified by running the script against the real n8n DB; 6 tables × their reference columns = 62 matches the jobs-db.ts audit exactly.

## Deviations from Plan

None. Task 1 executed exactly as specified; the EXPECTED map matches the post-Plan-20-03 column surface (tailored_resumes already covered in the plan's template, confirmed during audit). Checkpoint revealed no bugs in the script or hook — drift detection works on first attempt.

## Checkpoint Verification

Human-verify checkpoint was exercised with four scenarios; all passed:

1. **Baseline (clean script + real DB):**
   `npm run test:schema` →
   `[test:schema] OK — verified 6 tables, 62 columns.`
   Exit code 0.

2. **Synthetic drift (bogus column added to EXPECTED.jobs):**
   `npm run test:schema` →
   `[test:schema] Schema drift detected:\n  Expected column 'this_column_does_not_exist' on table 'jobs' (referenced in jobs-db.ts); not found in n8n database.`
   Exit code 1.

3. **Direct pre-push hook invocation with drift still in place:**
   `git hook run pre-push` → exit code 1 with the same drift message; confirms the hook invokes the script, not some cached copy.

4. **Actual push attempt to origin (`git push origin HEAD:refs/heads/drift-test`) with drift still in place:**
   ABORTED client-side with the drift error. No refs reached the GitHub remote. Confirms the full end-to-end contract: bogus column → script fails → hook exit-1 → git aborts the push.

5. **Post-restore re-verification** (after `git checkout scripts/check-jobs-schema.ts`):
   `npm run test:schema` → `[test:schema] OK — verified 6 tables, 62 columns.` exit 0, working tree clean.

Checkpoint approved; plan completion proceeds.

## Issues Encountered

None. Script worked on first run against the live n8n DB; hook installed cleanly; synthetic drift test caught the injection exactly as designed.

## User Setup Required

- **Once per fresh clone:** `./scripts/install-hooks.sh` — documented in CLAUDE.md §Commands.
- **Env var:** `JOBS_DATABASE_URL` must be present in `.env.local` for the hook to run the real audit. Already required by existing `src/lib/jobs-db.ts` — no new var introduced. Contributors without the var get a graceful exit-0 skip.

## Threat Flags

None. The script opens a read-only `pg.Pool` against an env-configured URL and queries `information_schema.columns` (SQL-injection-safe via parameterization) — no new attack surface, no new network egress patterns, no new auth paths. Connection string is logged host-only so the password never appears in git-push terminal output or CI logs.

## Next Phase Readiness

- **Plan 20-04 (FreshnessBadge + SectionErrorBoundary):** independent — no dependency on 20-08. Ready.
- **Plan 20-05 (TailoredResumeSection + XSS test):** independent. Ready.
- **Plan 20-06 (job-detail-sheet integration):** independent. Ready.
- **Plan 20-07 (proxy.ts CSP):** independent. Ready.
- **Phase 22 (Salary Intelligence):** when `salary_intelligence` is added to jobs-db.ts, the EXPECTED map at `scripts/check-jobs-schema.ts` must be extended with its columns — otherwise a silent-drift false-negative is possible. Tracked as a forward reminder in this summary.

## Self-Check: PASSED

Created files verified to exist on disk:
- `scripts/check-jobs-schema.ts` FOUND (104 lines)
- `scripts/install-hooks.sh` FOUND (29 lines, executable)
- `.git/hooks/pre-push` FOUND (executable, content: `npm run test:schema || exit 1`)

Commits verified to exist in git log:
- `6c8935e` FOUND (Task 1: feat(20-08): add jobs schema drift guard + pre-push hook)

Acceptance criteria verified at checkpoint time:
- `npm run test:schema` → exits 0 with `[test:schema] OK — verified 6 tables, 62 columns.` on clean schema
- Synthetic drift → exits 1 with exact error message format from the plan
- Actual `git push` → aborted client-side before any ref reached origin
- `grep -c '"test:schema"' package.json` → 1
- `grep -c 'install-hooks.sh' CLAUDE.md` → ≥1
- `grep -c '"husky"' package.json` → 0 (no husky introduced)

---
*Phase: 20-foundation-freshness-zod-tailored-resume*
*Completed: 2026-04-21*
