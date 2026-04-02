export interface ServiceHealth {
  name: string;
  url: string;
  checkUrl: string;
  status: "up" | "down" | "unknown";
  responseTime?: number;
  group: string;
}

export interface FamilyServiceHealth {
  name: string;
  url: string;
  checkUrl: string;
  status: "up" | "down" | "unknown";
  responseTime?: number;
  group: string;
  description: string;
  lanOnly?: boolean;
}

export interface ClusterMetrics {
  pods: number;
  namespaces: number;
  cpuRequestPercent: number;
  memoryUsagePercent: number;
}

export interface ServerStats {
  disk: {
    totalGb: number;
    usedGb: number;
    usedPercent: number;
  };
  cpu: {
    usagePercent: number;
    cores: number;
  };
  memory: {
    totalGb: number;
    usedGb: number;
    usedPercent: number;
  };
}

export interface UpsStatus {
  status: string;
  batteryCharge: number;
  load: number;
  runtimeMinutes: number;
}

export interface MediaStats {
  sonarr: {
    series: number;
    queue: number;
    missing: number;
  };
  radarr: {
    movies: number;
    queue: number;
    missing: number;
  };
  jellyfin: {
    movies: number;
    shows: number;
    episodes: number;
    activeSessions: number;
  };
}

export interface WeatherData {
  temperature: number;
  feelsLike: number;
  condition: string;
  icon: string;
  humidity: number;
  windSpeed: number;
  location: string;
}

export interface BookmarkGroup {
  title: string;
  links: {
    title: string;
    url: string;
    icon?: string;
  }[];
}
