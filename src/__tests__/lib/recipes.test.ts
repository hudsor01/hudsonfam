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
