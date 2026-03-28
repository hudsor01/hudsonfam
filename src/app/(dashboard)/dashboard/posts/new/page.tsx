import { SectionHeader } from "@/components/ui/section-header";
import { DashboardBreadcrumbs } from "@/components/dashboard/breadcrumbs";
import { PostForm } from "../post-form";
import { createPost } from "@/lib/dashboard-actions";

export default function NewPostPage() {
  return (
    <div>
      <DashboardBreadcrumbs items={[{ label: "Posts", href: "/dashboard/posts" }, { label: "New Post" }]} />
      <SectionHeader title="New Post" subtitle="Create a new blog post" />
      <div className="mt-6">
        <PostForm action={createPost} />
      </div>
    </div>
  );
}
