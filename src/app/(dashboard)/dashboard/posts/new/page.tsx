import { SectionHeader } from "@/components/ui/section-header";
import { PostForm } from "../post-form";
import { createPost } from "@/lib/dashboard-actions";

export default function NewPostPage() {
  return (
    <div>
      <SectionHeader title="New Post" subtitle="Create a new blog post" />
      <div className="mt-6">
        <PostForm action={createPost} />
      </div>
    </div>
  );
}
