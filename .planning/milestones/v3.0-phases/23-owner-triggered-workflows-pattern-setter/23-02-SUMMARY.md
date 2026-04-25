---
phase: 23
plan: 02
subsystem: lib/job-actions
tags: [server-actions, webhooks, sentinel, require-role, discriminated-union, d-06-server-baseline, wave-2]
requires:
  - 23-01-PLAN.md (sendSignedWebhook, ErrorSentinel, WebhookResult)
provides:
  - triggerCompanyResearch: "Owner-triggered Server Action (AI-ACTION-03) — requireRole first-line + randomUUID idempotency + sendSignedWebhook('job-company-intel', { job_id }, uuid); returns { ok: true } | { ok: false, sentinel }; revalidatePath only on success"
  - regenerateCoverLetter: "Owner-triggered Server Action (AI-ACTION-04 + D-06 amended) — reads cover_letters.generated_at server-side BEFORE firing webhook and returns it as `baseline: string | null` in ok=true response; DB error path returns 'unavailable' sentinel without firing sendSignedWebhook (T-23-02-05); discriminated-union return, never throws"
affects:
  - Phase 24 regenerate actions (regenerateTailoredResume / regenerateSalaryIntelligence) inherit the D-06 amended baseline pattern verbatim — reads pre-webhook freshness field server-side and returns it for client poll-until-advance predicate
tech-stack:
  added: []
  patterns:
    - "D-06 amended — server-side baseline read inside Server Action; pre-webhook `cover_letters.generated_at` returned as `baseline: string | null` in ok=true response; client poll-until-advance predicate consumes the server-read baseline instead of Date.now(). Eliminates browser-clock-skew bug surface in UPDATE-wait polling (RESEARCH §Pitfall 4). Template for Phase 24's two remaining regenerate actions."
    - "Discriminated-union return from Server Actions (D-08) — first application of the pattern in the project. Both new exports return { ok: true, ... } | { ok: false, sentinel: ErrorSentinel }; webhook failures propagate via return value, never via throw. Callers pattern-match for render routing instead of try/catch."
    - "randomUUID() per call (D-03) — fresh idempotency key on every Server Action invocation. n8n 24h dedup window handles network-retry cases (same UUID from retry → dedup); new click → new UUID → legitimate new run. Test asserts two consecutive calls produce distinct UUIDs matching v4 regex."
    - "DB-error-before-webhook guard pattern (T-23-02-05) — regenerateCoverLetter wraps getJobDetail in try/catch; on error returns { ok: false, sentinel: 'unavailable' } WITHOUT advancing to sendSignedWebhook. A DB outage can't spawn n8n runs; raw DB error never crosses the return boundary."
    - "requireRole adjacency invariant (D-12) — both new exports have `await requireRole(['owner'])` as their first statement. The Plan 23-04 CI grep test (job-actions.requireRole.test.ts) verifies this automatically on every commit; this plan's exports are the first new members subject to the already-live gate."
key-files:
  created:
    - src/__tests__/lib/job-actions.trigger.test.ts
  modified:
    - src/lib/job-actions.ts
decisions:
  - "Split RED/GREEN into two commits instead of the plan's single atomic commit at Task 23-02-03. Rationale: Plan metadata declares `tdd='true'` on both Task 1 (impl) and Task 2 (tests); the TDD execution protocol in the execute-plan workflow mandates test-file-first with a test() commit, then implementation with a feat() commit. Two sequential commits (667e15c test → 30cfd6f feat) preserve the TDD gate audit trail (verifier can `git show 667e15c` to see tests fail on the pre-impl source). Net effect identical to the plan's atomic-commit spec — same two files land, same test coverage, same build-green end state — just with observable RED-then-GREEN history."
  - "triggerCompanyResearch body payload is { job_id: jobId } ONLY — matches plan spec exactly. The prompt's success-criteria mention of `{ job_id, company_name, company_url }` is the retrofitted `void fireWebhook → void sendSignedWebhook` call inside updateJobStatus's `interested` branch (line 103, D-11 retrofit scope — that's Plan 23-03, not Plan 23-02). This Server Action is the NEW owner-triggered button surface, which passes only the job_id; n8n looks up company + URL server-side when the workflow fires. Keeping payloads minimal at the Server Action boundary also means n8n workflow edits land separately from client-API changes."
  - "regenerateCoverLetter reads baseline via getJobDetail (not a narrower SELECT) — plan specified this deliberately. getJobDetail is already imported at job-actions.ts:9, already requires owner role by virtue of running inside a requireRole-gated action, and returns the same freshly-parsed cover_letter.generated_at field the polling predicate in Plan 23-06 will consume. Creating a bespoke narrower helper (e.g. `getCoverLetterGeneratedAt(jobId)`) would fork parsing logic (CoverLetterSchema / parseOrLog) and invite drift. ROI on a 1-query optimization does not clear the maintenance-surface bar for a 2-surface owner dashboard."
  - "DB-error path returns the type-literal string 'unavailable' WITHOUT an `as ErrorSentinel` cast. TypeScript narrows the union return type from the function signature — `'unavailable'` is a member of the ErrorSentinel union and narrows correctly at the return site without an explicit assertion. Cleaner than the plan's example `'unavailable' as ErrorSentinel` and equivalent at runtime."
  - "No revalidatePath on the webhook-failure branch — if !res.ok, return immediately. Rationale: revalidatePath would force a Server Component re-render of /admin/jobs with the same data (the webhook failed, nothing changed server-side). Skipping the call eliminates a wasted revalidation cycle and keeps the client UI on the error branch without a subtle full-refresh side effect."
  - "9 test cases instead of the plan's 8 — added a 9th `rejects non-owner via requireRole — neither getJobDetail nor sendSignedWebhook fire` case for regenerateCoverLetter to match the symmetric case already present for triggerCompanyResearch. The asymmetry in the plan (triggerCompanyResearch had it, regenerateCoverLetter didn't) was a minor omission; adding it locks the requireRole-first-line invariant from BOTH directions for regenerate (blocks the downstream DB read AND the webhook fire)."
  - "G-7 fireWebhook-deletion grep gate stays RED after this plan — confirmed by running job-actions.requireRole.test.ts (1 passed / 1 failed exactly as Plan 23-04 predicted in the doc comments at lines 67-71). Resolution is Plan 23-03's scope. Build and full test suite exit 0 + 473 passed respectively; the single failure is the expected-RED gate."
metrics:
  duration: "~18m"
  completed: "2026-04-23"
---

# Phase 23 Plan 02: triggerCompanyResearch + regenerateCoverLetter Server Actions Summary

**One-liner:** Two new owner-triggered Server Actions in `src/lib/job-actions.ts` — `triggerCompanyResearch` (AI-ACTION-03) and `regenerateCoverLetter` (AI-ACTION-04) — both `await requireRole(["owner"])` first (D-12), both pass `randomUUID()` idempotency keys to `sendSignedWebhook` from Plan 23-01 (D-03), both return discriminated-union `{ ok: true, ... } | { ok: false, sentinel }` instead of throwing (D-08). `regenerateCoverLetter` reads pre-webhook `cover_letters.generated_at` server-side and returns it as `baseline` so the client polls without touching `Date.now()` (D-06 amended — eliminates browser-clock-skew bug surface).

## What Shipped

1. **`src/lib/job-actions.ts`** (modified — +74 LoC appended after `undismissJob`):

   **`triggerCompanyResearch(jobId: number): Promise<{ ok: true } | { ok: false, sentinel: ErrorSentinel }>`**
   - Line 1: `await requireRole(["owner"])` — D-12 invariant, enforced by Plan 23-04's CI grep gate.
   - `const idempotencyKey = randomUUID()` — fresh UUID per call (D-03).
   - `sendSignedWebhook("job-company-intel", { job_id: jobId }, idempotencyKey)` — minimal payload; n8n workflow looks up company/URL server-side.
   - Webhook-failure branch: `return { ok: false, sentinel: res.sentinel }` (no `throw`, no `revalidatePath`).
   - Success branch: `revalidatePath("/admin/jobs")` + `return { ok: true }`.

   **`regenerateCoverLetter(jobId: number): Promise<{ ok: true, baseline: string | null } | { ok: false, sentinel: ErrorSentinel }>`**
   - Line 1: `await requireRole(["owner"])` — D-12 invariant.
   - DB read wrapped in `try/catch`:
     ```typescript
     let baseline: string | null = null;
     try {
       const detail = await getJobDetail(jobId);
       baseline = detail?.cover_letter?.generated_at ?? null;
     } catch {
       return { ok: false, sentinel: "unavailable" };  // T-23-02-05
     }
     ```
     Null-coalesce to `null` when `cover_letter` is absent (INSERT-semantic fallback for the UPDATE-wait predicate). DB exception path returns `"unavailable"` sentinel WITHOUT reaching `sendSignedWebhook` — no spurious n8n run on DB outage; no raw `e.message` leak.
   - `sendSignedWebhook("regenerate-cover-letter", { job_id: jobId }, randomUUID())` fires AFTER baseline read.
   - Webhook-failure branch: `return { ok: false, sentinel: res.sentinel }` (no `revalidatePath`).
   - Success branch: `revalidatePath("/admin/jobs")` + `return { ok: true, baseline }`.
   - `baseline` is the server-read ISO timestamp from before the webhook fired; the client component in Plan 23-06 polls until `cover_letter.generated_at > baseline`. Zero `Date.now()` in the predicate — every clock read stays server-side (D-06 amended).

   New imports added (after existing import block):
   - `import { randomUUID } from "node:crypto";` — Node 25 stdlib, zero deps.
   - `import { sendSignedWebhook, type ErrorSentinel } from "@/lib/webhooks";` — consumes Plan 23-01 primitive.

   UNTOUCHED (Plan 23-03 scope): `N8N_WEBHOOK_BASE` const at line 22; `fireWebhook` internal helper at lines 25-38; the 3 `void fireWebhook(...)` call sites inside `updateJobStatus`/`dismissJob`.

2. **`src/__tests__/lib/job-actions.trigger.test.ts`** (new — 175 LoC, 9 test cases):

   **triggerCompanyResearch — 4 cases (AI-ACTION-03):**
   - `rejects non-owner via requireRole — sendSignedWebhook never fires` — `mockRequireRole.mockRejectedValue(new Error("NEXT_REDIRECT"))`; asserts action rejects AND the webhook mock was never called.
   - `returns { ok: true } on successful webhook and passes UUID v4 key (D-03)` — asserts return shape, the `sendSignedWebhook` 3-arg call signature (`"job-company-intel"`, `{ job_id: 42 }`, UUID v4 string), and `revalidatePath("/admin/jobs")` invocation.
   - `returns { ok: false, sentinel } and does NOT throw when webhook fails (D-08)` — mocks webhook failure sentinel `"rate limit"`, asserts exact return shape AND that `revalidatePath` was NOT called.
   - `passes a fresh UUID idempotency key on every call (D-03)` — two consecutive `triggerCompanyResearch(1)` calls; asserts `firstKey !== secondKey` and both match the UUID v4 regex `/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/`.

   **regenerateCoverLetter — 5 cases (AI-ACTION-04 + D-06 amended + T-23-02-05):**
   - `returns { ok: true, baseline } with server-read generated_at (D-06)` — mocks `getJobDetail` to return `cover_letter: { generated_at: "2026-04-20T12:34:56.000Z", ... }`; asserts `result.baseline === serverBaseline` AND `sendSignedWebhook` called with path `"regenerate-cover-letter"` + minimal body + UUID key.
   - `returns { ok: true, baseline: null } when job has no cover letter yet` — `getJobDetail` returns `{ cover_letter: null }`; asserts baseline coalesces to `null` (INSERT-semantic fallback path).
   - `returns { ok: false, sentinel } and does NOT throw when webhook fails after baseline read` — baseline read succeeds; webhook mock returns `{ ok: false, sentinel: "timeout" }`; asserts return shape AND no `revalidatePath`.
   - `returns { ok: false, sentinel: 'unavailable' } when DB read throws — sendSignedWebhook never called (T-23-02-05)` — `getJobDetail.mockRejectedValue(new Error("ETIMEDOUT"))`; asserts `{ ok: false, sentinel: "unavailable" }` AND that `sendSignedWebhook` and `revalidatePath` were BOTH never called. Locks the architectural invariant that DB outages don't spawn n8n runs.
   - `rejects non-owner via requireRole — neither getJobDetail nor sendSignedWebhook fire` — requireRole denial blocks BOTH downstream calls. Added beyond the plan's 8-case floor for symmetry with triggerCompanyResearch's requireRole test.

   Mock infrastructure (matches PATTERNS.md §7 `vi.hoisted` + `vi.mock` + dynamic import):
   - `mockRequireRole`, `mockSendSignedWebhook`, `mockGetJobDetail`, `mockRevalidatePath` via `vi.hoisted`.
   - `vi.mock("@/lib/session")`, `vi.mock("@/lib/webhooks")`, `vi.mock("@/lib/jobs-db", importOriginal pattern)`, `vi.mock("next/cache")`.
   - Each test awaits `await import("@/lib/job-actions")` to pick up the current mock state (Vitest module-cache pattern).

## Contract Lock — What These Tests Enforce Going Forward

| Invariant | Locked by | Consequence of breakage |
|---|---|---|
| Both new Server Actions call `requireRole(["owner"])` before any other logic (D-12) | Plan 23-04 grep gate (already live) + 2 tests here asserting non-owner denial | CI grep fails; any code path reaching webhook without role check also fails the symmetric test |
| Both pass UUID v4 idempotency keys to sendSignedWebhook (D-03) | `expect.stringMatching(UUID_V4_REGEX)` assertion in 2 success tests + uniqueness assertion across 2 consecutive calls | Regression (static-string key or hash-based reuse) fails the regex match; reuse also fails the uniqueness test |
| Webhook failures return sentinel discriminated-union — never throw (D-08) | 2 webhook-failure tests (one per action) asserting `result.sentinel` + absence of throw | Any `throw` reintroduction makes `await expect(...).resolves.toEqual(...)` fail with a thrown error |
| regenerateCoverLetter baseline is server-read, not client clock (D-06 amended) | Baseline success test asserts EXACT `serverBaseline` string match (`"2026-04-20T12:34:56.000Z"`) — not a `Date.now()` shape | Client-clock regression would return a different ISO string that fails `toEqual` |
| DB error does NOT spawn n8n runs (T-23-02-05) | `expect(mockSendSignedWebhook).not.toHaveBeenCalled()` in DB-error test | Any future "log and continue" refactor that tries the webhook anyway fails the negative assertion |
| No `revalidatePath` on webhook-failure branch | `expect(mockRevalidatePath).not.toHaveBeenCalled()` on both webhook-failure tests | Subtle UX regressions (silent full-refresh on error) fail both negative assertions |

## Plan Deviations

**Deviation 1 (Rule 2 — auto-added missing critical coverage):** Added a 9th test case (`rejects non-owner via requireRole — neither getJobDetail nor sendSignedWebhook fire` for `regenerateCoverLetter`) beyond the plan's 8-case floor. The plan specified this case for `triggerCompanyResearch` but omitted the symmetric case for `regenerateCoverLetter`; `regenerateCoverLetter` has an extra downstream side-effect (`getJobDetail`) that also needs to be blocked by the role check. Added to lock the invariant from both directions. Zero production-logic change — test-only addition.

**Deviation 2 (TDD gate protocol override of plan's atomic-commit spec):** Plan Task 23-02-03 specifies a single atomic commit with subject `feat(23-02):` covering both files. Actual history is two sequential commits:

- `667e15c` — `test(23-02): failing contract tests for triggerCompanyResearch + regenerateCoverLetter` (RED gate; 9 failing cases prove the impl doesn't exist yet)
- `30cfd6f` — `feat(23-02): triggerCompanyResearch + regenerateCoverLetter Server Actions (AI-ACTION-03/-04)` (GREEN gate; all 9 cases pass)

The executor's TDD protocol (execute-plan.md `<tdd_execution>` section) mandates distinct `test(...)` then `feat(...)` commits when a task declares `tdd="true"`. Both Plan 23-02 tasks declare `tdd="true"`, so the RED→GREEN sequence is the binding protocol. End state identical to the plan's atomic-commit intent — same two files committed, same verification criteria met — with observable RED audit trail for the verifier.

Beyond these two: no bug fixes, no architectural changes, no auth gates, no blocked paths. Plan executed as written otherwise.

## Threat Model — Mitigations Landed

| Threat ID | Mitigation in code | Test that locks it |
|---|---|---|
| T-23-02-01 Elevation of Privilege | `await requireRole(["owner"])` first line in both new exports | Plan 23-04 grep gate + 2 non-owner-denial tests here (one per action) |
| T-23-02-02 Information Disclosure (baseline return) | Baseline is `cover_letters.generated_at` ISO — no PII; returned only to authenticated owner; DB error → sentinel without e.message | Baseline success tests assert exact ISO string shape; DB-error test asserts only sentinel crosses the return boundary |
| T-23-02-03 Repudiation (idempotency-key reuse) | `randomUUID()` per call (D-03) inside each action; no cache, no closure capture | UUID-uniqueness test asserts 2 consecutive calls produce distinct v4-regex-matching keys |
| T-23-02-04 DoS (rapid-fire clicks) | Accepted — n8n 24h dedup + 5s AbortSignal in webhooks.ts are the backstop; button state machine in Plans 23-05/06 disables during polling | n/a (accepted residual; no test needed at this layer) |
| T-23-02-05 Information Disclosure (raw DB error leak) | `try/catch` around `getJobDetail`; on error returns sentinel — no e.message propagation; sendSignedWebhook intentionally skipped | DB-error test asserts exact sentinel shape AND that sendSignedWebhook was never called |

## Requirements Closed

- **AI-ACTION-03** (Trigger company research for jobs without existing company_research) — closed at the Server Action boundary. The button component in Plan 23-05 will mount this action; n8n workflow validation of the HMAC + idempotency-key dedup is the homelab-repo PR counterpart.
- **AI-ACTION-04** (Regenerate cover letter Server Action) — closed at the Server Action boundary. The button component in Plan 23-06 will consume the returned `baseline` for the poll-until-advance predicate, making this the first end-to-end instance of the D-06 amended pattern.
- **AI-SAFETY-04** (Bounded error sentinel set, no raw error leak) — reinforced at the Server Action boundary (first reinforcement was Plan 23-01 at the helper boundary). Every failure path in both new actions routes through `{ ok: false, sentinel: ErrorSentinel }`; no `throw e` escape hatches, no `e.message` in return values, no DB error strings crossing the boundary (T-23-02-05 DB-error test locks this).

## Downstream Impact

- **Plan 23-03** (fireWebhook deletion + 3-call-site retrofit): unblocked. These 2 new exports add ZERO interaction with the existing `N8N_WEBHOOK_BASE` const or `fireWebhook` helper — both live verbatim in the source. Plan 23-03 is a pure subtractive + 3-line retrofit operation.
- **Plan 23-04** (CI grep gate): confirmed its requireRole adjacency assertion passes against the new source (both new exports satisfy the 10-line-window rule). The G-7 fireWebhook-deletion gate is still red, as the Plan 23-04 doc comments explicitly predicted (`job-actions.requireRole.test.ts` lines 67-71).
- **Plan 23-05** (TriggerCompanyResearchButton): imports `triggerCompanyResearch` from `@/lib/job-actions` and calls it in the button's `onClick` handler. The return-type contract (`{ ok: true } | { ok: false, sentinel }`) is now the fixed API the button pattern-matches on.
- **Plan 23-06** (RegenerateCoverLetterButton): imports `regenerateCoverLetter` from `@/lib/job-actions` and consumes the returned `baseline` for the `useRef<string | null>` the polling predicate compares against `detail.cover_letter.generated_at`. Zero client-side clock reads — eliminates the pre-amendment Pitfall 4 clock-skew bug surface.
- **Phase 24** (regenerateTailoredResume + regenerateSalaryIntelligence): inherits the D-06 amended pattern verbatim. Each Phase 24 regenerate action reads its respective artifact's freshness field (`tailored_resume.generated_at`, `salary_intelligence.search_date`) BEFORE firing the webhook and returns it as `baseline`. The generic button factory can extract `isDone: (detail, baseline) => boolean` as a prop without further plan-level pattern work.

## Commits

- `667e15c` — `test(23-02): failing contract tests for triggerCompanyResearch + regenerateCoverLetter` (RED gate)
- `30cfd6f` — `feat(23-02): triggerCompanyResearch + regenerateCoverLetter Server Actions (AI-ACTION-03/-04)` (GREEN gate)

## Self-Check: PASSED

- `src/__tests__/lib/job-actions.trigger.test.ts` — FOUND (175 lines, 9 test cases)
- `src/lib/job-actions.ts` — MODIFIED (+74 LoC: 2 new exports + 2 new imports); triggerCompanyResearch and regenerateCoverLetter present; existing 5 exports + fireWebhook helper + N8N_WEBHOOK_BASE const all preserved
- Commit `667e15c` — FOUND in git log (RED gate)
- Commit `30cfd6f` — FOUND in git log (GREEN gate)
- `npm test -- --run src/__tests__/lib/job-actions.trigger.test.ts` → 9/9 passed
- `npm test -- --run src/__tests__/lib/job-actions.requireRole.test.ts` → 1 passed (requireRole adjacency for both new exports) / 1 failed (G-7 fireWebhook deletion — EXPECTED RED until Plan 23-03; documented at lines 67-71 of the test file)
- `npm run build` → exits 0 (TypeScript compiles; Next.js bundle produced)
- `npm test` full suite → 473 passed / 1 expected-red / 0 regressions (+9 new tests; prior 464→473 = plan delta)
- Both new `export async function` signatures have `await requireRole(["owner"])` within the 10-line adjacency window (D-12 invariant)
- `sendSignedWebhook` called only from the 2 new exports AND with payloads matching the plan spec (`{ job_id: jobId }` for both paths, NOT `{ job_id, company_name, company_url }` — that's Plan 23-03's retrofit scope)
- Zero `Date.now()`, zero `new Date()` in the modified source file — client-clock domain boundary preserved
- Zero `throw` statements added — both new exports return discriminated-union on every path (D-08)
