# Hudson Recipes Bulk Digitization — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the Hudson Recipes feature from a `transcribed` boolean to a `draft → published` model with dev-only draft preview, plus the tooling (image optimizer, progress ledger, status script) that makes digitizing ~300–400 pages low-friction.

**Architecture:** File-based MDX recipes (`content/recipes/*.mdx`) loaded by `src/lib/recipes.ts`. A `status` frontmatter field gates public visibility: published recipes always show; drafts render only under `bun dev` (`NODE_ENV !== "production"`) and 404 in production. Pure helpers (`normalizeFrontmatter`, `filterByVisibility`) are unit-tested; pages/scripts are verified via build + dev run.

**Tech Stack:** Next.js 16 (App Router, RSC), React 19, TypeScript, gray-matter, sharp, Bun (scripts), Vitest + happy-dom (tests).

**Branch:** `feat/hudson-recipes` (already checked out). Spec: `docs/superpowers/specs/2026-06-01-hudson-recipes-bulk-digitization-design.md`.

---

## File Structure

| File | Responsibility | Action |
|------|----------------|--------|
| `src/lib/recipes.ts` | Loader + pure helpers; status model + visibility filtering | Modify |
| `src/__tests__/lib/recipes.test.ts` | Unit tests for `normalizeFrontmatter` + `filterByVisibility` | Create |
| `src/components/public/recipe-card.tsx` | List card; `isDraft` badge instead of `transcribed` | Modify |
| `src/components/public/recipe-list.tsx` | Client category filter; drop `transcribed` from item type | Modify |
| `src/app/(public)/recipes/page.tsx` | Listing: published grid + dev-only drafts section | Modify |
| `src/app/(public)/recipes/[slug]/page.tsx` | Detail: status, dev review callout, drop `transcribed` branches | Modify |
| `src/app/sitemap.ts` | Add published recipe URLs | Modify |
| `scripts/optimize-scan.ts` | sharp downscale of a slug's scans to ~2000px | Create |
| `scripts/recipes-status.ts` | Print published/draft/total counts | Create |
| `scripts/scaffold-recipe.ts` | Emit `status: draft` + `reviewNotes: []` | Modify |
| `content/recipes/_TEMPLATE.mdx` | Document `status` + `reviewNotes` | Modify |
| `content/recipes/grandma-hudson-buttermilk-biscuits.mdx` | `transcribed: true` → `status: "published"` | Modify |
| `content/recipes/_PROGRESS.md` | Ledger | Create |
| `public/images/recipes/_inbox/.gitkeep` | Batch staging dir | Create |
| `package.json` | Add `optimize:scan`, `recipes:status` scripts | Modify |

---

## Task 1: Schema refactor in the loader (types + normalization)

**Files:**
- Modify: `src/lib/recipes.ts`
- Test: `src/__tests__/lib/recipes.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/lib/recipes.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { normalizeFrontmatter, filterByVisibility } from "@/lib/recipes";
import type { RecipeMeta } from "@/lib/recipes";

describe("normalizeFrontmatter", () => {
  it("defaults status to draft when missing or unknown", () => {
    expect(normalizeFrontmatter({}, "x").status).toBe("draft");
    expect(normalizeFrontmatter({ status: "nonsense" }, "x").status).toBe("draft");
  });

  it("accepts published only for the exact string", () => {
    expect(normalizeFrontmatter({ status: "published" }, "x").status).toBe("published");
    expect(normalizeFrontmatter({ status: "Published" }, "x").status).toBe("draft");
  });

  it("parses reviewNotes from an array and from a comma string", () => {
    expect(normalizeFrontmatter({ reviewNotes: ["a", "b"] }, "x").reviewNotes).toEqual(["a", "b"]);
    expect(normalizeFrontmatter({ reviewNotes: "a, b" }, "x").reviewNotes).toEqual(["a", "b"]);
    expect(normalizeFrontmatter({}, "x").reviewNotes).toEqual([]);
  });

  it("falls back title to slug and category to Uncategorized", () => {
    const fm = normalizeFrontmatter({}, "apple-pie");
    expect(fm.title).toBe("apple-pie");
    expect(fm.category).toBe("Uncategorized");
  });
});

function meta(slug: string, status: "draft" | "published"): RecipeMeta {
  return {
    slug,
    frontmatter: normalizeFrontmatter({ title: slug, status }, slug),
  };
}

describe("filterByVisibility", () => {
  const recipes = [meta("a", "published"), meta("b", "draft"), meta("c", "published")];

  it("returns only published when drafts excluded", () => {
    const r = filterByVisibility(recipes, { includeDrafts: false });
    expect(r.map((x) => x.slug)).toEqual(["a", "c"]);
  });

  it("returns everything when drafts included", () => {
    const r = filterByVisibility(recipes, { includeDrafts: true });
    expect(r.map((x) => x.slug)).toEqual(["a", "b", "c"]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/richard/Developer/hudsonfam && bunx vitest run src/__tests__/lib/recipes.test.ts`
Expected: FAIL — `normalizeFrontmatter`/`filterByVisibility` are not exported (import error or "is not a function").

- [ ] **Step 3: Edit `src/lib/recipes.ts` — types, exports, normalization**

Replace the `RecipeFrontmatter` interface (lines 8–22 of current file) with:

```ts
export type RecipeStatus = "draft" | "published";

export interface RecipeFrontmatter {
  title: string;
  category: string;
  scans: string[];
  contributor: string;
  sourceNote?: string | null;
  servings?: string | null;
  prepTime?: string | null;
  cookTime?: string | null;
  ingredients: string[];
  instructions: string[];
  tags: string[];
  dateAdded: string;
  status: RecipeStatus;
  reviewNotes: string[];
}
```

Change the `normalizeFrontmatter` signature to be exported and replace its `transcribed` line with `status` + `reviewNotes`. The full function becomes:

```ts
export function normalizeFrontmatter(
  data: Record<string, unknown>,
  slug: string
): RecipeFrontmatter {
  return {
    title: (data.title as string) || slug,
    category: (data.category as string) || "Uncategorized",
    scans: toStringArray(data.scans),
    contributor: (data.contributor as string) || "Grandma Hudson",
    sourceNote: (data.sourceNote as string) || null,
    servings: (data.servings as string) || null,
    prepTime: (data.prepTime as string) || null,
    cookTime: (data.cookTime as string) || null,
    ingredients: toStringArray(data.ingredients),
    instructions: toStringArray(data.instructions),
    tags: toStringArray(data.tags),
    dateAdded: (data.dateAdded as string) || new Date().toISOString().split("T")[0],
    status: data.status === "published" ? "published" : "draft",
    reviewNotes: toStringArray(data.reviewNotes),
  };
}
```

Add the pure visibility helpers immediately after `normalizeFrontmatter`:

```ts
/** Whether drafts are visible in the current environment (true under `bun dev`). */
export function includeDrafts(): boolean {
  return process.env.NODE_ENV !== "production";
}

/** Pure visibility filter — kept separate from IO for unit testing. */
export function filterByVisibility(
  recipes: RecipeMeta[],
  opts: { includeDrafts: boolean }
): RecipeMeta[] {
  if (opts.includeDrafts) return recipes;
  return recipes.filter((r) => r.frontmatter.status === "published");
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/richard/Developer/hudsonfam && bunx vitest run src/__tests__/lib/recipes.test.ts`
Expected: PASS (4 + 2 assertions green).

- [ ] **Step 5: Commit**

```bash
cd /Users/richard/Developer/hudsonfam
git add src/lib/recipes.ts src/__tests__/lib/recipes.test.ts
git commit -m "feat(recipes): status model + reviewNotes in frontmatter

[hudsor01]"
```

---

## Task 2: Visibility-aware readers in the loader

**Files:**
- Modify: `src/lib/recipes.ts`

- [ ] **Step 1: Extract the raw reader**

In `src/lib/recipes.ts`, rename the existing exported `getAllRecipes` to an internal `readAllRecipes` (keep its body — read dir, ignore `_`/non-mdx, `Promise.allSettled`, sort by title — exactly as-is). Its signature:

```ts
async function readAllRecipes(): Promise<RecipeMeta[]> {
```

- [ ] **Step 2: Add the three public readers**

Immediately after `readAllRecipes`, add:

```ts
/** Public listing source: published always; drafts also included under `bun dev`. */
export async function getAllRecipes(): Promise<RecipeMeta[]> {
  const all = await readAllRecipes();
  return filterByVisibility(all, { includeDrafts: includeDrafts() });
}

/** Published recipes only, regardless of environment (listing grid + sitemap). */
export async function getPublishedRecipes(): Promise<RecipeMeta[]> {
  const all = await readAllRecipes();
  return all.filter((r) => r.frontmatter.status === "published");
}

/** Draft recipes only (dev-only "needs review" section). */
export async function getDraftRecipes(): Promise<RecipeMeta[]> {
  const all = await readAllRecipes();
  return all.filter((r) => r.frontmatter.status === "draft");
}
```

- [ ] **Step 3: Make drafts 404 in production in `getRecipeBySlug`**

In `getRecipeBySlug`, replace the success `return` block (currently returns `{ slug, frontmatter: normalizeFrontmatter(data, slug), content }`) with:

```ts
    const frontmatter = normalizeFrontmatter(data, slug);

    // Drafts are visible only under `bun dev`; 404 them in production.
    if (frontmatter.status === "draft" && !includeDrafts()) {
      return null;
    }

    return { slug, frontmatter, content };
```

- [ ] **Step 4: Point categories at published recipes**

Change `getAllCategories` first line from `const recipes = await getAllRecipes();` to:

```ts
  const recipes = await getPublishedRecipes();
```

- [ ] **Step 5: Verify types compile**

Run: `cd /Users/richard/Developer/hudsonfam && bunx tsc --noEmit 2>&1 | grep -E "recipes\.ts" || echo "no recipes.ts type errors"`
Expected: `no recipes.ts type errors`.

- [ ] **Step 6: Commit**

```bash
cd /Users/richard/Developer/hudsonfam
git add src/lib/recipes.ts
git commit -m "feat(recipes): published/draft readers + drafts 404 in prod

[hudsor01]"
```

---

## Task 3: Listing page — published grid + dev drafts section

**Files:**
- Modify: `src/components/public/recipe-card.tsx`
- Modify: `src/components/public/recipe-list.tsx`
- Modify: `src/app/(public)/recipes/page.tsx`

- [ ] **Step 1: Replace `transcribed` with `isDraft` on the card**

Rewrite `src/components/public/recipe-card.tsx` in full:

```tsx
import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

interface RecipeCardProps {
  slug: string;
  title: string;
  category: string;
  thumbnail?: string | null;
  isDraft?: boolean;
}

export function RecipeCard({
  slug,
  title,
  category,
  thumbnail,
  isDraft = false,
}: RecipeCardProps) {
  return (
    <article className="relative bg-card border border-border rounded-xl overflow-hidden h-full transition-all duration-200 hover:border-primary/30 hover:shadow-md hover:shadow-primary/10 group">
      <Link
        href={`/recipes/${slug}`}
        className="absolute inset-0 z-0"
        aria-label={`View recipe: ${title}`}
      />

      {thumbnail ? (
        <div className="aspect-[4/3] bg-background overflow-hidden">
          <Image
            src={thumbnail}
            alt={title}
            width={800}
            height={600}
            className="w-full h-full object-cover transition-all duration-500 group-hover:scale-105"
            unoptimized
          />
        </div>
      ) : (
        <div className="aspect-[4/3] bg-linear-to-br/oklch from-primary/5 to-accent/5 flex items-center justify-center">
          <span className="text-4xl font-serif text-primary/15">HF</span>
        </div>
      )}

      <div className="p-4 sm:p-5">
        <h3 className="text-base font-serif text-foreground mb-2 group-hover:text-primary transition-colors line-clamp-2 text-balance">
          {title}
        </h3>
        <div className="flex items-center justify-between gap-2">
          <Badge variant="primary">{category}</Badge>
          {isDraft && (
            <span className="text-xs text-warning italic">Needs review</span>
          )}
        </div>
      </div>
    </article>
  );
}
```

- [ ] **Step 2: Drop `transcribed` from the client list item type**

In `src/components/public/recipe-list.tsx`: remove `transcribed: boolean;` from the `RecipeListItem` interface, and remove the `transcribed={recipe.transcribed}` prop from the `<RecipeCard ... />` usage. Leave everything else unchanged.

- [ ] **Step 3: Rewrite the listing page**

Rewrite `src/app/(public)/recipes/page.tsx` in full:

```tsx
import {
  getPublishedRecipes,
  getDraftRecipes,
  getAllCategories,
  includeDrafts,
} from "@/lib/recipes";
import { RecipeList } from "@/components/public/recipe-list";
import { RecipeCard } from "@/components/public/recipe-card";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Hudson Recipes | Hudson Family",
  description:
    "Preserving Grandma Hudson's handwritten recipe book — original scanned pages alongside clean transcriptions, kept safe for every generation to come.",
};

export const revalidate = 300; // ISR: revalidate every 5 minutes

export default async function RecipesPage() {
  const published = await getPublishedRecipes();
  const categories = await getAllCategories();
  const drafts = includeDrafts() ? await getDraftRecipes() : [];

  const items = published.map((recipe) => ({
    slug: recipe.slug,
    title: recipe.frontmatter.title,
    category: recipe.frontmatter.category,
    thumbnail: recipe.frontmatter.scans[0] ?? null,
  }));

  return (
    <div className="max-w-5xl mx-auto px-5 sm:px-7 py-10 sm:py-14 motion-safe:animate-fade-in-up">
      <header className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-serif text-foreground font-normal mb-3 text-balance">
          Hudson Recipes
        </h1>
        <p className="text-muted-foreground text-pretty leading-relaxed max-w-2xl">
          Grandma Hudson&rsquo;s recipe book has fed this family for generations
          &mdash; pages worn soft, corners stained with butter and flour. Before
          that handwriting fades for good, we&rsquo;re digitizing every page:
          the original scan kept beside a clean transcription, so these recipes
          live on long after the paper doesn&rsquo;t.
        </p>
      </header>

      {items.length > 0 ? (
        <RecipeList recipes={items} categories={categories} />
      ) : (
        <div className="text-center py-16">
          <p className="text-lg font-serif text-foreground mb-2">No recipes yet</p>
          <p className="text-sm text-muted-foreground">
            We&rsquo;re still scanning Grandma Hudson&rsquo;s book. Check back
            soon for the first recipe.
          </p>
        </div>
      )}

      {drafts.length > 0 && (
        <section className="mt-16 pt-8 border-t border-dashed border-warning/40">
          <h2 className="text-sm font-sans font-semibold tracking-[2px] text-warning uppercase mb-1">
            Drafts &mdash; needs review ({drafts.length})
          </h2>
          <p className="text-xs text-text-dim mb-6">
            Visible only in local development. Review each against its scan, then
            set <code>status: published</code>.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {drafts.map((recipe) => (
              <RecipeCard
                key={recipe.slug}
                slug={recipe.slug}
                title={recipe.frontmatter.title}
                category={recipe.frontmatter.category}
                thumbnail={recipe.frontmatter.scans[0] ?? null}
                isDraft
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Verify typecheck**

Run: `cd /Users/richard/Developer/hudsonfam && bunx tsc --noEmit 2>&1 | grep -E "recipe-card|recipe-list|recipes/page" || echo "no listing type errors"`
Expected: `no listing type errors`.

- [ ] **Step 5: Commit**

```bash
cd /Users/richard/Developer/hudsonfam
git add src/components/public/recipe-card.tsx src/components/public/recipe-list.tsx "src/app/(public)/recipes/page.tsx"
git commit -m "feat(recipes): published grid + dev-only drafts section

[hudsor01]"
```

---

## Task 4: Detail page — status + dev review callout

**Files:**
- Modify: `src/app/(public)/recipes/[slug]/page.tsx`

- [ ] **Step 1: Update the destructure**

In the `RecipePage` component, change the frontmatter destructure: remove `transcribed,` and add `status,` and `reviewNotes,`. The block becomes:

```tsx
  const { frontmatter, content } = recipe;
  const {
    title,
    category,
    scans,
    contributor,
    sourceNote,
    servings,
    prepTime,
    cookTime,
    ingredients,
    instructions,
    status,
    reviewNotes,
  } = frontmatter;
```

- [ ] **Step 2: Add the dev review callout after the JSON-LD `<script>`**

Immediately after the `<script type="application/ld+json" ... />` element, insert:

```tsx
      {/* Draft review banner — only ever rendered in dev (drafts 404 in prod). */}
      {status === "draft" && (
        <div className="mb-8 rounded-xl border border-warning/50 bg-warning/10 p-5">
          <p className="text-sm font-semibold text-warning mb-1">
            Draft — needs review
          </p>
          <p className="text-sm text-muted-foreground text-pretty">
            Compare this transcription against the original scan, then set{" "}
            <code>status: published</code> in the recipe&rsquo;s frontmatter.
          </p>
          {reviewNotes.length > 0 && (
            <ul className="list-disc list-inside mt-3 space-y-1 text-sm text-foreground">
              {reviewNotes.map((note, i) => (
                <li key={i} className="leading-relaxed">{note}</li>
              ))}
            </ul>
          )}
        </div>
      )}
```

- [ ] **Step 3: Remove the `transcribed` pending marker in the header**

In the recipe header, delete this block:

```tsx
          {!transcribed && (
            <span className="text-sm text-text-dim italic">
              Transcription pending
            </span>
          )}
```

…leaving the `<Badge variant="primary">{category}</Badge>` as the only child of that `flex` div.

- [ ] **Step 4: Always render the structured transcription**

Replace the entire transcription conditional (the `{transcribed ? ( ... ) : ( ...coming soon... )}` block) with the always-on version:

```tsx
          <div className="flex flex-col gap-8">
            {ingredients.length > 0 && (
              <div>
                <h3 className="text-xl font-serif text-foreground font-normal mb-3">
                  Ingredients
                </h3>
                <ul className="list-disc list-inside text-foreground space-y-1.5 pl-1">
                  {ingredients.map((item, i) => (
                    <li key={i} className="leading-relaxed">{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {instructions.length > 0 && (
              <div>
                <h3 className="text-xl font-serif text-foreground font-normal mb-3">
                  Instructions
                </h3>
                <ol className="list-decimal list-inside text-foreground space-y-3 pl-1">
                  {instructions.map((step, i) => (
                    <li key={i} className="leading-relaxed pl-1">{step}</li>
                  ))}
                </ol>
              </div>
            )}

            {ingredients.length === 0 && instructions.length === 0 && (
              <p className="text-sm text-muted-foreground italic">
                No structured ingredients or instructions yet — see the original
                scan alongside.
              </p>
            )}
          </div>
```

- [ ] **Step 5: Verify typecheck**

Run: `cd /Users/richard/Developer/hudsonfam && bunx tsc --noEmit 2>&1 | grep -E "recipes/\[slug\]" || echo "no detail type errors"`
Expected: `no detail type errors`.

- [ ] **Step 6: Commit**

```bash
cd /Users/richard/Developer/hudsonfam
git add "src/app/(public)/recipes/[slug]/page.tsx"
git commit -m "feat(recipes): detail page status model + dev review callout

[hudsor01]"
```

---

## Task 5: Image optimizer script (sharp)

**Files:**
- Create: `scripts/optimize-scan.ts`
- Modify: `package.json`

- [ ] **Step 1: Create `scripts/optimize-scan.ts`**

```ts
/**
 * Optimize the original page scans for one recipe to a web-friendly size.
 *
 * Reads every image in public/images/recipes/<slug>/, auto-orients via EXIF,
 * downscales the long edge to at most MAX_EDGE px (never upscales), re-encodes
 * to high-quality JPEG, and rewrites them as page-1.jpg, page-2.jpg, ... in
 * numeric/alpha order. Originals are replaced in place (keep your phone's
 * full-res copies as the master backup).
 *
 * Usage:
 *   bun run optimize:scan <slug>
 *   # e.g. bun run optimize:scan grandma-hudson-apple-pie
 */

import fs from "fs/promises";
import path from "path";
import sharp from "sharp";

const MAX_EDGE = 2000;
const QUALITY = 82;
const IMAGE_EXTS = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif", ".heic", ".tif", ".tiff"]);

async function main() {
  const slug = process.argv[2]?.trim();
  if (!slug || !/^[a-z0-9][a-z0-9-]*$/.test(slug)) {
    console.error("[optimize:scan] Usage: bun run optimize:scan <slug>  (lowercase-hyphen slug)");
    process.exit(1);
  }

  const dir = path.join(process.cwd(), "public", "images", "recipes", slug);

  let entries: string[];
  try {
    entries = await fs.readdir(dir);
  } catch {
    console.error(`[optimize:scan] No folder at public/images/recipes/${slug}/`);
    process.exit(1);
  }

  const sources = entries
    .filter((f) => IMAGE_EXTS.has(path.extname(f).toLowerCase()))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  if (sources.length === 0) {
    console.error(`[optimize:scan] No image files in public/images/recipes/${slug}/`);
    process.exit(1);
  }

  // Encode all sources first (read fully into buffers) so we can safely
  // delete originals and rewrite page-N.jpg without read/write collisions.
  const buffers: Buffer[] = [];
  for (const file of sources) {
    const buf = await sharp(path.join(dir, file))
      .rotate()
      .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: QUALITY, mozjpeg: true })
      .toBuffer();
    buffers.push(buf);
  }

  // Remove the originals, then write normalized page-N.jpg files.
  await Promise.all(sources.map((f) => fs.unlink(path.join(dir, f))));
  for (let i = 0; i < buffers.length; i++) {
    await fs.writeFile(path.join(dir, `page-${i + 1}.jpg`), buffers[i]);
  }

  console.log(
    `[optimize:scan] ${slug}: optimized ${buffers.length} page(s) -> page-1.jpg … page-${buffers.length}.jpg (<=${MAX_EDGE}px, q${QUALITY}).`
  );
}

main().catch((e) => {
  console.error("[optimize:scan] Unexpected error:", e);
  process.exit(1);
});
```

- [ ] **Step 2: Add the package.json script**

In `package.json` `scripts`, add after the `scaffold:recipe` line:

```json
    "optimize:scan": "bun scripts/optimize-scan.ts",
```

- [ ] **Step 3: Smoke-test the script end to end**

```bash
cd /Users/richard/Developer/hudsonfam
mkdir -p public/images/recipes/_smoke
bunx tsx -e "require('sharp')({create:{width:3000,height:4000,channels:3,background:{r:200,g:180,b:150}}}).jpeg().toFile('public/images/recipes/_smoke/raw.jpg').then(()=>console.log('made'))" 2>/dev/null || bun -e "import sharp from 'sharp'; await sharp({create:{width:3000,height:4000,channels:3,background:{r:200,g:180,b:150}}}).jpeg().toFile('public/images/recipes/_smoke/raw.jpg'); console.log('made')"
bun run optimize:scan _smoke 2>&1 || true
```

Note: `_smoke` fails the slug regex (leading underscore) by design — instead test with a valid slug:

```bash
cd /Users/richard/Developer/hudsonfam
mkdir -p public/images/recipes/smoke-test
bun -e "import sharp from 'sharp'; await sharp({create:{width:3000,height:4000,channels:3,background:{r:200,g:180,b:150}}}).jpeg().toFile('public/images/recipes/smoke-test/raw.jpg'); console.log('made source')"
bun run optimize:scan smoke-test
bun -e "import sharp from 'sharp'; const m = await sharp('public/images/recipes/smoke-test/page-1.jpg').metadata(); console.log('result', m.width, 'x', m.height)"
```

Expected: `made source`, then `[optimize:scan] smoke-test: optimized 1 page(s) -> page-1.jpg`, then `result 1500 x 2000` (long edge clamped to 2000).

- [ ] **Step 4: Clean up the smoke fixture**

```bash
cd /Users/richard/Developer/hudsonfam && rm -rf public/images/recipes/smoke-test public/images/recipes/_smoke
```

- [ ] **Step 5: Commit**

```bash
cd /Users/richard/Developer/hudsonfam
git add scripts/optimize-scan.ts package.json
git commit -m "feat(recipes): sharp scan optimizer script

[hudsor01]"
```

---

## Task 6: Progress ledger, status script, inbox folder

**Files:**
- Create: `scripts/recipes-status.ts`
- Create: `content/recipes/_PROGRESS.md`
- Create: `public/images/recipes/_inbox/.gitkeep`
- Modify: `package.json`

- [ ] **Step 1: Create `scripts/recipes-status.ts`**

```ts
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
```

Note on the import: `recipes.ts` uses the `@/` alias inside Next, but Bun scripts don't resolve `@/` by default. Use the relative path `../src/lib/recipes` (shown above) — `recipes.ts` itself imports only `fs`, `path`, and `gray-matter`, all Bun-resolvable, so this works standalone.

- [ ] **Step 2: Add the package.json script**

In `package.json` `scripts`, add after the `optimize:scan` line:

```json
    "recipes:status": "bun scripts/recipes-status.ts",
```

- [ ] **Step 3: Create the inbox folder marker**

```bash
cd /Users/richard/Developer/hudsonfam
mkdir -p public/images/recipes/_inbox
printf '' > public/images/recipes/_inbox/.gitkeep
```

- [ ] **Step 4: Create `content/recipes/_PROGRESS.md`**

```markdown
# Hudson Recipes — Digitization Progress

Ledger for the bulk digitization of Grandma Hudson's recipe book. Updated by the
assistant after each batch. Run `bun run recipes:status` for live counts.

## Snapshot

- **Estimated total in book:** ~300–400
- **Published:** 1
- **Drafts (awaiting review):** 0
- **Last batch processed:** none yet

## Batch log

| Date | Photos in batch | Recipes created | Notes |
|------|-----------------|-----------------|-------|
| 2026-06-01 | — | — | Pipeline set up; example recipe published. |

## Awaiting review

_(none — drafts will be listed here by slug until approved)_
```

- [ ] **Step 5: Verify the status script runs**

Run: `cd /Users/richard/Developer/hudsonfam && bun run recipes:status`
Expected: prints counts; `Published: 1` after Task 7 publishes the example (before Task 7 the example still uses `transcribed` and normalizes to `status: draft`, so it may report `Drafts (review): 1` here — that is expected and corrected in Task 7).

- [ ] **Step 6: Commit**

```bash
cd /Users/richard/Developer/hudsonfam
git add scripts/recipes-status.ts content/recipes/_PROGRESS.md public/images/recipes/_inbox/.gitkeep package.json
git commit -m "feat(recipes): progress ledger, status script, inbox folder

[hudsor01]"
```

---

## Task 7: Migrate authoring assets to the status model

**Files:**
- Modify: `scripts/scaffold-recipe.ts`
- Modify: `content/recipes/_TEMPLATE.mdx`
- Modify: `content/recipes/grandma-hudson-buttermilk-biscuits.mdx`

- [ ] **Step 1: Update the scaffolder output**

In `scripts/scaffold-recipe.ts`, change the generated frontmatter template string. Replace the `transcribed: false` line with the two lines:

```
status: "draft"
reviewNotes: []
```

…and update the trailing HTML comment in the generated MDX from the `transcribed: true` wording to:

```
<!-- Draft. Fill in ingredients/instructions above, add any reviewNotes for the
     reviewer, then set status: "published" once verified against the scan. -->
```

Also update the final console hint string `"…then set transcribed: true."` to `"…then set status: \"published\" once verified."`.

- [ ] **Step 2: Update the template**

In `content/recipes/_TEMPLATE.mdx`, replace the final two frontmatter lines (the `transcribed:` comment block + `transcribed: false`) with:

```
# REQUIRED: "draft" or "published". New recipes start as "draft" — they show
# only under `bun dev` for review and 404 in production. Set "published" once
# you've verified the transcription against the scan.
status: "draft"

# OPTIONAL: notes for the reviewer — words you're unsure of, ambiguous amounts,
# etc. Shown in the dev-only review banner. Clear them once resolved.
reviewNotes:
  - "Example: '1 c. ?our' — flour or sugar?"
```

- [ ] **Step 3: Publish the example recipe**

In `content/recipes/grandma-hudson-buttermilk-biscuits.mdx`, change the frontmatter line `transcribed: true` to:

```
status: "published"
```

- [ ] **Step 4: Verify the example is published and template is ignored**

Run: `cd /Users/richard/Developer/hudsonfam && bun run recipes:status`
Expected: `Published: 1`, `Drafts (review): 0`.

- [ ] **Step 5: Commit**

```bash
cd /Users/richard/Developer/hudsonfam
git add scripts/scaffold-recipe.ts content/recipes/_TEMPLATE.mdx content/recipes/grandma-hudson-buttermilk-biscuits.mdx
git commit -m "feat(recipes): migrate scaffolder, template, example to status model

[hudsor01]"
```

---

## Task 8: Add published recipes to the sitemap

**Files:**
- Modify: `src/app/sitemap.ts`

- [ ] **Step 1: Import the published reader**

At the top of `src/app/sitemap.ts`, after `import { getAllPosts } from "@/lib/blog";`, add:

```ts
import { getPublishedRecipes } from "@/lib/recipes";
```

- [ ] **Step 2: Add a static `/recipes` entry**

In the `staticPages` array, add this object after the `/photos` entry:

```ts
    {
      url: `${SITE_URL}/recipes`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
```

- [ ] **Step 3: Add per-recipe entries**

After the `blogPages` block (before the `albumPages` block), add:

```ts
  // Recipes (published only — drafts are excluded by getPublishedRecipes)
  const recipes = await getPublishedRecipes();
  const recipePages: MetadataRoute.Sitemap = recipes.map((recipe) => ({
    url: `${SITE_URL}/recipes/${recipe.slug}`,
    lastModified: new Date(recipe.frontmatter.dateAdded),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));
```

- [ ] **Step 4: Include them in the return**

Change the final `return` to:

```ts
  return [...staticPages, ...blogPages, ...recipePages, ...albumPages];
```

- [ ] **Step 5: Verify typecheck**

Run: `cd /Users/richard/Developer/hudsonfam && bunx tsc --noEmit 2>&1 | grep -E "sitemap" || echo "no sitemap type errors"`
Expected: `no sitemap type errors`.

- [ ] **Step 6: Commit**

```bash
cd /Users/richard/Developer/hudsonfam
git add src/app/sitemap.ts
git commit -m "feat(recipes): include published recipes in sitemap

[hudsor01]"
```

---

## Task 9: Full verification

**Files:** none (verification only)

- [ ] **Step 1: Unit tests pass**

Run: `cd /Users/richard/Developer/hudsonfam && bunx vitest run src/__tests__/lib/recipes.test.ts`
Expected: all tests PASS.

- [ ] **Step 2: No new type errors**

Run: `cd /Users/richard/Developer/hudsonfam && bunx tsc --noEmit 2>&1 | grep -E "recipe|sitemap" || echo "clean"`
Expected: `clean` (preexisting unrelated errors elsewhere are acceptable; nothing in recipe/sitemap files).

- [ ] **Step 3: Production build excludes drafts**

First add a temporary draft to prove exclusion:

```bash
cd /Users/richard/Developer/hudsonfam
mkdir -p public/images/recipes/_verify-draft
cp content/recipes/grandma-hudson-buttermilk-biscuits.mdx content/recipes/_verify-draft-recipe.mdx
# make it a draft + unique slug-safe filename
```

Rename and flip status: copy to `content/recipes/zzz-verify-draft.mdx`, change its frontmatter `status: "published"` → `status: "draft"`, then build:

```bash
cd /Users/richard/Developer/hudsonfam
sed 's/status: "published"/status: "draft"/' content/recipes/grandma-hudson-buttermilk-biscuits.mdx > content/recipes/zzz-verify-draft.mdx
rm -f content/recipes/_verify-draft-recipe.mdx
bun run build 2>&1 | grep -E "/recipes" || true
```

Expected: build succeeds; the route list shows `/recipes/grandma-hudson-buttermilk-biscuits` prerendered but **NOT** `/recipes/zzz-verify-draft`.

- [ ] **Step 4: Dev shows the draft**

```bash
cd /Users/richard/Developer/hudsonfam
( bun dev & echo $! > /tmp/recipes-dev.pid ) ; sleep 8
curl -s -o /dev/null -w "draft in dev: %{http_code}\n" http://localhost:3000/recipes/zzz-verify-draft
kill "$(cat /tmp/recipes-dev.pid)" 2>/dev/null || true
```

Expected: `draft in dev: 200` (the draft renders in dev).

- [ ] **Step 5: Remove the verification draft**

```bash
cd /Users/richard/Developer/hudsonfam
rm -f content/recipes/zzz-verify-draft.mdx
rm -rf public/images/recipes/_verify-draft
git status --porcelain
```

Expected: working tree clean (only the committed feature changes remain).

- [ ] **Step 6: Final confirmation**

Run: `cd /Users/richard/Developer/hudsonfam && bun run recipes:status && git log --oneline -8 | cat`
Expected: `Published: 1`, `Drafts: 0`; the 8 task commits present.

---

## Self-Review

**Spec coverage:**
- Schema refactor (`transcribed` → `status` + `reviewNotes`) → Task 1, Task 7 ✔
- Loader dev/prod draft filtering + `getDraftRecipes()` → Task 2 ✔
- Detail page draft 404-in-prod + dev review callout → Task 2 (404) + Task 4 (callout) ✔
- Listing dev-only drafts section + sitemap exclusion → Task 3 + Task 8 ✔
- `scripts/optimize-scan.ts` (sharp) → Task 5 ✔
- `_inbox/` + `_PROGRESS.md` + `recipes:status` → Task 6 ✔
- Update README/`_TEMPLATE`/example/scaffold to status model → Task 7 ✔ (README note below)
- Example bumped to published → Task 7 ✔

**Gap fixed inline:** The spec lists updating `content/recipes/README.md`. The README's authoring instructions reference the old `transcribed` flag. Add to **Task 7** a Step (between current Steps 3 and 4): "Update `content/recipes/README.md` — replace every mention of `transcribed: true/false` with the `status: "draft"|"published"` model and the `reviewNotes` field; document the batch loop (`_inbox/` → `optimize:scan` → `scaffold:recipe` → review in `bun dev` → set `status: published`)." Add `content/recipes/README.md` to the Task 7 Step 5 `git add`.

**Placeholder scan:** No TBD/TODO; all code blocks complete; commands have expected output.

**Type consistency:** `RecipeStatus`, `status`, `reviewNotes`, `includeDrafts()`, `filterByVisibility()`, `getPublishedRecipes()`, `getDraftRecipes()`, `getAllRecipes()`, `readAllRecipes()`, `normalizeFrontmatter()` are used consistently across tasks. `RecipeCard` prop renamed `transcribed`→`isDraft` and updated in both the component (Task 3.1) and both call sites (Task 3.2 list, Task 3.3 drafts section).
