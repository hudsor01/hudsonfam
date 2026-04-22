# Phase 22: Salary Intelligence (Defensive Render) - Research

**Researched:** 2026-04-22
**Domain:** Defensive rendering + data-layer extension for `salary_intelligence` artifact
**Confidence:** HIGH (data shape verified against live DB inspection captured in CONTEXT.md; Phase 20/21 patterns grep-verified in the live codebase; Streamdown 2.5.0 and Zod 4.3.6 verified against npm registry on 2026-04-22)

---

## Executive Summary

Phase 22 is a **narrow, well-scoped extension** of the Phase 20/21 patterns already shipped. Every load-bearing piece has a direct analog in code: the Zod fail-open boundary (`parseOrLog`), the LEFT JOIN LATERAL variant of the existing LEFT JOINs, the `TailoredResumeSection` component shell, the `EMPTY_STATE_COPY` const map, the `scoreColor`/`scoreLabel` pure-function pair, the `attachFreshness` dual-field dispatcher, and the Plan 20-08 schema-drift EXPECTED map. **Zero new libraries, zero new primitives, zero new architectural decisions.**

The single technical risk is the live-DB reality discovered during discuss-phase: the `salary_intelligence` table has no `job_id` column and no `company_name` column — it is keyed on `search_date` (UNIQUE) with row count 0. This breaks ROADMAP SC #3's "job_id and company_name keying" wording. Phase 22 ships a **defensive skeleton** that tolerates zero rows today AND tolerates whatever column shape the n8n `$N`-collision fix eventually produces (homelab task #11, tracked outside this repo). The renderer is exercised by fixtures; the live join returns null for every job until upstream work lands.

**Primary recommendation:** Execute as a 3-wave plan — Wave 1 data layer (Zod schema + parseOrLog wiring + LEFT JOIN LATERAL skeleton + `?? "USD"` removal + EXPECTED map), Wave 2 rendering layer (SalaryIntelligenceSection + provenance tag primitives + job-detail-sheet mount + empty-state copy extension), Wave 3 provenance tag wiring on every existing `formatSalary(` site. All three waves share zero edits on the production hot path because `salary_intelligence` has 0 rows — the renderer branches are dead until task #11 lands, but every branch is test-covered via fixtures.

**Confidence breakdown:**
- Data layer (Zod + JOIN + types): HIGH — live DB schema verified; pattern is a 1:1 copy of Plan 20-03
- Rendering (component + empty state): HIGH — `TailoredResumeSection` is a complete template
- Provenance tags: MEDIUM-HIGH — new primitive (provenanceColor/Label helpers + Badge wrapper) follows Plan 21-05 precedent exactly; only open question is inline JSX vs extracted component
- Currency handling: HIGH — single-line deletion, impact well-understood
- Test coverage: HIGH — existing tests for empty-states, xss, score-color all provide direct patterns

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**D-01:** `SalaryIntelligence` Zod schema uses permissive shape — `report_json` typed as `z.unknown()` or `z.record(z.unknown())`. `llm_analysis` is `z.string().nullable()`. Other columns match live-DB types (integer id, date search_date, text raw_results, timestamps). Loose skeleton now, tightening later when upstream data shape stabilizes.

**D-02:** `TailoredResumeSchema` + `CompanyResearchSchema` fail-open `parseOrLog` pattern from Plan 20-03 extends to `SalaryIntelligenceSchema`. Each artifact validates INDEPENDENTLY at `getJobDetail` return boundary.

**D-03:** `getJobDetail` LEFT JOIN uses a SUBQUERY-style `LATERAL` join scoped to `LIMIT 1` on `search_date DESC`. The `<match_predicate>` defaults to `false` in Phase 22 (zero matches) pending n8n task #11 fix. When real data lands, predicate tightens via a 1-line edit.

**D-04:** Schema-drift guard — `scripts/check-jobs-schema.ts` EXPECTED map gains a `salary_intelligence` entry listing `["id", "search_date", "report_json", "raw_results", "llm_analysis", "created_at", "updated_at"]` (7 columns). Plan 20-08 pattern precedent.

**D-05:** New `SalaryIntelligenceSection` client component at `src/app/(admin)/admin/jobs/salary-intelligence-section.tsx`. Mirrors `TailoredResumeSection` shape. Placement: between Tailored Resume and Company Intel in `job-detail-sheet.tsx`.

**D-06:** Body layout: `llm_analysis` prose rendered via Streamdown (Phase 20's `skipHtml linkSafety={{ enabled: false }}` config); ABOVE the prose, a structured headline row rendered from `report_json` figures IF the schema parser can extract recognizable min/median/max OR p25/p50/p75 fields. If shape unrecognized, render ONLY the prose (graceful degradation).

**D-07:** Headline row format: compact flex row with 3-5 dollar figures, each figure wrapped in a provenance-tagged badge. Match Phase 21's meta-row cadence. Exact layout is Claude's discretion during planning.

**D-08:** Empty state: reuse Phase 21 AI-RENDER-04 pattern — section heading renders unconditionally; body shows "No salary intelligence yet." in `text-sm text-muted-foreground italic`. Extend `EMPTY_STATE_COPY` const map with a `salary_intelligence` key.

**D-09:** Four provenance sources:
- **"scraped"** — from `jobs.salary_min/salary_max` (source = feed name)
- **"LLM estimate"** — from `salary_intelligence.report_json` figures
- **"company research"** — from `company_research.salary_range_min/salary_range_max`
- **"original posting"** — reserved for trivial cases (not implemented Phase 22 unless trivial)

**D-10:** Tag component: shadcn `<Badge variant="outline">` with `text-[10px]` typography (one size smaller than Plan 21-05's quality badge). Semantic color tokens: `scraped` uses `text-muted-foreground` (lowest trust), `LLM estimate` uses `text-warning` (estimate), `company research` uses `text-success` (higher trust). Exact color mapping finalized during planning; principle is "color ≈ confidence."

**D-11:** Tag placement: inline immediately AFTER the figure, separated by a thin space. Tooltip on tag explains the source. Grep-verifiable acceptance: every occurrence of `formatSalary(` in `job-detail-sheet.tsx` must be followed within 5 lines by a `<Badge variant="outline"` render, OR the figure is inside a component that itself has provenance tagging.

**D-12:** Remove `?? "USD"` default where it appears for salary fields. When `salary_currency` is null, block hides entirely. For `salary_intelligence.report_json` figures, render with whatever currency the LLM emitted.

### Claude's Discretion

- Exact Zod schema shape for `report_json` (loose `z.unknown()` vs minimally-typed object with optional keys)
- Exact FreshnessBadge treatment — does the badge show `search_date` or `created_at`? Planner picks during Task 0
- Provenance tag color mapping — D-10 locks the principle; exact class names are Claude's call
- Whether to render `raw_results` anywhere (probably not — text debugging dump)
- Tag placement in structured headline row vs inline with prose — D-11 locks inline after figure; layout has discretion

### Deferred Ideas (OUT OF SCOPE)

- Fixing n8n workflow's `$N`-collision bug (homelab repo)
- Salary distribution visualization / percentile chart (FEATURES.md D3 — v3.2+)
- Cross-currency conversion
- Salary regenerate button (Phase 24 AI-ACTION-06)
- Auto-trigger salary_intelligence workflow on job creation
- Historical salary trends
- LLM-prompt customization UI

**Awaiting upstream:** n8n task #11 (batch-INSERT `$N`-collision bug fix). Until that ships, renderer is exercised only by tests + fixtures.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| **AI-RENDER-03** | Owner sees salary intelligence — LLM analysis prose + structured headline figures — in the job detail sheet | §Rendering Layer (SalaryIntelligenceSection spec + Streamdown config + headline row detection logic) |
| **AI-RENDER-07** | Owner sees provenance tags on every salary figure displayed; no single "$X" appears without a source label | §Provenance Tags (complete render-site list + Badge JSX shape + provenance helper recommendation + grep-verifiable acceptance regex) |
| **AI-DATA-01** | `getJobDetail()` returns salary intelligence joined via defensive `LEFT JOIN LATERAL` that tolerates both `job_id` and `company_name` keying | §Data Layer (LEFT JOIN LATERAL SQL with defensive `FALSE` predicate for Phase 22 + 1-line edit shape for when task #11 lands); NOTE: ROADMAP SC #3 wording stale — table has neither column; see §Integration Risks |
| **AI-DATA-02** | `src/lib/jobs-db.ts` exports `SalaryIntelligence` TS type + matching Zod schema derived from actual `salary_intelligence` schema once task #11 has produced at least one row | §Data Layer (SalaryIntelligenceSchema Zod shape + `SalaryIntelligence` TS interface + `JobDetail` extension) |
</phase_requirements>

---

## Project Constraints (from CLAUDE.md)

| Constraint | Applies To Phase 22? |
|-----------|---------------------|
| TanStack Form, never `react-hook-form` | No forms in Phase 22 — N/A |
| TanStack Table for data tables | No tables in Phase 22 — N/A |
| Never remove unused shadcn components — integrate instead | N/A — Phase 22 adds Badge + Tooltip integrations, doesn't remove anything |
| All colors via `globals.css` @theme tokens — zero hardcoded Tailwind colors | **ENFORCE** — provenance color mapping uses `text-muted-foreground`/`text-warning`/`text-success` only |
| Forms use zod schemas from `src/lib/schemas.ts` | Zod schema goes in `src/lib/jobs-schemas.ts` (existing file), NOT `schemas.ts` — matches Plan 20-03 pattern |
| Error/Success alerts use theme tokens | Empty-state body uses `text-muted-foreground italic` per Plan 21-06 pattern |
| Server Components by default; `"use client"` as first line when needed | `SalaryIntelligenceSection` will be a client component (`"use client"`) because Streamdown + Tooltip are client-side |
| Never pass `onClick` or event handlers Server → Client | Phase 22 has no event handlers crossing that boundary — N/A |
| Server Actions use `"use server"` | `attach-freshness.ts` must stay a separate module (Plan 21-00 Rule 3 finding) — non-async exports disallowed from `"use server"` files |
| `@/*` path alias → `./src/*` | Use `@/` for all imports per project convention |
| Jobs DB via `JOBS_DATABASE_URL` with separate `pg.Pool` (max=3, idleTimeout=30s), NOT Prisma | Extend existing `pool.query()` in `getJobDetail` — no new pool, no Prisma schema |
| Route groups — `(admin)` requires `requireRole(["owner"])` | Phase 22 adds no server actions; `fetchJobDetail` already enforces — inherited |
| Tests via Vitest + happy-dom + Testing Library + MSW | All new tests use this stack; colocated in `src/__tests__/` |

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| `SalaryIntelligence` Zod schema + TS type | API / Backend (`src/lib/jobs-schemas.ts`) | — | Schemas are runtime-source-of-truth at the DB boundary per Plan 20-03; types are inferred/aligned |
| LEFT JOIN LATERAL skeleton in `getJobDetail` | Database / Storage (SQL) | API / Backend (TS assembly) | Query logic belongs in `jobs-db.ts`; the JOIN shape is a pure DB concern with row assembly in TS |
| `parseOrLog` fail-open validation | API / Backend (`src/lib/jobs-schemas.ts`) | — | Server-side runtime boundary; never ships to client |
| `SalaryIntelligenceSection` rendering | Frontend Server (SSR) — component shell | Browser / Client (Streamdown + Tooltip interactivity) | Section is a `"use client"` component; server computes freshness via `attachFreshness` before render |
| Streamdown markdown rendering | Browser / Client | — | Streamdown is a client component (runs `useState` internally for streaming state); sanitization is runtime-client |
| Provenance tag color mapping (`provenanceColor`/`provenanceLabel`) | API / Backend OR Frontend Server (pure function, imported from either) | — | Pure function, no DOM / clock / env — safe everywhere. Co-locate in `src/lib/provenance.ts` following Plan 21-05's `score-color.ts` precedent |
| Empty-state copy | API / Backend (`src/lib/empty-state-copy.ts`) | — | Static const map; single source of truth for both server-rendered copy and client-rendered copy |
| Schema-drift guard (`check-jobs-schema.ts`) | API / Backend (Node CLI script) | — | Runs at pre-push git hook, queries DB via `pg` — Node-only |
| `?? "USD"` removal | API / Backend (`src/lib/jobs-db.ts:349`) | — | Single-line server-side edit; hides downstream block via null propagation |
| FreshnessBadge wiring for salary section | Frontend Server (SSR server-computes `attachFreshness`) | Browser / Client (Tooltip) | Matches existing dual-field dispatch in `attach-freshness.ts`; possible 3-field extension if `search_date` chosen over `created_at` |

---

## Standard Stack

### Core (no new additions — all pre-installed)

| Library | Version | Purpose | Why Standard (verified) |
|---------|---------|---------|-------------------------|
| `streamdown` | 2.5.0 | Renders `llm_analysis` prose as sanitized markdown (skipHtml) | [VERIFIED: `npm view streamdown version` on 2026-04-22 → 2.5.0]; already installed via Plan 20-01; `skipHtml linkSafety={{ enabled: false }}` pattern proven in `tailored-resume-section.tsx:167` and locked by XSS regression test at `tailored-resume-xss.test.tsx` |
| `zod` | 4.3.6 | Runtime validation of `salary_intelligence` row shape | [VERIFIED: `npm view zod version` on 2026-04-22 → 4.3.6]; project uses `z.ZodType<T>` generic per Plan 20-03 convention |
| `pg` (via `@prisma/adapter-pg` + raw Pool) | — | JOBS_DATABASE_URL Pool, existing | Already shared `pg.Pool` with `max=3, idleTimeoutMillis=30000` in `jobs-db.ts:9-23` — Phase 22 extends its existing query, no new pool |
| `lucide-react` | — | Icon for the SalaryIntelligence section heading | `DollarSign` icon already imported in `job-detail-sheet.tsx:20`; proposed heading icon for new section |

### Supporting (all pre-installed per Phase 20/21)

| Library | Purpose | When to Use |
|---------|---------|-------------|
| shadcn `Badge` (`src/components/ui/badge.tsx`) | Provenance tag base | Every provenance tag per D-10/D-11 |
| shadcn `Tooltip` | Tag source explanation on hover | Every provenance tag |
| Plan 20-08 schema-drift guard (`scripts/check-jobs-schema.ts`) | EXPECTED map extension | Task that adds `salary_intelligence` entry per D-04 |
| Plan 21-06 `EMPTY_STATE_COPY` const map (`src/lib/empty-state-copy.ts`) | Empty-state body | Task that adds `salary_intelligence` key per D-08 |
| Plan 21-05 `scoreColor`/`scoreLabel` precedent (`src/lib/score-color.ts`) | Pure-function pair template | Template for `provenanceColor`/`provenanceLabel` if extracted |

### Alternatives Considered (rejected, for the record)

| Instead of | Could Use | Why Rejected |
|------------|-----------|--------------|
| Streamdown | `react-markdown` + `rehype-sanitize` | Already rejected at Phase 20 scope; Streamdown is the locked choice. Don't re-open. |
| `z.unknown()` for `report_json` | Narrowly-typed `z.object({...})` with known keys | Live DB has 0 rows — we cannot know the real keys until task #11 lands. D-01 explicitly permits loose shape. Narrow later. |
| Extract `provenanceColor`/`provenanceLabel` pure functions | Inline color class in JSX | Extract. Precedent: Plan 21-05's `score-color.ts` (extracted at 3 bands, 36 lines). Provenance has 4 sources → same or more branch complexity → extraction pays. Also reusable for future Phase 24 surfaces. |
| Separate `<ProvenanceTag>` component | Inline `<Tooltip><Badge>...</Badge></Tooltip>` | Discretionary per D-10. Given ~6-8 render sites (see §Provenance Tags for complete list), a named component halves duplication. Recommend extraction with planner's discretion. |
| Show `raw_results` text dump | Hide entirely | D-06 reserves body to `llm_analysis` prose. `raw_results` is debugging data, not owner-value. Skip per Claude's discretion. |

**No `npm install` required.** Phase 22 introduces zero new runtime or devDependencies.

**Version verification completed 2026-04-22:**
- `streamdown@2.5.0` → `npm view streamdown version` returned `2.5.0` ✓
- `zod@4.3.6` → `npm view zod version` returned `4.3.6` ✓

---

## Architecture Patterns

### System Architecture Diagram (data flow)

```
[ Browser: JobDetailSheet ]
    ↓ opens detail sheet for jobId
    ↓ calls fetchJobDetail(jobId) — Server Action
[ job-actions.ts :: fetchJobDetail ]
    ↓ requireRole(["owner"])
    ↓ getJobDetail(jobId) — DB layer
[ jobs-db.ts :: getJobDetail ]
    ↓ SELECT with LEFT JOIN cover_letters, company_research, tailored_resumes,
    ↓   + LEFT JOIN LATERAL (salary_intelligence skeleton, LIMIT 1, WHERE false)  ← PHASE 22 ADDS
    ↓
[ Postgres: n8n DB ]
    ↓ returns row (salary_intelligence columns = null today)
    ↓
[ jobs-db.ts :: parseOrLog(SalaryIntelligenceSchema, raw, ...) ]
    ↓ safeParse → null on malformed, null on absent row
    ↓
[ jobs-db.ts :: return JobDetail with salary_intelligence field ]
    ↓
[ job-actions.ts :: attachFreshness<SalaryIntelligence>(...) ]   ← possible 3rd-field extension
    ↓ computes {generatedDate, isStale, ageDays}
    ↓ returns FreshJobDetail
[ JobDetailSheet: receives FreshJobDetail ]
    ↓ renders sections bottom-up
    ↓ <SectionErrorBoundary section="salary_intelligence">
    ↓   <SalaryIntelligenceSection salary={detail.salary_intelligence ?? null} />  ← PHASE 22 ADDS
    ↓     branch: null → "No salary intelligence yet." (EMPTY_STATE_COPY)
    ↓     branch: populated → [headline row with 3-5 figures + tags] + [Streamdown(llm_analysis)]
    ↓
[ Provenance tags on every formatSalary( in job-detail-sheet.tsx ]  ← PHASE 22 ADDS
    ↓   header salary → <Badge variant="outline" text-muted-foreground>[scraped]</Badge>
    ↓   company research salary → <Badge variant="outline" text-success>[company research]</Badge>
    ↓   salary intel headline figures → <Badge variant="outline" text-warning>[LLM estimate]</Badge>
    ↓
[ `?? "USD"` removed at jobs-db.ts:349 ]  ← PHASE 22 ADDS
    ↓ null currency → block hides entirely in renderer's truthy guard
```

### Recommended Project Structure (edits vs new files)

```
src/
├── app/(admin)/admin/jobs/
│   ├── job-detail-sheet.tsx                   EDIT — mount + 3 provenance-tag wirings + 1 currency edit cascade
│   ├── salary-intelligence-section.tsx        NEW — mirror tailored-resume-section.tsx
│   ├── tailored-resume-section.tsx            (unchanged — but its analog shape is the template)
│   ├── freshness-badge.tsx                    (unchanged — Phase 22 reuses as-is)
│   └── section-error-boundary.tsx             (unchanged — Phase 22 wraps new section)
├── lib/
│   ├── jobs-db.ts                             EDIT — SalaryIntelligence interface + LEFT JOIN LATERAL + parseOrLog + `?? "USD"` removal
│   ├── jobs-schemas.ts                        EDIT — SalaryIntelligenceSchema
│   ├── empty-state-copy.ts                    EDIT — add salary_intelligence key
│   ├── attach-freshness.ts                    (possibly EDIT — if search_date dispatch extends dual-field to tri-field)
│   ├── provenance.ts                          NEW (recommended) — provenanceColor/Label pure functions
│   ├── job-actions.ts                         EDIT — extend fetchJobDetail's attachFreshness call for salary_intelligence
│   └── job-freshness.ts                       (already has STALE_THRESHOLDS.salary_intelligence = 30 — unchanged)
├── components/
│   └── ui/                                    (unchanged — reuses existing Badge + Tooltip)
├── __tests__/
│   ├── lib/
│   │   ├── jobs-schemas-salary.test.ts        NEW — SalaryIntelligenceSchema fail-open cases
│   │   ├── jobs-db-salary.test.ts             NEW — LEFT JOIN LATERAL null-today case
│   │   └── provenance.test.ts                 NEW (if extracted) — provenanceColor/Label pure cases
│   └── components/
│       └── salary-intelligence-section.test.tsx   NEW — null/empty/populated/unrecognized-JSON + grep-gate test
└── ... (other unchanged)

scripts/
└── check-jobs-schema.ts                       EDIT — EXPECTED map gains salary_intelligence entry (7 columns)
```

### Pattern 1: parseOrLog wraps the artifact at the boundary

**What:** Every LLM artifact reads through `parseOrLog(Schema, raw, label, jobId)` at the `getJobDetail` return. On Zod parse failure: `console.error('[jobs-db] <label> schema drift', {jobId, issues})` and return `null` for that nested artifact. Page stays alive.

**When to use:** Every Phase 22 DB row read.

**Example** (directly from `src/lib/jobs-schemas.ts:70-86`):
```ts
export function parseOrLog<T>(
  schema: z.ZodType<T>,
  raw: unknown,
  label: string,
  jobId: number
): T | null {
  if (raw === null || raw === undefined) return null;
  const result = schema.safeParse(raw);
  if (!result.success) {
    console.error(`[jobs-db] ${label} schema drift`, {
      jobId,
      issues: result.error.issues,
    });
    return null;
  }
  return result.data;
}
```

### Pattern 2: LEFT JOIN for LLM artifact, LEFT JOIN LATERAL for "most recent" semantics

**What:** Phase 20's cover-letter / tailored-resume LEFT JOINs do a simple `ON cl.job_id = j.id` match. Phase 22's salary_intelligence has no `job_id` column and is keyed on `search_date` with at-most-one row per day — the "latest" pointer. LATERAL with `LIMIT 1 ORDER BY search_date DESC` gives the newest scan while still expressing "zero-or-one row per job."

**When to use:** Phase 22's new JOIN, and any future JOIN where the target table has a natural time-series key (instead of a direct foreign key to jobs).

**Example** (Phase 22 skeleton):
```sql
LEFT JOIN LATERAL (
  SELECT id AS si_id,
         search_date AS si_search_date,
         report_json AS si_report_json,
         raw_results AS si_raw_results,
         llm_analysis AS si_llm_analysis,
         created_at AS si_created_at,
         updated_at AS si_updated_at
  FROM salary_intelligence si
  WHERE FALSE   -- Phase 22 default: zero matches; tighten predicate when task #11 lands
  ORDER BY search_date DESC
  LIMIT 1
) si ON TRUE
```

When task #11 lands and `report_json` exposes a recognizable key (e.g., `report_json->>'company_name' ILIKE j.company`), swap `WHERE FALSE` for the real predicate — **1-line edit**.

### Pattern 3: Section shell = always-render; body = 3-way branch

**What:** Plan 21-06 locked the posture — the section heading always renders; the body branches on (null row) / (empty body) / (populated). This keeps the detail sheet a predictable shape regardless of pipeline state.

**When to use:** Every new LLM-artifact section, including Phase 22's SalaryIntelligenceSection.

**Example** (directly from `src/app/(admin)/admin/jobs/tailored-resume-section.tsx:75-104`):
```tsx
export function TailoredResumeSection({ resume, jobId }: Props) {
  const [copied, setCopied] = useState(false); // hook hoisted above early returns

  if (resume === null) {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-semibold flex items-center gap-1.5">
          <FileText className="size-4" />
          Tailored Resume
        </h3>
        <p className="text-sm text-muted-foreground italic">
          {EMPTY_STATE_COPY.tailored_resume.missing}
        </p>
      </div>
    );
  }

  if (!resume.content?.trim()) {
    return (/* empty-body branch identical shape */);
  }

  // populated branch
  return (/* rich render */);
}
```

Phase 22's `SalaryIntelligenceSection` should follow this exact shape with `llm_analysis?.trim()` as the empty-body predicate.

### Pattern 4: Pure function pair for scale/classification mapping (Plan 21-05)

**What:** `scoreColor(n): string` and `scoreLabel(n): QualityLabel` pair — pure, zero-import, deterministic, testable in isolation. Classification functions that return a Tailwind token class.

**When to use:** Whenever a color decision spans 3+ bands AND the label wording appears in tooltips.

**Example** (directly from `src/lib/score-color.ts:26-36`):
```ts
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

Phase 22 proposal: `provenanceColor(source: ProvenanceSource): string` + `provenanceLabel(source: ProvenanceSource): string` in `src/lib/provenance.ts`.

### Anti-Patterns to Avoid

- **Don't treat the JOIN LATERAL subquery as a "JOIN optimization."** It's a semantic difference — "most recent per job" — not a perf win. Misusing it as a plain join when there's no ordering need is needless complexity.
- **Don't narrow the Zod schema for `report_json` before task #11 produces real rows.** `z.object({min: z.number(), max: z.number()})` will reject real-world data with unexpected keys and null-out the entire row under fail-open. D-01 says loose, and loose means loose — `z.unknown()` is fine.
- **Don't add `rehype-raw` to Streamdown's plugin chain.** The XSS regression test at `tailored-resume-xss.test.tsx:37` requires `<Streamdown skipHtml linkSafety={{ enabled: false }}>` exactly. `rehype-raw` + `skipHtml` combined is undefined behavior and defeats the sanitizer.
- **Don't render `raw_results`.** It's a text dump of web-search result JSON — the LLM consumed it, the owner shouldn't have to.
- **Don't add a `<Separator />` between salary figures and their provenance tags.** D-11 says "inline after figure, thin space" — visual grouping is the signal, not a divider.
- **Don't use `z.string().url()` anywhere the row shape is still unknown.** Phase 21 D-23 decision — one bad URL fails the whole safeParse and nulls out the row. Same posture here.
- **Don't hardcode `text-red-500` / `text-green-500` / `text-amber-500` anywhere.** CLAUDE.md §Color System + Plan 21-07 grep gate — must use semantic tokens.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Markdown rendering of `llm_analysis` | `react-markdown` + hand-picked plugin list | `streamdown@2.5.0` with `skipHtml linkSafety={{ enabled: false }}` — already installed | Locked at Phase 20; XSS regression test covers the security surface |
| Zod fail-open wrapping | Custom try/catch per artifact | `parseOrLog<T>` helper in `jobs-schemas.ts` | Already handles null/undefined passthrough + logs + jobId context |
| Empty-state copy map | Inline strings in each component | Extend `EMPTY_STATE_COPY` in `src/lib/empty-state-copy.ts` | Grepable for tests + future i18n + tone-contract consistency |
| Freshness computation (date formatting + stale flag) | New date-math per section | `attachFreshness<T>` in `src/lib/attach-freshness.ts` | Already handles America/Chicago + NaN-silent + generated_at/created_at dual dispatch; may need 1-line extension for `search_date` |
| Provenance tag with 4 sources | Per-site inline `<Badge>` with color className | Extract `provenanceColor(src)` + `provenanceLabel(src)` pure functions (Plan 21-05 precedent) | 4 sources × multiple call sites = extraction pays; reusable for Phase 24 |
| SectionErrorBoundary | New class component | Import existing `SectionErrorBoundary` from `./section-error-boundary` | Plan 20-04 built this; Plan 20-06 wraps every section with it; salary section joins the pattern |
| Schema-drift detection | New pre-push script | Extend `EXPECTED` map in existing `scripts/check-jobs-schema.ts` | Plan 20-08 built this; adding a row is a 4-line diff |
| Per-request CSP nonce | Reinvent or disable | Phase 20's `middleware.ts` already covers `/admin/*` | Inherited Phase 20 posture — no changes needed |
| `requireRole(["owner"])` on data reads | Add to new server action | Phase 22 adds no new server actions; `fetchJobDetail` already gates | Inherited |

**Key insight:** Phase 22's scope is entirely composed of Phase 20/21 primitives + a small amount of net-new code (SalaryIntelligenceSection shell, SalaryIntelligenceSchema, LEFT JOIN LATERAL subquery, provenance.ts). Every "hard" decision was already made. The research conclusion is: don't rebuild anything that's been built — the Phase 22 plan should be small and mostly mechanical.

---

## Runtime State Inventory

Phase 22 is a **greenfield render + schema extension**. No existing runtime state needs migration. For completeness:

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | `salary_intelligence` table exists with 0 rows; no field renames required | No data migration — the 0-row state is the starting line. When task #11 fills rows, the Zod schema accepts them as-is under `z.unknown()`. |
| Live service config | None — n8n workflow fix is out-of-scope (homelab repo) | None |
| OS-registered state | None | None |
| Secrets/env vars | None — reuses existing `JOBS_DATABASE_URL` | None |
| Build artifacts | None | None |

**Nothing found in other categories:** Verified by reading 22-CONTEXT.md §Phase Boundary + CLAUDE.md §Environment Variables + inspection of the code surface. Phase 22 is a pure code/schema phase with zero migration surface.

---

## Common Pitfalls

### Pitfall 1: `?? "USD"` removal cascade breaks existing company_research rendering

**What goes wrong:** Removing `?? "USD"` at `jobs-db.ts:349` (verified actual line — §Currency Handling below) propagates null through `company_research.salary_currency`. If any downstream code relies on the string being non-null (e.g., a `currency.toUpperCase()` call, an implicit string compare), that call crashes.

**Why it happens:** The existing `CompanyResearchSchema` at `jobs-schemas.ts:37` declares `salary_currency: z.string()` — NOT `.nullable()`. When the DB row has `NULL` currency, `?? "USD"` coerces to `"USD"` and the schema passes. Without the default, the parse fails and the entire `company_research` row gets nulled under fail-open.

**How to avoid:**
1. Update `CompanyResearchSchema` at `jobs-schemas.ts:37` from `salary_currency: z.string()` → `salary_currency: z.string().nullable()` **in the same task as the default removal**
2. Update `CompanyResearch` TS interface at `jobs-db.ts:67` from `salary_currency: string` → `salary_currency: string | null`
3. Grep for all `company_research.salary_currency` usages; any that don't have a null-guard must be guarded
4. Add a Vitest case asserting the schema accepts `{..., salary_currency: null, ...}`

**Warning signs:**
- Existing `is-company-research-empty.test.ts` fixture at line 13 uses `salary_currency: "USD"` — fine, schema still accepts strings
- If post-task-11 the test suite starts failing with "Expected string, received null" — that's the cascade

**Phase to address:** Phase 22 — same task as D-12 (`?? "USD"` removal).

### Pitfall 2: Streamdown receives null `llm_analysis` → crash

**What goes wrong:** Streamdown's `children` prop expects a string. Passing `null` or `undefined` may throw. If the salary row exists but `llm_analysis` is null (which is a valid DB state — raw_results populated, llm_analysis not yet generated), the component crashes.

**Why it happens:** D-06 says "body = Streamdown llm_analysis prose" without specifying the null case. `TailoredResumeSection` uses `resume.content?.trim()` as a guard AND narrows the type — salary needs the same guard.

**How to avoid:**
- Populated branch predicate: `salary && salary.llm_analysis?.trim()` → render Streamdown
- Empty-body branch predicate: `salary && !salary.llm_analysis?.trim() && !hasRecognizableHeadlineFigures(salary.report_json)` → render empty-state copy
- Mix: populated with headline figures but no prose → render headline row only (structured headlines only) — NO Streamdown mount

**Warning signs:**
- Test fixture with `{ llm_analysis: null, report_json: {...} }` renders the Streamdown `<div>` — should instead render only the structured row

**Phase to address:** Phase 22 — task creating SalaryIntelligenceSection.

### Pitfall 3: Structured headline row detection logic scanning unknown JSON

**What goes wrong:** D-06 says "IF the schema parser can extract recognizable min/median/max OR p25/p50/p75 fields." Since `report_json` is `z.unknown()`, the detection is runtime duck-typing. Naive `json.min` access breaks when `report_json` is a string (`"some text"`), a number, an array, `null`, or a nested shape like `{ report: { ... } }`.

**Why it happens:** `report_json` is JSONB. It could be anything the LLM emits. Task #11 hasn't produced real rows, so we're designing defensively against a shape we haven't seen.

**How to avoid:**
1. Write a pure predicate `hasRecognizableHeadlineFigures(raw: unknown): raw is RecognizedFigures` that type-guards the shape BEFORE accessing fields
2. Accepted shapes (Claude's discretion during planning — recommend supporting):
   - `{ min: number, median: number, max: number, currency?: string }`
   - `{ p25: number, p50: number, p75: number, currency?: string }`
   - `{ min: number, max: number, currency?: string }` (2-figure fallback)
3. Every access wrapped in `typeof x === "number"` check; non-number values are skipped silently
4. Unrecognized shape → return `false`, section renders prose-only

**Warning signs:**
- Section throws on `report_json = "malformed"` or `report_json = []`
- Section renders `NaN` anywhere — number coercion failed

**Phase to address:** Phase 22 — task creating SalaryIntelligenceSection.

### Pitfall 4: Grep gate catches provenance tags but misses currency edits

**What goes wrong:** D-11's grep-verifiable acceptance ("every `formatSalary(` followed within 5 lines by `<Badge variant="outline"`") is satisfied — but the `?? "USD"` removal (D-12) is subtler. There are 3 `salary_currency`-referencing edits needed (interface, schema, db row assembly); missing any one creates a broken state where the type says "always string" but runtime emits null.

**Why it happens:** Two orthogonal D-decisions share a cascading edit surface. A developer thinks "I removed the `?? "USD"` per D-12, done" — without touching the schema definition.

**How to avoid:** Planner checklist for the currency-handling task must include ALL THREE edits:
1. `jobs-db.ts:349` — remove `?? "USD"` (becomes `row.cr_salary_currency`)
2. `jobs-db.ts:67` — `salary_currency: string` → `salary_currency: string | null` on `CompanyResearch` interface
3. `jobs-schemas.ts:37` — `salary_currency: z.string()` → `salary_currency: z.string().nullable()`
4. Add a Vitest case: `CompanyResearchSchema.safeParse({...valid, salary_currency: null}).success === true`

**Warning signs:**
- Build green but runtime throws "Expected string, received null" on first real null-currency row
- `is-company-research-empty.test.ts` still passes because it uses `salary_currency: "USD"` — misleading signal

**Phase to address:** Phase 22 — task for currency handling.

### Pitfall 5: Provenance tag on header salary disagrees with source feed

**What goes wrong:** D-09 says `jobs.salary_min/max` → "scraped" provenance. But which feed? `jobs.source` is one of: jobicy, remoteok, himalayas, arbeitnow, workingnomads, serpapi_google, remotive. The Pitfalls §5 language says `$120K - $180K (Remoteok)` — the feed name enriches the tag.

**Why it happens:** The locked D-09 wording is "scraped" (one label). Pitfalls research suggests richer label. Planner must decide.

**How to avoid:**
- **Recommended:** keep D-10's simpler label ("scraped") for Phase 22; display feed only in the tooltip (richer explanation). Rationale: 4 provenance classes × 7 feeds = 28 visual states. The header-meta row is already dense; keeping the badge text short preserves scannability.
- If enriching with feed name, `sourceColors` map in `columns.tsx:45-53` provides the mapping.

**Warning signs:**
- Tag text is too long for the 512px sheet width — overflow
- Tooltip is a verbose repeat of the badge — wasted affordance

**Phase to address:** Phase 22 — task extracting provenance helpers.

### Pitfall 6: FreshnessBadge dual-field dispatch misses `search_date`

**What goes wrong:** `attach-freshness.ts:34-37` dispatches on `"generated_at" in artifact`. SalaryIntelligence has neither `generated_at` nor `created_at` as "when the market was sampled" — `search_date` is that signal. `created_at` is "when we persisted the row."

Today's dispatch fails silently — neither branch matches → the `in` check returns false → type narrows to the `created_at` branch → accesses `.created_at` (which DOES exist on `salary_intelligence`) → uses persistence time instead of sample time. Owner sees the stale indicator based on when we wrote the row, not when the market was scanned.

**Why it happens:** Dual-field dispatch was a 2-case pattern; 3 cases needs either a selector arg or a 3-way dispatch.

**How to avoid (Claude's discretion per CONTEXT.md §Discretion):**
- **Option A (recommended):** Extend `attach-freshness.ts` to accept an optional `fieldName` parameter: `attachFreshness(artifact, thresholdDays, fieldName?: "generated_at" | "created_at" | "search_date")`. Default keeps existing dispatch; explicit override for salary.
- **Option B:** In the `SalaryIntelligence` TS shape, alias: expose `.generated_at` (or similar) pointing to `search_date` string. Keeps caller ignorant but changes the data shape.
- **Option C:** Use `created_at` anyway — semantically wrong but simpler. Reject unless owner accepts.

**Recommended:** Option A. 3-line edit in `attach-freshness.ts`, explicit at the call site in `job-actions.ts:68`.

**Warning signs:**
- Salary section badge shows a stale marker from persistence time (row 30 days old in DB) when the market was sampled 5 days ago
- Owner asks "why is the salary badge amber when I just triggered the workflow this morning?"

**Phase to address:** Phase 22 — task wiring freshness to the new section.

---

## Data Layer (AI-DATA-01 + AI-DATA-02)

### SalaryIntelligence Zod Schema — recommended shape

Location: `src/lib/jobs-schemas.ts` (append after `TailoredResumeSchema`, before `parseOrLog`).

```ts
/**
 * Zod schema for salary_intelligence rows.
 *
 * Per CONTEXT.md D-01, schema is deliberately permissive today:
 *   - report_json: z.unknown() — shape depends on whatever task #11 ships
 *   - llm_analysis: z.string().nullable() — may be null if workflow generated
 *     raw_results but not the final prose
 *
 * Other columns match live-DB types (pg driver coerces integer / date /
 * timestamp / text / jsonb appropriately; ISO string for dates after
 * .toISOString() in jobs-db.ts, per the CoverLetter/TailoredResume pattern).
 */
export const SalaryIntelligenceSchema = z.object({
  id: z.number(),
  search_date: z.string(),         // ISO date string after .toISOString() in jobs-db.ts
  report_json: z.unknown(),         // loose — tighten after task #11 produces real rows
  raw_results: z.string().nullable(),
  llm_analysis: z.string().nullable(),
  created_at: z.string(),           // ISO string
  updated_at: z.string().nullable(), // updated_at may be null on first insert
});

export type SalaryIntelligence = z.infer<typeof SalaryIntelligenceSchema>;
```

**Decision:** Use `z.infer` to derive the TS type from the schema (matches Plan 20-03 posture). **DO NOT** hand-write a parallel interface — schema is source of truth.

### parseOrLog extension — no signature change needed

Plan 20-03's `parseOrLog<T>` is already generic. Phase 22 adds one new call site in `getJobDetail`:

```ts
const salaryIntelligence = parseOrLog(
  SalaryIntelligenceSchema,
  row.si_id
    ? {
        id: row.si_id,
        search_date: row.si_search_date?.toISOString?.() ?? row.si_search_date,
        report_json: row.si_report_json,
        raw_results: row.si_raw_results,
        llm_analysis: row.si_llm_analysis,
        created_at: row.si_created_at?.toISOString?.() ?? row.si_created_at,
        updated_at: row.si_updated_at?.toISOString?.() ?? row.si_updated_at,
      }
    : null,
  "salary_intelligence",
  jobId
);
```

### getJobDetail LEFT JOIN LATERAL — exact SQL shape Phase 22 ships today

Insert inside the SELECT columns (after `tr_generated_at` on line 310):
```sql
       si.id AS si_id, si.search_date AS si_search_date,
       si.report_json AS si_report_json,
       si.raw_results AS si_raw_results,
       si.llm_analysis AS si_llm_analysis,
       si.created_at AS si_created_at,
       si.updated_at AS si_updated_at
```

Insert inside the FROM/JOIN block (after the `tailored_resumes` LEFT JOIN on line 314):
```sql
     LEFT JOIN LATERAL (
       SELECT * FROM salary_intelligence
       WHERE FALSE  -- TODO: tighten predicate post-task-#11 (see Phase 22 Ref: D-03)
       ORDER BY search_date DESC
       LIMIT 1
     ) si ON TRUE
```

**When task #11 lands:** The 1-line edit pattern for the predicate is:
```sql
     LEFT JOIN LATERAL (
       SELECT * FROM salary_intelligence si
       WHERE si.report_json->>'company_name' ILIKE j.company
          OR si.report_json->>'job_id' = j.id::text
       ORDER BY si.search_date DESC
       LIMIT 1
     ) si ON TRUE
```

Planner validates the real predicate during Task 0 against the first real `report_json` row.

### SalaryIntelligence TypeScript interface + JobDetail extension

Add to `jobs-db.ts` types block (after `TailoredResume` at line 82):

```ts
export interface SalaryIntelligence {
  id: number;
  search_date: string;
  report_json: unknown; // shape TBD post-task-11
  raw_results: string | null;
  llm_analysis: string | null;
  created_at: string;
  updated_at: string | null;
}
```

Extend `JobDetail` (line 84-90):
```ts
export interface JobDetail extends Job {
  description: string | null;
  company_url: string | null;
  cover_letter: CoverLetter | null;
  company_research: CompanyResearch | null;
  tailored_resume: TailoredResume | null;
  salary_intelligence: SalaryIntelligence | null;  // NEW
}
```

Extend `FreshJobDetail` (line 104-109):
```ts
export interface FreshJobDetail
  extends Omit<JobDetail, "cover_letter" | "tailored_resume" | "company_research" | "salary_intelligence"> {
  cover_letter: (CoverLetter & { freshness: ArtifactFreshness }) | null;
  tailored_resume: (TailoredResume & { freshness: ArtifactFreshness }) | null;
  company_research: (CompanyResearch & { freshness: ArtifactFreshness }) | null;
  salary_intelligence: (SalaryIntelligence & { freshness: ArtifactFreshness }) | null;  // NEW
}
```

Extend `fetchJobDetail` in `src/lib/job-actions.ts:58-72`:
```ts
salary_intelligence: attachFreshness<SalaryIntelligence>(
  detail.salary_intelligence,
  STALE_THRESHOLDS.salary_intelligence,  // already 30 per job-freshness.ts:22
  "search_date"  // optional 3rd arg — extends attach-freshness.ts dual-field dispatch; see Pitfall 6
),
```

### `?? "USD"` removal — ACTUAL LINE IS 349 (verified 2026-04-22)

**ROADMAP SC #5 says line 328 — STALE by 21 lines.**
**CONTEXT.md D-12 notes line 347 — STALE by 2 lines.**
**Actual line as of Phase 21 close: `src/lib/jobs-db.ts:349`.**

Current text:
```ts
          salary_currency: row.cr_salary_currency ?? "USD",
```

Phase 22 edit:
```ts
          salary_currency: row.cr_salary_currency,
```

**Cascade edits required** (see Pitfalls §1 + §4):
1. `src/lib/jobs-db.ts:67` — `CompanyResearch.salary_currency: string` → `string | null`
2. `src/lib/jobs-schemas.ts:37` — `salary_currency: z.string()` → `salary_currency: z.string().nullable()`
3. Renderer guards — `job-detail-sheet.tsx:321-329` salary block is already truthy-guarded on `(salary_range_min || salary_range_max)`; salary hides when both are null. But verify that a `null` currency doesn't crash Intl formatting (currently no Intl used — formatSalary hardcodes `$` at `job-detail-sheet.tsx:49`, which means the current code is currency-agnostic; removing the default has no visible user-impact today. The block hides when *range* is null, not when currency is null.)

**Behavioral implication:** The immediate user-visible effect of this single edit is negligible because `formatSalary` doesn't read `salary_currency`. The change is **purely defensive** — ensuring future code that DOES want to display currency fails open (type as null, schema valid, block hides) instead of mis-labeling. This aligns with D-12 intent but should be documented in the plan so there's no confusion about "where's the visible change?"

**Verification command:**
```bash
grep -n 'salary_currency ?? "USD"' src/lib/jobs-db.ts
# Expected after Phase 22: 0 matches
```

---

## Rendering Layer (AI-RENDER-03)

### SalaryIntelligenceSection signature

Location: `src/app/(admin)/admin/jobs/salary-intelligence-section.tsx` (NEW).

```tsx
"use client";

import { DollarSign } from "lucide-react";
import { Streamdown } from "streamdown";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { FreshnessBadge } from "./freshness-badge";
import { EMPTY_STATE_COPY } from "@/lib/empty-state-copy";
import { provenanceColor, provenanceLabel } from "@/lib/provenance";  // NEW — see §Provenance Tags

export interface SalaryFreshness {
  generatedDate: string;
  isStale: boolean;
  ageDays: number;
}

export interface SalaryIntelligenceView {
  llm_analysis: string | null;
  report_json: unknown;
  freshness: SalaryFreshness;
}

interface Props {
  salary: SalaryIntelligenceView | null;
}

export function SalaryIntelligenceSection({ salary }: Props) {
  // D-08: always render section heading
  if (salary === null) {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-semibold flex items-center gap-1.5">
          <DollarSign className="size-4" />
          Salary Intelligence
        </h3>
        <p className="text-sm text-muted-foreground italic">
          {EMPTY_STATE_COPY.salary_intelligence.missing}
        </p>
      </div>
    );
  }

  const hasProse = salary.llm_analysis?.trim();
  const headlineFigures = extractHeadlineFigures(salary.report_json); // returns null or RecognizedFigures

  // Generated-but-empty branch: neither prose nor recognized figures
  if (!hasProse && !headlineFigures) {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-semibold flex items-center gap-1.5">
          <DollarSign className="size-4" />
          Salary Intelligence
        </h3>
        <p className="text-sm text-muted-foreground italic">
          {EMPTY_STATE_COPY.salary_intelligence.empty}
        </p>
      </div>
    );
  }

  // Populated branch
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-1.5">
          <DollarSign className="size-4" />
          Salary Intelligence
        </h3>
        <FreshnessBadge
          generatedDate={salary.freshness.generatedDate}
          modelUsed={null}  {/* salary_intelligence has no model_used column */}
          isStale={salary.freshness.isStale}
          ageDays={salary.freshness.ageDays}
        />
      </div>
      {headlineFigures && (
        <div className="flex items-center gap-3 flex-wrap text-sm">
          {headlineFigures.map(({ label, amount, currency }) => (
            <HeadlineFigure
              key={label}
              label={label}
              amount={amount}
              currency={currency}
              provenance="llm_estimate"
            />
          ))}
        </div>
      )}
      {hasProse && (
        <div className="text-sm text-muted-foreground bg-card/50 rounded-lg p-4 border border-border max-h-96 overflow-y-auto">
          <Streamdown skipHtml linkSafety={{ enabled: false }}>
            {salary.llm_analysis!}
          </Streamdown>
        </div>
      )}
    </div>
  );
}

// Pure — move to src/lib/salary-report.ts during planning if complexity grows
function extractHeadlineFigures(raw: unknown): RecognizedFigures | null {
  // See Pitfall 3 for the type guard; returns null when shape unrecognized
  // ...
}
```

### Streamdown config to reuse

Verified from `src/app/(admin)/admin/jobs/tailored-resume-section.tsx:167` and `src/__tests__/components/tailored-resume-xss.test.tsx:37`:

```tsx
<Streamdown skipHtml linkSafety={{ enabled: false }}>
  {salary.llm_analysis}
</Streamdown>
```

**Both props are load-bearing:**
- `skipHtml` — strips `<script>`, `<iframe>`, and replaces `<img onerror>` with "[Image blocked]" placeholder (verified behavior per `tailored-resume-xss.test.tsx:15-18`). Without it, raw HTML is parsed via default `rehype-raw`.
- `linkSafety={{ enabled: false }}` — disables Streamdown's link-confirmation modal (owner-only admin surface; friction without value).

**No new Streamdown version install required — 2.5.0 already pinned (Phase 20-01).**

### Structured headline row detection logic (D-06)

Pure function, guards against arbitrary JSON shapes:

```ts
interface RecognizedFigure {
  label: string;       // e.g., "min", "median", "max", "p25", "p50", "p75"
  amount: number;      // dollars (trust the LLM's figure)
  currency: string;    // e.g., "USD"; fallback to "USD" per D-12 NOT — trust report or use "" if missing
}

type RecognizedFigures = RecognizedFigure[];

export function extractHeadlineFigures(raw: unknown): RecognizedFigures | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const json = raw as Record<string, unknown>;
  const currency = typeof json.currency === "string" ? json.currency : "USD";  // trust report or default

  // Shape 1: min/median/max
  if (
    typeof json.min === "number" &&
    typeof json.max === "number"
  ) {
    const out: RecognizedFigure[] = [{ label: "min", amount: json.min, currency }];
    if (typeof json.median === "number") out.push({ label: "median", amount: json.median, currency });
    out.push({ label: "max", amount: json.max, currency });
    return out;
  }

  // Shape 2: percentiles
  if (
    typeof json.p25 === "number" &&
    typeof json.p50 === "number" &&
    typeof json.p75 === "number"
  ) {
    return [
      { label: "p25", amount: json.p25, currency },
      { label: "p50", amount: json.p50, currency },
      { label: "p75", amount: json.p75, currency },
    ];
  }

  return null;
}
```

**Unit test fixtures** (exhaustive — see §Testing Strategy):
- `null` → null
- `undefined` → null
- `"malformed"` → null
- `42` → null
- `[]` → null
- `{}` → null
- `{ min: 100, max: 200 }` → 2-figure array (no median)
- `{ min: 100, median: 150, max: 200 }` → 3-figure array
- `{ min: 100, median: 150, max: 200, currency: "EUR" }` → 3-figure array with EUR
- `{ p25: 100, p50: 150, p75: 200 }` → 3-percentile array
- `{ min: "100" }` → null (string, not number)
- `{ min: 100, max: NaN }` → rejected — this is actually `typeof NaN === "number"` = true so it would pass; add explicit `Number.isFinite` guard if planner wants
- `{ nested: { min: 100 } }` → null (no top-level min)

### FreshnessBadge wiring — attach-freshness.ts extension

Current `attach-freshness.ts:28-37` dispatches on:
```ts
"generated_at" in artifact
  ? (artifact as { generated_at: string }).generated_at
  : (artifact as { created_at: string }).created_at
```

SalaryIntelligence has **both** `created_at` AND a semantically-preferred `search_date`. Per Pitfall 6, recommended approach is an optional 3rd argument:

```ts
export function attachFreshness<T extends Record<string, unknown>>(
  artifact: T | null,
  thresholdDays: number,
  fieldName?: "generated_at" | "created_at" | "search_date"
): (T & { freshness: ArtifactFreshness }) | null {
  if (!artifact) return null;
  const resolvedField = fieldName ??
    ("generated_at" in artifact ? "generated_at" : "created_at");
  const iso = artifact[resolvedField] as string | undefined;
  // ... rest unchanged
}
```

Call site in `job-actions.ts:68-71`:
```ts
salary_intelligence: attachFreshness<SalaryIntelligence>(
  detail.salary_intelligence,
  STALE_THRESHOLDS.salary_intelligence,
  "search_date"
),
```

**Alternative (Claude's discretion):** Use `created_at` — accepts the semantic imprecision (stale-on-persistence-time instead of stale-on-scan-time). The 30-day threshold mostly-aligns either way. If planner picks this, no `attach-freshness.ts` edit needed.

### Empty-state extension — exact EMPTY_STATE_COPY addition

Append to `src/lib/empty-state-copy.ts` (inside the `as const` object, after `company_research`):

```ts
  salary_intelligence: {
    missing: "No salary intelligence yet.",
    empty: "Salary intelligence was generated but is empty.",
  },
```

**Full file after edit:**
```ts
export const EMPTY_STATE_COPY = {
  cover_letter: {
    missing: "No cover letter yet.",
    empty: "Cover letter was generated but is empty.",
  },
  tailored_resume: {
    missing: "No tailored resume yet.",
    empty: "Tailored resume was generated but is empty.",
  },
  company_research: {
    missing: "No company research yet.",
    empty: "Company research was generated but is empty.",
  },
  salary_intelligence: {
    missing: "No salary intelligence yet.",
    empty: "Salary intelligence was generated but is empty.",
  },
} as const;
```

Tone contract: D-08 locks "direct, state-only. No CTAs." Matches existing three entries verbatim.

### Placement in job-detail-sheet.tsx — exact JSX location

Current structure (lines 176-352):
```
<SectionErrorBoundary section="cover_letter">...</SectionErrorBoundary>
<Separator />
<SectionErrorBoundary section="tailored_resume"><TailoredResumeSection /></SectionErrorBoundary>
<Separator />
<SectionErrorBoundary section="company_research">...</SectionErrorBoundary>
```

Phase 22 insertion (between `tailored_resume` and `company_research`, per D-05):
```tsx
              <Separator />
              <SectionErrorBoundary section="tailored_resume" jobId={detail.id}>
                <TailoredResumeSection jobId={detail.id} resume={...} />
              </SectionErrorBoundary>

              {/* NEW — Phase 22 */}
              <Separator />
              <SectionErrorBoundary section="salary_intelligence" jobId={detail.id}>
                <SalaryIntelligenceSection
                  salary={
                    detail.salary_intelligence
                      ? {
                          llm_analysis: detail.salary_intelligence.llm_analysis,
                          report_json: detail.salary_intelligence.report_json,
                          freshness: detail.salary_intelligence.freshness,
                        }
                      : null
                  }
                />
              </SectionErrorBoundary>

              <Separator />
              <SectionErrorBoundary section="company_research" jobId={detail.id}>
                {/* existing */}
              </SectionErrorBoundary>
```

**Note on `SectionErrorBoundary` `section` prop:** Verify the boundary accepts `"salary_intelligence"` as a section label. Plan 20-04 shipped it with typed `section` param; check the type annotation at `src/app/(admin)/admin/jobs/section-error-boundary.tsx` during planning and extend if necessary.

---

## Provenance Tags (AI-RENDER-07)

### Complete list of dollar-figure render sites

Grep result verified 2026-04-22:
```
src/app/(admin)/admin/jobs/job-detail-sheet.tsx:47:function formatSalary(min: number | null, max: number | null)   [definition]
src/app/(admin)/admin/jobs/job-detail-sheet.tsx:158: formatSalary(detail.salary_min, detail.salary_max) && (...)    [header guard]
src/app/(admin)/admin/jobs/job-detail-sheet.tsx:161: {formatSalary(detail.salary_min, detail.salary_max)}           [header render — PROVENANCE REQUIRED]
src/app/(admin)/admin/jobs/job-detail-sheet.tsx:325: {formatSalary(                                                 [company research render — PROVENANCE REQUIRED]
src/app/(admin)/admin/jobs/job-detail-sheet.tsx:326:   detail.company_research.salary_range_min,
src/app/(admin)/admin/jobs/job-detail-sheet.tsx:327:   detail.company_research.salary_range_max
src/app/(admin)/admin/jobs/job-detail-sheet.tsx:328: )}
```

**Distinct render sites in `job-detail-sheet.tsx`:**
1. **Line 158-163 — Job header salary** — `detail.salary_min/salary_max` (source = the scrape feed, `detail.source`)
   → Provenance: **"scraped"** — `text-muted-foreground` badge
2. **Line 321-329 — Company Intel salary range** — `detail.company_research.salary_range_min/salary_range_max`
   → Provenance: **"company research"** — `text-success` badge
3. **NEW Phase 22: SalaryIntelligenceSection headline row** — up to 5 figures from `report_json` (min/median/max or p25/p50/p75)
   → Provenance: **"LLM estimate"** — `text-warning` badge

**`columns.tsx` has a second `formatSalary`** (line 33) used in the table — OUT of Phase 22 scope (the phase is scoped to the job DETAIL sheet per D-11 wording: "every occurrence of `formatSalary(` in `job-detail-sheet.tsx`"). Planner should confirm with owner whether columns-level tags are needed; research recommendation is NO for Phase 22 to keep the scope tight.

### Badge + tooltip JSX shape

**Recommended:** Extract a `<ProvenanceTag>` component in the same file or `src/app/(admin)/admin/jobs/provenance-tag.tsx`:

```tsx
"use client";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { provenanceColor, provenanceLabel, provenanceTooltip, type ProvenanceSource } from "@/lib/provenance";

interface Props {
  source: ProvenanceSource;
  /** Optional feed name for enrichment (e.g., "remoteok" for scraped) */
  feedName?: string | null;
}

export function ProvenanceTag({ source, feedName }: Props) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          variant="outline"
          className={`text-[10px] ${provenanceColor(source)} cursor-default ml-[0.25em]`}
        >
          {provenanceLabel(source)}
        </Badge>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs max-w-[240px]">
        {provenanceTooltip(source, feedName)}
      </TooltipContent>
    </Tooltip>
  );
}
```

**Inline usage example** at `job-detail-sheet.tsx:158-163`:
```tsx
{formatSalary(detail.salary_min, detail.salary_max) && (
  <span className="flex items-center gap-1">
    <DollarSign className="size-3.5" />
    {formatSalary(detail.salary_min, detail.salary_max)}
    <ProvenanceTag source="scraped" feedName={detail.source} />
  </span>
)}
```

### Provenance color mapping — final proposal

Location: `src/lib/provenance.ts` (NEW).

```ts
/**
 * Provenance-tag classification helpers (AI-RENDER-07).
 *
 * Four provenance sources per CONTEXT.md D-09:
 *   - "scraped"          — from jobs.salary_min/max (feed data)
 *   - "llm_estimate"     — from salary_intelligence.report_json (LLM output)
 *   - "company_research" — from company_research.salary_range_* (LLM-researched)
 *   - "original_posting" — reserved for direct quote from job description
 *
 * Color mapping (CONTEXT.md D-10): color ≈ confidence.
 *   - scraped          → text-muted-foreground (lowest trust; feed data is inconsistent)
 *   - llm_estimate     → text-warning (estimate, not verified)
 *   - company_research → text-success (higher trust; LLM researched from company sources)
 *   - original_posting → text-foreground (highest trust; direct quote from the posting)
 *
 * Labels (tag text, kept short):
 *   - scraped          → "scraped"
 *   - llm_estimate     → "LLM estimate"
 *   - company_research → "company research"
 *   - original_posting → "original posting"
 *
 * Tooltip copy (explains the source verbosely):
 *   - scraped          → "Scraped from the {feedName} job listing. Feed data is inconsistent; cross-reference before using in negotiations."
 *   - llm_estimate     → "Estimated by the salary-intelligence LLM workflow. Not verified against primary sources."
 *   - company_research → "Researched by the company-research LLM workflow from sources including Glassdoor and Levels.fyi."
 *   - original_posting → "Quoted directly from the job posting description."
 *
 * Pure functions — hydration-safe, zero imports, testable in isolation.
 */
export type ProvenanceSource = "scraped" | "llm_estimate" | "company_research" | "original_posting";

export function provenanceColor(source: ProvenanceSource): string {
  switch (source) {
    case "scraped":          return "text-muted-foreground";
    case "llm_estimate":     return "text-warning";
    case "company_research": return "text-success";
    case "original_posting": return "text-foreground";
  }
}

export function provenanceLabel(source: ProvenanceSource): string {
  switch (source) {
    case "scraped":          return "scraped";
    case "llm_estimate":     return "LLM estimate";
    case "company_research": return "company research";
    case "original_posting": return "original posting";
  }
}

export function provenanceTooltip(source: ProvenanceSource, feedName?: string | null): string {
  switch (source) {
    case "scraped":
      return `Scraped from the ${feedName ?? "job"} listing. Feed data is inconsistent; cross-reference before using.`;
    case "llm_estimate":
      return "Estimated by the salary-intelligence LLM workflow. Not verified against primary sources.";
    case "company_research":
      return "Researched by the company-research LLM workflow from sources including Glassdoor and Levels.fyi.";
    case "original_posting":
      return "Quoted directly from the job posting description.";
  }
}
```

### Extract pure functions vs inline — recommendation

**Recommend extract.** Three reasons:
1. **Precedent:** Plan 21-05 extracted `scoreColor`/`scoreLabel` at 3 bands / 36 lines. Provenance has 4 sources and 3 functions → strictly larger classification surface.
2. **Reuse:** Phase 24 (regenerate UI) may want provenance on regenerated artifacts. Extracting now keeps the signal shape consistent.
3. **Testability:** Pure functions with exhaustive switch-case are easier to test in isolation than 4-way JSX conditionals.

### Grep-verifiable acceptance regex

Per D-11, Phase 22 must pass:

```bash
# Every formatSalary(..) site in job-detail-sheet.tsx must be within 5 lines of a Badge variant="outline"
# OR be inside a component with provenance tagging.
#
# Complete check:
#   1. For each formatSalary( call, inspect within [call_line, call_line + 5]
#   2. Match at least one <Badge variant="outline" occurrence within that window
#   3. SalaryIntelligenceSection counts as "inside a component with provenance tagging" — treat its figures as covered

grep -nE 'formatSalary\(' src/app/\(admin\)/admin/jobs/job-detail-sheet.tsx
# Expected sites: line 158, 161, 325

# For each site, verify:
awk '/formatSalary\(/ { print NR; for(i=1;i<=5;i++) { getline L; print L } }' \
  src/app/\(admin\)/admin/jobs/job-detail-sheet.tsx | grep 'Badge variant="outline"'
# Expected: at least one hit per formatSalary call site
```

**Additionally** — `columns.tsx` scope decision: Phase 22 does NOT require tagging there (D-11 specifies `job-detail-sheet.tsx` only).

**Automated test assertion** (Vitest) — proposal for `src/__tests__/components/salary-provenance-gate.test.tsx`:
```ts
import { readFileSync } from "fs";

it("every formatSalary( in job-detail-sheet.tsx is followed within 5 lines by Badge variant='outline'", () => {
  const src = readFileSync("src/app/(admin)/admin/jobs/job-detail-sheet.tsx", "utf8");
  const lines = src.split("\n");
  const callLines: number[] = [];
  lines.forEach((l, i) => {
    if (/\bformatSalary\(/.test(l) && !/function formatSalary/.test(l)) callLines.push(i);
  });
  for (const lineIdx of callLines) {
    const window = lines.slice(lineIdx, lineIdx + 5).join("\n");
    expect(window).toMatch(/<Badge variant="outline"|ProvenanceTag/);
  }
});
```

This is a source-based assertion (reads the file as text) — simpler than DOM-level assertions and proves the grep gate.

---

## Currency Handling (SC #5)

### Exact lines to edit (verified 2026-04-22)

| File | Line | Current | After |
|------|------|---------|-------|
| `src/lib/jobs-db.ts` | **349** | `salary_currency: row.cr_salary_currency ?? "USD",` | `salary_currency: row.cr_salary_currency,` |
| `src/lib/jobs-db.ts` | 67 | `salary_currency: string;` (in `CompanyResearch` interface) | `salary_currency: string \| null;` |
| `src/lib/jobs-schemas.ts` | 37 | `salary_currency: z.string(),` | `salary_currency: z.string().nullable(),` |

**ROADMAP SC #5 says line 328 — stale.**
**CONTEXT.md D-12 notes line 347 — stale.**
**Actual line is 349.** Planner should update SC #5 in ROADMAP as part of meta-doc finalization.

### Before/after behavior

**Before:**
- DB has `company_research.salary_currency = NULL` row → jobs-db coerces to `"USD"` → schema passes with string → UI might later render `$120K` on a GBP job.

**After:**
- DB has `company_research.salary_currency = NULL` → jobs-db passes `null` → Zod schema `z.string().nullable()` accepts → UI sees `null` → no crash, no mis-label.
- No visible user-facing change today because `formatSalary` doesn't use currency. Defensive for future currency-aware rendering.

### Test assertions

New Vitest cases in `src/__tests__/lib/jobs-db-zod.test.ts` (append):
```ts
it("CompanyResearchSchema accepts salary_currency: null", () => {
  const raw = { /* ...valid fields... */, salary_currency: null, /* ... */ };
  const result = CompanyResearchSchema.safeParse(raw);
  expect(result.success).toBe(true);
});

it("CompanyResearchSchema rejects salary_currency: number", () => {
  const raw = { /* ...valid fields... */, salary_currency: 42, /* ... */ };
  const result = CompanyResearchSchema.safeParse(raw);
  expect(result.success).toBe(false);
});
```

Existing `is-company-research-empty.test.ts` line 13 (`salary_currency: "USD"`) continues to pass — string remains acceptable.

---

## Schema-Drift Guard (D-04)

### Exact EXPECTED-map entry to add

Location: `scripts/check-jobs-schema.ts` inside the `EXPECTED` const (currently lines 18-48).

Append as new key (alphabetical order vs. jobs-first order — existing map uses logical/jobs-first order; append at end for minimal diff):

```ts
  salary_intelligence: [
    "id", "search_date", "report_json", "raw_results",
    "llm_analysis", "created_at", "updated_at",
  ],
```

**7 columns total**, matches live-DB inspection captured in 22-CONTEXT.md:
```
 id           | integer
 search_date  | date
 report_json  | jsonb
 raw_results  | text
 llm_analysis | text
 created_at   | timestamp with time zone
 updated_at   | timestamp with time zone
```

### Pre-push hook assertion behavior

No changes to hook plumbing — `scripts/install-hooks.sh` + `.git/hooks/pre-push` (from Plan 20-08) both invoke `npm run test:schema` which calls this script. Behavior post-edit:

1. If `JOBS_DATABASE_URL` unset → graceful skip (unchanged from Plan 20-08).
2. If DB reachable and all 7 columns present → `[test:schema] OK — verified 7 tables, 69 columns.` (6 tables → 7 tables; 62 columns → 69 columns).
3. If any column missing from DB (e.g., `salary_intelligence.report_json` removed upstream) → `Expected column 'report_json' on table 'salary_intelligence' (referenced in jobs-db.ts); not found in n8n database.` → exit 1.

**Verification command** (planner can run to confirm):
```bash
# After edit, with JOBS_DATABASE_URL set to dev n8n DB:
npm run test:schema
# Expected: "[test:schema] OK — verified 7 tables, 69 columns."
```

---

## Testing Strategy

### Unit files + cases (new + extended)

**1. `src/__tests__/lib/jobs-schemas-salary.test.ts` (NEW)**

| Test | Expected |
|------|----------|
| Accepts valid row with `llm_analysis: "prose"` + `report_json: {min:100,max:200}` | `success: true` |
| Accepts valid row with `llm_analysis: null` | `success: true` |
| Accepts valid row with `raw_results: null` | `success: true` |
| Accepts valid row with `report_json: null` | `success: true` (z.unknown) |
| Accepts valid row with `report_json: "some arbitrary string"` | `success: true` |
| Accepts valid row with `report_json: [1, 2, 3]` | `success: true` |
| Accepts valid row with `updated_at: null` | `success: true` |
| Rejects row missing `id` | `success: false` |
| Rejects row with `search_date: 12345` (number) | `success: false` |
| Rejects row with `id: "abc"` (string) | `success: false` |
| parseOrLog returns null on Zod failure AND logs with jobId label | assert `console.error` called with `[jobs-db] salary_intelligence schema drift` + jobId |
| parseOrLog returns null passthrough on null input | no log, returns null |

**2. `src/__tests__/lib/jobs-db-zod.test.ts` (EXTEND for currency cascade)**

| Test | Expected |
|------|----------|
| CompanyResearchSchema accepts `salary_currency: null` | `success: true` |
| CompanyResearchSchema accepts `salary_currency: "EUR"` | `success: true` |
| CompanyResearchSchema rejects `salary_currency: 42` | `success: false` |

**3. `src/__tests__/lib/jobs-db-salary.test.ts` (NEW)** — integration-style, mocks `pg.Pool`

| Test | Expected |
|------|----------|
| `getJobDetail(123)` with `salary_intelligence` row absent returns `detail.salary_intelligence === null` (LEFT JOIN LATERAL null today) | assertion passes |
| `getJobDetail(123)` with mocked salary row returns populated `detail.salary_intelligence` with all 7 fields | match fixture |
| `getJobDetail(123)` with malformed `report_json` (e.g., invalid types) returns `detail.salary_intelligence === null` and `console.error` called | fail-open verified |
| `getJobDetail(123)` removes `?? "USD"` default — null currency on company_research row stays null | `detail.company_research.salary_currency === null` |

**4. `src/__tests__/lib/provenance.test.ts` (NEW — if extracted)**

| Test | Expected |
|------|----------|
| `provenanceColor("scraped")` | `"text-muted-foreground"` |
| `provenanceColor("llm_estimate")` | `"text-warning"` |
| `provenanceColor("company_research")` | `"text-success"` |
| `provenanceColor("original_posting")` | `"text-foreground"` |
| `provenanceLabel` for each source | exact label strings |
| `provenanceTooltip("scraped", "remoteok")` | contains `"remoteok"` |
| `provenanceTooltip("scraped", null)` | contains `"job"` (fallback) |
| `provenanceColor` returns one of 4 values × 4 sources — exhaustive | switch-case hits every branch |

**5. `src/__tests__/lib/salary-report.test.ts` (NEW — if `extractHeadlineFigures` colocated with component, inline this test in component test file)**

| Fixture | Expected |
|---------|----------|
| `null` | returns `null` |
| `"some string"` | returns `null` |
| `42` | returns `null` |
| `[1,2,3]` | returns `null` |
| `{}` | returns `null` |
| `{ min: 100, max: 200 }` | 2-figure array (no median) |
| `{ min: 100, median: 150, max: 200 }` | 3-figure min/median/max array |
| `{ p25: 100, p50: 150, p75: 200 }` | 3-figure percentile array |
| `{ min: 100, median: 150, max: 200, currency: "GBP" }` | 3-figure array with GBP currency field |
| `{ min: "100" }` (string) | returns `null` |
| `{ nested: { min: 100 } }` | returns `null` |

**6. `src/__tests__/components/salary-intelligence-section.test.tsx` (NEW)**

| Test | Expected |
|------|----------|
| `salary === null` renders heading + "No salary intelligence yet." | heading present, italic muted p with exact string |
| `salary` with `llm_analysis === null && report_json === null` renders empty-body copy | "Salary intelligence was generated but is empty." |
| `salary` with `llm_analysis: "some prose"` renders Streamdown output | no `<script>`, `<iframe>`; prose rendered |
| `salary` with `report_json: {min:100,max:200}` renders headline row with 2 figures | 2 Badge elements |
| `salary` with `report_json: {min:100,median:150,max:200}` + `llm_analysis: "prose"` renders both | headline + Streamdown body |
| `salary` with `report_json: "unrecognized"` + `llm_analysis: "prose"` renders prose only | no headline row |
| `salary` with stale freshness renders amber dot | `aria-label="Stale artifact"` |
| XSS payload in `llm_analysis` is neutralized | no `<script>` in DOM (Plan 20-05 XSS regression pattern) |

**7. `src/__tests__/components/salary-provenance-gate.test.tsx` (NEW — source-based grep gate)**

See §Provenance Tags §"Automated test assertion" above. Reads `job-detail-sheet.tsx` as text, asserts every `formatSalary(` call within 5 lines of `<Badge variant="outline"` or `ProvenanceTag`.

### Fixture design — representative report_json shapes

Place in `src/__tests__/fixtures/salary-intelligence.ts` (NEW):

```ts
export const salaryFixtures = {
  minimal: {
    id: 1,
    search_date: "2026-04-22",
    report_json: null,
    raw_results: null,
    llm_analysis: null,
    created_at: "2026-04-22T12:00:00Z",
    updated_at: null,
  },

  proseOnly: {
    id: 2,
    search_date: "2026-04-22",
    report_json: null,
    raw_results: null,
    llm_analysis: "Market data for Senior SRE roles at companies like Stripe...",
    created_at: "2026-04-22T12:00:00Z",
    updated_at: "2026-04-22T12:30:00Z",
  },

  minMedianMax: {
    id: 3,
    search_date: "2026-04-22",
    report_json: { min: 140000, median: 175000, max: 220000, currency: "USD" },
    raw_results: null,
    llm_analysis: "Market analysis...",
    created_at: "2026-04-22T12:00:00Z",
    updated_at: "2026-04-22T12:30:00Z",
  },

  percentiles: {
    id: 4,
    search_date: "2026-04-22",
    report_json: { p25: 130000, p50: 165000, p75: 210000 },
    raw_results: "n=18 glassdoor reviews",
    llm_analysis: null,
    created_at: "2026-04-22T12:00:00Z",
    updated_at: null,
  },

  unrecognized: {
    id: 5,
    search_date: "2026-04-22",
    report_json: { foo: "bar", baz: [1, 2, 3] },
    raw_results: null,
    llm_analysis: "LLM analysis present but report shape unrecognized.",
    created_at: "2026-04-22T12:00:00Z",
    updated_at: null,
  },

  malformed: {
    id: 6,
    search_date: "2026-04-22",
    // intentionally wrong type to test fail-open
    report_json: undefined as unknown,
    raw_results: null,
    llm_analysis: null,
    created_at: "2026-04-22T12:00:00Z",
    updated_at: null,
  },
};
```

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest + happy-dom + Testing Library + MSW |
| Config file | `vitest.config.ts` (project root) |
| Quick run command | `npm test` (all tests, currently 395 passing) |
| Single-file command | `npm test -- src/__tests__/lib/jobs-schemas-salary.test.ts` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AI-RENDER-03 | Renders heading + empty-state when null | unit component | `npm test -- src/__tests__/components/salary-intelligence-section.test.tsx` | ❌ Wave 0 |
| AI-RENDER-03 | Renders Streamdown prose when `llm_analysis` populated | unit component | (same file) | ❌ Wave 0 |
| AI-RENDER-03 | Renders structured headline row when `report_json` recognizable | unit component | (same file) | ❌ Wave 0 |
| AI-RENDER-03 | Graceful degradation when `report_json` shape unrecognized | unit component | (same file) | ❌ Wave 0 |
| AI-RENDER-03 | XSS payload in `llm_analysis` is neutralized | unit component | (same file) + existing `tailored-resume-xss.test.tsx` covers Streamdown | ❌ Wave 0 (new), ✅ existing |
| AI-RENDER-07 | `provenanceColor` returns correct token per source | unit pure | `npm test -- src/__tests__/lib/provenance.test.ts` | ❌ Wave 0 |
| AI-RENDER-07 | `provenanceLabel` returns exact copy per source | unit pure | (same file) | ❌ Wave 0 |
| AI-RENDER-07 | Every `formatSalary(` in job-detail-sheet has provenance tag within 5 lines | source grep | `npm test -- src/__tests__/components/salary-provenance-gate.test.tsx` | ❌ Wave 0 |
| AI-DATA-01 | LEFT JOIN LATERAL returns null today (0 rows matching) | integration | `npm test -- src/__tests__/lib/jobs-db-salary.test.ts` | ❌ Wave 0 |
| AI-DATA-01 | `getJobDetail` attaches `salary_intelligence: null` on the detail shape | integration | (same file) | ❌ Wave 0 |
| AI-DATA-02 | `SalaryIntelligenceSchema.safeParse` accepts valid row | unit schema | `npm test -- src/__tests__/lib/jobs-schemas-salary.test.ts` | ❌ Wave 0 |
| AI-DATA-02 | `SalaryIntelligenceSchema.safeParse` rejects missing id | unit schema | (same file) | ❌ Wave 0 |
| AI-DATA-02 | `parseOrLog` fail-open logs + returns null on schema failure | unit schema | (same file) | ❌ Wave 0 |
| SC #5 | `?? "USD"` removal — CompanyResearchSchema accepts null currency | unit schema | `npm test -- src/__tests__/lib/jobs-db-zod.test.ts` | ✅ extend existing |
| D-04 | `scripts/check-jobs-schema.ts` includes salary_intelligence entry | manual verify | `npm run test:schema` (requires JOBS_DATABASE_URL) | ✅ extend existing |

### Sampling Rate
- **Per task commit:** `npm test` (all 395+ tests; <2s runtime per STATE.md)
- **Per wave merge:** `npm test && npm run build && npm run lint`
- **Phase gate:** Full suite green + `npm run test:schema` clean + grep-verifiable provenance gate passes + `npm run build` exits 0 + zero hardcoded Tailwind colors (grep gate)

### Wave 0 Gaps
- [ ] `src/__tests__/lib/jobs-schemas-salary.test.ts` — covers AI-DATA-02
- [ ] `src/__tests__/lib/jobs-db-salary.test.ts` — covers AI-DATA-01
- [ ] `src/__tests__/lib/provenance.test.ts` — covers AI-RENDER-07 pure cases
- [ ] `src/__tests__/components/salary-intelligence-section.test.tsx` — covers AI-RENDER-03
- [ ] `src/__tests__/components/salary-provenance-gate.test.tsx` — covers AI-RENDER-07 grep gate
- [ ] `src/__tests__/fixtures/salary-intelligence.ts` — shared fixtures (optional but recommended)
- Framework install: none needed — Vitest/Testing Library/happy-dom all pre-installed

---

## Integration Risks and Pitfalls

### Known Gotchas (carried forward)

**1. n8n task #11 blocker (upstream / homelab repo)** — `salary_intelligence` has 0 rows because of the `$128,663`-as-parameter-placeholder bug in the n8n `Job Search: Salary Intelligence` workflow's `Save Report` node. Phase 22 ships without waiting. Renderer is exercised via fixtures. When task #11 lands, Phase 22's code auto-picks up real data (LEFT JOIN LATERAL `WHERE FALSE` → real predicate is a 1-line edit).

**2. SC #3 wording mismatch** — ROADMAP Phase 22 SC #3 says "returns null cleanly for both `job_id` and `company_name` keying". Live DB has neither column. The underlying intent (defensive JOIN that handles future schema changes) is preserved. **Planner action:** update ROADMAP SC #3 wording during execution to reflect `search_date` keying. Example replacement: "the defensive `LEFT JOIN LATERAL` returns null cleanly today (0 rows) and tolerates whatever column shape the n8n workflow eventually produces."

**3. Line-number drift** — ROADMAP SC #5 says `jobs-db.ts:328`; CONTEXT.md D-12 says 347; actual line (verified 2026-04-22) is **349**. Similar stale-reference risk in the planner's execution — every line number should be grep-verified before editing. Recommend using symbol references over line numbers in plan docs.

### New risks (Phase 22 scope)

**4. `?? "USD"` cascade (see Pitfalls §1 + §4)** — 3-edit cascade (interface + schema + query). Missing one breaks the type-level contract silently. **Mitigation:** planner checklist bundles all 3 edits into the same task; Vitest cases lock both the pass case (null OK) and the negative case (string rejected).

**5. Streamdown `children` type with nullable llm_analysis (see Pitfall 2)** — Streamdown expects a string, not null. **Mitigation:** `SalaryIntelligenceSection` branches on `llm_analysis?.trim()` before mounting Streamdown. If the populated branch has headline figures but no prose, only the headline row renders — no empty `<Streamdown>` mount.

**6. Arbitrary JSON in `report_json` (see Pitfall 3)** — `z.unknown()` means the renderer cannot trust any shape. **Mitigation:** `extractHeadlineFigures` type guard is exhaustive-defensive; returns `null` on any unrecognized shape. Fixtures cover `null`, strings, arrays, number, empty obj, nested obj, wrong types.

**7. Dual-field FreshnessBadge → tri-field (see Pitfall 6)** — `attach-freshness.ts` dispatches on 2 fields today; salary needs `search_date` semantics. **Mitigation:** add optional 3rd arg to `attachFreshness`. Recommend explicit call-site override for salary_intelligence.

**8. `ProvenanceTag` component extraction vs inline** — 3+ render sites warrant extraction per Plan 21-05 precedent. Inline duplicates 6-10 lines per site. **Mitigation:** extract `<ProvenanceTag>` in `src/app/(admin)/admin/jobs/provenance-tag.tsx`.

**9. Provenance grep gate false-positive on `columns.tsx`** — `columns.tsx:33` also has a `formatSalary` function. D-11 scopes the gate to `job-detail-sheet.tsx` only. **Mitigation:** test assertion reads only the detail sheet file (not `columns.tsx`).

**10. SectionErrorBoundary `section` prop type extension** — boundary may have a typed `section` literal union that doesn't include `"salary_intelligence"`. **Mitigation:** grep the boundary type during planning and extend if needed.

### Mitigations

All mitigations embedded in pitfalls + decision text above. Summary table:

| Risk | Mitigation | Landing Location |
|------|------------|------------------|
| task #11 blocker | Ship skeleton now; 1-line predicate tighten later | LEFT JOIN LATERAL `WHERE FALSE` |
| SC #3 wording | Meta-doc update during Phase 22 finalization wave | ROADMAP Phase 22 SC #3 |
| Line number drift | Grep-verify during planning; prefer symbol refs | Every plan task |
| `?? "USD"` cascade | 3-edit checklist in single task | Currency handling task |
| Streamdown null | Branch on `llm_analysis?.trim()` | SalaryIntelligenceSection populated branch |
| Arbitrary JSON | Exhaustive type guard + fixture coverage | `extractHeadlineFigures` + test fixtures |
| search_date dispatch | Optional 3rd arg to `attachFreshness` | `attach-freshness.ts` |
| Tag extraction | `<ProvenanceTag>` component | `provenance-tag.tsx` |
| Grep gate scope | Test file targets `job-detail-sheet.tsx` only | `salary-provenance-gate.test.tsx` |
| Boundary type | Extend `section` prop type if needed | `section-error-boundary.tsx` |

---

## Ordered Task Hints for Planner

### Suggested wave breakdown

**Wave 1: Data Layer (no user-visible change)** — 4 tasks, ship in one commit each

1. **Task 22-01 — SalaryIntelligenceSchema + parseOrLog wiring**
   - Add `SalaryIntelligenceSchema` to `src/lib/jobs-schemas.ts`
   - Derive `SalaryIntelligence` type via `z.infer`
   - New test file: `src/__tests__/lib/jobs-schemas-salary.test.ts` (12+ cases)
   - Grep-verify: no hardcoded Tailwind colors, no new deps, all tests green

2. **Task 22-02 — jobs-db.ts LEFT JOIN LATERAL + interface + JobDetail extension**
   - Add 7 aliased columns to SELECT in `getJobDetail`
   - Add LEFT JOIN LATERAL subquery with `WHERE FALSE` + comment
   - Extend `JobDetail` + `FreshJobDetail` types
   - Add `parseOrLog` call + row assembly
   - Extend `fetchJobDetail` in `job-actions.ts` with `attachFreshness<SalaryIntelligence>(...)` + optional `"search_date"` field arg
   - Extend `attach-freshness.ts` with optional 3rd `fieldName` param
   - New test file: `src/__tests__/lib/jobs-db-salary.test.ts` (4 cases)
   - **Dependency:** Task 22-01 must ship first (schema imported by jobs-db)

3. **Task 22-03 — Currency cascade (`?? "USD"` removal)**
   - Edit `jobs-db.ts:349` — remove `?? "USD"`
   - Edit `jobs-db.ts:67` — `salary_currency: string | null`
   - Edit `jobs-schemas.ts:37` — `z.string().nullable()`
   - Extend `src/__tests__/lib/jobs-db-zod.test.ts` with 3 new cases
   - **Dependency:** None from Wave 1 tasks; can parallelize with 22-01/22-02, but recommend serial for review

4. **Task 22-04 — Schema-drift EXPECTED map**
   - Edit `scripts/check-jobs-schema.ts:18-48` — add `salary_intelligence` entry with 7 columns
   - Verify via `npm run test:schema` (if JOBS_DATABASE_URL available)
   - **Dependency:** can parallelize with 22-01/22-02/22-03

**Wave 2: Rendering Layer** — 4 tasks

5. **Task 22-05 — Provenance helpers + ProvenanceTag component**
   - New file: `src/lib/provenance.ts` (pure functions — `provenanceColor`, `provenanceLabel`, `provenanceTooltip`, type `ProvenanceSource`)
   - New file: `src/app/(admin)/admin/jobs/provenance-tag.tsx` (`<ProvenanceTag>` wrapper)
   - New test file: `src/__tests__/lib/provenance.test.ts` (12+ cases including exhaustive color/label/tooltip × 4 sources)
   - **Dependency:** None from Wave 1

6. **Task 22-06 — EMPTY_STATE_COPY extension + SalaryIntelligenceSection component**
   - Edit `src/lib/empty-state-copy.ts` — append `salary_intelligence` key with 2 strings
   - New file: `src/app/(admin)/admin/jobs/salary-intelligence-section.tsx`
   - Colocate or extract `extractHeadlineFigures` pure function (planner picks; recommend inline for Phase 22, extract if Phase 24 reuses)
   - New test file: `src/__tests__/components/salary-intelligence-section.test.tsx` (8+ cases covering null/empty/populated/unrecognized + XSS guard)
   - New fixtures file: `src/__tests__/fixtures/salary-intelligence.ts`
   - **Dependency:** Tasks 22-01 (schema) + 22-05 (ProvenanceTag) must ship first

7. **Task 22-07 — job-detail-sheet.tsx mount + provenance wiring**
   - Insert `<SectionErrorBoundary section="salary_intelligence">` + `<SalaryIntelligenceSection>` mount between Tailored Resume and Company Intel (after line 260, before line 262)
   - Wrap line 161 salary figure with `<ProvenanceTag source="scraped" feedName={detail.source} />`
   - Wrap line 325-328 salary figure with `<ProvenanceTag source="company_research" />`
   - Ensure `SalaryIntelligenceSection`'s own headline figures carry `<ProvenanceTag source="llm_estimate" />`
   - New test file: `src/__tests__/components/salary-provenance-gate.test.tsx` (source-based grep gate)
   - Possibly extend `section-error-boundary.tsx` `section` prop type union
   - **Dependency:** Tasks 22-02, 22-05, 22-06 must ship first

8. **Task 22-08 — Meta-doc finalization**
   - Update ROADMAP Phase 22 SC #3 wording (strike "job_id and company_name keying" — replace with accurate wording)
   - Update ROADMAP Phase 22 SC #5 line number (`328` → `349`)
   - Mark 4 REQs complete in REQUIREMENTS.md
   - Update STATE.md Current Position + What's Next
   - **Dependency:** All tasks 22-01 through 22-07 complete

### File-modification list (NEW vs EDIT per file)

| File | Status | Phase 22 Change |
|------|--------|----------------|
| `src/lib/jobs-schemas.ts` | EDIT | Append `SalaryIntelligenceSchema` + `type SalaryIntelligence`; mutate `CompanyResearchSchema.salary_currency` to nullable |
| `src/lib/jobs-db.ts` | EDIT | Add interface `SalaryIntelligence`; extend `JobDetail` + `FreshJobDetail`; extend `getJobDetail` SELECT + LEFT JOIN LATERAL + parseOrLog + row assembly; remove `?? "USD"`; make `CompanyResearch.salary_currency: string \| null` |
| `src/lib/job-actions.ts` | EDIT | Extend `fetchJobDetail` with `attachFreshness<SalaryIntelligence>` call |
| `src/lib/attach-freshness.ts` | EDIT | Add optional `fieldName?: "generated_at" \| "created_at" \| "search_date"` parameter |
| `src/lib/empty-state-copy.ts` | EDIT | Append `salary_intelligence` key with 2 strings |
| `src/lib/provenance.ts` | NEW | `provenanceColor` / `provenanceLabel` / `provenanceTooltip` pure functions + `ProvenanceSource` type |
| `src/app/(admin)/admin/jobs/salary-intelligence-section.tsx` | NEW | Mirror of `TailoredResumeSection`; 3-branch (null/empty/populated) |
| `src/app/(admin)/admin/jobs/provenance-tag.tsx` | NEW | Badge + Tooltip wrapper with color/label/tooltip via helpers |
| `src/app/(admin)/admin/jobs/job-detail-sheet.tsx` | EDIT | Mount SalaryIntelligenceSection; wrap 2 existing `formatSalary` sites with `<ProvenanceTag>` |
| `src/app/(admin)/admin/jobs/section-error-boundary.tsx` | POSSIBLY EDIT | Extend `section` prop type if it's a string literal union |
| `scripts/check-jobs-schema.ts` | EDIT | Add `salary_intelligence: [...]` entry (7 columns) to `EXPECTED` map |
| `src/__tests__/lib/jobs-schemas-salary.test.ts` | NEW | 12+ cases for `SalaryIntelligenceSchema` fail-open |
| `src/__tests__/lib/jobs-db-salary.test.ts` | NEW | 4 cases for LEFT JOIN LATERAL null-today behavior |
| `src/__tests__/lib/jobs-db-zod.test.ts` | EDIT | 3 new cases for nullable `salary_currency` |
| `src/__tests__/lib/provenance.test.ts` | NEW | 12+ cases for provenance helpers |
| `src/__tests__/components/salary-intelligence-section.test.tsx` | NEW | 8+ cases for empty/populated/unrecognized branches |
| `src/__tests__/components/salary-provenance-gate.test.tsx` | NEW | Source-based grep gate test |
| `src/__tests__/fixtures/salary-intelligence.ts` | NEW (optional but recommended) | 6 canonical salary row fixtures |
| `.planning/ROADMAP.md` | EDIT | Phase 22 SC #3 wording + SC #5 line number + Progress row |
| `.planning/REQUIREMENTS.md` | EDIT | Mark AI-RENDER-03, AI-RENDER-07, AI-DATA-01, AI-DATA-02 complete |
| `.planning/STATE.md` | EDIT | Current Position + What's Next + Last Session |

### Task dependencies (execution order)

```
22-01 (Schema) ───┐
                  ├──> 22-02 (DB layer + LATERAL join + freshness)
22-04 (EXPECTED)──┤
22-03 (Currency cascade) ─ independent ─ can parallel with 22-01/22-04
                  │
22-05 (Provenance helpers + tag) ─ independent ─ can parallel with Wave 1
                  │
22-02 + 22-05 ────┼──> 22-06 (SalaryIntelligenceSection + EMPTY_STATE_COPY)
                  │
22-06 + 22-05 ────┼──> 22-07 (job-detail-sheet mount + existing-site tag wiring + grep gate)
                  │
All above ────────┴──> 22-08 (Meta-doc finalization)
```

**Parallelizable:** Wave 1 (22-01/02/03/04) can all ship within the same session. Wave 2 (22-05) can start immediately. Wave 2 (22-06/07) serializes strictly.

---

## Assumptions Log

Every claim tagged `[ASSUMED]` in this research is enumerated below. Planner and /gsd-discuss-phase should surface these for user confirmation if they become blockers.

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `report_json` shape will include either `min/median/max` or `p25/p50/p75` keys when task #11 lands | §Rendering — headline row detection | Headline row renders nothing until schema known; llm_analysis prose still renders. Low risk. |
| A2 | `updated_at` column on `salary_intelligence` is nullable in live DB | §Data Layer — Zod schema | If NOT NULL in DB, schema's `z.string().nullable()` is permissively wrong but doesn't crash — rows always come with non-null, parse succeeds. Zero risk. |
| A3 | `DollarSign` lucide icon is appropriate for the Salary Intelligence section heading | §Rendering — component signature | Icon choice is aesthetic; swap costs 2 lines. Zero technical risk. |
| A4 | Provenance color mapping — `text-muted-foreground` (scraped) / `text-warning` (LLM) / `text-success` (research) / `text-foreground` (original posting) | §Provenance Tags | D-10 locks the principle ("color ≈ confidence"); exact tokens are Claude's call per CONTEXT.md §Discretion. If owner disagrees, 1-line edit each. |
| A5 | `search_date` is a semantically better freshness signal than `created_at` for salary_intelligence | §Rendering — FreshnessBadge wiring | If owner prefers `created_at`, the attach-freshness extension and 3rd arg become unnecessary. 2-line revert. |
| A6 | Provenance tag extraction as `src/lib/provenance.ts` pays off | §Provenance Tags | If Phase 24 doesn't reuse, extraction was moderately over-engineered. Zero behavior risk; minor code bloat. |
| A7 | ROADMAP SC #3 wording update ("job_id and company_name keying") needs explicit edit | §Integration Risks #2 | If owner is fine with the stale wording staying + an explanatory phase-doc comment, no ROADMAP edit needed. Zero code impact. |
| A8 | `text-[10px]` is the correct typography size for provenance tags (vs `text-[11px]` for quality badge) | §Provenance Tags | D-10 specifies "one size smaller than quality badge". Visual test during planning; 1-line edit. |

**If this table is empty:** All claims in this research were verified or cited — no user confirmation needed. **(This table has 8 rows; several locked decisions permit flexibility and Claude's discretion noted in CONTEXT.md itself carries forward — none of these 8 are hard blockers.)**

---

## Open Questions

1. **`report_json` real shape (awaiting task #11)**
   - What we know: Live DB has 0 rows. Task #11 in homelab repo documents the collision bug. n8n `Job Search: Salary Intelligence` workflow's `Save Report` node is intended to emit a JSONB payload with salary figures.
   - What's unclear: Exact keys the LLM will emit. Is it `{min, median, max, currency, sources}`? `{p25, p50, p75, sample_size, confidence}`? Nested `{report: {...}}`? Something else entirely?
   - Recommendation: Ship with `z.unknown()` + the dual-shape `extractHeadlineFigures` detector. When task #11 ships a real row, Phase 22 auto-adapts (unknown shape → prose-only render, which is still valuable). Tightening the schema is a **future edit** to `jobs-schemas.ts`, not a Phase 22 blocker.

2. **ProvenanceTag component vs inline JSX**
   - What we know: Plan 21-05 extracted `scoreColor`/`scoreLabel` at 3 bands. Phase 22 has 4 provenance sources × 3 render sites = 12 permutations.
   - What's unclear: Does the planner prefer 12 inline `<Tooltip><Badge>...</Badge></Tooltip>` blocks or 3 `<ProvenanceTag source="..." feedName="..." />` calls?
   - Recommendation: Extract (Plan 21-05 precedent). Reduces visual noise at call site; testable in isolation; reusable in Phase 24.

3. **`columns.tsx` formatSalary provenance scope**
   - What we know: `columns.tsx:33` has a second `formatSalary` for the table view. D-11 scopes the grep gate to `job-detail-sheet.tsx` only.
   - What's unclear: Does the owner want provenance tags on the table view too? Each cell is cramped; a badge might not fit.
   - Recommendation: Defer. Phase 22 scope stays as the detail sheet only. If owner asks, follow-up issue.

4. **SectionErrorBoundary type extension**
   - What we know: Plan 20-04 built a `section` prop; may be a typed literal union.
   - What's unclear: Actual type without re-reading `section-error-boundary.tsx`.
   - Recommendation: Planner reads the file during Task 22-07 execution; trivial extension if union, no edit if `string`.

5. **`search_date` vs `created_at` for freshness**
   - What we know: `search_date` is "when the market was sampled"; `created_at` is "when we persisted the row".
   - What's unclear: Owner preference. If the workflow writes rows immediately after sampling, they're functionally identical. If sampling happens in batches, they can diverge by hours/days.
   - Recommendation: Use `search_date` (more accurate semantically). Extension to `attach-freshness.ts` is 3 lines.

---

## Environment Availability

Phase 22 requires no new external tools. All dependencies inherited from Phase 20/21.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node 20+ | Next.js 16 runtime | ✓ | (project-wide) | — |
| Vitest | Testing | ✓ | (already installed) | — |
| `streamdown@2.5.0` | SalaryIntelligenceSection prose rendering | ✓ | 2.5.0 | — |
| `zod@4.3.6` | SalaryIntelligenceSchema | ✓ | 4.3.6 | — |
| `pg` + `@prisma/adapter-pg` | `getJobDetail` query | ✓ | (existing Pool) | — |
| `lucide-react` + `DollarSign` icon | SalaryIntelligenceSection heading | ✓ | (existing) | — |
| shadcn Badge + Tooltip | ProvenanceTag | ✓ | (existing in `src/components/ui/`) | — |
| PostgreSQL reachable at `JOBS_DATABASE_URL` | `test:schema` pre-push hook | Conditional | (local only) | Graceful skip per Plan 20-08 |

**Missing dependencies with no fallback:** None.

**Missing dependencies with fallback:** None — `JOBS_DATABASE_URL` unset = schema test skips gracefully, doesn't block execution.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Raw `pool.query()` → `any`-typed rows → silent schema drift | `parseOrLog<T>(Schema, raw, label, jobId)` fail-open | Plan 20-03 (2026-04-21) | Phase 22 inherits; zero new infrastructure |
| `<div className="whitespace-pre-wrap">` for LLM prose | `<Streamdown skipHtml linkSafety={{enabled:false}}>` | Plan 20-01 (2026-04-21) | Phase 22 inherits; `skipHtml` is load-bearing per XSS regression test |
| `relativeTime: string` ("3 days ago") on FreshnessBadge | `generatedDate: string` ("4/21/26", America/Chicago) | Plan 21-00 (2026-04-22) | Phase 22 inherits; no revision needed |
| Silent-hide for absent LLM artifacts (`{detail.X && (<section>...)}`) | Always-render section heading; 3-way branch on body | Plan 21-06 (2026-04-22) | Phase 22 follows — SalaryIntelligenceSection always renders heading |
| Inline `scoreColor` class in JSX | Extracted `scoreColor`/`scoreLabel` pure functions | Plan 21-05 (2026-04-22) | Phase 22 follows — extract `provenanceColor`/`Label` |
| Single global stale threshold | Per-artifact thresholds (14/14/60/30 days) | Plan 20-02 (2026-04-21) | Phase 22 inherits — `salary_intelligence: 30` already defined |
| `?? "USD"` currency default | (Phase 22 removes) | Phase 22 | Owner override — better to hide than mislabel |
| ROADMAP.md line-number references | Planner grep-verifies every line number at execution | Phase 22 research discovery | Meta-process improvement for future phases |

**Deprecated/outdated:**
- **ROADMAP SC #3 wording** ("job_id and company_name keying") — stale; replace during Phase 22 finalization
- **ROADMAP SC #5 line number** ("328") — stale; actual is 349

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Inherited — `requireRole(["owner"])` on `fetchJobDetail` (Phase 20) |
| V3 Session Management | yes | Inherited — Better Auth session via Plan 20-07 middleware |
| V4 Access Control | yes | Inherited — `(admin)` route group gates every request |
| V5 Input Validation | yes | `SalaryIntelligenceSchema` via Zod `parseOrLog` at DB boundary |
| V6 Cryptography | no | Phase 22 handles no secrets / no signing — Phase 23 covers HMAC |
| V7 Data Protection | partial | `raw_results` contains raw web-search data; Phase 22 deliberately does NOT render it (reduces exposure surface) |
| V10 Malicious Code | yes | Streamdown + `skipHtml` + CSP (Plan 20-07) — inherited XSS mitigation |
| V11 Business Logic | no | N/A — no business rules in render path |
| V13 API and Web Service | no | No new API routes in Phase 22 |

### Known Threat Patterns for Next.js 16 + LLM-rendered admin UI

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| XSS via LLM-generated markdown in `llm_analysis` | Tampering | Streamdown `skipHtml` + CSP on `/admin/*` (Plan 20-05/20-07) — inherited by salary section |
| XSS via malicious `report_json` keys displayed in headline row | Tampering | Headline row only emits numbers via `formatSalary` + currency string; no arbitrary-HTML path; string currency is React-escaped |
| Prompt injection in `llm_analysis` persisted to display | Information Disclosure | Render-time is the concern (not re-chain LLMs); React auto-escapes; `skipHtml` strips HTML entirely |
| Wrong-currency display misleading owner | Repudiation / accuracy | `?? "USD"` removal — hide rather than mislabel (CONTEXT.md D-12) |
| Salary figure without provenance → owner anchors on wrong number | Information Disclosure | Provenance tags on every figure (AI-RENDER-07 — this phase's core deliverable) |
| Schema drift crashes /admin/jobs | DoS | `parseOrLog` fail-open + `SectionErrorBoundary` (Plan 20-04/20-06 inherited) |
| Large `raw_results` base64 / text in detail payload bloats sheet | DoS / perf | Deliberately NOT rendering `raw_results` (Phase 22 scope decision); column is still in schema for debugging via DB |
| LEFT JOIN LATERAL with unsafe predicate exposes cross-job salary data | Tampering / Information Disclosure | `WHERE FALSE` skeleton returns zero rows until task #11; real predicate will use parameterized `j.id` / `j.company` (safe) |

---

## Sources

### Primary (HIGH confidence)

- **Project code (read 2026-04-22):**
  - `src/lib/jobs-db.ts` — `getJobDetail` SELECT + JOIN structure; `?? "USD"` default at line 349 (verified); `CompanyResearch`/`TailoredResume`/`JobDetail` interfaces; `getTailoredResumePdf` pattern at 413-419
  - `src/lib/jobs-schemas.ts` — `parseOrLog<T>` helper; three existing artifact schemas; Zod v4 pattern
  - `src/lib/empty-state-copy.ts` — const map pattern with `as const` + 3 existing keys
  - `src/lib/attach-freshness.ts` — dual-field dispatch at lines 34-37; `Intl.DateTimeFormat(America/Chicago)` pattern
  - `src/lib/score-color.ts` — Plan 21-05 extracted-helpers precedent
  - `src/lib/is-company-research-empty.ts` — Plan 21-06 extracted-predicate precedent
  - `src/lib/job-freshness.ts` — `STALE_THRESHOLDS.salary_intelligence = 30` already defined
  - `src/lib/job-actions.ts` — `fetchJobDetail` server action with `requireRole(["owner"])`
  - `src/app/(admin)/admin/jobs/tailored-resume-section.tsx` — component template for SalaryIntelligenceSection
  - `src/app/(admin)/admin/jobs/job-detail-sheet.tsx` — mount points + 3 `formatSalary(` call sites
  - `src/components/ui/badge.tsx` — `variant="outline"` definition
  - `scripts/check-jobs-schema.ts` — Plan 20-08 EXPECTED map + extension pattern
  - `src/__tests__/components/tailored-resume-xss.test.tsx` — Streamdown XSS regression asserting observed behavior

- **Project planning docs (read 2026-04-22):**
  - `.planning/phases/22-salary-intelligence-defensive-render/22-CONTEXT.md` — 12 D-decisions locked during discuss-phase
  - `.planning/phases/20-foundation-freshness-zod-tailored-resume/20-CONTEXT.md` — Phase 20 decisions carried forward
  - `.planning/phases/21-polish-copy-pdf-empty-states-link-out/21-CONTEXT.md` — Phase 21 decisions carried forward
  - `.planning/phases/21-polish-copy-pdf-empty-states-link-out/21-UI-SPEC.md` — UI cadence carried forward
  - `.planning/notes/ai-pipeline-integration-context.md` — task #11 bug root cause
  - `.planning/research/FEATURES.md` — T7 salary intelligence scope + D3 distribution viz deferred
  - `.planning/research/PITFALLS.md` — Pitfall 5 provenance rationale
  - `.planning/REQUIREMENTS.md` — AI-RENDER-03/07 + AI-DATA-01/02 exact wording
  - `.planning/ROADMAP.md` — Phase 22 SC #1-5 (wording inaccuracies flagged)
  - `.planning/STATE.md` — Phase 20/21 completion state

- **Version verification via npm registry (HIGH):**
  - `npm view streamdown version` → `2.5.0` on 2026-04-22
  - `npm view zod version` → `4.3.6` on 2026-04-22

### Secondary (MEDIUM confidence — pattern-based, not tool-verified)

- CLAUDE.md project instructions §Color System (semantic tokens; no hardcoded Tailwind colors)
- CLAUDE.md §Component Patterns (shadcn primitives only; TanStack Form/Table rules; Prisma v7 for main app, `pg.Pool` for jobs DB)
- CLAUDE.md §Testing (Vitest + happy-dom + Testing Library + MSW)
- Plan 20-03 SUMMARY pattern for Zod + parseOrLog at DB boundary (cited via STATE.md decisions)

### Tertiary (LOW confidence — not verified in this session)

- None. All critical claims were verified against live code, live package registry, or explicit CONTEXT.md decisions.

---

## Metadata

**Confidence breakdown:**
- Standard stack: **HIGH** — `streamdown@2.5.0` and `zod@4.3.6` verified against npm registry on research date; all other libraries pre-installed and pattern-proven in Phase 20/21
- Architecture: **HIGH** — every pattern (parseOrLog, Streamdown config, section shell, EMPTY_STATE_COPY, scoreColor precedent, LEFT JOIN LATERAL) grep-verified in current code
- Pitfalls: **HIGH** — 6 pitfalls identified, all grounded in either code inspection (line 349 cascade, Streamdown null) or documented past experience (`?? "USD"` risk from PITFALLS.md §5, LLM XSS from §1)
- Data layer: **HIGH** — SQL shape + schema shape fully specified; line numbers verified 2026-04-22
- Rendering: **HIGH** — component signature mirrors existing TailoredResumeSection 1:1
- Provenance tags: **MEDIUM-HIGH** — 3 call sites enumerated via grep; helpers specified but not tested; recommend extract but discretion allowed

**Research date:** 2026-04-22
**Valid until:** 2026-05-06 (14 days — stable phase, no fast-moving dependencies; re-verify if n8n task #11 lands in homelab repo before execution)
