import { ClusterMetrics } from "./types";

const PROMETHEUS_URL =
  "http://kube-prometheus-stack-prometheus.monitoring.svc.cluster.local:9090";

async function queryPrometheus(query: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const url = `${PROMETHEUS_URL}/api/v1/query?query=${encodeURIComponent(query)}`;
    const response = await fetch(url, { signal: controller.signal });

    clearTimeout(timeout);

    if (!response.ok) return null;

    const data = await response.json();

    if (
      data.status === "success" &&
      data.data?.result?.length > 0 &&
      data.data.result[0].value?.length > 1
    ) {
      return data.data.result[0].value[1];
    }

    return null;
  } catch {
    return null;
  }
}

const DEFAULT_CLUSTER_METRICS: ClusterMetrics = {
  pods: 0,
  namespaces: 0,
  cpuRequestPercent: 0,
  memoryUsagePercent: 0,
};

export async function getClusterMetrics(): Promise<ClusterMetrics> {
  try {
    const [pods, namespaces, cpuReq, memUsage] = await Promise.all([
      queryPrometheus('count(kube_pod_status_phase{phase="Running"})'),
      queryPrometheus('count(kube_namespace_status_phase{phase="Active"})'),
      queryPrometheus(
        'round(sum(kube_pod_container_resource_requests{resource="cpu"}) / sum(kube_node_status_allocatable{resource="cpu"}) * 100)'
      ),
      queryPrometheus(
        'round((1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100)'
      ),
    ]);

    return {
      pods: pods ? parseInt(pods, 10) : 0,
      namespaces: namespaces ? parseInt(namespaces, 10) : 0,
      cpuRequestPercent: cpuReq ? parseInt(cpuReq, 10) : 0,
      memoryUsagePercent: memUsage ? parseInt(memUsage, 10) : 0,
    };
  } catch {
    return DEFAULT_CLUSTER_METRICS;
  }
}

export { queryPrometheus };
