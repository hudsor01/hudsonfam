import { ServiceHealth, FamilyServiceHealth } from "./types";

interface ServiceDefinition {
  name: string;
  url: string;
  checkUrl: string;
  group: string;
}

interface FamilyServiceDefinition {
  name: string;
  url: string;
  checkUrl: string;
  group: string;
  description: string;
  lanOnly?: boolean;
  skipHealthCheck?: boolean;
}

const FAMILY_SERVICES: FamilyServiceDefinition[] = [
  // Media & Entertainment
  {
    name: "Media Library",
    url: "https://media.thehudsonfam.com",
    checkUrl: "http://jellyfin.media.svc.cluster.local:8096",
    group: "Media & Entertainment",
    description: "Watch movies, TV shows & music",
  },
  {
    name: "Request Media",
    url: "https://request.thehudsonfam.com",
    checkUrl: "http://jellyseerr.media.svc.cluster.local:5055",
    group: "Media & Entertainment",
    description: "Request new movies & TV shows",
  },

  // Documents & Tools
  {
    name: "DocuSeal",
    url: "https://sign.thehudsonfam.com",
    checkUrl: "http://docuseal.cloud.svc.cluster.local:3000",
    group: "Documents & Tools",
    description: "Sign & send documents",
  },
  {
    name: "Stirling PDF",
    url: "https://pdf.thehudsonfam.com",
    checkUrl: "http://stirling-pdf.cloud.svc.cluster.local:8080",
    group: "Documents & Tools",
    description: "Edit, merge & convert PDFs",
  },

  // AI
  {
    name: "Hudson AI",
    url: "http://chat.homelab",
    checkUrl: "",
    group: "AI",
    description: "Chat with AI assistant",
    lanOnly: true,
    skipHealthCheck: true,
  },
];

const SERVICES: ServiceDefinition[] = [
  // Home & Automation
  {
    name: "Home Assistant",
    url: "https://ha.thehudsonfam.com",
    checkUrl: "http://home-assistant.home-assistant.svc.cluster.local:8123",
    group: "Home & Automation",
  },
  {
    name: "N8N",
    url: "https://n8n.thehudsonfam.com",
    checkUrl: "http://n8n.cloud.svc.cluster.local:5678",
    group: "Home & Automation",
  },
  {
    name: "Qdrant",
    url: "https://qdrant.thehudsonfam.com",
    checkUrl: "http://qdrant.ai.svc.cluster.local:6333",
    group: "Home & Automation",
  },

  // Documents & Data
  {
    name: "DocuSeal",
    url: "https://sign.thehudsonfam.com",
    checkUrl: "http://docuseal.cloud.svc.cluster.local:3000",
    group: "Documents & Data",
  },
  {
    name: "Stirling PDF",
    url: "https://pdf.thehudsonfam.com",
    checkUrl: "http://stirling-pdf.cloud.svc.cluster.local:8080",
    group: "Documents & Data",
  },

  // Media Center
  {
    name: "Jellyfin",
    url: "https://media.thehudsonfam.com",
    checkUrl: "http://jellyfin.media.svc.cluster.local:8096",
    group: "Media Center",
  },
  {
    name: "Seerr",
    url: "https://request.thehudsonfam.com",
    checkUrl: "http://jellyseerr.media.svc.cluster.local:5055",
    group: "Media Center",
  },
  {
    name: "Sonarr",
    url: "https://sonarr.thehudsonfam.com",
    checkUrl: "http://sonarr.media.svc.cluster.local:8989",
    group: "Media Center",
  },
  {
    name: "Radarr",
    url: "https://radarr.thehudsonfam.com",
    checkUrl: "http://radarr.media.svc.cluster.local:7878",
    group: "Media Center",
  },
  {
    name: "Prowlarr",
    url: "http://prowlarr.homelab",
    checkUrl: "http://prowlarr.media.svc.cluster.local:9696",
    group: "Media Center",
  },
  {
    name: "Bazarr",
    url: "https://bazarr.thehudsonfam.com",
    checkUrl: "http://bazarr.media.svc.cluster.local:6767",
    group: "Media Center",
  },
  {
    name: "qBittorrent",
    url: "http://qbittorrent.homelab",
    checkUrl: "http://qbittorrent.media.svc.cluster.local:8080",
    group: "Media Center",
  },
  {
    name: "Tdarr",
    url: "http://tdarr.homelab",
    checkUrl: "http://tdarr.media.svc.cluster.local:8265",
    group: "Media Center",
  },
  {
    name: "Byparr",
    url: "http://byparr.homelab",
    checkUrl: "http://byparr.media.svc.cluster.local:8191",
    group: "Media Center",
  },

  // Infrastructure
  {
    name: "Grafana",
    url: "https://grafana.thehudsonfam.com",
    checkUrl: "http://kube-prometheus-stack-grafana.monitoring.svc.cluster.local:80",
    group: "Infrastructure",
  },
  {
    name: "Prometheus",
    url: "http://prometheus.homelab",
    checkUrl: "http://kube-prometheus-stack-prometheus.monitoring.svc.cluster.local:9090",
    group: "Infrastructure",
  },
  {
    name: "Alertmanager",
    url: "http://alertmanager.homelab",
    checkUrl: "http://kube-prometheus-stack-alertmanager.monitoring.svc.cluster.local:9093",
    group: "Infrastructure",
  },
  {
    name: "RedisInsight",
    url: "http://redisinsight.homelab",
    checkUrl: "http://redisinsight.monitoring.svc.cluster.local:5540",
    group: "Infrastructure",
  },
];

async function checkService(service: ServiceDefinition): Promise<ServiceHealth> {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(service.checkUrl, {
      method: "HEAD",
      signal: controller.signal,
      redirect: "follow",
    });

    clearTimeout(timeout);
    const responseTime = Date.now() - start;

    return {
      ...service,
      status: response.ok || response.status === 401 || response.status === 302 ? "up" : "down",
      responseTime,
    };
  } catch {
    return {
      ...service,
      status: "down",
      responseTime: Date.now() - start,
    };
  }
}

export async function checkAllServices(): Promise<ServiceHealth[]> {
  const results = await Promise.allSettled(
    SERVICES.map((service) => checkService(service))
  );

  return results.map((result, index) => {
    if (result.status === "fulfilled") {
      return result.value;
    }
    return {
      ...SERVICES[index],
      status: "unknown" as const,
    };
  });
}

export function groupServices(
  services: ServiceHealth[]
): Record<string, ServiceHealth[]> {
  return services.reduce(
    (groups, service) => {
      const group = service.group;
      if (!groups[group]) {
        groups[group] = [];
      }
      groups[group].push(service);
      return groups;
    },
    {} as Record<string, ServiceHealth[]>
  );
}

async function checkFamilyService(
  service: FamilyServiceDefinition
): Promise<FamilyServiceHealth> {
  if (service.skipHealthCheck) {
    return { ...service, status: "skipped" };
  }

  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(service.checkUrl, {
      method: "HEAD",
      signal: controller.signal,
      redirect: "follow",
    });

    clearTimeout(timeout);
    const responseTime = Date.now() - start;

    return {
      ...service,
      status:
        response.ok || response.status === 401 || response.status === 302
          ? "up"
          : "down",
      responseTime,
    };
  } catch {
    return {
      ...service,
      status: "down",
      responseTime: Date.now() - start,
    };
  }
}

export async function checkFamilyServices(): Promise<FamilyServiceHealth[]> {
  const results = await Promise.allSettled(
    FAMILY_SERVICES.map((service) => checkFamilyService(service))
  );

  return results.map((result, index) => {
    if (result.status === "fulfilled") {
      return result.value;
    }
    return {
      ...FAMILY_SERVICES[index],
      status: "unknown" as const,
    };
  });
}

export function groupFamilyServices(
  services: FamilyServiceHealth[]
): Record<string, FamilyServiceHealth[]> {
  return services.reduce(
    (groups, service) => {
      const group = service.group;
      if (!groups[group]) {
        groups[group] = [];
      }
      groups[group].push(service);
      return groups;
    },
    {} as Record<string, FamilyServiceHealth[]>
  );
}
