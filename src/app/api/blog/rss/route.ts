import { getAllPosts } from "@/lib/blog";

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

const SITE_URL = "https://thehudsonfam.com";

export async function GET() {
  const posts = await getAllPosts();

  const items = posts
    .map((post) => {
      const pubDate = new Date(post.frontmatter.date).toUTCString();
      const link = `${SITE_URL}/blog/${post.slug}`;

      return `    <item>
      <title>${escapeXml(post.frontmatter.title)}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <pubDate>${pubDate}</pubDate>
      <description>${escapeXml(post.frontmatter.excerpt)}</description>
      <author>${escapeXml(post.frontmatter.author)}</author>
${post.frontmatter.tags.map((tag) => `      <category>${escapeXml(tag)}</category>`).join("\n")}
    </item>`;
    })
    .join("\n");

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>The Hudson Family Blog</title>
    <link>${SITE_URL}/blog</link>
    <description>Stories, photos, and life updates from our corner of the world</description>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${SITE_URL}/api/blog/rss" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>`;

  return new Response(rss, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
