---
phase: 20
slug: foundation-freshness-zod-tailored-resume
status: approved
shadcn_initialized: true
preset: none (manual init — new-york style, zinc base, lucide icons)
created: 2026-04-21
reviewed_at: 2026-04-21
---

# Phase 20 — UI Design Contract

> Visual and interaction contract for Phase 20. Covers the three UI-relevant deliverables: the Tailored Resume section in `job-detail-sheet.tsx`, the reusable Freshness Badge used on every AI artifact section, and the per-section Error Boundary fallback UI. Non-UI deliverables (`isStale` util, Zod schemas, `jobs-schemas.ts`, CSP middleware, `test:schema` script) are out of scope for this document.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | shadcn |
| Preset | manual init (no ui.shadcn.com preset); `components.json` style `new-york`, base `zinc`, CSS variables in `src/styles/globals.css` |
| Component library | radix (via shadcn/ui primitives) |
| Icon library | lucide-react (size `3.5` for inline muted meta, `4` for section headings) |
| Font | `--font-sans: system-ui, -apple-system, sans-serif` (project default; not overridden in this phase) |

**New additions for this phase (design-affecting only):**
- `streamdown@^2.5.0` runtime dep for markdown rendering inside `tailored_resume.content`
- `@source "../../node_modules/streamdown/dist/**/*.js";` directive added to `src/styles/globals.css` so Tailwind v4 picks up Streamdown's utility classes

**Re-used primitives (already installed, zero new shadcn installs for Phase 20):**
`Sheet`, `Separator`, `Badge`, `Button`, `Collapsible`/`CollapsibleTrigger`/`CollapsibleContent`, `Tooltip`/`TooltipTrigger`/`TooltipContent`/`TooltipProvider`, `ScrollArea`.

---

## Spacing Scale

Declared values (multiples of 4). Phase 20 follows the **existing `job-detail-sheet.tsx` rhythm** — no new scale invented; Tailwind's default 4-multiple scale used throughout.

| Token | Value | Usage in Phase 20 |
|-------|-------|-------------------|
| xs | 4px (`gap-1`, `px-1`) | Badge pill padding; inline icon-to-text gap inside freshness metadata |
| sm | 8px (`gap-2`, `space-y-2`) | Freshness-badge inner layout; collapsible chevron gap |
| md | 16px (`p-4`, `space-y-4`) | Markdown content container padding (matches existing cover-letter block at line 166); inner section spacing |
| lg | 24px (`space-y-6`) | Top-level section gap between Cover Letter / Tailored Resume / Company Intel / Description (inherited from parent `p-6 space-y-6` at line 96) |

**Exceptions:** none. Every new spacing in Phase 20 reuses Tailwind multiples-of-4 tokens already present in `job-detail-sheet.tsx`.

**Section rhythm (inherited, not redefined):**
- Between sections: `<Separator />` + `space-y-6` parent
- Inside a section: `space-y-3` between heading row and content body (exact match to existing Cover Letter block at lines 151-169)

---

## Typography

Carry-forward only. No new sizes, no new weights introduced in this phase. Tailored Resume section and Freshness Badge use the existing `job-detail-sheet.tsx` typography token set.

| Role | Size | Weight | Line Height | Usage in Phase 20 |
|------|------|--------|-------------|-------------------|
| Section heading | 14px (`text-sm`) | 600 (`font-semibold`) | 1.5 | "Tailored Resume" heading — exact match to existing "Cover Letter" heading at line 153 |
| Body / markdown prose | 14px (`text-sm`) | 400 | 1.5 | Streamdown-rendered resume content; muted via `text-muted-foreground` |
| Meta / freshness label | 11px (`text-[11px]`) | 500 (`font-medium`) | 1.35 | "Generated Nd ago · {model_used}" text inside the Freshness Badge; matches existing source-pill typography at line 101 |
| Tooltip body | 12px (`text-xs`) | 400 | 1.4 | Hover tooltip copy on the amber stale-dot |

**Markdown prose scale (Streamdown output):** Streamdown's default typographic scale is accepted as-is for h1–h6, strong, em, ul/ol, code, blockquote. No prose-scale override shipped in Phase 20. Future phases MAY tune this in globals.css if owner flags a specific element.

---

## Color

Phase 20 introduces **zero new color tokens**. Every surface and foreground color references existing `@theme` tokens declared in `src/styles/globals.css`. No hardcoded Tailwind color names (`text-amber-*`, `bg-green-*`, etc.) permitted — enforced by CLAUDE.md.

| Role | Token | Value (OKLCH) | Usage in Phase 20 |
|------|-------|---------------|-------------------|
| Dominant surface (60%) | `--color-background` | `oklch(0.18 0.02 260)` | Sheet background, error-fallback inline region |
| Secondary surface (30%) | `--color-card` / `bg-card/50` | `oklch(0.20 0.02 258)` | Markdown content container background (mirrors cover-letter block) |
| Accent (10%) | `--color-primary` | `oklch(0.64 0.14 255)` | Interactive chevron on Collapsible trigger when expanded; NOT used for freshness staleness |
| Foreground | `--color-foreground` | `oklch(0.94 0.02 80)` | Section-heading text, markdown body text at full opacity |
| Muted foreground | `--color-muted-foreground` | `oklch(0.62 0.03 250)` | Freshness metadata line ("Generated 3d ago · gpt-4o-mini"); error-fallback copy |
| Warning (stale dot) | `--color-warning` | `oklch(0.85 0.17 85)` | The 6px amber dot next to `generated_at` when `isStale()` returns true. ONLY the dot — not the text, not the background |
| Destructive | `--color-destructive` | `oklch(0.55 0.20 25)` | NOT used in Phase 20. Error-boundary fallback is informational, not destructive — uses muted tokens instead |
| Border | `--color-border` | `oklch(0.28 0.02 256)` | Markdown content container border (matches cover-letter pattern) |

**Accent reserved for:** the Collapsible trigger chevron on hover/active state. Freshness staleness uses the `warning` token — not `accent`, not `destructive`. This keeps stale strictly informational (per D-03 in CONTEXT.md) and reserves `destructive` for truly actionable failures in later phases.

**Explicit color prohibitions for this phase:**
- No `text-amber-*`, `bg-amber-*`, `text-yellow-*`, `bg-yellow-*`, `text-red-*`, `text-green-*` anywhere in the new components
- No inline `style={{ color: '#...' }}` — all color via Tailwind tokens that reference `@theme` vars
- Error fallback MUST NOT use `--color-destructive` (that's reserved for Phase 23 regenerate-failure states)

---

## Copywriting Contract

### Tailored Resume Section

| Element | Copy | Notes |
|---------|------|-------|
| Section heading | `Tailored Resume` | Two words, matches "Cover Letter" / "Company Intel" cadence |
| Section icon | `FileText` from lucide-react (`size-4`) | Same icon used for cover letter; consistent "document" semantic |
| Empty state (never generated) | DEFERRED to Phase 21 (AI-RENDER-04) | Phase 20 hides the section entirely when `detail.tailored_resume === null`; explanatory empty-state messaging ships in Phase 21 |
| Collapsible trigger (expanded) | `Tailored Resume` + chevron-down icon rotated | Default open on first render (resume is primary content for this phase) |
| Collapsible trigger (collapsed) | `Tailored Resume` + chevron-down icon | Truncation: N/A — heading is short |

### Freshness Badge (used on all AI artifact sections)

| Element | Copy | Notes |
|---------|------|-------|
| Fresh state — meta line | `Generated {relativeTime} · {model_used}` | Example: `Generated 3h ago · gpt-4o-mini`. Separator is middle-dot (`·`), not hyphen, not pipe |
| Fresh state — no model recorded | `Generated {relativeTime}` | When `model_used` column is null, drop the separator and model name entirely; do NOT render `· unknown` |
| Stale state — meta line | `Generated {relativeTime} · {model_used}` + amber dot | Copy is identical to fresh state; the amber dot carries the stale signal |
| Tooltip body (stale dot hover) | `Generated {N} days ago; may need regeneration` | Exact wording from CONTEXT.md D-02. `N` is the integer days-ago value from `isStale()` |
| Tooltip body (fresh dot hover) | N/A | No dot renders when fresh; no tooltip to author |
| Relative-time formatter | Use `date-fns` `formatDistanceToNowStrict(date, { addSuffix: true })` | Renders `3 hours ago`, `2 days ago`, etc. Computed server-side in `fetchJobDetail` to avoid hydration mismatch — per ARCHITECTURE.md §Pattern 2. `date-fns` is already a project dep (verified in STACK.md line 9) |
| Missing timestamp | Hide the badge entirely | Do not render `Generated unknown · ...` |

### Error Boundary Fallback

| Element | Copy | Notes |
|---------|------|-------|
| Fallback body | `Couldn't render this section — the data may have changed shape.` | Exact wording from CONTEXT.md D-10. No trailing exclamation, no "Sorry", no action link. One sentence, muted tone |
| Fallback visual | Inline `<p>` inside the section's normal spacing, `text-sm text-muted-foreground italic` | No icon, no border, no background. The section's heading (e.g., "Tailored Resume") still renders — only the body is replaced |
| Server-side log | `console.error("[ai-section] failed to render", { section, jobId, error })` | Server-side only (per D-10). Never rendered to client. Never leaks `error.stack` or `error.message` to the DOM |

**Destructive actions in this phase:** none. The Tailored Resume section is read-only. No delete, no regenerate, no confirm dialogs. Phase 23/24 add destructive paths.

**Primary CTA for this phase:** none in the new components. The sheet's existing "Apply Now" button (line 142) is untouched.

---

## Component Contracts

Exact interaction + visual contracts for the three Phase 20 UI components.

### 1. `<TailoredResumeSection />`

**Location:** new export in `src/app/(admin)/admin/jobs/job-detail-sheet.tsx` (or extracted into `src/app/(admin)/admin/jobs/tailored-resume-section.tsx` if the sheet grows past ~300 lines — ARCHITECTURE.md line 82 gives explicit permission).

**Placement in sheet:** between the existing Cover Letter block (line 150-170) and Company Intel block (line 172-231). Preceded by `<Separator />`. Inside the same `space-y-6` parent container as the other sections.

**Render tree:**
```
<div className="space-y-3">
  <div className="flex items-center justify-between">
    <h3 className="text-sm font-semibold flex items-center gap-1.5">
      <FileText className="size-4" />
      Tailored Resume
    </h3>
    <FreshnessBadge
      generatedAt={detail.tailored_resume.generated_at}
      modelUsed={detail.tailored_resume.model_used}
      thresholdDays={14}
    />
  </div>
  <div className="text-sm text-muted-foreground bg-card/50 rounded-lg p-4 border border-border max-h-96 overflow-y-auto">
    <Streamdown>{detail.tailored_resume.content}</Streamdown>
  </div>
</div>
```

**Behavior:**
- Renders ONLY when `detail.tailored_resume !== null` (Phase 20 hides the section entirely otherwise; Phase 21 adds empty state)
- Content container visual: `bg-card/50 rounded-lg p-4 border border-border` — exact reuse of cover-letter block styling at line 166
- Height cap: `max-h-96 overflow-y-auto` (384px). Slightly taller than cover-letter's `max-h-64` (256px) because resumes are longer; still keeps the sheet scannable
- Markdown renders via `<Streamdown>` — not `<ReactMarkdown>`, not `whitespace-pre-wrap`. Streamdown's default sanitizer is the only pipeline (no `rehype-raw`, no layered `rehype-sanitize` — per D-12)
- Collapsible wrapper: **not required in Phase 20**. The cover letter doesn't use one either. If total sheet vertical length becomes unscannable after later phases add sections, Phase 21+ may retrofit Collapsible — out of scope here

**Interaction states:**

| State | Trigger | Visual |
|-------|---------|--------|
| Default | Resume row exists | Section renders with markdown + freshness badge |
| Hidden | `detail.tailored_resume === null` | Entire section (heading + body) absent. No empty-state copy in Phase 20 |
| Stale | `isStale(generated_at, 14) === true` | Amber dot appears in FreshnessBadge; markdown body unchanged |
| Error | Streamdown throws or Zod safeParse returned null | ErrorBoundaryFallback replaces the content body; heading still visible |

**Accessibility:**
- Heading uses semantic `<h3>` (matches existing sections)
- Markdown container has `role="article"` implicitly via Streamdown's output
- Content container has `overflow-y-auto` — ensure Tab focus can reach scrollable region
- Amber dot must have a visible tooltip trigger (Tooltip component handles focus-visible automatically); colorblind users rely on the tooltip text, not the hue, for the stale signal

---

### 2. `<FreshnessBadge />`

**Location:** new reusable client component at `src/app/(admin)/admin/jobs/freshness-badge.tsx`. Used by Tailored Resume (Phase 20), Cover Letter (Phase 20 retrofit), Company Intel (Phase 20 retrofit), and Salary Intel (Phase 22).

**Props:**
```ts
interface FreshnessBadgeProps {
  generatedAt: string | null;      // ISO timestamp from DB
  modelUsed: string | null;        // e.g. "gpt-4o-mini"; null renders without separator
  thresholdDays: 14 | 30 | 60;     // per-artifact from CONTEXT.md D-01
  className?: string;              // escape hatch; callers should NOT need it
}
```

**Render tree (fresh):**
```
<span className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
  <span>Generated {relativeTime}</span>
  {modelUsed && <><span aria-hidden="true">·</span><span>{modelUsed}</span></>}
</span>
```

**Render tree (stale):**
```
<TooltipProvider delayDuration={200}>
  <Tooltip>
    <TooltipTrigger asChild>
      <span className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground cursor-default">
        <span
          aria-label="Stale artifact"
          className="size-1.5 rounded-full bg-warning"
        />
        <span>Generated {relativeTime}</span>
        {modelUsed && <><span aria-hidden="true">·</span><span>{modelUsed}</span></>}
      </span>
    </TooltipTrigger>
    <TooltipContent side="top" className="text-xs max-w-[220px]">
      Generated {N} days ago; may need regeneration
    </TooltipContent>
  </Tooltip>
</TooltipProvider>
```

**Visual specs:**

| Element | Size | Color |
|---------|------|-------|
| Amber dot | `size-1.5` (6px × 6px) | `bg-warning` → `--color-warning` oklch(0.85 0.17 85) |
| Dot shape | `rounded-full` | — |
| Dot-to-text gap | `gap-1` (4px) | — |
| Text color | — | `text-muted-foreground` → `--color-muted-foreground` |
| Font | `text-[11px] font-medium` | — |
| Separator glyph | `·` (U+00B7 middle dot), not `-`, not `|` | `aria-hidden="true"` |
| Tooltip max width | `max-w-[220px]` | — |
| Tooltip delay | `delayDuration={200}` ms | — |

**Behavior:**
- When `generatedAt === null` → badge renders nothing (empty `<></>`); caller is responsible for falling back to empty-state copy (Phase 21 concern)
- When `modelUsed === null` → render "Generated 3d ago" without the separator or model name; do NOT render "Generated 3d ago · unknown"
- Stale computation: done server-side in `fetchJobDetail` via `isStale(generatedAt, thresholdDays)` and attached to the artifact as a `freshness` field; this component receives the pre-computed boolean via its inputs — no `new Date()` on the client (hydration-safe per ARCHITECTURE.md §Pattern 2)
- Exact text: `Generated {relativeTime}` where `relativeTime` comes from `date-fns`' `formatDistanceToNowStrict(generatedAt, { addSuffix: true })` — server-computed in the same path, passed through as a prop string

**Interaction states:**

| State | Dot visible? | Tooltip? | Semantic |
|-------|--------------|----------|----------|
| Fresh | No | No | Artifact is within threshold; no attention needed |
| Stale | Yes, amber | On hover / focus | Artifact is beyond threshold; informational only — does NOT modify regenerate button styling in Phase 23 (D-03) |
| No timestamp | N/A | N/A | Badge renders nothing; caller handles fallback |

**Accessibility:**
- `aria-label="Stale artifact"` on the amber-dot `<span>` (screen readers announce "Stale artifact Generated 3 days ago · gpt-4o-mini")
- Tooltip trigger is keyboard-reachable via `Tooltip` primitive (shadcn's wrapper of Radix) — no manual focus plumbing needed
- Colorblind-safe: the dot's meaning is redundantly conveyed via the tooltip text, not hue alone
- `cursor-default` on trigger to signal "info, not clickable"

---

### 3. `<SectionErrorBoundary />` + fallback UI

**Location:** new class component at `src/app/(admin)/admin/jobs/section-error-boundary.tsx`. Used to wrap each AI artifact section (Cover Letter, Tailored Resume, Company Intel in Phase 20; Salary Intel added in Phase 22).

**Discretion decision (per CONTEXT.md §Claude's Discretion):** hand-rolled React class component; no `react-error-boundary` dependency. Rationale: 4 boundaries total across the codebase; Next 16 App Router's error.tsx doesn't fit here (we need component-level granularity, not route-level). Class component is ~25 lines.

**Props:**
```ts
interface SectionErrorBoundaryProps {
  section: "cover_letter" | "tailored_resume" | "company_research" | "salary_intelligence";
  jobId: number;
  children: React.ReactNode;
}
```

**Fallback render tree:**
```
<div className="space-y-3">
  <h3 className="text-sm font-semibold flex items-center gap-1.5 text-muted-foreground">
    <FileText className="size-4" />
    {SECTION_LABELS[section]}
  </h3>
  <p className="text-sm text-muted-foreground italic">
    Couldn&apos;t render this section — the data may have changed shape.
  </p>
</div>
```

Where `SECTION_LABELS` is a constant map:
```ts
const SECTION_LABELS = {
  cover_letter: "Cover Letter",
  tailored_resume: "Tailored Resume",
  company_research: "Company Intel",
  salary_intelligence: "Salary Intelligence",
};
```

Icon MAY be simplified to a single `FileText` for all sections (the icon is decorative on the failed state); or match the section's original icon — implementer's choice, both acceptable.

**Visual specs:**

| Element | Style | Color |
|---------|-------|-------|
| Heading | `text-sm font-semibold` | `text-muted-foreground` (dimmer than normal heading to signal degraded state) |
| Body | `text-sm italic` | `text-muted-foreground` |
| Container | `space-y-3` | No background, no border, no icon-box |
| Layout | Matches the parent section's layout | No dialog, no modal, no toast |

**Explicit prohibitions:**
- NO `text-destructive`, NO `bg-destructive/10`, NO `border-destructive` — errors here are data-shape issues, not destructive actions; reserving destructive styling for Phase 23 regenerate failures
- NO stack trace, NO `error.message` rendered to the DOM — per D-10 and Pitfall 3 (sentinel-error policy)
- NO "Try again" or "Retry" button in Phase 20 — retry only makes sense after regenerate lands in Phase 23; Phase 20's fallback is terminal for the render

**Behavior:**
- On render error from any child: log `console.error("[ai-section]", { section, jobId, error: error.message, stack: error.stack })` server-side
- Replace children with the fallback UI above
- Do NOT propagate the error up to the sheet's top-level `<Sheet>` — other sections must continue rendering
- No recovery trigger inside the fallback (per above); opening the sheet again will re-mount and retry

**Accessibility:**
- Uses the same semantic `<h3>` heading as the normal render → screen-reader section navigation still works
- `italic` body is announced normally by screen readers; italic is a visual-only cue for degraded state

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | Tooltip, Badge, Button, Collapsible, Separator, ScrollArea, Sheet (all ALREADY installed at `src/components/ui/`) | not required — official registry, all 7 primitives predate this phase |
| `streamdown` (npm, Vercel-maintained) | `Streamdown` default export | npm-only — no shadcn registry path. Safety posture verified by: (a) publisher is Vercel (HIGH trust, same author as Next.js); (b) default sanitizer pipeline enabled with NO `rehype-raw`; (c) XSS test fixture ships in the same PR as Vitest test asserting `<script>`, `<iframe src="javascript:…">`, and `<img src=x onerror=…>` render as literal text (D-13). **No third-party shadcn registry is used in Phase 20** |

**Third-party shadcn registries:** none. Phase 20 does NOT install any block from a third-party registry. The registry vetting gate (`npx shadcn view {block} --registry {url}`) is not applicable and is skipped per `<shadcn_gate>` logic.

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS — exact strings declared for every render branch (fresh, stale, no-model, error-fallback); tooltip wording matches CONTEXT.md D-02 verbatim
- [ ] Dimension 2 Visuals: PASS — every new section reuses the existing `job-detail-sheet.tsx` block shape (same icon size, heading cadence, separator rhythm, content-container styling)
- [ ] Dimension 3 Color: PASS — zero new color tokens; `--color-warning` used only for the stale dot; `--color-destructive` explicitly prohibited in the error fallback; no hardcoded Tailwind color names permitted (enforced by CLAUDE.md)
- [ ] Dimension 4 Typography: PASS — zero new sizes/weights; only `text-sm`, `text-[11px]`, `text-xs` + `font-semibold` / `font-medium` — all already present in the file
- [ ] Dimension 5 Spacing: PASS — all spacing via Tailwind multiples-of-4 (`gap-1`, `gap-1.5`, `gap-2`, `space-y-3`, `space-y-6`, `p-4`); `size-1.5` (6px) for the amber dot is a 1.5×4 multiple
- [ ] Dimension 6 Registry Safety: PASS — shadcn-official primitives only; `streamdown` is an npm dep with Vercel-authored default sanitizer pipeline and an XSS-payload Vitest test as the safety gate

**Approval:** pending
