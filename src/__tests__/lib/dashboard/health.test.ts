import { describe, it, expect } from 'vitest';
import { server } from '../../mocks/server';
import { http, HttpResponse } from 'msw';
import { checkAllServices, groupServices } from '@/lib/dashboard/health';

describe('checkAllServices', () => {
  it('returns status for all configured services', async () => {
    const services = await checkAllServices();

    // There are 18 services defined in health.ts
    expect(services.length).toBe(18);
  });

  it('marks reachable services as up', async () => {
    const services = await checkAllServices();

    const ha = services.find((s) => s.name === 'Home Assistant');
    expect(ha).toBeDefined();
    expect(ha!.status).toBe('up');
  });

  it('includes response time for healthy services', async () => {
    const services = await checkAllServices();

    const ha = services.find((s) => s.name === 'Home Assistant');
    expect(ha!.responseTime).toBeDefined();
    expect(typeof ha!.responseTime).toBe('number');
  });

  it('marks unreachable services as down', async () => {
    server.use(
      http.head('http://home-assistant.home-assistant.svc.cluster.local:8123', () => {
        return HttpResponse.error();
      })
    );

    const services = await checkAllServices();

    const ha = services.find((s) => s.name === 'Home Assistant');
    expect(ha!.status).toBe('down');
  });

  it('treats 401 responses as up (auth-required services)', async () => {
    server.use(
      http.head('http://n8n.cloud.svc.cluster.local:5678', () => {
        return new HttpResponse(null, { status: 401 });
      })
    );

    const services = await checkAllServices();

    const n8n = services.find((s) => s.name === 'N8N');
    expect(n8n!.status).toBe('up');
  });

  it('treats 500 errors as down', async () => {
    server.use(
      http.head('http://n8n.cloud.svc.cluster.local:5678', () => {
        return new HttpResponse(null, { status: 500 });
      })
    );

    const services = await checkAllServices();

    const n8n = services.find((s) => s.name === 'N8N');
    expect(n8n!.status).toBe('down');
  });

  it('preserves url and checkUrl fields', async () => {
    const services = await checkAllServices();

    const grafana = services.find((s) => s.name === 'Grafana');
    expect(grafana!.url).toBe('https://grafana.thehudsonfam.com');
    expect(grafana!.checkUrl).toBe('http://kube-prometheus-stack-grafana.monitoring.svc.cluster.local:80');
  });
});

describe('groupServices', () => {
  it('groups services by their group field', async () => {
    const services = await checkAllServices();
    const grouped = groupServices(services);

    expect(grouped['Home & Automation']).toBeDefined();
    expect(grouped['Documents & Data']).toBeDefined();
    expect(grouped['Media Center']).toBeDefined();
    expect(grouped['Infrastructure']).toBeDefined();
  });

  it('Home & Automation has 3 services', async () => {
    const services = await checkAllServices();
    const grouped = groupServices(services);

    expect(grouped['Home & Automation']).toHaveLength(3);
  });

  it('Media Center has 9 services', async () => {
    const services = await checkAllServices();
    const grouped = groupServices(services);

    expect(grouped['Media Center']).toHaveLength(9);
  });

  it('Infrastructure has 4 services', async () => {
    const services = await checkAllServices();
    const grouped = groupServices(services);

    expect(grouped['Infrastructure']).toHaveLength(4);
  });
});
