import { describe, it, expect } from 'vitest';
import { server } from '../../mocks/server';
import { http, HttpResponse } from 'msw';
import { getMediaStats } from '@/lib/dashboard/media';

describe('getMediaStats', () => {
  it('returns correct sonarr stats', async () => {
    const stats = await getMediaStats();

    expect(stats.sonarr.series).toBe(2);
    expect(stats.sonarr.queue).toBe(3);
    expect(stats.sonarr.missing).toBe(5);
  });

  it('returns correct radarr stats', async () => {
    const stats = await getMediaStats();

    expect(stats.radarr.movies).toBe(1);
    expect(stats.radarr.queue).toBe(1);
    expect(stats.radarr.missing).toBe(2);
  });

  it('returns correct jellyfin stats', async () => {
    const stats = await getMediaStats();

    expect(stats.jellyfin.movies).toBe(150);
    expect(stats.jellyfin.shows).toBe(30);
    expect(stats.jellyfin.episodes).toBe(500);
    expect(stats.jellyfin.activeSessions).toBe(1); // Only session1 has NowPlayingItem
  });

  it('returns zeros when sonarr is down', async () => {
    server.use(
      http.get('http://sonarr.media.svc.cluster.local:8989/api/v3/series', () => {
        return HttpResponse.error();
      }),
      http.get('http://sonarr.media.svc.cluster.local:8989/api/v3/queue', () => {
        return HttpResponse.error();
      }),
      http.get('http://sonarr.media.svc.cluster.local:8989/api/v3/wanted/missing', () => {
        return HttpResponse.error();
      })
    );

    const stats = await getMediaStats();

    expect(stats.sonarr.series).toBe(0);
    expect(stats.sonarr.queue).toBe(0);
    expect(stats.sonarr.missing).toBe(0);
    // Radarr and Jellyfin should still work
    expect(stats.radarr.movies).toBe(1);
    expect(stats.jellyfin.movies).toBe(150);
  });

  it('returns zeros when radarr returns non-200', async () => {
    server.use(
      http.get('http://radarr.media.svc.cluster.local:7878/api/v3/movie', () => {
        return new HttpResponse(null, { status: 500 });
      }),
      http.get('http://radarr.media.svc.cluster.local:7878/api/v3/queue', () => {
        return new HttpResponse(null, { status: 500 });
      }),
      http.get('http://radarr.media.svc.cluster.local:7878/api/v3/wanted/missing', () => {
        return new HttpResponse(null, { status: 500 });
      })
    );

    const stats = await getMediaStats();

    expect(stats.radarr.movies).toBe(0);
    expect(stats.radarr.queue).toBe(0);
    expect(stats.radarr.missing).toBe(0);
  });

  it('returns zero active sessions when jellyfin is down', async () => {
    server.use(
      http.get('http://jellyfin.media.svc.cluster.local:8096/emby/Items/Counts', () => {
        return HttpResponse.error();
      }),
      http.get('http://jellyfin.media.svc.cluster.local:8096/Sessions', () => {
        return HttpResponse.error();
      })
    );

    const stats = await getMediaStats();

    expect(stats.jellyfin.movies).toBe(0);
    expect(stats.jellyfin.shows).toBe(0);
    expect(stats.jellyfin.episodes).toBe(0);
    expect(stats.jellyfin.activeSessions).toBe(0);
  });
});
