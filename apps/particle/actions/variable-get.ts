import type { ActionDefinition } from "@w6w/types";
import { deviceId, ParticleClient } from "../lib/client.ts";
import { DEVICE_PARAM } from "../lib/params.ts";

/**
 * `GET /v1/devices/{id}/{variable}` — read a value **off the device**.
 *
 * ## This is a round trip to hardware, and it can simply not answer
 *
 * The cloud does not hold the value. The request goes out over the device's own
 * connection, the firmware computes the answer, and it comes back — so the
 * latency is the device's, and a device that is asleep or out of coverage
 * produces a timeout rather than a stale reading.
 *
 * That is a feature: the number is true *now*, not when something last
 * reported. It is also why this action reads `connected` first and says the
 * device is unreachable rather than letting the caller interpret a timeout.
 *
 * ## The variable must exist in the firmware currently running
 *
 * `device-get` lists what the firmware declares. A name that is not there is a
 * 404, indistinguishable from a missing device unless you know which you asked
 * for — so this checks the declared list first when it can.
 *
 * ## Types are declared, and a string variable is small
 *
 * `int`, `double` and `string`. A string variable is capped at a few hundred
 * bytes and the device truncates rather than the cloud, so JSON stuffed into
 * one arrives unparseable with nothing having reported an error.
 */
const action: ActionDefinition = {
  key: "variable-get",
  type: "read",
  resource: "variable",
  title: "Read a device variable",
  description:
    "Read a value off the device itself — a round trip to hardware, so the number is true NOW " +
    "and an unreachable device times out rather than returning something stale.",
  params: [
    DEVICE_PARAM,
    {
      key: "variable",
      label: "Variable",
      type: "string",
      required: true,
      default: "",
      hint: "As declared by the firmware currently running — `device-get` lists them.",
    },
    {
      key: "checkFirst",
      label: "Check the device is reachable first",
      type: "boolean",
      default: true,
      hint: "Costs one extra call and turns an unexplained timeout into a clear answer.",
    },
  ],
  output: [
    { key: "value", type: "string", label: "The value, as the device reported it" },
    { key: "name", type: "string", label: "The variable" },
    { key: "deviceName", type: "string", label: "Which device answered" },
    { key: "connected", type: "boolean", label: "Whether the device was connected" },
    { key: "readAt", type: "string", label: "When the device answered" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = deviceId(p.deviceId);
    const variable = String(p.variable ?? "").trim();
    if (!variable) throw new Error("`variable` is required");

    const client = new ParticleClient(ctx);

    if (p.checkFirst !== false) {
      // A timeout from an unreachable device says nothing useful on its own.
      const device = await client.request<{
        connected?: boolean;
        last_heard?: string;
        variables?: Record<string, string>;
      }>(`/v1/devices/${id}`);

      if (device?.connected !== true) {
        throw new Error(
          `this device is not connected (last heard ${device?.last_heard ?? "never"}), so it ` +
            "cannot answer. Reading a variable is a round trip to the hardware rather than a " +
            "lookup of something the cloud stored — for a sleeping device, subscribe to the " +
            "events it publishes when it wakes instead",
        );
      }

      const declared = Object.keys(device?.variables ?? {});
      if (declared.length && !declared.includes(variable)) {
        throw new Error(
          `the firmware running on this device declares no variable "${variable}" — it declares ` +
            `${declared.join(", ")}. The list changes when the device is reflashed, and asking ` +
            "for a name that is not there is a 404 that looks like a missing device",
        );
      }
    }

    const result = await client.request<{
      name?: string;
      result?: unknown;
      coreInfo?: { connected?: boolean; last_heard?: string; deviceID?: string };
    }>(`/v1/devices/${id}/${encodeURIComponent(variable)}`);

    // The name and the device. Never the value — it is sensor data, and what
    // a device measures can be personal.
    ctx.log("info", "read a Particle device variable", { name: variable });

    return {
      value: result?.result,
      name: result?.name ?? variable,
      deviceName: undefined,
      connected: result?.coreInfo?.connected === true,
      readAt: result?.coreInfo?.last_heard,
    };
  },
};

export default action;
