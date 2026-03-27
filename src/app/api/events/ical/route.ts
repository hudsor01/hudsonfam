import prisma from "@/lib/prisma";

function formatICalDate(date: Date, allDay: boolean): string {
  if (allDay) {
    // VALUE=DATE format: YYYYMMDD
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, "0");
    const d = String(date.getUTCDate()).padStart(2, "0");
    return `${y}${m}${d}`;
  }
  // DATETIME format: YYYYMMDDTHHMMSSZ
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function escapeICalText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

export async function GET() {
  const events = await prisma.event.findMany({
    where: { visibility: "PUBLIC" },
    orderBy: { startDate: "asc" },
  });

  const now = formatICalDate(new Date(), false);

  const vevents = events
    .map((event) => {
      const dtStartPrefix = event.allDay ? "DTSTART;VALUE=DATE" : "DTSTART";
      const dtStart = formatICalDate(event.startDate, event.allDay);

      let dtEndLine = "";
      if (event.endDate) {
        const dtEndPrefix = event.allDay ? "DTEND;VALUE=DATE" : "DTEND";
        dtEndLine = `${dtEndPrefix}:${formatICalDate(event.endDate, event.allDay)}`;
      } else if (event.allDay) {
        // All-day events without end date: next day
        const nextDay = new Date(event.startDate);
        nextDay.setUTCDate(nextDay.getUTCDate() + 1);
        dtEndLine = `DTEND;VALUE=DATE:${formatICalDate(nextDay, true)}`;
      }

      const lines = [
        "BEGIN:VEVENT",
        `UID:${event.id}@thehudsonfam.com`,
        `DTSTAMP:${now}`,
        `${dtStartPrefix}:${dtStart}`,
      ];

      if (dtEndLine) lines.push(dtEndLine);
      lines.push(`SUMMARY:${escapeICalText(event.title)}`);
      if (event.description) {
        lines.push(`DESCRIPTION:${escapeICalText(event.description)}`);
      }
      if (event.location) {
        lines.push(`LOCATION:${escapeICalText(event.location)}`);
      }
      lines.push("END:VEVENT");

      return lines.join("\r\n");
    })
    .join("\r\n");

  const calendar = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//The Hudson Family//Events//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Hudson Family Events",
    vevents,
    "END:VCALENDAR",
  ].join("\r\n");

  return new Response(calendar, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="hudson-events.ics"',
      "Cache-Control": "public, max-age=3600",
    },
  });
}
