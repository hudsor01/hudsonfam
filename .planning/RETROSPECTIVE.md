# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v5.0 — Site Consolidation & Navigation Redesign

**Shipped:** 2026-06-03
**Phases:** 5 (32-36) | **Plans:** 11 | **Sessions:** 1 (long)

### What Was Built
- Pruned Blog + Family Updates end-to-end (routes, MDX, `BlogPost`/`FamilyUpdate` models + DROP-TABLE migration, dashboard CRUD, redirects) + a permanent prune-guard regression test.
- Recipes-first homepage (Hero + cmdk search + featured cards + live Photos/Events).
- Fixed the broken R2 photo pipeline — two root-cause bugs (album-less auth-gate via D-01 data fix; `R2_ENDPOINT` bucket-suffix normalization in `getR2Client`).
- Rebuilt navbar/footer to the surviving IA (Home · Recipes · Photos · Events · In Memory) with active-route, `aria-current`, shared `isNavActive` helper, and an accessible mobile drawer.
- Clean quality gate: lint 0, 233 tests, build 1036 pages exit 0, 8-page console sweep.

### What Worked
- The per-phase **research → plan → plan-check → execute → code-review → fix → verify** loop caught a real defect in *every* phase: R2 endpoint prefix-collision (34), nav active-route prefix-sibling bug (35), prune-guard assertion defect that silently dropped its failure message (36). The code-review-then-fix gate paid for itself each time.
- Console-error sweep via Claude-in-Chrome with **capture verification first** (inject a known `console.error`, confirm it's caught) before trusting "0 errors."
- Programmatic round-trip verification (processImage → R2 → GetObject) proved the photo fix without a dashboard login.

### What Was Inefficient
- **Reported phases "done/verified" against local dev while production sat 111 commits behind for the entire milestone.** The user caught a stale navbar on the live site and (correctly) said the milestone wasn't done. "Passes locally" was conflated with "shipped." Nothing was ever live until a single 111-commit push at the very end.
- Repeatedly fought the browser-automation 375px viewport limit (renders ~2056px regardless of resize) — should have recognized it immediately and routed 375px to human-UAT from the first UI phase instead of rediscovering it in 35 and 36.
- Worktree isolation broke live-DB/R2 verification scripts (`.env.local` is gitignored → absent in worktrees); had to switch to sequential-on-main mid-execution.

### Patterns Established
- Prune-guard regression test: pure Node `fs` (not `grep` subprocess — exit-code-2 masquerades as pass), boundary-match path identifiers, **exclude `src/__tests__/`** (negative assertions self-match).
- Active-route detection: client leaf with `usePathname()` + shared `isNavActive(pathname, href)` (exact-root, `===` or `startsWith(href + "/")` to avoid prefix-sibling false positives), wrapped in `<Suspense>` under `cacheComponents`.
- Defensive env-var guard at the boundary (`getR2Client` normalizes `R2_ENDPOINT`) so an operator typo can't reintroduce the bug.

### Key Lessons
1. **"Verified" must mean the surface the user sees.** Local/branch verification is not production verification — say which one explicitly, and ship to production incrementally rather than batching an entire milestone into one unverified push at the end.
2. **Know tool limits up front.** Browser automation can't force a true 375px viewport; worktrees lack gitignored env files. Pick execution mode and verification strategy accordingly, before starting.
3. **The per-phase code-review→fix gate is worth its cost** — it surfaced a genuine bug in every single phase, including in the quality-gate phase's own new test.

### Cost Observations
- Model mix: Opus (orchestration + planning), Sonnet (researchers, executors, plan-checkers, code reviewers/fixers, verifiers). No Haiku.
- Sessions: 1 long session covering plan + execute for phases 34-36, then milestone close.
- Notable: code-review + fix subagents added cost but caught real defects every phase — net positive.

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Sessions | Phases | Key Change |
|-----------|----------|--------|------------|
| v4.0 | — | 3 (29-31) | Cloud re-platform; GSD milestone tooling |
| v5.0 | 1 | 5 (32-36) | Per-phase code-review→fix gate; live-prod verification gap surfaced |

### Cumulative Quality

| Milestone | Tests | Build | Zero-Dep Additions |
|-----------|-------|-------|-------------------|
| v4.0 | 245 | green | aged-pinned only |
| v5.0 | 233 | 1036 pages, exit 0 | 0 new packages |

*(v5.0 test count is lower than v4.0 because pruning Blog/Family removed their test suites.)*

### Top Lessons (Verified Across Milestones)

1. Verify against the surface that matters (production), not just local — and ship incrementally.
2. Aged-pin dependencies; zero new packages unless forced (Aikido min-age policy).
3. A code-review-then-fix gate per phase catches defects automated tests miss.
