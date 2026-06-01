# Hudson Recipes — Bulk Digitization Pipeline

**Date:** 2026-06-01
**Status:** Approved design
**Feature area:** `Hudson Recipes` (public, MDX-file-based) — see existing implementation in `src/lib/recipes.ts`, `src/app/(public)/recipes/`, `content/recipes/`.

## Purpose

Digitize and preserve an old family recipe book (~300–400 handwritten/printed recipes from the user's grandmother on the Hudson side) before the physical book degrades. Each recipe preserves the **original scanned page** alongside a **clean, verbatim transcription**. The design optimizes the data-entry experience (DX) so the user's only recurring manual work is photographing pages and a short per-batch correction/approval pass — everything else (segmentation, transcription, image optimization, file writing, commits) is automated by the assistant.

## Decisions (locked)

| Dimension | Decision | Rationale |
|-----------|----------|-----------|
| Book layout | **Mixed** — some pages have one recipe, some many, some recipes span pages | Requires an AI segmentation pass with a human-confirmed boundary preview before writing |
| Transcription engine | **Interactive with the assistant in chat** (assistant reads photos off disk) | Highest accuracy on cursive/faded handwriting where a wrong measurement matters |
| Scan storage | **Optimized ~2000px copies committed to git**; user keeps phone full-res as master | Self-contained, backed up on GitHub, repo stays lean (~hundreds of MB for 400). The readable scan is itself a faithful preservation artifact |
| Publish model | **Draft → Published**; nothing public until the user approves each recipe | User must verify scan vs. transcription (catch OCR errors/typos) before publishing |
| Review surface | **Local dev preview** (`bun dev`); the existing detail page is the review screen | Zero extra UI; drafts visible in dev, excluded from production |

## Architecture

File-based, mirroring the existing blog/recipes pattern. No database.

### Folder layout

- `public/images/recipes/_inbox/` — staging area; the user drops a batch of page photos here (page order by filename). Holds a `.gitkeep`. Emptied after each batch is processed.
- `public/images/recipes/<slug>/page-N.jpg` — final per-recipe scan home (optimized ~2000px).
- `content/recipes/<slug>.mdx` — the recipe (draft or published).
- `content/recipes/_PROGRESS.md` — running ledger: counts of published / draft / total estimated, last batch processed, and the list of slugs currently awaiting review. Makes the multi-session effort resumable.
- `content/recipes/_TEMPLATE.mdx` — copy-paste template (ignored by loader; underscore-prefixed).
- `content/recipes/README.md` — authoring + bulk workflow guide.
- `scripts/optimize-scan.ts` — Bun + `sharp` downscaler.
- `scripts/scaffold-recipe.ts` — existing scaffolder (kept; updated for the new schema).

### Schema change

Refactor the recipe frontmatter (currently `transcribed: boolean`):

- **Remove** `transcribed: boolean`.
- **Add** `status: "draft" | "published"` — default `draft`. Controls public visibility.
- **Add** `reviewNotes?: string[]` — assistant-flagged uncertainties for a recipe, e.g. `"'1 c. ?our' — flour or sugar?"`. Shown only on the dev/draft review view; cleared on approval.

Full frontmatter after change:

```yaml
title: string            # required
category: string         # required, e.g. "Desserts", "Mains", "Breads", "Canning & Preserves"
status: draft|published  # required, default draft
scans: string[]          # paths under /images/recipes/<slug>/
contributor: string      # default "Grandma Hudson"
sourceNote?: string      # provenance, e.g. "From Grandma Hudson's handwritten book, c. 1960s"
servings?: string
prepTime?: string
cookTime?: string
ingredients: string[]    # structured + schema.org
instructions: string[]   # ordered steps
tags?: string[]
dateAdded: string        # YYYY-MM-DD
reviewNotes?: string[]   # assistant uncertainties, dev-only, cleared on approval
```

MDX body (below frontmatter) = free-form story, marginalia, and modern-equivalent notes.

### Draft visibility mechanism

The single most important behavior. Implemented in the loader (`src/lib/recipes.ts`) and consumed by pages:

- `getAllRecipes()` returns **published only when `process.env.NODE_ENV === "production"`**; in development it also returns drafts.
- `getDraftRecipes()` returns drafts only (used by the dev-only drafts section).
- Detail page (`src/app/(public)/recipes/[slug]/page.tsx`):
  - `generateStaticParams()` excludes drafts in production → drafts **404 in production**, render in dev.
  - In dev, when a recipe is a draft, render a **review callout** above the scan/transcription listing each `reviewNotes` item so the user checks exactly those words against the scan.
- Listing page (`src/app/(public)/recipes/page.tsx`):
  - Production: published only.
  - Dev: an additional **"Drafts (N) — needs review"** section linking to each draft's detail page.
- Drafts are excluded from any sitemap/SEO surface (published only).

## The batch loop (operational workflow)

The user performs step 1 only; the assistant performs steps 2–6.

1. **User:** photograph ~15 pages, drop them in `public/images/recipes/_inbox/` (filenames in page order), say "go" (+ optional hints, e.g. "these are desserts", "the pie spans the last 2 photos").
2. **Assistant segments:** reads every image in `_inbox/` in order, detects recipe boundaries (split multi-recipe pages into N recipes; group spanning pages into one), and posts a **boundary map for confirmation before writing** ("Photo 1 → 2 recipes; Photos 4–5 → 1 recipe").
3. **Assistant transcribes** each recipe verbatim: title, `ingredients[]`, `instructions[]`, times/servings, infers `category`, generates `slug`, sets provenance. Preserves period language ("1 teacup", "butter the size of an egg", "hot oven"); modern equivalents go in the body, never overwriting the original.
4. **Assistant optimizes + files images:** runs `scripts/optimize-scan.ts` to downscale each source photo to ~2000px web quality, moves them to `public/images/recipes/<slug>/page-N.jpg`, wires them into frontmatter `scans`, and empties `_inbox/`.
5. **Assistant writes** `content/recipes/<slug>.mdx` with `status: draft` + `reviewNotes`, then **commits the batch** (one commit per batch → continuous GitHub backup, easy undo). Drafts are backed up but remain non-public.
6. **User reviews** in `bun dev` (scan vs. transcription, guided by the review callout), reports corrections + which slugs are approved. **Assistant applies fixes, flips approved recipes to `status: published`, clears their `reviewNotes`, updates `_PROGRESS.md`, and commits.**

### Throughput & resumability

- Batch size ~15 keeps assistant context sharp and the user's review list short.
- `_PROGRESS.md` + inbox state make the effort stoppable/resumable across sessions.
- One commit per batch keeps git history clean and backups continuous.
- Optional `bun run recipes:status` prints published / draft / awaiting-review counts.

## Quality safeguards (heirloom-grade)

- **Segmentation preview** before any writes — catches grouping errors cheaply.
- **Draft-by-default + review callout** — no transcription reaches the public page without explicit user sign-off; uncertainties are surfaced, not hidden.
- **Verbatim transcription** of measurements and period terms; modern equivalents added in notes only.
- **Marginalia preserved** in the MDX body.

## Build items

1. **Schema refactor + loader filtering:** `transcribed` → `status`; add `reviewNotes`; `getAllRecipes()` dev/prod filtering; add `getDraftRecipes()`.
2. **Page updates:** detail page draft 404-in-prod + dev review callout; listing page dev-only drafts section; drafts excluded from sitemap.
3. **`scripts/optimize-scan.ts`** — Bun + `sharp` (already a dependency) downscale to ~2000px.
4. **Pipeline scaffolding:** `public/images/recipes/_inbox/.gitkeep`; `content/recipes/_PROGRESS.md` ledger; optional `bun run recipes:status` script + `package.json` entry.
5. **Docs/template/example:** update `content/recipes/README.md`, `_TEMPLATE.mdx`, and the existing example recipe (`grandma-hudson-buttermilk-biscuits.mdx`) to the new `status` model; update `scripts/scaffold-recipe.ts` to emit `status: draft` instead of `transcribed: false`.

## Out of scope (YAGNI)

- Database-backed storage, admin CRUD UI, in-app upload form.
- Auth-gated live review page (local dev preview chosen instead).
- Automated/batch API transcription (interactive chosen for accuracy).
- Full-res / Git LFS scan masters (optimized copies chosen).

## Verification

- `bunx tsc --noEmit` passes for all changed recipe files.
- `bun run build` succeeds; `/recipes` and `/recipes/[slug]` generate; **drafts do not appear** in the production build output.
- In `bun dev`, drafts render with the review callout and appear in the listing's drafts section.
