---
phase: 36-quality-gate
reviewed: 2026-06-02T23:25:00Z
depth: standard
files_reviewed: 2
files_reviewed_list:
  - src/components/dashboard/data-table.tsx
  - src/__tests__/prod-readiness.test.ts
findings:
  critical: 1
  warning: 2
  info: 1
  total: 4
status: issues_found
---

# Phase 36: Code Review Report

**Reviewed:** 2026-06-02T23:25:00Z
**Depth:** standard
**Files Reviewed:** 2
**Status:** issues_found

## Summary

Phase 36 (Quality Gate, v5.0 closeout) introduced two changes: a scoped `eslint-disable`
in `data-table.tsx` and a new "v5.0 Prune Guard" test block in `prod-readiness.test.ts`.

The `eslint-disable` change is **correct and well-executed** — the rule id
`react-hooks/incompatible-library` is a real rule in the installed `eslint-plugin-react-hooks`,
the suppression is scoped to exactly one call site, it carries an explanatory comment, and
`npx eslint src/components/dashboard/data-table.tsx` exits 0 with no warnings and no
unused-directive report. No findings against this file.

The Prune Guard's core logic is sound: it excludes the single top-level `src/__tests__`
directory (the only `__tests__` dir in the tree), it walks recursively with pure `fs`
(no `child_process`/grep, avoiding the exit-code-2 false-pass pitfall), it asserts the
collected file set is non-empty (it scans 150 real `.ts`/`.tsx` files), and it currently
passes against production source. However it ships with one **build-breaking defect** and
two robustness/quality issues described below.

## Critical Issues

### CR-01: Prune-guard `toHaveLength(0, message)` is a TypeScript compile error that breaks `next build`

**File:** `src/__tests__/prod-readiness.test.ts:1005-1008`

**Issue:** The guard's final assertion passes a custom-message string as a second argument to
`toHaveLength`:

```ts
expect(violations).toHaveLength(0,
  `v5.0 dead identifiers found in production source — re-introduction detected:\n${report}\n` +
  `Identifiers checked: ${DEAD_IDENTIFIERS.join(', ')}`
);
```

Vitest's `toHaveLength` matcher accepts exactly **one** argument. `tsc --noEmit` reports:

```
src/__tests__/prod-readiness.test.ts(1006,7): error TS2554: Expected 1 arguments, but got 2.
```

This is not cosmetic. `tsconfig.json` includes `**/*.ts` (which covers test files),
`next.config.ts` does **not** set `typescript.ignoreBuildErrors`, and the project deploys via
`next build` on Vercel (per CLAUDE.md). `next build` runs the project typecheck, so this error
**fails the production build** — the exact outcome a quality gate exists to prevent. The whole
phase ships a broken build gate.

Separately, even at runtime the second argument is silently ignored by Vitest: a verified
failing-assertion probe produced only `AssertionError: expected [...] to have a length of +0
but got N` — the carefully constructed `report` (file list + matched identifiers) never
surfaces. So when a dead identifier IS re-introduced, the guard fails with a useless message
and the `report` variable's work is wasted.

**Fix:** Drop `toHaveLength` and assert against a human-readable string so both the typecheck
passes and the diagnostic is preserved on failure:

```ts
const report = violations
  .map((v) => `  ${v.file}: [${v.matches.join(', ')}]`)
  .join('\n');

// Empty string on success; descriptive failure message embedded in the actual value.
expect(
  violations.length === 0
    ? ''
    : `v5.0 dead identifiers found in production source — re-introduction detected:\n${report}\n` +
        `Identifiers checked: ${DEAD_IDENTIFIERS.join(', ')}`
).toBe('');
```

(Alternatively `expect(violations, message).toHaveLength(0)` — Vitest's *first*-position
message overload — but the string-compare form above gives the clearest failure output.)

## Warnings

### WR-01: Dead-identifier substring matching is brittle and will false-positive on legitimate future code

**File:** `src/__tests__/prod-readiness.test.ts:958-965, 995`

**Issue:** The guard matches with `content.includes(id)` against raw substrings, several of
which are short path fragments: `'/blog'`, `'/family'`, `'lib/blog'`. Any legitimate future
production string that *contains* these as a substring will trip the guard with a false
failure — for example `'/family-tree'`, `'/family-photos'`, `'/blog-archive'`, an external
URL like `'https://example.com/blog'`, or even a code comment mentioning `/family`. Given the
site is a "Hudson Family" site (the footer already renders "The Hudson Family"), a future
`/family-*` route is plausible, and the guard would block it for the wrong reason. A permanence
guard that produces false failures erodes trust and gets disabled.

**Fix:** Anchor the path-like identifiers to reduce false positives — e.g. match quoted/bounded
forms rather than bare substrings:

```ts
const DEAD_IDENTIFIERS: Array<{ label: string; test: (c: string) => boolean }> = [
  { label: 'BlogPost',     test: (c) => /\bBlogPost\b/.test(c) },
  { label: 'FamilyUpdate', test: (c) => /\bFamilyUpdate\b/.test(c) },
  { label: 'PostStatus',   test: (c) => /\bPostStatus\b/.test(c) },
  { label: 'lib/blog',     test: (c) => c.includes('lib/blog') },
  // Anchor route fragments to a quote/boundary so '/family-tree' is NOT flagged:
  { label: '/blog',        test: (c) => /["'`(]\/blog(["'`/)]|$)/.test(c) },
  { label: '/family',      test: (c) => /["'`(]\/family(["'`/)]|$)/.test(c) },
];
// ...
const matched = DEAD_IDENTIFIERS.filter((d) => d.test(content)).map((d) => d.label);
```

### WR-02: Guard scans only `.ts`/`.tsx`, missing non-TS production source where dead routes can live

**File:** `src/__tests__/prod-readiness.test.ts:981`

**Issue:** The file filter is `/\.(ts|tsx)$/`, so the guard never inspects non-TS production
source. Dead route references (`/blog`, `/family`) and identifiers can legitimately appear in
other production assets that this codebase ships — e.g. `.mdx` blog/content files, `.css`
(`src/styles/globals.css` exists), `.json`, or `sitemap`/`robots` data. A re-introduced
`/blog` link inside an MDX file or a hardcoded JSON config would pass the guard silently
(a false pass — the worse failure mode for a permanence guard, per the phase brief). The
guard's stated purpose ("never return to production source") is broader than the file types
it actually scans.

**Fix:** Either broaden the extension allow-list to the content types this app ships, or
document the intentional scope. If MDX/CSS are out of scope by design, state it in the block
comment so the gap is a decision, not an oversight:

```ts
// Scan TS/TSX plus content/asset types that can carry route references.
} else if (entry.isFile() && /\.(ts|tsx|mdx|md|json)$/.test(entry.name)) {
  files.push(fullPath);
}
```

## Info

### IN-01: Guard re-checks `entry.isDirectory()` redundantly and could short-circuit symlinked dirs unexpectedly

**File:** `src/__tests__/prod-readiness.test.ts:977-981`

**Issue:** Minor structure nit: `entry.isDirectory()` is evaluated twice (once for the
`__tests__` skip, once for the recurse branch). More notably, `withFileTypes` classifies
symlinks as `isSymbolicLink()`, not `isDirectory()`/`isFile()`, so a symlinked source
directory or file would be silently skipped (neither recursed nor scanned). There are no
symlinks under `src/` today, so this is informational, not a current defect. If symlinked
source ever appears, the guard would under-scan without warning.

**Fix:** Collapse the directory check and, if symlink support is ever needed, resolve with
`fs.stat` (follows links) instead of relying on `withFileTypes`:

```ts
for (const entry of entries) {
  const fullPath = path.join(dir, entry.name);
  if (entry.isDirectory()) {
    if (entry.name === '__tests__') continue;
    files.push(...(await collectSourceFiles(fullPath)));
  } else if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) {
    files.push(fullPath);
  }
}
```

---

_Reviewed: 2026-06-02T23:25:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
