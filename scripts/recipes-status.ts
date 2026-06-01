/**
 * Print Hudson Recipes digitization progress: published / draft / total,
 * plus the list of slugs currently awaiting review.
 *
 * Usage: bun run recipes:status
 */

import { getPublishedRecipes, getDraftRecipes } from "../src/lib/recipes";

async function main() {
  const [published, drafts] = await Promise.all([
    getPublishedRecipes(),
    getDraftRecipes(),
  ]);
  const total = published.length + drafts.length;

  console.log("Hudson Recipes — progress");
  console.log("─────────────────────────");
  console.log(`Published:       ${published.length}`);
  console.log(`Drafts (review): ${drafts.length}`);
  console.log(`Total recipes:   ${total}`);

  if (drafts.length > 0) {
    console.log("\nAwaiting review:");
    for (const d of drafts) {
      console.log(`  • ${d.slug}`);
    }
  }
}

main().catch((e) => {
  console.error("[recipes:status] Unexpected error:", e);
  process.exit(1);
});
