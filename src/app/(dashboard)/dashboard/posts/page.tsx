export const dynamic = "force-dynamic";

import prisma from "@/lib/prisma";
import { SectionHeader } from "@/components/ui/section-header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { deletePost } from "@/lib/dashboard-actions";
import { DeleteButton } from "@/components/ui/delete-button";

export default async function PostsPage() {
  const posts = await prisma.blogPost.findMany({
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div>
      <SectionHeader
        title="Posts"
        subtitle="Manage blog posts"
        action={{ text: "+ New Post", href: "/dashboard/posts/new" }}
      />

      {posts.length === 0 ? (
        <Card padding="lg" className="text-center mt-6">
          <p className="text-text-muted text-sm">No posts yet.</p>
          <a
            href="/dashboard/posts/new"
            className="inline-block mt-3 text-sm text-primary hover:text-primary/80 transition-colors"
          >
            Create your first post
          </a>
        </Card>
      ) : (
        <div className="mt-6 space-y-2">
          {posts.map((post) => (
            <div
              key={post.id}
              className="flex items-center justify-between bg-surface border border-border rounded-lg px-5 py-3 hover:border-primary/30 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <a
                  href={`/dashboard/posts/${post.id}`}
                  className="text-sm text-text hover:text-primary truncate transition-colors"
                >
                  {post.title}
                </a>
                <Badge
                  variant={
                    post.status === "PUBLISHED" ? "primary" : "outline"
                  }
                >
                  {post.status.toLowerCase()}
                </Badge>
              </div>
              <div className="flex items-center gap-4 shrink-0 ml-4">
                <span className="text-xs text-text-dim">
                  {new Date(post.updatedAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
                <a
                  href={`/dashboard/posts/${post.id}`}
                  className="text-xs text-text-muted hover:text-text transition-colors"
                >
                  Edit
                </a>
                <DeleteButton
                  action={async () => {
                    "use server";
                    await deletePost(post.id);
                  }}
                  title="Delete post?"
                  description="This will permanently delete this blog post. This action cannot be undone."
                  successMessage="Post deleted"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
