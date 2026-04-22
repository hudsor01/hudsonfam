---
phase: 23
slug: owner-triggered-workflows-pattern-setter
status: draft
shadcn_initialized: true
preset: none (manual init — new-york style, zinc base, lucide icons; inherited from Phase 20)
created: 2026-04-22
reviewed_at: 2026-04-22
---

# Phase 23 — UI Design Contract

> Visual and interaction contract for Phase 23: Owner-Triggered Workflows (Pattern Setter). Ships two client button components — `TriggerCompanyResearchButton` and `RegenerateCoverLetterButton` — plus their in-button pessimistic-poll state machine and inline sentinel helper text. Zero new color tokens, zero new typography sizes, zero new shadcn installs, zero new npm deps. Composes against Phase 20's SectionErrorBoundary wrap (Plan 20-06), Phase 21's meta-row cadence (Plan 21-04 `flex items-center gap-3`), Plan 21-06's empty-state branch shape, and Phase 22's existing section integration at `job-detail-sheet.tsx`.

**Composes against:**
- Phase 20 UI-SPEC / CONTEXT D-09 — SectionErrorBoundary is the outermost wrap; both new buttons sit INSIDE their respective per-section boundaries.
- Phase 21 UI-SPEC §Component Contracts — meta-row `flex items-center gap-3 flex-wrap` rhythm; the existing Cover Letter meta row (Plan 21-04 Copy/Download + Plan 21-05 Quality badge + Plan 20-04 FreshnessBadge) is the host row for the Regenerate button.
- Plan 21-06 — Empty-state branches in `job-detail-sheet.tsx` (Cover Letter missing/empty, Company Intel missing/empty). Phase 23 adds `TriggerCompanyResearchButton` to the Company Intel `missing` branch ONLY (never renders in empty / populated / error).
- Phase 22 UI-SPEC §Typography — `text-[10px]` provenance-tag precedent is the closest analog for our inline `text-xs` (12px) sentinel helper weight (we stay one size larger because the helper is a transient action-outcome string, not a stable metadata adornment).
- CONTEXT.md 23 §Decisions — 12 locked decisions; UI-relevant set is D-05, D-06 (amended), D-09, D-10, D-11.
- RESEARCH.md 23 §7 "Client Button Components" — `ButtonState` discriminated union, `useEffect + setInterval + useRef` polling, `AbortController` unmount cleanup, Section 5 Pitfall 4 recommendation for server-side baseline (D-06 amended).

**Integration surface:**
- `src/app/(admin)/admin/jobs/trigger-company-research-button.tsx` — NEW client component.
- `src/app/(admin)/admin/jobs/regenerate-cover-letter-button.tsx` — NEW client component.
- `src/app/(admin)/admin/jobs/job-detail-sheet.tsx` — EDIT: mount `<TriggerCompanyResearchButton>` inside the Company Intel `missing` branch (currently lines 289-298, inside the existing `<SectionErrorBoundary section="company_research">` wrap); mount `<RegenerateCoverLetterButton>` inside the Cover Letter populated-branch meta row (currently lines 201-244, inside the existing `<SectionErrorBoundary section="cover_letter">` wrap). Zero changes to empty branches, zero changes to section ordering, zero new boundaries.

**Phase-23 scope boundary:** This UI-SPEC is tight. Phase 23 is backend-heavy (HMAC helper + 2 Server Actions + 3 retrofits + CI grep test). The entire UI surface is 2 shadcn Button elements with internal state machines + 1 inline `<p>` helper element per button. No new sections, no new icons beyond `Loader2` + a small icon glyph per button, no new dialogs, no toasts. Read-only adjacent artifacts stay unchanged.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | shadcn (manual init, inherited from Phase 20) |
| Preset | none — `components.json` style `new-york`, base `zinc`, `rsc: true`, `tsx: true`, `iconLibrary: "lucide"`, css at `src/styles/globals.css` |
| Component library | radix (via shadcn/ui primitives) |
| Icon library | lucide-react — icons used this phase: `Loader2` (spinner, already imported at `job-detail-sheet.tsx:22`), `Sparkles` (Research this company glyph — optional, researcher recommendation; already used in lucide-react bundle), `RefreshCw` (Regenerate glyph — optional, researcher recommendation). No new icon imports required beyond what lucide-react already ships. |
| Font | `--font-sans: system-ui, -apple-system, sans-serif` (project default; not overridden) |

**Dependencies locked by prior phases (Phase 23 re-uses, does not touch):**
- `@/components/ui/button` — `variant="outline"` + `size="sm"` are the base; `variant="outline" size="sm"` composes to `h-8 gap-1.5 rounded-md px-3 has-[>svg]:px-2.5 border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground` per `button.tsx:15-16,26`. Disabled state inherits `disabled:pointer-events-none disabled:opacity-50` from the base class (`button.tsx:8`).
- `@/components/ui/tooltip` — Root `<TooltipProvider delayDuration={300}>` already mounted in `providers.tsx:9`; Phase 23 does NOT add Tooltips this phase (button labels are fully explicit; helper-text copy is visible when relevant — no hover-to-discover needed).
- `SectionErrorBoundary` from `./section-error-boundary` (Plan 20-06) — preserved, wraps both new buttons transitively via the existing section wrappers; zero changes.
- `FreshnessBadge` from `./freshness-badge` — unchanged; the Regenerate button shares its host meta row but does not modify the badge.

**Zero new shadcn installs.** Zero new npm deps. Zero new lucide icons (all glyphs are present in the installed `lucide-react@^1.7.0`).

---

## Spacing Scale

Phase 23 introduces **no new spacing tokens.** All inherited from Phase 20/21/22 cadence. All values are multiples of 4.

| Token | Value | Usage in Phase 23 |
|-------|-------|-------------------|
| xs | 4px (`mt-1`) | Vertical gap between the button and the inline sentinel helper `<p>` below it (D-09 literal: `mt-1`) |
| xs | 6px (`gap-1.5`) | Icon-to-label gap INSIDE the shadcn Button (inherited from `button.tsx:26` `size="sm"` base class — `h-8 gap-1.5`). Do NOT add a redundant `gap-*` override on the Button |
| sm | 8px (`gap-2`) | Not used this phase — the meta-row host containers already provide `gap-3` between siblings |
| md | 12px (`gap-3`) | Meta-row sibling gap (host container; inherited unchanged). The Regenerate button slots in as a new sibling of FreshnessBadge / Quality badge / Download link — `gap-3` covers the button ↔ adjacent-element spacing. No button-level margin needed |
| lg | 24px (`space-y-6`) | Top-level section gap — inherited from parent `p-6 space-y-6` wrapper at `job-detail-sheet.tsx:98` (unchanged) |

**Button dimensions (inherited from shadcn `size="sm"`):**
- Height: `h-8` (32px) — exceeds WCAG 2.5.5 AAA 24×24 minimum target
- Horizontal padding: `px-3` default (`has-[>svg]:px-2.5` when an icon child is present)
- Icon-to-label internal gap: `gap-1.5` (6px) — NATIVE to the sm variant; do NOT override
- Icon size inside button: `size-4` (16px) — NATIVE per `button.tsx:8` (`[&_svg:not([class*='size-'])]:size-4`). Do NOT set an explicit size on `<Loader2 />` (or `<Sparkles />` / `<RefreshCw />`) — let the Button's built-in SVG rule do it. Exception: if for any reason the icon needs to be a different size, declare it explicitly and accept the override

**Icon spacing from button text:** `gap-1.5` INSIDE the Button, inherited. No `ml-*` / `mr-*` between icon and label — the Button's flex layout handles it.

**Inline sentinel helper spacing:** `mt-1` (4px) between Button and `<p>` — D-09 literal.

**Button's margin from adjacent elements in host row:** none explicit — the host row's `flex items-center gap-3` covers the spacing.

**Button focus-ring reach:** shadcn baseline `focus-visible:ring-[3px] focus-visible:ring-ring/50` (from `button.tsx:8`). The 3px ring plus its inherent outline needs ~4px visual halo; the `gap-3` host row and `mt-1` helper give enough breathing room.

**Exceptions:** none.

---

## Typography

Carry-forward only. **No new sizes, no new weights introduced.** All elements use existing tokens in the job-detail-sheet cadence.

| Role | Size | Weight | Line Height | Usage in Phase 23 |
|------|------|--------|-------------|-------------------|
| Button label | 14px (`text-sm`, from Button base class `button.tsx:8`) | 500 (`font-medium`, from Button base class) | 1.5 | Both owner-triggered buttons inherit shadcn Button's default `text-sm font-medium`. Do NOT override |
| Sentinel helper text | 12px (`text-xs`) | 400 | 1.4 | The inline `<p className="text-destructive text-xs mt-1">Error: {sentinel}</p>` element rendered below a button after a failed click or timeout. D-09 literal. One size smaller than the button label; one size larger than Phase 22's provenance tag text |
| Button's aria-label (screen-reader-only — in-progress state) | n/a | n/a | n/a | `aria-label` matches the visible label verbatim — screen readers announce the label + the `aria-busy="true"` state. See §Interaction |

**No new sizes. No new weights. No new fonts.**

**Why `text-xs` and not `text-[10px]`:** Phase 22's provenance-tag `text-[10px]` is reserved for metadata adornments adjacent to a primary data figure — it's a stable annotation. The sentinel helper is a transient action-outcome message that must be readable at a glance without the owner leaning toward the screen; `text-xs` (12px) is the project's established convention for inline error copy (matches CLAUDE.md's `bg-destructive/10 border border-destructive/25 text-destructive` alert pattern and the existing `cover-letter-pdf` download link at the same size).

**Why no bold / heading on the sentinel:** the helper is one short line — `Error: timeout` (13 chars), `Error: auth` (11), `Error: rate limit` (17), `Error: unavailable` (18). Weight 400 is legible at `text-xs`. Bolding would compete with the button's `font-medium` label and distract from the primary control.

---

## Color

Phase 23 introduces **zero new color tokens.** All surfaces reference existing `@theme` tokens declared in `src/styles/globals.css`. No hardcoded Tailwind color names permitted — CLAUDE.md rule (grep-gate G-2 below).

### Token usage table

| Role | Token | Value (OKLCH, from globals.css) | Usage in Phase 23 |
|------|-------|---------------------------------|-------------------|
| Dominant surface (60%) | `--color-background` | `oklch(0.18 0.02 260)` | Sheet background — unchanged |
| Secondary surface (30%) | `--color-card` | `oklch(0.20 0.02 258)` | Existing section containers — unchanged |
| Accent (10%) | `--color-accent` | `oklch(0.78 0.12 75)` | shadcn outline-variant hover background via Button class `hover:bg-accent hover:text-accent-foreground` (`button.tsx:16`) — inherited. This is the ONLY accent-token usage Phase 23 introduces |
| Foreground | `--color-foreground` | `oklch(0.94 0.02 80)` | Button label in default state (inherited from Button base class) |
| Muted foreground | `--color-muted-foreground` | `oklch(0.62 0.03 250)` | Button label during in-progress / polling state. D-09 literal: "Disabled + muted-text during polling." Applied via `className={isPolling ? "text-muted-foreground" : ""}` on the Button |
| Destructive | `--color-destructive` | `oklch(0.55 0.20 25)` | Inline sentinel helper `<p className="text-destructive text-xs mt-1">` — D-09 literal. This is the ONLY destructive-token usage Phase 23 introduces |
| Border | `--color-border` | `oklch(0.28 0.02 256)` | Button outline border (inherited via shadcn `variant="outline"` → `border bg-background`) |
| Ring | `--color-ring` | `oklch(0.64 0.14 255)` | `focus-visible:ring-[3px] focus-visible:ring-ring/50` on the Button (inherited from Button base class). Focus ring visible on keyboard traversal during ALL states (idle, in-progress, error) — see §Interaction for disabled-but-focusable note |
| Warning | `--color-warning` | `oklch(0.85 0.17 85)` | **Not used** in Phase 23. Stale-staleness warning lives on FreshnessBadge, unchanged |
| Success | `--color-success` | `oklch(0.76 0.18 160)` | **Not used** in Phase 23. There is no "success" visual after a click — successful completion is signaled by the button disappearing (Company Intel → populated section takes over) or re-rendering with a fresh FreshnessBadge (Cover Letter → re-render with new generated_at) |

### Accent reserved for

- Button hover state on both new buttons via shadcn `variant="outline"` → `hover:bg-accent hover:text-accent-foreground` (inherited from `button.tsx:16`). That is the SOLE new accent-token usage this phase.
- `--color-accent` is NOT used for any state signal (no "click me" pulse, no success flash, no selected state). Phase 23's state transitions are conveyed via icon swap (Loader2 spinner) + label color muting + disabled opacity — no accent coloring beyond the natural hover.

### Disabled state visual

**Rely on shadcn's default `disabled:opacity-50` from the Button base class** (`button.tsx:8`). Do NOT add an additional opacity override, AND do NOT replace the default with a different dim. Combine with `text-muted-foreground` on the className during polling:

```tsx
<Button
  variant="outline"
  size="sm"
  onClick={handleClick}
  disabled={isPolling || isPending}
  className={isPolling ? "text-muted-foreground" : ""}
  aria-busy={isPolling}
>
  {isPolling ? <Loader2 className="animate-spin" /> : <Sparkles />}
  {label}
</Button>
```

The `disabled:opacity-50` + `text-muted-foreground` combination produces a visibly-inactive button with a muted label, consistent with the existing `Apply Now` button's pessimistic state (the pattern is already in the file — see the `updateJobStatus` dropdown).

### Explicit color prohibitions for this phase

- **No hardcoded Tailwind color classes in `trigger-company-research-button.tsx`, `regenerate-cover-letter-button.tsx`, or the Phase 23 diff against `job-detail-sheet.tsx`.** Forbidden specifically: `text-red-*`, `text-amber-*`, `text-yellow-*`, `text-green-*`, `text-emerald-*`, `text-orange-*`, `text-blue-*`, `text-gray-*`, `text-zinc-*`, `text-slate-*`, and any `bg-*` / `border-*` variants thereof. CLAUDE.md rule; grep-gate G-2 below.
- **No inline `style={{ color: '...' }}`** — all color via Tailwind tokens referencing `@theme` vars.
- **No introduction of a new `--color-*` token** — every token the buttons need already exists in `globals.css:9-32`.
- **No `bg-destructive`/`bg-destructive/10` on the helper `<p>` — just `text-destructive`.** The sentinel is a short text line, not an alert banner. Matching the semantic-alert pattern from CLAUDE.md (`bg-destructive/10 border border-destructive/25 text-destructive`) would be over-weighted for a 13-18 char transient message inline with a button.

---

## Copywriting Contract

### Button labels (verbatim from ROADMAP.md SC #1 and SC #2)

| Component | Visible label | Source |
|-----------|---------------|--------|
| `TriggerCompanyResearchButton` | `Research this company` | ROADMAP SC #1 verbatim (case-sensitive, no trailing punctuation, no period) |
| `RegenerateCoverLetterButton` | `Regenerate cover letter` | ROADMAP SC #2 verbatim (case-sensitive, no trailing punctuation, no period) |

Both labels are rendered inline as the Button's text child (no `aria-label` override needed — the visible label IS the accessible name). Screen readers announce the label followed by the state (via `aria-busy="true"` on disabled polling state).

**Label stability across states:** the label text does NOT change between idle and in-progress. It stays literal "Research this company" / "Regenerate cover letter" even while polling. The icon swap (static glyph → `Loader2` spinner) + `aria-busy` is the only signal change. This is deliberate — swapping a button's visible text mid-press is a known a11y anti-pattern (focus announcement becomes confusing).

### Sentinel helper text — the 4 server-returned values displayed verbatim

When the Server Action returns `{ ok: false, sentinel: ... }`, or polling caps at 60 without resolving, render:

```tsx
<p className="text-destructive text-xs mt-1">Error: {sentinel}</p>
```

Where `{sentinel}` is one of the four strings returned by `sendSignedWebhook`'s cascade (CONTEXT.md D-07):

| `sentinel` value | Rendered `<p>` text (verbatim) |
|------------------|-------------------------------|
| `"timeout"` | `Error: timeout` |
| `"auth"` | `Error: auth` |
| `"rate limit"` | `Error: rate limit` |
| `"unavailable"` | `Error: unavailable` |

**Anti-CTA rule does NOT apply to button labels in Phase 23.** The Plan 21-06 anti-CTA rule ("Direct, state-only. No CTAs. No imperative verbs. No 'Generate now', 'Click to regenerate', etc.") was scoped to EMPTY-STATE COPY ONLY (strings in `EMPTY_STATE_COPY` that describe absence of data). Phase 23 buttons ARE legitimate owner-triggered CTAs — the phase's entire purpose is to give the owner action surfaces. The imperative-verb labels ("Research…", "Regenerate…") are correct and required.

**Anti-CTA rule still applies to the sentinel helper text.** The helper stays state-only — "Error: timeout" not "Error: timeout. Click again to retry." The helper describes what happened, not what to do. The re-click recovery is implicit (button re-enables; the same user who triggered the action presses it again).

### No toast on completion (UI-SPEC decision per RESEARCH.md §Open Questions #1)

**Ship silent success.** On successful poll resolution:
- `TriggerCompanyResearchButton`: company_research row lands → parent re-renders → the entire Company Intel `missing` branch (including this button) is replaced by the populated branch. The button disappears. No toast.
- `RegenerateCoverLetterButton`: cover_letters.generated_at advances past baseline → parent re-renders → the Cover Letter populated-branch meta row re-renders with a fresh FreshnessBadge date. The button returns to `idle` state (not hidden — regenerate is repeatable). No toast.

Rationale: the spinner → disappearance (Trigger case) or spinner → fresh FreshnessBadge date (Regenerate case) IS the success signal. A toast would duplicate a visual state change already present in the exact surface the owner is looking at. Phase 21's Copy button precedent (D-01 locked `toast.success("Resume copied to clipboard")`) is a different class — Copy has zero adjacent visual feedback (the clipboard is invisible), so a toast is necessary. Phase 23's buttons both produce on-screen visual changes; no toast needed.

**If UI-SPEC checker or owner disagrees, the addition is one line in each button's `onMatch` callback:** `toast.success("Company research landed")` / `toast.success("Cover letter regenerated")`. Zero architectural change.

### No destructive actions in this phase

| Category | Copy | Notes |
|----------|------|-------|
| Destructive actions | *(none)* | No delete, no dismiss, no "are you sure". Regenerate is NOT destructive — it overwrites in place (cover_letters.content is replaced when the new row lands; the app's view of `cover_letter` is the single row joined from `getJobDetail`). No confirmation dialog |
| Primary CTA in this phase | `Research this company` / `Regenerate cover letter` | These ARE the phase's CTAs; they are correct per phase scope |
| Error state copy | `Error: timeout` / `Error: auth` / `Error: rate limit` / `Error: unavailable` | Verbatim sentinel mapping (see table above) |
| Empty state copy in this phase | *(none new)* | Empty-state copy for Company Intel `missing` / `empty` is already locked by Plan 21-06 (`EMPTY_STATE_COPY.company_research.missing` = "No company research yet." — unchanged). The Trigger button sits ALONGSIDE the existing empty copy, not instead of it |

### Scope note — Regenerate button visibility

The Regenerate button is visible whenever a cover letter exists (`detail.cover_letter !== null` per D-09). It is NOT visible in the Cover Letter `missing` or `empty` branches — you cannot regenerate what was never generated or was generated empty. The branch split is already in place from Plan 21-06; Phase 23 mounts the button INSIDE the populated branch's meta row, not at the empty branch's heading.

---

## Component Contracts

Exact interaction + visual contracts for each Phase 23 UI element.

### 1. `TriggerCompanyResearchButton` — new client component

**Location:** `src/app/(admin)/admin/jobs/trigger-company-research-button.tsx`

**Props interface:**

```ts
interface TriggerCompanyResearchButtonProps {
  /** Job ID to pass to the triggerCompanyResearch Server Action. */
  jobId: number;
}
```

Only one prop. Everything else is internal state (idle / in-progress / sentinel) and hardcoded constants (label, icon).

**Render tree (idle + in-progress + sentinel branches):**

```tsx
"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  triggerCompanyResearch,
  fetchJobDetail,
} from "@/lib/job-actions";
import type { ErrorSentinel } from "@/lib/webhooks";
import type { FreshJobDetail } from "@/lib/jobs-db";

type ButtonState =
  | { kind: "idle" }
  | { kind: "in-progress" }
  | { kind: "error"; sentinel: ErrorSentinel };

export function TriggerCompanyResearchButton({
  jobId,
}: TriggerCompanyResearchButtonProps) {
  const [state, setState] = useState<ButtonState>({ kind: "idle" });
  const [isPending, startTransition] = useTransition();
  const pollCountRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cleanup on unmount — critical for sheet-close-mid-poll
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const isPolling = state.kind === "in-progress";
  const isDisabled = isPolling || isPending;

  return (
    <div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={/* ... see behavior below */}
        disabled={isDisabled}
        className={isPolling ? "text-muted-foreground" : ""}
        aria-busy={isPolling}
      >
        {isPolling ? <Loader2 className="animate-spin" /> : <Sparkles />}
        Research this company
      </Button>
      {state.kind === "error" && (
        <p className="text-destructive text-xs mt-1">
          Error: {state.sentinel}
        </p>
      )}
    </div>
  );
}
```

**Behavior (state machine — D-09 + D-10 + D-06 locked):**

| From state | Trigger | To state | Side effects |
|-----------|---------|----------|--------------|
| `idle` | Click | `in-progress` | `startTransition(async () => { res = await triggerCompanyResearch(jobId); … })`; icon swaps to `Loader2` with `animate-spin`; label muted to `text-muted-foreground`; button disabled; `aria-busy="true"` set |
| `in-progress` | Server Action returns `{ok: true}` | (stays `in-progress`) | Start `setInterval` polling every 3000ms; `pollCountRef.current = 0` at start |
| `in-progress` | Server Action returns `{ok: false, sentinel}` | `error` | Button re-enables; icon reverts to `Sparkles`; label returns to `text-foreground`; inline `<p>Error: {sentinel}</p>` appears below button |
| `in-progress` | Poll tick detects `detail.company_research !== null` | (silent success — unmounts from Company Intel missing branch) | `clearInterval`; parent re-renders; component unmounts. No local state transition visible — the section branch flips. Unmount cleanup in `useEffect` return clears the (already cleared) interval defensively |
| `in-progress` | Poll count reaches 60 (180s cap) | `error` | `clearInterval`; set sentinel `"unavailable"`; button re-enables; inline `<p>Error: unavailable</p>` appears |
| `error` | Click | `in-progress` | Same as idle→in-progress. The error `<p>` element unmounts immediately on state transition |

**Icon choice — `Sparkles` (researcher recommendation):**
- `Sparkles` from lucide-react signals "generate something new" — common AI-trigger glyph in modern UIs. Available in `lucide-react@^1.7.0` (no new import)
- Alternative: `Search` — more literal ("research") but reads as a navigation-search action; less appropriate
- Alternative: no glyph at all — acceptable; the Button's built-in layout handles label-only fine. If dropping the glyph, the Loader2 in-progress swap still works (the button goes from text-only to icon+text, then back to text-only on sentinel)

**Planner's choice.** If owner prefers no glyph, drop the `<Sparkles />` and keep only `Loader2` during polling. UI contract holds either way.

**Polling predicate (D-06 — INSERT-wait):**

```ts
const isDone = (detail: FreshJobDetail | null) =>
  detail?.company_research !== null && detail?.company_research !== undefined;
```

This is the simple INSERT-wait case: the row did not exist pre-click; polling completes as soon as it appears. No baseline comparison needed.

**Visibility gate (D-09 locked):**

Mounted ONLY when `detail.company_research === null`. Integration site in `job-detail-sheet.tsx` (existing code at lines 289-298, inside `SectionErrorBoundary section="company_research"`):

```tsx
{detail.company_research === null ? (
  <div className="space-y-3">
    <h3 className="text-sm font-semibold flex items-center gap-1.5">
      <Building2 className="size-4" />
      Company Intel
    </h3>
    <p className="text-sm text-muted-foreground italic">
      {EMPTY_STATE_COPY.company_research.missing}
    </p>
    <TriggerCompanyResearchButton jobId={detail.id} />  {/* NEW */}
  </div>
) : isCompanyResearchEmpty(detail.company_research) ? (
  /* existing empty branch — NO button mount */
) : (
  /* existing populated branch — NO button mount */
)}
```

The button sits BELOW the empty-state italic copy, as a sibling inside the same `space-y-3` flex column. This produces a visual flow of: heading → empty-state copy → button. The `space-y-3` (12px) gap between the copy and the button is inherited from the wrapper (D-09's spacing intent is covered by this).

**Interaction states:**

| State | Icon | Label color | Disabled | aria-busy | Focus ring |
|-------|------|-------------|----------|-----------|-----------|
| idle | `<Sparkles />` | `text-foreground` (inherited default) | false | false | shadcn default on `focus-visible` |
| in-progress | `<Loader2 className="animate-spin" />` | `text-muted-foreground` | true | true | shadcn default on `focus-visible` (the disabled button is STILL keyboard-focusable — see G-1 below) |
| error | `<Sparkles />` | `text-foreground` | false | false | shadcn default on `focus-visible` |

**Accessibility (G-1 locked — buttons keyboard-accessible during in-progress):**

- The `disabled` attribute makes the button unclickable, but shadcn Button uses `<button>` element natively, which remains focusable via keyboard for screen readers to announce the state. (`disabled:pointer-events-none` only disables mouse events; Tab traversal still reaches the button.)
- `aria-busy="true"` on the in-progress state — screen readers announce "Research this company, busy" on focus
- `aria-live` is NOT set on the helper `<p>` — the button's own focus + screen-reader behavior on re-enable is sufficient feedback; adding `aria-live="polite"` to the sentinel element would announce the error twice (once on state flip, once on focus). If user testing shows the owner wants an announcement, set `role="alert"` on the `<p>` — planner decides
- Tab traversal order: after the existing `<p>` empty-state copy, Tab lands on the Button (natural document flow)
- Hit area is 32×32 px minimum (Button `h-8` + native `px-3` + label) — comfortably exceeds WCAG 2.5.5 target minimums
- `cursor-not-allowed` visual cue — NOT set. shadcn Button uses `disabled:pointer-events-none` which suppresses cursor hover entirely; the 50% opacity + spinner icon are the disabled cue

**Validation (planner turns into Vitest assertions; mirrors RESEARCH.md §Validation Architecture table):**

- `render(<TriggerCompanyResearchButton jobId={1} />)` → button is rendered with text containing `"Research this company"`; button is NOT disabled
- Click button → button becomes disabled; `aria-busy` is `"true"`; `<svg>` child SVG matches Loader2 (`data-lucide="loader-2"` or has class `animate-spin`)
- Mock `triggerCompanyResearch` returns `{ok: false, sentinel: "rate limit"}` → button re-enables; `<p>` with text `"Error: rate limit"` and class containing `text-destructive` appears below button
- Mock `triggerCompanyResearch` returns `{ok: true}`; fake-timers advance 3000ms → `fetchJobDetail` called 1 time
- After 60 × 3000ms ticks without isDone=true → button shows `"Error: unavailable"`; `fetchJobDetail` called 60 times
- Unmount mid-poll (sheet close) → no further `fetchJobDetail` calls; no setState-after-unmount React warnings

---

### 2. `RegenerateCoverLetterButton` — new client component

**Location:** `src/app/(admin)/admin/jobs/regenerate-cover-letter-button.tsx`

**Props interface:**

```ts
interface RegenerateCoverLetterButtonProps {
  /** Job ID to pass to the regenerateCoverLetter Server Action. */
  jobId: number;
  /**
   * Server-computed baseline from detail.cover_letter.generated_at at mount time.
   * Predicate polls until detail.cover_letter.generated_at > baseline (D-06 amended).
   * Client NEVER captures Date.now() for this — server-side ISO string only.
   */
  baselineGeneratedAt: string;
}
```

Two props. `baselineGeneratedAt` is the server-returned `cover_letters.generated_at` ISO string as-of the last render of `job-detail-sheet.tsx` (i.e., when the sheet loaded the current populated Cover Letter). D-06 was amended post-research to eliminate client-clock drift (RESEARCH.md §Pitfall 4).

**Render tree:**

```tsx
"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  regenerateCoverLetter,
  fetchJobDetail,
} from "@/lib/job-actions";
import type { ErrorSentinel } from "@/lib/webhooks";
import type { FreshJobDetail } from "@/lib/jobs-db";

type ButtonState =
  | { kind: "idle" }
  | { kind: "in-progress"; serverBaseline: string }
  | { kind: "error"; sentinel: ErrorSentinel };

export function RegenerateCoverLetterButton({
  jobId,
  baselineGeneratedAt,
}: RegenerateCoverLetterButtonProps) {
  const [state, setState] = useState<ButtonState>({ kind: "idle" });
  const [isPending, startTransition] = useTransition();
  const pollCountRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const isPolling = state.kind === "in-progress";
  const isDisabled = isPolling || isPending;

  return (
    <div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={/* fires regenerateCoverLetter; on ok:true, uses server-returned baseline for polling */}
        disabled={isDisabled}
        className={isPolling ? "text-muted-foreground" : ""}
        aria-busy={isPolling}
      >
        {isPolling ? <Loader2 className="animate-spin" /> : <RefreshCw />}
        Regenerate cover letter
      </Button>
      {state.kind === "error" && (
        <p className="text-destructive text-xs mt-1">
          Error: {state.sentinel}
        </p>
      )}
    </div>
  );
}
```

**State machine:** identical to `TriggerCompanyResearchButton` EXCEPT the predicate and the successful-completion behavior:

| From state | Trigger | To state | Side effects |
|-----------|---------|----------|--------------|
| `in-progress` | Poll tick detects `new Date(detail.cover_letter.generated_at) > new Date(serverBaseline)` | `idle` | `clearInterval`; parent re-renders via `revalidatePath` side effect of the Server Action; FreshnessBadge shows the new date. Button STAYS VISIBLE in idle state (regenerate is repeatable) |

All other transitions mirror the Trigger button.

**Icon choice — `RefreshCw` (researcher recommendation):**
- `RefreshCw` is lucide-react's standard regenerate/retry glyph. Available in `lucide-react@^1.7.0` (no new import)
- Alternative: `Repeat` — similar meaning but less common for "regenerate AI output"
- Alternative: no glyph — same fallback as Trigger button

**Planner's choice.** If owner prefers no glyph, drop the `<RefreshCw />`; icon-less button still works.

**Polling predicate (D-06 amended — UPDATE-wait using server-side baseline):**

```ts
const isDone = (detail: FreshJobDetail | null, serverBaseline: string) => {
  if (!detail?.cover_letter?.generated_at) return false;
  return new Date(detail.cover_letter.generated_at) > new Date(serverBaseline);
};
```

The `serverBaseline` is captured when `regenerateCoverLetter` Server Action returns `{ok: true, baseline: <ISO>}` — the action reads the current `cover_letters.generated_at` from the DB BEFORE firing the webhook and returns it. The button NEVER reads `Date.now()` or `new Date()` at click time; the baseline is a server ISO string.

**Hydration safety:** `new Date(serverBaseline)` is called inside the polling callback (runtime, not render). Render does NOT call `new Date` — the component is hydration-safe.

**Visibility gate (D-09 locked):**

Mounted ONLY when `detail.cover_letter !== null` AND the Cover Letter populated branch renders. Integration site in `job-detail-sheet.tsx` (existing code at lines 201-244, populated branch meta row):

```tsx
<div className="flex items-center gap-3 flex-wrap">
  {detail.cover_letter.quality_score !== null && (
    <Tooltip>{/* existing Quality badge, unchanged */}</Tooltip>
  )}
  <FreshnessBadge {/* existing, unchanged */} />
  <a href={`/api/jobs/${detail.id}/cover-letter-pdf`} download {/* existing, unchanged */}>
    <Download className="size-3" />
    Download PDF
  </a>
  <RegenerateCoverLetterButton
    jobId={detail.id}
    baselineGeneratedAt={detail.cover_letter.generated_at}
  />
</div>
```

**Placement in meta row — rightmost, after existing controls.** The host row already uses `flex items-center gap-3 flex-wrap`. Adding the button as the LAST child maintains the existing visual order (Quality badge → Freshness badge → Download link → Regenerate button) and preserves `flex-wrap` behavior if the row would overflow at 512px. The button is `h-8` (32px); the row already contains shadcn Badge + FreshnessBadge (both ~22-24px) + anchor (~20px); flex-wrap handles overflow gracefully.

**Rationale for rightmost-placement vs. own line:** researcher's closest analog is Phase 21 Plan 21-04 (Copy + Download on the Tailored Resume meta row, both rightmost siblings of FreshnessBadge). Consistency with Plan 21-04's `flex items-center gap-3 flex-wrap` cadence wins. The meta row DOES overflow at 512px when all 4 controls are present — `flex-wrap` is load-bearing here. If visual inspection shows unacceptable wrap, a future polish can break the button onto its own sub-row with `flex-col` at `sm:flex-row`; Phase 23 accepts the wrap for the ship.

**Regenerate-vs-stale interaction:** D-03 of Phase 20 locks "Stale indicator is purely informational — it does NOT alter the regenerate button." The button's visual treatment is identical whether the adjacent FreshnessBadge shows the amber stale dot or not. No coupling.

**Responsive:**

- 3-control row (Quality + Freshness + Download) ≈ 394px — fits within 512px.
- Adding the Regenerate button (~180px with icon + label) pushes total to ~574px → wraps to a new line on a 512px sheet. Expected and acceptable — `flex-wrap gap-3` handles the second-line layout with 12px vertical gap inherited from the flex-wrap row-gap (shadcn Tailwind v4 default).
- On viewports <640px (full-width sheet), the meta row has more horizontal space; button likely stays on one line.

**Validation:**

- `render(<RegenerateCoverLetterButton jobId={1} baselineGeneratedAt="2026-04-20T00:00:00.000Z" />)` → button renders with `"Regenerate cover letter"` text; NOT disabled
- Click button → `regenerateCoverLetter(1)` called once; button becomes disabled; spinner visible
- Mock `regenerateCoverLetter` returns `{ok: true, baseline: "2026-04-20T00:00:00.000Z"}`; fake-timer advances 3000ms; mock `fetchJobDetail` returns `{cover_letter: {generated_at: "2026-04-22T14:00:00.000Z"}}` → predicate matches; polling stops; button returns to idle state
- Mock predicate never matches; 60 × 3000ms elapse → button shows `"Error: unavailable"`
- Client NEVER calls `new Date()` or `Date.now()` at render time — unit test asserts this via `vi.spyOn(global, 'Date')` or source-text grep
- Sheet closes mid-poll → `clearInterval` called; no further `fetchJobDetail` calls

---

### 3. Existing `job-detail-sheet.tsx` diff — integration mounts

Two mount-site edits. Zero other changes to this file for Phase 23.

**Mount A — Company Intel `missing` branch (existing code at lines 289-298):**

```diff
 {detail.company_research === null ? (
   <div className="space-y-3">
     <h3 className="text-sm font-semibold flex items-center gap-1.5">
       <Building2 className="size-4" />
       Company Intel
     </h3>
     <p className="text-sm text-muted-foreground italic">
       {EMPTY_STATE_COPY.company_research.missing}
     </p>
+    <TriggerCompanyResearchButton jobId={detail.id} />
   </div>
 ) : ...
```

Button sits as 3rd child of the `space-y-3` column. The `space-y-3` utility applies a 12px top margin to children from the 2nd onward; this gives the button 12px of breathing room below the empty-state copy.

**Mount B — Cover Letter populated-branch meta row (existing code at lines 201-244):**

```diff
 <div className="flex items-center gap-3 flex-wrap">
   {detail.cover_letter.quality_score !== null && (
     <Tooltip>{/* existing */}</Tooltip>
   )}
   <FreshnessBadge {/* existing */} />
   <a href={`/api/jobs/${detail.id}/cover-letter-pdf`} download {/* existing */}>
     <Download className="size-3" />
     Download PDF
   </a>
+  <RegenerateCoverLetterButton
+    jobId={detail.id}
+    baselineGeneratedAt={detail.cover_letter.generated_at}
+  />
 </div>
```

Button sits as last sibling in the existing `flex items-center gap-3 flex-wrap` row.

**Both mounts preserve existing SectionErrorBoundary wraps** (cover_letter: line 180; company_research: line 285-288). No new boundaries, no boundary changes. Grep-gate G-4 enforces this.

---

## Cross-cutting UI contracts (MUST for every new element this phase)

### Hydration safety

Every new component takes server-computed values as pre-computed primitives from Server Components. **No `new Date()`, no `window.location`, no `Date.now()` during render in any Phase 23 client component.**

- `TriggerCompanyResearchButton`: zero date/time dependencies at render. No hydration concern.
- `RegenerateCoverLetterButton`: `baselineGeneratedAt` is a server-provided ISO string. `new Date(baseline)` is called inside the polling callback (runtime), NEVER during render. `Date.now()` is NOT called anywhere in the component.
- Server Action side (`regenerateCoverLetter`): reads `cover_letters.generated_at` server-side before firing the webhook; returns the ISO string. No client-clock access.

**This is a MUST. Any deviation is an immediate UI-SPEC checker failure.**

### Color tokens (CLAUDE.md enforcement)

No raw Tailwind color classes in any Phase 23 diff. Forbidden:

| Forbidden | Use instead |
|-----------|-------------|
| `text-red-500`, `text-red-600`, `bg-red-*` | `text-destructive` (button sentinel only) |
| `text-amber-500`, `text-yellow-*`, `bg-amber-*` | `text-warning` (not used this phase) |
| `text-green-500`, `text-emerald-*`, `bg-green-*` | `text-success` (not used this phase) |
| `text-blue-500`, `bg-blue-*` | `text-primary` (not used this phase) |
| `text-gray-*`, `text-zinc-*`, `text-slate-*` | `text-muted-foreground` / `text-foreground` |

The ONLY color tokens referenced in the two new `.tsx` files should be `text-destructive`, `text-muted-foreground`, and classes inherited transitively from shadcn Button (`border`, `bg-background`, `hover:bg-accent`, `hover:text-accent-foreground`, `focus-visible:ring-ring/50`). All via `@theme` variables.

### Accessibility contract

| Element | Accessible name source | Extra ARIA |
|---------|------------------------|------------|
| TriggerCompanyResearchButton (idle) | Button text `"Research this company"` | — |
| TriggerCompanyResearchButton (polling) | Button text (unchanged) | `aria-busy="true"` |
| TriggerCompanyResearchButton (error) | Button text (unchanged) | — |
| Sentinel helper `<p>` | Text content `"Error: {sentinel}"` | *(none — see below)* |
| RegenerateCoverLetterButton (idle) | Button text `"Regenerate cover letter"` | — |
| RegenerateCoverLetterButton (polling) | Button text (unchanged) | `aria-busy="true"` |
| Sparkles / RefreshCw icon | (decorative) | `aria-hidden="true"` (optional; Button's `[&_svg]:pointer-events-none` implicitly hides SVG from AT but explicit is safer for unit tests) |
| Loader2 spinner | (decorative; `aria-busy` on parent is authoritative) | `aria-hidden="true"` (inherited) |

**Why no `aria-live` / `role="alert"` on the helper `<p>`:**
- The helper appears as a consequence of a user-initiated click; the user's focus is on the button (which just re-enabled) — adjacent text is visible without needing AT announcement
- Announcing it via `aria-live` or `role="alert"` would double-announce if the button already announced its state change via focus + aria-busy→false flip
- If user testing shows the sentinel is missed by AT users, add `role="alert"` to the `<p>` — one-line change; deferred to post-ship feedback

**Keyboard accessibility during in-progress state (G-1 lock):**
- shadcn Button uses native `<button disabled>` element
- Native `<button disabled>` remains in the Tab order in modern browsers (Chromium / Safari / Firefox — verified per WAI-ARIA authoring practices)
- Screen readers announce `"Research this company, busy"` when Tab focus lands on the in-progress button
- `disabled:pointer-events-none` suppresses mouse hover/click but preserves keyboard focus traversal
- Grep-gate G-1 enforces `aria-busy={isPolling}` is present on both buttons

### Interaction states (every new control)

| Control | Default | Hover | Focus-visible | Active | Disabled (polling) |
|---------|---------|-------|---------------|--------|--------------------|
| TriggerCompanyResearchButton | `variant="outline" size="sm"`: `border bg-background` + foreground label | `hover:bg-accent hover:text-accent-foreground` | shadcn default: `focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50` | shadcn default | `disabled:opacity-50 disabled:pointer-events-none` + `text-muted-foreground` on label |
| RegenerateCoverLetterButton | same as above | same | same | same | same |

Use `focus-visible` (NOT `focus`) — inherited from shadcn Button base class.

### Toast stack contract

- **Zero `toast.*` calls in Phase 23.** Success is conveyed by the disappear-or-refresh of the adjacent section (see §Copywriting for rationale).
- **No error toasts** — sentinel inline helper text is sufficient; the user's attention is already on the button that just failed.
- **If UI-SPEC checker or owner wants a toast**, the addition is one line per button's success path: `toast.success("Company research landed")` / `toast.success("Cover letter regenerated")`. Zero architectural change; UI-SPEC does not prescribe.

### Responsive contract

- Detail Sheet is `w-full sm:max-w-lg` = 512px on viewports ≥ 640px; full width below.
- **TriggerCompanyResearchButton placement** (inside Company Intel missing branch, `space-y-3` column): button is a block-level element in its own column row; never overflows regardless of width.
- **RegenerateCoverLetterButton placement** (inside Cover Letter populated-branch meta row, 4th sibling of `flex items-center gap-3 flex-wrap`): expected total width ≈ 574px; exceeds 512px; `flex-wrap` drops button to a second line. Second-line layout is accepted visual behavior for Phase 23. No `flex-col sm:flex-row` override needed.

### What this UI-SPEC DOES NOT cover (defer to planning / execution)

- The exact `src/lib/webhooks.ts` API surface (`sendSignedWebhook` signature, `ErrorSentinel` discriminated union placement) — CONTEXT.md §Claude's Discretion; planner picks.
- The exact Vitest fake-timer test setup pattern — RESEARCH.md §Validation Architecture provides the template; planner adapts.
- Button internal state shape (`idle | in-progress | error` discriminated union vs boolean flags) — CONTEXT.md §Claude's Discretion; researcher and UI-SPEC both recommend discriminated union for TypeScript narrowing; planner may choose otherwise if it simplifies.
- Whether to factor a single `OwnerTriggeredButton` factory component for Phase 23 vs ship 2 separate files — RESEARCH.md §Don't Hand-Roll recommends 2 separate components for N=2; Phase 24 extracts the factory at N=4. UI-SPEC accepts either.
- Exact n8n-side workflow code — homelab repo concern, out of UI-SPEC scope.
- Pixel motion timing for spinner animation — `animate-spin` Tailwind utility; planner accepts default (1s linear).
- ROADMAP.md SC #5 edit to reflect 3 real call sites (not 4 with job-outreach) — planner's responsibility during execution; not a UI concern.

---

## Grep-verifiable contracts (MUST — plan-checker + ui-checker use these)

These rules MUST be enforceable by a static grep (or Vitest `readFileSync` test). Fail-loud if any returns a violation.

### G-1. Buttons are keyboard-accessible during in-progress state

> Both `TriggerCompanyResearchButton` and `RegenerateCoverLetterButton` MUST set `aria-busy={isPolling}` (or equivalent dynamic expression) on the `<Button>` element. shadcn's `disabled` preserves keyboard focus; `aria-busy` provides the state announcement.

Implementation: `grep -n "aria-busy" src/app/(admin)/admin/jobs/trigger-company-research-button.tsx src/app/(admin)/admin/jobs/regenerate-cover-letter-button.tsx` MUST return at least one match per file. Vitest test can additionally assert via `rtl.getByRole("button")` that `aria-busy` attribute exists on the rendered element during in-progress state.

### G-2. No raw Tailwind color class names in Phase 23 diff

> No raw Tailwind color class names (`text-red-*`, `text-amber-*`, `text-yellow-*`, `text-green-*`, `text-emerald-*`, `text-orange-*`, `text-blue-*`, `text-gray-*`, `text-zinc-*`, `text-slate-*`, or any `bg-*` / `border-*` variants thereof) in `trigger-company-research-button.tsx`, `regenerate-cover-letter-button.tsx`, or the Phase 23 diff of `job-detail-sheet.tsx`.

Implementation:

```bash
grep -nE "(text|bg|border)-(red|amber|yellow|green|emerald|orange|blue|gray|zinc|slate)-[0-9]" \
  "src/app/(admin)/admin/jobs/trigger-company-research-button.tsx" \
  "src/app/(admin)/admin/jobs/regenerate-cover-letter-button.tsx"
```

MUST return zero matches. CLAUDE.md rule.

### G-3. Sentinel error strings displayed verbatim from server response (no client-side rewriting)

> The sentinel strings `"timeout"`, `"auth"`, `"rate limit"`, `"unavailable"` MUST be rendered verbatim from the server response — NOT mapped or aliased on the client side. The ONLY client-side transformation is prefixing with literal `"Error: "`.

Implementation: grep each button file for:
- `{state.sentinel}` or `{sentinel}` interpolation inside a `<p>` (MUST be present)
- `switch` / `if-else` / `match` over sentinel values that returns a DIFFERENT string (MUST be absent — no client-side rewriting)

Equivalent Vitest test: feed each of the 4 sentinel values into a mock; assert the rendered helper `<p>` contains the literal string `"Error: {v}"` for each `v`.

### G-4. Buttons live INSIDE their respective SectionErrorBoundary

> `<TriggerCompanyResearchButton>` in `job-detail-sheet.tsx` MUST be nested inside `<SectionErrorBoundary section="company_research">`. `<RegenerateCoverLetterButton>` MUST be nested inside `<SectionErrorBoundary section="cover_letter">`.

Implementation: Vitest `readFileSync` + source-text assertion on `job-detail-sheet.tsx`. For each button:
1. Locate the button mount line
2. Walk upward through the AST (or via regex-line-counting) until finding either `<SectionErrorBoundary section="…">` or end-of-file
3. Assert the section value matches the expected boundary

Simpler grep-equivalent:

```bash
awk '/<SectionErrorBoundary section="company_research"/,/<\/SectionErrorBoundary>/' src/app/(admin)/admin/jobs/job-detail-sheet.tsx | grep -q "TriggerCompanyResearchButton"
awk '/<SectionErrorBoundary section="cover_letter"/,/<\/SectionErrorBoundary>/' src/app/(admin)/admin/jobs/job-detail-sheet.tsx | grep -q "RegenerateCoverLetterButton"
```

Both MUST return a match.

### G-5. Button labels match ROADMAP SC verbatim

> Button visible labels MUST match ROADMAP SC #1 and SC #2 verbatim:
> - `"Research this company"` (SC #1)
> - `"Regenerate cover letter"` (SC #2)

Implementation: Vitest test renders each button and asserts `container.textContent` includes the exact label. Companion grep:

```bash
grep -q "Research this company" src/app/(admin)/admin/jobs/trigger-company-research-button.tsx
grep -q "Regenerate cover letter" src/app/(admin)/admin/jobs/regenerate-cover-letter-button.tsx
```

Both MUST match.

### G-6. Client-clock prohibition on RegenerateCoverLetterButton (D-06 amended)

> `regenerate-cover-letter-button.tsx` MUST NOT call `Date.now()` or `new Date()` at render time. The ONLY `new Date(...)` usage permitted is inside the polling callback for converting the server-provided `baselineGeneratedAt` ISO string to a Date object for the `>` comparison.

Implementation:

```bash
grep -c "Date.now()" src/app/(admin)/admin/jobs/regenerate-cover-letter-button.tsx
```

MUST return `0`. The `new Date(...)` usage inside the polling callback is acceptable (runtime, not render).

Stricter Vitest assertion: spy `global.Date` during initial render; assert `.mock.calls.length === 0` between mount and before first setInterval tick.

### G-7. fireWebhook is fully deleted from job-actions.ts

> The string `fireWebhook` MUST NOT appear in `src/lib/job-actions.ts` after Phase 23 lands. D-11 locks this — no deprecation wrapper, no alias.

Implementation:

```bash
grep -c "fireWebhook" src/lib/job-actions.ts
```

MUST return `0`. This is RESEARCH.md §Pitfall 7's grep also — enforced in the same CI grep test file (`job-actions.requireRole.test.ts` already has `it("fireWebhook is fully deleted", ...)` per RESEARCH.md §Code Examples).

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | `Button` (ALREADY installed at `src/components/ui/button.tsx`; predates Phase 20) | not required — official registry, primitive predates this phase |
| npm (not a shadcn registry) | `lucide-react` `Loader2`, `Sparkles`, `RefreshCw` icons (`Loader2` already imported at `job-detail-sheet.tsx:22`; `Sparkles` and `RefreshCw` are new additions but the package is already installed — zero `package.json` change) | not applicable — existing dep, vetted in earlier phases |

**Third-party shadcn registries:** none. Phase 23 does NOT install any block from a third-party registry. The registry vetting gate (`npx shadcn view {block} --registry {url}`) is not applicable and is skipped per `<shadcn_gate>` logic.

**Zero new shadcn installs. Zero new npm deps.** Every primitive and dep referenced is already present.

---

## Checker Sign-Off

- [ ] Dimension 1 Information Architecture: PASS — `TriggerCompanyResearchButton` mounts inside Company Intel missing branch (`space-y-3` column, below empty-state copy) at line ~289-298 of `job-detail-sheet.tsx`, wrapped transitively by existing `SectionErrorBoundary section="company_research"`; `RegenerateCoverLetterButton` mounts inside Cover Letter populated-branch meta row (`flex items-center gap-3 flex-wrap`) at line ~208, rightmost sibling after Download PDF anchor, wrapped by existing `SectionErrorBoundary section="cover_letter"`. Both buttons hidden in inapplicable branches per D-09 visibility gates.
- [ ] Dimension 2 Typography: PASS — zero new sizes/weights; button labels inherit shadcn Button `text-sm font-medium`; sentinel helper `text-xs` (12px) is the project's established inline-error size; no new fonts.
- [ ] Dimension 3 Color: PASS — zero new tokens; button uses shadcn outline-variant tokens transitively (`border`, `bg-background`, `hover:bg-accent`, `hover:text-accent-foreground`); disabled state via shadcn `disabled:opacity-50` + added `text-muted-foreground` on polling label; sentinel helper uses `text-destructive` only (no background, no border); zero raw Tailwind color names (grep-gate G-2).
- [ ] Dimension 4 Spacing and Layout: PASS — all spacing via Tailwind multiples-of-4 (`mt-1`, `gap-1.5` inherited, `gap-3` inherited, `space-y-3` inherited, `space-y-6` inherited, `px-2.5`/`px-3` inherited from Button sm); icon sizes inherited from Button's `[&_svg:not([class*='size-'])]:size-4` rule; responsive wrap strategy specified for 4-sibling Cover Letter meta row (second-line wrap accepted at 512px).
- [ ] Dimension 5 Interaction: PASS — pessimistic-only state machine (idle → in-progress → done-or-sentinel) matches D-09 + D-10; `aria-busy` on in-progress state (G-1); `disabled` preserves keyboard focus traversal; `focus-visible:ring-[3px]` inherited; no toasts (rationale documented — visual feedback via disappear-or-refresh of adjacent section); `SectionErrorBoundary` wrap preserved (G-4); no new Tooltips, no new Dialogs.
- [ ] Dimension 6 Copywriting: PASS — button labels match ROADMAP SC verbatim (`"Research this company"`, `"Regenerate cover letter"`) — G-5 locks; 4 sentinel strings displayed verbatim from server response with literal `"Error: "` prefix — G-3 locks; anti-CTA rule documented as NOT applying to button labels (phase is owner-triggered CTAs by scope) but STILL applying to sentinel helper text (state-only, not call-to-retry); no empty-state copy changes.
- [ ] Dimension 7 Registry Safety: PASS — shadcn-official Button only; zero new shadcn installs; zero new npm deps; lucide-react Sparkles + RefreshCw are new uses but no install change.

**Approval:** pending

---

## Researcher Notes

Three Researcher Notes for the owner's review:

1. **No-toast decision (§Copywriting):** Phase 23 ships silent success. Trigger button disappears on company_research landing; Regenerate button returns to idle with a fresh adjacent FreshnessBadge date. Both surfaces provide on-screen visual feedback already, so a `toast.success` would duplicate. If the owner prefers a toast ("I want to know it worked even when my eye wasn't on the sheet"), the addition is two one-line changes. Flag if desired; default is silent.

2. **Icon choices (§Component Contracts):** `Sparkles` for Trigger and `RefreshCw` for Regenerate are researcher recommendations; both are already in the installed `lucide-react`. If the owner prefers label-only buttons (no leading glyph), drop the icons — UI contract holds either way because the `Loader2` spinner during polling is the authoritative state signal. Deferred to planner / owner preference.

3. **D-06 client-clock amendment (§Component Contracts — RegenerateCoverLetterButton):** CONTEXT.md D-06 was amended during/after RESEARCH.md §Pitfall 4 to eliminate client-clock drift. The Regenerate button now requires a server-provided `baselineGeneratedAt` prop (ISO string from `detail.cover_letter.generated_at` at sheet-load time). The `regenerateCoverLetter` Server Action ALSO returns the freshly-read baseline in its `{ok: true, baseline}` response so the predicate can use a post-click baseline if the owner scenarios that (otherwise the prop-provided baseline is fine). Grep-gate G-6 locks the client-clock prohibition. Planner's call on whether to use the prop-baseline or the server-response-baseline — both are server-ISO strings; functionally identical.

**Stack assumptions verified (2026-04-22):**

- `Button variant="outline" size="sm"` composes to `h-8 gap-1.5 rounded-md px-3 has-[>svg]:px-2.5 border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground` per `button.tsx:15-16,26`. Disabled state inherits `disabled:pointer-events-none disabled:opacity-50` from `button.tsx:8`. Focus ring inherits `focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50` from base.
- `Loader2`, `Sparkles`, `RefreshCw` all present in lucide-react 1.7.0 (verified via package.json).
- `SectionErrorBoundary` already wraps both Cover Letter (line 180) and Company Intel (line 285-288) sections in `job-detail-sheet.tsx`; Phase 23 buttons nest INSIDE these wraps transitively via mount-site placement — no new boundaries needed.
- `EMPTY_STATE_COPY.company_research.missing` = `"No company research yet."` is shipped via Plan 21-06 `src/lib/empty-state-copy.ts`. Trigger button sits alongside this copy, not instead of it.
- `detail.cover_letter.generated_at` is already populated by `attachFreshness` (Plan 20-04 + Plan 21-00); ISO string format; server-computed; hydration-safe to pass as a prop.
- All required color tokens exist: `--color-destructive`, `--color-muted-foreground`, `--color-foreground`, `--color-background`, `--color-accent`, `--color-border`, `--color-ring` (verified in `src/styles/globals.css:9-32`).
- `components.json` confirms shadcn baseline: `style: "new-york"`, `baseColor: "zinc"`, `cssVariables: true`, `rsc: true`, `tsx: true`, `iconLibrary: "lucide"`, css at `src/styles/globals.css`. No preset mismatch.
- No new shadcn installs needed. No new npm deps needed. No new color tokens needed. No new typography sizes needed. No new spacing tokens needed.
