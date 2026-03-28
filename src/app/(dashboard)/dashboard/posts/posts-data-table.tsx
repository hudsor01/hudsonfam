"use client";

import { DataTable } from "@/components/dashboard/data-table";
import { postColumns, type PostRow } from "./columns";

interface PostsDataTableProps {
  data: PostRow[];
}

export function PostsDataTable({ data }: PostsDataTableProps) {
  return (
    <DataTable
      columns={postColumns}
      data={data}
      filterColumn="title"
      filterPlaceholder="Filter posts..."
    />
  );
}
