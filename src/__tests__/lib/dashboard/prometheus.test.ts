import { describe, it, expect } from 'vitest';
import { server } from '../../mocks/server';
import { http, HttpResponse } from 'msw';
import { getClusterMetrics, queryPrometheus } from '@/lib/dashboard/prometheus';

describe('queryPrometheus', () => {
  it('returns the metric value string', async () => {
    const result = await queryPrometheus('count(kube_pod_status_phase{phase="Running"})');

    expect(result).toBe('42');
  });

  it('returns null when API errors', async () => {
    server.use(
      http.get('http://kube-prometheus-stack-prometheus.monitoring.svc.cluster.local:9090/api/v1/query', () => {
        return new HttpResponse(null, { status: 500 });
      })
    );

    const result = await queryPrometheus('some_metric');

    expect(result).toBeNull();
  });

  it('returns null when result is empty', async () => {
    server.use(
      http.get('http://kube-prometheus-stack-prometheus.monitoring.svc.cluster.local:9090/api/v1/query', () => {
        return HttpResponse.json({
          status: 'success',
          data: { resultType: 'vector', result: [] },
        });
      })
    );

    const result = await queryPrometheus('empty_metric');

    expect(result).toBeNull();
  });

  it('returns null on network failure', async () => {
    server.use(
      http.get('http://kube-prometheus-stack-prometheus.monitoring.svc.cluster.local:9090/api/v1/query', () => {
        return HttpResponse.error();
      })
    );

    const result = await queryPrometheus('some_metric');

    expect(result).toBeNull();
  });
});

describe('getClusterMetrics', () => {
  it('returns parsed cluster metrics', async () => {
    const metrics = await getClusterMetrics();

    expect(metrics.pods).toBe(42);
    expect(metrics.namespaces).toBe(12);
    expect(metrics.cpuRequestPercent).toBe(35);
    expect(metrics.memoryUsagePercent).toBe(65);
  });

  it('returns zeros when prometheus is unreachable', async () => {
    server.use(
      http.get('http://kube-prometheus-stack-prometheus.monitoring.svc.cluster.local:9090/api/v1/query', () => {
        return HttpResponse.error();
      })
    );

    const metrics = await getClusterMetrics();

    expect(metrics.pods).toBe(0);
    expect(metrics.namespaces).toBe(0);
    expect(metrics.cpuRequestPercent).toBe(0);
    expect(metrics.memoryUsagePercent).toBe(0);
  });
});
