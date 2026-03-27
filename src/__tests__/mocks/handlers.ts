import { http, HttpResponse } from 'msw';

// Prometheus API
const prometheusHandlers = [
  http.get('http://kube-prometheus-stack-prometheus.monitoring.svc.cluster.local:9090/api/v1/query', ({ request }) => {
    const url = new URL(request.url);
    const query = url.searchParams.get('query') || '';

    if (query.includes('kube_pod_status_phase')) {
      return HttpResponse.json({
        status: 'success',
        data: { resultType: 'vector', result: [{ value: [0, '42'] }] },
      });
    }
    if (query.includes('kube_namespace_status_phase')) {
      return HttpResponse.json({
        status: 'success',
        data: { resultType: 'vector', result: [{ value: [0, '12'] }] },
      });
    }
    if (query.includes('cpu')) {
      return HttpResponse.json({
        status: 'success',
        data: { resultType: 'vector', result: [{ value: [0, '35'] }] },
      });
    }
    if (query.includes('memory') || query.includes('node_memory')) {
      return HttpResponse.json({
        status: 'success',
        data: { resultType: 'vector', result: [{ value: [0, '65'] }] },
      });
    }
    return HttpResponse.json({
      status: 'success',
      data: { resultType: 'vector', result: [{ value: [0, '0'] }] },
    });
  }),
];

// Sonarr API
const sonarrHandlers = [
  http.get('http://sonarr.media.svc.cluster.local:8989/api/v3/series', () => {
    return HttpResponse.json([
      { id: 1, title: 'Test Show', monitored: true },
      { id: 2, title: 'Show 2', monitored: true },
    ]);
  }),
  http.get('http://sonarr.media.svc.cluster.local:8989/api/v3/queue', () => {
    return HttpResponse.json({ totalRecords: 3, records: [] });
  }),
  http.get('http://sonarr.media.svc.cluster.local:8989/api/v3/wanted/missing', () => {
    return HttpResponse.json({ totalRecords: 5 });
  }),
];

// Radarr API
const radarrHandlers = [
  http.get('http://radarr.media.svc.cluster.local:7878/api/v3/movie', () => {
    return HttpResponse.json([
      { id: 1, title: 'Test Movie', monitored: true },
    ]);
  }),
  http.get('http://radarr.media.svc.cluster.local:7878/api/v3/queue', () => {
    return HttpResponse.json({ totalRecords: 1, records: [] });
  }),
  http.get('http://radarr.media.svc.cluster.local:7878/api/v3/wanted/missing', () => {
    return HttpResponse.json({ totalRecords: 2 });
  }),
];

// Jellyfin API
const jellyfinHandlers = [
  http.get('http://jellyfin.media.svc.cluster.local:8096/emby/Items/Counts', () => {
    return HttpResponse.json({
      MovieCount: 150,
      SeriesCount: 30,
      EpisodeCount: 500,
    });
  }),
  http.get('http://jellyfin.media.svc.cluster.local:8096/Sessions', () => {
    return HttpResponse.json([
      { Id: 'session1', NowPlayingItem: { Name: 'Movie' } },
      { Id: 'session2' },
    ]);
  }),
];

// Open-Meteo Weather API
const weatherHandlers = [
  http.get('https://api.open-meteo.com/v1/forecast', () => {
    return HttpResponse.json({
      current: {
        temperature_2m: 72.4,
        apparent_temperature: 70.1,
        weather_code: 1,
        wind_speed_10m: 8.3,
        relative_humidity_2m: 45,
      },
    });
  }),
];

// Service health checks (all K8s internal services)
const healthCheckHandlers = [
  http.head('http://home-assistant.home-assistant.svc.cluster.local:8123', () => {
    return new HttpResponse(null, { status: 200 });
  }),
  http.head('http://n8n.cloud.svc.cluster.local:5678', () => {
    return new HttpResponse(null, { status: 200 });
  }),
  http.head('http://jellyfin.media.svc.cluster.local:8096', () => {
    return new HttpResponse(null, { status: 200 });
  }),
  http.head('http://kube-prometheus-stack-grafana.monitoring.svc.cluster.local:80', () => {
    return new HttpResponse(null, { status: 200 });
  }),
  // Catch-all for other services -- return 200
  http.head(/\.svc\.cluster\.local/, () => {
    return new HttpResponse(null, { status: 200 });
  }),
];

export const handlers = [
  ...prometheusHandlers,
  ...sonarrHandlers,
  ...radarrHandlers,
  ...jellyfinHandlers,
  ...weatherHandlers,
  ...healthCheckHandlers,
];
