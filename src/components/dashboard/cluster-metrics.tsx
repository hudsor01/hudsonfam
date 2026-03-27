import { WidgetCard } from "./widget-card";
import { MetricCard } from "./metric-card";
import { ClusterMetrics as ClusterMetricsType } from "@/lib/dashboard/types";

interface ClusterMetricsProps {
  metrics: ClusterMetricsType;
}

export function ClusterMetrics({ metrics }: ClusterMetricsProps) {
  return (
    <WidgetCard
      title="K8s Cluster"
      icon={
        <svg
          className="size-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M12 2L2 7l10 5 10-5-10-5z" />
          <path d="M2 17l10 5 10-5" />
          <path d="M2 12l10 5 10-5" />
        </svg>
      }
    >
      <div className="flex divide-x divide-border/50">
        <MetricCard label="Pods" value={metrics.pods} color="green" tooltip="Total running pods across all namespaces" />
        <MetricCard label="Namespaces" value={metrics.namespaces} color="gold" tooltip="Active Kubernetes namespaces" />
        <MetricCard
          label="CPU Req"
          value={metrics.cpuRequestPercent}
          suffix="%"
          color="gold"
          tooltip="Percentage of CPU resources requested by pods"
        />
        <MetricCard
          label="Memory"
          value={metrics.memoryUsagePercent}
          suffix="%"
          color={metrics.memoryUsagePercent > 80 ? "red" : "gold"}
          tooltip="Current node memory utilization"
        />
      </div>
    </WidgetCard>
  );
}
