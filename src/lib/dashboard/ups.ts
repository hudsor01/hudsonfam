import { UpsStatus } from "./types";
import { queryPrometheus } from "./prometheus";

const DEFAULT_UPS_STATUS: UpsStatus = {
  status: "Unknown",
  batteryCharge: 0,
  load: 0,
  runtimeMinutes: 0,
};

export async function getUpsStatus(): Promise<UpsStatus> {
  try {
    const [batteryCharge, load, runtimeSeconds, status] = await Promise.all([
      queryPrometheus("network_ups_tools_battery_charge"),
      queryPrometheus("network_ups_tools_ups_load"),
      queryPrometheus("network_ups_tools_battery_runtime"),
      queryPrometheus("network_ups_tools_ups_status"),
    ]);

    // UPS status values: 1=OL (online), 2=OB (on battery), 3=LB (low battery)
    let statusText = "Unknown";
    if (status) {
      const statusVal = parseFloat(status);
      if (statusVal === 1) statusText = "Online";
      else if (statusVal === 2) statusText = "On Battery";
      else if (statusVal === 3) statusText = "Low Battery";
    }

    return {
      status: statusText,
      batteryCharge: batteryCharge ? Math.round(parseFloat(batteryCharge)) : 0,
      load: load ? Math.round(parseFloat(load)) : 0,
      runtimeMinutes: runtimeSeconds
        ? Math.round(parseFloat(runtimeSeconds) / 60)
        : 0,
    };
  } catch {
    return DEFAULT_UPS_STATUS;
  }
}
