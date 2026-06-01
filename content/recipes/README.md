# Grandma Hudson's Recipes — Authoring Guide

This folder holds the MDX source for the **Grandma Hudson's Recipes** collection, a
project to digitize Grandma Hudson's old recipe book (her copy of the *Modern
Priscilla Cook Book*, ~200–400 recipes) into clean, **typed-out recipes** that
anyone in the family — including older relatives — can read and cook from.

Recipe pages are **text only**: a large, clear ingredient list and numbered
steps. The original page photos are used **only as the source for typing** —
they are not shown on the website.

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
verified the typed text against the book.

Use the optional `reviewNotes` array to flag anything uncertain (an illegible
word, an ambiguous amount). Notes appear in the dev-only review banner on the
detail page — clear them before publishing.

## The batch loop

Designed for digitizing hundreds of pages, then typing them up over time. You
do step 1; the assistant does the transcription interactively.

1. **Photograph the pages** and drop them in `public/images/recipes/_inbox/`,
   in page order.
2. **Rename each photo to its page** — `p<NN>-<section>.jpeg` (book page number
   + section) — so the original is identifiable at a glance instead of
   `IMG_2701.jpeg`. The book puts several recipes on one page, so each photo
   stays a single page image. Page numbers repeat across sections, so the
   section suffix keeps them unique. Examples: `p23-quick-breads.jpeg`,
   `p42-biscuits-and-rolls.jpeg`.
3. **Transcribe each recipe on the page into its own `.mdx`** (slug = the recipe
   name, e.g. `spoon-bread-no-2.mdx`), with `status: "draft"`. Type the
   `ingredients` and `instructions` arrays **verbatim** — keep period wording
   ("1 teacup", "hot oven") and put modern equivalents in the MDX body. Flag
   anything uncertain in `reviewNotes`.
4. **Review in `bun dev`.** Open each `/recipes/<slug>` and read the typed
   recipe against the book; fix any errors.
5. **Publish.** Set `status: "published"` (and clear `reviewNotes`) once
   verified. The recipe goes live on the next build.

Optional helper: `bun run scaffold:recipe <slug>` writes a skeleton draft
`.mdx` you can fill in. Check progress any time with `bun run recipes:status`.

## Source photos (not shown on the site)

The page photos are the **input for typing**, never website content:

- Keep them named `p<NN>-<section>.jpeg` so the source page is easy to find later.
- They live in `public/images/recipes/_pages/` (and `_inbox/` while pending).
- The optional `scans` frontmatter field just records which source page a recipe
  came from — it is **not displayed** anywhere. Provenance only.
- `bun run optimize:scan <slug>` downscales a folder of photos to ≤2000px if you
  want smaller source files; optional.

## Frontmatter reference

See `_TEMPLATE.mdx` — every field is documented inline. The fields that actually
appear on the recipe page are `title`, `category`, `contributor`, `sourceNote`,
`servings` / `prepTime` / `cookTime`, `ingredients`, and `instructions` (plus
the MDX body for stories and notes).
