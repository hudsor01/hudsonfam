---
id: SEED-007
status: dormant
planted: 2026-04-25
planted_during: Phase 28 v3.5-P4 (BUG-1 surfaced and remediated mid-UAT)
trigger_when: any future Cloudflare zone-level optimization is enabled or modified, OR a future synthetic-monitoring milestone scopes external uptime/regression checks, OR a Next.js major version bump (RSC streaming protocol changes between Next 16 and any future major), OR a hudsonfam hydration regression appears that doesn't reproduce locally
scope: Small (1 synthetic check; ~30-60 minutes to wire into existing monitoring infra; no app code changes)
---

# SEED-007: Cloudflare Rocket Loader incompatibility — add synthetic regression check

## Why This Matters

On 2026-04-25, mid-UAT for Phase 28, the entire `https://thehudsonfam.com` site was visibly broken: skeleton renders shipped from the server but the page never hydrated; client JS never executed; the admin/jobs sheet (and every interactive component on the site) was inert. Initial assumption was a deploy regression in Phase 26/27 — but local builds were clean and the same image had been running since 2026-04-24 at the time symptoms surfaced.

Root cause (diagnosed by browser-side investigation): **Cloudflare Rocket Loader was enabled on the `thehudsonfam.com` zone** at some point. Rocket Loader is a Cloudflare optimization that:

- Rewrites every `<script>` tag's `type` attribute to `text/rocketscript`
- Wraps script execution in a Cloudflare-controlled async loader
- Returns a CDN-served `rocket-loader.min.js` shim from the edge

This is fundamentally incompatible with **Next.js 16 App Router streaming + RSC bootstrap**. Next.js relies on:

- Inline `<script>` tags executing in document order (the RSC payload chunks bootstrap React in `window.__next_f`)
- Specific `type="application/json"` script tags that Rocket Loader was rewriting
- The `/_next/static/chunks/*` entrypoints loading without proxying through a CDN-side loader shim

Rocket Loader was returning **HTTP 503** from some Cloudflare PoPs (transient global edge issue compounding the breakage), but even on PoPs returning 200, the rewritten MIME types broke RSC bootstrap. Symptoms:

- Browser network panel showed all `_next/static/chunks/*.js` requests succeeding (200)
- `window.__next_f` was undefined (the RSC payload chunks never mounted)
- `document.querySelector('script[type="text/rocketscript"]')` returned a non-zero count (Cloudflare-rewritten tags)
- Page displayed the SSR skeleton verbatim with no client-side interactivity

**Owner remediation (2026-04-25):** disabled Rocket Loader via Cloudflare dashboard. Verified via post-fix browser inspection:

- `document.querySelector('script[type="text/rocketscript"]').length === 0` ✓
- `typeof window.__next_f === "object"` (Array) ✓
- All interactive components (admin/jobs sheets, nav, etc.) hydrated correctly ✓

## What Surfaced This

Discovered during Phase 28 prep (BUG-1) — owner attempted UAT preparation on 2026-04-25 and observed the site appeared frozen at the skeleton state. Browser-side diagnosis surfaced the Rocket Loader rewrite. Fix was zone-level config flip on the Cloudflare side (no app code change). Phase 28 SUMMARY captures this as a deviation/finding from the UAT process.

The class of bug is recurring and silent: **any future zone-level Cloudflare setting flip (Rocket Loader, Auto Minify JS, Polish on JS routes, Mirage, etc.) could re-introduce the same break without any hudsonfam-side commit**. The fix is to detect this externally via a synthetic check that asserts the production site is hydrating correctly.

## Synthetic check spec

A periodic external check (Cloudflare Workers cron, Pingdom, n8n cron, or a homemade scheduled curl-from-pod) that:

1. Fetches `https://thehudsonfam.com/admin/jobs` (or another hydration-critical route — homepage `/` works too since both rely on RSC bootstrap)
2. Loads the page in a real headless browser (Playwright / Puppeteer / Chrome-in-MCP-style automation)
3. After page load + 5 seconds, asserts:
   - `typeof window.__next_f !== "undefined"` (RSC bootstrap array exists)
   - `Array.isArray(window.__next_f) && window.__next_f.length > 0` (RSC payload chunks mounted)
   - `document.querySelectorAll('script[type="text/rocketscript"]').length === 0` (no Cloudflare rewriter active)
   - `document.title.includes('The Hudson Family')` (HTML rendered, not just a CF error page)
4. On failure, page the owner via the existing alert-pipeline (per `reference_homelab_alert_pipeline.md` memory: ntfy primary)

## Why this is a separate seed (not in v3.5 scope)

v3.5 is the CI/CD hardening milestone — focused on the build-and-deploy pipeline (GitHub Actions → GHCR → Flux → K3s). This bug is an **edge / CDN concern** orthogonal to the CI/CD chain — the build was correct, the deploy was correct, the pod was running the correct image. The break was at Cloudflare's edge layer between K3s and the user's browser.

A complete synthetic-monitoring effort would also cover other classes of regression (TLS expiration, Cloudflare Tunnel down, K3s pod OOM, etc.) — better scoped as its own milestone (v4.0+ external monitoring). Phase 28 surfaced only this specific class via incident; SEED-007 captures the lesson without scope-creeping v3.5 close-out.

## Out of Scope for This Seed

- Migrating away from Cloudflare Tunnel (the Tunnel is fine; Rocket Loader is a *separate* zone-level optimization, opt-in)
- Adding broader synthetic-monitoring infrastructure (TLS, DNS, CT log checks) — that's a v4.0+ milestone
- Disabling other Cloudflare optimizations preemptively (Auto Minify, Polish, Mirage all have similar incompatibility risk classes; the synthetic check above is the canary, not a list of fights to pick proactively)
- Changing how hudsonfam loads JS (Next.js 16 RSC bootstrap pattern is the canonical Next.js pattern; the bug is on Cloudflare's side, not hudsonfam's)

## Companion artifacts

- `.planning/phases/28-smoke-retroactive-uat/28-CONTEXT.md` — Phase 28 boundary + decisions
- `.planning/phases/28-smoke-retroactive-uat/28-01-SUMMARY.md` (created post-UAT) — captures BUG-1 as a deviation/finding
- Cloudflare dashboard for the `thehudsonfam.com` zone — Settings → Speed → Optimization → "Rocket Loader" should remain OFF (verify periodically; CF sometimes auto-enables performance features on plan upgrades)
- Memory: `reference_homelab_alert_pipeline.md` — alert routing for the synthetic check's failure path

## Trigger handoff

When the owner decides to plant this seed:

1. Pick a synthetic-monitoring runner — Cloudflare Workers cron is a reasonable fit (free tier; 1-min granularity; runs at the same edge as the zone being checked but uses a dedicated browser-runner). Alternatives: a small bun/node cron job in K3s firing Playwright assertions; n8n workflow with HTTP Request + browser parsing.
2. Implement the 4-assertion synthetic check above. Hit `/admin/jobs` (auth gate — handle the 302 redirect by checking `/login` reachability instead, OR use `/` which is public). The simplest assertion is `/` + the 4 hydration-marker checks since that's a public route.
3. Run every 5 minutes during business hours, every 15 minutes overnight (or whatever cadence the owner chooses).
4. Failure → ntfy primary alert (per `reference_homelab_alert_pipeline.md` Layer 1).
5. Document the check + alert wiring in `homelab` repo + this file's "Closed" retrospective.

Estimated total effort: ~30-60 minutes once a runner is chosen. Most of the work is the runner choice + alert wiring; the actual assertion code is ~10 lines.

When closed: commit `docs(seed-007): synthetic regression check live` referencing the runner + cadence + alert path. Update this file's status to `closed` and add a "Closed" section with the implementation summary.
