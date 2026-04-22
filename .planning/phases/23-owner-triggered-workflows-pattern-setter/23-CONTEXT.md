# Phase 23: Owner-Triggered Workflows (Pattern Setter) - Context

**Gathered:** 2026-04-22 (auto mode — 10 decisions locked using recommended defaults; downstream planner owns implementation details)
**Status:** Ready for planning

<domain>
## Phase Boundary

Ship the pattern Phase 24 will copy: two owner-triggered buttons (`Research this company` on jobs without `company_research`; `Regenerate cover letter` on any job with an existing letter) backed by a signed + idempotency-keyed n8n webhook helper. 5 REQs: AI-ACTION-03, AI-ACTION-04, AI-SAFETY-02, AI-SAFETY-03, AI-SAFETY-04. The three existing `fireWebhook` call sites (`job-feedback-sync` × 2 via reject/dismiss + `job-company-intel` via interested-status auto-trigger) get retrofit in the same PR — no old/new coexistence. A CI grep rule asserts every exported function in `src/lib/job-actions.ts` contains `requireRole(["owner"])` (Pitfall 9 lock).

**Current state (pre-Phase-23) of webhook posture:**
- `src/lib/job-actions.ts:25-38` — `fireWebhook` sends no auth header, no HMAC, no idempotency key, swallows all errors with empty `catch {}`. Returns `void` regardless of outcome.
- 3 call sites: `job-feedback-sync` (reject + dismiss), `job-company-intel` (auto-fired when status→interested; NOT owner-triggered today)
- Zero test coverage on webhook outcomes
- `N8N_WEBHOOK_BASE` env var exists; `N8N_WEBHOOK_SECRET` does NOT exist yet (to be added)
- No existing polling pattern in the codebase — `revalidatePath` + Server Components is how staleness propagates today; Phase 23 introduces client-side polling via `useEffect` + `fetch` (TanStack Query deliberately NOT adopted — see D-04)
- Error handling in Server Actions: no existing sentinel mapping; `triggerOutreach` (PITFALLS.md §Pitfall 3) returns raw `e.message` today (but no such action is currently exported — likely removed or never shipped)

**What ships end-to-end this phase:**
1. New `src/lib/webhooks.ts` — `sendSignedWebhook(path, body, idempotencyKey)` with HMAC-SHA256 signature + canonical message + sentinel-mapped errors (AI-SAFETY-02, -03, -04)
2. `fireWebhook` helper in `job-actions.ts:25-38` DELETED; all 3 call sites replaced with `sendSignedWebhook` (SC #5)
3. Two new owner-triggered Server Actions: `triggerCompanyResearch(jobId)` and `regenerateCoverLetter(jobId)` — both `requireRole(["owner"])` first line; both call `sendSignedWebhook`; both return `{ ok: true }` or `{ ok: false, sentinel: "timeout"|"auth"|"rate limit"|"unavailable" }` (AI-ACTION-03, AI-ACTION-04)
4. Two new client components mounted inline in `job-detail-sheet.tsx`: `TriggerCompanyResearchButton` + `RegenerateCoverLetterButton` — pessimistic spinner + polling via `useEffect` (SC #1, #2)
5. CI grep rule via Vitest test — `src/__tests__/lib/job-actions.requireRole.test.ts` reads the source of `job-actions.ts` and asserts every `export async function` signature is followed within N lines by `await requireRole(["owner"])` (Pitfall 9)
6. n8n workflow updates (homelab repo — documented here but shipped in a homelab PR, not this repo): each of the 4 workflows (job-feedback-sync, job-company-intel, job-outreach if it still exists, plus the new regenerate-cover-letter entrypoint) validates incoming HMAC against `N8N_WEBHOOK_SECRET` + rejects duplicate `X-Idempotency-Key` values within a 24-hour window

**Not in this phase:**
- Regenerate tailored resume (AI-ACTION-05 → Phase 24)
- Regenerate salary intelligence (AI-ACTION-06 → Phase 24)
- Warning state for "workflow returned success but no data changed" (AI-ACTION-07 → Phase 24; Phase 23's polling cap timeout surfaces as "unavailable" sentinel today)
- TanStack Query introduction (deliberately deferred — see D-04)
- n8n workflow code in this repo (homelab-repo PR; links documented in SUMMARY)

</domain>

<decisions>
## Implementation Decisions

### Webhook helper architecture (AI-SAFETY-02 + AI-SAFETY-03 + AI-SAFETY-04)

- **D-01 [--auto]:** New file `src/lib/webhooks.ts` owns the signed helper — NOT inline in `job-actions.ts`. Exports one primary function: `sendSignedWebhook(path: string, body: Record<string, unknown>, idempotencyKey: string): Promise<WebhookResult>`. Return type is a discriminated union `{ ok: true } | { ok: false, sentinel: ErrorSentinel }` where `ErrorSentinel = "timeout" | "auth" | "rate limit" | "unavailable"`. Rationale: clean separation keeps `job-actions.ts` focused on role-checked Server Actions; webhook primitives are testable in isolation; a second file boundary prevents future drift where callers swallow errors inline again. `fireWebhook` in `job-actions.ts:25-38` is DELETED — no deprecation wrapper, no migration window (SC #5 mandates same-PR retrofit).

- **D-02 [--auto]:** HMAC canonical message format is `${timestamp}.${path}.${rawBody}` joined with literal `.` separators (industry-standard — matches GitHub webhooks, Stripe, Slack). `timestamp` is Unix-milliseconds as a string; `path` is the webhook path without leading slash (e.g., `"job-company-intel"`); `rawBody` is the exact JSON string that gets POSTed. Signature header: `X-Hudsonfam-Signature: sha256=<hex>`. Timestamp header: `X-Hudsonfam-Timestamp: <ms>`. n8n validates by reconstructing the canonical message from the received headers + body and comparing. Replay protection: n8n MUST reject timestamps older than 5 minutes (clock drift tolerance) AND idempotency-key collisions within 24h. Rationale: including both timestamp + path in the signature prevents cross-path replay AND clock-based replay; raw body (not re-serialized) prevents JSON key-ordering divergence.

- **D-03 [--auto]:** Idempotency key derivation: `crypto.randomUUID()` per call, generated fresh in the Server Action before `sendSignedWebhook` is called. Rationale: owner clicking "Regenerate cover letter" 10 seconds apart SHOULD trigger two runs (the whole point of regenerate). Deterministic keys would suppress legitimate retries. UUID per call + n8n's 24h dedup window handles network-retry cases (same UUID from retry = dedup; new UUID from new click = new run). n8n stores `X-Idempotency-Key` values in its execution DB and short-circuits on dupes.

### Client-side polling strategy (AI-ACTION-03 + AI-ACTION-04)

- **D-04 [--auto]:** Polling uses vanilla `useEffect` + `setInterval` + `fetch("/api/jobs/:id/detail")` — NO TanStack Query introduction this phase. Rationale: the project has zero TanStack Query usage today (confirmed via grep); introducing it for 2 polling surfaces is scope creep and would force every other data path to consider migration. Native fetch + useEffect is ~20 lines and colocates trivially with the button component. Phase 24 can reassess if regenerate-tailored-resume + regenerate-salary-intel add 2 more polling surfaces.

- **D-05 [--auto]:** Polling cadence: 3-second intervals, hard cap at 60 polls = 180s timeout. On timeout, surface `"unavailable"` sentinel to the user. Rationale: ROADMAP SC #1 locks "poll every 3s, cap 60"; this carries forward verbatim. 180s is generous — LLM runs typically complete in 15-60s; exceeding 3 minutes indicates an upstream stall or crash. Timeout path does NOT silently reset — button stays disabled, sentinel shown, owner can refresh the sheet to retry.

- **D-06 [--auto; amended post-research]:** "Done-ness" predicate differs per artifact, keyed on SERVER-SIDE baseline (not client clock):
  - `triggerCompanyResearch`: polls `fetchJobDetail(jobId)` until `detail.company_research !== null` (INSERT wait — row didn't exist pre-click; no clock-domain issue)
  - `regenerateCoverLetter`: Server Action reads pre-webhook `cover_letters.generated_at` from DB and returns it as `{ ok: true, baseline: <ISO> }` alongside firing the webhook; button stores the returned baseline and polls until `detail.cover_letter?.generated_at > baseline`. Client NEVER captures `Date.now()` for the predicate — all clock reads stay server-side. (Research §Pitfall 4 flagged the original client-clock wording as a latent bug — browser clock skew can defeat the `generated_at > clickTimestamp` predicate; server-side baseline eliminates the clock-domain mixing.)
  - Pattern extends cleanly to Phase 24: `regenerateTailoredResume` + `regenerateSalaryIntelligence` Server Actions both return `{ ok: true, baseline }` reading the respective artifact's freshness field; button generic over the baseline-vs-current comparison. Phase 24 inherits the same contract.
  The two button components each accept an `isDone: (detail, baseline) => boolean` predicate prop; `triggerCompanyResearch` baseline is irrelevant (passes `null`); `regenerateCoverLetter` baseline is the server-returned pre-webhook timestamp.

### Error sentinel mapping (AI-SAFETY-04)

- **D-07 [--auto]:** Server-side error-to-sentinel mapping in `src/lib/webhooks.ts` follows explicit cascading checks:
  1. `AbortError` or `fetch` throws with network/timeout cause → `"timeout"`
  2. HTTP 401 or 403 → `"auth"`
  3. HTTP 429 → `"rate limit"`
  4. Everything else (5xx, connect-refused, DNS failure, non-Response exceptions, malformed JSON) → `"unavailable"`
  Server-side logging: every non-OK case `console.error`s the full error with stack + the path + the response status (if any). Cluster IPs MUST be scrubbed from messages sent to the browser — the 4 sentinel strings are the ONLY payload returned to the client on failure. No `e.message`, no stack, no URL. Rationale: bounded client-side surface area matches Pitfall 3 mitigation; full server logs enable debugging without owner-data exposure.

- **D-08 [--auto]:** No raw-error leak escape hatches. Every Server Action in `job-actions.ts` that fires a webhook MUST catch the `sendSignedWebhook` call's return value and translate to the sentinel response — direct `throw e` from a Server Action returns the raw message to the client (Next.js default). Pattern: `const res = await sendSignedWebhook(...); if (!res.ok) return { ok: false, sentinel: res.sentinel };`. Test asserts: every new action has a test case that mocks a thrown error and verifies the Server Action returns `{ ok: false, sentinel: "..." }` rather than re-throwing.

### Button UI + pessimistic loading (AI-ACTION-03 + AI-ACTION-04)

- **D-09 [--auto]:** Button placement in `job-detail-sheet.tsx`:
  - `TriggerCompanyResearchButton` mounts inside the Company Intel section's meta row, VISIBLE ONLY when `detail.company_research === null` (matches REQ wording "for a job whose company_research is empty"). Once research lands, the button disappears; the FreshnessBadge takes over.
  - `RegenerateCoverLetterButton` mounts inside the Cover Letter section's meta row, VISIBLE when `detail.cover_letter !== null` (an existing letter must exist to regenerate). Label is verbatim "Regenerate cover letter" per SC #2.
  Both buttons use shadcn `<Button variant="outline" size="sm">` + `<Loader2 className="animate-spin" />` icon during in-progress. Disabled + muted-text during polling. On sentinel failure, button re-enables and shows inline error-variant helper text with the sentinel string (e.g., `<p className="text-destructive text-xs mt-1">Error: rate limit</p>`).

- **D-10 [--auto]:** Pessimistic vs optimistic UI: pessimistic only. No optimistic card placeholder for Company Intel (the section renders its empty state until the row arrives). No optimistic text for Cover Letter (the existing letter remains visible until the new `generated_at` overtakes the click timestamp). Rationale: LLM runs are 15-60s; showing an optimistic placeholder that ALMOST NEVER matches the actual output creates worse UX than a spinner. SC #2 explicitly locks "pessimistic spinner."

### Retrofit enforcement (SC #5 + Pitfall 9)

- **D-11 [--auto]:** Retrofit scope = 3 existing `fireWebhook` call sites in `src/lib/job-actions.ts`:
  - Line 98: `updateJobStatus` → `"rejected"` branch fires `job-feedback-sync` with `{ job_id, action: "reject" }`
  - Line 103: `updateJobStatus` → `"interested"` branch fires `job-company-intel` with `{ job_id, company_name, company_url }`
  - Line 118: `dismissJob` fires `job-feedback-sync` with `{ job_id, action: "dismiss" }`
  All three keep their fire-and-forget posture (`void sendSignedWebhook(...)`) since they're status-sync side effects, not owner-visible actions. The grep search for `triggerOutreach` / `job-outreach` returned no active call sites in `src/` — ROADMAP SC #5's third mention is STALE (likely from an older spec before Phase 20 refactors). Planner updates SC #5 during execution to reflect the 3 actual call sites.

- **D-12 [--auto]:** CI grep rule lives in `src/__tests__/lib/job-actions.requireRole.test.ts` (Vitest test — NOT ESLint rule, NOT shell script). The test reads `src/lib/job-actions.ts` source via `fs.readFileSync`, parses out every `export async function` signature, and asserts `await requireRole(["owner"])` appears within 10 source lines of each function's opening brace. Rationale: Phase 22's grep-gate precedent (`job-detail-sheet.test.tsx` enforces ProvenanceTag adjacency via the same readFileSync pattern) — keeps the check in the existing test infrastructure, runs on `npm test`, fast feedback. ESLint custom rules add a maintenance surface (plugin + config + TS-ESLint AST); shell scripts in CI add a second toolchain. Vitest wins.

### Claude's Discretion

- Exact file location of the CI grep test (`src/__tests__/lib/` vs `src/__tests__/ci/` — planner picks)
- Button component internal state shape (`idle` | `in-progress` | `sentinel` vs boolean flags — planner picks)
- Whether `WebhookResult` type and `ErrorSentinel` union live in `webhooks.ts` or a separate `src/lib/webhook-types.ts`
- Exact Zod validation of incoming webhook responses from n8n (if any — current helper fires-and-forgets on the Phase 23 pattern; regenerate actions may need to parse a response body to extract a run ID, planner decides)
- Whether to emit a `prose: "starting Research this company..."` toast or rely purely on the button's spinner (UI-SPEC will decide; D-09 specifies "visible spinner in button"; toast is additive if UI-SPEC wants it)
- Whether to introduce a polling library (`swr` / TanStack Query) IF Phase 23 ends up wanting 4+ polling surfaces — D-04 says no for 2 surfaces; Phase 24 reassesses

### Folded Todos

None — `todo.match-phase 23` query deferred to planner's cross-reference step; any matches fold in there.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements and scope
- `.planning/REQUIREMENTS.md` — 5 Phase 23 REQs: AI-ACTION-03, AI-ACTION-04, AI-SAFETY-02, AI-SAFETY-03, AI-SAFETY-04
- `.planning/ROADMAP.md` — Phase 23 entry with 5 success criteria; note SC #5's `job-outreach` mention is stale (no active call site — planner updates during execution)
- `.planning/research/PITFALLS.md` — §Pitfall 3 (unsigned webhooks + replay risk — the whole reason AI-SAFETY-02/-03/-04 exist); §Pitfall 6 (stale cache mistaken for fresh regenerate — SC #2 polling against `generated_at` advance is the mitigation); §Pitfall 9 (forgotten `requireRole` — D-12 CI grep rule is the mitigation)

### Prior phase context (carry-forward decisions)
- `.planning/phases/20-foundation-freshness-zod-tailored-resume/20-CONTEXT.md` — SectionErrorBoundary wrap (D-09 / Plan 20-06); Zod fail-open at boundary (D-11 / Plan 20-03); `generated_at` freshness semantics (D-01) — D-06 polling predicates inherit directly
- `.planning/phases/20-foundation-freshness-zod-tailored-resume/20-SUMMARY.md` — what Phase 20 actually shipped; FreshnessBadge + attachFreshness infrastructure (ready to reuse)
- `.planning/phases/21-polish-copy-pdf-empty-states-link-out/21-CONTEXT.md` — meta-row cadence; empty-state `EMPTY_STATE_COPY` const-map; anti-CTA rule (D-09 inline button does NOT violate — anti-CTA was about empty-state copy strings, not all UI controls)
- `.planning/phases/21-polish-copy-pdf-empty-states-link-out/21-UI-SPEC.md` — meta-row layout; Plan 21-05 quality-badge sizing; `text-[10px]` + Badge variant="outline" (direct precedent if Phase 23 UI-SPEC decides buttons should carry similar visual weight as badges)
- `.planning/phases/22-salary-intelligence-defensive-render/22-CONTEXT.md` — FreshnessBadge tri-field dispatch (Plan 22-02 extended `attach-freshness.ts` to `search_date`); grep-gate pattern (`job-detail-sheet.test.tsx` readFileSync + regex — D-12's CI grep rule inherits this exact technique)
- `.planning/phases/22-salary-intelligence-defensive-render/22-SUMMARY.md` — verification model (7 grep gates); Phase 23's `requireRole` CI grep rule is the 8th in the project's gate inventory

### Existing code this phase reads or modifies
- `src/lib/job-actions.ts` — edits: DELETE `fireWebhook` helper (lines 25-38); REPLACE 3 call sites (lines 98, 103, 118); ADD 2 new owner-triggered server actions (`triggerCompanyResearch`, `regenerateCoverLetter`) — each first line `await requireRole(["owner"])`
- `src/lib/webhooks.ts` — NEW: `sendSignedWebhook` + `ErrorSentinel` union + `WebhookResult` union; all error-to-sentinel mapping + HMAC + headers
- `src/lib/session.ts:20` — `requireRole` helper (already exists; do not modify; callers preserve first-line-call invariant per Pitfall 9 + D-12)
- `src/app/(admin)/admin/jobs/job-detail-sheet.tsx` — edits: mount `<TriggerCompanyResearchButton />` in Company Intel meta row (line ~286 SectionErrorBoundary block); mount `<RegenerateCoverLetterButton />` in Cover Letter meta row (likely around the existing Cover Letter section TODO — planner greps for current Cover Letter JSX location)
- `src/app/(admin)/admin/jobs/trigger-company-research-button.tsx` — NEW client component
- `src/app/(admin)/admin/jobs/regenerate-cover-letter-button.tsx` — NEW client component (or a single `regenerate-button.tsx` factory with a predicate prop — planner picks per D-06)
- `src/__tests__/lib/webhooks.test.ts` — NEW: HMAC signature correctness, idempotency-key presence, error-to-sentinel mapping (4 × failure modes), no raw error leakage
- `src/__tests__/lib/job-actions.requireRole.test.ts` — NEW: the CI grep rule per D-12
- `src/__tests__/components/trigger-company-research-button.test.tsx` — NEW: polling behavior, done-predicate, timeout-as-unavailable
- `src/__tests__/components/regenerate-cover-letter-button.test.tsx` — NEW: clickTimestamp + generated_at advance predicate
- `.env.example` — ADD `N8N_WEBHOOK_SECRET=` placeholder (actual secret stored in ExternalSecrets per CLAUDE.md deployment section)
- `CLAUDE.md` — edit: add `N8N_WEBHOOK_SECRET` to the Environment Variables table (after `JOBS_DATABASE_URL`)

### External (homelab repo — tracked but shipped separately)
- n8n workflows: `job-feedback-sync`, `job-company-intel`, `regenerate-cover-letter` (new entry-point webhook), + verify if `job-outreach` exists in any active workflow — all 3 (or 4) get HMAC verification + idempotency-key dedup. Homelab repo PR linked in Phase 23 SUMMARY.md. Phase 23 ships the CLIENT SIDE; homelab PR ships the SERVER SIDE in n8n.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`src/lib/session.ts`** `requireRole(["owner"])` — already in use on every `job-actions.ts` export (5 current exports all compliant per Pitfall 9). D-12's grep rule locks this going forward.
- **`src/components/ui/button.tsx`** — shadcn Button with outline/sm variants; the 2 new trigger buttons consume this
- **`lucide-react`** `Loader2` icon — already imported across the project; spinner for pessimistic loading states
- **`revalidatePath("/admin/jobs")`** — Next.js cache invalidation pattern already used in `updateJobStatus` / `dismissJob` / `undismissJob`; Phase 23's new server actions call this after polling resolves so any Server Component consuming `fetchJobDetail` picks up fresh data
- **`src/app/(admin)/admin/jobs/job-detail-sheet.tsx`** — the mount site; current integration points (post-Phase 22): Company Intel section at line ~286 (SectionErrorBoundary wrapper); Cover Letter section (planner greps exact location)
- **`fetchJobDetail(jobId)`** in `job-actions.ts` — the polling target; already returns `FreshJobDetail | null` with all 4 artifacts + freshness; requires `requireRole(["owner"])` (no client-side polling bypass possible)
- **`src/lib/attach-freshness.ts`** — tri-field dispatcher (Plan 22-02); `generated_at` is already the primary freshness field for cover_letter (Plan 20's D-01)

### Established Patterns
- **`requireRole(["owner"])` first line** — every Server Action's opening invariant (Pitfall 9); D-12 enforces via CI grep
- **`revalidatePath("/admin/jobs")`** after DB mutation — consistent cache-busting pattern; polling predicate resolves → revalidate fires
- **shadcn Button + Loader2** spinner pattern — visible on `updateJobStatus` dropdown during status change (precedent for pessimistic in-progress UI)
- **`void fireWebhook(...)`** fire-and-forget posture on status-sync webhooks — preserved for reject/dismiss/interested retrofits; replaced with `void sendSignedWebhook(...)`
- **Streamdown XSS posture** (Phase 20) — not relevant Phase 23; no new LLM prose rendering

### Integration Points
- **`src/lib/webhooks.ts`** (NEW) — called from `src/lib/job-actions.ts` only; pure server-side
- **`fetchJobDetail` polling** — client components call via `fetch("/api/jobs/:id/detail")` OR via Server Action; decision deferred to planner (API route vs Server Action both viable — API route slightly easier to poll from a client component, Server Action slightly more consistent with the project's "no API routes where Server Actions suffice" bias per CLAUDE.md)
- **Next.js caching** (Pitfall 6) — `fetchJobDetail` uses PG Pool directly, not fetch; default Next.js fetch caching doesn't apply. `revalidatePath` + ordinary SELECT query is the freshness mechanism.
- **ExternalSecrets** (CLAUDE.md deployment section) — `N8N_WEBHOOK_SECRET` flows from `secrets` namespace via ClusterSecretStore; Phase 23 only adds the env var placeholder in `.env.example` + docs; actual secret provisioning is a homelab-repo concern

</code_context>

<specifics>
## Specific Ideas

- HMAC canonical message (`timestamp.path.body`) matches GitHub's webhook signing pattern — owner can Google the format if needed and find precedent
- 24h idempotency-key dedup window is the n8n side, stored in n8n's execution DB; app-side just generates fresh UUIDs per click
- The 180s polling cap (60 × 3s) is intentionally generous — real runs complete in 15-60s; cap exists to prevent infinite polling on upstream stalls
- Pessimistic UI chosen explicitly per SC #2 — optimistic regenerate patterns can create ghost content that diverges from the actual LLM output
- `job-outreach` mention in SC #5 is likely stale — planner greps and either confirms the 3 real call sites or surfaces an archaeological finding
- The `N8N_WEBHOOK_SECRET` env var is the only new deployment surface; ExternalSecrets already covers it

</specifics>

<deferred>
## Deferred Ideas

- **Regenerate tailored resume** (AI-ACTION-05) — Phase 24; reuses Phase 23's pattern verbatim with different predicate
- **Regenerate salary intelligence** (AI-ACTION-06) — Phase 24; predicate = `search_date > clickDate` (note search_date semantics per Phase 22 D-03)
- **"Workflow returned success but no data changed" warning** (AI-ACTION-07) — Phase 24; Phase 23's 180s timeout surfaces as "unavailable" sentinel today, which is a degraded but acceptable experience for v1
- **TanStack Query introduction** — Phase 24 reassesses if 4+ polling surfaces warrant a library dep
- **Rate-limit feedback from n8n** (Retry-After header → owner-facing countdown) — not worth the complexity for v1; "rate limit" sentinel is bounded-enough info
- **Toast notifications on completion** — UI-SPEC picks; D-09 specifies in-button spinner as the baseline; toast is additive
- **Bulk operations** ("Research all unresearched companies") — explicitly out of scope per REQUIREMENTS "Auto-scheduled company_research across all 467 jobs" anti-feature
- **Webhook retry with exponential backoff** on transient failures (timeout, 5xx) — not in Phase 23; owner re-clicks the button if the sentinel says "unavailable"
- **Admin-ops dashboard** showing recent webhook signature failures + replay rejections — future observability feature, backlog
- **Migration away from fire-and-forget posture** for reject/dismiss/interested status sync webhooks — the 3 retrofit call sites STILL use `void sendSignedWebhook(...)`; making them awaited + sentinel-checked is a separate decision once observability is wired up

</deferred>

---

*Phase: 23-owner-triggered-workflows-pattern-setter*
*Context gathered: 2026-04-22 (auto mode — 12 decisions locked using recommended/established patterns from Phases 20-22)*
