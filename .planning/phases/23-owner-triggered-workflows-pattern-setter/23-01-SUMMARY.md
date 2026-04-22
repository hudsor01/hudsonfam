---
phase: 23
plan: 01
subsystem: lib/webhooks
tags: [webhooks, hmac, sentinel-cascade, security, server-primitive, pattern-setter, wave-1]
requires: []
provides:
  - sendSignedWebhook: "Server-only async primitive — HMAC-SHA256 sign + X-Idempotency-Key header + 4-sentinel error cascade; returns WebhookResult discriminated union, never throws"
  - ErrorSentinel: "Bounded union type — 'timeout' | 'auth' | 'rate limit' | 'unavailable' — the only failure-mode strings callers ever see (D-08 no-raw-leak enforcement)"
  - WebhookResult: "{ ok: true } | { ok: false, sentinel: ErrorSentinel } discriminated union; caller pattern-matches for render routing"
affects: []
tech-stack:
  added: []
  patterns:
    - "HMAC-SHA256 canonical signing over `${timestamp}.${path}.${rawBody}` — literal Stripe/GitHub/Slack convention (D-02). rawBody computed ONCE via JSON.stringify and used identity-equal for both createHmac().update() and fetch({ body }) — locks Pitfall 1 (signature-mismatch from silent re-serialization)"
    - "Discriminated-union return instead of throw — modeled on src/lib/attach-freshness.ts (silent-fail with logging) and src/lib/jobs-schemas.ts parseOrLog. Every failure path routes through a single sentinel() helper that console.error's the full error + path + status server-side and returns the bounded sentinel to the caller"
    - "Env var read at call time (not module scope) — process.env.N8N_WEBHOOK_SECRET / N8N_WEBHOOK_URL read inside the function body so Vitest can mutate them per-test without re-importing. Also lets a missing SECRET degrade to 'unavailable' instead of throwing at module load (T-23-01-06)"
    - "AbortSignal.timeout(5000) caps per-call elapsed time — maps AbortError/TimeoutError → 'timeout' sentinel, preventing runaway outbound holds regardless of n8n state (T-23-01-04 DoS mitigation)"
    - "it.each truth table for 6 HTTP-status → sentinel cases — same pattern as src/__tests__/lib/provenance.test.ts, keeps cascade coverage dense without boilerplate"
key-files:
  created:
    - src/lib/webhooks.ts
    - src/__tests__/lib/webhooks.test.ts
  modified: []
decisions:
  - "Canonical HMAC message is `${timestamp}.${path}.${rawBody}` (D-02) — literal Stripe/GitHub/Slack convention. Any verifier (homelab n8n) reconstructs with identical ordering"
  - "Raw body is serialized ONCE via JSON.stringify(body) and the SAME string is passed to createHmac().update() AND fetch({ body }) — Pitfall 1 (identity-equal raw-body invariant) asserted by `signs the EXACT string that gets POSTed` test; reconstructed canonical must match sent signature"
  - "Zero throw statements in sendSignedWebhook — every code path (missing secret, HTTP failure, AbortError, generic Error) returns a WebhookResult. No try/catch burden on callers. `grep throw src/lib/webhooks.ts` → 0 matches"
  - "Full error + stack + status logged via console.error server-side; only the 4 bounded sentinel strings cross the return boundary (D-08). Test asserts JSON.stringify(res) does NOT match /internal-host/, /10\\\\.0\\\\.5\\\\.2/, or /SECRET/ — cluster IPs and secret-prefixed messages are unreachable from callers"
  - "Sentinel cascade order (D-07): 401/403 → auth (checked before generic !r.ok) → 429 → rate limit (checked before generic !r.ok) → any remaining !r.ok → unavailable; catch block splits AbortError/TimeoutError → timeout from everything else → unavailable"
  - "N8N_WEBHOOK_SECRET guard returns { ok: false, sentinel: 'unavailable' } instead of throwing at module load — keeps Vitest importable without env wiring, degrades gracefully in dev, and lets the UI show the same transient-failure copy whether n8n is down or the secret is missing (owner-visible indistinguishability is acceptable per D-07)"
  - "N8N_WEBHOOK_URL defaults to 'http://n8n.cloud.svc.cluster.local:5678' (homelab cluster-internal DNS) when unset — override via env in test (tests set it to 'http://n8n.test') and in local dev"
  - "AbortSignal.timeout(5000) caps every call at 5s — maps both AbortError and TimeoutError names to 'timeout' sentinel (error.name varies by Node version, so both are handled)"
metrics:
  duration: "2m 9s"
  completed: "2026-04-22"
---

# Phase 23 Plan 01: sendSignedWebhook Primitive (HMAC + Idempotency + Sentinel Cascade) Summary

**One-liner:** Server-only `sendSignedWebhook` primitive — HMAC-SHA256 sign over `${timestamp}.${path}.${rawBody}` (D-02), X-Idempotency-Key header injection (D-03), 4-sentinel error cascade (D-07) returning a discriminated-union `WebhookResult` that never leaks raw error text (D-08). Three safety REQs closed at the helper boundary; pattern set for Plans 23-02/03/05/06 to consume.

## What Shipped

1. **`src/lib/webhooks.ts`** (new, 100 LoC) — pure server-side, zero DB access, zero new deps. Exports:
   - `sendSignedWebhook(path, body, idempotencyKey): Promise<WebhookResult>` — POSTs to `${N8N_WEBHOOK_URL}/webhook/${path}` with three injected headers (`X-Hudsonfam-Signature: sha256=<hex>`, `X-Hudsonfam-Timestamp: <ms>`, `X-Idempotency-Key: <uuid>`), 5s AbortSignal cap, and D-07 cascade mapping every failure to one of 4 sentinel strings.
   - `ErrorSentinel` — `"timeout" | "auth" | "rate limit" | "unavailable"` — the only failure-mode strings callers ever observe.
   - `WebhookResult` — `{ ok: true } | { ok: false; sentinel: ErrorSentinel }` discriminated union; callers pattern-match and drop into render branches.
   - Private `sentinel(kind, err, path, status?)` helper — every failure path routes through this single point that `console.error`'s the full diagnostics (error object, status code, path) server-side and returns `{ ok: false, sentinel: kind }` to the caller. This is the architectural gate that makes D-08 "no-raw-leak" enforceable by construction.

2. **`src/__tests__/lib/webhooks.test.ts`** (new, 201 LoC) — 12 `it` blocks expanding to 17 test cases across 3 describe groups:

   **HMAC correctness (AI-SAFETY-02, Pitfall 1)** — 5 cases:
   - `signs the EXACT string that gets POSTed (raw-body identity)` — captures fetch mock, extracts `init.body` + timestamp header, reconstructs canonical `${ts}.${path}.${sentBody}`, verifies signature header equals `sha256=${createHmac("sha256", SECRET).update(canonical).digest("hex")}`. If the implementation re-serialized body inside fetch (the Pitfall 1 trap), this test fails because the reconstructed canonical would not match the signed canonical.
   - `URL construction uses WEBHOOK_BASE + /webhook/ + path` — asserts `fetch` URL is `http://n8n.test/webhook/job-regenerate-resume`.
   - `X-Idempotency-Key is the exact caller-supplied value across distinct calls` — two calls with different UUIDs send different header values; no reuse, no stale closure capture.
   - `sets Content-Type: application/json`.
   - `returns { ok: true } on 2xx`.

   **Error cascade (AI-SAFETY-04, D-07)** — 9 cases:
   - `it.each` truth table: `401 → auth`, `403 → auth`, `429 → rate limit`, `500 → unavailable`, `502 → unavailable`, `503 → unavailable`. Every case also asserts `errorSpy` was called.
   - `AbortError → timeout` — `error.name === "AbortError"`.
   - `TimeoutError → timeout` — `error.name === "TimeoutError"` (Node version variance guard).
   - `generic network Error → unavailable` — `ECONNREFUSED`.

   **No raw-error leak (AI-SAFETY-04, D-08)** — 3 cases:
   - `raw error never leaks to return value` — rejects fetch with `new Error("SECRET: internal-host-10.0.5.2 refused")`; asserts `res === { ok: false, sentinel: "unavailable" }` AND `JSON.stringify(res)` does NOT match `/internal-host/` NOR `/10\.0\.5\.2/` NOR `/SECRET/`. If the implementation ever accidentally serialized `e.message` into the return value, this test fires.
   - `console.error logs the full error + path on failure` — `errorSpy.mock.calls[0]` stringified contains `job-company-intel` path. Ensures server-side diagnostics are preserved even though callers only see the sentinel.
   - `missing N8N_WEBHOOK_SECRET returns { ok: false, sentinel: 'unavailable' } without throwing` — T-23-01-06 graceful degrade; `delete process.env.N8N_WEBHOOK_SECRET` then call; must not throw, must return the bounded sentinel.

## Truth-Table Lock

| HTTP status / error | Sentinel returned | Cascade branch |
|---|---|---|
| 200–299 | (no sentinel; `{ ok: true }`) | success |
| 401, 403 | `"auth"` | status check branch 1 |
| 429 | `"rate limit"` | status check branch 2 |
| 400, 404, 5xx | `"unavailable"` | generic !r.ok fallthrough |
| `AbortError` | `"timeout"` | catch block, name check |
| `TimeoutError` | `"timeout"` | catch block, name check |
| any other Error | `"unavailable"` | catch block default |
| missing `N8N_WEBHOOK_SECRET` | `"unavailable"` | pre-fetch guard |

Every row has a dedicated test case (17 total when `it.each` expands).

## Threat Model — All Mitigations Landed

| Threat ID | Mitigation in code | Test that locks it |
|---|---|---|
| T-23-01-01 Tampering | HMAC-SHA256 over canonical; rawBody serialized ONCE and reused identity-equal | `signs the EXACT string that gets POSTed` |
| T-23-01-02 Replay | X-Hudsonfam-Timestamp + X-Idempotency-Key injected on every call | `X-Idempotency-Key is the exact caller-supplied value across distinct calls` (header presence + per-call freshness) |
| T-23-01-03 Information Disclosure (return boundary) | D-07 bounded 4-sentinel union; console.error retains full diagnostics server-side only | `raw error never leaks to return value` (asserts JSON.stringify does NOT match internal-host/IP/SECRET) |
| T-23-01-04 DoS (runaway fetch) | `AbortSignal.timeout(5000)` — 5s hard cap | `AbortError → timeout` + `TimeoutError → timeout` |
| T-23-01-05 Spoofing (idempotency key) | accepted: caller provides UUID, trusted because `requireRole(["owner"])` already ran upstream | n/a (accepted residual risk, documented in threat_model) |
| T-23-01-06 Missing secret at call time | pre-fetch guard returns `unavailable` sentinel instead of throwing | `missing N8N_WEBHOOK_SECRET returns { ok:false, sentinel:'unavailable' } without throwing` |

## Requirements Closed

- **AI-SAFETY-02** (HMAC-SHA256 signing with raw-body identity) — closed at helper boundary. Callers in Plans 23-02/03/05/06 inherit the signing by using the primitive. Server-side verification in n8n (homelab repo) is the paired counterpart and tracked separately.
- **AI-SAFETY-03** (X-Idempotency-Key on every outbound request) — closed at helper boundary. Callers pass a fresh `crypto.randomUUID()` per click; the helper contract forbids empty or reused keys at the type level (it's a required positional arg).
- **AI-SAFETY-04** (bounded error sentinel set, no raw-error leak) — closed at helper boundary. The `ErrorSentinel` type literally cannot admit any string outside the 4-value union; the no-raw-leak test asserts JSON.stringify unreachability for cluster IPs and secret-prefixed messages.

## Deviations from Plan

None — plan executed exactly as written.

Two non-substantive test additions beyond the plan's "13+ cases" floor: `URL construction uses WEBHOOK_BASE + /webhook/ + path` (URL shape lock — the plan mentioned asserting this but didn't carve out its own `it`, so it lived inside the raw-body-identity test; split for clarity) and `sets Content-Type: application/json` (header presence lock — defensive, because JSON.stringify body without Content-Type would be a client-side ambiguity smell). Total: 17 test cases, well above the ≥13 floor.

## Commits

- `e002dbf` — `feat(23-01): sendSignedWebhook primitive + HMAC + sentinel cascade (AI-SAFETY-02/-03/-04)` — both files staged together as the plan's single atomic commit.

## Self-Check: PASSED

- `src/lib/webhooks.ts` — FOUND (100 lines)
- `src/__tests__/lib/webhooks.test.ts` — FOUND (201 lines)
- Commit `e002dbf` — FOUND in git log
- `npm test -- --run src/__tests__/lib/webhooks.test.ts` — 17 passed / 0 failed
- `npm test` full suite — 463 passed / 0 failed (zero regressions; +17 new)
- `npm run build` — exits 0 (TypeScript compiles, Next.js bundle produced)
- Exports: `sendSignedWebhook`, `ErrorSentinel`, `WebhookResult` — all present
- `grep "throw " src/lib/webhooks.ts` — 0 matches (no throw statements)
- `grep "X-Hudsonfam-Signature|X-Hudsonfam-Timestamp|X-Idempotency-Key|AbortSignal.timeout|createHmac" src/lib/webhooks.ts` — all present (1+ match each)
- Single atomic commit with subject `feat(23-01):` ✓
