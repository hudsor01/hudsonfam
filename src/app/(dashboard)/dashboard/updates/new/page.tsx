import { SectionHeader } from "@/components/ui/section-header";
import { DashboardBreadcrumbs } from "@/components/dashboard/breadcrumbs";
import { UpdateForm } from "./update-form";

export default function NewUpdatePage() {
  return (
    <div>
      <DashboardBreadcrumbs items={[{ label: "Updates", href: "/dashboard/updates" }, { label: "New Update" }]} />
      <SectionHeader title="New Update" subtitle="Share what's happening" />
      <div className="mt-6">
        <UpdateForm />
      </div>
    </div>
  );
}
