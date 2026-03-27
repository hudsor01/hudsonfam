import { checkAllServices, groupServices } from "@/lib/dashboard/health";
import { getClusterMetrics } from "@/lib/dashboard/prometheus";
import { getServerStats } from "@/lib/dashboard/server";
import { getUpsStatus } from "@/lib/dashboard/ups";
import { getMediaStats } from "@/lib/dashboard/media";
import { getWeather } from "@/lib/dashboard/weather";
import { DashboardClient } from "./admin-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminPage() {
  // Fetch all data server-side in parallel
  const [services, clusterMetrics, serverStats, upsStatus, mediaStats, weather] =
    await Promise.all([
      checkAllServices(),
      getClusterMetrics(),
      getServerStats(),
      getUpsStatus(),
      getMediaStats(),
      getWeather(),
    ]);

  const groupedServices = groupServices(services);

  const initialData = {
    services: groupedServices,
    clusterMetrics,
    serverStats,
    upsStatus,
    mediaStats,
    weather,
    timestamp: new Date().toISOString(),
  };

  return <DashboardClient initialData={initialData} />;
}
