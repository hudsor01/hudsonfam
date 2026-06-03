---
phase: 36
slug: quality-gate
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-03
---

# Phase 36 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Derived from 36-RESEARCH.md §"Validation Architecture". This is the v5.0 closeout gate.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest + happy-dom + Testing Library |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npm test` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | tests ~30s · build ~60s · lint ~15s |

---

## Sampling Rate

- **After every task commit:** `npm test` (and the relevant gate command for that task — `npm run lint` / `npm run build`)
- **After every plan wave:** `npm test && npm run lint && npm run build`
- **Before `/gsd:verify-work`:** all four gates green + per-page console sweep + 375px human check
- **Max feedback latency:** ~30s (test) / ~60s (build)

---

## Per-Task Verification Map

| Requirement | Behavior | Test Type | Automated Command | Status |
|-------------|----------|-----------|-------------------|--------|
| QUAL-01 | `npm run build` exits 0, zero references to removed features | smoke | `npm run build` | ✅ green (confirm) |
| QUAL-02 | full suite passes (≥232), removed-feature tests gone | unit/integration | `npm test` | ✅ green (confirm) |
| QUAL-03 (lint) | `npm run lint` → 0 warnings, 0 errors | lint | `npm run lint` | ❌ 1 warning (fix needed) |
| QUAL-03 (grep) | dead identifiers absent from src/ | grep audit | `grep -rnE "BlogPost\|FamilyUpdate\|lib/blog\|/blog\|/family\|PostStatus" src/` → 0 | ✅ clean |
| QUAL-03 (guard) | grep-guard test prevents re-introduction | unit | `npm test` | ❌ W0 (test does not exist) |
| QUAL-04 (console) | each of 8 pages loads with zero console errors | browser smoke (automated) | Claude-in-Chrome `read_console_messages` on local dev | pending |
| QUAL-04 (375px) | each of 8 pages usable at 375px | visual UAT (manual) | DevTools responsive | manual-only |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/__tests__/prod-readiness.test.ts` — add `describe('v5.0 Prune Guard')` block asserting zero `BlogPost|FamilyUpdate|/blog|/family|lib/blog|PostStatus` matches in `src/` (covers QUAL-03 re-introduction guard; reuses the existing file-read/grep pattern in that test file).

*All other infra in place: 232-test suite, lint config, build pipeline, browser-automation path are operational.*

---

## The 8 surviving public pages (QUAL-04 sweep)

`/` (Home) · `/recipes` · `/recipes/[slug]` (recipe detail) · `/photos` · `/photos/[album]` (album detail) · `/events` · `/richard-hudson-sr` (In Memory) · `/my-menu`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Each of the 8 pages is usable at 375px (no overflow/clipping, drawer reachable) | QUAL-04 | Automation cannot render a true 375px viewport (known Chrome-automation quirk) | DevTools responsive mode at 375px → visit each of the 8 pages |

*(Console-error sweep per page IS automatable via Claude-in-Chrome `read_console_messages` on local dev — the orchestrator drives it.)*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers the grep-guard test
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
