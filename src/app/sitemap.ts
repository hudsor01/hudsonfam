import type { MetadataRoute } from "next";
import { getAllPosts } from "@/lib/blog";
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
      url: `${SITE_URL}/blog`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/photos`,
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
      url: `${SITE_URL}/family`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
  ];

  // Blog posts
  const posts = await getAllPosts();
  const blogPages: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${SITE_URL}/blog/${post.slug}`,
    lastModified: new Date(post.frontmatter.date),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  // Photo albums
  let albumPages: MetadataRoute.Sitemap = [];
  try {
    const albums = await prisma.album.findMany({
      select: { slug: true, createdAt: true },
    });
    albumPages = albums.map((album) => ({
      url: `${SITE_URL}/photos/${album.slug}`,
      lastModified: album.createdAt,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    }));
  } catch {
    // DB not available during build — skip albums
  }

  return [...staticPages, ...blogPages, ...albumPages];
}
