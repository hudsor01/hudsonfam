export const dynamic = "force-dynamic";

import prisma from "@/lib/prisma";
import { Hero } from "@/components/public/hero";
import { FeaturedPost } from "@/components/public/featured-post";
import { PostCard } from "@/components/public/post-card";
import { Sidebar } from "@/components/public/sidebar";
import { SectionHeader } from "@/components/ui/section-header";
import { getAllPosts } from "@/lib/blog";
import { Separator } from "@/components/ui/separator";

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default async function HomePage() {
  // Fetch blog posts from MDX files
  const allPosts = await getAllPosts();
  const publishedPosts = allPosts.filter(
    (post) => post.frontmatter.date <= new Date().toISOString().split("T")[0]
  );

  const featuredPost = publishedPosts[0] || null;
  const recentPosts = publishedPosts.slice(1, 5);

  // Fetch upcoming events from database
  const events = await prisma.event.findMany({
    where: {
      visibility: "PUBLIC",
      startDate: { gte: new Date() },
    },
    orderBy: { startDate: "asc" },
    take: 5,
    select: {
      id: true,
      title: true,
      startDate: true,
      location: true,
    },
  });

  // Fetch latest photos from database
  const photos = await prisma.photo.findMany({
    orderBy: { createdAt: "desc" },
    take: 6,
    select: {
      id: true,
      thumbnailPath: true,
      title: true,
    },
  });

  const sidebarEvents = events.map((e) => ({
    id: e.id,
    title: e.title,
    date: e.startDate.toISOString(),
    location: e.location,
  }));

  const sidebarPhotos = photos.map((p) => ({
    id: p.id,
    thumbnailPath: p.thumbnailPath,
    title: p.title,
  }));

  return (
    <div>
      <Hero />

      <Separator />

      <div className="max-w-7xl mx-auto px-5 sm:px-7 py-10 sm:py-14">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8 lg:gap-10">
          {/* Main Content */}
          <div className="space-y-10">
            {/* Featured Post */}
            {featuredPost && (
              <section>
                <SectionHeader label="Featured" />
                <FeaturedPost
                  slug={featuredPost.slug}
                  title={featuredPost.frontmatter.title}
                  excerpt={featuredPost.frontmatter.excerpt}
                  date={formatDate(featuredPost.frontmatter.date)}
                  author={featuredPost.frontmatter.author}
                  tags={featuredPost.frontmatter.tags}
                  coverImage={featuredPost.frontmatter.coverImage}
                  readingTime={featuredPost.readingTime}
                />
              </section>
            )}

            {/* Recent Posts Grid */}
            {recentPosts.length > 0 && (
              <section>
                <SectionHeader
                  label="Recent"
                  action={{ text: "View all", href: "/blog" }}
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {recentPosts.map((post) => (
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
              </section>
            )}

            {/* Empty state when no posts */}
            {publishedPosts.length === 0 && (
              <section className="text-center py-16">
                <p className="text-lg font-serif text-text mb-2">
                  Coming Soon
                </p>
                <p className="text-sm text-text-muted">
                  We&apos;re working on our first posts. Check back soon!
                </p>
              </section>
            )}
          </div>

          {/* Sidebar */}
          <Sidebar events={sidebarEvents} photos={sidebarPhotos} />
        </div>
      </div>
    </div>
  );
}
