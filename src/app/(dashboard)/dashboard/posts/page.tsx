export const dynamic = "force-dynamic";

import Link from "next/link";
import prisma from "@/lib/prisma";
import { SectionHeader } from "@/components/ui/section-header";
import { Card } from "@/components/ui/card";
import { deletePost } from "@/lib/dashboard-actions";
import { PostsDataTable } from "./posts-data-table";

export default async function PostsPage() {
  const posts = await prisma.blogPost.findMany({
    orderBy: { updatedAt: "desc" },
  });

  const rows = posts.map((post) => ({
    id: post.id,
    title: post.title,
    status: post.status,
    updatedAt: post.updatedAt.toISOString(),
    deleteAction: (async () => {
      "use server";
      await deletePost(post.id);
    }) as () => Promise<void>,
  }));

  return (
    <div>
      <SectionHeader
        title="Posts"
        subtitle="Manage blog posts"
        action={{ text: "+ New Post", href: "/dashboard/posts/new" }}
      />

      {posts.length === 0 ? (
        <Card padding="lg" className="text-center mt-6">
          <p className="text-muted-foreground text-sm">No posts yet.</p>
          <Link
            href="/dashboard/posts/new"
            className="inline-block mt-3 text-sm text-primary hover:text-primary/80 transition-colors"
          >
            Create your first post
          </Link>
        </Card>
      ) : (
        <div className="mt-6">
          <PostsDataTable data={rows} />
        </div>
      )}
    </div>
  );
}
