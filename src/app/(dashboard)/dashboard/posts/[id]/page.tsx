export const dynamic = "force-dynamic";

import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import { SectionHeader } from "@/components/ui/section-header";
import { PostForm } from "../post-form";
import { updatePost } from "@/lib/dashboard-actions";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditPostPage({ params }: Props) {
  const { id } = await params;

  const post = await prisma.blogPost.findUnique({
    where: { id },
  });

  if (!post) {
    notFound();
  }

  const boundUpdate = async (formData: FormData) => {
    "use server";
    await updatePost(id, formData);
  };

  return (
    <div>
      <SectionHeader title="Edit Post" subtitle={post.title} />
      <div className="mt-6">
        <PostForm
          action={boundUpdate}
          initial={{
            title: post.title,
            slug: post.slug,
            excerpt: post.excerpt,
            tags: post.tags,
            status: post.status,
            coverImage: post.coverImage,
          }}
        />
      </div>
    </div>
  );
}
