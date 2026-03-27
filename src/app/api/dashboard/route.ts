import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { checkAllServices, groupServices } from "@/lib/dashboard/health";
import { getClusterMetrics } from "@/lib/dashboard/prometheus";
import { getServerStats } from "@/lib/dashboard/server";
import { getUpsStatus } from "@/lib/dashboard/ups";
import { getMediaStats } from "@/lib/dashboard/media";
import { getWeather } from "@/lib/dashboard/weather";

export async function GET() {
  // Auth check — owner only
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userRole = (session.user as { role?: string }).role || "member";
  if (userRole !== "owner") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Fetch all data in parallel
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

  return NextResponse.json({
    services: groupedServices,
    clusterMetrics,
    serverStats,
    upsStatus,
    mediaStats,
    weather,
    timestamp: new Date().toISOString(),
  });
}
