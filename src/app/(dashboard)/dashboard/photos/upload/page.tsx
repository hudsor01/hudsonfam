export const dynamic = "force-dynamic";

import prisma from "@/lib/prisma";
import { SectionHeader } from "@/components/ui/section-header";
import { DashboardBreadcrumbs } from "@/components/dashboard/breadcrumbs";
import { UploadForm } from "./upload-form";

export default async function UploadPage() {
  const albums = await prisma.album.findMany({
    orderBy: { title: "asc" },
    select: { id: true, title: true },
  });

  return (
    <div>
      <DashboardBreadcrumbs items={[{ label: "Photos", href: "/dashboard/photos" }, { label: "Upload" }]} />
      <SectionHeader title="Upload Photos" subtitle="Add photos to your collection" />
      <div className="mt-6">
        <UploadForm albums={albums} />
      </div>
    </div>
  );
}
