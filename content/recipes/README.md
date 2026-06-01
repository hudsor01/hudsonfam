# Hudson Recipes — Authoring Guide

This folder holds the MDX source for the **Hudson Recipes** collection — a
project to digitize and preserve Grandma Hudson's handwritten recipe book
(200–400 recipes). Each recipe pairs the **original scanned page** with a clean,
typed **transcription**.

- One `.mdx` file per recipe. The filename (minus `.mdx`) is the URL slug:
  `apple-pie.mdx` → `/recipes/apple-pie`.
- Files starting with `_` (like `_TEMPLATE.mdx`) and `README.md` are **ignored**
  by the loader — they never appear as recipes.
- The loader lives at `src/lib/recipes.ts`; pages are under
  `src/app/(public)/recipes/`. No database, no login — recipes are public.

## Status model

Recipes use a `status` field with two values:

| Value | Behavior |
|-------|----------|
| `"draft"` | Visible only under `bun dev`. Returns 404 in production. Use while transcribing or reviewing. |
| `"published"` | Always visible. Appears in the listing, detail page, and sitemap. |

New recipes always start as `"draft"`. Set `status: "published"` once you've
verified the transcription against the original scan.

Use the optional `reviewNotes` array to flag anything uncertain (an illegible
word, an ambiguous amount). Notes appear in the dev-only review banner on the
detail page — clear them before publishing.

## Adding a recipe (manual)

1. **Photograph the page.** One clear photo per page. Name them `page-1.jpg`,
   `page-2.jpg`, … in page order.
2. **Put the images in** `public/images/recipes/<slug>/`. Create the folder if
   it doesn't exist. Example: `public/images/recipes/apple-pie/page-1.jpg`.
3. **Copy `_TEMPLATE.mdx`** to `<slug>.mdx` in this folder.
4. **Fill the frontmatter.** Set `title`, `category`, the `scans` paths (they
   live under `/images/recipes/<slug>/`), and any times/servings.
5. **Transcribe.** Type the `ingredients` and `instructions` arrays.
6. **Review in dev.** Run `bun dev` and visit `/recipes/<slug>`. The draft
   banner appears — compare against the scan and fix any issues.
7. **Publish.** Set `status: "published"` and clear `reviewNotes`.

## File naming convention

The source book (Modern Priscilla Cook Book) puts **several recipes on each
page**, so we name at two levels:

- **Page images — one file per photographed page**, named
  `p<NN>-<section>.jpeg` (book page number + section), stored in
  `public/images/recipes/_pages/`. Examples: `p23-quick-breads.jpeg`,
  `p42-biscuits-and-rolls.jpeg`. This keeps the originals traceable; page
  numbers repeat across sections, so the section suffix keeps them unique.
- **Recipes — one MDX file per recipe**, slug = the recipe name
  (`spoon-bread-no-2.mdx` → `/recipes/spoon-bread-no-2`). Several recipes from
  the same page all point their `scans` at that one shared page image. The
  recipe *name* lives in the slug (searchable in the listing); the *image*
  filename only needs to identify the page.

## Bulk batch loop

Designed for digitizing hundreds of pages, then typing them up over time:

1. **Drop photos** into `public/images/recipes/_inbox/` (in page order).
2. **Rename each photo to its page** — `p<NN>-<section>.jpeg` — so the original
   is identifiable at a glance instead of `IMG_2701.jpeg`. Read the page number
   printed on the page and its section heading. Multi-recipe pages stay as one
   image.
3. **Optimize** the renamed pages to ≤2000px and move them into
   `public/images/recipes/_pages/`. (`bun run optimize:scan <slug>` handles the
   downscale for a per-slug folder; for shared page images the assistant
   optimizes the `_pages/` files directly during transcription.)
4. **Create one recipe MDX per recipe on the page** (slug = recipe name),
   `status: "draft"`, with `scans` pointing at the shared page image, e.g.
   `scans: ["/images/recipes/_pages/p23-quick-breads.jpeg"]`. Transcribe the
   `ingredients`/`instructions` verbatim; add `reviewNotes` for anything
   uncertain.
5. **Review in `bun dev`.** Visit each `/recipes/<slug>`. The draft banner is
   visible only in development — compare transcription to scan and fix errors.
6. **Publish.** Set `status: "published"` (and clear `reviewNotes`) once
   verified. The recipe goes live on the next build.

> The `bun run scaffold:recipe <slug>` helper assumes the simpler one-folder-
> per-recipe layout (`public/images/recipes/<slug>/`) and auto-fills `scans`
> from images in that folder. For shared page images, set `scans` to the
> `_pages/` path by hand (or let the assistant wire it up).

Check overall progress at any time:

```sh
bun run recipes:status
```

## Frontmatter reference

See `_TEMPLATE.mdx` — every field is documented inline.
