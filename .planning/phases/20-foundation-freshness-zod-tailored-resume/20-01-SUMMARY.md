---
phase: 20-foundation-freshness-zod-tailored-resume
plan: 01
subsystem: infra
tags:
  - dependencies
  - tailwind-v4
  - streamdown
  - npm
  - ai-rendering

# Dependency graph
requires:
  - phase: planning
    provides: 20-RESEARCH.md §Q7 single-asterisk @source incantation and §Q2 React 19 compatibility verification
provides:
  - streamdown@^2.5.0 as a resolvable runtime dep (ESM-only, direct-import ready for RSC/client components)
  - Tailwind v4 @source directive that scans streamdown/dist/*.js so prose utilities appear in the final CSS layer
  - @testing-library/dom@^10.4.1 as an explicit devDep (previously transitively supplied; now pinned so future --legacy-peer-deps installs don't prune it)
affects:
  - 20-02 (isStale util) — independent but blocked by same foundation commit; unblocked
  - 20-04 (FreshnessBadge + ErrorBoundary) — can import Streamdown (not yet used here)
  - 20-05 (TailoredResumeSection) — first actual <Streamdown> consumer
  - 20-06 (job-detail-sheet integration) — renders TailoredResumeSection
  - Phase 21 (markdown-heavy render components) — all downstream markdown rendering relies on these prose utilities existing

# Tech tracking
tech-stack:
  added:
    - streamdown@2.5.0 (Vercel-authored ESM markdown renderer, peer-safe with React 19.2.4)
    - "@testing-library/dom@10.4.1 (explicit peer of @testing-library/react to survive --legacy-peer-deps)"
  patterns:
    - "Tailwind v4 @source directive for third-party node_modules content scanning (single-asterisk glob, verified against Vercel's official streamdown docs)"
    - "Runtime-dep installation strategy: --legacy-peer-deps required due to pre-existing @tanstack/zod-form-adapter ^0.42.1 (zod@^3 peer) vs zod@^4.3.6 project version; document explicit peers to avoid silent pruning"

key-files:
  created: []
  modified:
    - package.json (add streamdown runtime dep, add @testing-library/dom devDep)
    - package-lock.json (resolved lockfile for streamdown 2.5.0 + 16 transitive deps, restored @testing-library/dom subtree)
    - src/styles/globals.css (1 new line at line 3 — the @source directive)

key-decisions:
  - "Use --legacy-peer-deps for all future installs until the zod@^3 vs zod@^4 conflict with @tanstack/zod-form-adapter is resolved (upgrade path TBD in a later phase)"
  - "Use single-asterisk @source glob `dist/*.js` (matches Vercel's official docs and streamdown's actual dist layout) — reject CONTEXT.md D-14's double-asterisk typo"
  - "Do NOT import streamdown/styles.css — only needed when `animated` prop is used; this project renders static markdown"
  - "streamdown is a runtime dependency, not devDependency — it ships with the production bundle"

patterns-established:
  - "Tailwind v4 @source directive for third-party package content scanning — placed between @import lines and @custom-variant so it runs before theme tokens, single-asterisk glob, relative path from globals.css location"
  - "Explicitly declare indirect peer deps (like @testing-library/dom) as devDependencies to make --legacy-peer-deps installs idempotent and prevent silent pruning"

requirements-completed:
  - AI-RENDER-01

# Metrics
duration: 3m 10s
completed: 2026-04-21
---

# Phase 20 Plan 01: Foundation Dependency Wiring Summary

**streamdown@^2.5.0 installed as runtime dep with Tailwind v4 @source directive scanning its dist — prose utilities now reach the compiled CSS layer, unblocking every downstream markdown-render plan.**

## Performance

- **Duration:** 3m 10s
- **Started:** 2026-04-21T18:01:02Z
- **Completed:** 2026-04-21T18:04:12Z
- **Tasks:** 2 (plus 1 Rule 3 auto-fix)
- **Files modified:** 3 (package.json, package-lock.json, src/styles/globals.css)

## Accomplishments

- streamdown@2.5.0 resolvable via ESM import (`import { Streamdown } from "streamdown"` works — 26 named exports verified)
- Tailwind v4 `@source "../../node_modules/streamdown/dist/*.js"` directive live in globals.css line 3
- `npm run build` compiles successfully in 3.0s — no Tailwind parse error, no module-not-found
- `npm run test` holds 268 passing tests (baseline match — no regressions)
- Pre-existing test infra peer dep (@testing-library/dom) restored after --legacy-peer-deps pruning, now pinned as devDep

## Task Commits

Each task was committed atomically:

1. **Task 1: Install streamdown@^2.5.0** — `efdfe2a` (chore)
2. **Task 2: Add @source directive to globals.css** — `a2d0bdf` (feat)
3. **Auto-fix: Restore @testing-library/dom peer dep** — `9ab8c38` (fix, Rule 3 deviation)

## Files Created/Modified

- `package.json` — added `streamdown: ^2.5.0` to dependencies; added `@testing-library/dom: ^10.4.1` to devDependencies
- `package-lock.json` — regenerated with streamdown 2.5.0 + 16 transitive deps (rehype-raw, rehype-sanitize, rehype-harden, marked@17, remark-gfm@4, mermaid@11, et al.), plus restored @testing-library/dom subtree
- `src/styles/globals.css` — 1 new line at position 3 (`@source "../../node_modules/streamdown/dist/*.js";`) between the two `@import` lines and `@custom-variant dark (&:is(.dark *));`

## Decisions Made

- **--legacy-peer-deps is now the house install mode.** Pre-existing conflict: `@tanstack/zod-form-adapter@^0.42.1` peer-requires `zod@^3.x`, project runs `zod@^4.3.6`. Without the flag, the install fails with ERESOLVE. This is independent of streamdown and predates this plan. All future npm installs in this repo must use `--legacy-peer-deps` until the zod-form-adapter conflict is resolved (candidate: migrate to @tanstack/react-form's native zod validator APIs in a later plan, dropping zod-form-adapter entirely).
- **Single-asterisk glob in @source.** RESEARCH.md §Q7 was verified against Vercel's official `/vercel/streamdown` Context7 docs — the authoritative form is `dist/*.js`. CONTEXT.md D-14's double-asterisk (`dist/**/*.js`) is a drafting typo and would over-scan nested transitive chunks. Used single-asterisk per RESEARCH.md.
- **No `streamdown/styles.css` import.** RESEARCH.md §Q2 verifies that stylesheet is only required when the `animated` prop is in use. This project renders static markdown, so we rely entirely on Tailwind's prose utilities (already available via @tailwindcss/postcss).
- **streamdown in dependencies, not devDependencies.** It is a render component that ships to the client, same treatment as react-markdown would have had.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Install required --legacy-peer-deps flag**

- **Found during:** Task 1 (Install streamdown)
- **Issue:** `npm install streamdown@^2.5.0` failed with ERESOLVE. Root cause was not streamdown — it was a pre-existing conflict: `@tanstack/zod-form-adapter@^0.42.1` declares a `zod@^3.x` peer, but the project runs `zod@^4.3.6`. The project's existing `node_modules/` had already been built under `--legacy-peer-deps`, so prior installs "worked" by bypassing the resolver.
- **Fix:** Re-ran `npm install streamdown@^2.5.0 --legacy-peer-deps`. Resulted in "added 163 packages, removed 47 packages, changed 487 packages" — the resolver regenerated the tree.
- **Files modified:** package.json, package-lock.json (both already in Task 1 scope — no additional files touched)
- **Verification:** `node --input-type=module -e "import('streamdown').then(...)"` succeeds, dist/index.js exists, npm run build compiles.
- **Committed in:** efdfe2a (Task 1 commit, with rationale in commit body)

**2. [Rule 3 - Blocking] Restore @testing-library/dom peer dep pruned by --legacy-peer-deps install**

- **Found during:** Post-Task-2 verification (`npm run test`)
- **Issue:** The Task 1 install with `--legacy-peer-deps` pruned 47 packages, one of which was `@testing-library/dom`. `@testing-library/react@16.3.2` declares `@testing-library/dom@^10.0.0` as a **peer dependency**, not a direct dep — so nothing in `package.json` kept it installed. Result: `src/__tests__/components/ui.test.tsx` threw `Cannot find module '@testing-library/dom'` and 1 of 12 test files failed to import. This is directly caused by this plan's install (Task 1), so within scope.
- **Fix:** `npm install --save-dev @testing-library/dom@^10.4.1 --legacy-peer-deps`. Now pinned as an explicit devDep so future `--legacy-peer-deps` runs cannot prune it.
- **Files modified:** package.json, package-lock.json
- **Verification:** `npm run test` → **Test Files 12 passed (12), Tests 268 passed (268)**. Matches the PROJECT.md baseline exactly.
- **Committed in:** 9ab8c38 (separate `fix(20-01)` commit after Task 2, with full rationale)

---

**Total deviations:** 2 auto-fixed (both Rule 3 — blocking-issue fixes caused directly by this plan's dependency install).
**Impact on plan:** Neither deviation expanded scope. Both were necessary to (a) complete Task 1 install and (b) maintain the project's 268-test baseline. The `@testing-library/dom` pin is a small durability improvement — future installs can't accidentally remove it again.

## Issues Encountered

- **`node -e "require('streamdown')"` fails with ERR_PACKAGE_PATH_NOT_EXPORTED.** This is NOT a bug — streamdown is ESM-only (`"type": "module"`, `"exports": { ".": { "import": "./dist/index.js" } }`). The plan's acceptance criterion used `require()` (CJS), which can never succeed against an ESM-only package. Verified equivalent success with ESM dynamic import: `node --input-type=module -e "import('streamdown').then(m => console.log(Object.keys(m)))"` → logs 26 named exports (Streamdown, Block, CodeBlock, etc.). The module is correctly consumable from Next.js client/server components (both use ESM internally). Treated as a plan-text accuracy issue, not a blocker.

- **Pre-existing uncommitted work in tree at executor start** (.planning/STATE.md, job-detail-sheet.tsx, job-actions.ts, jobs-db.ts). Stashed before Plan 20-01 work began, re-applied after plan commits landed. Nothing in this plan touches those files, so no conflict. These pre-existing changes are unrelated to Plan 20-01 and are preserved for whoever owns them.

## User Setup Required

None — no external service configuration, no new env vars, no dashboard changes. Pure code/build-time wiring.

## Next Phase Readiness

- **Plans 02, 04, 05, 06 unblocked.** Any downstream plan can now `import { Streamdown } from "streamdown"` (ESM) and rely on Tailwind's prose utilities scanning streamdown's rendered output.
- **CSS scan coverage verified for the current streamdown dist layout.** If streamdown@>=3.x ever reorganizes dist into subdirectories, the `@source` glob may need to change to `dist/**/*.js` — but today's single-asterisk form is authoritative and correct.
- **Known tech-debt tracked in Decisions:** the zod-form-adapter conflict is a papercut that forces --legacy-peer-deps on every install. Should be resolved in a future plan by migrating off @tanstack/zod-form-adapter, but that work is strictly out of scope for v3.0 Phase 20.

## Self-Check: PASSED

- [x] `package.json` contains `"streamdown": "^2.5.0"` in dependencies — verified
- [x] `node_modules/streamdown/dist/index.js` exists — verified
- [x] streamdown ESM-importable — verified (26 exports)
- [x] `src/styles/globals.css` line 3 is exactly `@source "../../node_modules/streamdown/dist/*.js";` — verified
- [x] Exactly one `@source` directive in globals.css — verified (count = 1)
- [x] No double-asterisk glob present — verified (count = 0)
- [x] `npm run build` compiles successfully — verified (3.0s, "✓ Compiled successfully")
- [x] `npm run test` → 268 passing — verified (matches baseline)
- [x] Commit efdfe2a (Task 1) present in git log — verified
- [x] Commit a2d0bdf (Task 2) present in git log — verified
- [x] Commit 9ab8c38 (Rule 3 auto-fix) present in git log — verified

---
*Phase: 20-foundation-freshness-zod-tailored-resume*
*Completed: 2026-04-21*
