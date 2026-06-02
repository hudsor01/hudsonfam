import type { RequestHandler } from "msw";

/**
 * MSW request handlers.
 *
 * The previous handlers (Prometheus / Sonarr / Radarr / Jellyfin / n8n /
 * Grafana) mocked the homelab-monitoring dashboard, which was removed in
 * Phase 30 (cloud re-platform). No remaining code or test calls those
 * endpoints, so the list is empty. The MSW server (`server.ts`) still runs in
 * `setup.ts` for any future handlers; with none registered it simply passes
 * requests through.
 */
export const handlers: RequestHandler[] = [];
