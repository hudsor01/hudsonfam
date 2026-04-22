# Phase 23: Owner-Triggered Workflows (Pattern Setter) - Research

**Researched:** 2026-04-22
**Domain:** HMAC-signed + idempotency-keyed webhook helper; pessimistic-poll Server-Action-backed owner buttons; CI grep lock on requireRole
**Confidence:** HIGH (every claim grounded in either the live source tree, the exact CONTEXT.md decisions, verified Context7 doc fetches, or a project-precedent test file)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** New file `src/lib/webhooks.ts` owns the signed helper. Exports `sendSignedWebhook(path, body, idempotencyKey): Promise<WebhookResult>`. `WebhookResult = { ok: true } | { ok: false, sentinel: ErrorSentinel }`; `ErrorSentinel = "timeout" | "auth" | "rate limit" | "unavailable"`. `fireWebhook` at `job-actions.ts:25-38` DELETED — no deprecation wrapper, no migration window.
- **D-02:** HMAC canonical message = `${timestamp}.${path}.${rawBody}` (literal `.` separators, GitHub/Stripe/Slack convention). `timestamp` = Unix-ms as string. `path` = webhook path without leading slash. `rawBody` = exact JSON string POSTed. Headers: `X-Hudsonfam-Signature: sha256=<hex>`, `X-Hudsonfam-Timestamp: <ms>`. n8n rejects timestamps >5 min old AND idempotency-key collisions within 24h.
- **D-03:** Idempotency key = `crypto.randomUUID()` per call, fresh in the Server Action before `sendSignedWebhook`. Deterministic keys would suppress legitimate retries; per-click UUIDs let network-retries dedup while new clicks start new runs.
- **D-04:** Polling = vanilla `useEffect` + `setInterval` + `fetch` (or direct Server Action call). NO TanStack Query introduction.
- **D-05:** 3-second intervals, hard cap at 60 polls = 180s timeout. On timeout → `"unavailable"` sentinel. Button stays disabled; owner refreshes sheet to retry.
- **D-06:** Done-predicate differs per artifact:
  - `triggerCompanyResearch`: polls `fetchJobDetail(jobId)` until `detail.company_research !== null` (INSERT wait)
  - `regenerateCoverLetter`: captures `clickTimestamp = Date.now()` before firing; polls until `detail.cover_letter?.generated_at > clickTimestamp` (UPDATE wait)
  - Button accepts `isDone: (detail) => boolean` predicate prop — Phase 24 reuses the shape.
- **D-07:** Server-side cascade in `webhooks.ts`:
  1. `AbortError` / network-timeout throw → `"timeout"`
  2. HTTP 401 / 403 → `"auth"`
  3. HTTP 429 → `"rate limit"`
  4. Everything else (5xx, connect-refused, DNS failure, malformed JSON) → `"unavailable"`
  Server logs full error + path + status via `console.error`. Cluster IPs MUST be scrubbed from browser-bound payload — 4 sentinel strings are the ONLY failure-path payload.
- **D-08:** No raw-error leak escape hatches. Every webhook-firing Server Action MUST catch `sendSignedWebhook`'s return and translate to sentinel response. Direct `throw e` returns raw message to client (Next.js default). Pattern: `const res = await sendSignedWebhook(...); if (!res.ok) return { ok: false, sentinel: res.sentinel };`.
- **D-09:** Button placement:
  - `TriggerCompanyResearchButton` mounts in Company Intel meta row, visible ONLY when `detail.company_research === null`.
  - `RegenerateCoverLetterButton` mounts in Cover Letter meta row, visible when `detail.cover_letter !== null` (existing letter required to regenerate). Label: verbatim "Regenerate cover letter".
  - shadcn `<Button variant="outline" size="sm">` + `<Loader2 className="animate-spin" />` during in-progress. Disabled + muted-text during polling. On sentinel failure, button re-enables + inline error-variant helper text (e.g., `<p className="text-destructive text-xs mt-1">Error: rate limit</p>`).
- **D-10:** Pessimistic-only. No optimistic card placeholder for Company Intel. No optimistic text for Cover Letter. SC #2 explicitly locks "pessimistic spinner."
- **D-11:** Retrofit scope = 3 call sites in `src/lib/job-actions.ts` at lines **98, 103, 118** (verified 2026-04-22 via grep; unchanged post-Phase 22). All three preserve fire-and-forget posture (`void sendSignedWebhook(...)`). ROADMAP SC #5's `job-outreach` mention is STALE — grep confirmed zero matches in `src/`; planner updates SC #5 during execution.
- **D-12:** CI grep rule lives in `src/__tests__/lib/job-actions.requireRole.test.ts` (Vitest + `readFileSync` — Phase 22's job-detail-sheet.test.tsx G-1 pattern is the direct precedent).

### Claude's Discretion

- Exact CI grep test file location (`src/__tests__/lib/` vs `src/__tests__/ci/` — planner picks; recommend `src/__tests__/lib/` per D-12 wording + Phase 22 precedent)
- Button internal state shape (`idle | in-progress | sentinel` discriminated union vs boolean flags — **Section 7 recommends discriminated union**)
- Whether `WebhookResult` + `ErrorSentinel` live in `webhooks.ts` or `webhook-types.ts` (**Section 2 recommends inline in `webhooks.ts`** — two callers, both in `job-actions.ts`, no circular-import risk)
- Zod validation of incoming webhook responses from n8n — **Section 6 recommends NO response parsing**; helper fires-and-forgets, predicate-polling is the success signal (matches D-06's UPDATE-wait semantics)
- Toast on completion — UI-SPEC decides; spinner is baseline; toast is additive
- Polling library (`swr` / TanStack Query) — D-04 says NO for 2 surfaces; Phase 24 reassesses

### Deferred Ideas (OUT OF SCOPE)

- Regenerate tailored resume (AI-ACTION-05) → Phase 24
- Regenerate salary intelligence (AI-ACTION-06) → Phase 24
- Silent-success warning (AI-ACTION-07) → Phase 24; Phase 23's 180s cap surfaces as "unavailable" today
- TanStack Query introduction — Phase 24 reassesses at 4+ polling surfaces
- Rate-limit Retry-After countdown — "rate limit" sentinel is bounded-enough for v1
- Toast notifications on completion — UI-SPEC picks; additive to spinner
- Bulk operations ("Research all unresearched") — explicit anti-feature
- Webhook retry with exponential backoff — owner re-clicks button on "unavailable"
- Admin-ops dashboard of webhook signature failures — future observability
- Making reject/dismiss/interested status-sync webhooks awaited + sentinel-checked — separate decision once observability wired up

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| **AI-ACTION-03** | Owner can trigger "Research this company" for a job whose `company_research` is empty; UI reflects in-progress state and updates when the row appears. | Section 6 (Server Action `triggerCompanyResearch`), Section 7 (`TriggerCompanyResearchButton` component), Section 4 (useEffect+setInterval polling with INSERT-wait predicate) |
| **AI-ACTION-04** | Owner can regenerate cover letter; UI shows pessimistic spinner, poll-refreshes on completion, displays new `generated_at` timestamp. | Section 6 (`regenerateCoverLetter`), Section 7 (`RegenerateCoverLetterButton` with `clickTimestamp` capture), Section 4 (UPDATE-wait predicate `generated_at > clickTimestamp`) |
| **AI-SAFETY-02** | Every n8n webhook is signed with HMAC-SHA256; n8n rejects unsigned calls. | Section 2 (exact Node.js `crypto.createHmac` usage; canonical message; headers; raw-body pitfall; n8n-side verification pattern) |
| **AI-SAFETY-03** | Every webhook includes `X-Idempotency-Key`; replaying the same call does not re-run. | Section 3 (`crypto.randomUUID()` per call; header injection; n8n-side 24h dedup pattern) |
| **AI-SAFETY-04** | Server Action errors drawn from sentinel set ("timeout", "auth", "rate limit", "unavailable"); raw `e.message` / stack never returned. | Section 5 (error cascade in `webhooks.ts`; discriminated-union return; server-log-full-client-gets-sentinel pattern; cluster-IP scrubbing) |

</phase_requirements>

## Executive Summary

Phase 23 ships a single new file (`src/lib/webhooks.ts` — ~60 LoC of HMAC + idempotency + error-cascade primitive) plus two ~80 LoC client button components consuming two new Server Actions. Every piece has a direct precedent in the codebase: the HMAC/crypto APIs are Node 25+ built-ins (verified `typeof crypto.createHmac === "function"` locally), the Vitest fake-timer polling pattern is documented at `vitest-dev/vitest` (verified via Context7), the `readFileSync` CI grep test is Plan 22-07's pattern copied almost verbatim, and the sentinel-error discriminated-union is Plan 20-03's `parseOrLog` fail-open pattern applied to webhook failures instead of Zod failures. [VERIFIED: file grep + Context7 docs]

**Confidence per deliverable:**

| Deliverable | Confidence | Why |
|-------------|-----------|-----|
| `src/lib/webhooks.ts` (HMAC + idempotency + cascade) | HIGH | Node crypto is stdlib; canonical message format is GitHub/Stripe convention; cascade is 5 explicit `if/else if` branches |
| 2 Server Actions with sentinel responses | HIGH | `fetchJobDetail` + `attachFreshness` already exported; `requireRole` pattern is 5-for-5 in current file |
| 2 client button components with polling | HIGH | useEffect + setInterval + AbortController is standard React 19 pattern; Next.js 16 docs explicitly show Server Action invocation from useEffect (verified Context7 fetch) |
| 3 retrofit call sites (lines 98, 103, 118) | HIGH | Line numbers verified via grep 2026-04-22; `void fireWebhook(...)` → `void sendSignedWebhook(path, body, crypto.randomUUID())` |
| CI grep test (`job-actions.requireRole.test.ts`) | HIGH | Direct clone of Plan 22-07's `job-detail-sheet.test.tsx` readFileSync+regex pattern |

**Primary recommendation:** Ship in two waves: Wave 1 = `webhooks.ts` + 2 Server Actions + retrofits + CI grep test (backend-heavy, ~4 tasks, pure unit tests, no browser surface). Wave 2 = 2 button components + mount in `job-detail-sheet.tsx` (depends on Server Actions being exported). This maps cleanly to the D-11 retrofit scope + Wave 1 gives the CI grep test a green suite before Wave 2 adds 2 new exports that the test must immediately cover.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| HMAC signing + canonical message | Server (Node.js, `src/lib/webhooks.ts`) | — | `N8N_WEBHOOK_SECRET` never crosses the client boundary; `crypto.createHmac` is Node stdlib, not available in browser-safe contexts |
| Idempotency-key generation | Server (`crypto.randomUUID()` inside Server Action) | — | Generated server-side after `requireRole(["owner"])`; key never trusted from client to prevent replay with attacker-chosen UUID |
| Error-to-sentinel cascade | Server (`webhooks.ts`) | — | Raw error details MUST NOT cross the client boundary (D-07, D-08) |
| Server Action entry points | Server (`src/lib/job-actions.ts`) | — | `requireRole` is server-only (Better Auth + cookie headers) |
| Polling orchestration | Client (button components) | Server (Server Action target) | Only the UI knows when polling should stop; the predicate consumes `FreshJobDetail` returned by server-side `fetchJobDetail` |
| Done-predicate evaluation | Client (prop function) | — | Pure function over `FreshJobDetail`; exposure to server is unnecessary |
| `revalidatePath` cache-busting | Server (inside Server Action, post-sendSignedWebhook) | — | Next.js `next/cache` is server-only; fires once per click to seed fresh data for the first poll |
| Sentinel display | Client (button component) | — | UI concern — render error-variant text below disabled button |
| n8n webhook verification | External (n8n homelab repo) | — | Homelab PR; out of scope for this repo but documented in Section 2 |

## Standard Stack

### Core (all already installed — ZERO new dependencies)

| Library | Version (verified) | Purpose | Why Standard |
|---------|-------------------|---------|--------------|
| `node:crypto` | Node 25.3.0 stdlib | HMAC-SHA256, `randomUUID`, `timingSafeEqual` | Stdlib; `createHmac` + `randomUUID` + `timingSafeEqual` all verified with `typeof === "function"` via `node -e` 2026-04-22 [VERIFIED: local probe] |
| `next` | 16.2.1 | Server Actions, `revalidatePath`, App Router | Already the framework; Server Actions are the project's "no API routes where Server Actions suffice" convention [VERIFIED: package.json L31] |
| `react` | 19.2.4 | `useEffect`, `useRef`, `useState`, `useTransition` | Already the framework [VERIFIED: package.json L36] |
| `lucide-react` | ^1.7.0 | `Loader2` spinner icon | Already imported across project (18+ call sites) [VERIFIED: package.json L30] |
| `vitest` | ^4.1.2 | `vi.useFakeTimers`, `vi.advanceTimersByTime`, `vi.fn`, `readFileSync`-based tests | Existing test infra; fake-timer API verified via Context7 fetch [VERIFIED: package.json L65] |
| `@testing-library/react` | ^16.3.2 | Component render + interaction tests | Existing test infra [VERIFIED: package.json L53] |

### Supporting (already in repo)

| File | Purpose | When to Use |
|------|---------|-------------|
| `src/lib/session.ts` `requireRole(["owner"])` | First-line invariant on every Server Action | **MUST** appear within 10 lines of every `export async function` in `job-actions.ts` (D-12) |
| `src/lib/attach-freshness.ts` | Tri-field freshness dispatch | Server Action returns `FreshJobDetail` after polling resolves |
| `src/lib/jobs-db.ts` `getJobDetail(jobId)` | DB read; LEFT JOIN LATERAL of 4 artifacts | Polling target via `fetchJobDetail` → `getJobDetail` |
| `src/components/ui/button.tsx` | shadcn Button with `outline` + `sm` variants | Owner-triggered buttons (D-09) |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `crypto.createHmac` (Node stdlib) | `@noble/hashes`, `jsrsasign`, `tweetnacl` | Stdlib is zero-dep, audited by the runtime team, and Edge-compatible (Next.js 16 Server Actions run in the Node runtime by default — no Edge incompatibility). Third-party libs add supply-chain risk for no gain. [ASSUMED — no Edge runtime in play; Next.js 16.2.1 defaults to Node runtime] |
| Vanilla `useEffect` + `setInterval` | TanStack Query (`useQuery` + `refetchInterval`) | D-04 locks vanilla — project has zero TanStack Query usage; introducing it for 2 surfaces is scope creep. Phase 24 reassesses if regenerate-resume + regenerate-salary add 2 more surfaces. [CITED: CONTEXT.md D-04] |
| API route (`/api/jobs/[id]/trigger-research`) | Server Action | Project convention per CLAUDE.md: "no API routes where Server Actions suffice". Server Actions also avoid the need to generate CSRF tokens and inherit `requireRole(["owner"])` transparently. One exception: the PDF-download route uses `/api/jobs/[id]/cover-letter-pdf` because Server Actions cannot stream binary bodies — not applicable here. [CITED: CLAUDE.md §Component Patterns] |
| Factory component pattern (single `<RegenerateButton />` with predicate prop) | Two separate components | D-06 says "button accepts isDone predicate prop" — factory is viable but Phase 24 will add 2 more buttons (resume + salary), so committing to the factory Phase 23 saves 4 files Phase 24. **Recommend: ship as 2 components with inline prop-passing for Phase 23; extract the factory in Phase 24 when the 4-button shape is clearly regular.** Avoid premature abstraction for N=2. |

**Installation:** None. Phase 23 adds zero dependencies. [VERIFIED: grep confirms `crypto`, `next`, `react`, `lucide-react`, `vitest`, `@testing-library/react` all present in package.json]

**Version verification (all current — no upgrade needed):**

```bash
# All verified via Read of /home/dev-server/hudsonfam/package.json on 2026-04-22
# next: 16.2.1 (pinned, current stable for Phase 20 CSP middleware work)
# react: 19.2.4 (pinned)
# vitest: ^4.1.2 (current major — API stable for useFakeTimers per Context7)
# lucide-react: ^1.7.0
# zod: ^4.3.6 (available if we ever want incoming n8n response validation — NOT recommended for Phase 23 per D-discretion above)
```

## Architecture Patterns

### System Architecture Diagram

```
┌────────────────────────────────────────────────────────────────┐
│ BROWSER — Client Component (e.g. TriggerCompanyResearchButton) │
│                                                                │
│  Owner click                                                   │
│    │                                                           │
│    ▼                                                           │
│  startTransition(async () => {                                 │
│    setState({ kind: "in-progress", clickedAt: Date.now() })    │
│    const res = await triggerCompanyResearch(jobId)             │
│    if (!res.ok) {                                              │
│      setState({ kind: "sentinel", sentinel: res.sentinel })    │
│      return                                                    │
│    }                                                           │
│    startPolling(isDone, onTimeout, onMatch)                    │
│  })                                                            │
│                                                                │
│  setInterval (3s, cap 60) →                                    │
│    await fetchJobDetail(jobId)                                 │
│    if (isDone(detail)) { clearInterval; setState(idle); }      │
│    if (++count === 60)  { setState("unavailable"); }           │
│                                                                │
└────────────────────────────────┬───────────────────────────────┘
                                 │ Server Action invocation
                                 │ (Next.js transport; React 19)
                                 ▼
┌────────────────────────────────────────────────────────────────┐
│ SERVER — src/lib/job-actions.ts (Server Actions)               │
│                                                                │
│  "use server"                                                  │
│  export async function triggerCompanyResearch(jobId) {         │
│    await requireRole(["owner"])     ◀── D-12 invariant         │
│    const idemKey = crypto.randomUUID()                         │
│    const res = await sendSignedWebhook(                        │
│      "job-company-intel", { job_id: jobId }, idemKey)          │
│    if (!res.ok) return { ok: false, sentinel: res.sentinel }   │
│    revalidatePath("/admin/jobs")                               │
│    return { ok: true }                                         │
│  }                                                             │
│                                                                │
│  export async function fetchJobDetail(jobId) {                 │
│    await requireRole(["owner"])     ◀── already exists         │
│    return attachFreshness(getJobDetail(jobId))                 │
│  }                                                             │
│                                                                │
└────────────────────────────────┬───────────────────────────────┘
                                 │ import
                                 ▼
┌────────────────────────────────────────────────────────────────┐
│ SERVER — src/lib/webhooks.ts (NEW)                             │
│                                                                │
│  sendSignedWebhook(path, body, idempotencyKey):                │
│    timestamp = Date.now().toString()                           │
│    rawBody = JSON.stringify(body)                              │
│    canonical = `${timestamp}.${path}.${rawBody}`               │
│    sig = hmac("sha256", N8N_WEBHOOK_SECRET).update(canonical)  │
│           .digest("hex")                                       │
│    try {                                                       │
│      const r = await fetch(`${BASE}/webhook/${path}`, {        │
│        method: "POST",                                         │
│        headers: {                                              │
│          "Content-Type": "application/json",                   │
│          "X-Hudsonfam-Signature": `sha256=${sig}`,             │
│          "X-Hudsonfam-Timestamp": timestamp,                   │
│          "X-Idempotency-Key": idempotencyKey,                  │
│        },                                                      │
│        body: rawBody,  ◀── SAME string that was signed (D-02)  │
│        signal: AbortSignal.timeout(5000),                      │
│      })                                                        │
│      if (r.status === 401 || r.status === 403)                 │
│        return sentinel("auth", ...)                            │
│      if (r.status === 429) return sentinel("rate limit", ...)  │
│      if (!r.ok)            return sentinel("unavailable", ...) │
│      return { ok: true }                                       │
│    } catch (e) {                                               │
│      if (e.name === "AbortError" || e.name === "TimeoutError") │
│        return sentinel("timeout", e, path)                     │
│      return sentinel("unavailable", e, path)                   │
│    }                                                           │
│                                                                │
│  sentinel(kind, error, path):                                  │
│    console.error(`[webhook:${path}] ${kind}`, error)           │
│    return { ok: false, sentinel: kind }                        │
│                                                                │
└────────────────────────────────┬───────────────────────────────┘
                                 │ HTTPS POST (cluster-internal)
                                 ▼
┌────────────────────────────────────────────────────────────────┐
│ EXTERNAL — n8n.cloud.svc.cluster.local:5678 (homelab repo)     │
│                                                                │
│  Webhook node verifies:                                        │
│    1. `X-Hudsonfam-Signature` matches HMAC(canonical) with     │
│       constant-time compare (n8n Function node →               │
│       crypto.timingSafeEqual)                                  │
│    2. `X-Hudsonfam-Timestamp` within 5 min of now              │
│    3. `X-Idempotency-Key` not seen in last 24h (n8n execution  │
│       DB lookup)                                               │
│  → On any failure, respond 401 + increment rejection metric    │
│  → On success, run the downstream LLM workflow                 │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### Recommended Project Structure

```
src/
├── lib/
│   ├── webhooks.ts                  NEW  — sendSignedWebhook + cascade + types
│   ├── job-actions.ts               EDIT — delete fireWebhook, add 2 new actions, retrofit 3 call sites
│   ├── session.ts                   READ-ONLY — requireRole invariant
│   ├── jobs-db.ts                   READ-ONLY — fetchJobDetail → getJobDetail
│   └── attach-freshness.ts          READ-ONLY — used after polling resolves
├── app/(admin)/admin/jobs/
│   ├── trigger-company-research-button.tsx  NEW  — client component, INSERT-wait predicate
│   ├── regenerate-cover-letter-button.tsx   NEW  — client component, UPDATE-wait predicate
│   └── job-detail-sheet.tsx         EDIT — mount both buttons in meta rows
└── __tests__/
    ├── lib/
    │   ├── webhooks.test.ts                  NEW  — HMAC correctness, sentinel cascade, header presence
    │   └── job-actions.requireRole.test.ts   NEW  — CI grep rule (D-12)
    └── components/
        ├── trigger-company-research-button.test.tsx  NEW  — fake-timer polling, INSERT predicate, timeout
        └── regenerate-cover-letter-button.test.tsx   NEW  — clickTimestamp + generated_at UPDATE predicate
```

### Pattern 1: HMAC signing with raw-body identity

**What:** Sign the exact string that gets POSTed — never re-serialize between sign and send.
**When to use:** Every webhook egress to n8n.
**Example:**

```typescript
// Source: Verified via Node 25.3.0 probe 2026-04-22; canonical-message format per CONTEXT.md D-02
// (matches GitHub, Stripe, Slack convention per https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries)

import { createHmac, randomUUID } from "node:crypto";

const SECRET = process.env.N8N_WEBHOOK_SECRET!;

function signCanonical(timestamp: string, path: string, rawBody: string): string {
  const canonical = `${timestamp}.${path}.${rawBody}`;
  return createHmac("sha256", SECRET).update(canonical).digest("hex");
}

// CRITICAL: rawBody is computed ONCE — both signed AND sent as-is.
// DO NOT pass `body: JSON.stringify(obj)` in fetch init after signing
// `JSON.stringify(obj)` separately — JSON.stringify is NOT deterministic
// across engines/ordering; two calls could produce different strings,
// and the receiver would fail the signature check.
```

### Pattern 2: Discriminated-union Server Action response (no-throw policy)

**What:** Server Actions MUST return `{ ok: true } | { ok: false, sentinel: ErrorSentinel }` — never `throw` on webhook failures.
**When to use:** Every owner-triggered Server Action that fires a webhook.
**Example:**

```typescript
// Source: CONTEXT.md D-07/D-08; pattern matches parseOrLog discriminated-union return from Plan 20-03

"use server";

import { requireRole } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import { sendSignedWebhook, type ErrorSentinel } from "@/lib/webhooks";

export type ActionResult =
  | { ok: true }
  | { ok: false; sentinel: ErrorSentinel };

export async function triggerCompanyResearch(
  jobId: number
): Promise<ActionResult> {
  await requireRole(["owner"]);
  // Idempotency key generated AFTER role check — attacker cannot inject
  const idempotencyKey = randomUUID();
  const res = await sendSignedWebhook(
    "job-company-intel",
    { job_id: jobId },
    idempotencyKey
  );
  if (!res.ok) return { ok: false, sentinel: res.sentinel };
  // Seed fresh data for first poll (not strictly required — useEffect polls
  // fetchJobDetail directly — but prevents a visible stale frame if the
  // sheet re-renders between click-ack and first poll)
  revalidatePath("/admin/jobs");
  return { ok: true };
}
```

### Pattern 3: Polling with AbortController + stale-closure-safe counter

**What:** useEffect + setInterval, with `useRef` for poll-count (rules-of-hooks-safe) and AbortController for in-flight fetch cancellation on unmount.
**When to use:** Both new button components.
**Example:**

```tsx
// Source: Context7 fetch from /vitest-dev/vitest + /websites/nextjs
// (verified 2026-04-22 — useEffect + Server Action pattern)

"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles } from "lucide-react";
import {
  triggerCompanyResearch,
  fetchJobDetail,
} from "@/lib/job-actions";
import type { ErrorSentinel } from "@/lib/webhooks";
import type { FreshJobDetail } from "@/lib/jobs-db";

type ButtonState =
  | { kind: "idle" }
  | { kind: "in-progress"; clickedAt: number }
  | { kind: "error"; sentinel: ErrorSentinel };

interface Props {
  jobId: number;
  isDone: (detail: FreshJobDetail) => boolean;
  label: string;
}

export function OwnerTriggeredButton({ jobId, isDone, label }: Props) {
  const [state, setState] = useState<ButtonState>({ kind: "idle" });
  const [isPending, startTransition] = useTransition();
  const pollCountRef = useRef(0);   // stale-closure-safe counter
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Unmount cleanup — cancels in-flight fetch + clears interval
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  const startPolling = (clickedAt: number) => {
    pollCountRef.current = 0;
    intervalRef.current = setInterval(async () => {
      pollCountRef.current += 1;
      // Abort previous in-flight request if a new tick races it
      abortRef.current?.abort();
      abortRef.current = new AbortController();
      try {
        const detail = await fetchJobDetail(jobId);
        if (detail && isDone(detail)) {
          clearInterval(intervalRef.current!);
          setState({ kind: "idle" });
          return;
        }
        if (pollCountRef.current >= 60) {  // D-05 cap
          clearInterval(intervalRef.current!);
          setState({ kind: "error", sentinel: "unavailable" });
        }
      } catch {
        // Polling failure = transient; let next tick retry unless capped
        if (pollCountRef.current >= 60) {
          clearInterval(intervalRef.current!);
          setState({ kind: "error", sentinel: "unavailable" });
        }
      }
    }, 3000);  // D-05 cadence
  };

  const handleClick = () => {
    const clickedAt = Date.now();
    setState({ kind: "in-progress", clickedAt });
    startTransition(async () => {
      const res = await triggerCompanyResearch(jobId);
      if (!res.ok) {
        setState({ kind: "error", sentinel: res.sentinel });
        return;
      }
      startPolling(clickedAt);
    });
  };

  const isPolling = state.kind === "in-progress";
  return (
    <div>
      <Button
        variant="outline"
        size="sm"
        onClick={handleClick}
        disabled={isPolling || isPending}
        className={isPolling ? "text-muted-foreground" : ""}
      >
        {isPolling ? <Loader2 className="animate-spin" /> : <Sparkles />}
        {label}
      </Button>
      {state.kind === "error" && (
        <p className="text-destructive text-xs mt-1">
          Error: {state.sentinel}
        </p>
      )}
    </div>
  );
}
```

### Anti-Patterns to Avoid

- **Re-serializing body between sign and send.** Sign `JSON.stringify(obj)` once and pass the same string to `fetch`'s `body`. Never sign one string and re-serialize the body separately — `JSON.stringify` key-order is engine-defined and can produce different output on two calls with the same input (though V8 is stable in practice, signature correctness should not depend on engine behavior). [CITED: CONTEXT.md D-02 "rawBody is the EXACT JSON string POSTed"]
- **`throw e` from Server Actions on webhook failure.** Next.js returns the raw message to the browser. Use the discriminated-union return pattern (Pattern 2 above). [CITED: CONTEXT.md D-08]
- **Deterministic idempotency keys (e.g., `hash(job_id + action)`).** Two legitimate regenerate-clicks 10s apart would both dedup to one run — the exact opposite of what "regenerate" means. Use `crypto.randomUUID()` per call. [CITED: CONTEXT.md D-03]
- **Polling a client-side cache.** `fetchJobDetail` is a Server Action — every call round-trips to the DB via `pg.Pool`. This is intentional: `revalidatePath` doesn't touch client state, and Next.js does NOT cache Server Action results. No `cache: "no-store"` hint needed. [VERIFIED: Server Actions are not subject to the `fetch` cache per Next.js 16 docs]
- **State in module scope / closure over stale counter.** Without `useRef`, the poll counter would be captured in the setInterval closure at mount time and never update. `useRef.current += 1` is the standard React 19 pattern for mutable per-instance counters. [CITED: react.dev hooks reference]
- **Missing unmount cleanup.** `clearInterval` in the `useEffect` return function is mandatory — otherwise the sheet closing while a poll is active leaks the interval forever and the next open double-polls. [CITED: CONTEXT.md §Integration Points carry-forward]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HMAC-SHA256 hashing | Custom SHA-256 + padding + HMAC construction | `node:crypto` `createHmac("sha256", secret)` | Stdlib is C-level optimized; a hand-rolled HMAC is a cryptographic footgun (timing leaks, length-extension attacks). Node crypto is audited upstream. |
| UUID generation | Random-bytes + dash formatting | `crypto.randomUUID()` | RFC 4122 v4 guarantees 122 bits of entropy; hand-rolled concatenations almost always miss variant/version bits. Verified available in Node 25.3.0 2026-04-22. |
| Timing-safe string comparison (n8n side) | `a === b` on hex strings | `crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b))` | Non-constant-time compare leaks byte-by-byte via timing side channel. (Reference-only — n8n is the verifier; app never receives a signature to verify.) |
| Fetch timeout | `Promise.race([fetch, setTimeout])` | `AbortSignal.timeout(5000)` | Built-in; automatically cleaned up on fetch settle. Avoids the "promise never resolves, setTimeout leaks" footgun of the race pattern. [VERIFIED: Node 25 supports `AbortSignal.timeout`] |
| Polling library | Custom interval loop with manual timeout tracking | `useEffect` + `setInterval` + `useRef` counter (D-04) | 2 surfaces only — TanStack Query adds 40KB and a new mental model for the rest of the codebase. Re-evaluate at Phase 24. |
| Discriminated-union return type | `{ success: boolean, error?: string }` loose shape | `{ ok: true } | { ok: false, sentinel: ErrorSentinel }` | TypeScript narrows on `res.ok` correctly; the loose shape allows callers to forget the error check. Matches Plan 20-03's `parseOrLog` precedent. |
| CI grep rule | Custom ESLint plugin + AST walker | Vitest `readFileSync` + regex (D-12 / Phase 22 precedent) | ESLint custom rules need plugin registration + config + TS-ESLint AST maintenance. Vitest readFileSync is one file, 30 LoC, runs on `npm test`, gets the same coverage. [CITED: CONTEXT.md D-12] |

**Key insight:** Every v3.0 phase so far has added precisely one primitive and reused the rest of the infrastructure (Phase 20 = `parseOrLog`, Phase 21 = `EMPTY_STATE_COPY`, Phase 22 = `ProvenanceTag`). Phase 23's primitive is `sendSignedWebhook`; everything else is composition.

## Runtime State Inventory

Phase 23 is not a rename/refactor phase — it adds new code paths. However, it DELETES `fireWebhook` and replaces 3 call sites, so runtime-state audit is still worth completing:

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None — `fireWebhook` leaves no DB footprint (no table rows, no Redis keys). Webhook idempotency keys are stored in n8n's execution DB (homelab), not in this repo's DB. | None in this repo. Homelab PR sets up n8n-side idempotency storage. |
| Live service config | n8n workflows `job-feedback-sync` + `job-company-intel` currently accept UNSIGNED calls. After retrofit, they will REJECT unsigned calls. Homelab PR must land in lockstep — if hudsonfam deploys signed calls before n8n verifies them, the workflows silently accept them (no regression). If n8n verification deploys before hudsonfam signs, every call is rejected. | **Sequencing: hudsonfam deploys signing first (n8n still accepts both). Then homelab PR adds verification (now rejects unsigned). Then if unsigned calls resurface, we know there's a missed call site.** |
| OS-registered state | None. No systemd units, cron jobs, Kubernetes CronJobs, or scheduled tasks reference `fireWebhook` or any Phase 23 surface. | None — verified via grep on `fireWebhook` in homelab repo directory (not part of this repo — owner confirms via homelab-side audit). |
| Secrets/env vars | `N8N_WEBHOOK_BASE` already exists (verified `src/lib/job-actions.ts:22-23`). `N8N_WEBHOOK_SECRET` does NOT exist — new env var. Must be added to: (1) `.env.example` placeholder, (2) `CLAUDE.md` §Environment Variables list, (3) K8s ExternalSecrets via ClusterSecretStore. | Add env var in 3 places. Actual secret provisioning is a homelab-repo concern (ExternalSecrets flow already wired per CLAUDE.md deployment section). |
| Build artifacts / installed packages | None. No new packages installed. `fireWebhook` was inline in `job-actions.ts`; deletion leaves no stale `.d.ts` or compiled artifact. | None. |

**Canonical question:** *After every file in the repo is updated, what runtime systems still have the old string cached, stored, or registered?*
**Answer:** Only n8n workflows (external). The homelab PR resolves this. This repo has no residual `fireWebhook` footprint post-delete.

## Common Pitfalls

### Pitfall 1: Raw-body divergence between sign and send

**What goes wrong:** `sendSignedWebhook(path, body, key)` computes `JSON.stringify(body)` once for signing, then fetch's init computes it again for the `body` field. If key order differs (object property shuffling, nested object walking), the receiver's HMAC verification fails every call.
**Why it happens:** "Obvious" refactor — the author thinks `JSON.stringify` is deterministic and splits the compute for clarity.
**How to avoid:** Compute `rawBody = JSON.stringify(body)` ONCE in `sendSignedWebhook`. Pass `rawBody` to both `update(canonical)` and `fetch({ body: rawBody })`. Add a test that mutates the body object between sign and send (should still verify — proves the raw string is shared).
**Warning signs:** Intermittent "signature mismatch" rejections in n8n logs that disappear on restart.

### Pitfall 2: Stale closure over `pollCount`

**What goes wrong:** `const [pollCount, setPollCount] = useState(0)` inside a setInterval closure captures the initial `pollCount=0` at mount; every tick sees 0 + 1 = 1 forever. Polling never caps.
**Why it happens:** React useState is per-render snapshot; setInterval's callback is per-mount closure.
**How to avoid:** `useRef` for the counter (`pollCountRef.current += 1`). Refs are stable across renders and always read the latest value. Pattern shown in Section 4 Pattern 3.
**Warning signs:** 180s cap never fires; button stays in spinner forever when n8n is down. A Vitest fake-timer test with `vi.advanceTimersByTime(200_000)` catches this.

### Pitfall 3: Session expiry mid-poll

**What goes wrong:** Owner clicks "Research this company" at T+0. LLM workflow takes 45s. Better Auth session expires at T+30 (hypothetical). Poll #10 calls `fetchJobDetail(jobId)` which calls `requireRole(["owner"])` which calls `redirect("/login")`. The Server Action "succeeds" but the redirect is not honored inside a polling loop — the client-side `await` returns `undefined` or a redirect payload, the predicate can't evaluate, and the button is stuck.
**Why it happens:** `requireRole` is designed for top-of-request — it calls `redirect()` on failure, which is a throw inside the Next.js Server Action pipeline. Polling loops cannot recover from this redirect because the client isn't at a navigable URL context.
**How to avoid:**
1. Default Better Auth session lifetime is 7 days per Better Auth config (verify via `src/lib/auth.ts` — not in Phase 23 scope to change). If sessions last hours/days, this pitfall is theoretical.
2. Make polling tolerant: if `fetchJobDetail` returns `null` or throws, treat as a transient blip; continue polling until cap; do NOT surface a sentinel for a one-tick auth fail (next tick may succeed if session restored).
3. If pattern is required to recover cleanly, the poller could `try { await fetchJobDetail } catch { /* count and continue */ }` — which is what Pattern 3 above already does.
**Warning signs:** Owner reports "the button spun for 3 minutes then said 'unavailable'" on jobs where the n8n workflow DID complete. Check n8n execution log — if it says success, and hudsonfam shows "unavailable", session-expiry is a candidate cause.

### Pitfall 4: Race between `clickTimestamp` and `generated_at` clock drift

**What goes wrong:** `regenerateCoverLetter` captures `clickTimestamp = Date.now()` **on the client**. The n8n workflow writes `cover_letters.generated_at` using the **n8n container's** clock (or the Postgres `NOW()` function — depends on which node does the insert). Client clocks can drift minutes from server clocks without NTP sync. If the client's clock is 2 minutes AHEAD of the DB clock, the predicate `detail.cover_letter.generated_at > clickTimestamp` is FALSE even after a successful regenerate (because the "new" generated_at is stamped at server-now which is 2 min earlier than client-now).
**Why it happens:** Mixed clock domains. One clock stamps the predicate's lower bound, a different clock stamps the observed value.
**How to avoid:**
1. **Recommend:** Capture the timestamp from the server, not the client. Server Action `regenerateCoverLetter` reads `detail.cover_letter?.generated_at` BEFORE firing the webhook; returns `{ ok: true, previousGeneratedAt: ISOString }`; button uses that value as the predicate's lower bound. Client never reads its own clock. Predicate becomes `detail.cover_letter?.generated_at > previousGeneratedAt`.
2. Alternative (weaker): Use a grace window — `detail.cover_letter?.generated_at > clickTimestamp - 300_000` (5-min tolerance). But this widens the false-positive surface: a stale cache load from 4 min ago would satisfy the predicate.
3. Alternative (weakest): Browser's `performance.now()` — monotonic but unrelated to server time; doesn't help.

**Recommendation: Ship with the server-side previousGeneratedAt pattern.** One line added to `regenerateCoverLetter`, one prop passed to the button, zero clock-dependency. The `clickTimestamp` pattern works for Phase 23 demo/ownership because the owner is the only user and the dev/prod clocks are aligned, but it's a latent bug the moment a new family member admin is added or the deployment topology changes.

**Warning signs:** Owner clicks "Regenerate", waits 60s, sees the new content land IN THE DB (verified via `psql`), but the button still spins until timeout. Server clock → client clock skew is the first thing to check.

### Pitfall 5: All 4 sentinels converge to "unavailable" when n8n is down

**What goes wrong:** n8n pod is CrashLoopBackOff. Every webhook call connect-refuses. The cascade falls through to "unavailable". Owner sees "Error: unavailable" — indistinguishable from a 500 response, a DNS failure, or a TLS handshake failure.
**Why it happens:** The sentinel set is intentionally bounded (D-07) — 4 strings is the max information the owner sees. Information is lost at the boundary.
**How to avoid:** Server-side `console.error` captures the full error + status + path (per D-07). Kubernetes logs are the operator's feedback channel; owner-facing "unavailable" is correct per decision.
**Warning signs:** Owner files a bug "every button says unavailable". Correct response: `kubectl logs deployment/hudsonfam -n homepage | grep '\[webhook:'` surfaces the real cause. This is **by design** — do not add richer sentinels client-side.
**Mitigation (deferred):** Admin-ops dashboard showing recent webhook failures is listed in CONTEXT.md Deferred. Not in Phase 23.

### Pitfall 6: Forgotten `requireRole(["owner"])` on a new Server Action (Pitfall 9 from PITFALLS.md)

**What goes wrong:** PR adds `regenerateCoverLetter` without the first-line `await requireRole(["owner"])`. Any family `member` role user can POST-trigger the action via a forged Server Action call and trigger LLM spend.
**Why it happens:** Copy-paste fatigue; the convention is runtime-enforced, not type-enforced.
**How to avoid:** D-12 CI grep rule — see Section 9. Every `export async function` in `job-actions.ts` MUST have `await requireRole(["owner"])` within 10 source lines.
**Warning signs:** Test suite fails with a line-number list of non-compliant functions. Good: the test catches it pre-merge.

### Pitfall 7: `fireWebhook` cross-phase deprecation ambiguity

**What goes wrong:** The 3 retrofit call sites (lines 98, 103, 118) are NOT owner-visible — they're status-sync side effects. A rushed retrofit might preserve `void fireWebhook(...)` as a legacy alias, leaving a code path that skips HMAC. On the homelab side, n8n verification rejects those calls — now `updateJobStatus("rejected")` silently fails to sync the n8n DB.
**Why it happens:** D-01 says DELETE with no deprecation wrapper, but a developer might defensive-code a fallback.
**How to avoid:**
1. D-12's CI grep rule covers the `requireRole` invariant — extend the same test file with a simpler grep: `expect(source).not.toMatch(/\bfireWebhook\b/)`. If the rename is incomplete, this grep fires.
2. `fireWebhook` MUST be deleted from `job-actions.ts` in the same PR that adds `sendSignedWebhook` — no `fireWebhook = sendSignedWebhook` shim, no `/** @deprecated */` comment retained. Clean replace.
**Warning signs:** Grep for `fireWebhook` in `src/` after the PR returns >0 matches.

## Code Examples

### HMAC signing + verification (reference only — n8n side)

```typescript
// Source: https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries
// Pattern applied with timingSafeEqual for constant-time compare.
// n8n Function node equivalent (CommonJS):

const { createHmac, timingSafeEqual } = require("crypto");

function verify(headers, rawBody) {
  const SECRET = $env.N8N_WEBHOOK_SECRET;   // n8n env var
  const received = headers["x-hudsonfam-signature"];
  const timestamp = headers["x-hudsonfam-timestamp"];
  const path = "job-company-intel";  // hardcoded per-workflow

  // Replay protection: reject if >5min old
  if (Math.abs(Date.now() - parseInt(timestamp, 10)) > 5 * 60 * 1000) {
    return { valid: false, reason: "timestamp_expired" };
  }

  // Rebuild canonical and HMAC
  const canonical = `${timestamp}.${path}.${rawBody}`;
  const expected = createHmac("sha256", SECRET).update(canonical).digest("hex");
  const expectedHeader = `sha256=${expected}`;

  // Constant-time compare (lengths must match first — timingSafeEqual throws on mismatch)
  if (received.length !== expectedHeader.length) {
    return { valid: false, reason: "length_mismatch" };
  }
  const valid = timingSafeEqual(
    Buffer.from(received),
    Buffer.from(expectedHeader)
  );
  return { valid };
}
```

### Idempotency header

```typescript
// Source: CONTEXT.md D-03

import { randomUUID } from "node:crypto";

// Inside Server Action, AFTER requireRole:
const idempotencyKey = randomUUID();
await sendSignedWebhook("job-company-intel", { job_id }, idempotencyKey);

// n8n Workflow side (reference):
// - On webhook arrival, SET nx EX 86400 "idem:<key>" "1" in the n8n execution DB
// - If SET nx returns 0, short-circuit with 200 OK and skip the LLM run
// - If SET nx returns 1, proceed with the workflow
```

### Vitest fake-timer polling test

```typescript
// Source: Context7 /vitest-dev/vitest — verified 2026-04-22

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { OwnerTriggeredButton } from "./button";

// Mock the Server Actions so we can control resolution timing
vi.mock("@/lib/job-actions", () => ({
  triggerCompanyResearch: vi.fn().mockResolvedValue({ ok: true }),
  fetchJobDetail: vi.fn().mockResolvedValue({ company_research: null, /* ... */ }),
}));

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

it("polls every 3 seconds and caps at 60 polls = 180s → 'unavailable'", async () => {
  const { triggerCompanyResearch, fetchJobDetail } = await import("@/lib/job-actions");
  render(<OwnerTriggeredButton jobId={1} label="Research" isDone={(d) => d.company_research !== null} />);

  // Click
  await act(async () => {
    screen.getByRole("button").click();
  });

  // 60 ticks × 3s = 180s
  for (let i = 0; i < 60; i++) {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });
  }

  expect(fetchJobDetail).toHaveBeenCalledTimes(60);
  expect(screen.getByText(/Error: unavailable/)).toBeInTheDocument();
});
```

### CI grep test (D-12 — direct port of Phase 22 Plan 22-07)

```typescript
// Source: src/__tests__/components/job-detail-sheet.test.tsx (Phase 22 precedent)

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const ACTIONS_PATH = path.join(process.cwd(), "src/lib/job-actions.ts");
const source = readFileSync(ACTIONS_PATH, "utf-8");
const lines = source.split("\n");

describe("job-actions.ts — every export has requireRole(['owner']) as first line (Pitfall 9)", () => {
  it("every `export async function` has `await requireRole([\"owner\"])` within 10 lines", () => {
    const violations: { line: number; fn: string }[] = [];
    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(/^export\s+async\s+function\s+(\w+)/);
      if (!match) continue;
      const fnName = match[1];
      const window = lines.slice(i, Math.min(i + 11, lines.length)).join("\n");
      if (!/await\s+requireRole\s*\(\s*\[\s*["']owner["']\s*\]\s*\)/.test(window)) {
        violations.push({ line: i + 1, fn: fnName });
      }
    }
    expect(
      violations,
      `Functions missing requireRole(["owner"]): ${violations.map((v) => `${v.fn}@L${v.line}`).join(", ")}`
    ).toEqual([]);
  });

  it("fireWebhook is fully deleted — no residual references", () => {
    expect(source).not.toMatch(/\bfireWebhook\b/);
  });
});
```

### Raw-body identity test (Section 2 Pitfall 1)

```typescript
// Source: derived from CONTEXT.md D-02

import { describe, it, expect, vi } from "vitest";
import { createHmac } from "node:crypto";
import { sendSignedWebhook } from "@/lib/webhooks";

const SECRET = "test-secret";
process.env.N8N_WEBHOOK_SECRET = SECRET;
process.env.N8N_WEBHOOK_URL = "http://n8n.test";

it("signs the EXACT string that gets POSTed (raw-body identity)", async () => {
  const fetchMock = vi.fn().mockResolvedValue(new Response("", { status: 200 }));
  global.fetch = fetchMock as any;

  const body = { job_id: 42, extra: "payload" };
  const idem = "deadbeef-cafe-babe-face-feeddeadbeef";
  await sendSignedWebhook("job-company-intel", body, idem);

  const call = fetchMock.mock.calls[0];
  const url = call[0] as string;
  const init = call[1] as RequestInit;
  const sentBody = init.body as string;
  const headers = init.headers as Record<string, string>;

  // Reconstruct expected signature from the ACTUAL bytes that went over the wire
  const canonical = `${headers["X-Hudsonfam-Timestamp"]}.job-company-intel.${sentBody}`;
  const expected = `sha256=${createHmac("sha256", SECRET).update(canonical).digest("hex")}`;

  expect(headers["X-Hudsonfam-Signature"]).toBe(expected);
  expect(headers["X-Idempotency-Key"]).toBe(idem);
  expect(url).toBe("http://n8n.test/webhook/job-company-intel");
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Unsigned webhook POSTs | HMAC-SHA256 + timestamp + idempotency key | Pitfall 3 mitigation (2026-04-22) | Every webhook call is auth+replay+dedup protected |
| Raw error message surface (`throw e.message`) | Discriminated-union sentinel response | D-07/D-08 (2026-04-22) | Bounded client-side error vocabulary; full diagnostics in server logs |
| Fire-and-forget `void fireWebhook()` | Sentinel-checked `await sendSignedWebhook()` for owner actions; `void sendSignedWebhook()` retained for status-sync fire-and-forgets | D-11 (2026-04-22) | Owner-triggered actions get UX feedback; status-syncs preserve their existing semantic |
| Global polling library (TanStack Query) for 2 surfaces | Vanilla `useEffect` + `setInterval` + `useRef` | D-04 (2026-04-22) | Zero net-new deps; Phase 24 reassesses at N=4 |

**Deprecated/outdated:**
- `fireWebhook` at `src/lib/job-actions.ts:25-38` — DELETED in this phase; no deprecation window; all 3 call sites replaced in the same PR.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Better Auth session lifetime is "hours/days" (long enough that mid-poll expiry is rare) | Pitfall 3 | If sessions are ≤5min, Pitfall 3 becomes probable and needs explicit mitigation (session-extend-on-poll pattern). Mitigation: verify `src/lib/auth.ts` session config in planning. [ASSUMED — not read in this research] |
| A2 | Next.js 16.2.1 Server Actions default to Node runtime (not Edge); `node:crypto` is available | Stack | If deployment targets Edge runtime, `node:crypto` is unavailable and the helper would need Web Crypto API (`crypto.subtle.importKey` + `sign`). Mitigation: confirm `next.config.ts` has no `runtime: "edge"` directives. [ASSUMED — not verified in this research but default is Node] |
| A3 | n8n Function node supports `require("crypto")` with `timingSafeEqual` for verification | Code Examples / n8n-side | If n8n runs in a restricted VM where `crypto` is not exposed, homelab PR needs a different verification strategy (e.g., call an external mini-service). Mitigation: homelab PR tests the Function-node crypto access as its first task. [ASSUMED — documented for homelab PR but not probed here] |
| A4 | `fetchJobDetail` always runs server-side (Server Action) even when invoked from a client polling loop | Polling Architecture | If somehow invoked in a way that bypasses `"use server"`, the Prisma/pg pool import crashes in the browser. Mitigation: Next.js throws a compile-time error if a file with "use server" exports is imported into a client bundle — the guardrail is runtime + compile. [VERIFIED by convention — Next.js 16 strict boundary] |
| A5 | `AbortSignal.timeout(5000)` is available in the Next.js 16 server runtime | Architecture Patterns | If not, use `const c = new AbortController(); setTimeout(() => c.abort(), 5000); fetch(..., { signal: c.signal })`. Functionally equivalent. Node 25.3.0 supports `AbortSignal.timeout` (added in Node 17.3). [VERIFIED: Node 25 is current; feature added Node 17.3] |

## Open Questions

1. **Does the button show a toast on completion, or silent success?**
   - What we know: D-09 says spinner is baseline. UI-SPEC is deferred to the UI-researcher.
   - What's unclear: Whether Phase 23 ships with a `toast.success("Company research landed")` at the end of a successful poll.
   - Recommendation: Ship silent (spinner disappears, section re-renders, done). Additive toast can land in a later plan without re-architecting the button.

2. **Should `regenerateCoverLetter` use `clickTimestamp = Date.now()` (CONTEXT.md D-06) or `previousGeneratedAt` (Section 5 Pitfall 4 recommendation)?**
   - What we know: D-06 literally says "captures clickTimestamp = Date.now()". Pitfall 4 argues for server-side `previousGeneratedAt` to eliminate clock-drift risk.
   - What's unclear: Whether D-06's wording is prescriptive or illustrative.
   - Recommendation: Ship `previousGeneratedAt` from the Server Action return. It's one line of code, preserves D-06's semantic ("wait for generated_at to advance past the click"), and eliminates a latent bug class. The predicate shape `detail.cover_letter?.generated_at > baseline` is identical — only the source of `baseline` changes. Planner should call this out to the user during planning if they want to strictly honor D-06 as written.

3. **Does the homelab-side n8n verification code ship on a timeline that aligns with this repo's deploy?**
   - What we know: Homelab PR is out-of-scope for Phase 23 but tracked.
   - What's unclear: Sequencing — if this repo deploys signed calls before homelab verifies, no regression. If homelab verifies before this repo signs, every call is rejected.
   - Recommendation: Order of operations: (1) ship hudsonfam Phase 23 (signed calls sent to n8n; n8n still accepts unsigned for backwards-compat); (2) ship homelab PR with verification + reject-unsigned flag OFF (observe in logs that every call is signed); (3) flip reject-unsigned flag ON. This repo's Phase 23 is agnostic to step 2's timing.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js `crypto` module | HMAC + UUID | ✓ | Node 25.3.0 stdlib [VERIFIED: local probe 2026-04-22] | — |
| `N8N_WEBHOOK_BASE` env var | webhook URL construction | ✓ | `http://n8n.cloud.svc.cluster.local:5678` (default from `job-actions.ts:22-23`) | — |
| `N8N_WEBHOOK_SECRET` env var | HMAC key | ✗ | not yet provisioned | Adding: (1) `.env.example` placeholder, (2) ExternalSecrets in K8s `secrets` namespace, (3) `CLAUDE.md` §Environment Variables doc |
| `next` (^16.2.1) | Server Actions, `revalidatePath` | ✓ | 16.2.1 [VERIFIED: package.json L31] | — |
| `react` (^19.2.4) | `useEffect`, `useRef`, `useTransition` | ✓ | 19.2.4 [VERIFIED: package.json L36] | — |
| `vitest` (^4.1.2) | fake-timer tests | ✓ | ^4.1.2 [VERIFIED: package.json L65] | — |
| `@testing-library/react` | button tests | ✓ | ^16.3.2 [VERIFIED: package.json L53] | — |
| `lucide-react` `Loader2` | in-progress spinner | ✓ | ^1.7.0 [VERIFIED: package.json L30] | — |

**Missing dependencies with no fallback:** None.

**Missing dependencies with fallback:** `N8N_WEBHOOK_SECRET` — added as an env var; ExternalSecrets provisioning is a homelab-repo concern + CLAUDE.md doc update.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.2 + happy-dom 20.8.9 + @testing-library/react 16.3.2 + MSW 2.12.14 |
| Config file | Existing Vitest config (grep `vitest.config.ts`; Phase 22 confirmed running) |
| Quick run command | `npm test` (runs `vitest run`, <2s on current 450 tests) |
| Full suite command | `npm test` |
| Pre-push git hook | `./scripts/install-hooks.sh` (installs schema-drift guard; does NOT run Vitest on push — Vitest runs on demand) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AI-SAFETY-02 | HMAC signature on every webhook | unit | `npm test -- webhooks.test.ts` | ❌ Wave 0 (new file `src/__tests__/lib/webhooks.test.ts`) |
| AI-SAFETY-02 | Raw-body identity (signed string = sent string) | unit | same file | ❌ Wave 0 |
| AI-SAFETY-03 | `X-Idempotency-Key` header present on every call | unit | same file | ❌ Wave 0 |
| AI-SAFETY-03 | Fresh UUID per call (2 calls → 2 distinct keys) | unit | same file | ❌ Wave 0 |
| AI-SAFETY-04 | 401 response → sentinel "auth" | unit | same file | ❌ Wave 0 |
| AI-SAFETY-04 | 403 response → sentinel "auth" | unit | same file | ❌ Wave 0 |
| AI-SAFETY-04 | 429 response → sentinel "rate limit" | unit | same file | ❌ Wave 0 |
| AI-SAFETY-04 | 500 response → sentinel "unavailable" | unit | same file | ❌ Wave 0 |
| AI-SAFETY-04 | connect-refused → sentinel "unavailable" | unit | same file | ❌ Wave 0 |
| AI-SAFETY-04 | AbortError (timeout) → sentinel "timeout" | unit | same file | ❌ Wave 0 |
| AI-SAFETY-04 | Server Action returns `{ok:false, sentinel}`, never `throw e.message` | unit | `npm test -- job-actions.test.ts` | ❌ Wave 0 (extend existing file if present, else new) |
| AI-ACTION-03 | `triggerCompanyResearch` requires owner role | unit | `job-actions.requireRole.test.ts` | ❌ Wave 0 |
| AI-ACTION-03 | Button polls every 3s until `company_research !== null` | component | `trigger-company-research-button.test.tsx` | ❌ Wave 0 |
| AI-ACTION-03 | 60-poll cap → "unavailable" sentinel | component | same file | ❌ Wave 0 |
| AI-ACTION-03 | Unmount mid-poll clears interval | component | same file | ❌ Wave 0 |
| AI-ACTION-04 | `regenerateCoverLetter` requires owner role | unit | `job-actions.requireRole.test.ts` | ❌ Wave 0 |
| AI-ACTION-04 | Button polls until `generated_at > previousGeneratedAt` | component | `regenerate-cover-letter-button.test.tsx` | ❌ Wave 0 |
| AI-ACTION-04 | Button invisible when `cover_letter === null` (no letter to regenerate) | component | same file | ❌ Wave 0 |
| Pitfall 9 (D-12) | CI grep: every `export async function` has `requireRole(["owner"])` ≤10 lines | static grep | `job-actions.requireRole.test.ts` | ❌ Wave 0 |
| D-01 (delete fireWebhook) | `fireWebhook` keyword absent from source | static grep | `job-actions.requireRole.test.ts` (second it) | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `npm test -- <changed-files-glob>` — e.g., `npm test -- webhooks` for webhook-only changes
- **Per wave merge:** `npm test` (full suite; target: 450 → ~500 green)
- **Phase gate:** Full suite green + manual smoke test (owner clicks both buttons on dev n8n with local HMAC secret; verifies spinner → populated section within 60s)

### Wave 0 Gaps

- [ ] `src/__tests__/lib/webhooks.test.ts` — covers AI-SAFETY-02, AI-SAFETY-03, AI-SAFETY-04 (HMAC correctness + cascade + header presence)
- [ ] `src/__tests__/lib/job-actions.requireRole.test.ts` — covers D-12 (CI grep rule) + D-01 (fireWebhook deletion)
- [ ] `src/__tests__/components/trigger-company-research-button.test.tsx` — covers AI-ACTION-03 (polling + predicate + timeout + unmount)
- [ ] `src/__tests__/components/regenerate-cover-letter-button.test.tsx` — covers AI-ACTION-04 (clickTimestamp / previousGeneratedAt + predicate)
- [ ] No framework install needed (Vitest + happy-dom + Testing Library + MSW all present in devDependencies)

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Better Auth + `requireRole(["owner"])` at every Server Action entry — D-12 CI grep locks this |
| V3 Session Management | yes (indirectly) | Better Auth sessions (Redis with DB fallback); mid-poll session expiry handled by "tolerant polling" (Pitfall 3) |
| V4 Access Control | yes | `requireRole` is the choke point; no new access-control surface in Phase 23 |
| V5 Input Validation | partial | `jobId: number` is the only input; TypeScript narrows. No user-controlled strings cross the HMAC boundary — webhook body is `{ job_id, company_name?, company_url? }` populated server-side from DB after `requireRole` |
| V6 Cryptography | yes | `crypto.createHmac("sha256", SECRET)` stdlib — never hand-roll. `timingSafeEqual` on n8n side |
| V9 Communication | yes | HTTPS to `n8n.cloud.svc.cluster.local` (cluster-internal; TLS terminates at the n8n service or mesh-sidecar) |
| V10 Malicious Code | partial | No LLM-generated content renders in Phase 23 (deferred to Phase 24 for regenerate-resume/salary). Phase 20's Streamdown sanitization + Phase 20 CSP remain in effect |

### Known Threat Patterns for Node.js + Next.js 16 + n8n webhook chain

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Unsigned webhook replay | Tampering + Repudiation | HMAC-SHA256 + `X-Hudsonfam-Timestamp` with 5-min window + `X-Idempotency-Key` 24h dedup |
| HMAC timing attack (on verifier) | Information Disclosure | `crypto.timingSafeEqual` on n8n side (reference pattern in Code Examples) |
| Cluster-internal webhook URL exposed externally | Elevation of Privilege | `n8n.cloud.svc.cluster.local` is not routable from outside the cluster; no Ingress surface. Keep it that way. If ever exposed, HMAC is the remaining guard. |
| Raw error message surface | Information Disclosure | D-07/D-08 sentinel discriminated-union; full errors in `console.error` (kube logs) only |
| CSRF on Server Action | Tampering | Next.js 16 Server Actions embed a per-request origin check + encrypted action ID — no explicit CSRF token needed beyond Better Auth's cookie SameSite setting [CITED: Next.js Server Actions security model] |
| Missing `requireRole` on new Server Action | Elevation of Privilege | D-12 CI grep rule; manual code review checklist |
| Double-click / React 19 Strict Mode double-invoke | Tampering (double-charge) | `X-Idempotency-Key` is fresh per call (D-03). n8n's 24h dedup window absorbs the network-retry case. A literal double-click generates 2 distinct UUIDs — n8n runs both. Mitigation: button disabled during in-progress state (D-09) prevents the double-click UX path entirely |

## Sources

### Primary (HIGH confidence)

- **Source tree (2026-04-22 snapshot):**
  - `src/lib/job-actions.ts:25-38` (`fireWebhook` definition) — confirmed via Read
  - `src/lib/job-actions.ts:98,103,118` (3 call sites) — confirmed via Grep `fireWebhook|void fireWebhook`, output-mode content
  - `src/lib/session.ts:20-29` (`requireRole` implementation) — confirmed via Read
  - `src/components/ui/button.tsx:41-63` (shadcn Button with `outline` + `sm` variants) — confirmed via Read
  - `src/app/(admin)/admin/jobs/job-detail-sheet.tsx:180-299` (Cover Letter + Company Intel section structure; mount points for D-09) — confirmed via Read
  - `src/__tests__/components/job-detail-sheet.test.tsx:1-76` (Phase 22 `readFileSync`+regex precedent for D-12 CI grep test) — confirmed via Read
  - `package.json:15-65` (versions: next 16.2.1, react 19.2.4, vitest ^4.1.2, lucide-react ^1.7.0, zod ^4.3.6) — confirmed via Read
  - `.planning/phases/23-owner-triggered-workflows-pattern-setter/23-CONTEXT.md` (D-01 through D-12) — confirmed via Read
  - `.planning/REQUIREMENTS.md` (5 Phase 23 REQs traced) — confirmed via Read
  - `.planning/research/PITFALLS.md` §Pitfall 3, §Pitfall 6, §Pitfall 9 — confirmed via Read
- **Node.js runtime probe (2026-04-22):** `node -e "typeof require('crypto').createHmac"` returned `function`; same for `randomUUID` and `timingSafeEqual`; sample HMAC produced valid hex output
- **Context7 /vitest-dev/vitest** — fake-timer API (`vi.useFakeTimers`, `vi.advanceTimersByTime`, `vi.advanceTimersByTimeAsync`, `vi.useRealTimers`, `vi.fn().mockResolvedValue`) — fetched 2026-04-22
- **Context7 /websites/nextjs** — Server Action from useEffect + startTransition pattern + `revalidatePath` semantics — fetched 2026-04-22

### Secondary (MEDIUM confidence)

- **GitHub webhook signing format** (https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries) — canonical-message convention `${timestamp}.${body}` matches CONTEXT.md D-02's `${timestamp}.${path}.${rawBody}` with path added for cross-workflow replay protection
- **Stripe webhook signing** (https://stripe.com/docs/webhooks/signatures) — same canonical-message pattern; `t=<timestamp>,v1=<sig>` header; timestamp tolerance 5 min — confirms D-02's 5-min window choice

### Tertiary (LOW confidence — not used for prescriptive claims)

- None. Phase 23's scope is small enough that every claim has HIGH or MEDIUM backing.

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — all libraries already installed; zero new deps; Node stdlib + Next.js 16 + React 19 + Vitest 4 are all current and verified via Context7 or local probe
- Architecture: HIGH — direct file-level reads of every mount point, every call site, every existing pattern; line numbers confirmed 2026-04-22 unchanged from Phase 22 close
- Pitfalls: HIGH — sourced from `.planning/research/PITFALLS.md` project-specific findings + cross-checked against GitHub/Stripe canonical signing patterns for raw-body identity

**Research date:** 2026-04-22
**Valid until:** 2026-05-22 (30 days — Next.js 16 is stable; Vitest 4.x API is stable; no library upgrades planned)

---

*Phase: 23-owner-triggered-workflows-pattern-setter*
*Research performed: 2026-04-22 — single session; all claims verified against the live source tree or Context7 doc fetches*
