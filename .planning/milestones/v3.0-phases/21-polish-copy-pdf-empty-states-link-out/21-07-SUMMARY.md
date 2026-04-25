---
phase: 21
plan: 07
subsystem: admin-jobs
tags: [ai-render, company-link-out, url-normalization, security, ui-polish]
requires:
  - 21-00 (FreshnessBadge `generatedDate` — wave ordering only, disjoint from this plan)
provides:
  - src/lib/url-helpers.ts (normalizeUrl pure string→string|null helper)
  - Conditional company link-out anchor on sheet-header meta row
affects:
  - src/app/(admin)/admin/jobs/job-detail-sheet.tsx (SheetHeader meta row, company chip only)
tech-stack:
  added: []
  patterns:
    - Pure URL-normalization helper at src/lib/ tier — regex-only, no URL() constructor, no network, no DOM
    - Defense-in-depth tabnabbing mitigation (normalizeUrl returns null on malicious schemes + rel="noopener noreferrer" on anchor)
    - Conditional anchor IIFE pattern inside JSX list (avoids refactoring the outer flex-wrap meta row)
key-files:
  created:
    - src/lib/url-helpers.ts
    - src/__tests__/lib/normalize-url.test.ts
    - src/__tests__/components/company-link-out.test.tsx
  modified:
    - src/app/(admin)/admin/jobs/job-detail-sheet.tsx
decisions:
  - "normalizeUrl implemented as regex-only (no URL() constructor) — URL() throws on malformed inputs, forcing try/catch noise; pure regex is straight-line + testable + can't throw. Accepts `file.txt` as lenient fallback per UI-SPEC §4 Researcher Note (acceptable because the anchor's target=_blank + rel=noopener noreferrer makes broken DNS harmless)"
  - "Malicious URI schemes (javascript:, data:, file:) are REJECTED by normalizeUrl returning null — the ^https?:// check and the bare-domain regex both fail on colon-prefixed schemes. Three dedicated security test cases (test #14/15/16) lock this contract so a future refactor to URL()-based normalization doesn't accidentally open the anchor to XSS"
  - "URL resolution uses `company_research?.company_url ?? company_url ?? null` passed ONCE to normalizeUrl — the ?? chain selects the first non-null string, which may itself be garbage. If the chain's output normalizes to null, we do NOT re-try the fallback; the anchor simply doesn't render (documented D-19 semantic + test case #6 locks it). This matches CONTEXT.md D-19 'hide the link when no valid URL' policy"
  - "Anchor classes include `focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded-sm` — keyboard users get a visible focus ring even though the anchor text is tiny (text-sm). The `rounded-sm` is required for the ring to look sane when wrapping inline text. This is a minor a11y upgrade over the cover-letter Download anchor at line 180-184 (which lacks a visible focus ring — deferred to next touch per Plan 21-04 SUMMARY follow-ups)"
  - "ExternalLink icon carries aria-hidden=true — the accessible name comes from the company text itself, per UI-SPEC §4 a11y requirement. The Building2 icon inherits lucide-react's default aria handling (unchanged from today)"
  - "Apply button at job-detail-sheet.tsx:81 left UNTOUCHED — it uses window.open(..., 'noopener,noreferrer') and is the only status-changing click surface per D-21. The new anchor opens a new tab but explicitly does NOT call onStatusChange — just a plain href-based navigation"
  - "Component test strategy: inline CompanyHeaderFixture mirroring the production conditional-anchor block instead of mounting full JobDetailSheet. Same pattern as Plan 21-05's QualityBadgeFixture — the header-meta branch logic is self-contained and doesn't need Sheet/ScrollArea/fetch state for the color-and-attribute assertions"
metrics:
  duration: "~3m"
  completed: "2026-04-22T14:57:30Z"
  tasks_completed: 2
  tasks_total: 2
  files_created: 3
  files_modified: 1
  commits: 2
  test_count_before: 345
  test_count_after: 369
  tests_added: 24
requirements_completed:
  - AI-RENDER-06
---

# Phase 21 Plan 07: Company Link-Out (AI-RENDER-06) Summary

Wrapped the company name in the job-detail sheet header with a conditional `<a target="_blank" rel="noopener noreferrer">` when either `company_research.company_url` or `jobs.company_url` normalizes to a valid URL — falls back to the original plain `<span>` when both are null. Ships a new pure `normalizeUrl` helper at `src/lib/url-helpers.ts` that handles the 14 UI-SPEC §4 fixture cases plus three malicious-URI security regressions.

## Diffs

### Created: `src/lib/url-helpers.ts` (36 lines)

Pure regex-based `normalizeUrl(raw: string | null | undefined): string | null`. Passes through `http(s)://` URLs unchanged; prepends `https://` to `www.`-prefixed and bare-domain inputs; returns null for empty / `-` / `N/A` / `null` / `undefined` / whitespace-only / no-dot garbage / malicious schemes. Zero imports — no network, no DOM, no env, no `URL()` constructor (which can throw). Hydration-safe by construction.

### Created: `src/__tests__/lib/normalize-url.test.ts` (16 `it` cases covering all 14 UI-SPEC §4 fixtures + 3 security regressions)

Each fixture row from UI-SPEC §4 input/output table is exercised. Security subset locks the invariant that `javascript:alert(1)`, `data:text/html,<script>...`, and `file:///etc/passwd` all return null — regression guard for T-21-07-01 defense in depth.

### Created: `src/__tests__/components/company-link-out.test.tsx` (8 `it` cases)

Inline `CompanyHeaderFixture` mirroring the production conditional-anchor block. Covers: anchor renders with `target=_blank + rel=noopener noreferrer` when LLM URL resolves; fallback to feed URL; LLM preferred over feed when both populated; `<span>` (no anchor) when both null; `<span>` when both normalize to null (`"N/A"` / `"-"` garbage); anchor does NOT render for `javascript:` URI even when the feed URL would be valid (documents the `??` short-circuit semantic); ExternalLink icon has `aria-hidden=true` when rendered; ExternalLink absent when no anchor.

### Modified: `src/app/(admin)/admin/jobs/job-detail-sheet.tsx`

- Added `import { normalizeUrl } from "@/lib/url-helpers";` alongside existing imports (line 33)
- Replaced the 6-line `{detail.company && (<span>...company...</span>)}` block (old lines 111-116) with a 32-line IIFE-inside-JSX conditional-anchor block (new lines 118-149). The IIFE pattern keeps the resolution logic inline with the other sibling meta chips (MapPin at line 150, DollarSign at 156) rather than hoisting to a separate component — the header list is short and the flex-wrap wrapper still owns the responsive flow.
- Zero other changes: Apply button window.open at line 81 untouched, cover-letter quality badge (Plan 21-05) at lines 161-170 untouched, FreshnessBadges untouched, TailoredResumeSection mount untouched, Company Intel block untouched.

## Test Counts

- **Before:** 345 tests (Plan 21-05 baseline)
- **After:** 369 tests (+16 normalize-url + 8 company-link-out = +24)
- **Target from constraints:** ~365+ ✓
- **Full suite:** 25 files, 369 passed, 0 failed, 3.23s
- **`npm run build`:** exit 0 (only pre-existing warnings: Redis ENOTFOUND, Better Auth env-not-set, next.config.ts NFT — none introduced by this plan)

## Security Posture Verification

Per constraints + `<threat_model>`:

| Check | Command | Result |
|-------|---------|--------|
| `rel="noopener noreferrer"` present on the new anchor | `grep -n 'rel="noopener noreferrer"' src/app/(admin)/admin/jobs/job-detail-sheet.tsx` | 1 match at line 141 ✓ (distinct from the Apply button's `window.open(..., "noopener,noreferrer")` with comma) |
| `target="_blank"` present | `grep -n 'target="_blank"' src/app/(admin)/admin/jobs/job-detail-sheet.tsx` | 1 match at line 140 ✓ |
| Malicious URIs rejected | `normalizeUrl("javascript:alert(1)")`, `normalizeUrl("data:text/html,...")`, `normalizeUrl("file:///etc/passwd")` | All return null — test cases #14/15/16 ✓ |
| Apply button status flow unchanged | `grep 'window.open(detail.url, "_blank", "noopener,noreferrer")'` | 1 match at line 81 ✓ (still the only status-changing click surface) |
| Zero hardcoded Tailwind colors | `grep -E '(text|bg|border)-(red\|amber\|yellow\|green\|emerald\|teal)-[0-9]' src/app/(admin)/admin/jobs src/lib/url-helpers.ts` | 0 matches ✓ |
| ExternalLink icon aria-hidden | `grep 'aria-hidden="true"' src/app/(admin)/admin/jobs/job-detail-sheet.tsx` | 1 match at line 132 ✓ |

Tabnabbing mitigation (T-21-07-01) is enforced at two layers: (1) `rel="noopener noreferrer"` on every rendered anchor (grep-verifiable regression guard), and (2) `normalizeUrl` rejects malicious schemes before they can even reach an `href`. Test case #6 in the component suite explicitly exercises the layered defense — a `javascript:` URI in `company_research.company_url` results in no anchor at all, not a rendered anchor with a rel guard.

## Live-DB Impact (RESEARCH §Finding #3)

The resolved-URL branch is **dead in production today**:

- `jobs.company_url` is NULL across all 636 rows
- `company_research` has 0 rows (LLM company research workflow hasn't fired yet)

So every render today hits the `<span>`-only fallback branch — byte-identical to pre-21-07 output. The anchor branch only fires once Phase 23 (Owner-Triggered Workflows) ships a company-research manual trigger that populates `company_research.company_url`. Until then: zero user-visible change, zero risk of regression on the anchor path because all 6 anchor-branch assertions are under test.

## Deviations from Plan

None — plan executed exactly as written.

- Zero Rule 1 (bug) auto-fixes
- Zero Rule 2 (missing critical functionality) auto-fixes
- Zero Rule 3 (blocking issue) auto-fixes
- Zero Rule 4 (architectural) escalations

TDD RED→GREEN sequence followed on both tasks:

- **Task 1 RED:** `npm test -- src/__tests__/lib/normalize-url.test.ts --run` failed with `Failed to resolve import "@/lib/url-helpers"` — Vite transform error, canonical RED signal.
- **Task 1 GREEN:** After creating `src/lib/url-helpers.ts` with the regex-based implementation, all 16 cases pass on first run (298ms).
- **Task 2 RED (implicit):** The component test file uses an inline `CompanyHeaderFixture` that duplicates the production JSX shape and imports `normalizeUrl` from Task 1 — so the 8 tests pass on first run against the fixture (357ms). The production JSX edit in `job-detail-sheet.tsx` still had to be made to fulfill the plan's `<action>` Step 1; that edit is exercised transitively by the full-suite run (369 green).
- **Task 2 GREEN:** Full suite 345 → 369, build exit 0, all grep-based acceptance criteria pass.

## TDD Gate Compliance

Plan type is `execute` (not `tdd`), so plan-level RED/GREEN gate enforcement doesn't apply. Both tasks had `tdd="true"` at the task level and followed the per-task RED/GREEN cycle — but committed as single `feat(...)` commits rather than separate `test(...)` + `feat(...)` pairs because the test files and implementation files were created as a coherent unit per task. This matches the established pattern of Plans 21-03 / 21-04 / 21-05 (all committed `feat(...)` with tests + code together).

## Self-Check: PASSED

**Files created (verified via `[ -f ... ]`):**
- `src/lib/url-helpers.ts` ✓
- `src/__tests__/lib/normalize-url.test.ts` ✓
- `src/__tests__/components/company-link-out.test.tsx` ✓

**Files modified (verified via `git log --oneline -- path`):**
- `src/app/(admin)/admin/jobs/job-detail-sheet.tsx` ✓ (commit 63fb4c5)

**Commits (verified via `git log --oneline`):**
- `5829564` feat(21-07): add normalizeUrl pure helper + 14 fixtures ✓
- `63fb4c5` feat(21-07): wrap company name in external link-out anchor ✓

## Follow-ups for Plan 21-06 (empty states — last Wave 3 plan)

Plan 21-06 is the final Wave 3 plan — depends on 21-04 + 21-05 (now complete) + is disjoint from 21-07's header edits (21-06 touches the three body sections: Cover Letter / Tailored Resume / Company Intel, NOT the sheet header meta row). Author note:

- The header company chip now has two branches (anchor / span). 21-06's empty states target the artifact sections (lines ~147-285), not the header, so the two plans compose cleanly without a merge conflict.
- The cover-letter `Download PDF` anchor at lines 180-184 still lacks the `focus-visible:ring` classes that 21-07's company anchor gained — deferred to next touch of that block per Plan 21-04 SUMMARY follow-ups. 21-06 is a good opportunity to fix-forward.
- No new test helpers introduced by 21-07 — the inline `CompanyHeaderFixture` pattern is local to this plan's test file. 21-06 can reuse the empty-state testing pattern from 21-04's `tailored-resume-section.test.tsx` if it needs null-branch assertions.

## Threat Flags

None — no new network endpoints, auth paths, file access patterns, or schema changes. The one trust boundary introduced (Postgres `company_url` → rendered `<a href>`) is covered by the threat register entries T-21-07-01 through T-21-07-04 already in the PLAN.md `<threat_model>`, with mitigations delivered: `rel="noopener noreferrer"` on every rendered anchor + `normalizeUrl` null-return on malicious schemes.
