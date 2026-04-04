"use client";

import type { JobStats } from "@/lib/jobs-db";

interface StatsBarProps {
  stats: JobStats;
}

const statusColors: Record<string, string> = {
  new: "text-primary",
  interested: "text-accent",
  applied: "text-green-400",
  interview: "text-purple-400",
  offer: "text-emerald-400",
  rejected: "text-red-400/60",
  dismissed: "text-muted-foreground",
};

const statusOrder = ["new", "interested", "applied", "interview", "offer", "rejected", "dismissed"];

export function StatsBar({ stats }: StatsBarProps) {
  const sorted = [...stats.byStatus].sort((a, b) => {
    const ai = statusOrder.indexOf(a.status);
    const bi = statusOrder.indexOf(b.status);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  return (
    <div className="flex flex-wrap items-center gap-4 px-4 py-3 rounded-lg border border-border bg-card/50">
      {/* Total */}
      <div className="flex flex-col items-center min-w-[52px]">
        <span className="text-lg font-semibold text-foreground leading-tight">{stats.total}</span>
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Total</span>
      </div>

      <div className="h-8 w-px bg-border shrink-0" />

      {/* By status */}
      {sorted.map(({ status, count }) => (
        <div key={status} className="flex flex-col items-center min-w-[40px]">
          <span className={`text-base font-semibold leading-tight ${statusColors[status] ?? "text-muted-foreground"}`}>
            {count}
          </span>
          <span className="text-[10px] text-muted-foreground capitalize">{status}</span>
        </div>
      ))}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Last updated */}
      {stats.newestJob && (
        <div className="text-xs text-muted-foreground whitespace-nowrap">
          Updated{" "}
          {new Date(stats.newestJob).toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })}
        </div>
      )}
    </div>
  );
}
