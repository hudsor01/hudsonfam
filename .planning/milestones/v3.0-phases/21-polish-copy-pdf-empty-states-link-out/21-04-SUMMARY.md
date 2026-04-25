---
phase: 21-polish-copy-pdf-empty-states-link-out
plan: 04
subsystem: ui
tags: [nextjs, react, client-component, clipboard, sonner, tooltip, lucide, pdf, vitest, happy-dom]

# Dependency graph
requires:
  - phase: 20-foundation-freshness-zod-tailored-resume
    provides: [FreshnessBadge (Plan 20-04), TailoredResumeSection base shell (Plan 20-05), FreshJobDetail wiring (Plan 20-06)]
  - phase: 21-polish-copy-pdf-empty-states-link-out
    provides: [FreshnessBadge.generatedDate prop (Plan 21-00), /api/jobs/[id]/tailored-resume-pdf route (Plan 21-03)]
provides:
  - TailoredResumeSection renders Copy button (icon-only ghost, tooltip, aria-label) and Download PDF anchor in the meta row
  - navigator.clipboard.writeText wiring with 2000ms Copy->Check icon morph + sonner toast.success on success, silent-fail on rejection
  - jobId prop threading from job-detail-sheet.tsx into TailoredResumeSection
  - Vitest infrastructure: inline vi.hoisted + vi.mock("sonner") pattern, Object.defineProperty clipboard install, TooltipProvider wrapper helper (reusable for any future client-component test touching Radix Tooltip)
affects: [phase-21-05-quality-badge, phase-21-06-empty-states, phase-21-07-company-link]

# Tech tracking
tech-stack:
  added: []  # zero runtime deps; all primitives (sonner, lucide-react, Button, Tooltip) were already installed
  patterns:
    - "vi.hoisted + vi.mock factory: lift mock state alongside the hoisted factory to avoid 'Cannot access before initialization' (same pattern Plan 21-03 established for pg.Pool mocking)"
    - "Object.defineProperty(navigator, 'clipboard', { configurable: true, writable: true }) for happy-dom: plain Object.assign fails because clipboard is a getter-only property"
    - "Per-test-file TooltipProvider wrapper via render() helper: production mounts the provider in providers.tsx; tests need an explicit wrapper for Radix Tooltip primitives to work in isolation"
    - "try/catch-swallow pattern on navigator.clipboard.writeText: permission denial / non-secure-context = silent fail (owner can re-click); no error toast per UI-SPEC §1"
    - "icon-morph via setCopied(true) + setTimeout(() => setCopied(false), 2000) — no ref needed because rapid re-clicks just schedule additional timers and always revert correctly after the last timer fires"

key-files:
  created: []
  modified:
    - src/app/(admin)/admin/jobs/tailored-resume-section.tsx
    - src/app/(admin)/admin/jobs/job-detail-sheet.tsx
    - src/__tests__/components/tailored-resume-section.test.tsx

key-decisions:
  - "Task 1 executed via Step 2b (inline-per-file mocks) — src/__tests__/setup.ts currently carries only cross-cutting MSW plumbing; adding a single-consumer clipboard mock globally would bloat setup for a file-local need. Acceptance criterion explicitly accepts this path"
  - "Object.defineProperty (not Object.assign) to install navigator.clipboard — happy-dom's navigator.clipboard is a getter-only descriptor; Object.assign throws 'Cannot set property clipboard of [object Object] which has only a getter'. Rule 3 auto-fix caught during RED phase"
  - "vi.hoisted() wraps the toast mock state — vi.mock factories hoist above plain consts, so `const mockToastSuccess = vi.fn(); vi.mock('sonner', () => ({ toast: { success: mockToastSuccess } }))` throws 'Cannot access before initialization'. vi.hoisted is the canonical vitest escape hatch (Plan 21-03 established the pattern for the pg.Pool mock)"
  - "Custom render() helper wraps tests in <TooltipProvider delayDuration={0}> — production mounts this provider globally in src/components/providers.tsx:9; unit tests render in isolation and Radix throws 'Tooltip must be used within TooltipProvider' without the wrapper. Rule 3 auto-fix caught during GREEN phase"
  - "Download anchor mirrors cover-letter sibling exactly (job-detail-sheet.tsx:156-163) but ADDS focus-visible ring — the existing cover-letter anchor is missing a visible focus ring. Accessibility fix-forward: the tailored-resume anchor lands WCAG-compliant; the cover-letter anchor picks up the same class when the next plan touches that block"
  - "fireEvent.click over userEvent.click — @testing-library/user-event is not installed; adding it as a devDep requires --legacy-peer-deps (Plan 20-01 tech debt). fireEvent suffices for click semantics on native buttons; the async-microtask-then-assertion pattern uses waitFor() from @testing-library/react instead of user-event's built-in advanceTimers"
  - "Icon-morph test uses real timers + waitFor(timeout: 3000) rather than vi.useFakeTimers — the clipboard Promise resolution + React batched state update + the setTimeout(2000) revert interleave fake-timer advancement and microtask flushes awkwardly under act(). Real timers plus a 3s wait deterministically catches both the morph-to-Check and the revert-to-Copy transitions without timer-manipulation edge cases"

# Metrics
metrics:
  duration: "~6m"
  completed_at: "2026-04-22T14:21:28Z"
  tasks_completed: 2
  files_modified: 3
  files_created: 0
  tests_added: 6
  tests_total_before: 323
  tests_total_after: 329
  build_exit: 0
  deviations: 3 # all Rule 3 auto-fixes, documented below
---

# Phase 21 Plan 04: TailoredResumeSection Copy + Download PDF wiring Summary

Delivered the user-facing half of AI-ACTION-01 (Copy to clipboard) and AI-ACTION-02 (Download PDF) by extending `TailoredResumeSection` with an icon-only ghost Copy button (tooltip + aria-label + 2000ms Copy→Check icon morph + verbatim markdown clipboard write + sonner success toast + silent-fail on permission denial) and a Download PDF anchor pointing at the Plan 21-03 route; threaded the new `jobId: number` prop through the `job-detail-sheet.tsx` callsite; and extended the Vitest suite from 6 → 12 cases to cover every new behavior (aria-label, verbatim write, toast, icon morph, silent-fail, Download anchor shape).

## File Diffs

### `src/app/(admin)/admin/jobs/tailored-resume-section.tsx` (+48 / -8)

- Added imports: `useState` (React), `Check` / `Copy` / `Download` (lucide-react), `toast` (sonner), `Button` (shadcn), `Tooltip` / `TooltipContent` / `TooltipTrigger` (shadcn)
- Extended `Props` interface with `jobId: number` (JSDoc comment explains its sole consumer is the PDF-route URL template)
- Destructured `{ resume, jobId }`; added `const [copied, setCopied] = useState(false)` above the `if (!resume) return null` early return (hook ordering: hooks must run on every render path including the null return; unconditional useState call)
- `handleCopy` async function: `try { await navigator.clipboard.writeText(resume.content); setCopied(true); toast.success("Resume copied to clipboard"); setTimeout(() => setCopied(false), 2000); } catch { /* silent */ }`
- Meta row transformed from a bare `<FreshnessBadge>` into a `<div className="flex items-center gap-3 flex-wrap">` wrapper containing `[FreshnessBadge] [Tooltip-wrapped Copy Button] [Download anchor]` — matches UI-SPEC §1 render tree byte-for-byte
- Button: `variant="ghost" size="icon-sm" aria-label="Copy tailored resume to clipboard" className="text-muted-foreground"`; conditional child `{copied ? <Check /> : <Copy />}` with `size-4` on both icons
- Download anchor: `href={`/api/jobs/${jobId}/tailored-resume-pdf`} download className="inline-flex items-center gap-1 text-xs text-primary hover:underline focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 rounded-sm"` with inline `<Download className="size-3" />` + "Download PDF" text

### `src/app/(admin)/admin/jobs/job-detail-sheet.tsx` (+1 / -0)

Single-line addition: `jobId={detail.id}` prop on the `<TailoredResumeSection>` callsite (preserved alongside the existing `resume={{ ... }}` object literal). No other changes to this file.

### `src/__tests__/components/tailored-resume-section.test.tsx` (+208 / -8)

Rewrite + extension:
- Top-of-file block: `vi.hoisted()` wrapping `mockToastSuccess`, `vi.mock("sonner", ...)`, `beforeEach` installing `navigator.clipboard` via `Object.defineProperty`, `afterEach` resetting fake timers
- Custom `render()` helper wraps every test in `<TooltipProvider delayDuration={0}>` via the `wrapper` option on `@testing-library/react`'s `rtlRender`
- All 6 existing Phase 20 tests updated to pass `jobId={42}` (additive; Phase 20 behaviors preserved)
- New second `describe` block: "TailoredResumeSection — Copy button + Download anchor (Phase 21)" with 6 new tests covering: aria-label presence, verbatim clipboard write, toast.success literal string, Copy→Check 2000ms morph + revert, silent-fail on rejection, Download anchor href + download attribute + `lucide-download` class

## Test Infrastructure Added

| Pattern | Purpose |
|---------|---------|
| `vi.hoisted({ mockToastSuccess: vi.fn() })` | Lifts mock state alongside hoisted vi.mock factory — prevents "Cannot access before initialization" |
| `vi.mock("sonner", () => ({ toast: { success: mockToastSuccess } }))` | Intercepts sonner imports; `toast.success` call in production code routes to the vi.fn() for assertion |
| `Object.defineProperty(navigator, "clipboard", { configurable: true, writable: true, value: { writeText: mockClipboardWriteText } })` | happy-dom's clipboard is a getter-only property; defineProperty with configurable:true is the only reliable install path |
| `TooltipProvider` wrapper via `render()` helper | Radix primitives throw without their provider context; production has it in providers.tsx |
| `fireEvent.click` + `waitFor` + `act` (no user-event) | @testing-library/user-event is not installed; fireEvent + act + waitFor covers click+microtask+revert semantics |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocker] `Object.assign(navigator, { clipboard: ... })` throws in happy-dom**
- **Found during:** Task 2 RED-phase rerun (first `npm test` after writing the test file)
- **Issue:** happy-dom exposes `navigator.clipboard` as a getter-only property descriptor. Plain `Object.assign` fails with `TypeError: Cannot set property clipboard of [object Object] which has only a getter`, blocking all 12 tests at the `beforeEach` setup line
- **Fix:** Replaced `Object.assign(navigator, { clipboard: { writeText: ... } })` with `Object.defineProperty(navigator, "clipboard", { configurable: true, writable: true, value: { writeText: ... } })`. `configurable: true` is load-bearing — without it, subsequent `beforeEach` runs can't reinstall a fresh mock
- **Files modified:** `src/__tests__/components/tailored-resume-section.test.tsx`
- **Commit:** `a9fa337`

**2. [Rule 3 - Blocker] `vi.mock("sonner")` factory references hoisting-unavailable const**
- **Found during:** Task 2 GREEN-phase rerun (after wiring up the production code)
- **Issue:** `const mockToastSuccess = vi.fn(); vi.mock("sonner", () => ({ toast: { success: mockToastSuccess } }))` — vi.mock factories hoist above plain consts, so the factory runs before `mockToastSuccess` is initialized. Vitest error: `ReferenceError: Cannot access 'mockToastSuccess' before initialization`
- **Fix:** Wrapped mock state in `vi.hoisted(() => ({ mockToastSuccess: vi.fn() }))` destructured into `const { mockToastSuccess } = ...`. This is the canonical vitest pattern; Plan 21-03 established the same three-part pattern for the `pg.Pool` mock in `jobs-db-pdf.test.ts`
- **Files modified:** `src/__tests__/components/tailored-resume-section.test.tsx`
- **Commit:** `a9fa337` (squashed into the RED-phase test commit because the hoisting error blocked the tests from failing for the *right* reason — fixing this was part of "make RED fail correctly")

**3. [Rule 3 - Blocker] Radix `Tooltip` requires `TooltipProvider` ancestor**
- **Found during:** Task 2 GREEN-phase rerun (second `npm test` after hoisting fix)
- **Issue:** After the hoisting fix, all 12 tests threw `Error: Tooltip must be used within TooltipProvider` at render time. Production mounts `<TooltipProvider delayDuration={300}>` in `src/components/providers.tsx:9`, but unit tests render `<TailoredResumeSection>` in isolation without that ancestor
- **Fix:** Added a custom `render()` helper that wraps every test in `<TooltipProvider delayDuration={0}>` via the `wrapper` option on `@testing-library/react`'s `rtlRender`. All 12 tests green after this change
- **Files modified:** `src/__tests__/components/tailored-resume-section.test.tsx`
- **Commit:** `a9fa337` (same reasoning — this was also "make RED fail for the right reason" infrastructure that unblocked the actual assertion work)

All three Rule 3 fixes are **test infrastructure**, not production code changes. The production component diff is exactly what UI-SPEC §1 specified.

## TDD Gate Compliance

- **RED gate:** commit `a9fa337` — `test(21-04): ...` — 6 new test cases added; prior to the production-code commit the new cases fail for the right reasons (null Copy-button selector, null Download anchor, no Check icon in DOM). Verified by running `npm test` after each infrastructure fix; failures transitioned from mock-setup errors to actual assertion failures over three iterations
- **GREEN gate:** commit `df38a18` — `feat(21-04): ...` — all 12 tests pass (6 Phase 20 preserved + 6 new Phase 21); full suite 323 → 329; `npm run build` exits 0
- **REFACTOR gate:** not needed — production component diff is minimal and the UI-SPEC-locked render tree leaves no room for cleanup

Per-task commit trail is present and ordered test-before-feat.

## Authentication / Checkpoint Gates

None. This plan runs fully autonomously (no `checkpoint:*` tasks).

## Follow-ups for Wave 3 Sibling Plans

Plans 21-05, 21-06, 21-07 all touch `job-detail-sheet.tsx` but on disjoint line ranges — the minimal `jobId={detail.id}` addition from this plan sits inside the tailored-resume block (line 181) and does not collide with:

- **Plan 21-05 (Quality badge)** — edits lines 141-171 (cover-letter block). Will mount a shadcn `Badge variant="outline"` with `scoreColor()` styling in the cover-letter meta row, left of `FreshnessBadge`. Should extract `scoreColor()` + `scoreLabel()` to `src/lib/score-color.ts` per UI-SPEC §2
- **Plan 21-06 (Empty states)** — adds empty-state branches to all three LLM sections. The `TailoredResumeSection` empty branch currently reads `if (!resume) return null;` — Plan 21-06 replaces that with the section shell + `text-muted-foreground italic` empty-state paragraph. The `jobId` prop landed in this plan is unused in the empty branch but remains in the Props interface (required by the Download anchor in the non-empty branch)
- **Plan 21-07 (Company link-out)** — edits sheet header lines 111-116. Will wrap the company `<span>` in an `<a target="_blank" rel="noopener noreferrer">` when `company_research?.company_url ?? jobs.company_url` resolves. No interaction with the tailored-resume block

### Nice-to-have fix-forward

The cover-letter Download anchor at `job-detail-sheet.tsx:156-163` lacks a visible focus ring. This plan shipped the focus-visible ring on the tailored-resume Download anchor. Plan 21-05 or 21-06 (either touches that cover-letter block) should fold the same `focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 rounded-sm` class onto the cover-letter sibling while in the neighborhood.

## Known Stubs

None. Every element added in this plan is fully wired:
- Copy button's `onClick` → `handleCopy` → `navigator.clipboard.writeText` + `toast.success`
- Download anchor's `href` → Plan 21-03 route `/api/jobs/${jobId}/tailored-resume-pdf`
- `jobId` prop threaded from `job-detail-sheet.tsx` through to the anchor URL

## Self-Check: PASSED

- [x] `src/app/(admin)/admin/jobs/tailored-resume-section.tsx` exists and contains the expected new code (verified by Grep: `aria-label="Copy tailored resume to clipboard"` line 68, `toast.success("Resume copied to clipboard")` line 78, `navigator.clipboard.writeText(resume.content)` line 76, `setTimeout(() => setCopied(false), 2000)` line 79, `/api/jobs/${jobId}/tailored-resume-pdf` URL template line 99)
- [x] `src/app/(admin)/admin/jobs/job-detail-sheet.tsx` contains the new `jobId={detail.id}` on the TailoredResumeSection callsite (line 181)
- [x] `src/__tests__/components/tailored-resume-section.test.tsx` exists with 12 tests (6 Phase 20 preserved + 6 new Phase 21)
- [x] Commit `a9fa337` present in `git log` — test(21-04)
- [x] Commit `df38a18` present in `git log` — feat(21-04)
- [x] `npm test -- --run`: 329 passing (0 failing)
- [x] `npm run build`: exits 0
- [x] Zero hardcoded Tailwind color classes introduced (verified by Grep for `text-(red|amber|yellow|green|blue|orange|emerald|teal)-[0-9]` in the modified component — zero matches)
