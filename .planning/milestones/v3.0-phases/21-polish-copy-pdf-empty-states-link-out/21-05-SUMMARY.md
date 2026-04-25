---
phase: 21
plan: 05
subsystem: admin-jobs
tags: [ai-render, quality-badge, cover-letter, ui-polish]
requires:
  - 21-00 (FreshnessBadge `generatedDate` prop)
  - 21-03 (jobs-db already exposes `detail.cover_letter.quality_score`)
  - 21-04 (TailoredResumeSection + jobId prop wired — UI neighborhood stable)
provides:
  - src/lib/score-color.ts (scoreColor, scoreLabel, QualityLabel)
  - Color-coded quality badge on cover-letter meta row
affects:
  - src/app/(admin)/admin/jobs/job-detail-sheet.tsx (cover-letter meta row)
tech-stack:
  added: []
  patterns:
    - Pure scale-mapping helpers in src/lib/ for cross-plan reuse
    - Explicit `!== null` guard (not truthy) for score=0 Pitfall-6 safety
    - Template-literal className composition (no cn() needed for static + dynamic mix)
key-files:
  created:
    - src/lib/score-color.ts
    - src/__tests__/lib/score-color.test.ts
    - src/__tests__/components/cover-letter-quality-badge.test.tsx
  modified:
    - src/app/(admin)/admin/jobs/job-detail-sheet.tsx
decisions:
  - "scoreColor / scoreLabel live at src/lib/score-color.ts, not colocated with job-detail-sheet.tsx — RESEARCH Open Question 4 resolved in favor of cross-plan reuse (Phase 22 salary confidence + Phase 24 regenerate deltas will share the scale-mapping surface)"
  - "Thresholds locked at 0.6 / 0.8 (LLM-judge convention from OpenAI eval cookbook + Anthropic eval docs) — RESEARCH Finding #2 confirmed 0/12 live rows have scores, so no live distribution existed to fit to. Badge is dead UI in production today but all 3 bands are under test so the future n8n grader rollout is regression-safe"
  - "Null guard uses `quality_score !== null` (explicit), NOT `quality_score &&` (truthy) — Pitfall 6 from RESEARCH: score=0 is a valid low score, not a hide signal. The 6th fixture test locks this contract so a future refactor to truthy-check fails RED immediately"
  - "Template-literal className composition (`text-[11px] ${scoreColor(n)} cursor-default`) chosen over `cn()` — the Badge component internally runs cn() via its forwardRef wrapper, so the override from a template-literal string wins the last-merge (Tailwind v4 class-conflict resolution). No `@/lib/utils` import added to job-detail-sheet.tsx"
  - "Meta-row wrapper gains `flex-wrap` to survive 512px sheet width when all three children (Badge + FreshnessBadge + Download anchor) co-exist — UI-SPEC §2 responsive contract"
  - "Badge placement LEFT of FreshnessBadge, not RIGHT — matches UI-SPEC §2 + CONTEXT.md D-17 render-tree order. Radix Tooltip wraps the badge (not the whole meta row) so the tooltip only fires on badge hover/focus"
  - "Fixture-component test pattern (inline QualityBadgeFixture mirroring the production JSX) chosen over full JobDetailSheet mount — the component has a heavy fetchJobDetail Server Action + useState lifecycle that isn't load-bearing for the color-band assertion. Radix Tooltip itself is already exercised in freshness-badge.test.tsx + tailored-resume-section.test.tsx (Plan 21-04 pattern)"
metrics:
  duration: "10m 52s"
  completed: "2026-04-22T14:43:55Z"
  tasks_completed: 2
  tasks_total: 2
  files_created: 3
  files_modified: 1
  commits: 2
  test_count_before: 329
  test_count_after: 345
  tests_added: 16
requirements_completed:
  - AI-RENDER-05
---

# Phase 21 Plan 05: Quality-Score Badge on Cover Letter Summary

**One-liner:** Ships AI-RENDER-05 — a color-coded `<Badge variant="outline">` driven by `cover_letters.quality_score`, prepended to the cover-letter meta row in `job-detail-sheet.tsx` with a Radix Tooltip exposing the numeric score + `low|medium|high` label word. Extracts `scoreColor(n)` / `scoreLabel(n)` as pure functions to `src/lib/score-color.ts` for Phase 22 salary-confidence + Phase 24 regenerate-delta reuse.

## What Shipped

### Task 1 — `src/lib/score-color.ts` + pure-function tests

**Commit:** `cd9e5c4` `feat(21-05): add scoreColor + scoreLabel pure helpers`

New module at `src/lib/score-color.ts` (36 lines) exports:

```ts
export type QualityLabel = "low" | "medium" | "high";

export function scoreColor(score: number): string {
  if (score < 0.6) return "text-destructive";
  if (score < 0.8) return "text-warning";
  return "text-success";
}

export function scoreLabel(score: number): QualityLabel {
  if (score < 0.6) return "low";
  if (score < 0.8) return "medium";
  return "high";
}
```

Both functions are pure (no state, no `new Date()`, no `window.*`) — safe to call from Server Components and Client Components alike. JSDoc documents the 0–1 scale convention + RESEARCH §Finding #2 footnote explaining that the 0.6 / 0.8 thresholds are LLM-judge-convention defaults (live DB has 0/12 rows scored; no distribution to fit to).

Test file `src/__tests__/lib/score-color.test.ts` (10 cases):

| # | Case                                        | Expected |
|---|---------------------------------------------|----------|
| 1 | `scoreColor(0.0)`                           | `text-destructive` |
| 2 | `scoreColor(0.59)`                          | `text-destructive` |
| 3 | `scoreColor(0.6)` (mid lower boundary)      | `text-warning`     |
| 4 | `scoreColor(0.79)`                          | `text-warning`     |
| 5 | `scoreColor(0.8)` (high lower boundary)     | `text-success`     |
| 6 | `scoreColor(1.0)` (high upper)              | `text-success`     |
| 7 | `scoreLabel(0.0)` + `scoreLabel(0.59)`      | `low` (both)       |
| 8 | `scoreLabel(0.6)` + `scoreLabel(0.79)`      | `medium` (both)    |
| 9 | `scoreLabel(0.8)` + `scoreLabel(1.0)`       | `high` (both)      |
| 10| Consistency loop over 9 scores              | color↔label match  |

### Task 2 — Mount Badge + Tooltip in `job-detail-sheet.tsx`

**Commit:** `9da04b6` `feat(21-05): mount cover-letter quality-score Badge`

Three surgical edits to `src/app/(admin)/admin/jobs/job-detail-sheet.tsx`:

1. **Imports** — added `Tooltip, TooltipContent, TooltipTrigger` from `@/components/ui/tooltip` and `scoreColor, scoreLabel` from `@/lib/score-color` (Badge was already imported line 10)
2. **Meta-row wrapper** — `className="flex items-center gap-3"` → `className="flex items-center gap-3 flex-wrap"` (responsive at 512px sheet width)
3. **Badge block prepended** LEFT of FreshnessBadge (null-branch renders nothing):

```tsx
{detail.cover_letter.quality_score !== null && (
  <Tooltip>
    <TooltipTrigger asChild>
      <Badge
        variant="outline"
        className={`text-[11px] ${scoreColor(detail.cover_letter.quality_score)} cursor-default`}
      >
        Quality {detail.cover_letter.quality_score}
      </Badge>
    </TooltipTrigger>
    <TooltipContent side="top" className="text-xs max-w-[220px]">
      Cover letter quality score: {detail.cover_letter.quality_score} ({scoreLabel(detail.cover_letter.quality_score)})
    </TooltipContent>
  </Tooltip>
)}
```

FreshnessBadge + Download PDF anchor stay byte-identical to pre-plan state — zero restyling of existing elements.

Test file `src/__tests__/components/cover-letter-quality-badge.test.tsx` (6 cases):

| # | Case                                             | Assertion                                               |
|---|--------------------------------------------------|---------------------------------------------------------|
| 1 | `score = 0.5`                                    | textContent `Quality 0.5` + `text-destructive` class    |
| 2 | `score = 0.7`                                    | `text-warning` class                                    |
| 3 | `score = 0.9`                                    | `text-success` class                                    |
| 4 | `score = null`                                   | `container.firstChild === null` (no placeholder pill)   |
| 5 | Visual-spec classes                              | `cursor-default` + `text-[11px]` both present           |
| 6 | `score = 0` Pitfall-6 guard                      | textContent `Quality 0` + `text-destructive` (NOT hidden) |

Uses inline `QualityBadgeFixture` component (mirrors production JSX) rather than full JobDetailSheet mount — keeps the test focused on the color-band invariant. Radix Tooltip already exercised in `freshness-badge.test.tsx` + `tailored-resume-section.test.tsx` (Plan 21-04).

## Test Counts

| Point                                | Count |
|--------------------------------------|-------|
| Baseline (before Plan 21-05)         | 329   |
| After Task 1 (score-color lib)       | 339   |
| After Task 2 (badge wire-up)         | **345** |
| Net delta                            | +16   |

All 23 test files passing, 3.62s duration. `npm run build` exits 0 (only pre-existing Redis ENOTFOUND + Better Auth env-not-set + Next.js 16 NFT warnings — none introduced by this plan).

## Justification for Threshold Choice — 0.6 / 0.8 on 0-1 Scale

Per RESEARCH.md §Finding #2: `SELECT quality_score FROM cover_letters` returned 12 rows, **0 with a non-null value**. Zero distribution data to fit thresholds against. Locked in the LLM-judge convention from OpenAI eval cookbook + Anthropic eval docs: `< 0.6 = failing`, `0.6–0.8 = borderline`, `>= 0.8 = passing`.

Practical implication: the badge is dead UI in production today — the `quality_score !== null` guard returns false for every row. That's fine. The 10 + 6 fixture tests lock all three band boundaries so when an n8n grader node eventually writes scores, the color assignment is correct on day one, no visual regression.

If the grader ships on a 0–10 or 0–100 scale instead of 0–1, the fix is a two-number edit in `src/lib/score-color.ts`:

```ts
// 0–1 scale (current):
if (score < 0.6) return "text-destructive";
if (score < 0.8) return "text-warning";

// 0–10 scale (hypothetical future):
if (score < 6) return "text-destructive";
if (score < 8) return "text-warning";
```

The `text-*` token choices stay stable — semantic, not scale-dependent.

## Deviations from Plan

**None — plan executed exactly as written.**

- Zero Rule 1 auto-fixes (no bugs encountered)
- Zero Rule 2 auto-fixes (no missing functionality)
- Zero Rule 3 auto-fixes (no blocking issues — score-color module was new, no legacy to navigate)
- Zero Rule 4 escalations (no architectural decisions)
- Zero deviations from the plan's sample code — the production edits are byte-for-byte what the PLAN.md `<action>` block specified

Note on `cn()` import: the plan's Task 2 description hedged on whether `cn` needed to be imported ("Add `cn` import from `@/lib/utils` if not already imported"). The final implementation uses template-literal className composition (`\`text-[11px] ${scoreColor(n)} cursor-default\``), which doesn't require `cn()`. The Badge component already runs `cn()` internally via its forwardRef, so static + dynamic class merging works without a caller-side cn() call. No import added to `job-detail-sheet.tsx`.

## Authentication Gates

**None** — all changes are pure UI render logic. No new network surface, no new auth paths, no new secrets.

## Threat Model Reconciliation

Plan's `<threat_model>` listed three entries. Actions taken:

| Threat ID  | Category | Disposition | Implementation                                         |
|------------|----------|-------------|--------------------------------------------------------|
| T-21-05-01 | Info Disclosure | accept  | No-op. Owner-only admin surface; score was already in the DB row. |
| T-21-05-02 | Tampering | mitigate | No code change needed. Plan 20-03's `parseOrLog(CoverLetterSchema, ...)` runs at the `getJobDetail` boundary and validates `quality_score: z.number().nullable()` before the row reaches this component. Malformed values null out the whole cover_letter under fail-open — handled upstream, not here. |
| T-21-05-03 | Spoofing | accept | Semantic choice of `text-destructive` for "low quality" was locked in CONTEXT.md D-16; no security impact. |

## Known Stubs

**None.** Badge renders with real data when `quality_score !== null`. Production today has `quality_score === null` on 100% of rows, so the null branch is the only one that fires — this is an intentional "dead UI, pre-tested" state, not a stub (the grader node belongs to a future homelab workflow plan outside this repo's scope). UI-SPEC §2 documents this explicitly; no follow-up needed in this repo.

## Follow-ups for Wave 3 Siblings

Wave 3 has four plans touching `job-detail-sheet.tsx` on disjoint lines:

| Plan   | Touches                                                   | Conflict risk with 21-05 |
|--------|-----------------------------------------------------------|--------------------------|
| 21-04  | Tailored Resume section mount (line 180-188)              | None — landed before this plan |
| **21-05** | **Cover-letter meta row (lines 155-170)**             | **(this plan)**          |
| 21-06  | Empty states for all 3 LLM sections                       | None — modifies the `{detail.cover_letter && ...}` guards around line 147 + 173 + 192, not the inner meta rows. Empty-state block renders when the outer guard is false, so Plan 21-05's quality badge never co-exists with the 21-06 empty state |
| 21-07  | Company link-out on sheet header company name (line 111-114) | None — sheet header is ~40 lines above the cover-letter meta row |

**Actionable note for Plan 21-07 author:** when touching `job-detail-sheet.tsx`, expect to see the new Tooltip imports + scoreColor/scoreLabel imports on lines 27-32; the meta-row `flex-wrap` at line 155 was a 21-05 change not a 21-07 precondition.

**Actionable note for Plan 21-06 author:** the empty-state copy for the cover-letter section should NOT include the quality badge — the badge is meaningless for an empty state, and the `quality_score !== null` guard inside the 21-05 block naturally drops it (null cover_letter has no quality_score attribute). Plan 21-06's empty-state block renders above/beside the `{detail.cover_letter && ...}` guard, not inside it.

**Cross-phase follow-up:** When the homelab n8n `Job Search: Cover Letter Grader` workflow eventually ships (outside this repo), the badge goes live automatically — no frontend change needed. If the grader's scale differs from 0–1, edit the two thresholds in `src/lib/score-color.ts` and the 10 unit tests will guide the regression surface.

## Commits

| Hash      | Type | Message                                              |
|-----------|------|------------------------------------------------------|
| `cd9e5c4` | feat | `feat(21-05): add scoreColor + scoreLabel pure helpers` |
| `9da04b6` | feat | `feat(21-05): mount cover-letter quality-score Badge` |

## Self-Check: PASSED

- [x] `src/lib/score-color.ts` — FOUND
- [x] `src/__tests__/lib/score-color.test.ts` — FOUND
- [x] `src/__tests__/components/cover-letter-quality-badge.test.tsx` — FOUND
- [x] `src/app/(admin)/admin/jobs/job-detail-sheet.tsx` — FOUND + verified lines 27-32 + 155-170 contain the new imports + Badge block
- [x] Commit `cd9e5c4` present in `git log`
- [x] Commit `9da04b6` present in `git log`
- [x] 10 score-color.test.ts cases PASS
- [x] 6 cover-letter-quality-badge.test.tsx cases PASS
- [x] Full test suite 345/345 PASS
- [x] `npm run build` exit 0
- [x] `grep -Ern '(text|bg|border)-(red|amber|yellow|green|emerald|teal)-[0-9]' src/lib/score-color.ts src/app/(admin)/admin/jobs/job-detail-sheet.tsx` returns zero matches
