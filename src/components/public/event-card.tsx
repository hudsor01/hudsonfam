interface EventCardProps {
  title: string;
  description: string | null;
  location: string | null;
  startDate: Date;
  endDate: Date | null;
  allDay: boolean;
}

/**
 * Format a date range for display.
 * - All-day single day: "March 15, 2026"
 * - All-day multi-day: "March 15 - 17, 2026"
 * - Timed single day: "March 15, 2026 at 3:00 PM"
 * - Timed with end: "March 15, 2026, 3:00 PM - 5:00 PM"
 */
function formatEventDate(
  startDate: Date,
  endDate: Date | null,
  allDay: boolean
): string {
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : null;

  if (allDay) {
    const startStr = start.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
    if (!end || start.toDateString() === end.toDateString()) {
      return startStr;
    }
    // Multi-day: check if same month
    if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
      return `${start.toLocaleDateString("en-US", { month: "long", day: "numeric" })} - ${end.toLocaleDateString("en-US", { day: "numeric", year: "numeric" })}`;
    }
    const endStr = end.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
    return `${startStr} - ${endStr}`;
  }

  // Timed event
  const dateStr = start.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const timeStr = start.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  if (!end || start.toDateString() === end.toDateString()) {
    if (end) {
      const endTimeStr = end.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      });
      return `${dateStr}, ${timeStr} - ${endTimeStr}`;
    }
    return `${dateStr} at ${timeStr}`;
  }

  const endStr = end.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const endTimeStr = end.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${dateStr}, ${timeStr} - ${endStr}, ${endTimeStr}`;
}

/**
 * Get relative time label (e.g., "In 3 days", "Tomorrow", "Today").
 * Returns null for past events or events more than 2 months away.
 */
function getRelativeLabel(startDate: Date): string | null {
  const now = new Date();
  const start = new Date(startDate);
  const diffMs = start.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return null;
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays <= 7) return `In ${diffDays} days`;
  if (diffDays <= 14) return "Next week";
  if (diffDays <= 30) {
    const weeks = Math.round(diffDays / 7);
    return `In ${weeks} week${weeks === 1 ? "" : "s"}`;
  }
  if (diffDays <= 60) {
    const months = Math.round(diffDays / 30);
    return `In ${months} month${months === 1 ? "" : "s"}`;
  }
  return null;
}

export default function EventCard({
  title,
  description,
  location,
  startDate,
  endDate,
  allDay,
}: EventCardProps) {
  const dateDisplay = formatEventDate(startDate, endDate, allDay);
  const relativeLabel = getRelativeLabel(startDate);

  return (
    <div className="bg-card border border-border rounded-xl p-5 hover:border-accent/40 hover:shadow-md hover:shadow-accent/10 transition-all">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h3 className="text-foreground font-serif text-lg text-balance">{title}</h3>

          {/* Date with gold accent */}
          <div className="flex items-center gap-2 mt-1.5">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-accent flex-shrink-0"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <span className="text-accent text-sm">{dateDisplay}</span>
          </div>

          {/* Location */}
          {location && (
            <div className="flex items-center gap-2 mt-1">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-text-dim flex-shrink-0"
              >
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <span className="text-muted-foreground text-sm">{location}</span>
            </div>
          )}

          {/* Description */}
          {description && (
            <p className="text-muted-foreground text-sm mt-3 line-clamp-3 text-pretty">
              {description}
            </p>
          )}
        </div>

        {/* Relative label badge */}
        {relativeLabel && (
          <span className="text-xs text-accent bg-accent/10 px-2.5 py-1 rounded-full flex-shrink-0 font-medium">
            {relativeLabel}
          </span>
        )}
      </div>
    </div>
  );
}
