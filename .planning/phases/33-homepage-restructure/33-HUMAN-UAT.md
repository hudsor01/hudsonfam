---
status: partial
phase: 33-homepage-restructure
source: [33-VERIFICATION.md]
started: 2026-06-02
updated: 2026-06-02
---

## Current Test

[awaiting human testing]

## Tests

### 1. Recipes above the fold
expected: At 1280px viewport, the Recipes entry point (Browse Recipes CTA + RecipeSearch trigger) is visible without scrolling, before Photos and Events.
result: [pending]

### 2. Visual layout fidelity
expected: 6 featured recipe cards render with correct typography (category eyebrow + serif title), the Photos grid renders, and the Events date-badge list renders — all per the UI-SPEC, on Ivory & Terracotta tokens.
result: [pending]

### 3. Bad slug graceful skip
expected: Adding a bogus slug to FEATURED_RECIPE_SLUGS produces no crash — the bad card is silently omitted; removing it restores all 6.
result: [pending]

## Summary

total: 3
passed: 0
issues: 0
pending: 3
skipped: 0
blocked: 0

## Gaps
