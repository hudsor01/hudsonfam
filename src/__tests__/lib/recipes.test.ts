import { describe, it, expect } from "vitest";
import { normalizeFrontmatter, filterByVisibility, computeChapterNeighbors, anchor } from "@/lib/recipes";
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

function chapterMeta(slug: string, category: string, order: number): RecipeMeta {
  return {
    slug,
    frontmatter: normalizeFrontmatter(
      { title: `${slug} title`, status: "published", category, order },
      slug
    ),
  };
}

describe("computeChapterNeighbors", () => {
  // Two categories: "Soups" (order 1,2,3) and "Desserts" (order 4,5)
  const recipes: RecipeMeta[] = [
    chapterMeta("soup-a", "Soups", 1),
    chapterMeta("soup-b", "Soups", 2),
    chapterMeta("soup-c", "Soups", 3),
    chapterMeta("dessert-a", "Desserts", 4),
    chapterMeta("dessert-b", "Desserts", 5),
  ];

  it("returns prev=null for the first item in a chapter", () => {
    const result = computeChapterNeighbors(recipes, "soup-a");
    expect(result.prev).toBeNull();
    expect(result.next).toEqual({ slug: "soup-b", title: "soup-b title" });
  });

  it("returns next=null for the last item in a chapter", () => {
    const result = computeChapterNeighbors(recipes, "soup-c");
    expect(result.prev).toEqual({ slug: "soup-b", title: "soup-b title" });
    expect(result.next).toBeNull();
  });

  it("returns both prev and next for a middle item", () => {
    const result = computeChapterNeighbors(recipes, "soup-b");
    expect(result.prev).toEqual({ slug: "soup-a", title: "soup-a title" });
    expect(result.next).toEqual({ slug: "soup-c", title: "soup-c title" });
  });

  it("returns { prev: null, next: null } for an unknown slug", () => {
    const result = computeChapterNeighbors(recipes, "does-not-exist");
    expect(result.prev).toBeNull();
    expect(result.next).toBeNull();
  });

  it("does not cross chapter boundaries", () => {
    // dessert-a is first in Desserts — prev should be null, not soup-c
    const result = computeChapterNeighbors(recipes, "dessert-a");
    expect(result.prev).toBeNull();
    expect(result.next).toEqual({ slug: "dessert-b", title: "dessert-b title" });
  });
});

describe("anchor", () => {
  it("lowercases and replaces non-alphanumeric with hyphens", () => {
    expect(anchor("Main Dishes")).toBe("main-dishes");
    expect(anchor("Soups & Stews")).toBe("soups-stews");
  });

  it("trims leading and trailing hyphens", () => {
    expect(anchor("  Breakfast  ")).toBe("breakfast");
    expect(anchor("(Cakes)")).toBe("cakes");
  });
});
