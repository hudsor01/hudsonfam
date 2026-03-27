import { describe, it, expect } from 'vitest';
import { server } from '../../mocks/server';
import { http, HttpResponse } from 'msw';
import { getWeather } from '@/lib/dashboard/weather';

describe('getWeather', () => {
  it('returns formatted weather data from Open-Meteo', async () => {
    const weather = await getWeather();

    expect(weather.temperature).toBe(72);
    expect(weather.feelsLike).toBe(70);
    expect(weather.condition).toBe('Mainly clear');
    expect(weather.icon).toBe('sun');
    expect(weather.humidity).toBe(45);
    expect(weather.windSpeed).toBe(8);
    expect(weather.location).toBe('Dallas, TX');
  });

  it('returns fallback data when API errors', async () => {
    server.use(
      http.get('https://api.open-meteo.com/v1/forecast', () => {
        return new HttpResponse(null, { status: 500 });
      })
    );

    const weather = await getWeather();

    expect(weather.temperature).toBe(0);
    expect(weather.condition).toBe('Unavailable');
    expect(weather.location).toBe('Dallas, TX');
  });

  it('returns fallback data when network fails', async () => {
    server.use(
      http.get('https://api.open-meteo.com/v1/forecast', () => {
        return HttpResponse.error();
      })
    );

    const weather = await getWeather();

    expect(weather.temperature).toBe(0);
    expect(weather.condition).toBe('Unavailable');
  });

  it('handles unknown weather codes', async () => {
    server.use(
      http.get('https://api.open-meteo.com/v1/forecast', () => {
        return HttpResponse.json({
          current: {
            temperature_2m: 80,
            apparent_temperature: 82,
            weather_code: 999,
            wind_speed_10m: 5,
            relative_humidity_2m: 50,
          },
        });
      })
    );

    const weather = await getWeather();

    expect(weather.temperature).toBe(80);
    expect(weather.condition).toBe('Unknown');
    expect(weather.icon).toBe('cloud');
  });

  it('rounds temperature and wind speed', async () => {
    server.use(
      http.get('https://api.open-meteo.com/v1/forecast', () => {
        return HttpResponse.json({
          current: {
            temperature_2m: 72.7,
            apparent_temperature: 70.3,
            weather_code: 0,
            wind_speed_10m: 12.8,
            relative_humidity_2m: 55,
          },
        });
      })
    );

    const weather = await getWeather();

    expect(weather.temperature).toBe(73);
    expect(weather.feelsLike).toBe(70);
    expect(weather.windSpeed).toBe(13);
  });
});
