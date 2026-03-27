import { SectionHeader } from "@/components/ui/section-header";
import { AlbumForm } from "../album-form";
import { createAlbum } from "@/lib/dashboard-actions";

export default function NewAlbumPage() {
  return (
    <div>
      <SectionHeader title="New Album" subtitle="Create a new photo album" />
      <div className="mt-6">
        <AlbumForm action={createAlbum} />
      </div>
    </div>
  );
}
