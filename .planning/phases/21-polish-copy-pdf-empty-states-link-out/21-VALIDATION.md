---
phase: 21
slug: polish-copy-pdf-empty-states-link-out
status: approved
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-22
approved: 2026-04-22
---

# Phase 21 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution. Derived from `21-RESEARCH.md` §Validation Architecture.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.2 + happy-dom + @testing-library/react 16.3.2 + MSW |
| **Config file** | `vitest.config.ts` (existing, unchanged) |
| **Quick run command** | `npm test -- <path-or-pattern> --run` |
| **Full suite command** | `npm test -- --run` |
| **Estimated runtime** | ~1.5–2 seconds (currently 305 tests; +35–40 new assertions after Phase 21 → ~345–350 tests) |

Additional phase-gate checks beyond the test suite:
- `npm run build` → exit 0 (production Next.js build)
- `npm run test:schema` → exit 0 (requires `JOBS_DATABASE_URL` + the Wave 4 `ALTER TABLE` landed)

---

## Sampling Rate

- **After every task commit:** Run `npm test -- <files-this-task-touched> --run` — typically 5–15 files, ~0.5–1s wall time.
- **After every plan wave:** Run `npm test -- --run` — full suite.
- **Before `/gsd-verify-work`:** Full suite green + `npm run build` exits 0 + `npm run test:schema` exits 0.
- **Max feedback latency:** ~2 seconds.
- **Decision-band coverage (Nyquist minimum):**
  - Empty-state display: 6 fixtures (2 states × 3 sections — "never generated" and "generated but empty" per section)
  - Quality-score bands: 4 fixtures (low / mid / high / null)
  - `normalizeUrl` input/output: 14 fixtures (covers all rows in RESEARCH §Pattern 5)
  - Freshness date format: 2 fixtures (fresh / stale with the new `generatedDate` string)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 21-00-01 | 00 | 1 | (Phase 20 revision — FreshnessBadge prop rename) | — | Hydration-safe server-formatted date | unit (component) | `npm test -- src/__tests__/components/freshness-badge.test.tsx --run` | ✅ existing (modified) | ⬜ pending |
| 21-00-02 | 00 | 1 | (Phase 20 revision — `attachFreshness` Intl.DateTimeFormat) | — | Date formatted via explicit America/Chicago | unit (lib) | `npm test -- src/__tests__/lib/attach-freshness.test.ts --run` | ❌ W0 creates or extends | ⬜ pending |
| 21-01-01 | 01 | 2 | AI-ACTION-02 | T-21-04 (pre-push hook / schema drift) | `pdf_data` column matched in EXPECTED map | unit (lib) + integration | `npm run test:schema` (requires ALTER TABLE landed) | ✅ existing (modified) | ⬜ pending |
| 21-01-02 | 01 | 2 | AI-ACTION-02 | — | Zod validates `pdf_data: z.string().nullable()` | unit (lib) | `npm test -- src/__tests__/lib/jobs-schemas.test.ts --run` | ✅ existing (extends) | ⬜ pending |
| 21-02-01 | 02 | 2 | AI-ACTION-02 | — | `getJobDetail` SELECT includes `tr.pdf_data`; detail view omits bytes | unit (lib) | `npm test -- src/__tests__/lib/jobs-db-pdf.test.ts --run` | ❌ W0 creates | ⬜ pending |
| 21-02-02 | 02 | 2 | AI-ACTION-02 | — | `getTailoredResumePdf(jobId)` returns `pdf_data` or null | unit (lib) | same | ❌ W0 creates | ⬜ pending |
| 21-03-01 | 03 | 2 | AI-ACTION-02 | T-21-06 (auth bypass on PDF route) | `requireRole(["owner"])` gates the route | unit (route handler) | `npm test -- src/__tests__/api/tailored-resume-pdf-route.test.ts --run` | ❌ W0 creates | ⬜ pending |
| 21-03-02 | 03 | 2 | AI-ACTION-02 | — | 200 + correct headers when pdf_data exists; 404 when null; 400 on non-numeric id | unit (route handler) | same | ❌ W0 creates | ⬜ pending |
| 21-04-01 | 04 | 3 | AI-ACTION-01 | T-21-02 (XSS via copied markdown) | `navigator.clipboard.writeText(resume.content)` verbatim | unit (component) | `npm test -- src/__tests__/components/tailored-resume-section.test.tsx --run` | ✅ existing (extends) | ⬜ pending |
| 21-04-02 | 04 | 3 | AI-ACTION-01 | — | `toast.success("Resume copied to clipboard")` fires once per click | unit (component, mocked sonner) | same | ✅ existing (extends) | ⬜ pending |
| 21-04-03 | 04 | 3 | AI-ACTION-01 | — | Icon morphs Copy→Check for 2000ms then reverts | unit (component, `vi.advanceTimersByTime`) | same | ✅ existing (extends) | ⬜ pending |
| 21-04-04 | 04 | 3 | AI-ACTION-01 + AI-ACTION-02 | — | `<a download href="/api/jobs/{id}/tailored-resume-pdf">` rendered in meta row | unit (component) | same | ✅ existing (extends) | ⬜ pending |
| 21-05-01 | 05 | 3 | AI-RENDER-05 | — | `<Badge text-destructive>` for score < 0.6, `text-warning` 0.6–0.8, `text-success` ≥ 0.8 | unit (component, 3 fixtures) | `npm test -- src/__tests__/components/cover-letter-quality-badge.test.tsx --run` | ❌ W0 creates | ⬜ pending |
| 21-05-02 | 05 | 3 | AI-RENDER-05 | — | Badge absent when `quality_score === null` | unit (component) | same | ❌ W0 creates | ⬜ pending |
| 21-05-03 | 05 | 3 | AI-RENDER-05 | — | `scoreColor(x)` maps correctly for low/mid/high bands | unit (pure fn) | `npm test -- src/__tests__/lib/score-color.test.ts --run` | ❌ W0 creates | ⬜ pending |
| 21-06-01 | 06 | 3 | AI-RENDER-04 | — | 6 empty-state strings render verbatim in right branches | unit (component, 6 fixtures) | `npm test -- src/__tests__/components/empty-states.test.tsx --run` | ❌ W0 creates | ⬜ pending |
| 21-06-02 | 06 | 3 | AI-RENDER-04 | — | Empty-state `<p>` uses `text-sm text-muted-foreground italic` | unit (component) | same | ❌ W0 creates | ⬜ pending |
| 21-06-03 | 06 | 3 | AI-RENDER-04 | — | Empty-state suppresses FreshnessBadge + Copy + Download | unit (component) | same | ❌ W0 creates | ⬜ pending |
| 21-06-04 | 06 | 3 | AI-RENDER-04 | — | `isCompanyResearchEmpty({...})` predicate returns true for all-null/empty input | unit (lib/helper) | `npm test -- src/__tests__/lib/is-company-research-empty.test.ts --run` | ❌ W0 creates | ⬜ pending |
| 21-07-01 | 07 | 3 | AI-RENDER-06 | T-21-05 (open-redirect / tabnabbing) | `<a target="_blank" rel="noopener noreferrer">` wraps company name when URL resolves | unit (component) | `npm test -- src/__tests__/components/company-link-out.test.tsx --run` | ❌ W0 creates | ⬜ pending |
| 21-07-02 | 07 | 3 | AI-RENDER-06 | — | `<span>` (plain) when both URLs null | unit (component) | same | ❌ W0 creates | ⬜ pending |
| 21-07-03 | 07 | 3 | AI-RENDER-06 | — | LLM URL preferred; falls back to feed URL when LLM null | unit (component, 2 fixtures) | same | ❌ W0 creates | ⬜ pending |
| 21-07-04 | 07 | 3 | AI-RENDER-06 | — | `ExternalLink` icon has `aria-hidden="true"` | unit (component) | same | ❌ W0 creates | ⬜ pending |
| 21-07-05 | 07 | 3 | AI-RENDER-06 | T-21-05 | `normalizeUrl(input)` produces correct output for all 14 fixtures | unit (pure fn) | `npm test -- src/__tests__/lib/normalize-url.test.ts --run` | ❌ W0 creates | ⬜ pending |
| 21-08-01 | 08 | 4 | AI-ACTION-02 | T-21-04 | n8n Application Packager emits `pdf_data` for new tailored_resumes | manual UAT | run workflow in n8n UI; confirm row has base64 PDF | manual (homelab repo) | ⬜ pending |
| 21-08-02 | 08 | 4 | AI-ACTION-02 | T-21-04 | `tailored_resumes.pdf_data` column exists in prod n8n DB | manual + CI | `npm run test:schema` + `\d tailored_resumes` in psql | manual | ⬜ pending |
| 21-09-01 | 09 | 5 | (meta — ROADMAP + REQUIREMENTS alignment) | — | ROADMAP SC #2 text updated to remove `.md` fallback; REQUIREMENTS.md AI-ACTION-02 wording matches | review | `grep -n "md fallback" .planning/ROADMAP.md` returns nothing | manual | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

New test files to create (Wave assignments match the per-task map above):

**Wave 1:**
- [ ] `src/__tests__/lib/attach-freshness.test.ts` — covers `attachFreshness` date-format revision (or extend existing if present; validate `generatedDate` + `America/Chicago` timezone)

**Wave 2:**
- [ ] `src/__tests__/api/tailored-resume-pdf-route.test.ts` — 200/404/400/auth for `/api/jobs/[id]/tailored-resume-pdf`
- [ ] `src/__tests__/lib/jobs-db-pdf.test.ts` — `getTailoredResumePdf(jobId)` helper

**Wave 3:**
- [ ] `src/__tests__/components/empty-states.test.tsx` — AI-RENDER-04 (6 fixtures)
- [ ] `src/__tests__/components/cover-letter-quality-badge.test.tsx` — AI-RENDER-05 (3 bands + null)
- [ ] `src/__tests__/components/company-link-out.test.tsx` — AI-RENDER-06 (URL resolution + anchor shape)
- [ ] `src/__tests__/lib/normalize-url.test.ts` — `normalizeUrl` (14 fixtures)
- [ ] `src/__tests__/lib/score-color.test.ts` — `scoreColor` / `scoreLabel` pure functions (if extracted per open question 4)
- [ ] `src/__tests__/lib/is-company-research-empty.test.ts` — empty-body predicate

**Shared test fixtures (introduced in Wave 3 or earliest Wave 2 component test that needs them):**
- `Object.assign(navigator, { clipboard: { writeText: vi.fn() } })` — for Copy-button tests (no existing mock in codebase)
- `vi.mock("sonner", () => ({ toast: { success: vi.fn() } }))` — for toast assertions
- Frozen `Date.now` via `vi.useFakeTimers()` + `vi.setSystemTime("2026-05-02T14:00:00.000Z")` — for `attachFreshness` tests

**Framework:** no install needed — Vitest + happy-dom + Testing Library + MSW all present.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| End-to-end PDF download: click Download in browser → receives real `.pdf` bytes | AI-ACTION-02 | Requires n8n Application Packager to have produced a real `pdf_data` row. Gated on Wave 4 (homelab workflow edit + migration). | 1. Confirm `SELECT pdf_data IS NOT NULL FROM tailored_resumes LIMIT 1;` returns `t`. 2. `curl -sI -b <session-cookie> https://thehudsonfam.com/api/jobs/<id>/tailored-resume-pdf \| grep -E 'HTTP/|Content-Type\|Content-Disposition'` — expect `200`, `application/pdf`, `attachment`. 3. Browser UAT: open /admin/jobs, select a job with a resume, click Download, verify PDF opens. |
| End-to-end Copy: click Copy in browser → actually land markdown on system clipboard | AI-ACTION-01 | `navigator.clipboard` behavior in real Chrome/Safari/Firefox differs from happy-dom mock. | 1. Open /admin/jobs, select a job with a resume. 2. Click Copy. 3. Paste into a text editor; verify it's the raw markdown from `resume.content`. 4. Verify sonner toast appears bottom-right with text "Resume copied to clipboard". |
| Company link-out opens real URL in new tab | AI-RENDER-06 | Gated on `company_research` table having non-null `company_url` rows. Today: 0 rows. Gated on Phase 23 owner-triggered research workflow producing rows with URLs. | 1. After Phase 23 lands, trigger a company-research run. 2. Open the job detail sheet. 3. Click the company name in the header. 4. Verify: new tab opens, URL is the normalized form, `Referer` header is absent (noopener noreferrer). |
| Quality badge color bands read correctly on real cover letters | AI-RENDER-05 | Today 0 of 12 cover letters have a score. Badge renders as "absent" (null branch) until the pipeline grader is added (out of Phase 21 scope). | Deferred — when a cover-letter grader ships, sample 3+ cover letters across the red/amber/green bands and confirm the color on screen matches the numeric score. |
| Empty-state copy reads right on real-world missing data | AI-RENDER-04 | Three of six branches are exercisable today (cover-letter-present + research-missing + resume-missing are all common). Three are harder: "generated but empty" body of each. Script a row with empty content into the DB to exercise those. | 1. `UPDATE tailored_resumes SET content = '' WHERE id = <test-id>;` (on a non-prod job). 2. Open the detail sheet. 3. Verify "Tailored resume was generated but is empty." appears. 4. Repeat for cover_letters and company_research. |
| FreshnessBadge shows amber dot on stale cover letter | Phase 20 revision | Time-dependent; needs a cover letter whose `generated_at` > 14 days ago. | 1. `UPDATE cover_letters SET generated_at = NOW() - INTERVAL '20 days' WHERE id = <test-id>;`. 2. Open detail sheet. 3. Verify the amber dot appears next to the badge. 4. Hover: tooltip says "Generated 20 days ago; may need regeneration." |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 2s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-04-22 (plan-checker verdict: 0 blockers, 4 non-blocking warnings)
