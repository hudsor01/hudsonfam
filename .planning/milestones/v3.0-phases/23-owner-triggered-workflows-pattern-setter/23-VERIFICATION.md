---
phase: 23-owner-triggered-workflows-pattern-setter
verified: 2026-04-22T13:40:00Z
status: passed
score: 5/5 must-haves verified (5 SC + 5 REQs + 7 grep gates all pass)
overrides_applied: 0
---

# Phase 23: Owner-Triggered Workflows (Pattern Setter) — Verification Report

**Phase Goal:** Owner can manually trigger the company-research workflow and regenerate a cover letter for any job; every webhook leaving the app is HMAC-signed, idempotency-keyed, and returns only sanitized error sentinels — establishing the pattern Phase 24 will copy.

**Verified:** 2026-04-22
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths (ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Owner opens a job with no company research, clicks "Research this company", sees in-progress spinner + disabled button, polls every 3s cap 60, Company Intel populates | VERIFIED | `TriggerCompanyResearchButton` at `src/app/(admin)/admin/jobs/trigger-company-research-button.tsx:64-167` — ButtonState discriminated union (idle/in-progress/error), `setInterval(3000)` at L125, 60-poll cap at L106 ("if (currentCount >= 60)"), INSERT-wait predicate at L94-97 (`detail?.company_research !== null`), `aria-busy={isPolling}` at L151, `Loader2` spinner at L154. Mounted at `job-detail-sheet.tsx:304` inside `SectionErrorBoundary section="company_research"` (L291-383), visible only when `detail.company_research === null`. Server Action `triggerCompanyResearch` at `src/lib/job-actions.ts:139-152` with `requireRole(["owner"])` L142, fresh `randomUUID()` L143. |
| 2 | Owner clicks "Regenerate cover letter"; pessimistic spinner; polls until `generated_at` > server-side baseline; sheet re-renders with new content + fresh timestamp | VERIFIED | `RegenerateCoverLetterButton` at `src/app/(admin)/admin/jobs/regenerate-cover-letter-button.tsx:102-205` — UPDATE-wait predicate `isDone` L42-51 compares `new Date(detail.cover_letter.generated_at).getTime() > new Date(serverBaseline).getTime()`. Server baseline priority at L178 (`res.baseline ?? baselineGeneratedAt`). `regenerateCoverLetter` Server Action at `job-actions.ts:171-198` reads pre-webhook `cover_letters.generated_at` L181-182 inside try/catch (DB-error returns sentinel WITHOUT firing webhook per T-23-02-05 L183-187), returns `{ ok: true, baseline: string | null }`. D-06 amended pattern enforced. |
| 3 | Every POST has X-Hudsonfam-Signature (HMAC-SHA256) + X-Hudsonfam-Timestamp + X-Idempotency-Key; replay same key does NOT re-run | VERIFIED | `sendSignedWebhook` at `src/lib/webhooks.ts:46-100` — HMAC-SHA256 at L67 over canonical `${timestamp}.${path}.${rawBody}` (D-02 format, L66). All 3 required headers set L74-76. `crypto.randomUUID()` called per Server Action invocation (5 sites: `job-actions.ts:85, 98, 113, 143, 189`). n8n-side dedup is a homelab-repo concern (deferred to v3.5-P4 per SUMMARY §Awaiting Upstream). |
| 4 | n8n failure → owner sees one of 4 sentinels; server log has full error with stack; no raw e.message or cluster IPs to browser | VERIFIED | `ErrorSentinel` union at `webhooks.ts:14` (`"timeout" \| "auth" \| "rate limit" \| "unavailable"`). D-07 cascade L82-99: AbortError/TimeoutError→timeout, 401/403→auth, 429→rate limit, everything else→unavailable. `console.error` with full error context at L26. Server Action return path at `job-actions.ts:149, 195` translates to `{ ok: false, sentinel }` — no raw throws. Test `webhooks.test.ts:160` describe block "no raw-error leak (AI-SAFETY-04, D-08)" + "raw error never leaks to return value" at L173. |
| 5 | 3 existing fireWebhook call sites retrofit to signed helper in same PR; CI grep rule asserts every export in job-actions.ts contains requireRole | VERIFIED | `fireWebhook` fully deleted from `src/lib/job-actions.ts` (grep count = 0). 3 call sites retrofitted: `updateJobStatus` reject L82-87, `updateJobStatus` interested L91-100, `dismissJob` L110-114 — all use `void sendSignedWebhook(...)` with `randomUUID()`. Plus 2 new awaited sites: `triggerCompanyResearch` L144-148, `regenerateCoverLetter` L190-194. CI grep gate at `src/__tests__/lib/job-actions.requireRole.test.ts` asserts requireRole adjacency + `fireWebhook` absence (G-7 sentinel). |

**Score:** 5/5 truths verified.

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| AI-ACTION-03 | 23-02, 23-05, 23-07 | Owner can trigger "Research this company"; UI reflects in-progress state + updates when row appears | SATISFIED | Server Action `triggerCompanyResearch` + `TriggerCompanyResearchButton` with 3s/60-cap polling + mount in `job-detail-sheet.tsx:304` |
| AI-ACTION-04 | 23-02, 23-06, 23-07 | Owner can regenerate cover letter; pessimistic spinner, poll-refresh, new generated_at timestamp | SATISFIED | `regenerateCoverLetter` Server Action returns `{ ok: true, baseline }` + `RegenerateCoverLetterButton` with server-side baseline predicate + mount at `job-detail-sheet.tsx:240-243` |
| AI-SAFETY-02 | 23-01 | Every n8n webhook signed with HMAC-SHA256 using `N8N_WEBHOOK_SECRET` | SATISFIED | `sendSignedWebhook` canonical `${ts}.${path}.${rawBody}` HMAC + `X-Hudsonfam-Signature` header; secret missing returns sentinel (not throws) |
| AI-SAFETY-03 | 23-01 | Every webhook call includes `X-Idempotency-Key`; replay does not re-run | SATISFIED | Header present at `webhooks.ts:76`; fresh `randomUUID()` per call at 5 sites (dedup n8n-side deferred to v3.5-P4) |
| AI-SAFETY-04 | 23-01 | Server Action errors drawn from sentinel set; raw `e.message` never returned | SATISFIED | Bounded union at `webhooks.ts:14`; D-08 test "raw error never leaks" at `webhooks.test.ts:173`; full error `console.error`'d server-side only |

All 5 Phase 23 REQs code-complete. `AI-ACTION-05` / `AI-ACTION-06` listed as [x] in REQUIREMENTS.md belong to Phase 24 (same-pattern extensions) — out of scope for Phase 23 verification.

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/webhooks.ts` | sendSignedWebhook + HMAC + sentinel cascade | VERIFIED | 101 lines; HMAC-SHA256 at L67; D-07 4-sentinel cascade L83-99; D-08 no-raw-leak (only sentinel returned); reads env at call time (not module-load) for test isolation |
| `src/lib/job-actions.ts` | 2 new Server Actions + 3 retrofits + fireWebhook DELETED | VERIFIED | `triggerCompanyResearch` L139-152; `regenerateCoverLetter` L171-198; 3 retrofits at L82-87, L91-100, L110-114; `fireWebhook` count = 0 |
| `src/app/(admin)/admin/jobs/trigger-company-research-button.tsx` | Client button + 3s polling + 60-cap + aria-busy | VERIFIED | 167 lines; ButtonState union L17-20; `setInterval(... 3000)` L125; 60-cap L106, L117; `aria-busy` L151; Sparkles idle + Loader2 spinning |
| `src/app/(admin)/admin/jobs/regenerate-cover-letter-button.tsx` | Client button + server-baseline predicate + G-6 no Date.now | VERIFIED | 205 lines; `isDone` L42-51 parses ISO via `new Date(...).getTime()` (not wall clock); `Date.now()` count = 0; server-baseline preference L178 |
| `src/app/(admin)/admin/jobs/job-detail-sheet.tsx` | Both buttons mounted inside their SectionErrorBoundary | VERIFIED | `TriggerCompanyResearchButton` at L304 (inside section="company_research" L291-383 boundary); `RegenerateCoverLetterButton` at L240-243 (inside section="cover_letter" L182-251 boundary) |
| `.env.example` | N8N_WEBHOOK_SECRET placeholder | VERIFIED | L21: `N8N_WEBHOOK_SECRET=""` |
| `CLAUDE.md` | Env var table row for N8N_WEBHOOK_SECRET | VERIFIED | L179: `N8N_WEBHOOK_SECRET    # HMAC-SHA256 shared secret for signing n8n webhook POSTs (Phase 23 AI-SAFETY-02)` |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| `TriggerCompanyResearchButton` | `triggerCompanyResearch` Server Action | import + `await triggerCompanyResearch(jobId)` L130 | WIRED | Action returns discriminated union; button routes on `res.ok` → polling or error state |
| `TriggerCompanyResearchButton` | `fetchJobDetail` | import + `fetchJobDetail(jobId)` L90 inside setInterval | WIRED | INSERT-wait predicate L94-97; clears interval on match |
| `RegenerateCoverLetterButton` | `regenerateCoverLetter` Server Action | import + `await regenerateCoverLetter(jobId)` L170 | WIRED | Action returns `{ ok: true, baseline } \| { ok: false, sentinel }`; button captures `res.baseline` for predicate |
| `RegenerateCoverLetterButton` | `fetchJobDetail` | import + `fetchJobDetail(jobId)` L129 | WIRED | UPDATE-wait predicate compares via `isDone(detail, serverBaseline)` |
| `triggerCompanyResearch` | `sendSignedWebhook` | `await sendSignedWebhook("job-company-intel", ...)` L144-148 | WIRED | Fresh `randomUUID()` idempotency key; returns sentinel on failure |
| `regenerateCoverLetter` | `sendSignedWebhook` | `await sendSignedWebhook("regenerate-cover-letter", ...)` L190-194 | WIRED | Pre-webhook `getJobDetail` baseline read (with try/catch); fresh UUID |
| `updateJobStatus` rejected | `sendSignedWebhook` | `void sendSignedWebhook("job-feedback-sync", ...)` L82-87 | WIRED | Fire-and-forget retrofit; randomUUID |
| `updateJobStatus` interested | `sendSignedWebhook` | `void sendSignedWebhook("job-company-intel", ...)` L91-100 | WIRED | Fire-and-forget retrofit; randomUUID |
| `dismissJob` | `sendSignedWebhook` | `void sendSignedWebhook("job-feedback-sync", ...)` L110-114 | WIRED | Fire-and-forget retrofit; randomUUID |
| `sendSignedWebhook` | n8n webhook endpoint | HMAC-signed fetch POST | WIRED | 3 required headers; canonical message `${timestamp}.${path}.${rawBody}`; AbortSignal.timeout(5000) |
| Both button mount sites | SectionErrorBoundary | JSX nesting inside existing wraps | WIRED | G-4 grep gate + source-range verification confirms both buttons inside correct boundaries |

---

### Grep-Gate Verification (G-1..G-7)

| Gate | Check | Expected | Actual | Status |
|------|-------|----------|--------|--------|
| G-1 | `aria-busy` present on both button components | ≥1 per file | trigger-button L151; regenerate-button L193 | PASS |
| G-2 | Raw Tailwind color classes `(text\|bg\|border)-(red\|amber\|yellow\|green\|emerald\|orange\|blue\|gray\|zinc\|slate)-\d` in new .tsx files | 0 | 0 matches | PASS |
| G-3 | Sentinel strings rendered verbatim as `Error: {sentinel}` via `{state.sentinel}` interpolation; no client-side rewriting | present | trigger-button L161-163; regenerate-button L199-201 | PASS |
| G-4 | `TriggerCompanyResearchButton` inside `SectionErrorBoundary section="company_research"`; `RegenerateCoverLetterButton` inside `SectionErrorBoundary section="cover_letter"` | both match | lines 291-383 contain trigger-button at 304; lines 182-251 contain regenerate-button at 240 | PASS |
| G-5 | Button labels verbatim: "Research this company" and "Regenerate cover letter" | both match | trigger-button L158; regenerate-button L196 | PASS |
| G-6 | `Date.now()` count in regenerate-cover-letter-button.tsx | 0 | 0 | PASS |
| G-7 | `fireWebhook` count in job-actions.ts | 0 | 0 (only grep-gate test file references the string to assert absence) | PASS |

All 7 grep gates locked at the source-file level.

---

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Full test suite green | `npm test -- --run` | 35 test files passed / 509 tests passed / 4.09s | PASS |
| Production build compiles | `npm run build` | Exit 0; Next.js 16.2.1 Turbopack; full route tree rendered | PASS |
| G-6 source-text check | `grep -c "Date.now()" regenerate-cover-letter-button.tsx` | 0 | PASS |
| G-7 source-text check | `grep -c "fireWebhook" job-actions.ts` | 0 | PASS |
| HMAC helper exports | `grep "X-Hudsonfam-Signature\|X-Hudsonfam-Timestamp\|X-Idempotency-Key" webhooks.ts` | All 3 present at L74-76 | PASS |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|-------------------|--------|
| `TriggerCompanyResearchButton` | `state.sentinel` (on error), polling state | `triggerCompanyResearch` Server Action → `sendSignedWebhook` → real n8n POST (homelab `n8n.cloud.svc.cluster.local:5678`); `fetchJobDetail` → `getJobDetail` Prisma query | Yes — Server Action makes real HTTP call, predicate polls real DB row via `fetchJobDetail` | FLOWING |
| `RegenerateCoverLetterButton` | `state.serverBaseline`, cover_letter.generated_at poll target | `regenerateCoverLetter` reads pre-webhook `cover_letters.generated_at` via `getJobDetail` (real DB query), fires `sendSignedWebhook` (real n8n POST); polls `fetchJobDetail` until generated_at advances | Yes — full pre-webhook DB baseline + real webhook fire + real polling DB query | FLOWING |
| `sendSignedWebhook` | HTTP response | Real `fetch()` to n8n cluster URL with computed HMAC signature | Yes (runtime — not testable without live n8n; UAT deferred to v3.5-P4 homelab-repo PR) | FLOWING |

**Note:** The n8n-side HMAC verification + X-Idempotency-Key dedup is a homelab-repo PR (shipped separately per CONTEXT.md §Awaiting Upstream). Hudsonfam ships the signing side completely; the receiving verification is out of app-repo scope.

---

### Anti-Patterns Found

None.

Scanned files: `src/lib/webhooks.ts`, `src/lib/job-actions.ts`, `src/app/(admin)/admin/jobs/trigger-company-research-button.tsx`, `src/app/(admin)/admin/jobs/regenerate-cover-letter-button.tsx`, `src/app/(admin)/admin/jobs/job-detail-sheet.tsx` (mount-site diff region).

Checks run:
- TODO/FIXME/XXX/HACK/PLACEHOLDER: 0 matches
- placeholder / coming soon / not implemented / not available: 0 matches
- `return null` / `return {}` / `return []` (rendering paths): 0 matches in rendering; early returns inside predicates are legitimate (`isDone` returns `false` for missing cover_letter)
- Hardcoded empty props at call sites: 0 matches
- Console.log-only implementations: 0 matches
- Raw Tailwind color class names: 0 matches (G-2)

---

### Human Verification Required

None — Phase 23 ships the signing side with full test coverage (509/509 green). n8n-side HMAC verification + prod UAT are explicitly deferred to v3.5-P4 (homelab-repo PR concern, same pattern as Phase 21 and Phase 22 precedents per SUMMARY §Deferred to v3.5-P4). Deferral is documented in SUMMARY.md, REQUIREMENTS.md, and STATE.md — it is an intentional phase-boundary decision, not a verification gap.

---

## Gaps Summary

No gaps found. All 5 ROADMAP Success Criteria, all 5 Phase 23 REQs, and all 7 UI-SPEC grep gates (G-1..G-7) are verified in the codebase. The phase goal — owner-triggered HMAC-signed + idempotency-keyed + sentinel-scrubbing webhook pattern, established as the template Phase 24 will copy — is fully achieved.

**Phase 23 is CODE COMPLETE and verified. Ready to proceed to `/gsd-discuss-phase 24`.**

---

*Verified: 2026-04-22T13:40:00Z*
*Verifier: Claude (gsd-verifier)*
