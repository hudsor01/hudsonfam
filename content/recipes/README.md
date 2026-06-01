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

## Bulk batch loop

Designed for digitizing hundreds of pages, then typing them up over time:

1. Drop raw scan photos into `public/images/recipes/_inbox/`.
2. **Optimize each batch** (downscale to ≤2000px, re-encode to JPEG):

   ```sh
   bun run optimize:scan <slug>
   # e.g.
   bun run optimize:scan grandma-hudson-apple-pie
   ```

3. **Scaffold the MDX** (scans auto-filled, `status: "draft"`):

   ```sh
   bun run scaffold:recipe <slug>
   ```

   The script reads the images already present in
   `public/images/recipes/<slug>/`, populates `scans`, and writes
   `content/recipes/<slug>.mdx` with empty ingredient/instruction arrays.

4. **Review in `bun dev`.** Visit `/recipes/<slug>`. The draft banner is
   visible only in development — compare transcription to scan, fix errors, and
   add `reviewNotes` for anything uncertain.

5. **Publish.** Set `status: "published"` (and clear `reviewNotes`) once
   verified. The recipe goes live on the next build.

Check overall progress at any time:

```sh
bun run recipes:status
```

## Frontmatter reference

See `_TEMPLATE.mdx` — every field is documented inline.
