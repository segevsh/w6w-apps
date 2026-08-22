import type { ActionDefinition } from "@w6w/types";
import { deviceId, ParticleClient } from "../lib/client.ts";
import { DEVICE_PARAM } from "../lib/params.ts";

/**
 * `GET /v1/devices/{id}` — one device, and what its firmware exposes.
 *
 * ## This is where you find out what the device can actually do
 *
 * `variables` and `functions` are declared by the **firmware running on the
 * device**, not by anything in the cloud. A device flashed with different code
 * exposes different names, and calling one that is not there is a 404 that
 * looks like a missing device rather than a missing function.
 *
 * So this is the call to make before `function-call` or `variable-get` — it is
 * the only place the contract is written down, and the contract changes when
 * somebody flashes firmware.
 *
 * ## The variable list arrives with types
 *
 * `{"temperature": "double", "status": "string"}`. A `string` variable is
 * capped at a few hundred bytes and a workflow expecting JSON out of one will
 * find it truncated at the device end rather than here.
 *
 * ## `connected` is a moment, not a property
 *
 * It is true if the device has an open connection to the cloud right now.
 * Paired with `last_heard` it is the whole picture, and neither alone is.
 */
const action: ActionDefinition = {
  key: "device-get",
  type: "read",
  resource: "device",
  title: "Get a device",
  description:
    "One device, with the VARIABLES and FUNCTIONS its current firmware exposes — the only place " +
    "that contract is written down, and it changes whenever the device is reflashed.",
  params: [DEVICE_PARAM],
  output: [
    { key: "device", type: "object", label: "The device" },
    { key: "name", type: "string", label: "Its name" },
    { key: "connected", type: "boolean", label: "Whether it is reachable right now" },
    { key: "lastHeard", type: "string", label: "When the cloud last heard from it" },
    { key: "variables", type: "object", label: "Variable names and their declared types" },
    { key: "functions", type: "array", label: "Function names the firmware declares" },
    { key: "firmwareVersion", type: "string", label: "Device OS version" },
    { key: "platform", type: "string", label: "The hardware" },
    { key: "cellular", type: "boolean", label: "Whether it connects over cellular" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = deviceId(p.deviceId);

    const device = await new ParticleClient(ctx).request<{
      name?: string;
      connected?: boolean;
      last_heard?: string;
      variables?: Record<string, string>;
      functions?: string[];
      system_firmware_version?: string;
      platform_id?: number;
      cellular?: boolean;
    }>(`/v1/devices/${id}`);

    if (device?.connected !== true) {
      ctx.log(
        "info",
        "this Particle device is not currently connected — which for a sleeping or " +
          "battery-powered device is normal rather than a fault",
        { lastHeard: device?.last_heard },
      );
    }

    return {
      device,
      name: device?.name,
      connected: device?.connected === true,
      lastHeard: device?.last_heard,
      // Declared by the firmware, and only true of the firmware running now.
      variables: device?.variables ?? {},
      functions: device?.functions ?? [],
      firmwareVersion: device?.system_firmware_version,
      platform: device?.platform_id === undefined ? undefined : String(device.platform_id),
      cellular: device?.cellular === true,
    };
  },
};

export default action;
