# Phase 36: Quality Gate — Research

**Researched:** 2026-06-03
**Domain:** QA / build verification / lint / dead-code sweep / per-page UAT
**Confidence:** HIGH

---

## Summary

Phase 36 is a pure closeout gate for v5.0. Four requirements, three of which are already green (QUAL-01 build exit 0, QUAL-02 all 232 tests pass, QUAL-03 dead-code grep zero-match). The only active work item is the single ESLint warning in `data-table.tsx` that blocks QUAL-03's zero-warning gate, plus the per-page sweep (QUAL-04) and an optional grep-guard test.

The lint warning is `react-hooks/incompatible-library` emitted by `eslint-plugin-react-hooks@7.0.1` (ships with Next.js 16 / `eslint-config-next@16.2.6`) when it encounters `useReactTable()` from TanStack Table inside a component the React Compiler is analyzing. TanStack Table is mandated by CLAUDE.md — the component must stay. The fix is a targeted inline suppression on line 45 of `data-table.tsx`.

The per-page sweep covers 8 public pages. Console-error checks are automatable via Claude-in-Chrome on local dev. The 375px visual check is human-UAT (environment constraint: viewport cannot be programmatically forced to 375px in this shell). No new packages are installed in this phase; no dependency bumps (Aikido min-age policy).

**Primary recommendation:** Fix the lint warning with `// eslint-disable-next-line react-hooks/incompatible-library` plus an explanatory comment on line 44 of `data-table.tsx`. Add a Vitest grep-guard test to lock out dead identifiers permanently. Then execute the 8-page console sweep.

---

## Project Constraints (from CLAUDE.md)

- **TanStack Table is mandated** for all data tables — `data-table.tsx` must not be removed or replaced.
- **ESLint 9 (pinned 9.39.4)** — flat config (`eslint.config.mjs`). No upgrade.
- **No dependency bumps** (Aikido min-age supply-chain policy; `eslint-plugin-react-hooks` is a transitive dep of `eslint-config-next`, cannot be independently bumped anyway).
- **All colors via `globals.css` `@theme` tokens** — no raw Tailwind color names in `.tsx`.
- **Test framework:** Vitest + happy-dom + Testing Library. `npm test` must pass.
- **No new blog/CMS, social feed, or admin restoration** — YAGNI, out of scope.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Build verification | CI / local build | — | `npm run build` is the authoritative signal |
| Test suite | Vitest (Node) | — | Unit + integration tests, no browser needed |
| Lint / dead-code | ESLint 9 flat config + grep | — | Static analysis, no runtime |
| Per-page console errors | Browser / local dev server | — | Requires rendering in a real browser |
| 375px responsive check | Human UAT | — | env cannot force 375px viewport programmatically |

---

## Standard Stack

No new packages in this phase. All tools are already installed.

| Tool | Version | Purpose |
|------|---------|---------|
| ESLint | 9.39.4 (pinned) | Lint gate |
| eslint-plugin-react-hooks | 7.0.1 (transitive via eslint-config-next) | `incompatible-library` rule source |
| eslint-config-next | 16.2.6 | Flat config base |
| Vitest | (current) | Grep-guard test + existing suite |

### Installation
None. This phase installs zero packages.

---

## Package Legitimacy Audit

N/A — no new packages installed in this phase.

---

## Architecture Patterns

### Surviving Public IA (8 pages for QUAL-04)

```
/ (Home)
/recipes                 — static listing (MDX file-based, no DB)
/recipes/[slug]          — recipe detail (MDX, static)
/photos                  — album listing (Prisma: Album)
/photos/[album]          — album detail (Prisma: Album + Photo)
/events                  — events listing (Prisma: Event)
/richard-hudson-sr       — In Memory (Prisma: Memory + MemorialMedia + MemorialContent)
/my-menu                 — contextual, builds from localStorage (client-side, no auth)
```

### QUAL-04 Page Classification

| Page | Data Source | Dynamic? | Known Console-Noise Risks |
|------|-------------|---------|---------------------------|
| `/` | Prisma (albums, events) + MDX (featured recipes) | Yes — DB | Image loading errors if R2 keys malformed; hydration from localStorage (MenuProvider) |
| `/recipes` | MDX file-based | Static | None expected |
| `/recipes/[slug]` | MDX file-based | Static (ISR/build-time) | RecipeChecklist uses `localStorage` (SSR-safe useEffect guard is in place) |
| `/photos` | Prisma (albums) | Yes — DB | NoSuchKey redirect if seed data has orphan keys (was fixed in Phase 34) |
| `/photos/[album]` | Prisma (album + photos) | Yes — DB | Image proxy errors if R2 object missing |
| `/events` | Prisma | Yes — DB | None expected (empty-state guard is in place) |
| `/richard-hudson-sr` | Prisma (hardcoded + dynamic memory/media) | Partially | None expected |
| `/my-menu` | localStorage | Client-only | `localStorage` ExperimentalWarning in Node — NOT a browser console error; won't appear in browser DevTools |

**"Loads without console errors" definition:** Zero `console.error` or `console.warn` lines in browser DevTools during initial page load AND after hydration settles (allow 2s). React hydration mismatches count. Image 404s count. Network errors for required API calls count. The `ExperimentalWarning: localStorage` that appears in the Node/Vitest output is a Node runtime warning, not a browser console error — it does not fail QUAL-04.

---

## QUAL-03 Lint Warning Fix

### The Warning

```
src/components/dashboard/data-table.tsx
  45:17  warning  Compilation Skipped: Use of incompatible library
react-hooks/incompatible-library
```

The warning is emitted by `eslint-plugin-react-hooks@7.0.1` (ships with `eslint-config-next@16.2.6`). The React Compiler, which is enabled via Next.js 16's `cacheComponents: true` in `next.config.ts`, detects that `useReactTable()` returns functions that cannot be safely memoized. This is inherent to TanStack Table's design — the table object contains callbacks with closed-over state.

### Options Evaluated

**Option A: `eslint-disable-next-line react-hooks/incompatible-library`**

A comment on line 44, immediately before the `useReactTable` call on line 45:

```typescript
// TanStack Table's useReactTable() returns functions that React Compiler cannot safely
// memoize (by design — the table object closes over state). This is a known incompatibility
// between React Compiler and TanStack Table. CLAUDE.md mandates TanStack Table for all
// data tables; disabling the rule here is the correct local suppression.
// eslint-disable-next-line react-hooks/incompatible-library
const table = useReactTable({
```

Verified: The plugin reads `eslint-disable-next-line <rulePattern>` in `findProgramSuppressions()` at line 53031 of the plugin source. The suppression is honored before the ESLint report is emitted. [VERIFIED: eslint-plugin-react-hooks/cjs/eslint-plugin-react-hooks.development.js line 53031]

Scope: Affects only this one call site. The rule remains active everywhere else in the codebase. Purely local.

**Option B: `"use no memo"` function-level directive**

Adding `"use no memo";` as the first statement inside the `DataTable` function body.

Analysis from plugin source: when `directives.optOut != null` (which `"use no memo"` triggers via `findDirectiveDisablingMemoization`), the compile error for `IncompatibleLibrary` is routed through `logError()` (line 53487) instead of `handleError()`. `logError()` only invokes an optional custom logger and does NOT call ESLint's `context.report()`. The module-scope `hasModuleScopeOptOut` path at line 53412 also silences ESLint reports. [VERIFIED: eslint-plugin-react-hooks/cjs/eslint-plugin-react-hooks.development.js lines 53479–53490, 53151–53157]

So `"use no memo"` DOES suppress the ESLint warning. However, it also opts the entire `DataTable` component out of React Compiler optimization — meaning React Compiler will not apply any memoization to the component at all. For a data table that is already inherently un-memoizable due to TanStack Table, this is a no-op in practice, but it is a broader suppression than needed.

**Option C: Flat-config `overrides` block scoping `react-hooks/incompatible-library: off` for this file**

```javascript
// in eslint.config.mjs
{
  files: ["src/components/dashboard/data-table.tsx"],
  rules: {
    "react-hooks/incompatible-library": "off"
  }
}
```

This disables the rule for the entire file. Since `data-table.tsx` contains only the `DataTable` component (one call to `useReactTable`), the practical effect is the same as Option A. However, a file-level config block is less readable to a future engineer than an inline comment explaining why the suppression exists.

### Recommendation: Option A

`eslint-disable-next-line` with an explanatory comment is the correct choice:

1. **Most targeted** — suppresses exactly one call site.
2. **Self-documenting** — the comment explains why (CLAUDE.md mandate + TanStack Table design). Option C has no such inline explanation.
3. **Rule stays live elsewhere** — if a different file ever calls a library with the same incompatibility, the rule will catch it. Option C scopes the rule off for the whole file.
4. **No behavior change** — unlike Option B, it does not change React Compiler's behavior for the rest of the component.
5. **Precedent exists in the codebase** — `prod-readiness.test.ts` uses similar targeted suppression patterns (mock + explicit comment).

Option B is also viable but slightly over-broad; prefer Option A.

---

## QUAL-03 Grep Guard — Dead-Code Permanence

### Current State

The orchestrator scan confirms: `grep -rnE "BlogPost|FamilyUpdate|lib/blog|/blog|/family|PostStatus" src/` returns **zero matches**. [ASSUMED — not re-run during this research session, but confirmed by orchestrator scan from 2026-06-03 and consistent with Phase 32 completion records in STATE.md]

### Recommendation: Add a Vitest grep-guard test

**Pattern precedent:** `prod-readiness.test.ts` and `nav-footer.test.ts` both read source files with `fs.readFile` and assert on content. `prod-readiness.test.ts` confirms Unsplash URL format across `prisma/seed-content.ts`. The same pattern (fs + `expect(src).not.toContain`) is already established.

**Proposed test location:** Add a new `describe` block to `src/__tests__/prod-readiness.test.ts` (existing file, correct scope) OR create `src/__tests__/v5-prune-guard.test.ts`.

**Prefer adding to `prod-readiness.test.ts`:** It already reads source files via `fs.readFile` and covers "things that must be permanently absent". A new `describe('v5.0 Prune Guard', ...)` block at the bottom keeps it co-located with the same category of structural assertions.

**Implementation approach (no need for glob scan — simpler and faster):**

```typescript
describe('v5.0 Prune Guard — removed identifiers must not return to src/', () => {
  const DEAD_IDENTIFIERS = [
    'BlogPost',
    'FamilyUpdate',
    'lib/blog',
    '/blog',
    '/family',
    'PostStatus',
  ];

  // Read all .ts/.tsx files in src/ and assert zero matches
  // Use fs.readdir recursively + filter, then check each file
  it('no src/ file contains any removed v5.0 identifier', async () => {
    const { execSync } = await import('child_process');
    // grep returns exit code 1 when zero matches (no output)
    // We expect it to fail (exit 1), meaning zero matches
    const pattern = DEAD_IDENTIFIERS.join('|');
    let output = '';
    try {
      output = execSync(
        `grep -rnE "${pattern}" src/`,
        { cwd: process.cwd(), encoding: 'utf-8' }
      );
    } catch {
      // grep exit code 1 = no matches = pass
      output = '';
    }
    expect(output.trim()).toBe('');
  });
});
```

**Alternative (pure Node, no child_process):** Use `glob` or recursive `fs.readdir` with `fs.readFile` on each file. The `child_process.execSync(grep)` approach is simpler and fast — consistent with the grep audit the orchestrator already ran. Vitest runs in Node, `child_process` is available.

**Value:** Prevents accidental re-introduction of dead identifiers by a future edit, refactor, or AI-assisted change. Given that multiple phases (32–35) were needed to clean these up, a permanent regression guard is warranted.

---

## Common Pitfalls

### Pitfall 1: ESLint disable comment placement
**What goes wrong:** `eslint-disable-next-line` must be on the line immediately before the flagged line. If placed two lines above (e.g., before the comment block), the suppression does not apply and the warning persists.
**How to avoid:** Place the disable comment on line 44 (the line directly preceding line 45 where `useReactTable` is called). Keep the explanatory comment above the disable comment, not between the disable comment and the code line.

Correct order:
```
// Explanatory comment line 1
// Explanatory comment line 2
// eslint-disable-next-line react-hooks/incompatible-library
const table = useReactTable({   ← line 45, the flagged line
```

### Pitfall 2: grep-guard test exits 0 on grep error
**What goes wrong:** `execSync(grep)` throws when grep returns exit code 1 (no matches), but if the pattern is malformed, grep returns exit code 2 (error) — both get caught by the same `catch {}`. The test passes even though grep errored out.
**How to avoid:** In the catch block, re-throw if `e.status === 2`. Or use a pure-Node recursive read instead of grep subprocess.

### Pitfall 3: QUAL-04 — confusing Node ExperimentalWarning with browser console errors
**What goes wrong:** The `ExperimentalWarning: localStorage is not available because --localstorage-file was not provided` appears in `npm test` output. This is a Node runtime warning from happy-dom, not a browser console error. It does not represent a bug in any page.
**How to avoid:** Only count errors from browser DevTools (via Claude-in-Chrome `read_console_messages`) when evaluating QUAL-04. The Node warning is irrelevant to QUAL-04.

### Pitfall 4: Dynamic pages (Photos, Events) need live data to test correctly
**What goes wrong:** `/photos` and `/photos/[album]` will hit the real Neon DB during local dev. If the DB is unreachable or the R2 proxy has a transient error, the console sweep could show spurious errors that are infrastructure-related, not code bugs.
**How to avoid:** Confirm `npm run dev` is hitting Neon successfully (DB queries return data) before starting the QUAL-04 sweep. The Phase 34 verification already passed a round-trip check; this should remain green.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest (exact version from package.json) + happy-dom |
| Config file | `vitest.config.ts` |
| Quick run command | `npm test` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | Currently Satisfies? |
|--------|----------|-----------|-------------------|----------------------|
| QUAL-01 | `npm run build` exits 0 | smoke/CI | `npm run build` | YES (exit 0 as of Phase 35) |
| QUAL-02 | `npm test` 232 pass, 0 fail | unit/integration | `npm test` | YES (232/0 green) |
| QUAL-03 SC#1 | `npm run lint` zero warnings | lint | `npm run lint` | NO — 1 warning (fix needed) |
| QUAL-03 SC#2 | dead identifiers absent from src/ | grep audit | `grep -rnE "BlogPost|FamilyUpdate|lib/blog|/blog|/family|PostStatus" src/` | YES (zero matches) |
| QUAL-03 SC#3 | grep-guard test prevents re-introduction | unit (grep-guard) | `npm test` | Wave 0 gap — test does not exist yet |
| QUAL-04 (console) | each of 8 pages loads with zero console errors | browser smoke (automated) | Claude-in-Chrome `read_console_messages` on `http://localhost:3000/<path>` | Not yet executed — executor task |
| QUAL-04 (375px) | each of 8 pages is usable at 375px | visual UAT (manual) | Human check in DevTools responsive mode | Not yet executed — human-UAT item |

### Observable Signals per Requirement

| Requirement | Signal | Pass Condition |
|-------------|--------|----------------|
| QUAL-01 | `npm run build` exit code | = 0 |
| QUAL-02 | Vitest pass count | = 232 (or more — no regressions) |
| QUAL-03 lint | `npm run lint` output | "0 problems" (zero warnings, zero errors) |
| QUAL-03 dead-code | grep exit code | = 1 (no matches); automated test in `npm test` |
| QUAL-04 console | DevTools console (each page) | Zero `console.error` lines after hydration |
| QUAL-04 responsive | Visual inspection (each page) | No overflow, no clipped content, drawer accessible |

### Wave 0 Gaps

- [ ] `src/__tests__/prod-readiness.test.ts` — add `describe('v5.0 Prune Guard')` block with dead-identifier grep assertion (covers QUAL-03 SC#3)

*(All other test infrastructure is in place. The 232-test suite, the lint config, the build pipeline, and the browser automation path are operational.)*

---

## QUAL-04 Per-Page Sweep Methodology

### Automated: Console Error Check (Claude-in-Chrome)

For each page, with `npm run dev` running on `http://localhost:3000`:

1. Navigate to the URL.
2. Wait for hydration (allow 2 seconds after DOMContentLoaded).
3. Call `read_console_messages` (or equivalent browser console API).
4. Assert: zero entries with level `error`. Zero entries with level `warning` that are React-originated (hydration mismatch, `key` prop, etc.).
5. Document result: PASS / FAIL with specific error text if any.

Pages to sweep and expected console state:

| URL | Expected State | Likely Noise Source |
|-----|---------------|---------------------|
| `/` | Clean | MenuProvider localStorage hydration (SSR-safe guard in place) |
| `/recipes` | Clean | None |
| `/recipes/pangolin` (or any existing slug) | Clean | None |
| `/photos` | Clean (or empty state) | R2 image proxy — fixed in Phase 34 |
| `/photos/moving-to-dallas` | Clean | R2 image proxy — fixed in Phase 34 |
| `/events` | Clean (or empty state) | None |
| `/richard-hudson-sr` | Clean | None |
| `/my-menu` | Clean | MenuProvider localStorage |

### Manual: 375px Responsive Check (Human UAT)

Due to the environment constraint (viewport renders ~2056px regardless of resize), 375px validation is a human UAT item. For each page:

1. Open DevTools → Toggle device toolbar → Set to 375px width (iPhone SE / standard mobile).
2. Check: no horizontal scrollbar, no content clipped beyond viewport, all interactive elements reachable by tap.
3. For `/` and `/recipes`: confirm RecipeSearch is visible and tap-accessible.
4. For nav: confirm mobile drawer opens (Phase 35 verified this, but confirm no regression).
5. Document: PASS / FAIL per page.

The 375px check is a human-UAT gate; the plan should mark it as `checkpoint:human-uat` and block phase closure until all 8 pages pass.

---

## Open Questions (RESOLVED)

1. **Recipe detail slug for the console sweep**
   - What we know: MDX recipes are file-based; the build generates ~1041 pages including recipe detail pages.
   - What's unclear: A specific slug to use in the automated sweep (any valid slug works).
   - Recommendation: Use `pangolin` (from the recipe index) or any slug visible in `content/recipes/`. The executor can pick any valid slug from the filesystem.
   - **RESOLVED (planning):** Any valid recipe slug is acceptable; Plan 36-02 uses a real slug from the filesystem for the `/recipes/[slug]` console check.

2. **`/my-menu` when menu is empty vs populated**
   - What we know: `/my-menu` reads from `localStorage` (`hudson-menu` key). It is server-rendered with an empty shell and hydrated client-side.
   - What's unclear: Whether the empty state (no items added) or a populated state matters more for console-error testing.
   - Recommendation: Test both — empty state (no localStorage key) and with at least one recipe added. The empty state exercises the "no items" branch; populated exercises the grouping logic.
   - **RESOLVED (planning):** Plan 36-02 checks both `/my-menu` states (empty + populated) in the console sweep.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Orchestrator's `npm run build` exit 0 from minutes before this research is still valid | Summary | Low — no code changes between then and now |
| A2 | grep zero-match was confirmed by orchestrator scan, not re-run in this session | QUAL-03 | Low — Phase 32 deleted all references; phases 33–35 added nothing matching |
| A3 | `"use no memo"` function-level directive routes `IncompatibleLibrary` through `logError` (not `handleError`), suppressing the ESLint report | QUAL-03 Lint Fix | Medium — verified by reading plugin source, but behavior could differ if `eslint-config-next` wraps the rule differently; Option A (`eslint-disable-next-line`) is more robust regardless |

---

## Sources

### Primary (HIGH confidence)
- `node_modules/eslint-plugin-react-hooks/cjs/eslint-plugin-react-hooks.development.js` — directly read: lines 53025–53035 (suppression pattern), 53151–53157 (`findDirectiveDisablingMemoization`), 53373–53412 (`hasModuleScopeOptOut` derivation), 53479–53490 (logError vs handleError branch), 18326–18335 (IncompatibleLibrary rule definition) [VERIFIED: local file]
- `src/components/dashboard/data-table.tsx` — confirmed warning location line 45, `useReactTable` call [VERIFIED: local file]
- `eslint.config.mjs` — confirmed flat config, no existing overrides for `react-hooks/incompatible-library` [VERIFIED: local file]
- `next.config.ts` — confirmed `cacheComponents: true` enables React Compiler, which is the trigger for the `incompatible-library` rule [VERIFIED: local file]
- `npm test` output — 232 passed, 0 fail [VERIFIED: live run]
- `npm run lint` output — 1 warning, 0 errors, exact message confirmed [VERIFIED: live run]
- `src/__tests__/prod-readiness.test.ts` — confirmed `fs.readFile` + `expect().toContain()` pattern for source-file assertions [VERIFIED: local file]

### Secondary (MEDIUM confidence)
- STATE.md Phase 32–35 completion records — confirm dead-code removal history [CITED: .planning/STATE.md]
- ROADMAP.md Phase 36 success criteria — authoritative spec for this phase [CITED: .planning/ROADMAP.md]
- REQUIREMENTS.md QUAL-01..04 — exact requirement text [CITED: .planning/REQUIREMENTS.md]

---

## Metadata

**Confidence breakdown:**
- Lint fix recommendation: HIGH — verified by reading plugin source directly; both Option A and the Option B analysis are grounded in the actual code paths
- QUAL-01/02 current state: HIGH — live runs confirmed
- QUAL-03 dead-code: HIGH — orchestrator scan + Phase 32 completion history
- QUAL-04 methodology: HIGH — pages confirmed from `ls src/app/(public)/`, classification from reading page files in previous phases
- Grep-guard test pattern: HIGH — `prod-readiness.test.ts` precedent confirmed

**Research date:** 2026-06-03
**Valid until:** This is a closeout phase; research is valid until the phase executes (expected same day).
