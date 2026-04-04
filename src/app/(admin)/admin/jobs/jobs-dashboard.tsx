"use client";

import { useState } from "react";
import { DataTable } from "@/components/dashboard/data-table";
import { jobColumns, type JobRow } from "./columns";
import type { JobStats } from "@/lib/jobs-db";

interface JobsDashboardProps {
  rows: JobRow[];
  stats: JobStats;
}

export function JobsDashboard({ rows, stats }: JobsDashboardProps) {
  const [sourceFilter, setSourceFilter] = useState<string>("all");

  const filtered =
    sourceFilter === "all"
      ? rows
      : rows.filter((r) => r.source === sourceFilter);

  const sources = stats.bySource.map((s) => s.source);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-serif text-foreground">Job Search</h1>
        <p className="text-sm text-text-dim mt-1">
          {stats.total} jobs collected from {stats.bySource.length} sources
          {stats.newestJob && (
            <>
              {" "}
              &middot; Last updated{" "}
              {new Date(stats.newestJob).toLocaleString("en-US", {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </>
          )}
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        {stats.bySource.map(({ source, count }) => (
          <button
            key={source}
            onClick={() =>
              setSourceFilter(sourceFilter === source ? "all" : source)
            }
            className={`rounded-lg border p-3 text-left transition-colors ${
              sourceFilter === source
                ? "border-primary bg-primary/10"
                : "border-border bg-card/50 hover:bg-card"
            }`}
          >
            <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              {source.replace("serpapi_", "").replace("_", " ")}
            </div>
            <div className="text-xl font-semibold text-foreground mt-0.5">
              {count}
            </div>
          </button>
        ))}
      </div>

      {/* Table */}
      <DataTable
        columns={jobColumns}
        data={filtered}
        filterColumn="title"
        filterPlaceholder="Filter jobs by title..."
        pageSize={25}
      />
    </div>
  );
}
