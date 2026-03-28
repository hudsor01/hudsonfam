"use client";

import { useEffect, useState, useCallback } from "react";
import type {
  ServiceHealth,
  ClusterMetrics as ClusterMetricsType,
  ServerStats as ServerStatsType,
  UpsStatus as UpsStatusType,
  MediaStats as MediaStatsType,
  WeatherData,
} from "@/lib/dashboard/types";
import { ServiceMonitor } from "@/components/dashboard/service-monitor";
import { ClusterMetrics } from "@/components/dashboard/cluster-metrics";
import { ServerStatsWidget } from "@/components/dashboard/server-stats";
import { UpsStatusWidget } from "@/components/dashboard/ups-status";
import { MediaStatsWidget } from "@/components/dashboard/media-stats";
import { WeatherWidget } from "@/components/dashboard/weather-widget";
import { Bookmarks } from "@/components/dashboard/bookmarks";

interface DashboardData {
  services: Record<string, ServiceHealth[]>;
  clusterMetrics: ClusterMetricsType;
  serverStats: ServerStatsType;
  upsStatus: UpsStatusType;
  mediaStats: MediaStatsType;
  weather: WeatherData;
  timestamp: string;
}

interface DashboardClientProps {
  initialData: DashboardData;
}

export function DashboardClient({ initialData }: DashboardClientProps) {
  const [data, setData] = useState<DashboardData>(initialData);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch("/api/dashboard");
      if (response.ok) {
        const newData = await response.json();
        setData(newData);
        setLastRefresh(new Date());
      }
    } catch {
      // Silently fail — keep showing stale data
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    const interval = setInterval(refresh, 60_000);
    return () => clearInterval(interval);
  }, [refresh]);

  const serviceGroups = Object.entries(data.services);

  return (
    <div className="space-y-6">
      {/* Header with refresh indicator */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif text-foreground">Homelab Dashboard</h1>
          <p className="text-sm text-text-dim mt-1">
            Last updated:{" "}
            {lastRefresh.toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
              hour12: true,
            })}
            {isRefreshing && (
              <span className="ml-2 text-primary">Refreshing...</span>
            )}
          </p>
        </div>
        <button
          onClick={refresh}
          disabled={isRefreshing}
          className="text-sm text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-md border border-border hover:bg-card transition-colors disabled:opacity-50"
        >
          Refresh
        </button>
      </div>

      {/* Row 1: Weather + Media Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-1">
          <WeatherWidget weather={data.weather} />
        </div>
        <div className="lg:col-span-3">
          <MediaStatsWidget stats={data.mediaStats} />
        </div>
      </div>

      {/* Row 2: Server + Cluster + UPS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ServerStatsWidget stats={data.serverStats} />
        <ClusterMetrics metrics={data.clusterMetrics} />
        <UpsStatusWidget ups={data.upsStatus} />
      </div>

      {/* Row 3: Service Monitors */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {serviceGroups.map(([group, services]) => (
          <ServiceMonitor key={group} title={group} services={services} />
        ))}
      </div>

      {/* Row 4: Bookmarks */}
      <Bookmarks />
    </div>
  );
}
