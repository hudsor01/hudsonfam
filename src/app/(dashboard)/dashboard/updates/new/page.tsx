import { SectionHeader } from "@/components/ui/section-header";
import { UpdateForm } from "./update-form";

export default function NewUpdatePage() {
  return (
    <div>
      <SectionHeader title="New Update" subtitle="Share what's happening" />
      <div className="mt-6">
        <UpdateForm />
      </div>
    </div>
  );
}
