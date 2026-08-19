import type { ActionDefinition } from "@w6w/types";
import { deviceId, ParticleClient } from "../lib/client.ts";
import { DEVICE_PARAM } from "../lib/params.ts";

/**
 * `GET /v1/diagnostics/{id}/last` — the device's own vitals.
 *
 * ## The three numbers that explain most field failures
 *
 * - **Signal strength.** A cellular device at the edge of coverage reconnects
 *   constantly, burns data doing it, and looks intermittently offline. The
 *   `strength` percentage and `quality` are the difference between "the device
 *   is broken" and "the device is in a metal cupboard".
 * - **Battery.** `soc` (state of charge) and the charging state. A device
 *   reporting fine at 4% is about to go quiet, and nothing else predicts it.
 * - **Free memory.** A firmware leak shows here as free memory falling between
 *   reports, days before the device starts resetting.
 *
 * None of these are visible from `device-get`, and all three are the actual
 * cause when a device "keeps dropping off".
 *
 * ## These are the LAST reported vitals, not live ones
 *
 * The device sends them periodically; this reads what it last sent. So an
 * offline device still has diagnostics — from before it went offline, which is
 * usually exactly the interesting moment. The timestamp is what makes them
 * interpretable, and it is returned.
 */
const action: ActionDefinition = {
  key: "diagnostics-get",
  type: "read",
  resource: "device",
  title: "Get device diagnostics",
  description:
    "The device's last reported vitals — signal strength, battery and free memory, which explain " +
    "most field failures and none of which appear in `device-get`. These are the LAST reported " +
    "values, so an offline device still has them, from just before it went quiet.",
  params: [DEVICE_PARAM],
  output: [
    { key: "diagnostics", type: "object", label: "The full payload" },
    { key: "updatedAt", type: "string", label: "When the device last reported — read this first" },
    { key: "signalStrength", type: "number", label: "Percentage; low means constant reconnection" },
    { key: "signalQuality", type: "number", label: "Percentage" },
    { key: "batteryCharge", type: "number", label: "State of charge, percent" },
    { key: "batteryState", type: "string", label: "charging, discharging, charged" },
    { key: "freeMemory", type: "number", label: "Bytes; falling between reports is a leak" },
    { key: "uptimeSeconds", type: "number", label: "Since the last reset" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = deviceId(p.deviceId);

    const response = await new ParticleClient(ctx).request<{
      diagnostics?: {
        updated_at?: string;
        payload?: {
          device?: {
            network?: {
              signal?: { strength?: number; quality?: number };
              cellular?: { radio_access_technology?: string };
            };
            power?: { battery?: { charge?: number; state?: string } };
            system?: { memory?: { used?: number; total?: number }; uptime?: number };
          };
        };
      };
    }>(`/v1/diagnostics/${id}/last`);

    const diagnostics = response?.diagnostics;
    const device = diagnostics?.payload?.device;
    const memory = device?.system?.memory;
    const freeMemory = memory?.total !== undefined && memory?.used !== undefined
      ? memory.total - memory.used
      : undefined;

    const strength = device?.network?.signal?.strength;
    if (typeof strength === "number" && strength < 30) {
      ctx.log(
        "warn",
        "this device's last reported signal strength was low — a device at the edge of coverage " +
          "reconnects constantly, uses data doing it, and looks intermittently offline",
        { strength },
      );
    }

    return {
      diagnostics,
      // Read this first: an offline device's vitals are from before it went.
      updatedAt: diagnostics?.updated_at,
      signalStrength: strength,
      signalQuality: device?.network?.signal?.quality,
      batteryCharge: device?.power?.battery?.charge,
      batteryState: device?.power?.battery?.state,
      freeMemory,
      uptimeSeconds: device?.system?.uptime,
    };
  },
};

export default action;
