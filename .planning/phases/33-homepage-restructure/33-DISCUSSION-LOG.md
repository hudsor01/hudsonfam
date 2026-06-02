# Phase 33: Homepage Restructure - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-02
**Phase:** 33-homepage-restructure
**Areas discussed:** How recipes lead, Homepage section layout, Hero copy/identity, Featured-recipe selection

---

## How Recipes Lead

| Option | Description | Selected |
|--------|-------------|----------|
| Hero CTA + featured recipes | Recipes-forward Hero + 'Browse Recipes' CTA + cmdk search, then featured-recipes card row | ✓ |
| Category/chapter grid | Lead with a grid of recipe chapters | |
| Search-first | Embed cmdk RecipeSearch as the prominent hero action, minimal else | |

**User's choice:** Hero CTA + featured recipes

---

## Homepage Section Layout

| Option | Description | Selected |
|--------|-------------|----------|
| Single-column stacked sections | Hero → Recipes → Photos → Events, full-width; retire orphaned sidebar | ✓ |
| Recipes main + Photos/Events rail | Two-column: recipes main, Photos+Events in Sidebar rail | |
| Recipes hero + 2-up Photos/Events | Recipes full-width, then Photos & Events side-by-side | |

**User's choice:** Single-column stacked sections

---

## Hero Copy / Identity

| Option | Description | Selected |
|--------|-------------|----------|
| Recipes-forward | Keep 'The Hudson Family' headline; reframe subcopy around the recipe collection + family moments | ✓ |
| Lighter touch | Keep generic, just remove 'updates' wording | |
| You decide | Claude writes fitting copy | |

**User's choice:** Recipes-forward

---

## Featured-Recipe Selection

| Option | Description | Selected |
|--------|-------------|----------|
| Curated hardcoded list | ~4-6 handpicked slugs in code; stable, no hydration risk, family-editable | ✓ |
| Book order (first N) | First N published recipes by book order | |
| By category | Feature one fixed chapter/category | |
| Random sample | Random selection (needs SSR-deterministic handling) | |

**User's choice:** Curated hardcoded list

---

## Claude's Discretion

- Default featured-recipe slugs, exact Hero/section copy, and Sidebar-refactor vs new-section-components decision (within the locked single-column structure). Visuals locked by UI-SPEC.

## Deferred Ideas

None — discussion stayed within phase scope.
