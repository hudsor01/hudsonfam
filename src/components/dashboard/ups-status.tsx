import { WidgetCard } from "./widget-card";
import { MetricCard } from "./metric-card";
import { UpsStatus } from "@/lib/dashboard/types";

interface UpsStatusProps {
  ups: UpsStatus;
}

export function UpsStatusWidget({ ups }: UpsStatusProps) {
  const statusColor =
    ups.status === "Online"
      ? "text-success"
      : ups.status === "On Battery"
        ? "text-warning"
        : "text-destructive";

  return (
    <WidgetCard
      title="CyberPower UPS"
      icon={
        <svg
          className="size-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <rect x="6" y="2" width="12" height="20" rx="2" />
          <path d="M13 6l-3 5h4l-3 5" />
        </svg>
      }
    >
      <div className="mb-3 text-center">
        <span className={`text-xs font-medium uppercase tracking-wider ${statusColor}`}>
          {ups.status}
        </span>
      </div>
      <div className="flex divide-x divide-border/50">
        <MetricCard
          label="Battery"
          value={ups.batteryCharge}
          suffix="%"
          color={ups.batteryCharge > 50 ? "green" : ups.batteryCharge > 20 ? "gold" : "red"}
        />
        <MetricCard
          label="Load"
          value={ups.load}
          suffix="%"
          color="gold"
        />
        <MetricCard
          label="Runtime"
          value={ups.runtimeMinutes}
          suffix="m"
          color="gold"
        />
      </div>
    </WidgetCard>
  );
}
