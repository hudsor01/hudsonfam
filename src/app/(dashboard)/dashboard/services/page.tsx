export const dynamic = "force-dynamic";

import { SectionHeader } from "@/components/ui/section-header";
import { checkFamilyServices, groupFamilyServices } from "@/lib/dashboard/health";
import { ServicesGrid } from "./services-grid";

export default async function ServicesPage() {
  const services = await checkFamilyServices();
  const grouped = groupFamilyServices(services);

  return (
    <div>
      <SectionHeader
        title="Services"
        subtitle="Family apps & tools"
      />
      <ServicesGrid initialServices={grouped} />
    </div>
  );
}
