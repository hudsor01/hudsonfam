"use client";

import { useState, useMemo, useTransition } from "react";
import { LayoutGrid, Table2 } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DataTable } from "@/components/dashboard/data-table";
import { getJobColumns, type JobRow } from "./columns";
import { StatsBar } from "./stats-bar";
import { FiltersSidebar, type FiltersState } from "./filters-sidebar";
import { KanbanBoard } from "./kanban-board";
import type { Job, JobStats } from "@/lib/jobs-db";

interface JobsDashboardProps {
  activeJobs: Job[];
  dismissedJobs: Job[];
  stats: JobStats;
  onStatusChange: (jobId: number, newStatus: string) => Promise<void>;
  onDismiss: (jobId: number) => Promise<void>;
  onUndismiss: (jobId: number) => Promise<void>;
}

export function JobsDashboard({
  activeJobs,
  dismissedJobs,
  stats,
  onStatusChange,
  onDismiss,
  onUndismiss,
}: JobsDashboardProps) {
  const [isPending, startTransition] = useTransition();
  const [view, setView] = useState<"table" | "kanban">("table");
  const [filters, setFilters] = useState<FiltersState>({
    search: "",
    sources: [],
    statuses: [],
    scoreMin: 0,
    scoreMax: 10,
  });

  // Wrap server actions in useTransition for optimistic UI
  const handleStatusChange = (jobId: number, newStatus: string) => {
    startTransition(() => { void onStatusChange(jobId, newStatus); });
  };
  const handleDismiss = (jobId: number) => {
    startTransition(() => { void onDismiss(jobId); });
  };
  const handleUndismiss = (jobId: number) => {
    startTransition(() => { void onUndismiss(jobId); });
  };

  // Client-side filtering for immediate feedback (all jobs already loaded)
  const filteredActive = useMemo(() => {
    return activeJobs.filter((job) => {
      if (filters.search) {
        const q = filters.search.toLowerCase();
        if (
          !job.title.toLowerCase().includes(q) &&
          !(job.company ?? "").toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      if (filters.sources.length > 0 && !filters.sources.includes(job.source)) return false;
      if (filters.statuses.length > 0 && !filters.statuses.includes(job.status)) return false;
      if (job.match_score < filters.scoreMin || job.match_score > filters.scoreMax) return false;
      return true;
    });
  }, [activeJobs, filters]);

  // Map Job to JobRow for column definitions
  const toRow = (
    job: Job,
    dismiss: (id: number) => void,
    statusChange: (id: number, s: string) => void
  ): JobRow => ({
    id: job.id,
    title: job.title,
    company: job.company ?? "",
    source: job.source,
    location: job.location ?? "Remote",
    salary_min: job.salary_min,
    salary_max: job.salary_max,
    salary_currency: job.salary_currency ?? "USD",
    match_score: job.match_score,
    status: job.status,
    url: job.url ?? "",
    posted_date: job.posted_date,
    created_at: job.created_at,
    onStatusChange: statusChange,
    onDismiss: dismiss,
  });

  const activeRows = filteredActive.map((j) => toRow(j, handleDismiss, handleStatusChange));
  const dismissedRows = dismissedJobs.map((j) => toRow(j, handleUndismiss, handleStatusChange));

  const columns = getJobColumns();
  const availableSources = stats.bySource.map((s) => s.source);
  const availableStatuses = stats.byStatus
    .map((s) => s.status)
    .filter((s) => s !== "dismissed");

  return (
    <div className="space-y-4">
      {/* Header with view switcher */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif text-foreground">Job Search</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {stats.total} jobs from {stats.bySource.length} sources
            {stats.newestJob && (
              <>
                {" "}
                &middot; Updated{" "}
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

        {/* View switcher: Table / Kanban toggle (D-10) */}
        <div className="flex items-center gap-1 rounded-lg border border-border p-1 bg-card/50">
          <button
            type="button"
            onClick={() => setView("table")}
            className={`p-1.5 rounded-md transition-colors ${
              view === "table"
                ? "bg-primary/15 text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
            title="Table view"
          >
            <Table2 className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => setView("kanban")}
            className={`p-1.5 rounded-md transition-colors ${
              view === "kanban"
                ? "bg-primary/15 text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
            title="Kanban view"
          >
            <LayoutGrid className="size-4" />
          </button>
        </div>
      </div>

      {/* Stats bar (D-01) */}
      <StatsBar stats={stats} />

      {/* Pending indicator */}
      {isPending && (
        <div className="text-xs text-primary animate-pulse">Updating...</div>
      )}

      {/* Active / Dismissed tabs (D-08) */}
      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active">Active ({activeJobs.length})</TabsTrigger>
          <TabsTrigger value="dismissed">
            Dismissed ({dismissedJobs.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          {view === "table" ? (
            <div className="flex gap-4 mt-4">
              {/* Sidebar filters (D-07) — always visible on left */}
              <FiltersSidebar
                filters={filters}
                onFiltersChange={setFilters}
                availableSources={availableSources}
                availableStatuses={availableStatuses}
              />

              {/* Table */}
              <div className="flex-1 min-w-0">
                <DataTable
                  columns={columns}
                  data={activeRows}
                  pageSize={25}
                />
              </div>
            </div>
          ) : (
            <div className="mt-4">
              <KanbanBoard
                jobs={filteredActive}
                onStatusChange={handleStatusChange}
              />
            </div>
          )}
        </TabsContent>

        <TabsContent value="dismissed">
          <div className="mt-4">
            <DataTable
              columns={columns}
              data={dismissedRows}
              pageSize={25}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
