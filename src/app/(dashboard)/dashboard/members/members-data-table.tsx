"use client";

import { DataTable } from "@/components/dashboard/data-table";
import { memberColumns, type MemberRow } from "./columns";

interface MembersDataTableProps {
  data: MemberRow[];
}

export function MembersDataTable({ data }: MembersDataTableProps) {
  return (
    <DataTable
      columns={memberColumns}
      data={data}
      filterColumn="name"
      filterPlaceholder="Filter members..."
    />
  );
}
