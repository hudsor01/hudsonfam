# Phase 22: Salary Intelligence (Defensive Render) - Context

**Gathered:** 2026-04-22 (auto mode)
**Status:** Ready for planning

<domain>
## Phase Boundary

Ship defensive rendering for `salary_intelligence` data in the job detail sheet. 4 REQs: AI-RENDER-03, AI-RENDER-07, AI-DATA-01, AI-DATA-02. The UI side is straightforward; the data side is constrained by an upstream schema reality that ROADMAP.md Phase 22 SC originally got wrong.

**Live-DB reality discovered during discuss-phase (2026-04-22):**

```
                  Table "public.salary_intelligence"
    Column    |           Type           | Nullable |
--------------+--------------------------+----------+
 id           | integer                  | not null |
 search_date  | date                     | not null |  ← UNIQUE index
 report_json  | jsonb                    |          |
 raw_results  | text                     |          |
 llm_analysis | text                     |          |
 created_at   | timestamp with time zone |          |
 updated_at   | timestamp with time zone |          |
 Row count: 0
```

**There is no `job_id` column and no `company_name` column.** The table is keyed on `search_date`. ROADMAP.md Phase 22 SC #3 wording about "defensive `LEFT JOIN LATERAL` returns null cleanly for both `job_id` and `company_name` keying" was based on an assumption the n8n workflow's final shape would be keyed that way. Reality: the workflow uses `search_date` as the natural key, with company/job identity (if any) embedded in `report_json`. Row count is 0 because of the n8n `$128,663`-as-parameter-placeholder bug documented in `ai-pipeline-integration-context.md` — workflow fix is homelab-repo concern, tracked outside this phase.

**Scope adjustment (locked this phase):** AI-DATA-01's "defensive LEFT JOIN LATERAL" becomes "skeleton LEFT JOIN LATERAL that tolerates zero rows today AND tolerates whatever column shape eventually lands once the n8n workflow's `$N`-collision bug is fixed." Phase 22 SHIPS the defensive renderer + Zod schema + TypeScript type skeleton; the actual join-key strategy is finalized during planning based on the real `report_json` shape once sample data materializes. In the interim, the join returns null for every job (no rows to match) and the AI-RENDER-04 empty-state copy from Phase 21 covers the UI case.

**What does ship end-to-end this phase:**
1. `SalaryIntelligence` TypeScript type + Zod schema in `src/lib/jobs-schemas.ts` (AI-DATA-02)
2. `getJobDetail` SELECT gains a `LEFT JOIN LATERAL (SELECT ... FROM salary_intelligence WHERE ...)` subquery with a deliberately broad `WHERE` condition that returns null today (AI-DATA-01)
3. New `SalaryIntelligenceSection` component rendering `llm_analysis` prose via Streamdown (Phase 20's XSS-safe pattern) + structured headline figures from `report_json` when available (AI-RENDER-03)
4. Provenance tag on every salary figure in the detail sheet (base salary from `jobs`, company-research salary range from `company_research`, salary-intel headline from `salary_intelligence`) via shadcn `<Badge variant="outline">` (AI-RENDER-07)
5. `?? "USD"` default at `jobs-db.ts:347` removed — when `salary_currency` is null the salary block hides entirely rather than mislabeling GBP/EUR as `$` (ROADMAP SC #5; note: the line number in the ROADMAP is outdated from Phase 20's query-shape changes — planner verifies the exact line during execution)

**Not in this phase:**
- Fixing the n8n workflow's `$N`-collision bug (homelab repo)
- Waiting for real `report_json` data to finalize the join keys — planner writes the Zod schema broadly enough to accept whatever lands, and the UI gracefully degrades until then
- Salary distribution visualization / percentile chart (FEATURES.md D3 — v3.2+)
- Cross-currency conversion
- Salary regenerate button (deferred to Phase 24 AI-ACTION-06)

</domain>

<decisions>
## Implementation Decisions

### Data layer (AI-DATA-01 + AI-DATA-02)

- **D-01:** `SalaryIntelligence` Zod schema uses permissive shape — `report_json` typed as `z.unknown()` or `z.record(z.unknown())` (planner picks based on what the Streamdown + headline-figure renderers actually need). `llm_analysis` is `z.string().nullable()`. Other columns match the live-DB types (integer id, date search_date, text raw_results, timestamps). Rationale: until the n8n workflow ships real data, we can't write a strict schema — a loose skeleton now + tightening later when the shape stabilizes is better than blocking Phase 22 on upstream work.
- **D-02:** `TailoredResumeSchema` + `CompanyResearchSchema` fail-open `parseOrLog` pattern from Plan 20-03 extends to `SalaryIntelligenceSchema`. Each artifact validates INDEPENDENTLY at the `getJobDetail` return boundary — drift on salary intel never nulls out cover letter / tailored resume / company research.
- **D-03:** `getJobDetail` LEFT JOIN uses a SUBQUERY-style `LATERAL` join scoped to `LIMIT 1` on search_date DESC: `LEFT JOIN LATERAL (SELECT * FROM salary_intelligence WHERE <match_predicate> ORDER BY search_date DESC LIMIT 1) si ON true`. The `<match_predicate>` defaults to `false` in Phase 22 (zero matches — returns null rows) pending n8n task #11 fix. When real data lands, predicate tightens to something like `si.report_json->>'company_name' ILIKE j.company OR si.report_json->>'job_id' = j.id::text` — planner verifies shape + writes the real predicate during execution Task 0.
- **D-04:** Schema-drift guard — `scripts/check-jobs-schema.ts` EXPECTED map gains a `salary_intelligence` entry listing `["id", "search_date", "report_json", "raw_results", "llm_analysis", "created_at", "updated_at"]`. Plan 20-08's forward-reminder note is satisfied.

### Rendering (AI-RENDER-03)

- **D-05:** New `SalaryIntelligenceSection` client component at `src/app/(admin)/admin/jobs/salary-intelligence-section.tsx`. Mirrors `TailoredResumeSection` shape: heading + meta row (FreshnessBadge using `search_date` as the "generated_at" signal + section label) + body. Placement: between Tailored Resume and Company Intel in `job-detail-sheet.tsx` — this is the natural "pipeline order" for the owner (resume → salary context → company context).
- **D-06:** Body layout: `llm_analysis` prose rendered via Streamdown (Phase 20's `skipHtml linkSafety.enabled:false` config); ABOVE the prose, a structured headline row rendered from `report_json` figures IF the schema parser can extract recognizable min/median/max OR p25/p50/p75 fields. If the report shape is unrecognized, render ONLY the prose (graceful degradation — no crash on unexpected JSON keys).
- **D-07:** Headline row format: compact flex row with 3-5 dollar figures, each figure wrapped in a provenance-tagged badge (D-08). Claude's discretion on exact layout (rem gaps, typography sizing) during planning — match Phase 21's meta-row cadence.
- **D-08:** Empty state: when `salary_intelligence` row is absent (the today case), reuse the Phase 21 AI-RENDER-04 pattern — section heading renders unconditionally; body shows "No salary intelligence yet." in `text-sm text-muted-foreground italic`. Use the same `EMPTY_STATE_COPY` constant map from `src/lib/empty-state-copy.ts` extended with a `salary_intelligence` key.

### Provenance tags (AI-RENDER-07)

- **D-09:** Every dollar figure in the detail sheet gets a provenance tag. Three provenance sources:
  - **"scraped"** — from `jobs.salary_min` / `jobs.salary_max` (source = whichever feed provided the job: jobicy/remoteok/himalayas/arbeitnow/workingnomads/serpapi/remotive)
  - **"LLM estimate"** — from `salary_intelligence.report_json` figures
  - **"company research"** — from `company_research.salary_range_min` / `company_research.salary_range_max`
- **D-09 amendment (post-implementation, 2026-04-22):** a 4th reserved source (`original_posting` — figures quoted verbatim from `jobs.description`) was initially shipped as a primitive stub per the "reserved… not implemented Phase 22 unless trivial" clause. Dropped during Phase 22 closure per YAGNI review — no pipeline extracts salaries from `jobs.description` today, no roadmap phase renders it, and the color/label/tooltip decisions were explicitly marked provisional in UI-SPEC. The phase that eventually ships "quoted from posting" figures should re-add the source with real context rather than inheriting a speculative stub.
- **D-10:** Tag component: shadcn `<Badge variant="outline">` with `text-[10px]` typography (one size smaller than the quality badge from Plan 21-05) and semantic color tokens: `scraped` uses `text-muted-foreground` (lowest trust), `LLM estimate` uses `text-warning` (estimate, not verified), `company research` uses `text-success` (higher-trust, LLM-researched from company sources). Exact color mapping finalized during planning; the principle is "color ≈ confidence."
- **D-11:** Tag placement: inline immediately AFTER the figure, separated by a thin space. E.g., `$120K - $180K [scraped]`. Tooltip on the tag explains the source. Grep-verifiable acceptance: every occurrence of `{formatSalary(` in `job-detail-sheet.tsx` must be followed within 5 lines by a `<Badge variant="outline"` render, OR the figure is inside a component that itself has provenance tagging.

### Currency handling (ROADMAP SC #5)

- **D-12:** Remove `?? "USD"` default where it appears for salary fields. When `salary_currency` is null, the salary block hides entirely — better no figure than a wrong-currency figure. For `company_research.salary_currency` similar posture. Figures from `salary_intelligence.report_json` render with whatever currency the LLM emitted (trust the report; mislabeling there is the LLM's concern, not ours).

### Claude's Discretion

- Exact Zod schema shape for `report_json` (loose `z.unknown()` vs minimally-typed object with optional min/median/max keys) — planner picks based on the first real row once n8n task #11 is fixed; for today, `z.unknown()` + a post-parse narrow function is acceptable.
- Exact FreshnessBadge treatment for salary_intelligence — does the badge show `search_date` or `created_at`? (Semantics differ: search_date is "when the market was sampled", created_at is "when we persisted the row.") Planner picks during Task 0 live-DB inspection.
- Provenance tag color mapping — D-10 locks the principle (color ≈ confidence); exact class names are Claude's call.
- Whether to render `raw_results` anywhere (probably not — it's text debugging dump from the raw web-search results, not owner-value).
- Tag placement in structured headline row vs inline with the prose — D-11 locks inline after figure, but structured row layout has discretion on how tags cluster vs appear per-figure.

### Folded Todos

None — `todo.match-phase 22` query deferred; if any match surface during planning's cross-reference step, they'll fold in there.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements and scope
- `.planning/REQUIREMENTS.md` — 4 REQs; Phase 22 owns AI-RENDER-03, AI-RENDER-07, AI-DATA-01, AI-DATA-02
- `.planning/ROADMAP.md` — Phase 22 entry with 5 success criteria. Note: SC #3's "job_id and company_name keying" wording conflicts with the live-DB reality (table has neither column). Planner updates SC #3 as part of ROADMAP maintenance during execution; the underlying intent ("defensive JOIN that handles future schema changes gracefully") is preserved.
- `.planning/notes/ai-pipeline-integration-context.md` — ground-truth data topology; explains the `$128,663` parameter-collision bug blocking real salary_intelligence rows

### Prior phase context (carry-forward decisions)
- `.planning/phases/20-foundation-freshness-zod-tailored-resume/20-CONTEXT.md` — Phase 20 patterns: Zod fail-open at jobs-db boundary (D-11), Streamdown default pipeline (D-12), per-section ErrorBoundary (D-09), schema-drift pre-push hook (D-07)
- `.planning/phases/20-foundation-freshness-zod-tailored-resume/20-RESEARCH.md` — Zod + Streamdown patterns
- `.planning/phases/21-polish-copy-pdf-empty-states-link-out/21-CONTEXT.md` — empty-state copy map + isCompanyResearchEmpty predicate pattern (extends to salary case)
- `.planning/phases/21-polish-copy-pdf-empty-states-link-out/21-UI-SPEC.md` — meta-row cadence, color-token semantics, badge sizing (Plan 21-05 quality badge is the closest analog for provenance-tag styling)
- `.planning/phases/21-polish-copy-pdf-empty-states-link-out/21-RESEARCH.md` — Streamdown + Tailwind v4 `@source` directive (already shipped; Phase 22 inherits)

### Research
- `.planning/research/FEATURES.md` §T7 (salary intelligence rendering — MVP scope) + §D3 (distribution visualization — deferred)
- `.planning/research/PITFALLS.md` §Pitfall 5 (salary provenance — the reason AI-RENDER-07 exists)

### Existing code this phase reads or modifies
- `src/app/(admin)/admin/jobs/job-detail-sheet.tsx` — edits: new SalaryIntelligenceSection mount between Tailored Resume and Company Intel; provenance tags on existing salary figure renders; `?? "USD"` default removal
- `src/app/(admin)/admin/jobs/salary-intelligence-section.tsx` — NEW (mirrors tailored-resume-section.tsx structure)
- `src/lib/jobs-db.ts` — edits: `SalaryIntelligence` interface + `getJobDetail` LEFT JOIN LATERAL + `JobDetail.salary_intelligence` field + (optional) remove `cr_salary_currency ?? "USD"` default
- `src/lib/jobs-schemas.ts` — edits: `SalaryIntelligenceSchema` Zod definition + `parseOrLog` wrapping
- `src/lib/empty-state-copy.ts` — edits: add `salary_intelligence: { never: "No salary intelligence yet.", empty: "Salary intelligence was generated but is empty." }` entry
- `scripts/check-jobs-schema.ts` — edits: extend EXPECTED map with `salary_intelligence` table + its 7 columns
- `src/__tests__/lib/jobs-schemas.test.ts` (or equivalent) — new cases for SalaryIntelligenceSchema fail-open
- `src/__tests__/lib/jobs-db.test.ts` (or equivalent) — new cases for the LEFT JOIN LATERAL stub returning null today
- `src/__tests__/components/salary-intelligence-section.test.tsx` — NEW (empty state + populated state fixtures)

### External
- Streamdown (already in deps from Phase 20-01) — renders `llm_analysis` safely

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`src/lib/empty-state-copy.ts`** (Plan 21-06) — const map of verbatim empty-state strings; Phase 22 extends with one new key
- **`src/app/(admin)/admin/jobs/tailored-resume-section.tsx`** (Plan 20-05 + 21-04) — closest analog for SalaryIntelligenceSection; same Streamdown body + FreshnessBadge meta + empty-state branch pattern
- **`src/lib/jobs-schemas.ts`** `parseOrLog` helper (Plan 20-03) — extends to SalaryIntelligenceSchema with zero new infrastructure
- **`src/components/ui/badge.tsx`** (shadcn outline variant) — the provenance tag component
- **`src/components/ui/tooltip.tsx`** — tag tooltips (source explanation on hover)
- **Plan 21-05's `scoreColor`/`scoreLabel` extraction pattern** (`src/lib/score-color.ts`) — if provenance-tag-color logic grows beyond 3 cases, extract as `provenanceColor`/`provenanceLabel` pure functions following the same cadence

### Established Patterns
- **Zod fail-open at boundary** — `parseOrLog(SalaryIntelligenceSchema, raw, "salary_intelligence", jobId)` returns null on parse failure without crashing JobDetail (Phase 20 D-11)
- **Per-section SectionErrorBoundary wrap** — new salary section lives INSIDE its own `<SectionErrorBoundary section="salary_intelligence" jobId={...}>` per Plan 20-06 convention
- **Dual-field dispatch in attachFreshness** — if salary badge needs `search_date` vs `created_at`, `attachFreshness` in `src/lib/attach-freshness.ts` already handles both via `'generated_at' in artifact` type narrowing (Plan 21-00); extension to a third field is a 3-line edit
- **Schema-drift EXPECTED map** — `scripts/check-jobs-schema.ts` extension matches Plan 20-08 + Plan 21-02 precedent

### Integration Points
- **`src/lib/jobs-db.ts`** `getJobDetail` SELECT — adds one LEFT JOIN LATERAL subquery + one parseOrLog block
- **`src/app/(admin)/admin/jobs/job-detail-sheet.tsx`** — adds one `<SalaryIntelligenceSection>` mount between Tailored Resume and Company Intel (disjoint from Phase 21's edits)
- **`src/lib/empty-state-copy.ts`** — one new entry in the const map
- **`src/lib/job-actions.ts`** `attachFreshness` — extends to attach freshness to the new salary_intelligence artifact if it's rendered with a FreshnessBadge (Claude's discretion per D-06)

</code_context>

<specifics>
## Specific Ideas

- Streamdown's default sanitizer handles the `llm_analysis` prose identically to Phase 20's tailored_resume render — zero net-new security surface area
- Provenance tag semantics borrow from finance-reporting conventions: label unverified figures explicitly so the owner doesn't mistake them for gospel
- The `search_date` unique key means there's at most one `salary_intelligence` row per day's market scan — that's the natural "latest" pointer (ORDER BY search_date DESC LIMIT 1 in the LATERAL join)
- If task #11 fix introduces a `company_name` or `job_id` column, the predicate tightening is a 1-line edit in `jobs-db.ts`; Phase 22's SECONDary concern is the renderer surviving until that fix lands

</specifics>

<deferred>
## Deferred Ideas

- **Salary distribution chart / percentile viz** (FEATURES.md D3) — v3.2+; requires stable `report_json` shape first
- **Cross-currency conversion** — neither the owner nor the pipeline has a currency-conversion provider wired up; render raw figures with their declared currency
- **Salary regenerate button** — Phase 24 AI-ACTION-06 (pattern copied from Phase 23's regenerate-cover-letter scaffolding)
- **Auto-trigger salary_intelligence workflow on job creation** — explicitly out-of-scope per REQUIREMENTS.md "Auto-scheduled company_research across all 467 jobs" (same anti-feature class)
- **Historical salary trends (line chart over search_date)** — v3.2+ (requires multiple rows per company/role to be meaningful)
- **LLM-prompt customization UI** — REQUIREMENTS.md anti-feature "Configurable LLM prompts from UI"

**Awaiting upstream:**
- n8n task #11 (batch-INSERT `$N`-collision bug fix) — homelab repo concern; unblocks real `salary_intelligence` rows. Until that ships, Phase 22's renderer is exercised only by tests + fixtures.

</deferred>

---

*Phase: 22-salary-intelligence-defensive-render*
*Context gathered: 2026-04-22 (auto mode — 12 decisions locked using recommended/established patterns from Phases 20-21)*
