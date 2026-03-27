interface WeatherData {
  temperature: number;
  condition: string;
  high: number;
  low: number;
  icon: string;
}

async function getWeather(): Promise<WeatherData | null> {
  try {
    // Open-Meteo free API — no API key required
    // Dallas, TX coordinates: 32.7767, -96.7970
    const res = await fetch(
      "https://api.open-meteo.com/v1/forecast?latitude=32.7767&longitude=-96.7970&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min&temperature_unit=fahrenheit&timezone=America/Chicago&forecast_days=1",
      { next: { revalidate: 1800 } } // Cache for 30 minutes
    );

    if (!res.ok) return null;

    const data = await res.json();

    const weatherCodes: Record<number, { condition: string; icon: string }> = {
      0: { condition: "Clear", icon: "\u2600\ufe0f" },
      1: { condition: "Mostly Clear", icon: "\ud83c\udf24\ufe0f" },
      2: { condition: "Partly Cloudy", icon: "\u26c5" },
      3: { condition: "Overcast", icon: "\u2601\ufe0f" },
      45: { condition: "Foggy", icon: "\ud83c\udf2b\ufe0f" },
      48: { condition: "Rime Fog", icon: "\ud83c\udf2b\ufe0f" },
      51: { condition: "Light Drizzle", icon: "\ud83c\udf26\ufe0f" },
      53: { condition: "Drizzle", icon: "\ud83c\udf26\ufe0f" },
      55: { condition: "Heavy Drizzle", icon: "\ud83c\udf27\ufe0f" },
      61: { condition: "Light Rain", icon: "\ud83c\udf26\ufe0f" },
      63: { condition: "Rain", icon: "\ud83c\udf27\ufe0f" },
      65: { condition: "Heavy Rain", icon: "\ud83c\udf27\ufe0f" },
      71: { condition: "Light Snow", icon: "\ud83c\udf28\ufe0f" },
      73: { condition: "Snow", icon: "\ud83c\udf28\ufe0f" },
      75: { condition: "Heavy Snow", icon: "\ud83c\udf28\ufe0f" },
      80: { condition: "Rain Showers", icon: "\ud83c\udf27\ufe0f" },
      81: { condition: "Rain Showers", icon: "\ud83c\udf27\ufe0f" },
      82: { condition: "Heavy Showers", icon: "\ud83c\udf27\ufe0f" },
      95: { condition: "Thunderstorm", icon: "\u26c8\ufe0f" },
      96: { condition: "Thunderstorm + Hail", icon: "\u26c8\ufe0f" },
      99: { condition: "Thunderstorm + Hail", icon: "\u26c8\ufe0f" },
    };

    const code = data.current.weather_code;
    const weather = weatherCodes[code] || { condition: "Unknown", icon: "\ud83c\udf21\ufe0f" };

    return {
      temperature: Math.round(data.current.temperature_2m),
      condition: weather.condition,
      high: Math.round(data.daily.temperature_2m_max[0]),
      low: Math.round(data.daily.temperature_2m_min[0]),
      icon: weather.icon,
    };
  } catch {
    return null;
  }
}

export async function WeatherWidget() {
  const weather = await getWeather();

  if (!weather) {
    return (
      <div className="text-center py-3">
        <p className="text-sm text-text-dim italic">Weather unavailable</p>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4">
      <span className="text-3xl">{weather.icon}</span>
      <div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-serif text-text">
            {weather.temperature}&deg;
          </span>
          <span className="text-xs text-text-dim">F</span>
        </div>
        <p className="text-sm text-text-muted">{weather.condition}</p>
        <p className="text-xs text-text-dim">
          H: {weather.high}&deg; L: {weather.low}&deg;
        </p>
      </div>
      <div className="ml-auto text-right">
        <p className="text-xs text-text-dim">Dallas, TX</p>
      </div>
    </div>
  );
}
