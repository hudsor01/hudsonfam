"use client";

import { DataTable } from "@/components/dashboard/data-table";
import { eventColumns, type EventRow } from "./columns";

interface EventsDataTableProps {
  data: EventRow[];
}

export function EventsDataTable({ data }: EventsDataTableProps) {
  return (
    <DataTable
      columns={eventColumns}
      data={data}
      filterColumn="title"
      filterPlaceholder="Filter events..."
    />
  );
}
