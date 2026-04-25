---
phase: 22
slug: salary-intelligence-defensive-render
status: approved
shadcn_initialized: true
preset: none (manual init — new-york style, zinc base, lucide icons; inherited from Phase 20)
created: 2026-04-22
reviewed_at: 2026-04-22
---

# Phase 22 — UI Design Contract

> Visual and interaction contract for Phase 22: Salary Intelligence (Defensive Render). Ships one new section (`SalaryIntelligenceSection`) plus a reusable `<ProvenanceTag>` component used on every dollar figure in `job-detail-sheet.tsx`. Zero new color tokens, zero new spacing tokens, zero new typography sizes, zero new shadcn installs. Composes against Phase 20's section-shell cadence, Phase 21's meta-row rhythm, and the existing `@theme` palette in `src/styles/globals.css`.

**Composes against:**
- Phase 20 UI-SPEC — section shells, color token set, Streamdown XSS posture, SectionErrorBoundary wrap.
- Phase 21 UI-SPEC — meta-row `flex items-center gap-3` rhythm, Plan 21-05 quality-badge sizing/placement (the closest provenance-tag analog), Plan 21-06 empty-state `EMPTY_STATE_COPY` const-map pattern.
- CONTEXT.md 22 §Decisions — 12 locked decisions D-01..D-12; UI-relevant set is D-05..D-12.
- RESEARCH.md 22 §§3–5 — extract `<ProvenanceTag>` + `provenanceColor` / `provenanceLabel` pure helpers (Plan 21-05 precedent); FreshnessBadge uses `search_date` semantics; `?? "USD"` lives at `jobs-db.ts:349`.

**Integration surface:**
- `src/app/(admin)/admin/jobs/job-detail-sheet.tsx` — mount `<SalaryIntelligenceSection>` between Tailored Resume (ends line 261) and Company Intel (starts line 263); wrap in a new `<SectionErrorBoundary section="salary_intelligence" jobId={detail.id}>` preceded by `<Separator />`. Also add a `<ProvenanceTag source="scraped" />` inline after each `formatSalary(...)` rendered dollar figure at lines 161 (header) and 325–328 (Company Intel salary range, source `"company_research"`).
- `src/app/(admin)/admin/jobs/salary-intelligence-section.tsx` — NEW; mirror the `TailoredResumeSection` shape (heading + meta row + Streamdown body); branch on missing vs empty vs populated.
- `src/app/(admin)/admin/jobs/provenance-tag.tsx` — NEW; reusable Badge-outline wrapper with tooltip.
- `src/lib/provenance.ts` — NEW; `provenanceColor(source)` and `provenanceLabel(source)` pure helpers.
- `src/lib/empty-state-copy.ts` — extend with `salary_intelligence: { missing, empty }` entry.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | shadcn (manual init, inherited from Phase 20) |
| Preset | none — `components.json` style `new-york`, base `zinc`, `rsc: true`, `tsx: true`, `iconLibrary: "lucide"`, css at `src/styles/globals.css` |
| Component library | radix (via shadcn/ui primitives) |
| Icon library | lucide-react — icons used this phase: `DollarSign` (already imported at `job-detail-sheet.tsx:20`), `Info` or `HelpCircle` (optional — see §Interaction); no new icon imports required |
| Font | `--font-sans: system-ui, -apple-system, sans-serif` (project default; not overridden) |

**Dependencies locked by prior phases (Phase 22 re-uses, does not touch):**
- `streamdown@^2.5.0` — renders `llm_analysis` prose via `<Streamdown skipHtml linkSafety={{ enabled: false }}>` (identical config to Phase 20 `TailoredResumeSection`).
- `@/components/ui/badge` — `variant="outline"` is the provenance-tag base (same variant used by Plan 21-05 quality badge and Phase 20 tech-stack chips).
- `@/components/ui/tooltip` — root `<TooltipProvider delayDuration={300}>` already mounted in `providers.tsx:9`; tag tooltips inherit the delay.
- `SectionErrorBoundary` from `./section-error-boundary` (Plan 20-06) — wraps the new section for Zod/Streamdown/render-exception recovery.
- `FreshnessBadge` from `./freshness-badge` — already accepts `generatedDate` / `modelUsed` / `isStale` / `ageDays` primitives; salary section passes `modelUsed={null}` (no model column on `salary_intelligence` today) matching the Company Intel pattern at `job-detail-sheet.tsx:296`.

**Zero new shadcn installs.** Zero new npm deps.

---

## Spacing Scale

Phase 22 introduces **no new spacing tokens.** All inherited from Phase 20/21 `job-detail-sheet.tsx` rhythm.

| Token | Value | Usage in Phase 22 |
|-------|-------|-------------------|
| xs | 4px (`gap-1`, `gap-1.5`) | Section-heading icon-to-text gap (`<DollarSign className="size-4" />` + label); gap inside the provenance tag if it pairs a label with an optional leading marker |
| sm | 8px (`gap-2`) | Headline-row figure-to-figure horizontal gap — tight cluster of 3–5 dollar figures within the row; keeps the row within the 512px sheet without wrapping for 5 short `$120K`-style figures |
| md | 12px (`gap-3`) | Meta-row `flex items-center gap-3 flex-wrap` — FreshnessBadge + (no other meta chips this phase) — matches Phase 21 Cover Letter / Tailored Resume meta-row cadence |
| lg | 16px (`space-y-4`) | Gap between the headline row and the Streamdown prose body inside the populated branch |
| lg | 24px (`space-y-6`) | Top-level section gap — inherited from parent `p-6 space-y-6` wrapper at `job-detail-sheet.tsx:96` (unchanged) |

**Inline figure ↔ tag gap (D-11: "thin space"):**

Resolve the "thin space" to `ml-1` (4px) between the dollar figure and the trailing `<ProvenanceTag>`. This matches the Phase 21 meta-row's `gap-1.5` icon-to-text rhythm and keeps the pairing visually atomic (figure + provenance read as one informational unit).

- In the **header flex row** at `job-detail-sheet.tsx:159-163`, the existing `<span className="flex items-center gap-1">` already provides 4px between `<DollarSign>` and `formatSalary(...)`. The `<ProvenanceTag>` becomes a third child of that flex row — the inherited `gap-1` covers the figure↔tag spacing. No explicit `ml-1` needed; adding the tag to the existing gap-1 row gives the desired "thin space" for free.
- In the **Company Intel salary-range block** at `job-detail-sheet.tsx:321-330`, the pattern is identical — `<div className="flex items-center gap-1">` wraps icon + `formatSalary(...)`; the `<ProvenanceTag>` slots in as the third child of the same gap-1 row.
- In the **Phase 22 headline row** (figures from `report_json`), each `<ProvenanceTag>` sits inside a per-figure `<span className="inline-flex items-center gap-1">` so the figure + tag pairing is a single flex item; the headline row's parent uses `gap-2` between pairs.

**Tag internal padding:** inherit the shadcn `Badge` default (`px-2.5 py-0.5`). No deviation.

**Icon sizes:** `size-4` for the section-heading `<DollarSign>` (matches Phase 20 `FileText` / `Building2` at `job-detail-sheet.tsx:180, 270`); `size-3.5` for the inline header `<DollarSign>` (matches existing line 160); no new icon sizes.

**Exceptions:** none.

---

## Typography

Carry-forward only. **No new sizes, no new weights introduced.** All elements use existing `job-detail-sheet.tsx` typography tokens.

| Role | Size | Weight | Line Height | Usage in Phase 22 |
|------|------|--------|-------------|-------------------|
| Section heading | 14px (`text-sm`) | 600 (`font-semibold`) | 1.5 | `"Salary Intelligence"` heading in `SalaryIntelligenceSection`; empty and populated branches both render it |
| Empty-state body | 14px (`text-sm`) | 400 | 1.5 | Italic missing/empty copy via `text-sm text-muted-foreground italic` — identical cadence to Plan 21-06 |
| Headline-row figure | 14px (`text-sm`) | 600 (`font-semibold`) | 1.5 | The 3–5 dollar figures themselves. Also apply `font-variant-numeric: tabular-nums` (Tailwind `tabular-nums` class) so `$120K` / `$140K` / `$180K` align vertically — important when 5 figures cluster in one row |
| Headline-row label | 11px (`text-[11px]`) | 500 (`font-medium`) | 1.35 | Optional per-figure label preceding the figure (e.g., `"Median"`). Matches FreshnessBadge text size so labels and meta chips share the same visual weight. **Inherits `text-muted-foreground`** — the figure is the salient element, the label is supportive |
| Meta / freshness label | 11px (`text-[11px]`) | 500 (`font-medium`) | 1.35 | FreshnessBadge text (unchanged — inherited token set from Phase 21) |
| Provenance tag | 10px (`text-[10px]`) | 500 (`font-medium`) | 1.4 | Tag visible text (D-10 explicit: one size smaller than Plan 21-05 quality badge's 11px). Weight 500 matches the Badge default `font-medium` (see `badge.tsx:23`); tracking inherits `tracking-wide` from the Badge base class — no override |
| Streamdown prose | Streamdown defaults | Streamdown defaults | Streamdown defaults | `llm_analysis` body — identical treatment to Phase 20 `TailoredResumeSection` Streamdown container (`text-sm text-muted-foreground bg-card/50 rounded-lg p-4 border border-border`) |
| Tooltip body | 12px (`text-xs`) | 400 | 1.4 | Tag tooltip content — matches Phase 21 Copy-button tooltip sizing |

**Dollar-figure format (headline row):**

- Reuse the existing `formatSalary(min, max)` helper at `job-detail-sheet.tsx:47-53` — it emits `$120K - $180K` / `$120K+` / `up to $180K` strings. When the headline row renders from `report_json` figures, each figure is a single value (min OR median OR max OR p25 OR p50 OR p75), so wrap raw numbers through a sibling `formatSingleSalary(n: number): string` that emits `$120K` (thousands rounded, K-suffix). Planner extracts this helper to `src/lib/format-salary.ts` alongside the existing range formatter. **The formatter MUST respect `salary_currency`** — if `report_json` emits a currency other than `USD`, the figure renders with the appropriate symbol; if the currency is absent, the figure hides entirely (D-12 posture).
- `Math.round(n / 1000)` rounding matches the existing range formatter — consistency across the whole sheet, no decimals.

**Headline-row label wording (D-07, verbatim):**

Two shapes depending on what `report_json` exposes:

| Shape | Keys detected | Labels (verbatim) |
|-------|---------------|-------------------|
| `MIN_MEDIAN_MAX` | `min`, `median`, `max` (any case-insensitive match) | `"Min"` · `"Median"` · `"Max"` |
| `PERCENTILES` | `p25`, `p50`, `p75` (or `"25th"`/`"50th"`/`"75th"`) | `"25th"` · `"50th"` · `"75th"` |

Labels use Title Case (`"Min"`, not `"MIN"` or `"min"`). Separator between label and figure is a single space (no colon, no em-dash). Example rendered cluster: `Min $120K · Median $150K · Max $180K` — middle-dot `·` with `aria-hidden="true"` between figure-pairs, matching the FreshnessBadge middle-dot convention.

If `report_json` exposes neither shape's keys: **render the prose alone** (graceful degrade per D-06). Do NOT guess or synthesize a headline row from unrecognized JSON.

---

## Color

Phase 22 introduces **zero new color tokens.** All surfaces reference existing `@theme` tokens declared in `src/styles/globals.css`. No hardcoded Tailwind color names permitted — CLAUDE.md rule.

### Token usage table

| Role | Token | Value (OKLCH, from globals.css) | Usage in Phase 22 |
|------|-------|---------------------------------|-------------------|
| Dominant surface (60%) | `--color-background` | `oklch(0.18 0.02 260)` | Sheet background — unchanged |
| Secondary surface (30%) | `--color-card` / `bg-card/50` | `oklch(0.20 0.02 258)` | Streamdown prose container — identical to Phase 20 |
| Accent (10%) | `--color-accent` | `oklch(0.78 0.12 75)` | **Not used** in Phase 22. No ghost-button interactions in this phase (the section is read-only: no Copy, no Download, no Regenerate) |
| Foreground | `--color-foreground` | `oklch(0.94 0.02 80)` | Section heading text; headline-row dollar figures |
| Muted foreground | `--color-muted-foreground` | `oklch(0.62 0.03 250)` | Empty-state italic body; headline-row labels (`"Min"` / `"Median"` / etc.); middle-dot separators; **provenance tag text for `scraped` source** |
| Success | `--color-success` | `oklch(0.76 0.18 160)` | **Provenance tag text for `company_research` source** — higher-trust tier (LLM researched from company sources) |
| Warning | `--color-warning` | `oklch(0.85 0.17 85)` | **Provenance tag text for `llm` source** — LLM estimate, not verified |
| Border | `--color-border` | `oklch(0.28 0.02 256)` | Streamdown container border (inherited); Badge outline border (inherited via `variant="outline"`) |
| Ring | `--color-ring` | `oklch(0.64 0.14 255)` | `focus-visible:ring-[3px] focus-visible:ring-ring/50` on the tag's Tooltip trigger (Radix wires this automatically when the Badge is wrapped in `<TooltipTrigger asChild>`) |
| Destructive | `--color-destructive` | `oklch(0.55 0.20 25)` | **Not used** in Phase 22. No actionable failures surface in this read-only phase |

### Provenance → color mapping (D-10 locked principle: "color ≈ confidence")

| `source` value | Tag color class | Rationale |
|----------------|-----------------|-----------|
| `"scraped"` | `text-muted-foreground` | Lowest-trust tier — raw feed data; the owner should not mistake these for analyzed figures |
| `"llm"` (LLM estimate) | `text-warning` | Estimate, not verified; amber signals "informational, needs scrutiny" — same semantic class as FreshnessBadge stale dot |
| `"company_research"` | `text-success` | Higher-trust — LLM ran an explicit research step against public signals; green signals "vetted, higher confidence" |
| `"original_posting"` | `text-muted-foreground` | **Reserved class** — not actively rendered in Phase 22 (D-09 "not implemented this phase unless trivial"); if a figure is later tagged as `original_posting`, fall back to the same neutral tone as `scraped` to avoid promoting unverified quoted figures above LLM-researched ones. Planner/executor implementing this later can promote to `text-foreground` if the owner wants a distinct tier |

The mapping is implemented as a pure function `provenanceColor(source)` in `src/lib/provenance.ts` following the Plan 21-05 `scoreColor()` precedent:

```ts
export type ProvenanceSource =
  | "scraped"
  | "llm"
  | "company_research"
  | "original_posting";

export function provenanceColor(source: ProvenanceSource): string {
  switch (source) {
    case "company_research":
      return "text-success";
    case "llm":
      return "text-warning";
    case "scraped":
    case "original_posting":
      return "text-muted-foreground";
  }
}

export function provenanceLabel(source: ProvenanceSource): string {
  switch (source) {
    case "scraped":
      return "scraped";
    case "llm":
      return "LLM estimate";
    case "company_research":
      return "company research";
    case "original_posting":
      return "posted";
  }
}
```

Pure functions — no state, no `new Date()`, no `window.*` — safe to call from Server Components and Client Components alike.

### Accent reserved for

Not applicable — Phase 22 introduces zero interactive controls that use the accent color. The only interactive surfaces this phase adds are Tooltip triggers (wired by Radix through the Badge), which use the `ring` token on focus-visible, not `accent`.

### Explicit color prohibitions for this phase

- **No hardcoded Tailwind color classes in `salary-intelligence-section.tsx`, `provenance-tag.tsx`, `provenance.ts`, or any Phase 22 diff against `job-detail-sheet.tsx`.** Forbidden specifically: `text-red-*`, `text-amber-*`, `text-yellow-*`, `text-green-*`, `text-orange-*`, `bg-red-*`, `bg-amber-*`, `bg-green-*`, `bg-blue-*`, `text-gray-*`, `text-zinc-*`, `text-slate-*`. CLAUDE.md rule; not ESLint-enforced — code review + grep gate (see §Grep-verifiable contracts).
- **No inline `style={{ color: '...' }}`** — all color via Tailwind tokens referencing `@theme` vars.
- **No introduction of a new `--color-*` token** — the three tiers required (muted / warning / success) already exist in `globals.css:22–32`. If a future provenance tier needs a fourth color, planner raises it before adding the token.
- **`opacity-*` modifiers on a provenance tag are acceptable** (e.g., if a tag needs to dim in a disabled context — not in Phase 22 scope, but flagged so a future extension does not violate the rule accidentally).

---

## Copywriting Contract

### Section label

| Element | Copy | Notes |
|---------|------|-------|
| `<SalaryIntelligenceSection>` heading | `Salary Intelligence` | Verbatim. Title Case. No trailing punctuation. Matches the `"Tailored Resume"` / `"Cover Letter"` / `"Company Intel"` / `"Description"` cadence of the existing sections. Prefixed by `<DollarSign className="size-4" />` icon |

### Empty-state bodies (D-08, extends `EMPTY_STATE_COPY`)

Reuse Plan 21-06 pattern. Add one new key to `src/lib/empty-state-copy.ts`:

```ts
salary_intelligence: {
  missing: "No salary intelligence yet.",
  empty: "Salary intelligence was generated but is empty.",
},
```

| Condition | Copy (verbatim) |
|-----------|-----------------|
| `detail.salary_intelligence === null` (row absent — today's default state) | `No salary intelligence yet.` |
| `detail.salary_intelligence !== null && (!detail.salary_intelligence.llm_analysis?.trim() && !hasRecognizedHeadlineFigures(detail.salary_intelligence.report_json))` | `Salary intelligence was generated but is empty.` |

**`hasRecognizedHeadlineFigures` predicate:** pure function in `src/lib/is-salary-intelligence-empty.ts` (or colocated with the section — Claude's discretion; planner may pick). Returns `true` iff the `report_json` parses into at least one of the `MIN_MEDIAN_MAX` or `PERCENTILES` shapes AND at least one figure is a finite number. Conservative — matches the Plan 21-06 `isCompanyResearchEmpty` cadence: treat a row as empty only when EVERY presentable surface (prose + headline figures) is empty/unrecognized.

**Tone contract (CONTEXT.md D-12 inherited from Phase 21 — MUST explicitly hold for Phase 22):**

> Direct, state-only. No CTAs. No imperative verbs. No "Generate now", "Run salary scan", "Click to regenerate", "Please retry". One period per line. No exclamation points.

The owner knows the salary_intelligence pipeline is external (n8n workflow running on the homelab cluster, currently gated by task #11 — `$N` parameter-collision bug). The UI states the fact; it does not prompt action the owner cannot take from this surface. **This is not optional — the anti-CTA rule ships as a grep gate (see §Grep-verifiable contracts).**

### Provenance tag visible text (verbatim from `provenanceLabel()`)

| `source` | Badge visible text |
|----------|--------------------|
| `"scraped"` | `scraped` |
| `"llm"` | `LLM estimate` |
| `"company_research"` | `company research` |
| `"original_posting"` | `posted` |

All lower-case except the `L` in `LLM` (acronym). No bracketing characters — the Badge outline provides the visual boundary.

**Why `"posted"` and not `"original posting"`:** the other three labels fit comfortably on one line inside a `text-[10px]` badge adjacent to a dollar figure. `"original posting"` (15 chars) is the longest and would force wrapping inside the Badge — which already has `inline-flex items-center` and no wrap guard. `"posted"` (6 chars) carries the same semantic meaning ("from the job posting"). If the owner prefers `"original posting"` verbatim, flag for planner — the trade-off is Badge wrap risk at the 512px sheet width.

### Provenance tag tooltip content (verbatim)

Every provenance tag is wrapped in a `<Tooltip>`. Tooltip content is the authoritative explanation:

| `source` | Tooltip content |
|----------|-----------------|
| `"scraped"` | `Source: scraped from the job feed (raw value from the source posting).` |
| `"llm"` | `Source: LLM estimate generated from external market data. Not a verified figure.` |
| `"company_research"` | `Source: estimated during company research against public signals.` |
| `"original_posting"` | `Source: directly quoted from the job posting description.` |

Rules:
- One sentence per tooltip. Ends with a period.
- No URLs, no em-dashes, no parentheticals referencing which feed specifically (e.g., don't hard-code `"jobicy/remoteok/himalayas"` — the `jobs.source` column already exposes that separately and may change; the tooltip stays source-agnostic at this layer).
- `max-w-[220px]` on `<TooltipContent>` — matches Phase 21 Cover Letter Quality-badge tooltip width so tooltips visually cluster in the same density class.

### Headline-row label wording

See §Typography table. Locked verbatim: `"Min"`, `"Median"`, `"Max"`, `"25th"`, `"50th"`, `"75th"`.

### FreshnessBadge revision

No copy changes. Inherits Phase 21 Plan 21-01 revision verbatim:
- Fresh state: `Generated {generatedDate}` where `{generatedDate}` is the `search_date`-derived formatted date (e.g. `4/21/26`), no model segment because `salary_intelligence` has no `model_used` column — `modelUsed` prop passes `null`, identical to Company Intel at `job-detail-sheet.tsx:296`.
- Stale state: amber dot + tooltip `Generated {ageDays} days ago; may need regeneration` — unchanged.
- Staleness threshold: Claude's discretion per CONTEXT.md §Claude's Discretion. **Researcher recommendation:** `30d` — salary market data stales faster than company research (60d) but slower than cover letter (14d). Planner verifies at Task 0; threshold choice is a one-line constant in `attach-freshness.ts`.

### Destructive actions / primary CTA / error states

| Category | Copy | Notes |
|----------|------|-------|
| Primary CTA | *(none)* | Phase 22 adds no buttons, no links, no actions. The section is read-only — data arrives via the external n8n pipeline; there is no UI trigger |
| Destructive actions | *(none)* | No delete, no regenerate, no dismiss. Salary regenerate is explicitly deferred to Phase 24 AI-ACTION-06 per CONTEXT.md §Deferred |
| Render-exception fallback | `Couldn't render this section — the data may have changed shape.` | Provided by existing `SectionErrorBoundary` (Plan 20-06). Phase 22 re-uses the boundary verbatim; no copy tweaks. Triggers on Zod parse failures cascading past `parseOrLog` or on Streamdown render throws |

---

## Component Contracts

Exact interaction + visual contracts for each Phase 22 UI element.

### 1. `SalaryIntelligenceSection` — new section component

**Location:** `src/app/(admin)/admin/jobs/salary-intelligence-section.tsx`

**Props interface:**

```ts
import type { SalaryIntelligence } from "@/lib/jobs-db";

interface SalaryIntelligenceView {
  /** Parsed JSON object or null/unknown (Zod parseOrLog passes through whatever the permissive schema accepted). */
  report_json: unknown;
  /** LLM narrative — untrusted markdown; rendered via Streamdown with skipHtml. */
  llm_analysis: string | null;
  /** Server-computed freshness primitives — hydration-safe. Built from search_date (D-07 / RESEARCH.md §3). */
  freshness: {
    generatedDate: string;
    isStale: boolean;
    ageDays: number;
  };
}

interface Props {
  /** null triggers the missing branch; object with empty prose + unrecognized JSON triggers the empty branch. */
  salary: SalaryIntelligenceView | null;
}
```

**Render tree — populated branch:**

```tsx
<div className="space-y-3">
  <div className="flex items-center justify-between">
    <h3 className="text-sm font-semibold flex items-center gap-1.5">
      <DollarSign className="size-4" />
      Salary Intelligence
    </h3>
    <div className="flex items-center gap-3 flex-wrap">
      <FreshnessBadge
        generatedDate={salary.freshness.generatedDate}
        modelUsed={null}
        isStale={salary.freshness.isStale}
        ageDays={salary.freshness.ageDays}
      />
    </div>
  </div>

  {/* Headline row — renders only if report_json parses to a recognized shape */}
  {headline && (
    <div className="flex items-center gap-2 flex-wrap">
      {headline.figures.map((f, i) => (
        <span key={f.key} className="inline-flex items-center gap-1">
          <span className="text-[11px] font-medium text-muted-foreground">
            {f.label}
          </span>
          <span className="text-sm font-semibold text-foreground tabular-nums">
            {formatSingleSalary(f.value, headline.currency)}
          </span>
          <ProvenanceTag source="llm" />
          {i < headline.figures.length - 1 && (
            <span aria-hidden="true" className="text-muted-foreground">·</span>
          )}
        </span>
      ))}
    </div>
  )}

  {/* Streamdown prose body — renders only if llm_analysis has content */}
  {salary.llm_analysis?.trim() && (
    <div className="text-sm text-muted-foreground bg-card/50 rounded-lg p-4 border border-border max-h-96 overflow-y-auto">
      <Streamdown skipHtml linkSafety={{ enabled: false }}>
        {salary.llm_analysis}
      </Streamdown>
    </div>
  )}
</div>
```

**Render tree — missing branch (`salary === null` — today's state):**

```tsx
<div className="space-y-3">
  <h3 className="text-sm font-semibold flex items-center gap-1.5">
    <DollarSign className="size-4" />
    Salary Intelligence
  </h3>
  <p className="text-sm text-muted-foreground italic">
    {EMPTY_STATE_COPY.salary_intelligence.missing}
  </p>
</div>
```

**Render tree — empty branch (row present, nothing to show):**

```tsx
<div className="space-y-3">
  <h3 className="text-sm font-semibold flex items-center gap-1.5">
    <DollarSign className="size-4" />
    Salary Intelligence
  </h3>
  <p className="text-sm text-muted-foreground italic">
    {EMPTY_STATE_COPY.salary_intelligence.empty}
  </p>
</div>
```

Both empty branches omit the FreshnessBadge — no generated_at to display (matches Plan 21-06 empty-state posture).

**Headline detection (pure function, colocated or in `src/lib/parse-salary-report.ts`):**

```ts
type HeadlineFigure = { key: string; label: string; value: number };
type HeadlineShape = {
  kind: "MIN_MEDIAN_MAX" | "PERCENTILES";
  figures: HeadlineFigure[];
  currency: string; // e.g. "USD"
};

function parseSalaryHeadline(reportJson: unknown): HeadlineShape | null;
```

- Input: the raw `report_json` value (may be null, object, array, anything).
- Output: a well-formed `HeadlineShape` or `null` (graceful degrade).
- Accepts case-insensitive key matches (`min` / `Min` / `MIN` all OK).
- Requires at least ONE finite number among the detected keys — if all null/missing, returns `null`.
- Currency: reads `reportJson.currency` or `reportJson.salary_currency` if present; **never defaults to `"USD"`** (D-12 posture). If currency is absent, returns `null` — the whole headline row hides rather than mislabel a figure.
- Pure function. No side effects. Safe to call from Server Components.

**SectionErrorBoundary wrap (mandatory per D-09 / Plan 20-06):**

The `<SalaryIntelligenceSection>` MUST be wrapped at its mount site in `job-detail-sheet.tsx`:

```tsx
<Separator />
<SectionErrorBoundary section="salary_intelligence" jobId={detail.id}>
  <SalaryIntelligenceSection
    salary={
      detail.salary_intelligence
        ? {
            report_json: detail.salary_intelligence.report_json,
            llm_analysis: detail.salary_intelligence.llm_analysis,
            freshness: detail.salary_intelligence.freshness,
          }
        : null
    }
  />
</SectionErrorBoundary>
```

The boundary's fallback is reserved for Zod/Streamdown/render exceptions — not for the "intentionally empty" or "intentionally missing" branches. Those are normal render paths and live inside the boundary.

**Visual specs — populated:**

| Element | Style | Color |
|---------|-------|-------|
| Heading | `text-sm font-semibold flex items-center gap-1.5` | `text-foreground` (full contrast) |
| `DollarSign` icon | `size-4` | Inherits heading color |
| FreshnessBadge | Unchanged — inherits Plan 20-04 + Plan 21-01 styling | `text-muted-foreground` + `bg-warning` stale dot |
| Headline-row container | `flex items-center gap-2 flex-wrap` | transparent |
| Per-figure wrapper | `inline-flex items-center gap-1` | — |
| Figure label | `text-[11px] font-medium text-muted-foreground` | `text-muted-foreground` |
| Figure value | `text-sm font-semibold text-foreground tabular-nums` | `text-foreground` |
| Middle-dot separator | `text-muted-foreground` + `aria-hidden="true"` | `text-muted-foreground` |
| Streamdown container | `text-sm text-muted-foreground bg-card/50 rounded-lg p-4 border border-border max-h-96 overflow-y-auto` (identical to Phase 20 tailored-resume) | `bg-card/50`, `text-muted-foreground`, `border-border` |

**Visual specs — empty / missing:**

| Element | Style | Color |
|---------|-------|-------|
| Heading | `text-sm font-semibold flex items-center gap-1.5` | `text-foreground` (NOT dimmed — matches Phase 21 empty-state posture; absence is not a failure) |
| Body `<p>` | `text-sm text-muted-foreground italic` | `text-muted-foreground` |
| Container | `space-y-3` | No background, no border, no icon-box, no CTA |

**Behavior:**

- **Streamdown XSS posture:** identical to Phase 20 `TailoredResumeSection`. `skipHtml` strips raw HTML in the LLM output; `linkSafety={{ enabled: false }}` because `/admin/*` is the single-owner surface (Plan 20-07 CSP header provides defense in depth).
- **No clipboard / no download / no regenerate buttons.** Phase 22 is read-only.
- **Headline row NEVER renders fabricated figures.** If `parseSalaryHeadline` returns `null`, the headline row is absent from the tree — the component falls through to the Streamdown prose alone. If the prose is also empty/whitespace, the empty branch fires via the parent's `salary_intelligence.llm_analysis && report_json` gate.

**Accessibility:**

- Heading stays an `<h3>` — screen-reader section navigation finds the section regardless of populated/empty/missing state.
- Headline-row labels (`"Min"`, `"Median"`, etc.) are plain text adjacent to the figure; screen readers read `"Min 120 thousand dollars L L M estimate"` naturally (the tag tooltip is surfaced via Radix on focus).
- `aria-hidden="true"` on middle-dot separator so screen readers don't read the `·` character literally.
- Streamdown prose rendered as normal markdown; links inside are clickable with `target="_blank"` by default (Streamdown handles this).
- Tab traversal order: FreshnessBadge (only focusable when stale, via Radix Tooltip) → each `<ProvenanceTag>` Tooltip trigger in visual order → Streamdown internal links.

**Validation (planner turns into Vitest assertions):**

- `container.querySelector('h3')?.textContent` contains `"Salary Intelligence"` in all three branches (populated, empty, missing).
- When `salary === null`, the body is a single `<p>` with class `italic` and class containing `text-muted-foreground` whose text is exactly `"No salary intelligence yet."`.
- When `salary !== null` but `llm_analysis` is blank and `report_json` yields no headline, the body is a single `<p>` with exactly `"Salary intelligence was generated but is empty."`.
- Populated-branch fixture with `report_json: { min: 120000, median: 150000, max: 180000, currency: "USD" }` renders three figures with labels `Min` / `Median` / `Max` and three provenance tags with `text-warning` class.
- `parseSalaryHeadline({ min: 120000 })` returns `null` (missing currency).
- `parseSalaryHeadline({ min: 120000, currency: "USD" })` returns a `MIN_MEDIAN_MAX` shape with one figure.
- `parseSalaryHeadline({ p25: 120000, p50: 150000, p75: 180000, currency: "USD" })` returns a `PERCENTILES` shape with three figures.
- `parseSalaryHeadline({ totally: "unexpected", shape: 42 })` returns `null` (graceful degrade).

---

### 2. `<ProvenanceTag>` — reusable tag component

**Location:** `src/app/(admin)/admin/jobs/provenance-tag.tsx`

**Props interface:**

```ts
import type { ProvenanceSource } from "@/lib/provenance";

interface ProvenanceTagProps {
  source: ProvenanceSource;
  className?: string;
}
```

**Render tree:**

```tsx
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { provenanceColor, provenanceLabel } from "@/lib/provenance";

const TOOLTIPS: Record<ProvenanceSource, string> = {
  scraped:
    "Source: scraped from the job feed (raw value from the source posting).",
  llm:
    "Source: LLM estimate generated from external market data. Not a verified figure.",
  company_research:
    "Source: estimated during company research against public signals.",
  original_posting:
    "Source: directly quoted from the job posting description.",
};

export function ProvenanceTag({ source, className }: ProvenanceTagProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          variant="outline"
          className={`text-[10px] ${provenanceColor(source)} cursor-default${className ? ` ${className}` : ""}`}
        >
          {provenanceLabel(source)}
        </Badge>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs max-w-[220px]">
        {TOOLTIPS[source]}
      </TooltipContent>
    </Tooltip>
  );
}
```

**Visual specs:**

| Element | Style | Color |
|---------|-------|-------|
| Badge shape | shadcn `Badge variant="outline"` → `bg-transparent border border-border rounded-full px-2.5 py-0.5 text-xs font-medium tracking-wide` (inherited) | Border: `--color-border` |
| Badge text size override | `text-[10px]` via className (one smaller than Plan 21-05 quality badge's 11px) | — |
| Badge text color | Dynamic via `provenanceColor(source)` | `text-muted-foreground` / `text-warning` / `text-success` |
| Badge cursor | `cursor-default` | Signals "info, not clickable" — matches Plan 21-05 quality-badge pattern |
| Tooltip delay | Inherited from root `TooltipProvider delayDuration={300}` | — |
| Tooltip max width | `max-w-[220px]` | Matches Plan 21-05 quality-badge tooltip |

**Behavior:**

- **Hover:** shows tooltip after 300ms.
- **Focus-visible:** Radix wires `TooltipTrigger` to render a focusable element; shadcn Badge receives the default focus ring via the inherited border + ring tokens.
- **Click:** no-op. `cursor-default` + absence of `onClick` / `href` signals non-actionable.
- **Null-branch:** the tag itself has no null-branch — callers guard at the figure level (if there's no figure, there's no tag to render).

**Accessibility:**

- Badge is wrapped in `<Tooltip>` / `<TooltipTrigger asChild>` — Radix exposes it as `role="button"` with `tabindex="0"` automatically, making it keyboard-focusable. This is correct: the source-label IS informational data the owner should be able to dwell on via keyboard.
- `cursor-default` signals non-actionable to mouse users; screen readers announce the tooltip content when the badge receives focus.
- Tooltip content is descriptive enough to stand alone — a colorblind user can read `"Source: LLM estimate..."` without relying on the amber hue.
- **Why no `aria-label` override:** the visible Badge text (`"LLM estimate"`, etc.) IS the accessible name; an `aria-label` duplication would be redundant and risks drift between the two.

**Validation:**

- `render(<ProvenanceTag source="scraped" />)` produces a `<span>` with class containing `text-muted-foreground` and `text-[10px]` whose textContent is exactly `"scraped"`.
- `render(<ProvenanceTag source="llm" />)` → class contains `text-warning`; textContent is exactly `"LLM estimate"`.
- `render(<ProvenanceTag source="company_research" />)` → class contains `text-success`; textContent is exactly `"company research"`.
- `render(<ProvenanceTag source="original_posting" />)` → class contains `text-muted-foreground`; textContent is exactly `"posted"`.
- Hover + 300ms delay reveals a tooltip whose text matches the `TOOLTIPS` table entry for that source.

---

### 3. Existing-figure retrofits in `job-detail-sheet.tsx`

Every existing `formatSalary(...)` render site gains a trailing `<ProvenanceTag>`. Three call sites:

**Call site A — sheet header (line 158-163):** base-job salary from the `jobs` row.

```tsx
{formatSalary(detail.salary_min, detail.salary_max) && detail.salary_currency && (
  <span className="flex items-center gap-1">
    <DollarSign className="size-3.5" />
    {formatSalary(detail.salary_min, detail.salary_max)}
    <ProvenanceTag source="scraped" />
  </span>
)}
```

**Diff summary:**
- Guard on `detail.salary_currency` (D-12 removal of `?? "USD"` means the caller must hide the block when currency is null — it will no longer mislabel GBP/EUR as `$`).
- Add `<ProvenanceTag source="scraped" />` as the third child of the gap-1 flex row.

**Call site B — Company Intel salary range (lines 321-330):** from `company_research` row.

```tsx
{(detail.company_research.salary_range_min ||
  detail.company_research.salary_range_max) &&
  detail.company_research.salary_currency && (
    <div className="flex items-center gap-1">
      <DollarSign className="size-3.5" />
      {formatSalary(
        detail.company_research.salary_range_min,
        detail.company_research.salary_range_max
      )}
      <ProvenanceTag source="company_research" />
    </div>
  )}
```

**Diff summary:**
- Guard on `company_research.salary_currency` (same D-12 posture).
- Add `<ProvenanceTag source="company_research" />` as the third child of the gap-1 flex row.

**Call site C — headline row inside `SalaryIntelligenceSection`:** per-figure `<ProvenanceTag source="llm" />` inside each figure's `inline-flex` wrapper (see §1 render tree).

**`?? "USD"` removal — D-12:**

RESEARCH.md §5 locates the existing default at `src/lib/jobs-db.ts:349`. The planner removes the `?? "USD"` coalesce. Downstream, `jobs.salary_currency` / `company_research.salary_currency` become `string | null`, and every render site must guard (Call sites A and B above are the only two that render currency-dependent figures from those sources). Render sites for `salary_intelligence.report_json` figures trust the report's own `currency` field — no coalesce, no fallback (D-12 posture).

---

## Cross-cutting UI contracts (MUST for every new element this phase)

### Hydration safety

Every new component takes server-computed values as pre-computed primitives from Server Components. **No `new Date()`, no `window.location`, no `Date.now()` during render in any Phase 22 client component.**

- `salary.freshness.generatedDate` computed in `attachFreshness` (server) from the `search_date` column (RESEARCH.md §3 recommends extending `attachFreshness` with an optional 3rd `fieldName` argument that defaults to the existing dispatch; planner verifies the exact signature at Task 0).
- `parseSalaryHeadline` is pure (no clock, no locale lookup, no env access).
- `provenanceColor` / `provenanceLabel` / `ProvenanceTag` are pure (no state).
- `formatSingleSalary(n, currency)` is pure.

**This is a MUST. Any deviation is an immediate UI-SPEC checker failure.**

### Color tokens (CLAUDE.md enforcement)

No raw Tailwind color classes in any Phase 22 diff. Forbidden:

| Forbidden | Use instead |
|-----------|-------------|
| `text-red-500`, `text-red-600`, `bg-red-*` | `text-destructive` / `bg-destructive/10` |
| `text-amber-500`, `text-yellow-*`, `bg-amber-*` | `text-warning` / `bg-warning/10` |
| `text-green-500`, `text-emerald-*`, `bg-green-*` | `text-success` / `bg-success/10` |
| `text-blue-500`, `bg-blue-*` | `text-primary` / `bg-primary/10` |
| `text-gray-*`, `text-zinc-*`, `text-slate-*` | `text-muted-foreground` / `text-foreground` |

### Accessibility contract

| Element | Accessible name source | Extra ARIA |
|---------|------------------------|------------|
| Section `<h3>` | `Salary Intelligence` text | — |
| `DollarSign` icon in heading | Heading text is the section name | `aria-hidden="true"` recommended (decorative) |
| Empty-state `<p>` | Normal italic text | — |
| Headline-row figure wrapper | Text content (label + value) | — |
| Middle-dot separator | — | `aria-hidden="true"` |
| ProvenanceTag (Tooltip trigger) | Badge visible text (`"scraped"` / `"LLM estimate"` / etc.) | `role="button"`, `tabindex="0"` (Radix default) |
| FreshnessBadge | Inherits Plan 20-04 contract | Unchanged |
| Streamdown prose | Normal markdown — links are `<a>` with default href accessible names | Unchanged |

All interactive elements (the tags' Tooltip triggers) are keyboard-reachable via tab traversal and have a visible focus indicator inherited from shadcn Badge + Tooltip defaults.

### Interaction states

| Control | Default | Hover | Focus-visible | Active | Disabled |
|---------|---------|-------|---------------|--------|----------|
| ProvenanceTag | `Badge variant="outline"` + dynamic text color via `provenanceColor()` | no visual change (`cursor-default`) — Tooltip appears after 300ms | Radix Tooltip's default focus outline inherited via Badge border + ring tokens | — | N/A (tag is never disabled; if the figure isn't renderable, the whole wrapper is absent) |
| FreshnessBadge | Inherited from Plan 20-04 + Plan 21-01 | Unchanged | Unchanged | — | — |

Use `focus-visible` (NOT `focus`) — focus rings appear only on keyboard traversal, not mouse click.

### Toast stack contract

- **Zero `toast.*` calls in Phase 22.** The section is read-only; there are no actions to acknowledge.
- If Phase 22 planning discovers a need for a toast (e.g., "retry succeeded"), raise it to the owner before adding. The one-toast-per-phase discipline from Phase 21 carries forward.

### Responsive contract

- Detail Sheet is `w-full sm:max-w-lg` = 512px on viewports ≥ 640px; full width below.
- **Meta row** (heading + FreshnessBadge): `FreshnessBadge ~180px + heading ~180px ≈ 360px`. Fits comfortably in 512px.
- **Headline row** (worst case, 5 percentile figures): each figure cluster is `label ~28px + figure ~44px + ProvenanceTag ~74px` ≈ 146px. Five clusters × 146px + 4 × gap-2 (32px) = 762px. **Exceeds 512px** — `flex-wrap` on the headline-row parent is mandatory (already specified in §1 render tree); expected wrap is 2–3 figures per visual line at 512px.
- **3-figure MIN_MEDIAN_MAX shape:** 3 × 146px + 2 × 8px = 454px. Fits comfortably on one line.
- **Sheet header salary retrofit:** existing `flex flex-wrap gap-3` at line 119 already handles overflow. Adding a `<ProvenanceTag>` to the existing gap-1 inner span grows the span by ~74px; the wrap at the outer `flex flex-wrap` level absorbs the extra width.
- **Company Intel salary retrofit:** sits inside `grid grid-cols-2 gap-3` at line 301. Each grid cell is ~240px wide. Adding a `<ProvenanceTag>` (~98px for `"company research"`) to a salary cell of `DollarSign + $120K - $180K` (~140px) brings the total to ~238px — fits the grid cell. If it overflows (e.g., very long figures), the Badge will wrap or truncate; planner adds `flex-wrap` to the cell's inner `flex items-center gap-1` as a safety net.

### What this UI-SPEC DOES NOT cover (defer to planning / execution)

- The exact Zod schema shape for `report_json` — CONTEXT.md §Claude's Discretion; planner picks between `z.unknown()` and a minimally-typed object at Task 0 based on the first real row once n8n task #11 is fixed. `z.unknown()` + `parseSalaryHeadline` as a post-parse narrow is the researcher's recommendation for today; tighten later.
- The exact staleness threshold for salary intelligence — researcher recommends 30d; planner confirms at Task 0.
- The exact `<match_predicate>` for the LEFT JOIN LATERAL (CONTEXT.md D-03) — data-layer concern, out of UI-SPEC scope.
- The `attachFreshness` extension signature for the `search_date` field — code-layer concern, planner designs.
- Whether `raw_results` is rendered anywhere — CONTEXT.md §Claude's Discretion; researcher recommendation is **no** (it's text debugging dump, not owner-value).
- Any future Phase 24 regenerate button placement — deferred.
- Salary distribution chart / percentile viz — deferred to v3.2+ (FEATURES.md D3).

---

## Grep-verifiable contracts (MUST — plan-checker + ui-checker use these)

These rules MUST be enforceable by a static grep (or equivalent AST tool). Fail-loud if any returns a violation.

### G-1. Provenance tag adjacency (D-11)

> Every `formatSalary(` call in `src/app/(admin)/admin/jobs/job-detail-sheet.tsx` must be followed within 5 lines by `<ProvenanceTag` OR `<Badge variant="outline"`, OR the figure sits inside a component that itself has provenance tagging (e.g., `SalaryIntelligenceSection` encapsulates its own tags).

Implementation: `grep -n "formatSalary(" src/app/(admin)/admin/jobs/job-detail-sheet.tsx | while read -r hit; do grep -A5 "formatSalary(" "${hit%:*}" | grep -q "ProvenanceTag\|Badge variant=\"outline\""; done` — or equivalent Vitest snapshot / source-text test that loads the file and verifies adjacency.

### G-2. No raw Tailwind color class names in Phase 22 diff

> No raw Tailwind color class names (`text-red-*`, `text-amber-*`, `text-yellow-*`, `text-green-*`, `text-emerald-*`, `text-orange-*`, `text-blue-*`, `text-gray-*`, `text-zinc-*`, `text-slate-*`, or any `bg-*` / `border-*` variants thereof) in `salary-intelligence-section.tsx`, `provenance-tag.tsx`, `provenance.ts`, or the Phase 22 diff of `job-detail-sheet.tsx`.

Implementation: `grep -nE "(text|bg|border)-(red|amber|yellow|green|emerald|orange|blue|gray|zinc|slate)-[0-9]" src/app/(admin)/admin/jobs/salary-intelligence-section.tsx src/app/(admin)/admin/jobs/provenance-tag.tsx src/lib/provenance.ts` MUST return zero matches. CLAUDE.md rule.

### G-3. EMPTY_STATE_COPY is the source of truth for missing/empty strings

> The strings `"No salary intelligence yet."` and `"Salary intelligence was generated but is empty."` MUST be imported from `EMPTY_STATE_COPY` via `@/lib/empty-state-copy` in `salary-intelligence-section.tsx` — NOT inlined as string literals.

Implementation: grep the component for the literal strings outside of an `EMPTY_STATE_COPY.salary_intelligence.*` expression — MUST return zero hits. Plan 21-06 pattern.

### G-4. SectionErrorBoundary wrap

> `<SalaryIntelligenceSection>` in `job-detail-sheet.tsx` MUST be wrapped in `<SectionErrorBoundary section="salary_intelligence" jobId={...}>`.

Implementation: `grep -B2 -A5 "SalaryIntelligenceSection" src/app/(admin)/admin/jobs/job-detail-sheet.tsx` MUST show `SectionErrorBoundary section="salary_intelligence"` in the 2 lines preceding the mount. Plan 20-06 pattern.

### G-5. Anti-CTA gate on empty-state copy

> Empty-state strings for `salary_intelligence` (both keys) MUST NOT contain any imperative verb or CTA construction. Forbidden tokens (case-insensitive): `"click"`, `"regenerate"`, `"run"`, `"generate now"`, `"try"`, `"retry"`, `"please"`, `"start"`, `"begin"`, `"trigger"`, trailing `"!"`. One-period-per-line check: exactly one `.` in each string.

Implementation: a Vitest test imports `EMPTY_STATE_COPY.salary_intelligence` and asserts against a regex list. Plan 21-06 pattern extended.

### G-6. No `?? "USD"` resurrection

> The string `?? "USD"` MUST NOT appear in `src/lib/jobs-db.ts` for `salary_currency` coalesces after Phase 22 lands.

Implementation: `grep -n '?? "USD"' src/lib/jobs-db.ts` MUST return zero matches (or matches unrelated to salary currency — flag for review). D-12 + RESEARCH.md §5.

### G-7. Tabular numerals on headline-row figures

> Every headline-row figure `<span>` that renders a `formatSingleSalary(...)` result MUST carry the `tabular-nums` class so multi-figure rows align.

Implementation: grep/snapshot test on `salary-intelligence-section.tsx` — every `<span>` whose children include `formatSingleSalary` or a `$` figure renders the `tabular-nums` class.

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | `Badge`, `Tooltip`, `TooltipContent`, `TooltipTrigger`, `Separator` (all ALREADY installed at `src/components/ui/`; predate Phase 22) | not required — official registry, all primitives predate this phase |
| npm (not a shadcn registry) | `streamdown@^2.5.0` (existing, added in Plan 20-01); `lucide-react` `DollarSign` icon (existing, imported at `job-detail-sheet.tsx:20`) | not applicable — existing deps, vetted in earlier phases |

**Third-party shadcn registries:** none. Phase 22 does NOT install any block from a third-party registry. The registry vetting gate (`npx shadcn view {block} --registry {url}`) is not applicable and is skipped per `<shadcn_gate>` logic.

**Zero new shadcn installs. Zero new npm deps.** Every primitive and dep referenced is already present.

---

## Checker Sign-Off

- [ ] Dimension 1 Information Architecture: PASS — `SalaryIntelligenceSection` mounts between Tailored Resume and Company Intel in `job-detail-sheet.tsx` (preceded by `<Separator />`, wrapped in `<SectionErrorBoundary section="salary_intelligence">`); heading is `"Salary Intelligence"` verbatim with `<DollarSign className="size-4" />`; meta row is `FreshnessBadge` only (matches Phase 21 Tailored Resume cadence); body tree specified for populated / empty / missing branches; empty branches omit FreshnessBadge
- [ ] Dimension 2 Typography: PASS — zero new sizes/weights; `text-sm font-semibold` for heading + figures, `text-[11px] font-medium` for figure labels + freshness, `text-[10px] font-medium` for provenance tags, `text-xs` for tooltips, `tabular-nums` on all dollar figures — all already present in the project
- [ ] Dimension 3 Color: PASS — zero new tokens; provenance mapping `scraped→text-muted-foreground`, `llm→text-warning`, `company_research→text-success`, `original_posting→text-muted-foreground` (reserved); headline figures `text-foreground`; empty body `text-muted-foreground italic`; zero raw Tailwind color names (grep-gate G-2)
- [ ] Dimension 4 Spacing and Layout: PASS — all spacing via Tailwind multiples-of-4 (`gap-1`, `gap-1.5`, `gap-2`, `gap-3`, `space-y-3`, `space-y-4`, `space-y-6`, `px-2.5`, `py-0.5`); `size-3.5`, `size-4` icon sizes carry-forward; figure↔tag "thin space" resolves to `gap-1` (4px); responsive wrap strategy specified for 3- and 5-figure headline rows
- [ ] Dimension 5 Interaction: PASS — every ProvenanceTag is a Tooltip trigger with 300ms delay + 4 verbatim tooltip strings (`TOOLTIPS` table); Streamdown link behavior restated as `linkSafety.enabled:false` + `skipHtml` per Phase 20 baseline; FreshnessBadge stale tooltip inherited from Plan 20-04; zero toasts; SectionErrorBoundary wrap mandatory (grep-gate G-4); no clipboard / no download / no regenerate (phase is read-only)
- [ ] Dimension 6 Copywriting: PASS — section label `"Salary Intelligence"` verbatim; empty-state strings sourced from `EMPTY_STATE_COPY.salary_intelligence.{missing, empty}` (grep-gate G-3); 4 tag labels verbatim; 4 tooltip strings verbatim; 6 headline-row labels verbatim (`"Min"`/`"Median"`/`"Max"` and `"25th"`/`"50th"`/`"75th"`); anti-CTA rule explicitly locked with grep-gate G-5
- [ ] Dimension 7 Registry Safety: PASS — shadcn-official primitives only; zero new shadcn installs; zero new npm deps in the UI diff

**Approval:** pending

---

## Researcher Notes

Three Researcher Notes for the owner's review:

1. **`"posted"` vs `"original posting"` label (§Copywriting):** chose `"posted"` (6 chars) over `"original posting"` (15 chars) to avoid Badge wrap risk at `text-[10px]` in a 512px sheet. Both carry the same semantic meaning. If the owner prefers the longer form, flag for planner — the trade-off is potential visual wrap. Since `original_posting` is a reserved class in Phase 22 (not actively rendered per D-09), this is a low-stakes decision.

2. **`original_posting` color parity with `scraped` (§Color):** the mapping collapses `original_posting` and `scraped` to `text-muted-foreground`. Rationale: both are unverified by our pipeline (one is verbatim from an LLM's free-text quote, the other from a feed aggregator). If the owner wants a fourth distinct color tier for directly-quoted posting figures, raise it before activating the class — the change is a one-line edit in `provenanceColor()`. Since Phase 22 does NOT emit `original_posting` tags, this is a future-phase decision, not a blocker.

3. **Staleness threshold for salary_intelligence (§Copywriting — FreshnessBadge):** researcher recommends `30d`. Rationale: salary market data shifts faster than company composition (60d Company Intel threshold) but slower than cover-letter LLM freshness (14d — the letter is job-specific). `30d` matches typical "monthly market snapshot" cadence. Planner confirms at Task 0; the threshold is a one-line constant addition.

**Stack assumptions verified (2026-04-22):**

- `DollarSign` icon already imported at `job-detail-sheet.tsx:20`; `size-3.5` and `size-4` sizes already used in the file.
- `Badge variant="outline"` accepts `className` override via `cn()` — custom text color + size class wins over the variant's default `text-muted-foreground` due to Tailwind merge semantics. Verified against `src/components/ui/badge.tsx:10-15`.
- `Tooltip` / `TooltipTrigger` / `TooltipContent` already imported and used 6+ times in `job-detail-sheet.tsx`; root `<TooltipProvider delayDuration={300}>` mounted in `providers.tsx:9`.
- `FreshnessBadge` accepts `modelUsed: null` and suppresses the model segment — verified at `freshness-badge.tsx:49-58` (`{modelUsed && (...)}`). Same pattern used by Company Intel at `job-detail-sheet.tsx:296`.
- `SectionErrorBoundary` accepts a free-form `section` string prop — verified by existing usages for `"cover_letter"`, `"tailored_resume"`, `"company_research"`; adding `"salary_intelligence"` is a zero-infrastructure additive change.
- `EMPTY_STATE_COPY` const map at `src/lib/empty-state-copy.ts` has the 3-section shape Phase 21 established; adding a 4th key (`salary_intelligence`) preserves the pattern. Plan 21-06 precedent.
- `attachFreshness` helper at `src/lib/attach-freshness.ts:28` already dispatches between `generated_at` (cover_letter / tailored_resume) and `created_at` (company_research) via `"generated_at" in artifact` narrowing. Extending to `search_date` as a 3rd case is a 3-line edit per RESEARCH.md §3 recommendation.
- All required color tokens exist: `--color-muted-foreground`, `--color-warning`, `--color-success`, `--color-foreground`, `--color-border`, `--color-ring`, `--color-card` (verified in `src/styles/globals.css:9-32`).
- `components.json` confirms shadcn baseline: `style: "new-york"`, `baseColor: "zinc"`, `cssVariables: true`, `rsc: true`, `tsx: true`, `iconLibrary: "lucide"`, css at `src/styles/globals.css`. No preset mismatch.
- No new shadcn installs needed. No new npm deps needed. No new color tokens needed. No new typography sizes needed. No new spacing tokens needed.
