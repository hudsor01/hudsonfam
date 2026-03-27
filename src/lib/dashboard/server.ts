import { ServerStats } from "./types";
import { queryPrometheus } from "./prometheus";

const DEFAULT_SERVER_STATS: ServerStats = {
  disk: { totalGb: 0, usedGb: 0, usedPercent: 0 },
  cpu: { usagePercent: 0, cores: 0 },
  memory: { totalGb: 0, usedGb: 0, usedPercent: 0 },
};

export async function getServerStats(): Promise<ServerStats> {
  try {
    const [
      diskTotal,
      diskUsed,
      cpuUsage,
      cpuCores,
      memTotal,
      memAvailable,
    ] = await Promise.all([
      queryPrometheus(
        'node_filesystem_size_bytes{mountpoint="/",fstype!="rootfs"} / 1024 / 1024 / 1024'
      ),
      queryPrometheus(
        '(node_filesystem_size_bytes{mountpoint="/",fstype!="rootfs"} - node_filesystem_avail_bytes{mountpoint="/",fstype!="rootfs"}) / 1024 / 1024 / 1024'
      ),
      queryPrometheus(
        'round((1 - avg(rate(node_cpu_seconds_total{mode="idle"}[5m]))) * 100)'
      ),
      queryPrometheus("count(node_cpu_seconds_total{mode=\"idle\"})"),
      queryPrometheus("node_memory_MemTotal_bytes / 1024 / 1024 / 1024"),
      queryPrometheus("node_memory_MemAvailable_bytes / 1024 / 1024 / 1024"),
    ]);

    const totalGb = diskTotal ? parseFloat(parseFloat(diskTotal).toFixed(1)) : 0;
    const usedGb = diskUsed ? parseFloat(parseFloat(diskUsed).toFixed(1)) : 0;
    const memTotalGb = memTotal ? parseFloat(parseFloat(memTotal).toFixed(1)) : 0;
    const memAvailGb = memAvailable
      ? parseFloat(parseFloat(memAvailable).toFixed(1))
      : 0;
    const memUsedGb = parseFloat((memTotalGb - memAvailGb).toFixed(1));

    return {
      disk: {
        totalGb,
        usedGb,
        usedPercent: totalGb > 0 ? Math.round((usedGb / totalGb) * 100) : 0,
      },
      cpu: {
        usagePercent: cpuUsage ? parseInt(cpuUsage, 10) : 0,
        cores: cpuCores ? parseInt(cpuCores, 10) : 0,
      },
      memory: {
        totalGb: memTotalGb,
        usedGb: memUsedGb,
        usedPercent:
          memTotalGb > 0 ? Math.round((memUsedGb / memTotalGb) * 100) : 0,
      },
    };
  } catch {
    return DEFAULT_SERVER_STATS;
  }
}
