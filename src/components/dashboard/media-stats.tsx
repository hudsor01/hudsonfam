import { WidgetCard } from "./widget-card";
import { MetricCard } from "./metric-card";
import { MediaStats } from "@/lib/dashboard/types";

interface MediaStatsProps {
  stats: MediaStats;
}

export function MediaStatsWidget({ stats }: MediaStatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Sonarr */}
      <WidgetCard title="Sonarr">
        <div className="flex divide-x divide-border/50">
          <MetricCard label="Series" value={stats.sonarr.series} color="green" />
          <MetricCard label="Queue" value={stats.sonarr.queue} color="gold" />
          <MetricCard
            label="Missing"
            value={stats.sonarr.missing}
            color={stats.sonarr.missing > 0 ? "red" : "green"}
          />
        </div>
      </WidgetCard>

      {/* Radarr */}
      <WidgetCard title="Radarr">
        <div className="flex divide-x divide-border/50">
          <MetricCard label="Movies" value={stats.radarr.movies} color="green" />
          <MetricCard label="Queue" value={stats.radarr.queue} color="gold" />
          <MetricCard
            label="Missing"
            value={stats.radarr.missing}
            color={stats.radarr.missing > 0 ? "red" : "green"}
          />
        </div>
      </WidgetCard>

      {/* Jellyfin */}
      <WidgetCard title="Jellyfin">
        <div className="flex divide-x divide-border/50">
          <MetricCard label="Movies" value={stats.jellyfin.movies.toLocaleString()} color="gold" />
          <MetricCard label="Shows" value={stats.jellyfin.shows} color="gold" />
          <MetricCard label="Episodes" value={stats.jellyfin.episodes.toLocaleString()} color="gold" />
        </div>
      </WidgetCard>
    </div>
  );
}
