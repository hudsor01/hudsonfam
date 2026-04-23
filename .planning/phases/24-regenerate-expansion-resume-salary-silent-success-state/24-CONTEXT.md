# Phase 24: Regenerate Expansion (Resume + Salary + Silent-Success State) - Context

**Gathered:** 2026-04-23 (auto mode — 10 decisions locked; pattern-copy of Phase 23 with 1 net-new UX primitive for AI-ACTION-07)
**Status:** Ready for planning

<domain>
## Phase Boundary

Extend the Phase 23 regenerate pattern to two more artifacts (tailored resume + salary intelligence) and introduce the silent-success warning UX (AI-ACTION-07). 3 REQs: AI-ACTION-05, AI-ACTION-06, AI-ACTION-07. Per ROADMAP SC #4, this phase ALSO refactors `regenerate-cover-letter-button.tsx` (Phase 23) into a shared `regenerate-button.tsx` generic component so all 3 regenerate actions use one component + one signed-webhook pattern.

**What ships end-to-end this phase:**
1. Refactor `src/app/(admin)/admin/jobs/regenerate-cover-letter-button.tsx` → `src/app/(admin)/admin/jobs/regenerate-button.tsx` (generalized; accepts artifact + label + predicate props); Phase 23's button becomes one of three instantiations
2. 2 new Server Actions: `regenerateTailoredResume(jobId)` + `regenerateSalaryIntelligence(jobId)` — both clone `regenerateCoverLetter` shape with pre-webhook baseline read + sendSignedWebhook (AI-ACTION-05, AI-ACTION-06)
3. 2 new mount sites in `job-detail-sheet.tsx`: Regenerate button in Tailored Resume section meta row; Regenerate button in Salary Intelligence section meta row (next to FreshnessBadge + any existing download controls)
4. AI-ACTION-07 silent-success warning: when webhook returns `{ ok: true }` BUT polling exhausts 60 iterations without the predicate returning true, display a distinct warning under the button: "Regeneration reported success but no new content was written — check n8n logs." Differentiated visually from the sentinel error (warning token, not destructive).
5. n8n workflow updates (homelab repo — tracked but shipped separately): 2 new webhook entrypoints (`regenerate-tailored-resume`, `regenerate-salary-intelligence`) with the same HMAC verification + idempotency dedup as Phase 23's `regenerate-cover-letter`

**Key fact corrections during execution:**
- **ROADMAP SC #2 wording is stale:** says "polls `salary_intelligence.generated_at` until it advances" but the `salary_intelligence` table has NO `generated_at` column — it has `search_date` (date, not timestamp) per Phase 22 D-03. Planner corrects SC #2 during Plan 24-08 meta-doc finalization; actual polling predicate uses `search_date > baseline_search_date` (date comparison, not timestamp).
- **REQUIREMENTS.md AI-ACTION-05 + AI-ACTION-06 checkboxes are prematurely `[x]`** from some earlier marking — planner verifies traceability rows are still marked "Pending" and this phase actually delivers them.

**Not in this phase:**
- Fourth regenerate artifact type — only 3 defined today (cover letter, tailored resume, salary intelligence); if a future LLM artifact is added, it inherits this phase's pattern with 1 Server Action + 1 button prop
- Retry-with-backoff for silent-success cases (owner clicks button again if they want to retry)
- Configurable poll cadence per artifact (all 3 use 3s / 60 cap from Phase 23)
- n8n workflow code in this repo

</domain>

<decisions>
## Implementation Decisions

### Shared component refactor (SC #4)

- **D-01 [--auto]:** Rename `src/app/(admin)/admin/jobs/regenerate-cover-letter-button.tsx` → `src/app/(admin)/admin/jobs/regenerate-button.tsx`. Generalize props to:
  ```ts
  interface RegenerateButtonProps {
    jobId: number;
    artifact: "cover_letter" | "tailored_resume" | "salary_intelligence";
    label: string;  // "Regenerate cover letter" | "Regenerate tailored resume" | "Regenerate salary intelligence"
    action: (jobId: number) => Promise<RegenerateResult>;  // one of the 3 Server Actions
    isDone: (detail: FreshJobDetail | null, serverBaseline: string | null) => boolean;
    baselineGeneratedAt: string | null;  // prop fallback; null for salary (uses search_date as date, not timestamp)
  }
  ```
  `RegenerateResult = { ok: true, baseline: string | null } | { ok: false, sentinel: ErrorSentinel }` stays identical across all 3 actions.

- **D-02 [--auto]:** The existing mount in `job-detail-sheet.tsx` Cover Letter meta row rewires from `<RegenerateCoverLetterButton jobId={} baselineGeneratedAt={} />` to `<RegenerateButton jobId={} artifact="cover_letter" label="Regenerate cover letter" action={regenerateCoverLetter} isDone={coverLetterIsDone} baselineGeneratedAt={detail.cover_letter?.generated_at ?? null} />`. Per-artifact `isDone` predicates live as pure functions at the top of `regenerate-button.tsx` OR in a new `src/lib/regenerate-predicates.ts` — Claude's discretion. 17-case test suite from Plan 23-06 ports to the generalized component with artifact="cover_letter" fixture; new test file covers the other 2 artifacts.

### New Server Actions (AI-ACTION-05 + AI-ACTION-06)

- **D-03 [--auto]:** `regenerateTailoredResume(jobId): Promise<{ ok: true, baseline: string | null } | { ok: false, sentinel: ErrorSentinel }>` — exact clone of `regenerateCoverLetter` from Plan 23-02, substituting: webhook path `"regenerate-tailored-resume"`; baseline read from `tailored_resumes.generated_at` via `getJobDetail(jobId).then(d => d?.tailored_resume?.generated_at ?? null)`. First line `await requireRole(["owner"])` (D-12 Phase 23 CI grep rule enforces adjacency). Returns `{ ok: false, sentinel: "unavailable" }` on DB read failure WITHOUT firing the webhook (T-23-02-05 pattern).

- **D-04 [--auto]:** `regenerateSalaryIntelligence(jobId): Promise<{ ok: true, baseline: string | null } | { ok: false, sentinel: ErrorSentinel }>` — clone pattern, substituting: webhook path `"regenerate-salary-intelligence"`; baseline read from `salary_intelligence.search_date` via `getJobDetail(jobId).then(d => d?.salary_intelligence?.search_date ?? null)`. **Important semantic note:** `search_date` is a Postgres `date` (YYYY-MM-DD), not a timestamp. The predicate `new Date(current_search_date) > new Date(baseline_search_date)` is date-granular; regenerating multiple times within the same day would NOT advance `search_date`. This is a known limitation documented in AI-ACTION-07's rationale — if the owner clicks regenerate at 10am and again at 3pm on the same date, the 3pm click WILL trigger the silent-success warning because `search_date` hasn't advanced (it only advances on days where the n8n workflow captures a new market sample). Planner documents this in 24-SUMMARY.md as a known rough edge; Phase 25+ may add a `generated_at` column to `salary_intelligence` to disambiguate (deferred).

### Silent-success warning (AI-ACTION-07)

- **D-05 [--auto]:** Distinct warning UX when webhook returns `{ ok: true }` AND polling exhausts 60 iterations without `isDone` returning true. Visual: inline paragraph under the button, `text-warning text-xs mt-1 italic`. Copy: verbatim from SC #3 — "Regeneration reported success but no new content was written — check n8n logs." Distinguished from sentinel errors (which use `text-destructive`) via the warning color token and italic treatment. NO trailing exclamation (anti-CTA inherited from Plan 21-06).

- **D-06 [--auto]:** State machine extension — `regenerate-button.tsx` adds a 4th state variant:
  ```ts
  type ButtonState =
    | { kind: "idle" }
    | { kind: "in-progress"; serverBaseline: string | null }
    | { kind: "error"; sentinel: ErrorSentinel }
    | { kind: "silent-success" };  // NEW — webhook ok but poll exhausted
  ```
  On poll exhaustion: if server returned `{ ok: true }`, transition to `silent-success` (warning visible, button re-enables for retry). If server returned `{ ok: false }`, transition to `error` (sentinel visible, existing Phase 23 behavior). The two terminal states are MUTUALLY EXCLUSIVE — a failed webhook never produces silent-success.

### Test strategy

- **D-07 [--auto]:** Rename `src/__tests__/components/regenerate-cover-letter-button.test.tsx` → `src/__tests__/components/regenerate-button.test.tsx`. Port all 17 Phase 23 cases to instantiate the generalized component with `artifact="cover_letter"` fixture — zero behavior drift expected. Add new cases:
  - Tailored resume: baseline ISO → polls until `tailored_resume.generated_at > baseline` → done
  - Salary intelligence: baseline date string (YYYY-MM-DD) → polls until `salary_intelligence.search_date > baseline` → done
  - Silent-success: webhook returns `{ ok: true }` + 60-poll exhaustion → state transitions to `silent-success` + warning text rendered verbatim (SC #3)
  - Silent-success copy verbatim: "Regeneration reported success but no new content was written — check n8n logs." (exact string, no punctuation drift)
  - Salary date-granularity rough edge: document as a test that same-day regenerate triggers silent-success (fixture: baseline = "2026-04-23", current = "2026-04-23" after webhook → no advance → silent-success)

- **D-08 [--auto]:** New test file `src/__tests__/lib/job-actions.regenerate.test.ts` — extends the Phase 23 `job-actions.trigger.test.ts` pattern with cases for both new Server Actions. Per-action: (a) requireRole denial; (b) success returns `{ ok: true, baseline: string | null }`; (c) sendSignedWebhook sentinel → Server Action returns `{ ok: false, sentinel }` (not throws); (d) DB read failure on baseline → `"unavailable"` without firing webhook. The existing Plan 23-02 `job-actions.trigger.test.ts` stays put and tests the original 2 actions; this new file tests the 2 new ones.

### Mount integration (SC #1 + SC #2)

- **D-09 [--auto]:** `job-detail-sheet.tsx` gets 2 new `<RegenerateButton>` mounts:
  - Tailored Resume section meta row: between FreshnessBadge and any existing Copy/Download controls (Plan 20-05 pattern). Only renders when `detail.tailored_resume !== null` (regenerate requires existing artifact).
  - Salary Intelligence section meta row: in the populated branch (from Phase 22), as rightmost flex-wrap sibling. Only renders when `detail.salary_intelligence !== null`.
  Both use the shared `<RegenerateButton>` with appropriate props. Visibility gating is parent-side (matches Phase 23 Cover Letter pattern).

### Grep gates (extended)

- **D-10 [--auto]:** Phase 23 grep gates G-1..G-7 carry forward verbatim; one is extended + one is NEW:
  - **G-6 extension:** `Date.now()` count = 0 across ALL THREE button instantiations — since they share one component file (`regenerate-button.tsx`), G-6 now asserts the generalized component has zero wall-clock reads. Test via readFileSync of the shared file.
  - **G-8 (NEW):** Silent-success warning copy is verbatim. Test assertion: the literal string "Regeneration reported success but no new content was written — check n8n logs." appears exactly once in `regenerate-button.tsx` source AND the test file asserts the rendered DOM contains this exact string when silent-success state is triggered.

### Claude's Discretion

- Exact location of per-artifact `isDone` predicates (inline in `regenerate-button.tsx` vs extracted to `src/lib/regenerate-predicates.ts`) — planner picks based on complexity
- Whether `salary_intelligence` silent-success same-day edge case warrants an inline note rendered to the owner or just documented in SUMMARY
- Whether to preserve the original `regenerate-cover-letter-button.tsx` as a thin re-export wrapper for one release cycle (D-01 says rename → delete; if bikeshedding appears, default to clean delete per Plan 22's D-01 precedent)
- Exact `warning` token class (globals.css already has `text-warning` + `bg-warning/10` from Phase 22 — reuse these, no new tokens)
- Whether the state transition to `silent-success` should revert to `idle` after N seconds or stay until user clicks again — defer to planner; stay-until-clicked is simpler and matches the sentinel-error UX

### Folded Todos

None — `todo.match-phase 24` query deferred to planner's cross-reference step.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements and scope
- `.planning/REQUIREMENTS.md` — 3 Phase 24 REQs: AI-ACTION-05, AI-ACTION-06, AI-ACTION-07
- `.planning/ROADMAP.md` — Phase 24 entry; SC #2's `salary_intelligence.generated_at` wording is STALE (table has `search_date`, not `generated_at`); Plan 24-08 corrects during execution
- `.planning/research/PITFALLS.md` — §Pitfall 6 (stale cache mistaken for fresh regenerate — AI-ACTION-07 is the explicit mitigation for when the polling predicate times out but server reported success)

### Prior phase context (direct pattern source)
- `.planning/phases/23-owner-triggered-workflows-pattern-setter/23-CONTEXT.md` — 12 locked decisions D-01..D-12; D-06 amended server-side baseline is THE template for Phase 24's Server Actions and button predicate
- `.planning/phases/23-owner-triggered-workflows-pattern-setter/23-SUMMARY.md` — phase-level rollup; cites which commits ship which primitives; Phase 24 imports every primitive Phase 23 shipped
- `.planning/phases/23-owner-triggered-workflows-pattern-setter/23-UI-SPEC.md` — 7 grep-verifiable gates G-1..G-7; Phase 24 inherits all + extends G-6 + adds G-8
- `.planning/phases/22-salary-intelligence-defensive-render/22-CONTEXT.md` — D-03 salary_intelligence table schema (search_date unique key; no generated_at); D-08 FreshnessBadge + search_date semantics
- `.planning/phases/22-salary-intelligence-defensive-render/22-SUMMARY.md` — salary_intelligence populated branch + parseSalaryHeadline — unchanged; Phase 24 only adds a Regenerate button to the meta row

### Existing code this phase refactors or extends
- `src/app/(admin)/admin/jobs/regenerate-cover-letter-button.tsx` — RENAMED to `regenerate-button.tsx`; props generalized per D-01
- `src/app/(admin)/admin/jobs/regenerate-button.tsx` — NEW (from rename); generalized regenerate component; 3 artifact variants
- `src/lib/job-actions.ts` — ADD 2 new exports: `regenerateTailoredResume`, `regenerateSalaryIntelligence`; each first line `await requireRole(["owner"])` (Plan 23-04's CI grep gate auto-verifies on next test run)
- `src/lib/jobs-db.ts` — read-only (consumed by baseline reads); NO schema changes
- `src/app/(admin)/admin/jobs/job-detail-sheet.tsx` — ADD 2 new `<RegenerateButton>` mounts (Tailored Resume + Salary Intelligence sections); UPDATE existing Cover Letter mount to use new shared component (prop shape change)
- `src/__tests__/components/regenerate-cover-letter-button.test.tsx` — RENAMED to `regenerate-button.test.tsx`; extended with 2 more artifact variants + silent-success cases
- `src/__tests__/lib/job-actions.regenerate.test.ts` — NEW; 2 new Server Actions
- `src/__tests__/components/job-detail-sheet.test.tsx` — EXTEND with 2 new mount assertions + visibility gates
- `src/lib/webhooks.ts` — read-only (no changes; sendSignedWebhook handles all 3 regenerate paths identically)
- `src/lib/session.ts` — read-only (requireRole preserved)

### External (homelab repo — tracked but shipped separately)
- n8n workflows: 2 new webhook entrypoints (`regenerate-tailored-resume`, `regenerate-salary-intelligence`) — same HMAC verification + idempotency dedup contract as Phase 23's `regenerate-cover-letter` webhook; homelab PR.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets (no net-new primitives this phase)
- **`sendSignedWebhook`** (Plan 23-01) — unchanged; handles all 3 regenerate paths by path string alone
- **`ErrorSentinel`** (Plan 23-01) — unchanged; 4-sentinel cascade already covers the failure modes
- **`requireRole(["owner"])`** (session.ts) — unchanged; Plan 23-04 CI grep gate auto-verifies new Server Actions
- **`regenerate-cover-letter-button.tsx`** (Plan 23-06) — the structural template; D-01 generalizes it
- **`FreshnessBadge` + `attach-freshness.ts`** (Plans 20-04, 22-02) — all 3 artifacts already have freshness attached in `FreshJobDetail`; buttons read existing state
- **`SectionErrorBoundary`** (Plan 20-06) — Phase 24 mounts live inside existing boundaries (Cover Letter already wrapped; Tailored Resume + Salary Intelligence already wrapped per Phase 20/22)
- **`text-warning` token** (globals.css) — reused for silent-success helper; already defined, already used by Phase 22 ProvenanceTag

### Established Patterns (all inherited)
- **Server Action discriminated-union return** — `{ ok: true, baseline } | { ok: false, sentinel }` pattern from Plan 23-02 clones cleanly
- **Pre-webhook baseline read in try/catch** — Plan 23-02 T-23-02-05 guard: DB read failure returns `"unavailable"` sentinel WITHOUT firing the webhook
- **Fake-timer polling tests** — Plan 23-05/23-06 vi.useFakeTimers + vi.advanceTimersByTimeAsync + act + vi.useRealTimers cleanup pattern
- **G-6 no-wall-clock** — inherited + extended to shared component
- **Fire-and-forget retrofit posture** (D-11 Phase 23) — N/A here; no retrofits this phase
- **CI grep rule** — Plan 23-04's `job-actions.requireRole.test.ts` automatically tests the 2 new exports without modification

### Integration Points
- **Shared component refactor** — `regenerate-button.tsx` accepts artifact + action + predicate props; 3 mount sites instantiate with different props; behavior invariant across artifacts with the exception of date-vs-timestamp granularity for salary_intelligence
- **Silent-success state** — new `{ kind: "silent-success" }` state variant; mutually exclusive with `error` state; warning copy rendered via the same `<p className="text-xs mt-1">` wrapper as sentinel helper but with `text-warning italic` class instead of `text-destructive`

</code_context>

<specifics>
## Specific Ideas

- Silent-success warning copy verbatim (SC #3): "Regeneration reported success but no new content was written — check n8n logs." — em-dash, period terminator, no exclamation
- `text-warning` italic is the visual distinction between "error the webhook reported" (destructive) and "success the webhook reported but we can't verify" (warning)
- Salary_intelligence date-granularity edge case is a rough edge worth owner-visible documentation (the "check n8n logs" copy naturally covers it — if search_date didn't advance because n8n ran but produced the same day's sample, the owner goes to n8n logs to confirm)
- Date-granular comparison for salary_intelligence predicate: `new Date(current + "T00:00:00Z") > new Date(baseline + "T00:00:00Z")` avoids timezone parsing ambiguity
- Plan 24-08 fixes the ROADMAP SC #2 wording stale `generated_at` reference — same meta-doc correction pattern as Phase 22's SC #5 line-number update and Phase 23's SC #5 job-outreach deletion

</specifics>

<deferred>
## Deferred Ideas

- **Retry-with-backoff on silent-success** — owner clicks button again to retry; automatic retry adds polling complexity not worth it for v1
- **`salary_intelligence.generated_at` column** — would disambiguate same-day regenerate; schema change + n8n workflow edit; v3.2+
- **Configurable poll cadence per artifact** — one knob (3s/60) covers all cases today
- **Observability dashboard for silent-success rate** — aggregated metric would indicate n8n workflow health; backlog feature
- **Generic "regenerate anything" command palette entry** — UX affordance beyond the 3 in-section buttons; backlog
- **Preserving pre-rename `regenerate-cover-letter-button.tsx` as a thin re-export shim** — clean delete per Plan 22 D-01 precedent is the default; add shim only if bikeshedding appears
- **Fourth regenerate artifact** — no fourth artifact exists today; when one is added (e.g., regenerate match_score), inherit this pattern with 1 Server Action + 1 prop
- **n8n-side HMAC verification + prod UAT** — blocked on homelab-repo PR (v3.5-P4 per ROADMAP); Phase 24 ships client-side signing + n8n accepts unsigned during the transition window

</deferred>

---

*Phase: 24-regenerate-expansion-resume-salary-silent-success-state*
*Context gathered: 2026-04-23 (auto mode — 10 decisions locked; pattern-copy of Phase 23 with 1 net-new UX primitive for AI-ACTION-07 silent-success warning; ROADMAP SC #2 stale `generated_at` wording flagged for Plan 24-08 correction)*
