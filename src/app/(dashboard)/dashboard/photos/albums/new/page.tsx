import { SectionHeader } from "@/components/ui/section-header";
import { DashboardBreadcrumbs } from "@/components/dashboard/breadcrumbs";
import { AlbumForm } from "../album-form";
import { createAlbum } from "@/lib/dashboard-actions";

export default function NewAlbumPage() {
  return (
    <div>
      <DashboardBreadcrumbs items={[{ label: "Photos", href: "/dashboard/photos" }, { label: "Albums", href: "/dashboard/photos/albums" }, { label: "New Album" }]} />
      <SectionHeader title="New Album" subtitle="Create a new photo album" />
      <div className="mt-6">
        <AlbumForm action={createAlbum} />
      </div>
    </div>
  );
}
