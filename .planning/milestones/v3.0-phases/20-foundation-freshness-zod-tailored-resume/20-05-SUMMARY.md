---
phase: 20-foundation-freshness-zod-tailored-resume
plan: 05
subsystem: ui
tags:
  - streamdown
  - xss
  - markdown
  - tailored-resume
  - ai-artifact
  - vitest
  - hydration-safe

# Dependency graph
requires:
  - phase: 20-foundation-freshness-zod-tailored-resume
    plan: 01
    provides: "streamdown@^2.5.0 runtime dep + @source directive in globals.css"
  - phase: 20-foundation-freshness-zod-tailored-resume
    plan: 03
    provides: "TailoredResume interface + JobDetail.tailored_resume field on jobs-db.ts (added during Plan 20-03 as Rule 3 auto-fix)"
  - phase: 20-foundation-freshness-zod-tailored-resume
    plan: 04
    provides: "FreshnessBadge client component consumed by TailoredResumeSection's meta row"
provides:
  - "TailoredResumeSection client component (src/app/(admin)/admin/jobs/tailored-resume-section.tsx)"
  - "TailoredResumeView + ResumeFreshness exported types for Plan 20-06 server-side plumbing"
  - "Streamdown XSS regression test fixture locking skipHtml + linkSafety posture"
  - "Component-level render test covering UI-SPEC §1 shape (heading, body classes, null return, stale dot)"
affects:
  - "20-06 (mounts TailoredResumeSection inside SectionErrorBoundary in job-detail-sheet.tsx)"
  - "20-07 (CSP /admin/* middleware — defense in depth for this markdown surface)"
  - "Phase 21 (retrofits FreshnessBadge onto Cover Letter + Company Intel; AI-RENDER-04 empty state overrides the current null return)"
  - "Phase 22 (reuses Streamdown skipHtml + linkSafety pattern if salary intel gets markdown content)"

# Tech tracking
tech-stack:
  added: []  # zero new deps — streamdown was installed in 20-01
  patterns:
    - "Streamdown integration posture for this repo: ALWAYS pass `skipHtml` (overrides default rehype-raw inclusion) AND `linkSafety={{ enabled: false }}` (admin-only trusted surface)"
    - "Component-owned type exports — TailoredResumeView / ResumeFreshness live with the component, not in a separate types file, matching freshness-badge.tsx cadence"
    - "Hydration-safe AI-artifact sections — all date math stays server-side and arrives as pre-computed props (relativeTime, isStale, ageDays)"

key-files:
  created:
    - "src/app/(admin)/admin/jobs/tailored-resume-section.tsx (80 lines)"
    - "src/__tests__/components/tailored-resume-xss.test.tsx (92 lines)"
    - "src/__tests__/components/tailored-resume-section.test.tsx (65 lines)"
  modified: []

key-decisions:
  - "Streamdown's skipHtml behavior is STRONGER than plan assumed — <script>/<iframe> are stripped entirely (empty output), <img onerror> becomes a [Image blocked] placeholder span; tests updated to assert the stronger 'no executable DOM emitted' invariant"
  - "Streamdown emits <span data-streamdown=\"strong\"> for **bold**, NOT <strong> — test assertions use the data-attribute selector"
  - "Added fourth XSS assertion: no inline on* event-handler attribute survives on ANY element (catches future Streamdown-plugin changes that might allow attribute pass-through)"
  - "Added javascript: URI href-stripping test for markdown links — rehype-harden's scheme filter runs regardless of skipHtml"

patterns-established:
  - "TailoredResumeSection render tree: `<div class=\"space-y-3\">` → heading row (flex justify-between, FileText size-4 + FreshnessBadge) → body wrapper (bg-card/50 rounded-lg p-4 border border-border max-h-96 overflow-y-auto) → <Streamdown skipHtml linkSafety={{enabled:false}}>"
  - "Null artifact → section returns null (Phase 20 hides; Phase 21 adds empty state)"
  - "XSS test shape: for each payload, 4 assertions — (1) no <script>, (2) no <iframe>, (3) no <img onerror>, (4) no on* inline handlers anywhere — matches D-13 'XSS fixture ships in same PR' rule"

requirements-completed:
  - AI-RENDER-01
  - AI-SAFETY-01

# Metrics
duration: 4m
completed: 2026-04-21
---

# Phase 20 Plan 05: TailoredResumeSection Summary

**TailoredResumeSection renders LLM markdown via `<Streamdown skipHtml linkSafety={{ enabled: false }}>` with an 11-assertion XSS regression fixture proving `<script>`, `<iframe>`, and `<img onerror>` payloads emit no executable DOM.**

## Performance

- **Duration:** 4m
- **Started:** 2026-04-21T18:49:00Z
- **Completed:** 2026-04-21T18:53:07Z
- **Tasks:** 1
- **Files created:** 3

## Accomplishments

- Shipped `TailoredResumeSection` client component that closes AI-RENDER-01 — the 6 previously-invisible tailored resumes now render as formatted markdown inside the job detail sheet surface once Plan 20-06 wires the mount point.
- Shipped the Streamdown XSS regression fixture that locks AI-SAFETY-01 — any future refactor that drops `skipHtml` or rearranges Streamdown's plugin chain will fail CI with clear assertions ("no <script> element", "no on* inline handler", "no javascript: URI href").
- Exposed `TailoredResumeView` + `ResumeFreshness` types for Plan 20-06's server-side plumbing in `fetchJobDetail` — caller constructs the view object from `detail.tailored_resume` + pre-computed freshness and passes it straight through.
- Integrated cleanly with Plan 20-04's `FreshnessBadge` — zero new props on the badge, zero callback gymnastics, hydration-safe by construction (all date math server-side).

## Task Commits

1. **Task 1: TailoredResumeSection + XSS fixture + component tests** — `4ee1f4c` (feat)

TDD flow: RED (tests written against plan's assumed Streamdown behavior → 5 failures exposed Streamdown's stronger `skipHtml` behavior) → test adjustments per Rule 1 auto-fix → GREEN (11/11 new tests pass, 305/305 total). No REFACTOR needed.

**Plan metadata:** (next commit — SUMMARY.md + STATE.md + ROADMAP.md + REQUIREMENTS.md)

## Files Created/Modified

- `src/app/(admin)/admin/jobs/tailored-resume-section.tsx` — new 80-line client component; `<Streamdown skipHtml linkSafety={{ enabled: false }}>` inside bg-card/50 max-h-96 body; FileText size-4 heading; FreshnessBadge meta row; null-artifact returns null
- `src/__tests__/components/tailored-resume-xss.test.tsx` — new 92-line Vitest fixture; 3 XSS payloads × 4 assertions each (12 assertions) + safe-markdown happy path + javascript: URI href-stripping test = 5 test cases
- `src/__tests__/components/tailored-resume-section.test.tsx` — new 65-line Vitest suite; 6 render-shape tests (heading+icon, Streamdown output, null-returns-null, stale amber dot aria-label, model in meta line, no whitespace-pre-wrap)

## Decisions Made

- **Stronger security invariant over plan's literal-text assertion.** Plan assumed `skipHtml` renders XSS payloads as literal visible text; Streamdown's actual behavior is to strip `<script>`/`<iframe>` entirely and replace `<img onerror>` with a "[Image blocked]" placeholder span. The security goal — no executable DOM — is met more strongly. Tests assert the strong form ("element absent, no on* attrs survive anywhere") instead of the plan's weak literal-text form.
- **`data-streamdown="strong"` selector over `<strong>` tag.** Streamdown emits styled `<span>` elements with `data-streamdown` markers for semantic roles instead of semantic HTML tags. Test assertions updated accordingly to avoid false failures on a correct render.
- **Added javascript:-URI regression assertion** even though the plan didn't require it — RESEARCH.md §Q2 Pitfall and rehype-harden's default scheme filter both make this a free zero-cost guard that catches a realistic XSS path (malicious markdown link with `javascript:` href).
- **Kept `TailoredResumeView` type colocated with the component** (not lifted into `src/lib/types.ts`). Matches `freshness-badge.tsx` cadence; Plan 20-06 imports from `@/app/(admin)/admin/jobs/tailored-resume-section` cleanly.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug in plan's test assertions] Streamdown skipHtml strips XSS payloads rather than literalizing them**

- **Found during:** Task 1 (RED phase — ran tests before writing component; tests exercised `<Streamdown skipHtml>` directly)
- **Issue:** Plan's Assertion 4 said `expect(container.textContent).toContain(payload)` for each of the three XSS payloads — i.e. "the raw `<script>alert(1)</script>` string should appear as visible text in the DOM." Streamdown's actual `skipHtml` behavior is stronger: `<script>` and `<iframe>` are removed entirely (empty container), and `<img onerror>` is replaced with a `<span>[Image blocked: No description]</span>` placeholder.
- **Fix:** Replaced Assertion 4 with a strictly stronger invariant — "no inline on* event-handler attribute survives on ANY element." This proves the same security goal (no executable DOM) without depending on Streamdown's specific stripping strategy. Plan's safe-markdown test also updated: `<strong>` selector → `[data-streamdown="strong"]` (Streamdown emits styled span, not semantic tag). Added one new test covering `javascript:`-URI href stripping as a zero-cost bonus.
- **Files modified:** src/__tests__/components/tailored-resume-xss.test.tsx (rewrote during RED phase, before GREEN component existed)
- **Verification:** All 5 XSS tests pass against the real `<Streamdown>` library; security goal unchanged (no <script>, <iframe>, onerror, or on* handler in DOM)
- **Committed in:** 4ee1f4c (Task 1 commit)

**2. [Rule 1 - Bug in plan's component test] Streamdown bold uses data-attribute selector, not <strong> tag**

- **Found during:** Task 1 (RED debug pass before writing component)
- **Issue:** Plan's `tailored-resume-section.test.tsx` asserted `container.querySelector("strong")` for markdown `**bold**`. Streamdown emits `<span class="font-semibold" data-streamdown="strong">` instead of a `<strong>` element.
- **Fix:** Selector changed to `[data-streamdown="strong"]`. Assertion intent preserved (bold markdown → styled element in DOM).
- **Files modified:** src/__tests__/components/tailored-resume-section.test.tsx (before GREEN)
- **Verification:** Test passes; markdown still proves it's rendered as structured HTML, not plaintext
- **Committed in:** 4ee1f4c (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (both Rule 1 — bugs in plan's test assertions that assumed behavior Streamdown doesn't actually exhibit)
**Impact on plan:** Zero scope creep. Both fixes strengthen the tests: the XSS assertions now guard a stronger invariant, and the markdown assertion matches the real render output. Component file (`tailored-resume-section.tsx`) ships EXACTLY as the plan wrote it — no changes to production code, only to test assertion selectors.

## Issues Encountered

None. The deviations above were caught in TDD's RED phase before any production code was written, which is exactly what TDD is for.

## Self-Check: PASSED

- [x] `src/app/(admin)/admin/jobs/tailored-resume-section.tsx` — FOUND
- [x] `src/__tests__/components/tailored-resume-xss.test.tsx` — FOUND
- [x] `src/__tests__/components/tailored-resume-section.test.tsx` — FOUND
- [x] Commit `4ee1f4c` — FOUND in `git log`
- [x] `grep -c 'skipHtml'` → ≥1 (present in JSX + doc comment)
- [x] `grep -c 'linkSafety=\{\{ enabled: false \}\}'` → 2 (JSX + doc comment)
- [x] `grep -c 'whitespace-pre-wrap'` → 0
- [x] `grep -c '"use client"'` → 1
- [x] `grep -c 'export function TailoredResumeSection'` → 1
- [x] `grep -c 'from "streamdown"'` → 1
- [x] `grep -c 'from "./freshness-badge"'` → 1
- [x] `grep -c 'max-h-96'` → 1
- [x] `grep -c 'bg-card/50'` → 1
- [x] `npm test -- tailored-resume-xss` → 5/5 passing
- [x] `npm test -- tailored-resume-section` → 6/6 passing
- [x] `npm test` → 305/305 passing (was 294 baseline, +11 new)
- [x] `npm run build` → clean (only pre-existing env-var warnings from build-time Better Auth/Redis probe)

## User Setup Required

None — no external service configuration required. TailoredResumeSection is pure display logic with no env vars, no API keys, no runtime feature flags.

## Next Phase Readiness

Plan 20-06 is now fully unblocked. It mounts `<TailoredResumeSection resume={...} />` inside `<SectionErrorBoundary section="tailored-resume">` between the Cover Letter and Company Intel blocks of `job-detail-sheet.tsx`. The `TailoredResumeView` type is the contract — 20-06 constructs it from `detail.tailored_resume` + `attachFreshness(detail.tailored_resume.generated_at, "tailored_resume")` on the server.

Plan 20-07 (CSP middleware) remains in wave 3 alongside 20-06 — this plan's `skipHtml` is the primary defense; CSP is defense in depth.

Phase 21 will override the `if (!resume) return null;` branch with the AI-RENDER-04 empty-state copy — that's the only expected future edit to this component.

---
*Phase: 20-foundation-freshness-zod-tailored-resume*
*Completed: 2026-04-21*
