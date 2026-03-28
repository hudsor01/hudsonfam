import { getAllPosts, getAllTags, getPostsByTag } from "@/lib/blog";
import { PostCard } from "@/components/public/post-card";
import { Badge } from "@/components/ui/badge";
import { SectionHeader } from "@/components/ui/section-header";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Blog | The Hudson Family",
  description: "Stories, thoughts, and updates from the Hudson family.",
};

export const revalidate = 300; // ISR: revalidate every 5 minutes

const POSTS_PER_PAGE = 6;

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default async function BlogPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const activeTag =
    typeof params.tag === "string" ? params.tag : undefined;
  const pageParam =
    typeof params.page === "string" ? parseInt(params.page, 10) : 1;
  const currentPage = isNaN(pageParam) || pageParam < 1 ? 1 : pageParam;

  // Get posts (filtered by tag if specified)
  const allPosts = activeTag
    ? await getPostsByTag(activeTag)
    : await getAllPosts();

  // Filter to published posts only
  const publishedPosts = allPosts.filter(
    (post) => post.frontmatter.date <= new Date().toISOString().split("T")[0]
  );

  // Pagination
  const totalPosts = publishedPosts.length;
  const totalPages = Math.max(1, Math.ceil(totalPosts / POSTS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * POSTS_PER_PAGE;
  const paginatedPosts = publishedPosts.slice(
    startIndex,
    startIndex + POSTS_PER_PAGE
  );

  // Get all tags for filter
  const allTags = await getAllTags();

  // Build pagination URL helper
  function pageUrl(page: number): string {
    const urlParams = new URLSearchParams();
    if (activeTag) urlParams.set("tag", activeTag);
    if (page > 1) urlParams.set("page", String(page));
    const qs = urlParams.toString();
    return `/blog${qs ? `?${qs}` : ""}`;
  }

  return (
    <div className="max-w-5xl mx-auto px-5 sm:px-7 py-10 sm:py-14 motion-safe:animate-fade-in-up">
      {/* Page header */}
      <header className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-serif text-foreground font-normal mb-2 text-balance">
          Blog
        </h1>
        <p className="text-muted-foreground text-pretty">
          Stories, thoughts, and updates from our family.
        </p>
      </header>

      {/* Tag filters */}
      {allTags.length > 0 && (
        <div className="mb-8">
          <div className="flex flex-wrap gap-2">
            <Link href="/blog">
              <Badge variant={!activeTag ? "primary" : "outline"}>
                All
              </Badge>
            </Link>
            {allTags.map((tag) => (
              <Link key={tag} href={`/blog?tag=${encodeURIComponent(tag)}`}>
                <Badge
                  variant={
                    activeTag?.toLowerCase() === tag.toLowerCase()
                      ? "primary"
                      : "outline"
                  }
                >
                  {tag}
                </Badge>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Active filter indicator */}
      {activeTag && (
        <div className="mb-6 flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            Showing posts tagged &ldquo;{activeTag}&rdquo;
          </span>
          <Link
            href="/blog"
            className="text-xs text-primary hover:text-primary/80 transition-colors"
          >
            Clear filter
          </Link>
        </div>
      )}

      {/* Posts grid */}
      {paginatedPosts.length > 0 ? (
        <>
          <SectionHeader
            label={activeTag ? `Tagged: ${activeTag}` : "All Posts"}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-10">
            {paginatedPosts.map((post) => (
              <PostCard
                key={post.slug}
                slug={post.slug}
                title={post.frontmatter.title}
                excerpt={post.frontmatter.excerpt}
                date={formatDate(post.frontmatter.date)}
                author={post.frontmatter.author}
                tags={post.frontmatter.tags}
                coverImage={post.frontmatter.coverImage}
                readingTime={post.readingTime}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <nav className="flex items-center justify-center gap-2">
              {safePage > 1 && (
                <Link
                  href={pageUrl(safePage - 1)}
                  className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground bg-card border border-border rounded-lg hover:border-primary/30 transition-colors"
                >
                  Previous
                </Link>
              )}

              {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                (page) => (
                  <Link
                    key={page}
                    href={pageUrl(page)}
                    className={`
                      px-3 py-2 text-sm rounded-lg transition-colors
                      ${
                        page === safePage
                          ? "bg-primary text-white"
                          : "text-muted-foreground hover:text-foreground bg-card border border-border hover:border-primary/30"
                      }
                    `}
                  >
                    {page}
                  </Link>
                )
              )}

              {safePage < totalPages && (
                <Link
                  href={pageUrl(safePage + 1)}
                  className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground bg-card border border-border rounded-lg hover:border-primary/30 transition-colors"
                >
                  Next
                </Link>
              )}
            </nav>
          )}
        </>
      ) : (
        <div className="text-center py-16">
          <p className="text-lg font-serif text-foreground mb-2">
            {activeTag ? "No posts with this tag" : "No posts yet"}
          </p>
          <p className="text-sm text-muted-foreground">
            {activeTag
              ? "Try a different tag or view all posts."
              : "Check back soon for our first blog post!"}
          </p>
          {activeTag && (
            <Link
              href="/blog"
              className="inline-block mt-4 text-sm text-primary hover:text-primary/80 transition-colors"
            >
              View all posts
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
