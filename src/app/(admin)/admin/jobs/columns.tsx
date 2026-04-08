"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { ChevronDown, ExternalLink, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { JOB_STATUSES } from "@/lib/job-constants";

export type JobRow = {
  id: number;
  title: string;
  company: string;
  source: string;
  location: string;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string;
  match_score: number;
  status: string;
  url: string;
  posted_date: string | null;
  created_at: string;
  // Action callbacks passed from parent
  onStatusChange: (jobId: number, newStatus: string) => void;
  onDismiss: (jobId: number) => void;
  onRowClick?: (jobId: number) => void;
};

function formatSalary(min: number | null, max: number | null, currency: string) {
  if (!min && !max) return null;
  const fmt = (n: number) => {
    if (n >= 1000) return `${Math.round(n / 1000)}K`;
    return String(n);
  };
  if (min && max) return `${currency === "USD" ? "$" : ""}${fmt(min)}-${fmt(max)}`;
  if (min) return `${currency === "USD" ? "$" : ""}${fmt(min)}+`;
  if (max) return `up to ${currency === "USD" ? "$" : ""}${fmt(max)}`;
  return null;
}

export const sourceColors: Record<string, string> = {
  jobicy: "bg-source-jobicy/15 text-source-jobicy border-source-jobicy/25",
  remoteok: "bg-source-remoteok/15 text-source-remoteok border-source-remoteok/25",
  himalayas: "bg-source-himalayas/15 text-source-himalayas border-source-himalayas/25",
  arbeitnow: "bg-source-arbeitnow/15 text-source-arbeitnow border-source-arbeitnow/25",
  workingnomads: "bg-source-workingnomads/15 text-source-workingnomads border-source-workingnomads/25",
  serpapi_google: "bg-source-serpapi/15 text-source-serpapi border-source-serpapi/25",
  remotive: "bg-source-remotive/15 text-source-remotive border-source-remotive/25",
};

const statusDotColor: Record<string, string> = {
  new: "bg-primary",
  interested: "bg-accent",
  applied: "bg-status-applied",
  interview: "bg-status-interview",
  offer: "bg-status-offer",
  rejected: "bg-destructive/60",
  dismissed: "bg-muted-foreground",
};

export function getJobColumns(): ColumnDef<JobRow>[] {
  return [
    {
      accessorKey: "title",
      header: "Title",
      cell: ({ row }) => (
        <div className="max-w-[280px]">
          <button
            type="button"
            onClick={() => row.original.onRowClick?.(row.original.id)}
            className="text-sm text-foreground hover:text-primary transition-colors flex items-center gap-1.5 text-left"
          >
            <span className="truncate">{row.getValue("title")}</span>
            <ExternalLink className="size-3 shrink-0 opacity-40" />
          </button>
        </div>
      ),
    },
    {
      accessorKey: "company",
      header: "Company",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.getValue("company") || "—"}
        </span>
      ),
    },
    {
      accessorKey: "source",
      header: "Source",
      cell: ({ row }) => {
        const source = row.getValue("source") as string;
        return (
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${sourceColors[source] ?? "bg-card text-muted-foreground border-border"}`}
          >
            {source.replace("serpapi_", "").replace(/_/g, " ")}
          </span>
        );
      },
      filterFn: "equals",
    },
    {
      accessorKey: "match_score",
      header: "Score",
      cell: ({ row }) => {
        const score = row.getValue("match_score") as number;
        if (!score) return <span className="text-xs text-muted-foreground">—</span>;
        const color =
          score >= 7
            ? "text-score-high"
            : score >= 4
              ? "text-score-mid"
              : "text-muted-foreground";
        return <span className={`text-sm font-medium ${color}`}>{score}/10</span>;
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.original.status;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-1 text-xs px-2 py-1 rounded-md border border-border hover:bg-card transition-colors"
              >
                <span
                  className={`size-2 rounded-full shrink-0 ${statusDotColor[status] ?? "bg-muted-foreground"}`}
                />
                <span className="capitalize">{status}</span>
                <ChevronDown className="size-3 opacity-50" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {JOB_STATUSES.map((s) => (
                <DropdownMenuItem
                  key={s}
                  onClick={() => row.original.onStatusChange(row.original.id, s)}
                  className={status === s ? "bg-card" : ""}
                >
                  <span
                    className={`size-2 rounded-full shrink-0 ${statusDotColor[s] ?? "bg-muted-foreground"}`}
                  />
                  <span className="capitalize">{s}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
      filterFn: "equals",
    },
    {
      accessorKey: "created_at",
      header: "Found",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {new Date(row.getValue("created_at")).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })}
        </span>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const isDismissed = row.original.status === "dismissed";
        return (
          <button
            type="button"
            onClick={() => row.original.onDismiss(row.original.id)}
            className="text-muted-foreground hover:text-destructive transition-colors p-1"
            title={isDismissed ? "Restore" : "Dismiss"}
          >
            <X className="size-3.5" />
          </button>
        );
      },
      size: 40,
    },
  ];
}

// Keep formatSalary available if needed by future columns
export { formatSalary };
