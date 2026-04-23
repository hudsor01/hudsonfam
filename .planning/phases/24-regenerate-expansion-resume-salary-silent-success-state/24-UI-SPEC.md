---
phase: 24
slug: regenerate-expansion-resume-salary-silent-success-state
status: draft
shadcn_initialized: true
preset: none (manual init — new-york style, zinc base, lucide icons; inherited from Phase 20 via unchanged components.json)
created: 2026-04-23
---

# Phase 24 — UI Design Contract

> Visual and interaction contract for Phase 24: Regenerate Expansion (Resume + Salary + Silent-Success State). **Tight pattern-copy of Phase 23 UI-SPEC.** Net-new visual surface = two items only: (1) the `silent-success` warning helper `<p>` (AI-ACTION-07 terminal state, `text-warning text-xs mt-1 italic`), and (2) two new mount locations — the Tailored Resume section meta row and the Salary Intelligence section populated-branch meta row. Everything else (button variant, icon set, sentinel helper shape, spacing, typography, copywriting discipline, registry safety, G-1..G-5, G-7) inherits Phase 23 verbatim.

**Composes against (inherited verbatim; no restatement):**
- **Phase 23 UI-SPEC** — every dimension. Phase 24 refactors `regenerate-cover-letter-button.tsx` → `regenerate-button.tsx` (D-01), so the Phase 23 contract now applies to a SHARED file consumed by three instantiations instead of a dedicated Cover Letter file. Grep gates G-1..G-5 + G-7 carry forward verbatim; G-6 is extended (same rule, new target file); G-8 is NEW.
- **Phase 22 UI-SPEC** — meta-row cadence `flex items-center gap-3 flex-wrap`; `text-[10px]` provenance-tag precedent (Phase 24's silent-success helper stays at `text-xs` = 12px for the same reason Phase 23 did — transient outcome message, not stable adornment).
- **Phase 21 / Plan 21-06** — empty-state branches; anti-CTA rule (still applies to empty-state copy; DOES NOT apply to button labels; DOES apply to silent-success helper text per Phase 23 precedent for sentinel helper).
- **Phase 20 / Plan 20-06** — `SectionErrorBoundary` section-scoped wraps; all three regenerate buttons mount INSIDE existing boundaries (cover_letter, tailored_resume, salary_intelligence). Zero new boundaries.

**Integration surface (this phase only):**
- `src/app/(admin)/admin/jobs/regenerate-button.tsx` — RENAMED from `regenerate-cover-letter-button.tsx`; generalized props (D-01); 4-state machine (`idle | in-progress | error | silent-success`); adds the silent-success render branch (D-05).
- `src/app/(admin)/admin/jobs/tailored-resume-section.tsx` — EDIT (mount B): add `<RegenerateButton>` to the populated-branch meta row (currently `flex items-center gap-3 flex-wrap` at line 128) as rightmost sibling after the Download PDF anchor.
- `src/app/(admin)/admin/jobs/salary-intelligence-section.tsx` — EDIT (mount C): add `<RegenerateButton>` to the populated-branch meta row (currently `flex items-center gap-3 flex-wrap` at line 81) as rightmost sibling after the FreshnessBadge.
- `src/app/(admin)/admin/jobs/job-detail-sheet.tsx` — EDIT (mount A rewire): existing Cover Letter mount switches from `<RegenerateCoverLetterButton>` to `<RegenerateButton artifact="cover_letter" ...>`; zero change to mount location (remains rightmost sibling in the Cover Letter populated-branch meta row).

**Scope boundary:** UI-SPEC is deliberately lean. The only two visually novel elements this phase are the silent-success `<p>` helper and two new mount call-sites. No new sections, no new icons beyond `Loader2` + `RefreshCw` (both already imported in Phase 23 code), no new dialogs, no new toasts, no new shadcn installs, no new npm deps, no new globals.css tokens.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | shadcn (manual init — unchanged `components.json`) |
| Preset | none — `style: "new-york"`, `baseColor: "zinc"`, `rsc: true`, `tsx: true`, `cssVariables: true`, `iconLibrary: "lucide"`, css at `src/styles/globals.css` (verified at `components.json:2-20`) |
| Component library | radix (via shadcn/ui primitives) |
| Icon library | lucide-react — icons USED this phase: `Loader2` (in-progress spinner, already used in Phase 23), `RefreshCw` (regenerate glyph, already used in Phase 23). Zero new icons. |
| Font | `--font-sans: system-ui, -apple-system, sans-serif` (project default; not overridden; identical to Phase 23) |

**Dependencies locked by prior phases (Phase 24 re-uses, does not touch):**
- `@/components/ui/button` — unchanged; shared component uses `variant="outline" size="sm"` identically across all three artifact instantiations.
- `SectionErrorBoundary` (Plan 20-06) — unchanged; three existing per-section wraps (cover_letter, tailored_resume via Plan 20-05 mount site, salary_intelligence via Plan 22-07) transitively wrap each of the three new/rewired button mounts.
- `FreshnessBadge` + `attach-freshness.ts` (Plans 20-04, 21-00, 22-02) — unchanged; `detail.tailored_resume.generated_at` and `detail.salary_intelligence.search_date` are already computed server-side and flow through the button's `baselineGeneratedAt` prop as hydration-safe strings.
- `sendSignedWebhook` + `ErrorSentinel` (Plan 23-01) — unchanged; both new Server Actions (`regenerateTailoredResume`, `regenerateSalaryIntelligence`) consume the primitive by path string alone.
- `text-warning` + `text-destructive` + `text-muted-foreground` + `text-foreground` — all four tokens pre-exist in `src/styles/globals.css:22-32`; `text-warning` is actively used by `src/lib/provenance.ts`, `src/lib/score-color.ts`, `salary-intelligence-section.test.tsx`, and 7 other files (verified). No new token.

**Zero new shadcn installs. Zero new npm deps. Zero new lucide icons. Zero new color tokens. Zero new typography sizes. Zero new spacing tokens.**

---

## Spacing Scale

**Fully inherited from Phase 23 UI-SPEC §Spacing Scale.** No new tokens, no exceptions. All values remain multiples of 4.

| Token | Value | Usage in Phase 24 |
|-------|-------|-------------------|
| xs | 4px (`mt-1`) | Gap between `<Button>` and the `<p>` helper beneath it — applies to BOTH the existing `text-destructive` sentinel helper AND the NEW `text-warning italic` silent-success helper (same physical slot, mutually exclusive occupants — see §Component Contracts). D-05 literal. |
| xs | 6px (`gap-1.5`) | shadcn Button internal icon-to-label gap, inherited from `button.tsx:26` sm variant. Do NOT override. |
| md | 12px (`gap-3`) | Meta-row sibling gap — same rhythm in all three host rows (cover letter meta, tailored resume meta at line 128, salary intelligence meta at line 81). Unchanged. |
| lg | 24px (`space-y-6`) | Section-level gap — unchanged. |

**Button dimensions** — `h-8` (32px), `px-3` / `has-[>svg]:px-2.5`, `gap-1.5` internal, `size-4` icon — all inherited from shadcn `variant="outline" size="sm"`. No overrides in any of the three instantiations.

**Silent-success helper spacing** — `mt-1` (4px) gap below button. **Identical physical slot to the sentinel error `<p>`** — the two states are mutually exclusive via the discriminated union (D-06); at most ONE helper `<p>` renders at any time. No need for separate vertical reservations.

**Exceptions:** none.

---

## Typography

**Fully inherited from Phase 23 UI-SPEC §Typography.** No new sizes, no new weights, no new fonts.

| Role | Size | Weight | Line Height | Usage in Phase 24 |
|------|------|--------|-------------|-------------------|
| Button label | 14px (`text-sm`) | 500 (`font-medium`) | 1.5 | All three button labels inherit shadcn Button default. Labels are stable across state transitions (identical to Phase 23 — swap label mid-press is an a11y anti-pattern). |
| Sentinel error helper | 12px (`text-xs`) | 400 | 1.4 | `<p className="text-destructive text-xs mt-1">Error: {sentinel}</p>` — unchanged from Phase 23 §Copywriting Contract. |
| Silent-success helper (NEW surface) | 12px (`text-xs`) | 400, **italic** | 1.4 | `<p className="text-warning text-xs mt-1 italic">` — SAME size as the sentinel helper (12px, weight 400). Italic is the additional disambiguation signal alongside the warning color token — sighted owners distinguish the two outcome helpers via color (destructive red vs warning amber) + italic (silent-success only). No bold / no heading treatment (state-only, one-short-line text). |

**Why `text-xs` at the same 12px as the sentinel (not `text-[10px]`, not `text-sm`):** the silent-success helper is a transient action-outcome message in the same physical slot as the sentinel helper — preserving 12px equalizes visual weight so owners recognize BOTH as "the helper slot below the button" rather than inventing a third size class.

**Why italic (the sole added typographic signal this phase):** the two outcome helpers occupy the same `mt-1` slot with the same text size and the same baseline. Color alone (destructive vs warning) is insufficient for color-deficient vision (red-amber is a common confusion pair). Italic provides a form-of-type redundancy that pattern-matches the existing `src/app/(admin)/admin/jobs/*.tsx` convention for empty-state copy (`text-sm text-muted-foreground italic` in `tailored-resume-section.tsx:85,99`, `salary-intelligence-section.tsx:50,67`, `empty-state-copy.ts` call sites) — italic in this codebase already reads as "transient / secondary / not-yet-populated" semantically. Re-using that grammar is intentional.

**No new sizes. No new weights. No new fonts.**

---

## Color

**Zero new color tokens.** All surfaces reference existing `@theme` tokens declared in `src/styles/globals.css`. Token-verification trail:
- `--color-warning: oklch(0.85 0.17 85)` — `src/styles/globals.css:32` (verified); actively consumed by `src/lib/provenance.ts`, `src/lib/score-color.ts`, 8 other files.
- `--color-destructive: oklch(0.55 0.20 25)` — `src/styles/globals.css:23` (verified).
- `--color-muted-foreground: oklch(0.62 0.03 250)` — `src/styles/globals.css:22` (verified).
- `--color-foreground: oklch(0.94 0.02 80)` — `src/styles/globals.css:10` (verified).
- `--color-accent: oklch(0.78 0.12 75)` — `src/styles/globals.css:19` (verified; used via `hover:bg-accent` inherited from shadcn Button).
- `--color-border`, `--color-background`, `--color-ring` — all inherited transitively via shadcn Button baseline classes.

### Token usage table (delta from Phase 23 UI-SPEC)

| Role | Token | Usage in Phase 24 |
|------|-------|-------------------|
| Dominant (60%) | `--color-background` | Unchanged — sheet background. |
| Secondary (30%) | `--color-card` | Unchanged — section containers. |
| Accent (10%) | `--color-accent` | Unchanged — the SOLE accent-token usage is shadcn Button hover on all three instantiations (`hover:bg-accent hover:text-accent-foreground`, inherited). |
| Foreground | `--color-foreground` | Unchanged — button label default state. |
| Muted foreground | `--color-muted-foreground` | Unchanged — button label during in-progress state (`className={isPolling ? "text-muted-foreground" : ""}`). |
| **Destructive** | `--color-destructive` | Sentinel error helper `<p>` — **unchanged from Phase 23**; applies identically whether artifact is cover_letter, tailored_resume, or salary_intelligence (sentinel is artifact-agnostic). |
| **Warning (NEW usage this phase)** | `--color-warning` | Silent-success helper `<p className="text-warning text-xs mt-1 italic">` — the ONLY net-new color-token surface this phase introduces. D-05 literal. Mutually exclusive with the destructive-helper render via discriminated-union narrowing (D-06). |
| Border | `--color-border` | Unchanged — button outline border. |
| Ring | `--color-ring` | Unchanged — focus-visible ring. |
| Success | `--color-success` | **Not used** — successful regenerate is signaled by FreshnessBadge advancing (cover_letter, tailored_resume) or by search_date flipping to today's date (salary_intelligence) + button returning to idle. No success-color flash. Consistent with Phase 23. |

### Accent reserved for

- shadcn Button `hover:bg-accent hover:text-accent-foreground` on all three button instantiations (inherited transitively; zero new accent usage).
- **NOT** used for any state signal (no "click me" pulse, no success flash, no selected state). All state transitions convey via icon swap (`RefreshCw` → `Loader2` spinner) + label color muting + disabled opacity + the one helper `<p>` color distinction (destructive vs warning).

### Silent-success vs sentinel-error color contract

| Terminal state | Helper class string | Visual distinction |
|----------------|---------------------|-------------------|
| `{ kind: "error"; sentinel }` | `text-destructive text-xs mt-1` | Destructive red, upright weight-400 text, prefix "Error: ". Identical to Phase 23. |
| `{ kind: "silent-success" }` (NEW) | `text-warning text-xs mt-1 italic` | Warning amber, italic weight-400 text, no prefix (the full sentence is its own readable line). D-05 literal. |

**Grep-gate G-2 unchanged:** no raw Tailwind color classes (`text-red-*`, `text-amber-*`, `text-yellow-*`, `text-green-*`, `bg-*-500`, etc.) anywhere in `regenerate-button.tsx`, `tailored-resume-section.tsx` diff, or `salary-intelligence-section.tsx` diff. The ONLY color tokens in the component source are `text-destructive`, `text-warning`, `text-muted-foreground`, and the shadcn-inherited accent/border/background/ring classes.

**No `bg-warning/10 border border-warning/25 text-warning` banner treatment.** The helper stays an inline `<p>` — same as the Phase 23 sentinel helper — because both occupy a transient outcome slot directly under the triggering button (not a standalone alert region requiring a bounded box). This matches Phase 23 UI-SPEC §Color "explicit prohibitions".

---

## Copywriting Contract

### Button labels (verbatim from ROADMAP SC #1 / SC #2 / SC #4)

| Artifact instantiation | Visible label | Source |
|-----------------------|---------------|--------|
| `artifact="cover_letter"` | `Regenerate cover letter` | ROADMAP SC #2 (Phase 23; inherited verbatim) |
| `artifact="tailored_resume"` | `Regenerate tailored resume` | ROADMAP Phase 24 SC #1 verbatim (case-sensitive, no trailing punctuation) |
| `artifact="salary_intelligence"` | `Regenerate salary intelligence` | ROADMAP Phase 24 SC #2 verbatim (case-sensitive, no trailing punctuation) |

**Label stability across states (all three instantiations):** label text does NOT change between idle / in-progress / error / silent-success. Icon swaps (`RefreshCw` → `Loader2` during polling; back to `RefreshCw` on terminal states) + `aria-busy` toggle are the sole state signals. Phase 23 anti-pattern rationale applies verbatim — swapping a button's visible text mid-press breaks AT focus announcements.

**Label passed as the `label` prop (D-01):** the three labels are plain strings supplied by the parent component at mount site. The shared `regenerate-button.tsx` renders `{label}` as the button's text child; zero label-logic inside the component. Grep-gate G-5 asserts all three verbatim labels appear in the source of the three mount sites (one per mount).

### Sentinel helper text (verbatim from Phase 23)

Unchanged. When state is `{ kind: "error"; sentinel }`, render:

```tsx
<p className="text-destructive text-xs mt-1">Error: {sentinel}</p>
```

Where `{sentinel}` is one of the four `ErrorSentinel` values (`"timeout"`, `"auth"`, `"rate limit"`, `"unavailable"`) rendered verbatim from the server response per G-3. The sentinel table from Phase 23 UI-SPEC applies identically across all three artifact instantiations.

### Silent-success helper text (NEW this phase — G-8 verbatim lock)

When state is `{ kind: "silent-success" }`, render:

```tsx
<p className="text-warning text-xs mt-1 italic">
  Regeneration reported success but no new content was written — check n8n logs.
</p>
```

**Exact string (character-for-character, em-dash `—` U+2014, period terminator, no exclamation, no trailing whitespace):**

> `Regeneration reported success but no new content was written — check n8n logs.`

**Source of truth:** ROADMAP Phase 24 SC #3 + CONTEXT.md D-05. The string is artifact-agnostic — it reads identically whether the failing regenerate was a cover letter, tailored resume, or salary intelligence (intentional: the owner's next action is the same in all three cases — check n8n logs).

**Grep-gate G-8 (NEW) locks two facts:**
1. The literal string appears exactly ONCE in `src/app/(admin)/admin/jobs/regenerate-button.tsx` source (component implementation; the ONLY authorized render site).
2. A test in `src/__tests__/components/regenerate-button.test.tsx` asserts the rendered DOM's `container.textContent` contains the exact string when the state machine transitions to `silent-success` — one such assertion MUST exist for at least one artifact fixture (cover_letter, tailored_resume, or salary_intelligence — the silent-success branch is artifact-agnostic so single coverage is sufficient for copy verbatim; D-07 additionally requires per-artifact coverage of the silent-success branch for state-machine coverage).

### Anti-CTA rule scope (clarified for this phase)

| Copy class | Rule | Phase 24 applicability |
|-----------|------|------------------------|
| Button labels | Anti-CTA does NOT apply | All three labels are legitimate imperative-verb CTAs — the phase's entire purpose is action surfaces. "Regenerate cover letter" / "Regenerate tailored resume" / "Regenerate salary intelligence" are correct and required. Inherited verbatim from Phase 23 §Copywriting. |
| Empty-state copy | Anti-CTA DOES apply (Plan 21-06) | Phase 24 does NOT modify any empty-state copy. `EMPTY_STATE_COPY` in `src/lib/empty-state-copy.ts` stays unchanged. |
| Sentinel error helper | Anti-CTA DOES apply | "Error: timeout" / "Error: auth" / "Error: rate limit" / "Error: unavailable" — state-only, no "click again to retry" directive. Inherited from Phase 23. |
| Silent-success helper | Anti-CTA DOES apply | "Regeneration reported success but no new content was written — check n8n logs." is state-only; "check n8n logs" is diagnostic guidance to an external system, NOT an in-app imperative-verb CTA back on the same button. Re-click recovery is implicit (button re-enables on silent-success just as on error — D-06 locks mutual-exclusion; same-user-same-click retry pattern holds). |

### No new toasts, no new empty-state copy, no new destructive actions

| Category | Phase 24 |
|----------|----------|
| Destructive actions | **none** — regenerate overwrites in place; no confirmation dialog across any of the three artifacts (Phase 23 precedent). |
| Toasts | **none** — Phase 23 ships silent success; Phase 24 extends the same posture. Successful regenerate surfaces as FreshnessBadge advance (cover_letter, tailored_resume) or as search_date advance (salary_intelligence) + button returning to idle. Silent-success surfaces as the new `<p>` helper. Error surfaces as the existing `<p>` helper. No toast duplicates any of these. |
| Empty-state copy | **unchanged** — the three sections' empty-state branches are Plan 21-06 / 22-06 territory; Phase 24 does not touch them. Regenerate buttons render ONLY in the populated branch of each section (D-09 visibility gate). |
| Primary CTA | The three regenerate labels themselves (above). |
| Error state copy | Inherited verbatim — 4-sentinel mapping. |
| Silent-success state copy | ONE line, verbatim, G-8 locked. |

---

## Component Contracts (delta from Phase 23)

### 1. Shared `RegenerateButton` — generalized component (NEW file via rename)

**Location:** `src/app/(admin)/admin/jobs/regenerate-button.tsx` (RENAMED from `regenerate-cover-letter-button.tsx` per D-01).

**Props (D-01 locked):**

```ts
interface RegenerateButtonProps {
  jobId: number;
  artifact: "cover_letter" | "tailored_resume" | "salary_intelligence";
  label: string;              // verbatim from §Copywriting above
  action: (jobId: number) => Promise<RegenerateResult>;
  isDone: (detail: FreshJobDetail | null, serverBaseline: string | null) => boolean;
  baselineGeneratedAt: string | null;  // null for salary_intelligence (search_date uses date strings, not ISO timestamps)
}

type RegenerateResult =
  | { ok: true; baseline: string | null }
  | { ok: false; sentinel: ErrorSentinel };
```

**State machine (D-06 — 4 variants, mutually exclusive):**

```ts
type ButtonState =
  | { kind: "idle" }
  | { kind: "in-progress"; serverBaseline: string | null }
  | { kind: "error"; sentinel: ErrorSentinel }
  | { kind: "silent-success" };  // NEW — D-05 / D-06; mutually exclusive with "error"
```

**State transitions (delta from Phase 23 — the 60-poll-cap path forks):**

| From state | Trigger | To state | Side effects |
|-----------|---------|----------|--------------|
| `idle` | Click | (transition same as Phase 23) → `in-progress` OR `error` based on server response | (same as Phase 23) |
| `in-progress` | `isDone` predicate returns `true` during a poll tick | `idle` | `clearInterval`; parent re-renders; freshness/search_date badge advances. Button stays visible (regenerate is repeatable — same as Phase 23 Cover Letter). |
| `in-progress` | Poll count reaches 60 AND the webhook response that started this polling was `{ ok: true }` | **`silent-success` (NEW)** | `clearInterval`; warning helper `<p>` appears; button re-enables for retry. |
| `in-progress` | Poll count reaches 60 AND the webhook response that started this polling was `{ ok: false }` | (unreachable — a failed webhook never produces `in-progress`; cannot be in this branch) | n/a |
| `in-progress` | Transient `fetchJobDetail` error in a poll tick | (count-only — does NOT abort; 60-cap remains the sole exit; preserves Phase 23 semantic) | Counter increments; loop continues. |
| `error` | Click | `in-progress` | Helper `<p>` unmounts immediately; spinner + disabled re-engage. |
| `silent-success` | Click | `in-progress` | Helper `<p>` unmounts immediately; spinner + disabled re-engage. SAME shape as `error → in-progress` transition. Terminal state is stay-until-clicked (Claude's discretion — CONTEXT.md §Claude's Discretion recommended this; matches sentinel-error UX). |

**Render tree (delta from Phase 23 — adds one branch):**

```tsx
return (
  <div>
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleClick}
      disabled={isDisabled}
      className={isPolling ? "text-muted-foreground" : ""}
      aria-busy={isPolling}
    >
      {isPolling ? <Loader2 className="animate-spin" /> : <RefreshCw />}
      {label}
    </Button>
    {state.kind === "error" && (
      <p className="text-destructive text-xs mt-1">
        Error: {state.sentinel}
      </p>
    )}
    {state.kind === "silent-success" && (
      <p className="text-warning text-xs mt-1 italic">
        Regeneration reported success but no new content was written — check n8n logs.
      </p>
    )}
  </div>
);
```

**Mutual exclusion invariant:** the two helper `<p>` elements occupy the same `mt-1` slot below the button; the discriminated union narrowing on `state.kind` guarantees at most one helper renders at any time. A failed webhook (`{ ok: false }`) leads directly to `{ kind: "error" }` and NEVER reaches `{ kind: "silent-success" }` — Phase 24 test cases (D-07) include an explicit assertion for this invariant.

**Icon choice:** `RefreshCw` (already used in Phase 23 cover-letter button) is used for ALL THREE artifact instantiations. No per-artifact icon specialization — the label carries the artifact identity; the icon conveys the action class (regenerate). Rationale for consistency: three regenerate buttons with three different icons would invent three visual vocabularies for the same action; one icon across all three signals "this is the same operation on a different noun."

**Visibility gates (D-09 locked):**

| Artifact | Mount location | Visibility predicate |
|----------|----------------|---------------------|
| cover_letter | `job-detail-sheet.tsx` Cover Letter populated-branch meta row (rightmost sibling after Download PDF) — unchanged from Phase 23 | `detail.cover_letter !== null` (populated branch of the 3-way ternary) |
| tailored_resume | `tailored-resume-section.tsx:128` populated-branch meta row (rightmost sibling after Download PDF anchor) | `resume !== null && resume.content?.trim()` — equivalent to the existing populated-branch early-return guard at lines 92-104 |
| salary_intelligence | `salary-intelligence-section.tsx:81` populated-branch meta row (rightmost sibling after FreshnessBadge) | `salary !== null && (hasProse \|\| headline)` — equivalent to the existing populated-branch guard at lines 60-72 |

All three buttons mount INSIDE their existing `SectionErrorBoundary` wraps (transitively via section placement; Plan 20-06 preserved). Grep-gate G-4 extended to assert all three (cover_letter, tailored_resume, salary_intelligence) satisfy the "button nested inside matching section boundary" invariant.

### 2. Mount A — Cover Letter meta row (rewire — no visual change)

**File:** `src/app/(admin)/admin/jobs/job-detail-sheet.tsx`
**Change:** prop-shape update only; zero visual change.

```diff
-<RegenerateCoverLetterButton
-  jobId={detail.id}
-  baselineGeneratedAt={detail.cover_letter.generated_at}
-/>
+<RegenerateButton
+  jobId={detail.id}
+  artifact="cover_letter"
+  label="Regenerate cover letter"
+  action={regenerateCoverLetter}
+  isDone={coverLetterIsDone}
+  baselineGeneratedAt={detail.cover_letter.generated_at}
+/>
```

All styling, positioning, and interaction behavior are byte-for-byte identical to Phase 23. The 17-case Phase 23 test suite ports verbatim with `artifact="cover_letter"` fixture (D-07).

### 3. Mount B — Tailored Resume meta row (NEW visual surface)

**File:** `src/app/(admin)/admin/jobs/tailored-resume-section.tsx`
**Change:** add button as rightmost sibling in the existing populated-branch meta row.

```diff
 <div className="flex items-center gap-3 flex-wrap">
   <FreshnessBadge {/* existing */} />
   <Tooltip>{/* existing Copy button */}</Tooltip>
   <a {/* existing Download PDF anchor */}>
     <Download className="size-3" />
     Download PDF
   </a>
+  <RegenerateButton
+    jobId={jobId}
+    artifact="tailored_resume"
+    label="Regenerate tailored resume"
+    action={regenerateTailoredResume}
+    isDone={tailoredResumeIsDone}
+    baselineGeneratedAt={resume.freshness.generatedDate /* or the raw ISO; planner picks whichever matches attachFreshness output */}
+  />
 </div>
```

**Placement rationale:** rightmost after Download PDF — directly analogous to Phase 23 Cover Letter meta row placement (FreshnessBadge → Quality → Download → Regenerate). The order convention "badges → passive actions (Copy, Download) → mutation action (Regenerate)" holds.

**Responsive behavior:** four-control meta row (FreshnessBadge + Copy Tooltip button + Download anchor + Regenerate button) ≈ 420-450px on populated-branch render; sheet width 512px — fits on one line in most owner viewports. `flex-wrap` handles overflow on narrower viewports (button drops to a second row with `gap-3` preserved). Acceptable for ship; identical to Phase 23 Cover Letter responsive posture.

**Props wiring note:** `resume.freshness.generatedDate` is the server-formatted date STRING (e.g. "4/21/26") from Plan 21-00's `attachFreshness` revision; the button's `baselineGeneratedAt` expects an ISO string (`tailored_resumes.generated_at` raw), not the formatted date. Planner decides whether to plumb a new `baselineGeneratedAtIso` prop onto `TailoredResumeSection` or have the section read `resume.freshness.raw` / equivalent. This is a planner data-plumbing concern, NOT a UI-SPEC concern — the contract is: the button's `baselineGeneratedAt` prop MUST be an ISO-8601 string from the server (the same contract Phase 23 locked with G-6).

### 4. Mount C — Salary Intelligence meta row (NEW visual surface)

**File:** `src/app/(admin)/admin/jobs/salary-intelligence-section.tsx`
**Change:** add button as rightmost sibling in the existing populated-branch meta row (currently only FreshnessBadge).

```diff
 <div className="flex items-center gap-3 flex-wrap">
   <FreshnessBadge {/* existing */} />
+  <RegenerateButton
+    jobId={jobId}
+    artifact="salary_intelligence"
+    label="Regenerate salary intelligence"
+    action={regenerateSalaryIntelligence}
+    isDone={salaryIntelligenceIsDone}
+    baselineGeneratedAt={salary.search_date /* YYYY-MM-DD date string, not ISO timestamp */}
+  />
 </div>
```

**Props wiring note:** `SalaryIntelligenceSection` currently accepts only `salary` as a prop. To mount the button, planner needs to either (a) pass `jobId` as a new prop (preferred — matches `TailoredResumeSection`'s existing `jobId` prop), or (b) lift the button to `job-detail-sheet.tsx` call site. UI-SPEC recommends (a) for symmetry with tailored-resume.

**Date-granularity edge case (D-04):** `baselineGeneratedAt` for salary_intelligence is a `YYYY-MM-DD` date string, not an ISO timestamp. The `salaryIntelligenceIsDone` predicate uses `new Date(current + "T00:00:00Z") > new Date(baseline + "T00:00:00Z")` (UTC-midnight parse) per RESEARCH.md §Pattern 1. **Same-day regenerate DOES NOT advance `search_date`** — owner clicks regenerate at 10am and 3pm same day → second click triggers silent-success warning (the new `<p>` helper copy). This is the primary customer-visible rationale for AI-ACTION-07 — the copy "check n8n logs" naturally covers "it ran but produced the same day's sample." Documented edge case, not a bug. SUMMARY.md captures it.

**Responsive behavior:** two-control meta row (FreshnessBadge + Regenerate button) ≈ 260-290px; fits easily on one line. No wrap expected at any viewport.

### 5. Single-file state machine (Claude's discretion — locked: KEEP isDone predicates EXTRACTED)

CONTEXT.md §Claude's Discretion left the location of per-artifact `isDone` predicates open. UI-SPEC **recommends extraction** to `src/lib/regenerate-predicates.ts` with three exports: `coverLetterIsDone`, `tailoredResumeIsDone`, `salaryIntelligenceIsDone` (RESEARCH.md §Pattern 1). Rationale (from RESEARCH):
- 3 × ~8 lines of predicate logic worth isolating for independent Vitest coverage (no component render required)
- Matches project precedent: `@/lib/score-color.ts` (Plan 21-05), `@/lib/empty-state-copy.ts` (Plan 21-06), `@/lib/format-salary.ts` (Plan 22-06) — the codebase has a consistent "extract pure helpers alongside schemas" posture
- Lets the shared component's polling callback stay a one-liner `props.isDone(detail, baseline)` call

**This is a UI-SPEC recommendation; planner may override.** Either location (inline or extracted) is UI-contract-valid. Grep-gate G-6 (extended) applies to the component file `regenerate-button.tsx` regardless of predicate location — wall-clock prohibition is on the component, not the predicates (predicates parse ISO strings server-side and compare, which is allowed).

---

## Cross-cutting UI contracts (MUST for every new element this phase)

### Hydration safety (inherited + extended)

`baselineGeneratedAt` prop for all three mounts is a server-computed primitive. **No `new Date()`, no `window.*`, no `Date.now()` during render in `regenerate-button.tsx`.** G-6 extended to the shared file — the rule is IDENTICAL to Phase 23's, the TARGET file changes.

`new Date(baseline)` calls are permitted inside the polling callback body (runtime) ONLY for ISO / date-string parsing in the three `isDone` predicates — never to read the current wall clock.

**This is a MUST. Any deviation is an immediate UI-SPEC checker failure.**

### Color tokens (CLAUDE.md enforcement — unchanged from Phase 23)

Forbidden in `regenerate-button.tsx`, Phase-24 diff of `tailored-resume-section.tsx`, Phase-24 diff of `salary-intelligence-section.tsx`:
- `text-red-*`, `text-amber-*`, `text-yellow-*`, `text-green-*`, `text-emerald-*`, `text-orange-*`, `text-blue-*`, `text-gray-*`, `text-zinc-*`, `text-slate-*` and any `bg-*` / `border-*` variants
- Inline `style={{ color: '...' }}`
- Any new `--color-*` token

The ONLY color classes in the three components' Phase-24 diff are `text-destructive`, `text-warning`, `text-muted-foreground`, and shadcn-inherited Button classes. Grep-gate G-2 enforces — same rule, three files.

### Accessibility contract (delta from Phase 23)

| Element | Accessible name source | Extra ARIA |
|---------|------------------------|------------|
| RegenerateButton (idle, all three artifacts) | Button text (the `label` prop verbatim) | — |
| RegenerateButton (in-progress, all three) | Button text (unchanged) | `aria-busy="true"` |
| RegenerateButton (error, all three) | Button text (unchanged) | — |
| RegenerateButton (silent-success, all three) | Button text (unchanged) | — |
| Sentinel helper `<p>` | Text content `"Error: {sentinel}"` | (none — Phase 23 inherited) |
| Silent-success helper `<p>` (NEW) | Text content (the full verbatim sentence) | (none — same rationale as sentinel helper: user's focus is on the button that just re-enabled; adjacent text is visible without AT announcement. If post-ship testing shows the warning is missed by AT users, add `role="alert"` — one-line change; deferred.) |
| `Loader2` + `RefreshCw` icons | (decorative) | `aria-hidden="true"` (inherited via shadcn Button's `[&_svg]:pointer-events-none`) |

**Keyboard focus traversal during in-progress:** shadcn's native `<button disabled>` remains in Tab order (verified WAI-ARIA pattern). G-1 enforces `aria-busy={isPolling}` on the `<Button>` — same rule, same file (the shared component).

**Silent-success `aria-live` / `role="alert"` decision:** **not set** (matches sentinel helper precedent). Owner focus is already on the button (which just re-enabled from disabled); the adjacent helper text is visible without AT announcement. Double-announcement (state change + aria-live) would confuse AT users. **If post-ship usage shows the warning is missed, add `role="alert"` — single-line deferred change.**

### Responsive contract

- Three meta rows (Cover Letter, Tailored Resume, Salary Intelligence) all use `flex items-center gap-3 flex-wrap`.
- Cover Letter: 4 controls → wraps to second line at 512px sheet (Phase 23 precedent — accepted).
- Tailored Resume: 4 controls (FreshnessBadge + Copy Tooltip + Download + Regenerate) → likely wraps at 512px; `flex-wrap gap-3` handles.
- Salary Intelligence: 2 controls (FreshnessBadge + Regenerate) → comfortably one line at 512px.

**No `flex-col sm:flex-row` overrides.** `flex-wrap` is the authoritative responsive strategy.

### Toast stack contract

**Zero `toast.*` calls in Phase 24.** Success surfaces via FreshnessBadge advance / search_date advance + button return-to-idle; silent-success surfaces via the new `<p>` helper; error surfaces via the existing sentinel `<p>` helper. Three on-screen visual signals cover all four terminal states.

### What this UI-SPEC DOES NOT cover (defer to planning / execution)

- Exact `isDone` predicate file location (inline vs extracted `src/lib/regenerate-predicates.ts`) — UI-SPEC recommends extraction; planner decides.
- Exact Vitest fake-timer test setup (inherited scaffold from Plan 23-06).
- Whether `regenerate-cover-letter-button.tsx` should be preserved as a thin re-export shim (CONTEXT.md default is clean delete per Plan 22 D-01 precedent).
- Whether `silent-success` state should auto-revert to `idle` after N seconds (UI-SPEC recommends stay-until-clicked per CONTEXT.md §Claude's Discretion — matches sentinel-error UX; planner picks).
- Exact `jobId` plumbing into `SalaryIntelligenceSection` (new prop vs lift to parent) — data-plumbing concern.
- n8n webhook endpoints (`regenerate-tailored-resume`, `regenerate-salary-intelligence`) — homelab repo scope.

---

## Grep-verifiable contracts (MUST — plan-checker + ui-checker use these)

These rules MUST be enforceable by static grep (or Vitest `readFileSync` test). Fail-loud on violation.

### G-1 through G-5 + G-7 — INHERITED FROM PHASE 23 UI-SPEC (verbatim; target file changes)

Phase 23's grep gates G-1, G-2, G-3, G-4, G-5, G-7 are inherited byte-for-byte, with ONE adjustment: the target file changes from `regenerate-cover-letter-button.tsx` to `regenerate-button.tsx` (rename per D-01). Test file target changes from `regenerate-cover-letter-button.test.tsx` to `regenerate-button.test.tsx` (D-07 rename).

| Gate | Rule (abridged) | Phase 24 target |
|------|-----------------|-----------------|
| G-1 | `aria-busy={isPolling}` present on both button components | `regenerate-button.tsx` (shared file — one `aria-busy` call covers all three instantiations) |
| G-2 | No raw Tailwind color classes | `regenerate-button.tsx`, Phase-24 diff of `tailored-resume-section.tsx`, Phase-24 diff of `salary-intelligence-section.tsx` |
| G-3 | Sentinel strings verbatim from server (`{state.sentinel}` interpolation; no client-side rewriting via `switch`/`if-else`) | `regenerate-button.tsx` |
| G-4 | Buttons nested inside matching `SectionErrorBoundary section=` wrap | Three mount sites — cover_letter (existing); tailored_resume (NEW mount — inside existing `SectionErrorBoundary section="tailored_resume"` wrap at `job-detail-sheet.tsx` from Plan 20-06); salary_intelligence (NEW mount — inside existing `SectionErrorBoundary section="salary_intelligence"` wrap at `job-detail-sheet.tsx` from Plan 22-07). G-4 test must assert all three pairings. |
| G-5 | Button labels verbatim from ROADMAP SC | All three labels verbatim: `"Regenerate cover letter"` (SC #2), `"Regenerate tailored resume"` (SC #1 Phase 24), `"Regenerate salary intelligence"` (SC #2 Phase 24). Grep-test asserts each label appears at the correct mount site. |
| G-7 | `fireWebhook` fully deleted from `job-actions.ts` | Unchanged from Phase 23 (Plan 23-03 completed this). |

### G-6 — EXTENDED (rule unchanged, target file changes)

**Rule:** `Date.now()` count = 0 in the component file. `new Date(...)` usage permitted ONLY inside polling callback / `isDone` predicate body to parse ISO-or-date strings (runtime parsing, not wall-clock reads).

**Target (delta):** `src/app/(admin)/admin/jobs/regenerate-button.tsx` (shared file — since all three button instantiations live here, G-6 now covers all three by file-count-of-one).

**Extension rationale (CONTEXT.md D-10):** Phase 23's G-6 targeted `regenerate-cover-letter-button.tsx`. Phase 24 generalizes that file — G-6 follows the rename. Zero net-new cover; stronger per-unit-of-coverage enforcement (one test, three artifacts).

**Implementation:**

```bash
grep -c "Date.now()" src/app/(admin)/admin/jobs/regenerate-button.tsx
# MUST return 0
```

Stricter Vitest assertion (inherited): spy `global.Date` during initial render of ANY fixture; assert `.mock.calls.length === 0` between mount and first setInterval tick.

### G-8 — NEW (silent-success copy verbatim lock)

**Rule:** the literal string `"Regeneration reported success but no new content was written — check n8n logs."` appears EXACTLY ONCE in `src/app/(admin)/admin/jobs/regenerate-button.tsx` source, AND at least one test in `src/__tests__/components/regenerate-button.test.tsx` asserts the rendered DOM (via `container.textContent` or `screen.getByText`) contains the exact string when the state machine transitions to `silent-success`.

**Rationale:** ROADMAP SC #3 is verbatim copy the owner committed to surface. Copy drift (a renamed variable, a reworded punctuation, an exclamation substitution) silently degrades the contract. A two-prong gate (source grep + rendered DOM assertion) catches both coding-time drift and test-time-only drift.

**Implementation (source grep):**

```bash
grep -c "Regeneration reported success but no new content was written — check n8n logs." \
  src/app/(admin)/admin/jobs/regenerate-button.tsx
# MUST return exactly 1
```

**Implementation (Vitest DOM assertion — at least one test case):**

```tsx
// src/__tests__/components/regenerate-button.test.tsx (fixture artifact-agnostic — any of the 3 suffices)
it("renders the verbatim silent-success helper on 60-poll exhaustion with ok:true", async () => {
  // ... fake-timer setup, render with ok:true mock, advance 60 ticks without isDone ...
  expect(container.textContent).toContain(
    "Regeneration reported success but no new content was written — check n8n logs."
  );
});
```

**Character-sensitivity note:** the em-dash is U+2014 (`—`, not `--`, not `-`). The period terminator is U+002E (`.`). Zero trailing whitespace. G-8 grep is byte-exact.

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | `Button` (ALREADY installed; predates Phase 20) | not required — official registry, primitive predates this phase |
| npm (not a shadcn registry) | `lucide-react` `Loader2` + `RefreshCw` icons (both already imported in Phase 23 code) | not applicable — existing dep, vetted in earlier phases |

**Third-party shadcn registries:** **none**. Phase 24 does NOT install any block from a third-party registry. The registry vetting gate (`npx shadcn view {block} --registry {url}`) is not applicable and is skipped per `<shadcn_gate>` logic.

**Zero new shadcn installs. Zero new npm deps. Zero new lucide icons. Zero new color tokens.** Every primitive and dep referenced already ships.

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS — three button labels verbatim from ROADMAP SC (`"Regenerate cover letter"` / `"Regenerate tailored resume"` / `"Regenerate salary intelligence"`; G-5 locks); silent-success helper verbatim from SC #3 with em-dash + period terminator (G-8 locks — new); sentinel helper unchanged from Phase 23 (G-3 locks); anti-CTA applies to empty-state copy + both helpers, does NOT apply to button labels (inherited from Phase 23 scope disambiguation); zero new toasts, zero new empty-state copy, zero new destructive actions.
- [ ] Dimension 2 Visuals: PASS — silent-success terminal state subordinate to the Button (helper `<p>` at 12px vs button text 14px); mutually exclusive physical slot with sentinel-error helper (both occupy the `mt-1` below-button position; state-machine discriminated union enforces at-most-one renders); italic is the additional form-of-type disambiguation signal alongside color (matches project's existing "italic = transient/not-yet-populated" grammar in `*-section.tsx` empty-state copy).
- [ ] Dimension 3 Color: PASS — zero new tokens; `text-warning` (verified at `src/styles/globals.css:32`, OKLCH `0.85 0.17 85`, actively used by provenance.ts + score-color.ts + 8 other files) is the sole net-new color-token SURFACE (the token itself is pre-existing); `text-destructive` sentinel-helper usage inherited from Phase 23; zero raw Tailwind color names (G-2 locks); zero inline `style` color; no banner treatment for helpers (inline `<p>` only).
- [ ] Dimension 4 Typography: PASS — zero new sizes/weights/fonts; button labels inherit shadcn Button `text-sm font-medium`; silent-success helper at `text-xs` (12px) weight 400 italic — same physical size as the Phase-23 sentinel helper, italic is the typographic disambiguation; no new heading/body/label roles.
- [ ] Dimension 5 Spacing: PASS — all spacing via Tailwind multiples-of-4 inherited from Phase 23 (`mt-1`, `gap-3`, `gap-1.5`, `px-3`, `h-8`, `space-y-6`); zero new tokens; silent-success helper shares the `mt-1` slot with the sentinel-error helper (mutually exclusive occupants); three host meta rows use identical `flex items-center gap-3 flex-wrap` cadence; responsive wrap strategy inherited.
- [ ] Dimension 6 Registry Safety: PASS — shadcn-official Button only; zero new shadcn installs; zero new npm deps; zero new lucide icons (`Loader2` + `RefreshCw` both already in Phase 23 code).

**Approval:** pending

---

## Researcher Notes

Three Researcher Notes for the owner's review:

1. **Silent-success helper vs banner treatment (§Color):** Phase 24 renders the warning as an inline `<p className="text-warning text-xs mt-1 italic">` — intentionally NOT as a bounded `bg-warning/10 border border-warning/25 text-warning` alert banner. Rationale: the silent-success state occupies the same physical slot as the sentinel-error helper (directly below the triggering button), which IS also a plain `<p>` (not a banner). Visual consistency between the two terminal-failure outcome helpers outweighs the alert-banner pattern from CLAUDE.md (which applies to standalone alert regions, not in-line button outcomes). Flag if owner prefers banner treatment — the change is two class additions.

2. **Italic as the typographic disambiguation signal (§Typography):** color alone (destructive-red vs warning-amber) is insufficient for color-deficient vision; red-amber is a common confusion pair. Italic on the silent-success helper gives a form-of-type redundancy. This also pattern-matches the existing `src/app/(admin)/admin/jobs/*-section.tsx` convention where `italic` reads as "transient / secondary" in empty-state copy. No precedent exists in the codebase for "italic = warning outcome" specifically — Phase 24 establishes it. If that drift is unwanted, the alternative is bold (upright weight 600) on the helper, but bold competes with the Button's `font-medium` and was rejected for the sentinel helper in Phase 23 for the same reason.

3. **G-4 coverage extension (§Grep Gates):** Phase 23's G-4 asserted TWO (button, boundary) pairings — `TriggerCompanyResearchButton` inside `section="company_research"` and `RegenerateCoverLetterButton` inside `section="cover_letter"`. Phase 24's G-4 test MUST cover THREE regenerate-button pairings: `cover_letter` (existing, rewired), `tailored_resume` (NEW), `salary_intelligence` (NEW). All three `SectionErrorBoundary` wraps ALREADY exist in `job-detail-sheet.tsx` from Plans 20-06 / 22-07 — Phase 24 adds no new boundaries. The test scaffold needs 3 mount-site assertions, not 2. Planner adapts.

**Stack assumptions verified (2026-04-23):**

- `components.json` confirms shadcn baseline unchanged: `style: "new-york"`, `baseColor: "zinc"`, `cssVariables: true`, `rsc: true`, `tsx: true`, `iconLibrary: "lucide"`, css at `src/styles/globals.css`. No preset mismatch from Phase 23 → 24.
- `--color-warning: oklch(0.85 0.17 85)` pre-exists at `src/styles/globals.css:32`. Active consumers (confirmed via grep): `src/lib/provenance.ts`, `src/lib/score-color.ts`, `salary-intelligence-section.test.tsx`, `cover-letter-quality-badge.test.tsx`, `services-grid.tsx`, `memorial/content-form.tsx`, `memorial/page.tsx`, `service-monitor.tsx`. Token is battle-tested — no introduction risk.
- `regenerate-cover-letter-button.tsx` contains the exact Phase 23 state-machine, render tree, and `aria-busy` / `text-destructive` / `mt-1` slots verbatim — Phase 24 extension is additive (one more discriminated-union variant, one more render branch).
- `tailored-resume-section.tsx:128` already uses `flex items-center gap-3 flex-wrap` for its meta row — Phase 24 mounts a 4th sibling verbatim-matching the Phase 23 Cover Letter meta row pattern.
- `salary-intelligence-section.tsx:81` already uses `flex items-center gap-3 flex-wrap` for its meta row (currently with just FreshnessBadge) — Phase 24 mounts a 2nd sibling with symmetric placement.
- `SectionErrorBoundary` wraps for all three target sections (cover_letter, tailored_resume, salary_intelligence) are in place per Plans 20-06 / 22-07 — zero new boundaries needed.
- `attach-freshness.ts` (Plan 22-02 tri-field dispatch) provides `generated_at` and `search_date` to all three artifact rows; Phase 24's button consumes these as pre-computed server primitives — hydration-safe.
- No new shadcn installs needed. No new npm deps needed. No new color tokens needed. No new typography sizes needed. No new spacing tokens needed. No new icons needed.
