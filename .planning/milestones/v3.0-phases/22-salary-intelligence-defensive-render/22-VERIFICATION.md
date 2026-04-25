---
phase: 22-salary-intelligence-defensive-render
verified: 2026-04-22T20:58:00Z
status: passed
score: 5/5 success criteria verified
overrides_applied: 0
re_verification:
  previous_status: none
  previous_score: none
  gaps_closed: []
  gaps_remaining: []
  regressions: []
---

# Phase 22: Salary Intelligence (Defensive Render) Verification Report

**Phase Goal:** Owner sees salary intelligence rendered in the job detail sheet with every figure source-tagged, and the data layer tolerates both the upstream shapes the n8n workflow may produce — the section ships before homelab task #11 lands.

**Verified:** 2026-04-22T20:58:00Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (5 ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Owner sees Salary Intelligence section with Streamdown prose + structured headline figures when a row exists | VERIFIED | `salary-intelligence-section.tsx:74-118` — populated branch renders heading + FreshnessBadge + optional headline row (parseSalaryHeadline) + Streamdown prose (`skipHtml linkSafety.enabled:false`). `salary-intelligence-section.test.tsx` covers populated fixture with `report_json: { min, median, max, currency }` asserting 3 figures render; 12 tests green. 0 live rows today per live-DB inspection, but all 3 branches test-covered. |
| 2 | Every dollar figure carries a source tag — grep gate G-1 enforces adjacency | VERIFIED | `ProvenanceTag` mounted at 3 call sites in `job-detail-sheet.tsx`: header line 165 (`source="scraped"`), Company Intel line 352 (`source="company_research"`), and inside `SalaryIntelligenceSection` line 101 (`source="llm"` per headline figure). `job-detail-sheet.test.tsx:47-90` enforces G-1 via readFileSync + 5-line adjacency scan; also asserts exactly 1 scraped retrofit + 1 company_research retrofit. |
| 3 | Zero rows = AI-RENDER-04 empty state; no crash; `LEFT JOIN LATERAL ... WHERE FALSE` returns null cleanly; 1-line predicate edit path when task #11 lands | VERIFIED | `jobs-db.ts:335-344` — `LEFT JOIN LATERAL (SELECT ... FROM salary_intelligence si WHERE FALSE ORDER BY search_date DESC LIMIT 1) si ON TRUE`. Comment at line 339 documents 1-line predicate tightening path. `salary-intelligence-section.tsx:43-55` renders missing-branch: heading + `EMPTY_STATE_COPY.salary_intelligence.missing` ("No salary intelligence yet."). Test coverage: `salary-intelligence-section.test.tsx:58-64` asserts null-salary renders exactly the missing copy. (Wording updated during Plan 22-08 to reflect live-DB reality — table is keyed on `search_date` with no `job_id`/`company_name` cols.) |
| 4 | `jobs-db.ts` exports `SalaryIntelligence` TS type + matching Zod schema; fail-open parseOrLog returns null + logs on malformed row | VERIFIED | TS interface: `jobs-db.ts:85-93` (7 fields). Zod: `jobs-schemas.ts:66-74` — permissive `report_json: z.unknown()` per D-01. parseOrLog wiring at `jobs-db.ts:408-425`. Test coverage: `jobs-db-zod.test.ts:158` describe block `SalaryIntelligenceSchema — fail-open validation at DB boundary` with 13 cases including 8-way it.each permissive-report_json matrix + malformed-row fail-open assertion. |
| 5 | `?? "USD"` default removed; null `salary_currency` hides the salary block entirely | VERIFIED | Grep gate G-6: `grep -n '?? "USD"' src/lib/jobs-db.ts` → 0 matches. `job-detail-sheet.tsx:161` guards header on `detail.salary_currency` truthy check after `formatSalary()`. Line 345 guards Company Intel on `detail.company_research.salary_currency` truthy. Test: `job-detail-sheet.test.tsx:94-104` asserts header guard text pattern. |

**Score:** 5/5 truths verified

### Required Artifacts (11 files, 3 levels verified)

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/provenance.ts` | Pure `provenanceColor` + `provenanceLabel` + `ProvenanceSource` union | VERIFIED | 58 lines; exhaustive switch; imported by `provenance-tag.tsx`; 10 test cases in `provenance.test.ts` |
| `src/lib/parse-salary-report.ts` | `parseSalaryHeadline` + `HeadlineShape` / `HeadlineFigure` types | VERIFIED | 89 lines; pure; case-insensitive key lookup; currency gate (no USD default per D-12); imported by `salary-intelligence-section.tsx` |
| `src/lib/format-salary.ts` | `formatSingleSalary(n, currency)` pure formatter | VERIFIED | 28 lines; USD/GBP/EUR symbol prefix + ISO fallback; empty string on NaN/null currency; imported by `salary-intelligence-section.tsx` |
| `src/lib/empty-state-copy.ts` | +salary_intelligence entry (2 verbatim strings) | VERIFIED | Lines 28-31; G-3 test-enforced via `salary-intelligence-section.test.tsx:148-167` |
| `src/lib/attach-freshness.ts` | Tri-field dispatch (generated_at → search_date → created_at) | VERIFIED | Lines 39-44 dispatch; test coverage in `attach-freshness.test.ts` |
| `src/lib/jobs-schemas.ts` | +SalaryIntelligenceSchema + CompanyResearch nullable cascade | VERIFIED | Schema at lines 66-74; permissive `z.unknown()` report_json per D-01 |
| `src/lib/jobs-db.ts` | LEFT JOIN LATERAL + SalaryIntelligence interface + parseOrLog + no `?? "USD"` | VERIFIED | Interface lines 85-93; JOIN lines 335-344; parseOrLog lines 408-425; G-6 = 0 matches |
| `src/app/(admin)/admin/jobs/salary-intelligence-section.tsx` | 3-branch client component | VERIFIED | 119 lines; null branch, empty branch, populated branch all present; Streamdown wired |
| `src/app/(admin)/admin/jobs/provenance-tag.tsx` | Badge+Tooltip wrapper consuming provenance.ts helpers | VERIFIED | 63 lines; 4-source TOOLTIPS map; Radix Tooltip + shadcn Badge |
| `src/app/(admin)/admin/jobs/job-detail-sheet.tsx` | Mount + 2 ProvenanceTag retrofits + SectionErrorBoundary wrap + 2 currency guards | VERIFIED | Mount lines 267-282; retrofits at 165 + 352; currency guards at 161 + 345 |
| `scripts/check-jobs-schema.ts` | EXPECTED map extension (salary_intelligence: 7 cols) | VERIFIED | Lines 40-43 — `["id","search_date","report_json","raw_results","llm_analysis","created_at","updated_at"]` |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| `job-detail-sheet.tsx` | `salary-intelligence-section.tsx` | import + mount inside `<SectionErrorBoundary section="salary_intelligence">` | WIRED | Lines 39, 267-282 |
| `job-detail-sheet.tsx` | `provenance-tag.tsx` | import + 2 retrofit mounts | WIRED | Lines 40, 165, 352 |
| `salary-intelligence-section.tsx` | `parse-salary-report.ts` | `parseSalaryHeadline` call | WIRED | Line 58 |
| `salary-intelligence-section.tsx` | `format-salary.ts` | `formatSingleSalary` call | WIRED | Line 99 |
| `salary-intelligence-section.tsx` | `empty-state-copy.ts` | `EMPTY_STATE_COPY.salary_intelligence.{missing,empty}` reads | WIRED | Lines 51, 68 |
| `salary-intelligence-section.tsx` | `provenance-tag.tsx` | `<ProvenanceTag source="llm" />` per headline figure | WIRED | Line 101 |
| `provenance-tag.tsx` | `provenance.ts` | `provenanceColor` + `provenanceLabel` + `ProvenanceSource` | WIRED | Lines 9-13, 53, 55 |
| `jobs-db.ts` | `jobs-schemas.ts` | `SalaryIntelligenceSchema` + `parseOrLog` | WIRED | Lines 6, 409, 424 |
| `jobs-db.ts` getJobDetail | salary_intelligence table | `LEFT JOIN LATERAL` + parseOrLog at return boundary | WIRED (returns null today) | Lines 335-344, 408-425 |
| `job-actions.ts` fetchJobDetail | `attach-freshness.ts` | `attachFreshness<SalaryIntelligence>` call | WIRED | Per 22-SUMMARY `files_modified` |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `SalaryIntelligenceSection` | `salary: SalaryIntelligenceView \| null` | `getJobDetail` → `LEFT JOIN LATERAL ... WHERE FALSE` | No (intentional — 0 rows by design pending n8n task #11) | INTENTIONALLY_STATIC |
| `ProvenanceTag` (header) | `source="scraped"` (literal) | N/A (static tag) | N/A | N/A |
| `ProvenanceTag` (Company Intel) | `source="company_research"` (literal) | N/A (static tag) | N/A | N/A |

**Note on dead-UI-by-design:** Phase 22's 22-SUMMARY explicitly acknowledges "Phase 22's value is 100% forward-looking regression prevention — the day upstream data lands, the UI comes online without any further code changes." The WHERE FALSE predicate is the *contract* (SC #3). Once n8n task #11 lands (homelab-repo concern; tracked in SEED-005), the predicate tightens via 1-line edit (`si.report_json->>'company_name' ILIKE j.company` or similar per 22-SUMMARY). This is NOT a data-flow gap — it is the explicit Phase 22 design.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Full vitest suite passes | `npm test -- --run` | `Test Files 30 passed (30) · Tests 450 passed (450)` in 3.45s | PASS |
| Production build succeeds | `npm run build` | Route manifest printed; Next standalone output generated; exit 0 | PASS |
| Schema-drift guard | `npm run test:schema` | Exits 0; skips live check when `JOBS_DATABASE_URL` not set (by design) | PASS |
| G-6 grep gate: no `?? "USD"` in jobs-db.ts | `grep -c '?? "USD"' src/lib/jobs-db.ts` | 0 matches | PASS |
| G-2 grep gate: no raw Tailwind colors in Phase 22 .tsx | `grep -E '(text\|bg\|border)-(red\|amber\|yellow\|green\|emerald\|orange\|blue\|gray\|zinc\|slate)-[0-9]' {provenance.ts,provenance-tag.tsx,salary-intelligence-section.tsx}` | 0 matches across all 3 files | PASS |

### Requirements Coverage

| Requirement | Source Plan(s) | Description | Status | Evidence |
|-------------|----------------|-------------|--------|----------|
| AI-RENDER-03 | 22-06, 22-07, 22-08 | Salary intelligence rendered with Streamdown prose + headline figures + empty state | SATISFIED | `salary-intelligence-section.tsx` 3-branch; `job-detail-sheet.tsx:271` mount; 12 test cases |
| AI-RENDER-07 | 22-05, 22-07, 22-08 | Provenance tags on every salary figure (grep gate G-1) | SATISFIED | `ProvenanceTag` component + 3 mount sites; G-1 test-enforced via readFileSync in `job-detail-sheet.test.tsx:47-90` |
| AI-DATA-01 | 22-02, 22-08 | `getJobDetail` defensive LEFT JOIN LATERAL | SATISFIED | `jobs-db.ts:335-344` — `LEFT JOIN LATERAL ... WHERE FALSE ORDER BY search_date DESC LIMIT 1 si ON TRUE` |
| AI-DATA-02 | 22-01, 22-02, 22-03, 22-04, 22-08 | `SalaryIntelligence` TS type + Zod schema + fail-open parseOrLog | SATISFIED | `jobs-db.ts:85-93` interface; `jobs-schemas.ts:66-74` schema; `jobs-db.ts:408-425` parseOrLog wiring; 13+ test cases |

**Orphaned requirements:** None. All 4 Phase 22 REQs from REQUIREMENTS.md are claimed in plan frontmatter and satisfied by implementation.

### Grep Gate Verification (7 UI-SPEC gates)

| Gate | Rule | Verification | Status |
|------|------|--------------|--------|
| G-1 | Every `formatSalary(` in `job-detail-sheet.tsx` within 5 lines of `<ProvenanceTag` or `<Badge variant="outline"` | Test-enforced via readFileSync scan in `job-detail-sheet.test.tsx:47-69` | PASS |
| G-2 | No raw Tailwind color class names in Phase 22 new .tsx/.ts files | Grep returns 0 matches across `provenance.ts`, `provenance-tag.tsx`, `salary-intelligence-section.tsx` | PASS |
| G-3 | Empty-state strings imported from `EMPTY_STATE_COPY` (not inlined) in `salary-intelligence-section.tsx` | Drift-guard via `salary-intelligence-section.test.tsx:148-160` — verbatim-string assertion both branches | PASS |
| G-4 | `<SectionErrorBoundary section="salary_intelligence"` wraps `<SalaryIntelligenceSection>` in `job-detail-sheet.tsx` | Multi-line regex at `job-detail-sheet.test.tsx:84-89` + live-code lines 267-282 | PASS |
| G-5 | Anti-CTA — no imperative verbs + no trailing `!` + one period per line in salary_intelligence copy | it.each drift-guard at `salary-intelligence-section.test.tsx:162-167`; empty-state-copy.ts lines 28-31 pass imperative regex | PASS |
| G-6 | `?? "USD"` does NOT appear in `src/lib/jobs-db.ts` | `grep -c '?? "USD"' src/lib/jobs-db.ts` = 0 | PASS |
| G-7 | `tabular-nums` class present on salary figure `<span>` in `SalaryIntelligenceSection` | `salary-intelligence-section.tsx:98` — `className="text-sm font-semibold text-foreground tabular-nums"` | PASS |

### Anti-Patterns Found

None. Scans across all Phase 22 new/modified files returned zero matches for:
- `TODO` / `FIXME` / `HACK` / `PLACEHOLDER` in the 11 Phase 22 artifacts (apart from a deliberate, documented `WHERE FALSE -- Phase 22 D-03: zero matches pending n8n task #11 fix` code comment at `jobs-db.ts:339` — this is the Phase 22 contract, not a placeholder).
- Empty implementations (`return null` without branch logic, `=> {}` handlers).
- `console.log`-only stubs.
- Hardcoded empty props bypassing real data sources.

**Note:** The `WHERE FALSE` predicate is classified as INTENTIONAL (SC #3 contract + 1-line predicate edit migration path) not as an anti-pattern. It is test-covered (null-branch in section test) and forward-compatible (predicate tightens to real match condition when task #11 lands upstream).

### Human Verification Required

None for code verification. Production UAT on `https://thehudsonfam.com/admin/jobs` is explicitly deferred to v3.5-P4 per the Phase 22 close decision (same CI/CD pipeline block that deferred Plan 21-08). This deferral is:
- Documented in 22-SUMMARY §Deferred to v3.5-P4
- Documented in ROADMAP.md line 128 (`CODE COMPLETE 2026-04-22, prod UAT deferred to v3.5`)
- Documented in REQUIREMENTS.md traceability rows (4× "Code complete (2026-04-22) — prod UAT deferred to v3.5")
- Tracked in seed SEED-005

Phase 22 code-complete verification is PASSED. Retroactive prod UAT happens once the v3.5 milestone unblocks the broken Forgejo+Woodpecker deploy path.

### Gaps Summary

None. All 5 ROADMAP Success Criteria verified with code + tests. All 4 REQs marked complete in REQUIREMENTS.md and traceable through the 8 plans. All 7 UI-SPEC grep gates enforced (test-time or direct grep=0 verification). Full vitest suite 450/450 green; production build exit 0; schema-drift guard exit 0.

The live-DB `salary_intelligence` table has 0 rows today — this is BY DESIGN (SC #3: "`WHERE FALSE` skeleton ... returns null cleanly today"). The missing-branch empty-state is the rendered UI until n8n task #11 (homelab upstream) lands; when it does, a 1-line predicate edit in `jobs-db.ts:339` activates the populated branch without any other code changes.

Phase 22 goal is achieved: owner (once data lands) sees salary intelligence in the detail sheet with every figure source-tagged; the data layer tolerates the upstream shape via permissive Zod (`z.unknown()`) + runtime duck-typing (`parseSalaryHeadline`); the section shipped before homelab task #11.

---

*Verified: 2026-04-22T20:58:00Z*
*Verifier: Claude (gsd-verifier)*
