---
phase: 20-foundation-freshness-zod-tailored-resume
plan: 07
subsystem: security
tags:
  - csp
  - middleware
  - nextjs-16
  - nonce
  - xss-defense
  - admin-only

# Dependency graph
requires: []
provides:
  - "Per-request CSP nonce generator at repo root (middleware.ts)"
  - "Content-Security-Policy header on /admin/* (default-src 'self', object-src 'none', frame-ancestors 'none', base-uri 'self', script-src 'self' 'nonce-{n}' 'strict-dynamic')"
  - "Nonce plumbing: x-nonce on request headers, consumed by (admin)/layout.tsx for any future <Script> tag"
  - "Dev-mode 'unsafe-eval' fallback for Turbopack HMR"
  - "AI-SAFETY-05 requirement closed"
affects:
  - "All /admin/* routes (jobs dashboard, homelab dashboard, future admin surfaces)"
  - "Plan 20-05 Streamdown skipHtml gets defense-in-depth layer (if sanitizer slips, CSP blocks script execution)"
  - "Future phases (21-24) inherit the CSP posture — any new /admin route is CSP-scoped by default"
  - "No impact on public site, (auth), or (dashboard) route groups"

# Tech tracking
tech-stack:
  added: []  # zero new deps — middleware is standard Next.js 16 feature
  patterns:
    - "middleware.ts convention (NOT proxy.ts as Next.js 16 docs claim) — empirically required by Next.js 16.2.1"
    - "Per-request nonce = Buffer.from(crypto.randomUUID()).toString('base64') — cryptographically random, per-request unique"
    - "Dual-write CSP header: request.headers (for Server Components via next/headers) + response.headers (for browser enforcement)"
    - "matcher: ['/admin/:path*'] — scope security headers to admin surface only; public site unaffected"
    - "Dev-mode 'unsafe-eval' branch gated by NODE_ENV === 'development' — production stays strict"

key-files:
  created:
    - "middleware.ts (77 lines) at repo root — CSP + per-request nonce for /admin/*"
  modified:
    - "src/app/(admin)/layout.tsx — added `await headers()` + x-nonce read (latent, retrofit-ready for future <Script>)"

key-decisions:
  - "File must be middleware.ts, NOT proxy.ts — Next.js 16 docs claim proxy convention but 16.2.1's middleware-manifest empirically only recognizes middleware.ts. Verified with probe log + curl in production mode. Deviation documented below."
  - "Function export named `middleware`, NOT `proxy` — paired with filename constraint above"
  - "Turbopack dev mode (next dev --turbo) does NOT invoke middleware despite correct compilation — upstream Turbopack limitation, NOT our code. Production (next-server) works correctly. Verified via `npm run build && npm start` + curl."
  - "CSP set on BOTH request headers (for Server Components reading via `headers()`) AND response headers (for browser enforcement). Setting only one is a silent miss."
  - "matcher scoped strictly to ['/admin/:path*'] per CONTEXT.md D-05 — blog MDX and public surfaces may rely on inline patterns CSP would break, and admin is the only surface rendering LLM output"
  - "Dev-mode 'unsafe-eval' branch gated by NODE_ENV === 'development' — required for Turbopack HMR eval()-based module loading; production excludes it for strict enforcement"
  - "'strict-dynamic' in script-src — required so Next.js's _next/static/chunks webpack runtime (loaded by nonce-allowed script) works without per-chunk nonce plumbing"
  - "Real CSP from day one per CONTEXT.md D-06, NOT Report-Only — tailored resume (Plan 20-05) is the first markdown-rendered surface, so block now, iterate later"

patterns-established:
  - "Next.js 16.2.1 middleware naming: middleware.ts + `export function middleware` (reverts Next.js 16 docs' claimed proxy convention — empirically blocked in 16.2.1)"
  - "CSP defense-in-depth stack for admin LLM surfaces: (1) Streamdown skipHtml strips raw HTML (Plan 20-05), (2) rehype-harden filters javascript: URIs, (3) CSP blocks any script execution that somehow reaches the DOM"
  - "Nonce-aware server layout pattern — `const nonce = (await headers()).get('x-nonce'); void nonce;` — keeps the plumbing visible + retrofit-ready without dead-code lint warnings"

requirements-completed:
  - AI-SAFETY-05

# Metrics
duration: ~30m
completed: 2026-04-21
---

# Phase 20 Plan 07: CSP Middleware Summary

**Admin routes now serve a per-request nonce'd Content-Security-Policy blocking inline scripts, object embeds, clickjacking, and base-tag injection — verified via curl in production mode, with Next.js 16 `proxy.ts` convention overridden to `middleware.ts` because 16.2.1 doesn't recognize the new naming.**

## Performance

- **Duration:** ~30m (plan execution + checkpoint debugging of proxy.ts → middleware.ts rename)
- **Started:** 2026-04-21T18:54:00Z
- **Completed:** 2026-04-21T19:07:00Z
- **Tasks:** 3 (2 auto + 1 checkpoint)
- **Files created:** 1 (middleware.ts)
- **Files modified:** 1 (src/app/(admin)/layout.tsx)

## Accomplishments

- Delivered AI-SAFETY-05 — every response from /admin/* now carries a `Content-Security-Policy` header with `default-src 'self'`, `object-src 'none'`, `frame-ancestors 'none'`, `base-uri 'self'`, plus a per-request nonce on script-src with `'strict-dynamic'`.
- Closed the CSP scope correctly — public site (`/`, blog MDX, photo pages) stays unaffected; only `/admin/:path*` is hardened. Verified by curl-grep on both routes.
- Wired nonce plumbing into `(admin)/layout.tsx` — latent for Phase 20 (no `<Script>` tags on admin yet), retrofit-ready so future plans can consume `<Script nonce={nonce}>` without middleware changes.
- Established the full CSP defense-in-depth stack for admin LLM surfaces: Streamdown `skipHtml` (Plan 20-05) → rehype-harden URI filter → per-request CSP nonce (this plan). Three independent layers.
- Documented the Next.js 16.2.1 quirk — file must be `middleware.ts`, not the docs-claimed `proxy.ts` — so Phase 20+ plans don't rediscover the same gotcha.

## Task Commits

1. **Task 1: Create proxy.ts with per-request nonce + CSP scoped to /admin/*** — `f91707f` (feat)
2. **Task 2: Wire nonce consumption into (admin)/layout.tsx** — `dfa95a3` (feat)
3. **Checkpoint fix: rename proxy.ts → middleware.ts for Next.js 16.2.1 compat** — `97a60c5` (fix)

Task 1 was executed per the plan's literal text (proxy.ts + `export function proxy`). Task 3 corrected the Next.js 16 convention assumption empirically — the plan's `proxy.ts` convention (sourced from Context7 /vercel/next.js docs) does not fire in 16.2.1's middleware-manifest. Rename resolved it; production serving now sets the CSP header correctly.

**Plan metadata:** next commit — SUMMARY.md + STATE.md + ROADMAP.md + REQUIREMENTS.md

## Files Created/Modified

- `middleware.ts` (77 lines, repo root) — `export function middleware(request: NextRequest)`; generates base64 nonce from `crypto.randomUUID()`; builds CSP string with env-gated `'unsafe-eval'` branch; dual-writes header to request + response; `config.matcher: ['/admin/:path*']`
- `src/app/(admin)/layout.tsx` — added `import { headers } from 'next/headers'` and `const nonce = (await headers()).get('x-nonce'); void nonce;` inside existing async layout; zero changes to rendered JSX or `requireRole(["owner"])` gate

## Decisions Made

- **File named `middleware.ts`, not `proxy.ts` (deviation from plan's literal instructions).** Plan specified `proxy.ts` + `export function proxy` based on Next.js 16 docs retrieved via Context7 (/vercel/next.js "Generate Nonce and Apply CSP Header with Proxy"). Empirical testing in Next.js 16.2.1 showed the proxy convention is not yet active in this minor version — the middleware-manifest stayed empty and no CSP header landed on any route. Renaming to the traditional `middleware.ts` + `export function middleware` worked on the first attempt. The proxy convention may be active in 16.3+; this file includes a comment noting the renaming rationale for future upgrade awareness.
- **Turbopack dev mode limitation documented, not worked around.** `npm run dev` (Turbopack) compiles middleware.ts successfully but does not invoke the function on any request — an upstream Turbopack dev-server quirk, NOT our code. Production (`next build && next start`) works correctly. Verified: prod mode curl on `/admin/jobs` returns the CSP header with per-request random nonce; dev mode does not. This affects local dev testing only — production deployment is unaffected because the K3s container runs `next start`, not turbopack dev.
- **CSP set on both request and response headers.** Setting only the response enforces in the browser but Server Components can't read the nonce via `next/headers`. Setting only the request leaves the browser unenforced. The official Next.js pattern is to dual-write; we followed it.
- **'unsafe-eval' gated on NODE_ENV === 'development', not removed entirely.** Turbopack HMR uses eval()-based module hot-update; a production-strict CSP in dev mode breaks HMR. Gating by env keeps dev fast and production locked down.
- **Verification via `[csp-probe]` console.log during debugging.** Added a temporary probe log inside the middleware function during the proxy→middleware debug loop to confirm which file was actually being invoked by Next.js. Removed before the final commit (not present in the shipped 77-line file).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug in plan assumption] Next.js 16.2.1 does not recognize proxy.ts convention**

- **Found during:** Task 3 (human-verify checkpoint — curl on /admin/jobs returned no CSP header)
- **Issue:** Plan (sourced from Next.js 16 docs via Context7) specified the file must be `proxy.ts` at repo root with `export function proxy(...)`. Empirically, Next.js 16.2.1's build output contained an empty middleware-manifest.json and the handler never fired — neither dev nor production mode served any CSP header. This contradicts the docs but is the observed behavior of the installed version.
- **Fix:** Renamed `proxy.ts` → `middleware.ts` and `export function proxy` → `export function middleware`. File structure, CSP shape, nonce generation, and matcher were unchanged. Production mode then served the CSP header correctly on the first attempt.
- **Files modified:** `proxy.ts` → `middleware.ts` (git rename); function export name updated; file header comment updated to document the rationale
- **Verification:** `curl -sI http://localhost:3002/admin/jobs | grep -i content-security-policy` → returns full header with per-request base64 nonce; `curl -sI http://localhost:3002/ | grep -i content-security-policy` → returns nothing (matcher correctly excludes public routes)
- **Committed in:** 97a60c5 (fix commit separate from the Task 1 feat commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 — bug in plan's framework-version assumption; proxy convention not yet active in installed Next.js 16.2.1 despite what docs claim for Next.js 16)
**Impact on plan:** Zero scope change. CSP shape, nonce mechanism, matcher, and security posture are all exactly as planned — only the filename and export function name changed. All plan acceptance criteria met under the renamed file.

## Issues Encountered

### Known Issue: Turbopack dev mode does not invoke middleware

- **Surface:** `npm run dev` (which uses Turbopack) — middleware.ts compiles cleanly but the handler is never invoked on any request. No CSP header served in dev mode.
- **Root cause:** Upstream Turbopack dev-server limitation in Next.js 16.2.1. The middleware-manifest IS populated in dev build output, but the dev request handler doesn't consult it. Production next-server does consult it correctly.
- **Impact:** Local-dev testing of CSP requires building + starting production mode (`npm run build && PORT=3002 npm start`), not `npm run dev`. Deployment to K3s is unaffected because the container runs production mode.
- **Workaround:** Document the verification pattern in this summary. Production is the source of truth for CSP enforcement testing. If Phase 21+ need CSP-aware inline scripts tested in local dev, wait for Next.js 16.3 or switch from Turbopack to Webpack dev.
- **Do NOT:** Attempt to "fix" this in our middleware — there is nothing in our code to fix. Verification command below proves the middleware itself is correct.

### Verification Matrix

```bash
# Production mode (verified working)
$ npm run build && PORT=3002 npm start &
$ curl -sI http://localhost:3002/admin/jobs | grep -i content-security-policy
content-security-policy: default-src 'self'; script-src 'self' 'nonce-MGFhMzQ5YzktYzg3My00YWEyLWE3N2QtNGZmYjczOWQyNWNi' 'strict-dynamic'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'

# Second request — confirm nonce rotates
$ curl -sI http://localhost:3002/admin/jobs | grep -i content-security-policy | grep -oE "nonce-[A-Za-z0-9+/=]+"
nonce-Y2RmMzI0MjQtMGJkYy00MWNmLTk0ZjctMjRhNGU3NTY3MDBh  # different base64 per request ✓

# Matcher scope — public route excluded
$ curl -sI http://localhost:3002/ | grep -i content-security-policy
# (no output — correctly absent)
```

## Self-Check: PASSED

- [x] `middleware.ts` at repo root — FOUND
- [x] `proxy.ts` at repo root — CORRECTLY ABSENT (was renamed)
- [x] `grep -c 'export function middleware' middleware.ts` → 1
- [x] `grep -c 'export const config' middleware.ts` → 1
- [x] `grep -c "/admin/:path\*" middleware.ts` → 1
- [x] `grep -c "object-src 'none'" middleware.ts` → 1
- [x] `grep -c "frame-ancestors 'none'" middleware.ts` → 1
- [x] `grep -c "base-uri 'self'" middleware.ts` → 1
- [x] `grep -c "'strict-dynamic'" middleware.ts` → 1
- [x] `grep -c 'crypto.randomUUID' middleware.ts` → 1
- [x] `grep -c "'unsafe-eval'" middleware.ts` → 1 (dev-mode fallback)
- [x] `grep -c 'x-nonce' middleware.ts` → 1
- [x] `grep -c 'Content-Security-Policy' middleware.ts` → 3 (doc comment + request + response)
- [x] `src/app/(admin)/layout.tsx` contains `from "next/headers"` — FOUND
- [x] `src/app/(admin)/layout.tsx` contains `x-nonce` — FOUND
- [x] Commit `f91707f` — FOUND in `git log`
- [x] Commit `dfa95a3` — FOUND in `git log`
- [x] Commit `97a60c5` — FOUND in `git log`
- [x] Production-mode curl on /admin/jobs returns CSP header — VERIFIED
- [x] Production-mode curl on / does NOT return CSP — VERIFIED
- [x] Per-request nonce rotates (different base64 on consecutive requests) — VERIFIED

## User Setup Required

None — no environment variables, no secrets, no cluster config. The middleware runs in Next.js's Edge runtime and uses only `crypto.randomUUID()` (WebCrypto) + `process.env.NODE_ENV` (standard framework variable).

## Next Phase Readiness

Phase 20 is now 7/8 plans complete (this is 20-07). Only 20-06 remains — the last wave's job-detail-sheet.tsx wiring work (attach freshness in `fetchJobDetail` + mount the TailoredResumeSection + SectionErrorBoundary into the sheet).

CSP is now the final layer of a three-layer defense for the tailored-resume render surface that Plan 20-06 will mount:
1. Streamdown `skipHtml` strips raw HTML at render-time (Plan 20-05)
2. rehype-harden filters `javascript:` URIs at the markdown parser
3. CSP blocks any script execution that somehow reaches the DOM (this plan)

Phase 21-24 inherit the CSP posture automatically — any new admin route is matcher-scoped from day one. If a future plan needs inline `<Script>` tags on admin pages, the nonce is already read from `headers()` in `(admin)/layout.tsx` — just pass it through as `<Script nonce={nonce}>`.

No blocker for moving to Plan 20-06. Phase 20 → Phase 21 handoff (once 20-06 lands) has full security hardening in place.

---
*Phase: 20-foundation-freshness-zod-tailored-resume*
*Completed: 2026-04-21*
