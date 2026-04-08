import { WidgetCard } from "./widget-card";
import { ServerStats as ServerStatsType } from "@/lib/dashboard/types";

interface ServerStatsProps {
  stats: ServerStatsType;
}

function ProgressBar({
  percent,
  color,
}: {
  percent: number;
  color: string;
}) {
  return (
    <div className="w-full h-1.5 bg-background rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all ${color}`}
        style={{ width: `${Math.min(percent, 100)}%` }}
      />
    </div>
  );
}

function StatRow({
  label,
  used,
  total,
  unit,
  percent,
}: {
  label: string;
  used: number;
  total: number;
  unit: string;
  percent: number;
}) {
  const barColor =
    percent > 90
      ? "bg-destructive"
      : percent > 75
        ? "bg-warning"
        : "bg-success";

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="text-foreground">
          {used} / {total} {unit}{" "}
          <span className="text-text-dim">({percent}%)</span>
        </span>
      </div>
      <ProgressBar percent={percent} color={barColor} />
    </div>
  );
}

export function ServerStatsWidget({ stats }: ServerStatsProps) {
  return (
    <WidgetCard
      title="dev-server"
      icon={
        <svg
          className="size-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <rect x="2" y="3" width="20" height="7" rx="1" />
          <rect x="2" y="14" width="20" height="7" rx="1" />
          <circle cx="6" cy="6.5" r="1" />
          <circle cx="6" cy="17.5" r="1" />
        </svg>
      }
    >
      <div className="space-y-3">
        <StatRow
          label="CPU"
          used={stats.cpu.usagePercent}
          total={100}
          unit="%"
          percent={stats.cpu.usagePercent}
        />
        <StatRow
          label="Memory"
          used={stats.memory.usedGb}
          total={stats.memory.totalGb}
          unit="GB"
          percent={stats.memory.usedPercent}
        />
        <StatRow
          label="NVMe"
          used={stats.disk.usedGb}
          total={stats.disk.totalGb}
          unit="GB"
          percent={stats.disk.usedPercent}
        />
      </div>
    </WidgetCard>
  );
}
