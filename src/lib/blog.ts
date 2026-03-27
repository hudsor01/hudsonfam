import fs from "fs/promises";
import path from "path";
import matter from "gray-matter";

const BLOG_DIR = path.join(process.cwd(), "content", "blog");

export interface BlogFrontmatter {
  title: string;
  date: string;
  excerpt: string;
  tags: string[];
  coverImage?: string | null;
  author: string;
}

export interface BlogPostMeta {
  slug: string;
  frontmatter: BlogFrontmatter;
  readingTime: string;
}

export interface BlogPost extends BlogPostMeta {
  content: string;
}

function calculateReadingTime(content: string): string {
  const wordsPerMinute = 200;
  const words = content.trim().split(/\s+/).length;
  const minutes = Math.ceil(words / wordsPerMinute);
  return `${minutes} min read`;
}

export async function getAllPosts(): Promise<BlogPostMeta[]> {
  let files: string[];
  try {
    files = await fs.readdir(BLOG_DIR);
  } catch {
    return [];
  }

  const mdxFiles = files.filter((f) => f.endsWith(".mdx"));

  const posts = await Promise.all(
    mdxFiles.map(async (filename) => {
      const filePath = path.join(BLOG_DIR, filename);
      const raw = await fs.readFile(filePath, "utf-8");
      const { data, content } = matter(raw);
      const slug = filename.replace(/\.mdx$/, "");

      return {
        slug,
        frontmatter: {
          title: data.title || slug,
          date: data.date || new Date().toISOString().split("T")[0],
          excerpt: data.excerpt || "",
          tags: data.tags || [],
          coverImage: data.coverImage || null,
          author: data.author || "Hudson Family",
        },
        readingTime: calculateReadingTime(content),
      };
    })
  );

  // Sort by date descending (newest first)
  posts.sort(
    (a, b) =>
      new Date(b.frontmatter.date).getTime() -
      new Date(a.frontmatter.date).getTime()
  );

  return posts;
}

export async function getPostBySlug(slug: string): Promise<BlogPost | null> {
  const filePath = path.join(BLOG_DIR, `${slug}.mdx`);

  try {
    const raw = await fs.readFile(filePath, "utf-8");
    const { data, content } = matter(raw);

    return {
      slug,
      frontmatter: {
        title: data.title || slug,
        date: data.date || new Date().toISOString().split("T")[0],
        excerpt: data.excerpt || "",
        tags: data.tags || [],
        coverImage: data.coverImage || null,
        author: data.author || "Hudson Family",
      },
      content,
      readingTime: calculateReadingTime(content),
    };
  } catch {
    return null;
  }
}

export async function getAllTags(): Promise<string[]> {
  const posts = await getAllPosts();
  const tagSet = new Set<string>();
  for (const post of posts) {
    for (const tag of post.frontmatter.tags) {
      tagSet.add(tag);
    }
  }
  return Array.from(tagSet).sort();
}

export async function getPostsByTag(tag: string): Promise<BlogPostMeta[]> {
  const posts = await getAllPosts();
  return posts.filter((post) =>
    post.frontmatter.tags.some(
      (t) => t.toLowerCase() === tag.toLowerCase()
    )
  );
}
