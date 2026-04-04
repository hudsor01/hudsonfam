"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { ChevronDown, ExternalLink, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { JOB_STATUSES } from "@/lib/jobs-db";

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
  jobicy: "bg-blue-500/15 text-blue-400 border-blue-500/25",
  remoteok: "bg-green-500/15 text-green-400 border-green-500/25",
  himalayas: "bg-purple-500/15 text-purple-400 border-purple-500/25",
  arbeitnow: "bg-orange-500/15 text-orange-400 border-orange-500/25",
  workingnomads: "bg-teal-500/15 text-teal-400 border-teal-500/25",
  serpapi_google: "bg-red-500/15 text-red-400 border-red-500/25",
  remotive: "bg-yellow-500/15 text-yellow-400 border-yellow-500/25",
};

const statusDotColor: Record<string, string> = {
  new: "bg-primary",
  interested: "bg-accent",
  applied: "bg-green-400",
  interview: "bg-purple-400",
  offer: "bg-emerald-400",
  rejected: "bg-red-400/60",
  dismissed: "bg-muted-foreground",
};

export function getJobColumns(): ColumnDef<JobRow>[] {
  return [
    {
      accessorKey: "title",
      header: "Title",
      cell: ({ row }) => (
        <div className="max-w-[280px]">
          {row.original.url ? (
            <a
              href={row.original.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-foreground hover:text-primary transition-colors flex items-center gap-1.5"
            >
              <span className="truncate">{row.getValue("title")}</span>
              <ExternalLink className="size-3 shrink-0 opacity-40" />
            </a>
          ) : (
            <span className="text-sm text-foreground truncate block">
              {row.getValue("title")}
            </span>
          )}
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
            ? "text-green-400"
            : score >= 4
              ? "text-yellow-400"
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
            className="text-muted-foreground hover:text-red-400 transition-colors p-1"
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
