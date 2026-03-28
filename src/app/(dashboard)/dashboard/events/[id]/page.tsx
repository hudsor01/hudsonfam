export const dynamic = "force-dynamic";

import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import { SectionHeader } from "@/components/ui/section-header";
import { DashboardBreadcrumbs } from "@/components/dashboard/breadcrumbs";
import { EventForm } from "../event-form";
import { updateEvent } from "@/lib/dashboard-actions";

interface Props {
  params: Promise<{ id: string }>;
}

function toLocalDatetime(date: Date): string {
  const d = new Date(date);
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

export default async function EditEventPage({ params }: Props) {
  const { id } = await params;

  const event = await prisma.event.findUnique({
    where: { id },
  });

  if (!event) {
    notFound();
  }

  const boundUpdate = async (formData: FormData) => {
    "use server";
    await updateEvent(id, formData);
  };

  return (
    <div>
      <DashboardBreadcrumbs items={[{ label: "Events", href: "/dashboard/events" }, { label: event.title }]} />
      <SectionHeader title="Edit Event" subtitle={event.title} />
      <div className="mt-6">
        <EventForm
          action={boundUpdate}
          initial={{
            title: event.title,
            description: event.description,
            location: event.location,
            startDate: toLocalDatetime(event.startDate),
            endDate: event.endDate ? toLocalDatetime(event.endDate) : null,
            allDay: event.allDay,
            visibility: event.visibility,
          }}
        />
      </div>
    </div>
  );
}
