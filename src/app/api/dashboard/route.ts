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

  // Fetch all data in parallel with individual error isolation
  const [services, clusterMetrics, serverStats, upsStatus, mediaStats, weather] =
    await Promise.all([
      checkAllServices().catch(() => []),
      getClusterMetrics().catch(() => ({ pods: 0, namespaces: 0, cpuRequestPercent: 0, memoryUsagePercent: 0 })),
      getServerStats().catch(() => ({
        disk: { totalGb: 0, usedGb: 0, usedPercent: 0 },
        cpu: { usagePercent: 0, cores: 0 },
        memory: { totalGb: 0, usedGb: 0, usedPercent: 0 },
      })),
      getUpsStatus().catch(() => ({ status: "Unknown", batteryCharge: 0, load: 0, runtimeMinutes: 0 })),
      getMediaStats().catch(() => ({
        sonarr: { series: 0, queue: 0, missing: 0 },
        radarr: { movies: 0, queue: 0, missing: 0 },
        jellyfin: { movies: 0, shows: 0, episodes: 0, activeSessions: 0 },
      })),
      getWeather().catch(() => ({
        temperature: 0, feelsLike: 0, condition: "Unavailable",
        icon: "cloud", humidity: 0, windSpeed: 0, location: "Dallas, TX",
      })),
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
