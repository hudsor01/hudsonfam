/**
 * Print Hudson Recipes digitization progress: published / draft / total,
 * plus the list of slugs currently awaiting review.
 *
 * Reads the MDX frontmatter directly rather than importing the Next.js loader
 * (`src/lib/recipes.ts`) — that module uses the `"use cache"` directive, which
 * only runs inside the Next.js runtime. This keeps the CLI self-contained.
 * The filtering mirrors the loader: `.mdx` files, skipping `_`-prefixed ones,
 * with `status: "published"` counted as published and everything else a draft.
 *
 * Usage: bun run recipes:status
 */

import fs from "fs/promises";
import path from "path";
import matter from "gray-matter";

const RECIPES_DIR = path.join(process.cwd(), "content", "recipes");

async function main() {
  let files: string[] = [];
  try {
    files = await fs.readdir(RECIPES_DIR);
  } catch {
    files = [];
  }

  const mdxFiles = files.filter((f) => f.endsWith(".mdx") && !f.startsWith("_"));

  const drafts: string[] = [];
  let published = 0;

  for (const filename of mdxFiles) {
    const raw = await fs.readFile(path.join(RECIPES_DIR, filename), "utf-8");
    const { data } = matter(raw);
    const slug = filename.replace(/\.mdx$/, "");
    if (data.status === "published") {
      published += 1;
    } else {
      drafts.push(slug);
    }
  }

  drafts.sort();
  const total = published + drafts.length;

  console.log("Hudson Recipes — progress");
  console.log("─────────────────────────");
  console.log(`Published:       ${published}`);
  console.log(`Drafts (review): ${drafts.length}`);
  console.log(`Total recipes:   ${total}`);

  if (drafts.length > 0) {
    console.log("\nAwaiting review:");
    for (const slug of drafts) {
      console.log(`  • ${slug}`);
    }
  }
}

main().catch((e) => {
  console.error("[recipes:status] Unexpected error:", e);
  process.exit(1);
});
