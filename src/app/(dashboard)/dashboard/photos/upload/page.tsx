import prisma from "@/lib/prisma";
import { SectionHeader } from "@/components/ui/section-header";
import { connection } from "next/server";
import { DashboardBreadcrumbs } from "@/components/dashboard/breadcrumbs";
import { UploadForm } from "./upload-form";

export default async function UploadPage() {
  await connection();
  const collections = await prisma.collection.findMany({
    orderBy: { title: "asc" },
    select: { id: true, title: true, kind: true },
  });

  return (
    <div>
      <DashboardBreadcrumbs items={[{ label: "Photos", href: "/dashboard/photos" }, { label: "Upload" }]} />
      <SectionHeader title="Upload Photos" subtitle="Add photos to your collection" />
      <div className="mt-6">
        <UploadForm collections={collections} />
      </div>
    </div>
  );
}
