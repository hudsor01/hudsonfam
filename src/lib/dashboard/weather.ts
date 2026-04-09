import { WeatherData } from "./types";

// Dallas, TX coordinates
const LATITUDE = 32.7767;
const LONGITUDE = -96.797;

// WMO weather code to description and icon mapping
// https://open-meteo.com/en/docs#weathervariables
const WMO_CODES: Record<number, { description: string; icon: string }> = {
  0: { description: "Clear sky", icon: "sun" },
  1: { description: "Mainly clear", icon: "sun" },
  2: { description: "Partly cloudy", icon: "cloud-sun" },
  3: { description: "Overcast", icon: "cloud" },
  45: { description: "Foggy", icon: "cloud" },
  48: { description: "Depositing rime fog", icon: "cloud" },
  51: { description: "Light drizzle", icon: "cloud-rain" },
  53: { description: "Moderate drizzle", icon: "cloud-rain" },
  55: { description: "Dense drizzle", icon: "cloud-rain" },
  61: { description: "Slight rain", icon: "cloud-rain" },
  63: { description: "Moderate rain", icon: "cloud-rain" },
  65: { description: "Heavy rain", icon: "cloud-rain" },
  71: { description: "Slight snow", icon: "snowflake" },
  73: { description: "Moderate snow", icon: "snowflake" },
  75: { description: "Heavy snow", icon: "snowflake" },
  77: { description: "Snow grains", icon: "snowflake" },
  80: { description: "Slight rain showers", icon: "cloud-rain" },
  81: { description: "Moderate rain showers", icon: "cloud-rain" },
  82: { description: "Violent rain showers", icon: "cloud-rain" },
  85: { description: "Slight snow showers", icon: "snowflake" },
  86: { description: "Heavy snow showers", icon: "snowflake" },
  95: { description: "Thunderstorm", icon: "cloud-lightning" },
  96: { description: "Thunderstorm with hail", icon: "cloud-lightning" },
  99: { description: "Thunderstorm with heavy hail", icon: "cloud-lightning" },
};

interface OpenMeteoResponse {
  current: {
    temperature_2m: number;
    apparent_temperature: number;
    relative_humidity_2m: number;
    wind_speed_10m: number;
    weather_code: number;
  };
}

export async function getWeather(): Promise<WeatherData> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const params = new URLSearchParams({
      latitude: LATITUDE.toString(),
      longitude: LONGITUDE.toString(),
      current: [
        "temperature_2m",
        "apparent_temperature",
        "relative_humidity_2m",
        "wind_speed_10m",
        "weather_code",
      ].join(","),
      temperature_unit: "fahrenheit",
      wind_speed_unit: "mph",
      timezone: "America/Chicago",
    });

    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?${params}`,
      { signal: controller.signal }
    );

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`Open-Meteo API error: ${response.status}`);
    }

    const data: OpenMeteoResponse = await response.json();
    const weatherCode = data.current.weather_code;
    const weatherInfo = WMO_CODES[weatherCode] || {
      description: "Unknown",
      icon: "cloud",
    };

    return {
      temperature: Math.round(data.current.temperature_2m),
      feelsLike: Math.round(data.current.apparent_temperature),
      condition: weatherInfo.description,
      icon: weatherInfo.icon,
      humidity: data.current.relative_humidity_2m,
      windSpeed: Math.round(data.current.wind_speed_10m),
      location: "Dallas, TX",
    };
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[dashboard] weather fetch failed:", (err as Error).message);
    }
    return {
      temperature: 0,
      feelsLike: 0,
      condition: "Unavailable",
      icon: "cloud",
      humidity: 0,
      windSpeed: 0,
      location: "Dallas, TX",
    };
  }
}
