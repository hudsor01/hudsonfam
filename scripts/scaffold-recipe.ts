/**
 * Recipe scaffolder for the Hudson Recipes bulk workflow.
 *
 * Given a slug, generates a skeleton `content/recipes/<slug>.mdx` with
 * `status: "draft"` and the `scans` array auto-populated from whatever
 * image files already exist in `public/images/recipes/<slug>/`.
 *
 * Drop the page photos in first, then run:
 *   bun run scaffold:recipe <slug>
 *   # e.g. bun run scaffold:recipe grandma-hudson-apple-pie
 *
 * Invoked via `bun run scaffold:recipe` (bun runtime, same as seed:content).
 */

import fs from "fs/promises";
import path from "path";

const IMAGE_EXTS = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif", ".heic"]);

function slugToTitle(slug: string): string {
  return slug
    .split("-")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

async function main() {
  const slug = process.argv[2]?.trim();

  if (!slug) {
    console.error("[scaffold:recipe] Usage: bun run scaffold:recipe <slug>");
    process.exit(1);
  }

  // Reject anything that isn't a clean, single-segment slug.
  if (!/^[a-z0-9][a-z0-9-]*$/.test(slug)) {
    console.error(
      `[scaffold:recipe] Invalid slug '${slug}'. Use lowercase letters, numbers, and hyphens only.`
    );
    process.exit(1);
  }

  const recipesDir = path.join(process.cwd(), "content", "recipes");
  const imagesDir = path.join(process.cwd(), "public", "images", "recipes", slug);
  const mdxPath = path.join(recipesDir, `${slug}.mdx`);

  // Don't clobber an existing recipe.
  try {
    await fs.access(mdxPath);
    console.error(
      `[scaffold:recipe] ${path.relative(process.cwd(), mdxPath)} already exists. Aborting.`
    );
    process.exit(1);
  } catch {
    // Good — file does not exist yet.
  }

  // Collect scan images already placed in the public folder.
  let scanFiles: string[] = [];
  try {
    const entries = await fs.readdir(imagesDir);
    scanFiles = entries
      .filter((f) => IMAGE_EXTS.has(path.extname(f).toLowerCase()))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  } catch {
    console.warn(
      `[scaffold:recipe] No images found at public/images/recipes/${slug}/ — scaffolding with an empty scans list.`
    );
  }

  const scansYaml =
    scanFiles.length > 0
      ? scanFiles
          .map((f) => `  - "/images/recipes/${slug}/${f}"`)
          .join("\n")
      : "  []";

  const today = new Date().toISOString().split("T")[0];

  const mdx = `---
title: "${slugToTitle(slug)}"
category: "Uncategorized"
scans:
${scansYaml}
contributor: "Grandma Hudson"
sourceNote: ""
servings: ""
prepTime: ""
cookTime: ""
ingredients: []
instructions: []
tags: []
dateAdded: "${today}"
status: "draft"
reviewNotes: []
---

<!-- Draft. Fill in ingredients/instructions above, add any reviewNotes for the
     reviewer, then set status: "published" once verified against the scan. -->
`;

  await fs.mkdir(recipesDir, { recursive: true });
  await fs.writeFile(mdxPath, mdx, "utf-8");

  console.log(
    `[scaffold:recipe] Created ${path.relative(process.cwd(), mdxPath)} with ${scanFiles.length} scan(s).`
  );
  if (scanFiles.length === 0) {
    console.log(
      `[scaffold:recipe] Next: add page photos to public/images/recipes/${slug}/ and list them under "scans".`
    );
  } else {
    console.log(
      '[scaffold:recipe] Next: transcribe ingredients/instructions, then set status: "published" once verified.'
    );
  }
}

main().catch((e) => {
  console.error("[scaffold:recipe] Unexpected error:", e);
  process.exit(1);
});
