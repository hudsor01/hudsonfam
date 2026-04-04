"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { ExternalLink } from "lucide-react";

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

const sourceColors: Record<string, string> = {
  jobicy: "bg-blue-500/15 text-blue-400 border-blue-500/25",
  remoteok: "bg-green-500/15 text-green-400 border-green-500/25",
  himalayas: "bg-purple-500/15 text-purple-400 border-purple-500/25",
  arbeitnow: "bg-orange-500/15 text-orange-400 border-orange-500/25",
  workingnomads: "bg-teal-500/15 text-teal-400 border-teal-500/25",
  serpapi_google: "bg-red-500/15 text-red-400 border-red-500/25",
  remotive: "bg-yellow-500/15 text-yellow-400 border-yellow-500/25",
};

export const jobColumns: ColumnDef<JobRow>[] = [
  {
    accessorKey: "title",
    header: "Title",
    cell: ({ row }) => (
      <div className="max-w-[300px]">
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
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${sourceColors[source] || "bg-card text-muted-foreground border-border"}`}
        >
          {source.replace("serpapi_", "").replace("_", " ")}
        </span>
      );
    },
    filterFn: "equals",
  },
  {
    accessorKey: "location",
    header: "Location",
    cell: ({ row }) => (
      <span className="text-xs text-text-dim truncate block max-w-[120px]">
        {row.getValue("location")}
      </span>
    ),
  },
  {
    id: "salary",
    header: "Salary",
    accessorFn: (row) => row.salary_min || row.salary_max || 0,
    cell: ({ row }) => {
      const salary = formatSalary(
        row.original.salary_min,
        row.original.salary_max,
        row.original.salary_currency
      );
      return salary ? (
        <span className="text-xs text-accent font-medium">{salary}</span>
      ) : (
        <span className="text-xs text-text-dim">—</span>
      );
    },
  },
  {
    accessorKey: "match_score",
    header: "Score",
    cell: ({ row }) => {
      const score = row.getValue("match_score") as number;
      if (!score) return <span className="text-xs text-text-dim">—</span>;
      const color =
        score >= 7
          ? "text-green-400"
          : score >= 4
            ? "text-yellow-400"
            : "text-text-dim";
      return <span className={`text-sm font-medium ${color}`}>{score}/10</span>;
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as string;
      const variant =
        status === "relevant"
          ? "primary"
          : status === "applied"
            ? "accent"
            : "outline";
      return <Badge variant={variant}>{status}</Badge>;
    },
    filterFn: "equals",
  },
  {
    accessorKey: "created_at",
    header: "Found",
    cell: ({ row }) => (
      <span className="text-xs text-text-dim whitespace-nowrap">
        {new Date(row.getValue("created_at")).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        })}
      </span>
    ),
  },
];
