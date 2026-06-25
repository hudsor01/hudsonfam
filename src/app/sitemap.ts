import type { MetadataRoute } from "next";
import { getPublishedRecipes } from "@/lib/recipes";
import prisma from "@/lib/prisma";

const SITE_URL = "https://thehudsonfam.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${SITE_URL}/photos`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/recipes`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/events`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/richard-hudson-sr`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.95,
    },
  ];

  // Recipes (published only — drafts are excluded by getPublishedRecipes)
  const recipes = await getPublishedRecipes();
  const recipePages: MetadataRoute.Sitemap = recipes.map((recipe) => ({
    url: `${SITE_URL}/recipes/${recipe.slug}`,
    lastModified: new Date(recipe.frontmatter.dateAdded),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  // Photo collections (kind:"album")
  let albumPages: MetadataRoute.Sitemap = [];
  try {
    const collections = await prisma.collection.findMany({
      where: { kind: "album" },
      select: { slug: true, createdAt: true },
    });
    albumPages = collections.map((collection) => ({
      url: `${SITE_URL}/photos/${collection.slug}`,
      lastModified: collection.createdAt,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    }));
  } catch {
    // DB not available during build — skip albums
  }

  return [...staticPages, ...recipePages, ...albumPages];
}
