---
phase: 21
slug: polish-copy-pdf-empty-states-link-out
status: draft
shadcn_initialized: true
preset: none (manual init — new-york style, zinc base, lucide icons; inherited from Phase 20)
created: 2026-04-21
---

# Phase 21 — UI Design Contract

> Visual and interaction contract for Phase 21. Covers five additive UI deliverables inside the already-shipped `job-detail-sheet.tsx` skeleton: tailored-resume copy+download action row, cover-letter quality-score badge, three empty-state blocks, company-website link-out in the sheet header, and the bundled Phase 20 `FreshnessBadge` date-format revision. Non-UI deliverables (n8n workflow edit, `ALTER TABLE tailored_resumes ADD COLUMN pdf_data TEXT` migration, schema-drift EXPECTED map entry, Zod `pdf_data` field, `getTailoredResumePdf` helper, `/api/jobs/[id]/tailored-resume-pdf` route) are out of scope for this document.

**Composes against:** Phase 20 UI-SPEC (render-tree cadence, section shells, color token set). Phase 21 adds buttons, badges, empty-state bodies, and one anchor wrap into the Phase 20 shells — no new section shells, no new color tokens, no new typography sizes.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | shadcn (manual init, inherited from Phase 20) |
| Preset | none (no ui.shadcn.com preset; `components.json` style `new-york`, base `zinc`) |
| Component library | radix (via shadcn/ui primitives) |
| Icon library | lucide-react (sizes `3`, `3.5`, `4` — inherited from Phase 20; no new sizes) |
| Font | `--font-sans: system-ui, -apple-system, sans-serif` (project default; not overridden in this phase) |

**Dependencies locked by Phase 20 (this phase re-uses, does not touch):**
- `streamdown@^2.5.0` renders tailored resume markdown with `skipHtml` + `linkSafety={{ enabled: false }}`
- `sonner` `<Toaster position="bottom-right" />` already mounted in `src/components/providers.tsx:12` — `toast.success(...)` is the one imperative call this phase adds
- Root `<TooltipProvider delayDuration={300}>` in `providers.tsx:9` — every new `<Tooltip>` in Phase 21 inherits this delay; no nested providers needed except where Radix `TooltipTrigger` demands one (e.g., existing `FreshnessBadge` wraps its own stale branch)

**Re-used primitives (already installed, zero new shadcn installs for Phase 21):**
`Badge`, `Button`, `Tooltip`, `TooltipContent`, `TooltipTrigger`, `Sheet`, `Separator`, `ScrollArea`. Verified against `src/components/ui/` listing (41 primitives present).

**New lucide-react icons referenced this phase (all verified present in the installed package):**
`Copy`, `Check` (icon morph for copy button), `ExternalLink` (company header link-out — already imported by the sheet for the Apply button), `Download` (already imported), `FileText` / `Building2` (already imported for section icons).

---

## Spacing Scale

Declared values (multiples of 4). Phase 21 adds no new spacing tokens — it inherits the rhythm Phase 20 locked in `job-detail-sheet.tsx`.

| Token | Value | Usage in Phase 21 |
|-------|-------|-------------------|
| xs | 4px (`gap-1`, `gap-1.5`) | Icon-to-text gap inside the header company link-out; gap between Quality badge and Freshness badge in the cover-letter meta row |
| sm | 8px (`gap-2`) | Gap between the three meta-row chips (Quality badge / Freshness badge / Download link); `flex-wrap gap-2` keeps the row from overflowing the 512px sheet |
| md | 12px / 16px (`gap-3`, `p-4`) | Between existing `flex items-center gap-3` meta row members (already shipped); inside the existing `bg-card/50 rounded-lg p-4` content container (unchanged) |
| lg | 24px (`space-y-6`) | Top-level section gap (inherited from parent `p-6 space-y-6` at `job-detail-sheet.tsx:87`) |

**Exceptions:** none. Every new element in Phase 21 sits inside an existing `space-y-3` / `flex items-center gap-3` / `flex items-center gap-1` wrapper from Phase 20.

**Icon-button target size:** `size-7` (28×28px) via `Button size="icon-sm"` OR inline `size-4` icon wrapped in a `size-7` ghost button (CONTEXT.md D-01 says "icon-only ghost Button"). Phase 21 SELECTS `Button variant="ghost" size="icon-sm"` because:
- Matches Phase 20's `size-3.5` inline meta-icon rhythm when combined with `[&_svg]:size-4`
- 28×28 is the tightest shadcn icon-button WCAG 2.5.5-acceptable target (the smaller `icon-xs` at 24×24 is below the 24px minimum target for inline meta rows)
- Fits comfortably inside the `flex items-center gap-3` meta row without wrap at 512px sheet width

---

## Typography

Carry-forward only. **No new sizes, no new weights introduced in this phase.** All new elements use the existing `job-detail-sheet.tsx` typography token set.

| Role | Size | Weight | Line Height | Usage in Phase 21 |
|------|------|--------|-------------|-------------------|
| Section heading | 14px (`text-sm`) | 600 (`font-semibold`) | 1.5 | Empty-state section heading (still renders even when body is empty, matches Phase 20 error-boundary posture) |
| Body / empty-state copy | 14px (`text-sm`) | 400 | 1.5 | The six empty-state strings; muted via `text-muted-foreground italic` |
| Meta / freshness label | 11px (`text-[11px]`) | 500 (`font-medium`) | 1.35 | Quality-score badge text (matches FreshnessBadge text size so the three meta chips stay visually uniform); company-link text (inherits from parent `text-sm text-muted-foreground` wrapper) |
| Download PDF link | 12px (`text-xs`) | 400 | 1.4 | `<a download>` anchor in tailored-resume meta row — matches cover-letter Download-PDF link at `job-detail-sheet.tsx:159` |
| Tooltip body | 12px (`text-xs`) | 400 | 1.4 | Tooltip on Copy button + Quality badge + (existing) FreshnessBadge stale dot |

**Quality-score number format:** display the score as-is from the DB, no hardcoded decimal places. Planner resolves exact formatting at plan Task 0 after live-DB sampling (CONTEXT.md D-15). **Researcher Note:** until Task 0 confirms, the render tree assumes a `number` — if Task 0 finds the column stores strings or a different scale (e.g., 0–10 or 0–100), the `scoreColor()` thresholds and the tooltip label mapping need adjustment but the visual contract (outline badge, three-band color, left-of-freshness placement) does not change.

---

## Color

Phase 21 introduces **zero new color tokens**. All new surfaces reference existing `@theme` tokens declared in `src/styles/globals.css`. No hardcoded Tailwind color names permitted — enforced by CLAUDE.md.

### Token usage table

| Role | Token | Value (OKLCH, from globals.css) | Usage in Phase 21 |
|------|-------|---------------------------------|-------------------|
| Dominant surface (60%) | `--color-background` | `oklch(0.18 0.02 260)` | Sheet background — unchanged |
| Secondary surface (30%) | `--color-card` / `bg-card/50` | `oklch(0.20 0.02 258)` | Markdown content container — unchanged |
| Accent (10%) | `--color-accent` | `oklch(0.78 0.12 75)` | Ghost-button hover background via shadcn `variant="ghost"` (`hover:bg-accent hover:text-accent-foreground`) — applies to the Copy button hover |
| Foreground | `--color-foreground` | `oklch(0.94 0.02 80)` | Company name anchor text (inherits parent `text-sm text-muted-foreground`) |
| Muted foreground | `--color-muted-foreground` | `oklch(0.62 0.03 250)` | Six empty-state lines; Download-PDF link rest-state? No — Download uses `text-primary` (see below). Empty-state italic body + company-link ExternalLink icon at `opacity-60` |
| Primary | `--color-primary` | `oklch(0.64 0.14 255)` | Download-PDF link `text-primary hover:underline` (matches cover-letter pattern at line 159) |
| Destructive (quality: LOW) | `--color-destructive` | `oklch(0.55 0.20 25)` | `text-destructive` on quality badge when score is in the low band (threshold TBD at plan Task 0) |
| Warning (quality: MID) | `--color-warning` | `oklch(0.85 0.17 85)` | `text-warning` on quality badge when score is mid band |
| Success (quality: HIGH) | `--color-success` | `oklch(0.76 0.18 160)` | `text-success` on quality badge when score is high band |
| Border | `--color-border` | `oklch(0.28 0.02 256)` | Quality-badge outline border (shadcn Badge `variant="outline"`); empty-state content container reuses existing border styling |
| Ring | `--color-ring` | `oklch(0.64 0.14 255)` | `focus-visible:ring-[3px] focus-visible:ring-ring/50` on every new interactive control (Copy button, Download link, company anchor, Quality-badge tooltip trigger) — inherited from shadcn Button baseline styling |

### Accent reserved for

- Ghost-button hover state on the Copy button (inherited from shadcn Button `variant="ghost"`). That is the SOLE accent-token usage this phase introduces.
- `--color-accent` is NOT used for any informational state (freshness, quality, empty states) — those stay on `muted-foreground` / `warning` / `success` / `destructive`.

### Explicit color prohibitions for this phase

- **No hardcoded Tailwind color classes in any .tsx file.** Forbidden specifically: `text-red-*`, `text-amber-*`, `text-yellow-*`, `text-green-*`, `text-orange-*`, `bg-red-*`, `bg-amber-*`, `bg-green-*`, `bg-blue-*`. CLAUDE.md rule; ESLint does not enforce this but code review must.
- **No inline `style={{ color: '...' }}`** — all color via Tailwind tokens referencing `@theme` vars.
- **Quality badge low band MUST be `text-destructive`**, not `text-red-500` or any other raw Tailwind red (CONTEXT.md D-16 locks the semantic token).
- **`opacity-60` on ExternalLink icon is fine** — opacity is not a color (see Cross-cutting §6 below).

**Researcher Note on low-band quality color:** CONTEXT.md D-16 names `destructive` for "low" quality scores. This is informational, not actionable — clicking the badge does nothing; the owner cannot "fix" the score from this UI. Phase 20 UI-SPEC §Color reserves `destructive` for "truly actionable failures in later phases" (regenerate failures in Phase 23). This is a minor semantic tension: a red badge on low-quality cover letters invites the reader to act, but there's no action to take until Phase 23 regenerate lands. I am honoring CONTEXT.md D-16 as-written (destructive = low score), but flagging this for the owner's awareness — if the owner later wants the quality badge to de-emphasize (e.g., use `muted-foreground` instead of `destructive` for low scores), the fix is a one-line change in the `scoreColor()` function and does not require re-planning.

---

## Copywriting Contract

### Tailored Resume — copy + download action row (AI-ACTION-01, AI-ACTION-02)

| Element | Copy | Notes |
|---------|------|-------|
| Copy button `aria-label` | `Copy tailored resume to clipboard` | Visible only to assistive tech; lock exactly |
| Copy button Tooltip content | `Copy to clipboard` | CONTEXT.md D-01 verbatim |
| Copy button success toast | `Resume copied to clipboard` | Passed to `toast.success(...)`; lock exactly (CONTEXT.md D-01). No trailing period |
| Copy icon (default) | `Copy` from lucide-react at `className="size-4"` | — |
| Copy icon (confirmation) | `Check` from lucide-react at `className="size-4"` | Replaces `Copy` for ~2000ms then reverts (researcher proposes 200ms `transition-opacity` fade, 2000ms hold, 200ms fade back; planner may adjust) |
| Download PDF anchor label | `Download PDF` | Matches existing cover-letter link at `job-detail-sheet.tsx:161` verbatim |
| Download PDF icon | `Download` from lucide-react at `className="size-3"` | Matches cover-letter icon size at line 161 |
| Download PDF href | `/api/jobs/${detail.id}/tailored-resume-pdf` | Exact mirror of cover-letter path; the API route is new this phase (not covered here; out-of-scope per CONTEXT.md D-04) |

### Cover Letter — quality-score badge (AI-RENDER-05)

| Element | Copy | Notes |
|---------|------|-------|
| Badge visible text | `Quality {score}` | Where `{score}` is the raw DB value (number format TBD at plan Task 0 per D-15) |
| Badge Tooltip content | `Cover letter quality score: {score} ({label})` | Where `label = "low" \| "medium" \| "high"` is derived by `scoreColor()` below. Wording matches CONTEXT.md D-17. Exact threshold numbers TBD at plan Task 0 |
| Badge when `quality_score === null` | render nothing (no DOM element) | CONTEXT.md D-18; matches FreshnessBadge null-branch precedent from Plan 20-04 |

### Empty-state blocks — all three LLM sections (AI-RENDER-04)

Six literal strings locked in CONTEXT.md D-12. Render verbatim.

| Section | Condition | Copy |
|---------|-----------|------|
| Cover Letter | never generated (`detail.cover_letter === null`) | `No cover letter yet.` |
| Cover Letter | generated but empty | `Cover letter was generated but is empty.` |
| Tailored Resume | never generated (`detail.tailored_resume === null`) | `No tailored resume yet.` |
| Tailored Resume | generated but empty | `Tailored resume was generated but is empty.` |
| Company Intel | never generated (`detail.company_research === null`) | `No company research yet.` |
| Company Intel | generated but empty | `Company research was generated but is empty.` |

**Tone contract (CONTEXT.md D-12):** Direct, state-only. No CTAs. No references to Phase 23 triggers ("click Research", "click Regenerate") that don't exist yet. No exclamation points. One period per line.

### Company link-out (AI-RENDER-06)

| Element | Copy | Notes |
|---------|------|-------|
| Anchor visible text | `{detail.company}` | Unchanged from current header rendering at `job-detail-sheet.tsx:114` — company name is the accessible name of the link |
| ExternalLink icon | `ExternalLink` from lucide-react at `className="size-3 opacity-60"` | `aria-hidden="true"` — link already has a name via company text (CONTEXT.md D-20) |
| Anchor `title` attribute | *(none)* | Tooltip not required — destination is unambiguous from the company name and ExternalLink icon |
| Anchor `rel` | `noopener noreferrer` | Mandatory per CONTEXT.md D-21 (tabnabbing guard; matches existing Apply button at line 74) |
| Anchor `target` | `_blank` | New tab |

### FreshnessBadge revision (Phase 20 revision bundled before Phase 21 begins)

| Element | Copy | Notes |
|---------|------|-------|
| Fresh state — meta line | `Generated {generatedDate} · {modelUsed}` | Example: `Generated 4/21/26 · gpt-4o-mini`. Middle-dot separator unchanged (U+00B7, `aria-hidden="true"`) |
| Fresh state — no model | `Generated {generatedDate}` | When `modelUsed === null`, drop separator and model name — unchanged from Plan 20-04 |
| Stale state — meta line | `Generated {generatedDate} · {modelUsed}` + amber dot | Amber `size-1.5 rounded-full bg-warning` dot with `aria-label="Stale artifact"` — unchanged from Plan 20-04 |
| Stale tooltip | `Generated {ageDays} days ago; may need regeneration` | Unchanged — `ageDays` prop already exists, is server-computed, and drives the tooltip without needing `relativeTime` |
| Missing timestamp | Hide the badge entirely | Unchanged |

**Destructive actions in this phase:** none. Tailored Resume section remains read-only; the new Copy and Download buttons are non-destructive reads. No confirm dialogs ship in Phase 21.

**Primary CTA for this phase:** none new. The sheet's existing "Apply Now" button (line 133) is untouched. The Copy and Download buttons are secondary utilities on a read-only artifact.

---

## Component Contracts

Exact interaction + visual contracts for each Phase 21 UI element.

### 1. Tailored Resume meta row — Copy + Download buttons

**Location:** inside `src/app/(admin)/admin/jobs/tailored-resume-section.tsx`, appended to the existing `<div className="flex items-center justify-between">` header row where `FreshnessBadge` currently sits alone.

**Layout A** (CONTEXT.md D-05, locked): `[FileText] Tailored Resume .......... [FreshnessBadge] [Copy] [Download PDF]` — badge left, Copy middle, Download right.

**Render tree (expected markup inside `TailoredResumeSection`):**

```tsx
<div className="space-y-3">
  <div className="flex items-center justify-between">
    <h3 className="text-sm font-semibold flex items-center gap-1.5">
      <FileText className="size-4" />
      Tailored Resume
    </h3>
    <div className="flex items-center gap-3 flex-wrap">
      <FreshnessBadge
        generatedDate={resume.freshness.generatedDate}
        modelUsed={resume.model_used}
        isStale={resume.freshness.isStale}
        ageDays={resume.freshness.ageDays}
      />
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Copy tailored resume to clipboard"
            onClick={handleCopy}
            className="text-muted-foreground"
          >
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          Copy to clipboard
        </TooltipContent>
      </Tooltip>
      <a
        href={`/api/jobs/${jobId}/tailored-resume-pdf`}
        download
        className="inline-flex items-center gap-1 text-xs text-primary hover:underline focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 rounded-sm"
      >
        <Download className="size-3" />
        Download PDF
      </a>
    </div>
  </div>
  {/* existing Streamdown body unchanged */}
</div>
```

**Behavior:**

- `handleCopy`:
  1. `navigator.clipboard.writeText(resume.content)` — **raw markdown, verbatim** (CONTEXT.md D-02; no plain-text flattening)
  2. `toast.success("Resume copied to clipboard")` — exact string
  3. `setCopied(true)` then `setTimeout(() => setCopied(false), 2000)` — researcher proposes 2000ms hold; planner may adjust
  4. On error (e.g., clipboard permission denied, non-secure context): fall back to no toast; do NOT show an error toast. Silent fail preserves Phase 20's read-path posture and the button can be re-clicked.
- Download anchor uses the browser's native download UX. **No toast on download** (CONTEXT.md §7 cross-cutting — "browser's download UI is sufficient"). Right-click "Save link as" works naturally because it's an `<a>`, not a button.
- **`jobId` prop addition:** `TailoredResumeSection` currently does not take `jobId` — Phase 21 adds it to the `Props` interface so the Download anchor can build the API route path. Diff is one additional prop + one line of JSX.

**Interaction states:**

| State | Trigger | Visual |
|-------|---------|--------|
| Default (Copy) | Rest | `Button variant="ghost"`: transparent bg, `text-muted-foreground` icon |
| Hover (Copy) | mouse enter | shadcn ghost hover: `hover:bg-accent hover:text-accent-foreground` |
| Focus-visible (Copy) | tab keyboard | shadcn default: `focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50` |
| Active (Copy) | mousedown | shadcn default (no explicit override) |
| Confirmation (Copy) | 0–2000ms after click | Icon morphs to `Check`; button otherwise unchanged; toast visible at bottom-right |
| Disabled (Copy) | N/A in Phase 21 | Button is never disabled — copy is always available when a resume row is rendered |
| Default (Download) | Rest | `text-primary` text + `size-3` icon, no underline |
| Hover (Download) | mouse enter | `hover:underline` (no color change — preserves existing pattern at line 159) |
| Focus-visible (Download) | tab keyboard | `focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 rounded-sm` (added this phase; the existing cover-letter link at line 159 lacks a visible focus ring — fix forward in Phase 21's diff) |

**Accessibility:**

- Copy button: `aria-label="Copy tailored resume to clipboard"` on the `<Button>`. The Radix Tooltip content (`"Copy to clipboard"`) provides a visual hint on hover and is accessible via `aria-describedby`, but the `aria-label` is the authoritative accessible name. **Do not rely on Radix Tooltip alone** — some screen-reader + browser combinations do not read TooltipContent reliably.
- Download anchor: no extra ARIA needed — "Download PDF" text IS the accessible name.
- Both controls are keyboard-reachable via tab traversal (Button and anchor are natively focusable).
- Confirmation icon change (`Copy` → `Check`): `aria-label` stays the same. The toast serves as the SR announcement (sonner emits `role="status"` for success toasts).

**Responsive:**

- At the 512px (`sm:max-w-lg`) sheet width, the meta row measures roughly `FreshnessBadge (~180px) + gap-3 + Button (28px) + gap-3 + Download link (~110px)` ≈ 340px. Fits the heading-justified right side comfortably.
- `flex-wrap` on the meta-row container is specified as a safety net — if the model name is unusually long (e.g., `"claude-3-5-sonnet-20241022"`), the FreshnessBadge can wrap to a new line without pushing the Copy/Download buttons off-screen.

**Validation (planner turns these into Vitest assertions):**

- `container.querySelector('[aria-label="Copy tailored resume to clipboard"]')` returns a non-null element
- `container.querySelector('a[download][href^="/api/jobs/"][href$="/tailored-resume-pdf"]')` returns a non-null element
- After user-event click on the Copy button, `sonner.toast.success` was called once with `"Resume copied to clipboard"` (mock sonner import)
- After user-event click on the Copy button, `navigator.clipboard.writeText` was called once with the exact `resume.content` string (mock clipboard API)
- After 2000ms advance (`vi.advanceTimersByTime`), the `Check` icon SVG is replaced by the `Copy` icon SVG (assert via `data-lucide` attr or SVG path diff)

---

### 2. Cover Letter meta row — quality-score badge

**Location:** `src/app/(admin)/admin/jobs/job-detail-sheet.tsx` inside the existing cover-letter block at lines 141-171, prepended to the meta row (before `<FreshnessBadge>`).

**Render tree (expected markup, additive — existing FreshnessBadge + Download link unchanged):**

```tsx
<div className="flex items-center gap-3">
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
  <FreshnessBadge {/* existing, prop rename to generatedDate per §5 */} />
  <a href={`/api/jobs/${detail.id}/cover-letter-pdf`} download {/* existing */}>
    <Download className="size-3" /> Download PDF
  </a>
</div>
```

**Color-mapping function contract:**

```ts
type QualityLabel = "low" | "medium" | "high";

/**
 * Returns the semantic Tailwind token class for a quality score.
 * Thresholds TBD at plan Task 0 — DO NOT hardcode literal numbers here
 * until verification of the n8n grader node + a live-DB sample of
 * cover_letters.quality_score.
 *
 * Contract:
 *   - low band  → "text-destructive"
 *   - mid band  → "text-warning"
 *   - high band → "text-success"
 */
function scoreColor(score: number): string;

function scoreLabel(score: number): QualityLabel;
```

- Both helpers sit colocated with the detail sheet (or factored to `src/lib/quality-score.ts` if planner prefers — small pure functions, Claude's discretion per CONTEXT.md)
- The three returned classes are the ONLY acceptable output of `scoreColor`. Planner must not introduce new tokens in Task 0 — thresholds shift, tokens don't
- Thresholds numerically locked in the plan doc at plan Task 0 after DB sampling (CONTEXT.md D-15). UI-SPEC does not lock them

**Visual specs:**

| Element | Style | Color |
|---------|-------|-------|
| Badge shape | shadcn `Badge variant="outline"` → `bg-transparent border border-border rounded-full px-2.5 py-0.5 text-xs font-medium tracking-wide` | Border: `--color-border` |
| Badge text color | Dynamic via `scoreColor()` | `text-destructive` / `text-warning` / `text-success` |
| Badge text size override | `text-[11px]` applied via className to match FreshnessBadge 11px (shadcn Badge default is `text-xs`/12px) | — |
| Badge cursor | `cursor-default` | Signals "info, not clickable" — matches stale-dot pattern |
| Badge placement | Left of FreshnessBadge (first child in the meta row's `flex items-center gap-3` wrapper) | CONTEXT.md D-17 |
| Tooltip delay | Inherited from root `TooltipProvider delayDuration={300}` | — |
| Tooltip max width | `max-w-[220px]` | Matches FreshnessBadge stale-tooltip pattern |

**Behavior:**

- When `quality_score === null`: render nothing. **No placeholder, no "No score" pill, no "N/A" text.** Matches CONTEXT.md D-18 and FreshnessBadge null-branch precedent.
- When `quality_score` is a valid number: render the Badge + Tooltip pair. Tooltip is on the Badge itself (not a separate trigger) — hovering the badge reveals the descriptive text including the label word.
- Score number format: display as-is from the DB. Planner confirms decimal handling at plan Task 0.

**Accessibility:**

- Badge is wrapped in `<Tooltip>` / `<TooltipTrigger asChild>` — Radix exposes it as a `role="button"` with `tabindex="0"` automatically, making it keyboard-focusable. This is correct: the badge IS informational data the owner may want to dwell on, and a tooltip trigger must be focusable for keyboard users.
- `cursor-default` signals non-actionable to mouse users; screen readers announce the tooltip content when the badge receives focus.
- Tooltip content includes the numeric score AND the textual label — colorblind users can read "(low)" without relying on the red hue.

**Validation:**

- `container.querySelector('[role="button"]')?.textContent` matches `/^Quality \d/` when `quality_score` is not null
- When `quality_score === null`, no element with text `/^Quality /` exists in the DOM
- A Vitest test iterates three fixtures (low score, mid score, high score) and asserts the Badge's className contains `text-destructive`, `text-warning`, `text-success` respectively — using whatever thresholds Task 0 locks

---

### 3. Empty-state blocks — all three LLM sections

**Location:** `src/app/(admin)/admin/jobs/job-detail-sheet.tsx` (Cover Letter and Company Intel sections) and `src/app/(admin)/admin/jobs/tailored-resume-section.tsx` (replace the current `if (!resume) return null;` early return).

**Render tree (one block per section, same shape for "never generated" and "generated but empty" — only the body string differs):**

```tsx
<div className="space-y-3">
  <h3 className="text-sm font-semibold flex items-center gap-1.5">
    <FileText className="size-4" /> {/* or Building2 for Company Intel */}
    Cover Letter {/* section-specific heading */}
  </h3>
  <p className="text-sm text-muted-foreground italic">
    {emptyStateCopy}
  </p>
</div>
```

**What is NOT rendered in an empty state:**

- **No `<FreshnessBadge>`** — there's no `generated_at` to show (CONTEXT.md D-13)
- **No Download PDF link** — there's no `pdf_data` row to stream
- **No Copy button** (tailored resume) — there's nothing to copy
- **No Quality badge** (cover letter) — no row means no `quality_score`
- **No `<Separator />` suppression** — separators between sections stay (CONTEXT.md D-13: "section shell preserved"). Every sheet still shows Cover Letter / Tailored Resume / Company Intel headings in order regardless of pipeline state

**Section order preserved (unchanged from Phase 20):** Header → Apply button → Cover Letter → Tailored Resume → Company Intel → Description. Empty-state bodies sit INSIDE their respective sections.

**Error-boundary composition:** empty-state blocks render **inside** the existing `<SectionErrorBoundary>` wrappers from Plan 20-06. The boundary's fallback ("Couldn't render this section — the data may have changed shape.") is reserved for Zod/Streamdown/render exceptions — not for "intentionally empty" states. Phase 21 adds NO new error boundaries.

**Detection predicates (proposed — planner may refine per CONTEXT.md D-14):**

| Section | Never-generated predicate | Generated-but-empty predicate |
|---------|---------------------------|------------------------------|
| Cover Letter | `detail.cover_letter === null` | `detail.cover_letter !== null && !detail.cover_letter.content?.trim()` |
| Tailored Resume | `detail.tailored_resume === null` (equivalent: `resume === null` inside the component) | `resume !== null && !resume.content?.trim()` |
| Company Intel | `detail.company_research === null` | `detail.company_research !== null && isCompanyResearchEmpty(detail.company_research)` |

Where `isCompanyResearchEmpty()` is defined as:

```ts
function isCompanyResearchEmpty(cr: CompanyResearch): boolean {
  return (
    !cr.ai_summary?.trim() &&
    (!cr.tech_stack || cr.tech_stack.length === 0) &&
    !cr.recent_news?.trim() &&
    cr.glassdoor_rating === null &&
    cr.employee_count === null &&
    cr.funding_stage === null &&
    cr.salary_range_min === null &&
    cr.salary_range_max === null
  );
}
```

**Researcher Note on company_research empty predicate:** CONTEXT.md D-14 explicitly flags this as "Claude's discretion during planning (may refine based on what a real 'empty company_research' row looks like post-Phase-23)". The proposal above is conservative — it treats a row where EVERY field is null/empty as "generated but empty". In practice, n8n's company-research workflow may always populate `ai_summary` (even with a "Could not find information about this company" string), in which case the strict definition here will never match and the "generated but empty" branch becomes dead code. Planner should sample 3-5 real `company_research` rows from the jobs database and tighten the predicate accordingly. The UI-SPEC locks the shape of the predicate (pure function, boolean return, pure-presentational in the detail-sheet component) but not the exact field list.

**Visual specs:**

| Element | Style | Color |
|---------|-------|-------|
| Heading | `text-sm font-semibold flex items-center gap-1.5` | `--color-foreground` (full contrast — section heading is NOT dimmed, unlike the error-boundary fallback which IS dimmed to signal degraded state) |
| Heading icon | Matches section's normal icon (`FileText` / `Building2`) at `size-4` | Inherits heading color |
| Body | `text-sm text-muted-foreground italic` | `--color-muted-foreground` |
| Container | `space-y-3` | No background, no border, no icon-box, no CTA |

**Key visual contrast with the error-boundary fallback (Plan 20-04):**

- **Error fallback** (data-shape failure): heading is `text-muted-foreground` (dimmed), body is italic muted — signals "degraded state, something went wrong"
- **Empty state** (data absence): heading is `text-foreground` (full contrast), body is italic muted — signals "expected state, just no data here yet"

This difference is intentional per CONTEXT.md D-13 + Phase 20 UI-SPEC §3. Absence is not a failure.

**Accessibility:**

- Heading stays an `<h3>` — screen-reader section navigation still finds all three sections regardless of empty state
- Italic body is announced normally by screen readers; italic is a visual-only cue for "not real content"
- Copy reads naturally as complete sentences — no telegraphic headings requiring ARIA overrides

**Validation:**

- Each of the 6 exact strings in the copy contract table appears in a `<p>` with class `italic` and class containing `text-muted-foreground` in the appropriate fixture
- Fixture where `detail.cover_letter === null` does NOT render `<FreshnessBadge>` for Cover Letter (querying for it returns null), but DOES render the `<h3>` with `Cover Letter` text
- Fixture where the three LLM fields are all null renders three muted italic `<p>`s — one per section — and zero `<FreshnessBadge>` elements

---

### 4. Company link-out — sheet header

**Location:** `src/app/(admin)/admin/jobs/job-detail-sheet.tsx:111-116` — the existing `<span className="flex items-center gap-1">` wrapping company name + Building2 icon.

**Render tree (conditional wrap — the existing `<span>` stays when no URL resolves):**

```tsx
{detail.company && (() => {
  const companyUrl = normalizeUrl(
    detail.company_research?.company_url ?? detail.company_url ?? null
  );
  const inner = (
    <>
      <Building2 className="size-3.5" />
      {detail.company}
      {companyUrl && (
        <ExternalLink
          className="size-3 opacity-60"
          aria-hidden="true"
        />
      )}
    </>
  );
  return companyUrl ? (
    <a
      href={companyUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-1 hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded-sm"
    >
      {inner}
    </a>
  ) : (
    <span className="flex items-center gap-1">{inner}</span>
  );
})()}
```

**URL resolution (CONTEXT.md D-19):**

```ts
const resolvedUrl: string | null = 
  detail.company_research?.company_url ?? detail.company_url ?? null;
const normalizedUrl: string | null = normalizeUrl(resolvedUrl);
```

- LLM-researched URL (`company_research.company_url`) is preferred because it's more likely canonical
- Feed-provided URL (`jobs.company_url`) is the fallback — always populated on ingest but often a tracking redirect
- Both `null` → hide the link entirely; render the plain `<span>` unchanged from current behavior

**Normalization helper contract:**

```ts
/**
 * Normalize a raw URL string for use in an <a href>.
 * 
 * Rules:
 *   - Already has http:// or https:// → return as-is
 *   - Starts with www. or contains a dot with no whitespace → prepend https://
 *   - Empty string, "-", "N/A", "null", "undefined", or anything without
 *     a dot → return null (caller hides the link)
 *
 * Pure function. No side effects. No network calls. Lives inline in
 * the detail-sheet component OR in `src/lib/url-helpers.ts` (planner's
 * choice per CONTEXT.md §Claude's Discretion).
 */
function normalizeUrl(raw: string | null): string | null;
```

**Input → output table (locked expectations — Vitest fixture):**

| Input | Output |
|-------|--------|
| `"https://acme.com"` | `"https://acme.com"` |
| `"http://acme.com"` | `"http://acme.com"` |
| `"https://acme.com/about?ref=x"` | `"https://acme.com/about?ref=x"` |
| `"www.acme.com"` | `"https://www.acme.com"` |
| `"acme.com"` | `"https://acme.com"` |
| `"acme.com/careers"` | `"https://acme.com/careers"` |
| `""` | `null` |
| `"-"` | `null` |
| `"N/A"` | `null` |
| `"n/a"` | `null` |
| `"null"` | `null` |
| `"undefined"` | `null` |
| `null` | `null` |
| `"just a string no dots"` | `null` |
| `"   "` (whitespace only) | `null` |

**Researcher Note on normalization edge cases:** the predicate "contains a dot with no whitespace" will accept `"file.txt"` or `"v1.2.3"` as valid domains — these would render as `https://file.txt`, which is a broken link but not a security issue (`target="_blank" rel="noopener noreferrer"` prevents tabnabbing; browser's DNS lookup fails silently). The alternative — a stricter regex like `/^[a-z0-9.-]+\.[a-z]{2,}$/i` — is more correct but adds test-case burden for a low-impact edge case. UI-SPEC accepts the lenient form and flags this tradeoff; planner may tighten if desired.

**Visual specs:**

| Element | Style | Color |
|---------|-------|-------|
| Anchor wrapper | `flex items-center gap-1 hover:underline rounded-sm` | Inherits parent `text-sm text-muted-foreground` |
| Focus ring | `focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring` | `--color-ring` |
| Building2 icon | `size-3.5` | Inherits muted color |
| ExternalLink icon | `size-3 opacity-60` | Inherits muted color at 60% opacity |
| Hover | `underline` only — no color change | Preserves existing header typography (CONTEXT.md D-20) |

**Behavior:**

- Click opens in new tab (`target="_blank"`)
- Modifier-click behaviors inherited from standard anchor: Cmd/Ctrl+click opens in background tab, Shift+click opens in new window, middle-click opens in background tab
- **No side effects on job status.** The Apply button at line 133 is the only status-changer. Clicking the company link does NOT mark the job as `applied` or `interested` (CONTEXT.md D-21)
- `rel="noopener noreferrer"` is mandatory — prevents third-party site from accessing `window.opener` (tabnabbing)

**Accessibility:**

- Anchor's accessible name = the visible company text (e.g., "Acme Corp"). ExternalLink icon is `aria-hidden="true"` because the link text already names the destination and icon is decorative
- Focus ring matches the overall shadcn focus convention (`focus-visible:ring-*`), with a slightly narrower ring (`ring-1` instead of `ring-[3px]`) because the anchor sits in a dense metadata row — a 3px ring would overlap the badge next to it
- `hover:underline` provides a non-color visual cue (underline) in addition to the external-link icon — colorblind-safe

**Validation:**

- When URL resolves: `container.querySelector('a[target="_blank"][rel="noopener noreferrer"]')` returns a non-null element whose `textContent` includes the company name
- When URL resolves: `container.querySelector('a[target="_blank"] [aria-hidden="true"]')` returns the ExternalLink SVG (hidden from AT)
- When both URLs null: no anchor element wraps the company text; the header still renders the company name in a `<span>`
- `normalizeUrl` helper has a Vitest suite asserting each input/output pair in the table above

---

### 5. FreshnessBadge revision (Phase 20 revision bundled before Phase 21 planning)

**Locked behavior:** component prop rename only — `relativeTime: string` becomes `generatedDate: string`. Display text changes from `Generated 3 days ago · gpt-4o-mini` to `Generated 4/21/26 · gpt-4o-mini`.

**Scope (what changes):**

1. `src/app/(admin)/admin/jobs/freshness-badge.tsx` — prop rename; no layout change
2. `src/lib/job-actions.ts` inside `attachFreshness` helper — compute the formatted date and return `generatedDate` instead of `relativeTime`
3. `src/__tests__/app/freshness-badge.test.tsx` — rename prop references; replace `"3 days ago"` assertions with `"4/21/26"`-style matches
4. Any `attachFreshness` tests — same rename
5. Any callers (currently 2 external + 1 internal to `TailoredResumeSection`) — prop rename

**Scope (what does NOT change):**

- Amber stale dot (`size-1.5 rounded-full bg-warning`) — pixel-identical
- `aria-label="Stale artifact"` — unchanged
- Middle-dot separator (`·`) — unchanged, still `aria-hidden="true"`
- Stale tooltip text: `Generated {ageDays} days ago; may need regeneration` — uses existing `ageDays` prop; **NOT** `Generated 4/21/26 days ago`
- `14d` / `14d` / `60d` thresholds (Cover Letter / Tailored Resume / Company Intel) — unchanged
- Middle-text font classes (`text-[11px] font-medium text-muted-foreground`) — unchanged
- Null-branch behavior (returns null when no timestamp) — unchanged: `if (!generatedDate) return null;` replaces `if (!relativeTime) return null;`

**Date-format contract (server-side in `attachFreshness`):**

```ts
const generatedDate = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Chicago",
  month: "numeric",
  day: "numeric",
  year: "2-digit",
}).format(new Date(artifact.generated_at ?? artifact.created_at));
// → "4/21/26" for April 21, 2026 in Chicago time
```

- America/Chicago timezone is mandated by CLAUDE.md §Key Decisions ("Explicit timezone on all date formatters")
- `Intl.DateTimeFormat` runs on the server (inside `attachFreshness`), producing a primitive string passed to the client component — hydration-safe per Phase 20 UI-SPEC §Pattern 2
- Invalid dates: `attachFreshness` already zeroes freshness on `Number.isNaN(generated.getTime())` (STATE.md); that code path is preserved. Formatted date for a NaN input would be `"Invalid Date"` — `attachFreshness` continues to return null-freshness before formatting is attempted, so `FreshnessBadge` never sees `"Invalid Date"`

**Researcher Note on the revision:** this is a user-visible change that trades a human-friendly approximation ("3 days ago") for a factual primitive ("4/21/26"). The amber stale-dot and its tooltip still answer "is this stale?" directly — the ROADMAP SC #3 language ("relative time badge") remains satisfied because the STALE signal is relative (the dot is either present or absent based on `isStale()` which uses age math). The formal date + informational dot combination is actually stronger than the old design: the dot tells you "needs attention", the date tells you the exact provenance timestamp you can quote to yourself. No concern raised with the revision.

**Validation:**

- `attachFreshness` unit test: given `{ generated_at: "2026-04-18T14:00:00.000Z" }` and a frozen `Date.now()` equivalent to Apr 21 2026, returns `{ generatedDate: "4/18/26", isStale: false, ageDays: 3 }` (or similar; exact ageDays depends on Chicago DST at that timestamp — planner verifies the frozen-clock setup)
- `FreshnessBadge` render test: `<FreshnessBadge generatedDate="4/21/26" modelUsed="gpt-4o-mini" isStale={false} ageDays={0} />` renders textContent matching `/Generated 4\/21\/26 · gpt-4o-mini/`
- Regression test: amber dot still renders when `isStale=true` — `container.querySelector('[aria-label="Stale artifact"]')` non-null; tooltip still reads `/Generated \d+ days ago/` (ageDays-driven, not date-driven)

---

## Cross-cutting UI contracts (MUST for every new element this phase)

### Hydration safety

Every new component receiving server-computed values takes them as **pre-computed primitives from Server Components**. No `new Date()`, no `window.location`, no `Date.now()` during render in any Phase 21 client component.

- `resume.freshness.generatedDate` is computed in `attachFreshness` (server)
- Quality badge class is derived from a pure function of the DB-row `quality_score` (no clock, no locale lookup)
- `normalizeUrl` is pure (no network, no DOM, no env access)
- Copy button `setTimeout` is a client-only side effect triggered by click — not a render-time computation, so no hydration concern

**This is a MUST. Any deviation is an immediate UI-SPEC checker failure.**

### Color tokens (CLAUDE.md enforcement)

No raw Tailwind color classes in any .tsx file edited in Phase 21. Specifically forbidden:

| Forbidden | Use instead |
|-----------|-------------|
| `text-red-500`, `text-red-600`, `bg-red-*` | `text-destructive` / `bg-destructive/10` |
| `text-amber-500`, `text-yellow-*`, `bg-amber-*` | `text-warning` / `bg-warning/10` |
| `text-green-500`, `text-emerald-*`, `bg-green-*` | `text-success` / `bg-success/10` |
| `text-blue-500`, `bg-blue-*` | `text-primary` / `bg-primary/10` |
| `text-gray-*`, `text-zinc-*`, `text-slate-*` | `text-muted-foreground` / `text-foreground` |
| `border-red-*`, `border-green-*` | `border-destructive` / `border-success` |

**`opacity-60` on the ExternalLink icon is explicitly ALLOWED** — opacity is not a color class, it's an alpha modifier. The underlying color still comes from a semantic token (inherited `text-muted-foreground`).

### Accessibility contract

| Element | Accessible name source | Extra ARIA |
|---------|------------------------|------------|
| Copy button | `aria-label="Copy tailored resume to clipboard"` | — |
| Copy Tooltip trigger | Button's aria-label | Tooltip content is `aria-describedby` on the button |
| Quality badge | Tooltip text (Radix wires this) | `role="button"`, `tabindex="0"` (Radix default) |
| Download PDF link | Link's visible text ("Download PDF") | — |
| Company link anchor | Link's visible text (company name) | — |
| ExternalLink icon in anchor | `aria-hidden="true"` (decorative) | — |
| Building2 icon in anchor | `aria-hidden="true"` (decorative) | — |
| Empty-state body `<p>` | Normal text | — |
| Empty-state heading `<h3>` | Section name text | — |

All interactive elements MUST be keyboard-reachable via tab traversal and MUST have a visible focus indicator (`focus-visible:ring-*`). Default shadcn Button + anchor with our explicit focus-ring classes satisfies this.

### Interaction states (every new control)

| Control | Default | Hover | Focus-visible | Active | Disabled |
|---------|---------|-------|---------------|--------|----------|
| Copy button | `variant="ghost"` transparent bg + `text-muted-foreground` icon | `hover:bg-accent hover:text-accent-foreground` | `focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50` | shadcn default | N/A (never disabled in Phase 21) |
| Download PDF link | `text-primary text-xs` + `size-3` icon | `hover:underline` | `focus-visible:ring-[3px] focus-visible:ring-ring/50 rounded-sm` | — | N/A |
| Company anchor | `text-muted-foreground` inherited + icon opacity-60 | `hover:underline` | `focus-visible:ring-1 focus-visible:ring-ring rounded-sm` | — | N/A |
| Quality badge (Tooltip trigger) | `Badge variant="outline"` + dynamic text color | no change (cursor-default) | Radix Tooltip default focus (visible outline via Badge's inherited border) | — | N/A |

Use `focus-visible` (NOT `focus`) to match shadcn convention — focus rings appear only on keyboard traversal, not on mouse click.

### Toast stack contract

- **Exactly one `toast.success` call per Phase 21 component: the Copy button.** Copy: `toast.success("Resume copied to clipboard")`.
- **No toasts for Download PDF** (browser download UI is sufficient per CONTEXT.md §Cross-cutting)
- **No toasts for Quality badge render** (passive signal)
- **No toasts for Company link click** (new-tab navigation is its own confirmation)
- **No error toasts in Phase 21.** Clipboard permission denied fails silently; the owner can re-click.

**If Phase 21 planning discovers a need for a second toast call, raise it to the owner before adding.** The one-toast rule keeps the admin dashboard from becoming noisy.

### Responsive contract

- Detail Sheet is `w-full sm:max-w-lg` = 512px on viewports ≥ 640px; full width below
- Tailored Resume meta row MUST not overflow horizontally at 512px — use `flex-wrap gap-2` OR `flex-wrap gap-3` on the meta-row container as an overflow safety net. Expected laid-out width ≈ 340px per §1; comfortable fit
- Cover Letter meta row MUST not overflow at 512px. Three chips: Quality badge (~80px) + FreshnessBadge (~180px) + Download link (~110px) + 2×`gap-3` (24px) ≈ 394px. Fits comfortably
- Company header anchor: `flex-wrap` on the parent flex row at `job-detail-sheet.tsx:110` already handles overflow. Anchor itself (company name + Building2 + ExternalLink) is ≤ 200px for typical names

### What this UI-SPEC DOES NOT cover (defer to planning / execution)

- Exact pixel sizes of hover backgrounds — shadcn Button variants own these
- Motion timing for the Copy icon morph — researcher proposes `200ms fade + 2000ms hold + 200ms fade back`; planner finalizes
- Exact quality-score threshold numbers — locked at plan Task 0 per CONTEXT.md D-15 after live-DB sampling
- The company_research "generated but empty" predicate beyond the initial proposal — planner refines based on 3-5 real-row samples
- The n8n PDF-generation approach — back-end concern, covered separately in plan tasks
- ROADMAP.md + REQUIREMENTS.md text updates to reflect PDF-only (no `.md` fallback) — planner owns; not a UI-SPEC concern

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | `Badge`, `Button`, `Tooltip`, `TooltipContent`, `TooltipTrigger` (all ALREADY installed at `src/components/ui/`; predate Phase 21) | not required — official registry, all primitives predate this phase |
| npm (not a shadcn registry) | `sonner` — `toast` already used in 18 files; `toast.success` is the only new call site in Phase 21 | not applicable — existing project pattern, vetted during earlier phases |
| npm (not a shadcn registry) | `lucide-react` — `Copy`, `Check` icons are new uses this phase; `ExternalLink`, `Download`, `FileText`, `Building2` already imported | not applicable — lucide-react is the project's icon convention; icon additions are additive imports, not registry blocks |

**Third-party shadcn registries:** none. Phase 21 does NOT install any block from a third-party registry. The registry vetting gate (`npx shadcn view {block} --registry {url}`) is not applicable and is skipped per `<shadcn_gate>` logic.

**Zero new shadcn installs.** Every primitive referenced is already present in `src/components/ui/` (verified 2026-04-21).

**Zero new npm deps.** No new runtime or dev-deps are introduced in Phase 21 UI work. The n8n pipeline + PDF migration work (CONTEXT.md D-04) may introduce dependencies on the n8n side but does not touch `package.json`.

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS — every visible string declared for every render branch (Copy button, Download anchor, Quality badge, 6 empty-state lines, Company link, FreshnessBadge revision); aria-labels and toast strings locked; no placeholder "N/A" / "—" anywhere
- [ ] Dimension 2 Visuals: PASS — every new element composes with Phase 20 `job-detail-sheet.tsx` cadence (same section-shell shape, same `flex items-center justify-between` heading row, same meta-row `flex items-center gap-3` rhythm); empty-state body uses `text-sm text-muted-foreground italic`; error-fallback is visually distinct from empty-state (dimmed heading vs full-contrast heading)
- [ ] Dimension 3 Color: PASS — zero new color tokens; quality badge uses `text-destructive` / `text-warning` / `text-success` via `scoreColor()`; Copy button uses ghost-variant accent hover; ExternalLink uses `opacity-60`; zero hardcoded Tailwind color names (enforced by CLAUDE.md + call-out list in Cross-cutting §Color Tokens)
- [ ] Dimension 4 Typography: PASS — zero new sizes/weights; `text-sm`, `text-xs`, `text-[11px]` + `font-semibold` / `font-medium` only — all already present in the file
- [ ] Dimension 5 Spacing: PASS — all spacing via Tailwind multiples-of-4 (`gap-1`, `gap-1.5`, `gap-2`, `gap-3`, `space-y-3`, `space-y-6`, `p-4`, `px-2.5`, `py-0.5`); `size-3`, `size-3.5`, `size-4` icon sizes all carry-forward from Phase 20; `size-7` icon-sm button is a 7×4 multiple (28px)
- [ ] Dimension 6 Registry Safety: PASS — shadcn-official primitives only; zero new shadcn installs; zero new npm deps in the UI diff; n8n pipeline work is out of UI-SPEC scope

**Approval:** pending

---

## Researcher Notes Summary

Three Researcher Notes are embedded above. Summarized for the owner's review:

1. **Quality-score format (§Typography):** until plan Task 0 confirms scale and decimal handling, UI-SPEC assumes `number` and displays as-is. Fix is one-line in `scoreColor` / `scoreLabel` if Task 0 surprises.

2. **Low-band quality color = destructive (§Color):** mild semantic tension between "quality info" (informational) and Phase 20's reservation of `destructive` for "actionable failures". Honoring CONTEXT.md D-16 as-written; owner may prefer `muted-foreground` for low scores after seeing real data. One-line change in `scoreColor`.

3. **Empty company_research predicate (§3):** proposed predicate is conservative (all fields null/empty). Real rows post-Phase-23 may always have an `ai_summary` string even for "could not find" cases, in which case the strict predicate becomes dead code. Planner refines after sampling live rows.

4. **URL normalization edge cases (§4):** lenient normalizer accepts `"file.txt"` as a domain and prepends `https://` → broken link but not a security issue (`rel="noopener noreferrer"` guards tabnabbing, DNS silently fails). Planner may tighten with a stricter regex if desired.

**Stack assumptions verified:**

- `Copy`, `Check`, `ExternalLink`, `Download`, `Building2`, `FileText` icons all exist in the installed `lucide-react` package (verified via `node_modules/lucide-react/dist/esm/icons/`).
- `Badge variant="outline"` accepts `className` override via `cn()` — custom text color class will win over the variant's default `text-muted-foreground` due to Tailwind merge semantics.
- `Button size="icon-sm"` exists in the project's shadcn Button (28×28px) — verified in `src/components/ui/button.tsx:30`.
- `sonner` `toast.success` is the project convention (18+ call sites); root `<Toaster position="bottom-right" />` is mounted in `providers.tsx:12`.
- All required color tokens exist: `--color-destructive`, `--color-warning`, `--color-success`, `--color-muted-foreground`, `--color-primary`, `--color-border`, `--color-ring`, `--color-accent`, `--color-foreground` (verified in `src/styles/globals.css:9-32`).
- No new shadcn installs needed. No new npm deps needed. No new color tokens needed. No new typography sizes needed. No new spacing tokens needed.
