---
phase: 23-owner-triggered-workflows-pattern-setter
plan: 07
subsystem: ui
tags: [react, nextjs, server-components, client-components, webhooks, env-docs, job-dashboard]

# Dependency graph
requires:
  - phase: 23-owner-triggered-workflows-pattern-setter
    provides: "Plan 23-02 Server Actions (triggerCompanyResearch / regenerateCoverLetter); Plan 23-05 TriggerCompanyResearchButton client component; Plan 23-06 RegenerateCoverLetterButton client component"
provides:
  - "TriggerCompanyResearchButton mounted inside Company Intel `missing` branch (detail.company_research === null) as 3rd sibling in space-y-3 column"
  - "RegenerateCoverLetterButton mounted as rightmost sibling in Cover Letter populated-branch flex-wrap meta row (after Download PDF anchor)"
  - "Both mounts nested inside their respective SectionErrorBoundary wraps (G-4 invariant preserved)"
  - "N8N_WEBHOOK_SECRET documented in .env.example + CLAUDE.md Environment Variables table"
  - "4 new G-4 source-text grep-adjacency test cases locking both mount points + both branch-condition gates"
affects: [phase-24-regenerate-expansion, v3.5-cicd-hardening]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Source-text multi-line regex G-4 SectionErrorBoundary wrap assertion"
    - "Line-scan branch-condition adjacency guard (20-line look-ahead window from `company_research === null` / `Download PDF` anchor to button mount)"

key-files:
  created: []
  modified:
    - "src/app/(admin)/admin/jobs/job-detail-sheet.tsx"
    - "src/__tests__/components/job-detail-sheet.test.tsx"
    - ".env.example"
    - "CLAUDE.md"

key-decisions:
  - "Regex window expanded from plan's 1200 chars to 4000 chars for the RegenerateCoverLetterButton G-4 boundary test because the Cover Letter section has three ternary branches before reaching the populated meta row (actual distance ~3200 chars)"
  - "Added a 4th Rule 2 test case pinning RegenerateCoverLetterButton within 20 lines of the Download PDF anchor — the plan specified 3 tests but the symmetric branch-condition guard lacked a cover_letter equivalent; adding it locks the mount to the populated branch's meta row and prevents future refactors from accidentally hoisting the button out of the flex-wrap sibling chain"

patterns-established:
  - "Button mount site = visibility gate: the branch condition IS the visibility gate (D-09). TriggerCompanyResearchButton only renders when `detail.company_research === null`; RegenerateCoverLetterButton only renders when `detail.cover_letter` is truthy AND `content?.trim()` is truthy. No additional prop-level gate needed — the render tree does the gating."
  - "Source-text G-4 boundary test template: `/SectionErrorBoundary[\\s\\S]{0,N}section=\"X\"[\\s\\S]{0,M}<ComponentName/` — N (pre-section) ≈ 400, M (post-section) sized to the actual branch distance through the ternary tree. Phase 24 regenerate-expansion can clone this pattern verbatim for `RegenerateTailoredResumeButton` (inside tailored_resume boundary) and `RegenerateSalaryIntelligenceButton` (inside salary_intelligence boundary)."

requirements-completed: [AI-ACTION-03, AI-ACTION-04]

# Metrics
duration: 10m
completed: 2026-04-23
---

# Phase 23 Plan 07: Mount trigger/regenerate buttons in job-detail-sheet + env docs Summary

**TriggerCompanyResearchButton + RegenerateCoverLetterButton wired end-to-end into `job-detail-sheet.tsx` at their UI-SPEC integration surfaces, completing the user-facing surface for AI-ACTION-03 / AI-ACTION-04. N8N_WEBHOOK_SECRET env placeholder added to `.env.example` + documented in CLAUDE.md.**

## Performance

- **Duration:** 10m 12s
- **Started:** 2026-04-23T03:56:43Z
- **Completed:** 2026-04-23T04:06:55Z
- **Tasks:** 3 (two `auto` execution tasks + one atomic commit)
- **Files modified:** 4

## Accomplishments

- `TriggerCompanyResearchButton` mounted as 3rd child in the Company Intel `missing` branch `space-y-3` column (immediately after the `EMPTY_STATE_COPY.company_research.missing` italic paragraph, before the closing `</div>`). Inside the existing `<SectionErrorBoundary section="company_research" jobId={detail.id}>` wrap at lines 285-288. Props: `jobId={detail.id}`.
- `RegenerateCoverLetterButton` mounted as rightmost sibling in the Cover Letter populated-branch `flex items-center gap-3 flex-wrap` meta row (immediately after the `Download PDF` anchor, before the closing `</div>` of the flex-wrap row). Inside the existing `<SectionErrorBoundary section="cover_letter" jobId={detail.id}>` wrap at line 180. Props: `jobId={detail.id}`, `baselineGeneratedAt={detail.cover_letter.generated_at}` (direct access — safe because the populated branch guards on `detail.cover_letter.content?.trim()` being truthy, so `detail.cover_letter` is definitely non-null).
- 4 new G-4 source-text test cases in a new `describe("job-detail-sheet.tsx — Phase 23 button mount assertions (G-4)", …)` block: (1) TriggerCompanyResearchButton inside SectionErrorBoundary company_research; (2) RegenerateCoverLetterButton inside SectionErrorBoundary cover_letter (4000-char window vs plan's 1200 — see Deviations); (3) TriggerCompanyResearchButton within 20 lines of `detail.company_research === null` branch condition; (4) RegenerateCoverLetterButton within 20 lines of `Download PDF` anchor (Rule 2 extra coverage). All 4 new + 8 existing = 12 tests green.
- `N8N_WEBHOOK_SECRET=""` placeholder appended to `.env.example` under the "Job search" section with comment noting actual secret lives in K8s ExternalSecrets.
- `N8N_WEBHOOK_SECRET` row added to CLAUDE.md Environment Variables table immediately after `JOBS_DATABASE_URL` row, with inline comment `# HMAC-SHA256 shared secret for signing n8n webhook POSTs (Phase 23 AI-SAFETY-02)`.

## Task Commits

Each task was committed atomically per plan Task 23-07-03 spec (single commit for the whole plan):

1. **Task 23-07-01 + 23-07-02 + 23-07-03: Mount buttons + extend tests + update env docs + atomic commit** - `64f6416` (feat)

_Note: the plan explicitly specifies a single atomic commit (Task 23-07-03) covering all 4 modified files, rather than per-task commits, because the button-mount edit is meaningless without the co-shipped G-4 test guards that pin it in place._

## Files Created/Modified

- `src/app/(admin)/admin/jobs/job-detail-sheet.tsx` - Added 2 import lines (`TriggerCompanyResearchButton`, `RegenerateCoverLetterButton`). Added `<TriggerCompanyResearchButton jobId={detail.id} />` as 3rd sibling in Company Intel missing-branch space-y-3 column. Added `<RegenerateCoverLetterButton jobId={detail.id} baselineGeneratedAt={detail.cover_letter.generated_at} />` as rightmost sibling in Cover Letter populated-branch flex-wrap meta row. 9 insertions, 0 deletions — purely additive.
- `src/__tests__/components/job-detail-sheet.test.tsx` - Appended new `describe` block with 4 new G-4 source-text test cases. 50 insertions, 0 deletions.
- `.env.example` - Appended `N8N_WEBHOOK_SECRET=""` placeholder with 2-line comment header. 4 insertions, 0 deletions.
- `CLAUDE.md` - Added `N8N_WEBHOOK_SECRET` row to Environment Variables code block after `JOBS_DATABASE_URL`. 1 insertion, 0 deletions.

## Decisions Made

- **Direct `detail.cover_letter.generated_at` access (no `?? null` coalesce)** — the success criteria in the prompt suggested `baselineGeneratedAt={detail.cover_letter?.generated_at ?? null}` but inspecting `RegenerateCoverLetterButton`'s prop type confirms `baselineGeneratedAt: string` (not `string | null`), and the mount is INSIDE the populated branch where `detail.cover_letter` is guaranteed non-null by the ternary condition (`!detail.cover_letter.content?.trim() ? ... : <populated branch>`). Direct access matches the component's interface contract and keeps the JSX simpler. Type system enforces this — a null value would not compile.
- **Branch condition = visibility gate (D-09 confirmed)** — no additional prop-level `if (condition) return null` guards inside the buttons are needed because the buttons are only rendered when their respective branch conditions are true. T-23-07-01 disposition (`mitigate`) satisfied by the render tree structure.
- **Regex window sizing for G-4 boundary test** — the cover_letter section has three ternary branches (null / empty / populated) between `SectionErrorBoundary section="cover_letter"` and the `<RegenerateCoverLetterButton>` mount inside the populated branch's meta row. Measured distance: 58 lines / ~3197 chars. Chose 4000-char window for the regex `[\s\S]{0,4000}` quantifier — comfortable headroom above actual distance while still tripping the test if a future refactor moves the mount further (e.g., outside the boundary, which would push distance to ∞ by breaking the inclusion).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Expanded G-4 test regex window from 1200 to 4000 chars**
- **Found during:** Task 23-07-02 (extend test file) — initial test run
- **Issue:** Plan specified `[\s\S]{0,1200}` for the RegenerateCoverLetterButton G-4 boundary test regex window, but the actual distance from `SectionErrorBoundary section="cover_letter"` to the mount point is ~3200 characters (the cover_letter section has three ternary branches before reaching the populated meta row). Test failed red with `expected null not to be null`.
- **Fix:** Expanded the regex window to `[\s\S]{0,4000}` with an inline comment explaining the distance rationale. The test now passes green, and a future refactor that moves the button out of the boundary (distance → effectively infinite because the boundary-close precedes the button) would still trip the test.
- **Files modified:** `src/__tests__/components/job-detail-sheet.test.tsx`
- **Verification:** `npm test -- --run src/__tests__/components/job-detail-sheet.test.tsx` → 12/12 passed
- **Committed in:** `64f6416`

**2. [Rule 2 - Missing Critical] Added 4th test case pinning RegenerateCoverLetterButton to Download PDF anchor adjacency**
- **Found during:** Task 23-07-02 (writing the three plan-specified tests)
- **Issue:** The plan specified 3 test cases — one pinning TriggerCompanyResearchButton to the `company_research === null` branch condition (20-line look-ahead), but no symmetric pin for RegenerateCoverLetterButton to the Cover Letter populated branch. Without it, a future refactor could hoist the button out of the `flex items-center gap-3 flex-wrap` meta row and the G-4 boundary test would still pass (the button would still be inside the boundary, just in the wrong sibling position). This would break the UI-SPEC §Integration surface contract silently.
- **Fix:** Added a 4th test case that scans the source for the `Download PDF` anchor text and asserts `<RegenerateCoverLetterButton` appears within the next 20 lines — pins the button to the correct sibling position in the populated meta row.
- **Files modified:** `src/__tests__/components/job-detail-sheet.test.tsx`
- **Verification:** Test case 4 passes green
- **Committed in:** `64f6416`

---

**Total deviations:** 2 auto-fixed (1 bug-fix [test regex sizing], 1 missing-critical [symmetric branch-adjacency guard])
**Impact on plan:** Both auto-fixes necessary. The regex window bump is a Rule 1 fix for a planner under-estimate — test would have shipped red. The 4th test case is a Rule 2 correctness-requirement addition that locks a mount-site invariant the plan didn't think to guard. Zero scope creep; zero architectural changes; zero production-code deviations beyond what the plan specified.

## Issues Encountered

- Pre-existing workspace state: `.planning/STATE.md` and `.planning/config.json` had in-progress modifications from a prior session, and `.planning/phases/22-salary-intelligence-defensive-render/deferred-items.md` was an untracked file from Plan 22-05's plan-count audit. Staged only the 4 files this plan owns (`git add <file>` enumeration, not `git add -A`) to keep the commit clean.

## Threat Flags

No new threat surface introduced. T-23-07-01 (button visibility — elevation of privilege) and T-23-07-02 (env placeholder disclosure) are both handled by the plan's original mitigations (branch-condition gating + empty-string placeholder with K8s ExternalSecrets note).

## User Setup Required

None for this plan — `N8N_WEBHOOK_SECRET` is documented in both `.env.example` and CLAUDE.md but actual secret provisioning is a deploy-time concern handled by Plan 23-08 (K8s ExternalSecrets wiring) and v3.5-CI/CD-hardening.

## Next Phase Readiness

- AI-ACTION-03 + AI-ACTION-04 now end-to-end (server layer from Plan 23-02; client component from Plan 23-05 / 23-06; mount + visibility gating from this plan).
- 7/8 Phase 23 plans complete (23-01 sendSignedWebhook primitive + 23-02 triggerCompanyResearch/regenerateCoverLetter Server Actions + 23-03 fireWebhook deletion/sendSignedWebhook retrofit + 23-04 CI grep gate + 23-05 TriggerCompanyResearchButton + 23-06 RegenerateCoverLetterButton + 23-07 button mounts).
- Remaining: Plan 23-08 (final Phase 23 meta-doc + K8s ExternalSecrets wiring + SEED-007 v3.5 handoff, mirroring Phase 22's 22-08 pattern).
- Phase 24 pattern inheritance: the G-4 source-text test template (regex with sized distance window + line-scan branch-condition adjacency) works as-is for `RegenerateTailoredResumeButton` (tailored_resume boundary) and `RegenerateSalaryIntelligenceButton` (salary_intelligence boundary). The only diffs are the boundary name, the branch-condition predicate (`generated_at > baseline` for resume; `search_date > baseline` for salary), and the rightmost-sibling anchor text.

## Self-Check: PASSED

- **Files modified exist and contain expected content:**
  - `src/app/(admin)/admin/jobs/job-detail-sheet.tsx` — FOUND, 404 lines (398 → 404, +6 purely additive), 2× `TriggerCompanyResearchButton` + 2× `RegenerateCoverLetterButton` references (1 import + 1 mount each) confirmed via grep
  - `src/__tests__/components/job-detail-sheet.test.tsx` — FOUND, 175 lines (125 → 175, +50)
  - `.env.example` — FOUND, 28 lines (24 → 28, +4), `N8N_WEBHOOK_SECRET` present
  - `CLAUDE.md` — FOUND, 208 lines (207 → 208, +1), `N8N_WEBHOOK_SECRET` row present
- **Commit exists:** `64f6416` FOUND (single atomic `feat(23-07)`)
- **Tests green:** `npm test -- --run src/__tests__/components/job-detail-sheet.test.tsx` → 12/12; full suite → 509/509
- **Build clean:** `npm run build` → exits 0

---
*Phase: 23-owner-triggered-workflows-pattern-setter*
*Plan: 07*
*Completed: 2026-04-23*
