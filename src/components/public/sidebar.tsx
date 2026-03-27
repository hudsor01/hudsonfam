import { SectionHeader } from "@/components/ui/section-header";
import { PhotoGridPreview } from "@/components/public/photo-grid-preview";
import { WeatherWidget } from "@/components/public/weather-widget";

interface SidebarEvent {
  id: string;
  title: string;
  date: string;
  location: string | null;
}

interface SidebarPhoto {
  id: string;
  thumbnailPath: string;
  title: string | null;
}

interface SidebarProps {
  events: SidebarEvent[];
  photos: SidebarPhoto[];
}

export function Sidebar({ events, photos }: SidebarProps) {
  return (
    <aside className="space-y-6">
      {/* Upcoming Events */}
      <div className="bg-surface border border-border rounded-xl p-5">
        <SectionHeader label="Upcoming" action={{ text: "View all", href: "/events" }} />
        {events.length > 0 ? (
          <ul className="space-y-3">
            {events.map((event) => (
              <li key={event.id} className="flex gap-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-accent/15 flex items-center justify-center">
                  <span className="text-accent text-xs font-bold font-sans">
                    {new Date(event.date).toLocaleDateString("en-US", {
                      day: "numeric",
                    })}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-text font-medium truncate">
                    {event.title}
                  </p>
                  <p className="text-xs text-text-dim">
                    {new Date(event.date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                    {event.location && ` \u2022 ${event.location}`}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-text-dim italic">No upcoming events</p>
        )}
      </div>

      {/* Latest Photos */}
      <div className="bg-surface border border-border rounded-xl p-5">
        <SectionHeader label="Photos" action={{ text: "View all", href: "/photos" }} />
        {photos.length > 0 ? (
          <PhotoGridPreview photos={photos} />
        ) : (
          <p className="text-sm text-text-dim italic">No photos yet</p>
        )}
      </div>

      {/* Weather */}
      <div className="bg-surface border border-border rounded-xl p-5">
        <SectionHeader label="Weather" />
        <WeatherWidget />
      </div>
    </aside>
  );
}
