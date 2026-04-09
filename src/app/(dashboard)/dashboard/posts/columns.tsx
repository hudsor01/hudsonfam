"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { PostActions } from "./post-actions";

export type PostRow = {
  id: string;
  title: string;
  status: string;
  updatedAt: string;
  deleteAction: () => Promise<void>;
};

export const postColumns: ColumnDef<PostRow>[] = [
  {
    accessorKey: "title",
    header: "Title",
    cell: ({ row }) => (
      <a
        href={`/dashboard/posts/${row.original.id}`}
        className="text-sm text-foreground hover:text-primary transition-colors"
      >
        {row.getValue("title")}
      </a>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as string;
      return (
        <Badge variant={status === "PUBLISHED" ? "primary" : "outline"}>
          {status.toLowerCase()}
        </Badge>
      );
    },
  },
  {
    accessorKey: "updatedAt",
    header: "Updated",
    cell: ({ row }) => (
      <span className="text-xs text-text-dim">
        {new Date(row.getValue("updatedAt")).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          timeZone: "America/Chicago",
        })}
      </span>
    ),
  },
  {
    id: "actions",
    enableSorting: false,
    cell: ({ row }) => (
      <div className="text-right">
        <PostActions
          postId={row.original.id}
          deleteAction={row.original.deleteAction}
        />
      </div>
    ),
  },
];
