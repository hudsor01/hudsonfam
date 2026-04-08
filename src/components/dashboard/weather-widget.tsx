import { WidgetCard } from "./widget-card";
import { WeatherData } from "@/lib/dashboard/types";

interface WeatherWidgetProps {
  weather: WeatherData;
}

function WeatherIcon({ icon }: { icon: string }) {
  const icons: Record<string, React.ReactNode> = {
    sun: (
      <svg className="size-10 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="12" r="5" />
        <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
      </svg>
    ),
    cloud: (
      <svg className="size-10 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
      </svg>
    ),
    "cloud-sun": (
      <svg className="size-10 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 2v2M4.93 4.93l1.41 1.41M20 12h2M17.66 17.66l1.41 1.41M2 12h2M6.34 17.66l-1.41 1.41M17.07 4.93l1.41-1.41" />
        <circle cx="12" cy="9" r="4" />
        <path d="M16 16h-1.26a6 6 0 0 0-10.48-2.21A4 4 0 1 0 5 20h11a4 4 0 0 0 0-8z" />
      </svg>
    ),
    "cloud-rain": (
      <svg className="size-10 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M16 13v8M8 13v8M12 15v8M20 8.5A7 7 0 1 0 7 15h11a4 4 0 0 0 2-7.5z" />
      </svg>
    ),
    snowflake: (
      <svg className="size-10 text-primary/70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 2v20M2 12h20M4.93 4.93l14.14 14.14M19.07 4.93L4.93 19.07" />
      </svg>
    ),
    "cloud-lightning": (
      <svg className="size-10 text-warning" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M19 16.9A5 5 0 0 0 18 7h-1.26a8 8 0 1 0-11.62 9" />
        <polyline points="13 11 9 17 15 17 11 23" />
      </svg>
    ),
  };

  return <>{icons[icon] || icons.cloud}</>;
}

export function WeatherWidget({ weather }: WeatherWidgetProps) {
  return (
    <WidgetCard
      title="Weather"
      icon={
        <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2v2M4.93 4.93l1.41 1.41M20 12h2M17.66 17.66l1.41 1.41M2 12h2" />
          <circle cx="12" cy="12" r="5" />
        </svg>
      }
    >
      <div className="flex items-center gap-4">
        <WeatherIcon icon={weather.icon} />
        <div>
          <div className="text-3xl font-semibold text-foreground">
            {weather.temperature}
            <span className="text-lg text-muted-foreground">&deg;F</span>
          </div>
          <div className="text-sm text-muted-foreground">{weather.condition}</div>
        </div>
      </div>
      <div className="mt-3 flex gap-4 text-xs text-text-dim">
        <span>Feels like {weather.feelsLike}&deg;F</span>
        <span>Humidity {weather.humidity}%</span>
        <span>Wind {weather.windSpeed} mph</span>
      </div>
      <div className="mt-2 text-xs text-text-dim">{weather.location}</div>
    </WidgetCard>
  );
}
