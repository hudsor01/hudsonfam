---
phase: 06-theme-alignment
plan: 01
subsystem: ui
tags: [tailwind, shadcn, theming, oklch, css-variables]
requires:
  - phase: 05-advanced
    provides: All 28 shadcn components installed, OKLCH color system
provides:
  - shadcn-standard CSS variable naming across entire codebase
  - Clean single @theme block with all semantic tokens
affects: [07-tw4-quick-wins, 08-tw4-advanced, 09-sidebar-upgrade, 10-tanstack-form, 11-component-integration]
tech-stack:
  added: []
  patterns: [shadcn background/foreground token pairing, OKLCH-only theming]
key-files:
  created: []
  modified: [src/styles/globals.css]
key-decisions:
  - "Keep --color-text-dim as custom token (no shadcn equivalent for very dim text)"
  - "Remove HSL sidebar fallback blocks entirely in favor of OKLCH @theme tokens"
patterns-established:
  - "All colors use shadcn standard names: bg-background, text-foreground, bg-card, text-muted-foreground"
  - "Single @theme block for all tokens, @theme inline only for radius scale"
issues-created: []
completed: 2026-03-28
---

# Phase 6 Plan 01: Theme Variable Naming Summary

**Consolidated @theme to shadcn-standard naming, renamed 488+ class references across 73 files**

## Accomplishments
- Merged two @theme blocks into single clean block with shadcn-standard variable names
- Renamed all custom shorthand classes: bg-bg→bg-background, text-text→text-foreground, text-text-muted→text-muted-foreground, bg-surface→bg-card
- Removed HSL :root/.dark sidebar fallback blocks (conflicted with OKLCH system)
- Added all shadcn semantic tokens (destructive, secondary, input, ring, popover)
- Kept --color-text-dim as sole custom token

## Task Commits

1. **Task 1: Refactor globals.css @theme** - `1ed13ae` (refactor)
2. **Task 2: Rename all class references** - `6300d1a` (refactor)

## Files Created/Modified
- `src/styles/globals.css` — Complete theme overhaul
- 73 files across src/ — Class name renames

## Decisions Made
- Kept text-text-dim as custom token since shadcn has no equivalent for "very dim" text
- Removed all HSL values — project is now 100% OKLCH

## Deviations from Plan
None — plan executed as written.

## Next Phase Readiness
- All CSS variables now follow shadcn convention
- Ready for 06-02 (fix hardcoded colors and cn() patterns)
