"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { EventActions } from "./event-actions";

export type EventRow = {
  id: string;
  title: string;
  visibility: string;
  allDay: boolean;
  startDate: string;
  deleteAction: () => Promise<void>;
};

export const eventColumns: ColumnDef<EventRow>[] = [
  {
    accessorKey: "title",
    header: "Title",
    cell: ({ row }) => (
      <a
        href={`/dashboard/events/${row.original.id}`}
        className="text-sm text-foreground hover:text-primary transition-colors"
      >
        {row.getValue("title")}
      </a>
    ),
  },
  {
    accessorKey: "visibility",
    header: "Visibility",
    cell: ({ row }) => {
      const visibility = row.getValue("visibility") as string;
      return (
        <Badge variant={visibility === "FAMILY" ? "accent" : "outline"}>
          {visibility.toLowerCase()}
        </Badge>
      );
    },
  },
  {
    accessorKey: "allDay",
    header: "All Day",
    cell: ({ row }) =>
      row.getValue("allDay") ? (
        <Badge variant="outline">all day</Badge>
      ) : null,
  },
  {
    accessorKey: "startDate",
    header: "Date",
    cell: ({ row }) => (
      <span className="text-xs text-text-dim">
        {new Date(row.getValue("startDate")).toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
          year: "numeric",
        })}
      </span>
    ),
  },
  {
    id: "actions",
    enableSorting: false,
    cell: ({ row }) => (
      <div className="text-right">
        <EventActions
          eventId={row.original.id}
          deleteAction={row.original.deleteAction}
        />
      </div>
    ),
  },
];
