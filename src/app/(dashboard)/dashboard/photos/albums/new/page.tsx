import { redirect } from "next/navigation";
import { SectionHeader } from "@/components/ui/section-header";
import { DashboardBreadcrumbs } from "@/components/dashboard/breadcrumbs";
import { CollectionForm } from "../collection-form";
import { createCollection } from "@/lib/collection-actions";

export default function NewCollectionPage() {
  async function handleCreate(input: { title: string; description?: string }) {
    "use server";
    await createCollection(input);
    redirect("/dashboard/photos/albums");
  }

  return (
    <div>
      <DashboardBreadcrumbs
        items={[
          { label: "Photos", href: "/dashboard/photos" },
          { label: "Collections", href: "/dashboard/photos/albums" },
          { label: "New Collection" },
        ]}
      />
      <SectionHeader title="New Collection" subtitle="Create a new photo collection" />
      <div className="mt-6">
        <CollectionForm action={handleCreate} />
      </div>
    </div>
  );
}
