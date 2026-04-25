# Phase 20: Foundation (Freshness + Zod + Tailored Resume) — Context

**Gathered:** 2026-04-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Establish the cross-cutting infrastructure that every later v3.0 phase depends on, and close the most visible rendering gap. Concretely:

1. Pure `isStale()` freshness util with Vitest coverage (AI-DATA-03)
2. Zod `safeParse` wrapping every LLM-artifact read at the `jobs-db.ts` boundary with fail-open logging (AI-SAFETY-06)
3. Schema-drift guardrail test (AI-DATA-04)
4. Streamdown-based tailored resume rendering in `job-detail-sheet.tsx` (AI-RENDER-01)
5. `generated_at` + `model_used` freshness badges on every AI artifact section (AI-RENDER-02)
6. Markdown XSS protection — Streamdown default-safe pipeline, no `rehype-raw`, test fixture verifies `<script>` renders as text (AI-SAFETY-01)
7. Content-Security-Policy header on `/admin/*` (AI-SAFETY-05)

**Not in this phase (belongs elsewhere):** Copy/PDF/empty-states/link-out (Phase 21), salary intelligence rendering (Phase 22), owner-triggered regenerate/research (Phases 23–24), inline edit (v3.1).

</domain>

<decisions>
## Implementation Decisions

### Stale threshold

- **D-01:** Per-artifact thresholds, not a single global. Map:
  - Cover letter: **14 days** (hiring moves fast)
  - Tailored resume: **14 days** (tied to cover letter)
  - Company research: **60 days** (company facts change slowly)
  - Salary intelligence: **30 days** (market data is mid-velocity)
- **D-02:** Stale indicator is a **subtle amber dot next to the `generated_at` timestamp**; hover shows a tooltip: "Generated N days ago; may need regeneration."
- **D-03:** Stale state is **purely informational — it does NOT alter the regenerate button** (Phase 23). The regenerate button's visual treatment is always the same whether the artifact is stale or fresh. This keeps Phase 20's display logic decoupled from Phase 23's action UI.

### Content-Security-Policy (CSP)

- **D-04:** Pragmatic CSP, not strict nonce-everywhere:
  ```
  default-src 'self';
  script-src 'self' 'nonce-{generated-per-request}';
  style-src 'self' 'unsafe-inline';
  object-src 'none';
  frame-ancestors 'none';
  base-uri 'self';
  ```
  Rationale: Next.js 16 injects nonces for its own scripts cleanly. Keeping `'unsafe-inline'` for styles preserves Tailwind v4 runtime style injection without breaking shadcn. Scripts are the XSS vector; styles are not.
- **D-05:** CSP **scoped to `/admin/*` only**, not site-wide. Implementation: Next.js middleware with matcher `['/admin/:path*']`. The public site has no markdown-rendering path; narrowing scope reduces risk of breaking blog MDX, photo OG tags, memorial media embeds.
- **D-06:** CSP is **enforced from day one, not Report-Only**. Report-Only delays real protection; tailored resume is the first markdown-rendered surface — block XSS immediately.

### Schema-drift test (AI-DATA-04)

- **D-07:** Claude's discretion → **local-only `npm run test:schema` script, wired as a pre-push git hook**. The script connects via `DATABASE_URL` (dev env has real n8n DB), queries `information_schema.columns`, and fails with a clear "column X missing from table Y" message on drift. Simplest ship path for a solo-dev project; escalate to CI only if drift slips past the pre-push hook.
- **D-08:** Scope limited to **columns referenced in `jobs-db.ts`** — not a full schema-snapshot comparison. We only care if OUR queries break; n8n itself adds columns on upgrades and that noise is irrelevant here.

### Error boundary granularity

- **D-09:** Claude's discretion → **per-section ErrorBoundary**. Each collapsible LLM-artifact section (cover letter, company research, tailored resume, salary intel when added in Phase 22) is wrapped in its own React ErrorBoundary. Cost: ~4 extra wrapper components in `job-detail-sheet.tsx`. Benefit: if tailored resume's markdown throws, cover letter still renders. Aligns with Pitfall 4 mitigation.
- **D-10:** Fallback UI is a **muted inline message**: "Couldn't render this section — the data may have changed shape." Error is logged server-side via `console.error` (visible in Sentry/kube logs). No error stack or raw exception surfaces to the client (Pitfall 3 sentinel-error policy).

### Zod validation (AI-SAFETY-06)

- **D-11:** Fail-open pattern (milestone-level decision, not re-litigated): `safeParse` at the return boundary of every `getJobDetail`-adjacent function; on failure log `console.error` with the row ID + column + Zod error, return `null` for that nested artifact (or empty/defaulted value), keep the page alive. Coupled with per-section ErrorBoundary (D-09) for rendering failures that slip past Zod.

### Streamdown configuration (AI-RENDER-01 + AI-SAFETY-01)

- **D-12:** Use Streamdown's **default sanitizer pipeline**. Do NOT enable `rehype-raw`. Do NOT layer an additional `rehype-sanitize` until Streamdown's defaults are verified insufficient.
- **D-13:** Ship the XSS test fixture in the same PR: a `tailored_resumes.content` row containing `<script>alert(1)</script>`, `<iframe src=javascript:...>`, and `<img onerror=...>` must render as literal text, verified by a Vitest test using the Streamdown component.
- **D-14:** Add `@source "../../node_modules/streamdown/dist/**/*.js";` to `src/styles/globals.css` so Tailwind v4 picks up Streamdown's utility classes for its prose styles.

### Claude's Discretion

- Freshness badge visual design within the "amber dot + tooltip" envelope (exact dot size, tooltip component choice — shadcn `Tooltip` vs plain `title` attr)
- `isStale()` signature shape (`isStale(timestamp, thresholdDays): boolean` vs returning a classification object) — decide during planning
- ErrorBoundary component choice — react-error-boundary lib vs hand-rolled class component. Hand-rolled is fine for 4 boundaries; no new dep needed.
- `test:schema` implementation — standalone node script vs Vitest integration test. Both are acceptable; pick whichever keeps the dev loop tightest.
- Per-request CSP nonce plumbing — Next.js 16 middleware + header pass-through; exact helper name is Claude's call.

### Folded Todos

None — Phase 20's scope is orthogonal to the 11 open todos on the homelab backlog.

</decisions>

<canonical_refs>
## Canonical References

Downstream agents MUST read these before planning or implementing.

### Requirements and scope
- `.planning/REQUIREMENTS.md` — 24 v1 REQs; Phase 20 owns AI-RENDER-01, AI-RENDER-02, AI-SAFETY-01, AI-SAFETY-05, AI-SAFETY-06, AI-DATA-03, AI-DATA-04
- `.planning/ROADMAP.md` — Phase 20 entry with success criteria
- `.planning/notes/ai-pipeline-integration-context.md` — ground-truth data topology and scope boundaries (interview_prep and recruiter_outreach are OUT of scope)

### Research
- `.planning/research/SUMMARY.md` — executive synthesis (read first)
- `.planning/research/STACK.md` — Streamdown vs react-markdown rationale, Recharts note (Phase 22 concern), `@source` directive requirement
- `.planning/research/ARCHITECTURE.md` — `isStale()` placement, error-boundary pattern, ADR-01 salary placement (Phase 22 concern), retrofit plan for existing `fireWebhook()` (Phase 23 concern)
- `.planning/research/PITFALLS.md` — Pitfall 1 (XSS), Pitfall 4 (schema drift), Pitfall 6 (stale cache baseline)
- `.planning/research/FEATURES.md` — T1 (tailored resume), T4/T5 (freshness badges)

### Project-level
- `CLAUDE.md` §"Color System" — OKLCH tokens; Streamdown prose must use these, no hardcoded Tailwind colors
- `CLAUDE.md` §"Testing" — Vitest + happy-dom + Testing Library; add Streamdown XSS fixture to `__tests__`

### External (HIGH relevance)
- [vercel/streamdown](https://github.com/vercel/streamdown) — renderer docs
- [Next.js CSP middleware pattern](https://nextjs.org/docs/app/building-your-application/configuring/content-security-policy) — nonce generation pattern for Next.js 16 App Router

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`src/lib/jobs-db.ts:271-398`** — `getJobDetail()` already LEFT JOINs `cover_letters` + `company_research` + `tailored_resumes` + queries `recruiter_outreach`. Zod wrapping is additive at the return boundary; no query changes needed for Phase 20.
- **`src/lib/jobs-db.ts:45-88`** — `CoverLetter`, `CompanyResearch`, `TailoredResume` TS types already exported. Phase 20 creates matching Zod schemas next to them (new file `src/lib/jobs-schemas.ts`), then has the types inferred via `z.infer`.
- **`src/app/(admin)/admin/jobs/job-detail-sheet.tsx:253 lines`** — existing rendering pattern uses shadcn `Card`, `Badge`, `CardHeader`, `pre-wrap`. Tailored resume section follows the same visual language.
- **`src/components/ui/`** — 41 shadcn components; `Tooltip`, `Badge`, `Card`, `Collapsible` all present. No new shadcn installs required for Phase 20.

### Established Patterns
- **OKLCH @theme tokens** in `src/styles/globals.css` — every color reference must be a semantic token (CLAUDE.md rule). Streamdown prose inherits via `@source` directive + Tailwind's typography plugin-free approach (Tailwind v4 handles prose via arbitrary variants).
- **Server-first rendering** — `job-detail-sheet.tsx` receives data as a prop; data fetching already runs server-side via `fetchJobDetail` Server Action in `job-actions.ts:77`. Phase 20 does not change this boundary.
- **No `use client` at page level** — `page.tsx` stays server; only interactive sub-components are client. New `FreshnessBadge` and `TailoredResumeSection` stay on the server side wherever possible; only `Tooltip` (interactive) marks the boundary.

### Integration Points
- **`src/lib/jobs-db.ts:398` return point** — where Zod `safeParse` wrappers land
- **`src/lib/jobs-schemas.ts`** (NEW) — colocate Zod schemas beside the existing types
- **`src/lib/job-freshness.ts`** (NEW) — `isStale(timestamp, thresholdDays): boolean` pure util + per-artifact threshold constants
- **`src/app/(admin)/admin/jobs/job-detail-sheet.tsx`** — inserts new `<TailoredResumeSection>` after the existing cover letter block; wraps each section in `<ErrorBoundary fallback={<SectionFallback />}>`
- **`middleware.ts`** (NEW or extended) — CSP header + per-request nonce; matcher `/admin/:path*`
- **`next.config.ts:34-40`** — existing `experimental.serverActions` block; CSP lives in middleware, not here
- **`src/styles/globals.css:1-2`** — add `@source "../../node_modules/streamdown/dist/**/*.js";` after the existing `@import` statements

</code_context>

<specifics>
## Specific Ideas

- Amber dot for stale indicator → `--color-warning` token in globals.css (already exists per CLAUDE.md color system)
- Tooltip copy: "Generated N days ago; may need regeneration" — use `formatDistance` from `date-fns` if installed, else a plain days-ago helper
- XSS test fixture content: include three classic vectors — `<script>alert(1)</script>`, `<iframe src="javascript:alert(1)"></iframe>`, `<img src=x onerror=alert(1)>`
- Schema-drift error message format: `"Expected column 'X' on table 'Y' (referenced in jobs-db.ts:LINE); not found in n8n database."` — explicit enough that a five-second read fixes the drift

</specifics>

<deferred>
## Deferred Ideas

**To Phase 21:** Copy-to-clipboard on tailored resume, PDF download, empty-state messaging, company link-out.
**To Phase 22:** Salary intelligence rendering, salary provenance tags.
**To Phase 23:** Regenerate buttons, company-research manual trigger, HMAC + idempotency + sentinel errors.
**To Phase 24:** Silent-success error detection.
**To v3.1:** Inline edit, revert-to-original.
**To v3.1+ (SEED-001):** Aggregate pipeline-health dashboard.

**Discussed and cut during scoping:**
- Strict nonce-everywhere CSP — rejected as pragmatic CSP is sufficient for our threat model and avoids ~50 LOC of nonce plumbing for styles
- Report-Only CSP rollout — rejected; delays real protection for a single-user admin surface where a broken style is trivial to hotfix
- CI-integration schema test — deferred to backup plan if pre-push hook proves unreliable
- Stale as a regenerate-button state modifier — rejected to keep Phase 20 display logic decoupled from Phase 23 action UI

**From milestone scoping (seeds), not planted during this phase:**
- SEED-002 Qwen photo captions, SEED-003 Qdrant semantic search, SEED-004 Tdarr/Jellyfin family media — all unrelated to v3.0 scope

</deferred>

---

*Phase: 20-foundation-freshness-zod-tailored-resume*
*Context gathered: 2026-04-21*
