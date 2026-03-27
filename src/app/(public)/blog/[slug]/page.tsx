import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import { getPostBySlug, getAllPosts } from "@/lib/blog";
import { mdxComponents } from "@/components/public/mdx-components";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import type { Metadata } from "next";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const posts = await getAllPosts();
  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) return { title: "Post Not Found" };

  return {
    title: post.frontmatter.title,
    description: post.frontmatter.excerpt,
    openGraph: {
      title: post.frontmatter.title,
      description: post.frontmatter.excerpt,
      type: "article",
      publishedTime: new Date(post.frontmatter.date).toISOString(),
      authors: [post.frontmatter.author],
      ...(post.frontmatter.coverImage
        ? { images: [post.frontmatter.coverImage] }
        : {}),
    },
    twitter: {
      card: post.frontmatter.coverImage ? "summary_large_image" : "summary",
      title: post.frontmatter.title,
      description: post.frontmatter.excerpt,
      ...(post.frontmatter.coverImage
        ? { images: [post.frontmatter.coverImage] }
        : {}),
    },
  };
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const formattedDate = new Date(post.frontmatter.date).toLocaleDateString(
    "en-US",
    { year: "numeric", month: "long", day: "numeric" }
  );

  return (
    <article className="max-w-3xl mx-auto px-5 sm:px-7 py-10 sm:py-14">
      {/* Back link */}
      <Link
        href="/blog"
        className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-text transition-colors mb-8"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 19l-7-7 7-7"
          />
        </svg>
        Back to Blog
      </Link>

      {/* Post header */}
      <header className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-sm text-text-dim">{formattedDate}</span>
          <span className="text-sm text-text-dim">&bull;</span>
          <span className="text-sm text-text-dim">{post.readingTime}</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-serif text-text font-normal mb-3">
          {post.frontmatter.title}
        </h1>
        {post.frontmatter.excerpt && (
          <p className="text-text-muted text-lg italic leading-relaxed">
            {post.frontmatter.excerpt}
          </p>
        )}
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
          <div className="flex gap-2 flex-wrap">
            {post.frontmatter.tags.map((tag) => (
              <Link key={tag} href={`/blog?tag=${encodeURIComponent(tag)}`}>
                <Badge variant="primary">{tag}</Badge>
              </Link>
            ))}
          </div>
          <span className="text-sm text-text-dim">
            {post.frontmatter.author}
          </span>
        </div>
      </header>

      {/* Cover image */}
      {post.frontmatter.coverImage && (
        <div className="mb-8 rounded-xl overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={post.frontmatter.coverImage}
            alt={post.frontmatter.title}
            className="w-full"
          />
        </div>
      )}

      {/* MDX content */}
      <div className="prose-navy">
        <MDXRemote
          source={post.content}
          components={mdxComponents}
          options={{ mdxOptions: { remarkPlugins: [remarkGfm] } }}
        />
      </div>

      {/* Post footer */}
      <footer className="mt-12 pt-6 border-t border-border">
        <div className="flex items-center justify-between">
          <Link
            href="/blog"
            className="text-sm text-primary hover:text-primary/80 transition-colors"
          >
            &larr; More posts
          </Link>
          <p className="text-xs text-text-dim">
            Published {formattedDate} by {post.frontmatter.author}
          </p>
        </div>
      </footer>
    </article>
  );
}
