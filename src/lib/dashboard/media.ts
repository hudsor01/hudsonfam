import { MediaStats } from "./types";

const SONARR_URL = "http://sonarr.media.svc.cluster.local:8989";
const RADARR_URL = "http://radarr.media.svc.cluster.local:7878";
const JELLYFIN_URL = "http://jellyfin.media.svc.cluster.local:8096";

async function fetchJson<T>(url: string, headers?: Record<string, string>): Promise<T | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url, {
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

interface SonarrSeries {
  id: number;
}

interface ArrQueueResponse {
  totalRecords: number;
}

interface ArrMissingResponse {
  totalRecords: number;
}

interface RadarrMovie {
  id: number;
}

interface JellyfinItemCounts {
  MovieCount: number;
  SeriesCount: number;
  EpisodeCount: number;
}

interface JellyfinSession {
  Id: string;
  NowPlayingItem?: unknown;
}

async function getSonarrStats(): Promise<MediaStats["sonarr"]> {
  const apiKey = process.env.SONARR_API_KEY || "";
  const headers = { "x-api-key": apiKey };

  const [series, queue, missing] = await Promise.all([
    fetchJson<SonarrSeries[]>(`${SONARR_URL}/api/v3/series`, headers),
    fetchJson<ArrQueueResponse>(
      `${SONARR_URL}/api/v3/queue?pageSize=1`,
      headers
    ),
    fetchJson<ArrMissingResponse>(
      `${SONARR_URL}/api/v3/wanted/missing?pageSize=1`,
      headers
    ),
  ]);

  return {
    series: series ? series.length : 0,
    queue: queue ? queue.totalRecords : 0,
    missing: missing ? missing.totalRecords : 0,
  };
}

async function getRadarrStats(): Promise<MediaStats["radarr"]> {
  const apiKey = process.env.RADARR_API_KEY || "";
  const headers = { "x-api-key": apiKey };

  const [movies, queue, missing] = await Promise.all([
    fetchJson<RadarrMovie[]>(`${RADARR_URL}/api/v3/movie`, headers),
    fetchJson<ArrQueueResponse>(
      `${RADARR_URL}/api/v3/queue?pageSize=1`,
      headers
    ),
    fetchJson<ArrMissingResponse>(
      `${RADARR_URL}/api/v3/wanted/missing?pageSize=1`,
      headers
    ),
  ]);

  return {
    movies: movies ? movies.length : 0,
    queue: queue ? queue.totalRecords : 0,
    missing: missing ? missing.totalRecords : 0,
  };
}

async function getJellyfinStats(): Promise<MediaStats["jellyfin"]> {
  const apiKey = process.env.JELLYFIN_API_KEY || "";

  const [counts, sessions] = await Promise.all([
    fetchJson<JellyfinItemCounts>(
      `${JELLYFIN_URL}/emby/Items/Counts?api_key=${apiKey}`
    ),
    fetchJson<JellyfinSession[]>(
      `${JELLYFIN_URL}/Sessions?api_key=${apiKey}`
    ),
  ]);

  const activeSessions = sessions
    ? sessions.filter((s) => s.NowPlayingItem).length
    : 0;

  return {
    movies: counts ? counts.MovieCount : 0,
    shows: counts ? counts.SeriesCount : 0,
    episodes: counts ? counts.EpisodeCount : 0,
    activeSessions,
  };
}

const DEFAULT_SONARR = { series: 0, queue: 0, missing: 0 };
const DEFAULT_RADARR = { movies: 0, queue: 0, missing: 0 };
const DEFAULT_JELLYFIN = { movies: 0, shows: 0, episodes: 0, activeSessions: 0 };

export async function getMediaStats(): Promise<MediaStats> {
  const [sonarr, radarr, jellyfin] = await Promise.all([
    getSonarrStats().catch(() => DEFAULT_SONARR),
    getRadarrStats().catch(() => DEFAULT_RADARR),
    getJellyfinStats().catch(() => DEFAULT_JELLYFIN),
  ]);

  return { sonarr, radarr, jellyfin };
}
