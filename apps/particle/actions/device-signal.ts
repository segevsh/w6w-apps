import type { ActionDefinition } from "@w6w/types";
import { deviceId, ParticleClient } from "../lib/client.ts";
import { DEVICE_PARAM } from "../lib/params.ts";

/**
 * `PUT /v1/devices/{id}` with `signal=1` — make the device flash a rainbow.
 *
 * ## The one action here whose output is in the physical world
 *
 * It answers "which of these forty identical boxes on the wall is
 * `0123456789abcdef01234567`" — by making that one, and only that one, cycle
 * its status LED. There is no software equivalent: the device id is not
 * printed on the case, and the only way to correlate a record with a physical
 * object is to make the object announce itself.
 *
 * It is entirely harmless. It runs no user firmware, changes no state, and
 * stops when told to or when the device resets — which is worth saying,
 * because everything else in this app that reaches a device does something.
 *
 * ## It needs the device to be connected, like everything else
 *
 * A device that is asleep does not flash, and nothing queues the request for
 * when it wakes.
 */
const action: ActionDefinition = {
  key: "device-signal",
  type: "perform",
  resource: "device",
  title: "Signal a device",
  description:
    "Make one device flash a rainbow so a person can find it physically — the only way to " +
    "correlate a device id with a box on a wall. Runs no firmware and changes no state.",
  idempotent: true,
  params: [
    DEVICE_PARAM,
    {
      key: "on",
      label: "Signalling",
      type: "boolean",
      default: true,
      hint: "Off stops it. It also stops when the device resets.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "The device" },
    { key: "signaling", type: "boolean", label: "Whether it is now flashing" },
    { key: "connected", type: "boolean", label: "Whether the device was reachable" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = deviceId(p.deviceId);
    const on = p.on !== false;

    const result = await new ParticleClient(ctx).request<{
      signaling?: boolean;
      connected?: boolean;
      ok?: boolean;
    }>(`/v1/devices/${id}`, {
      method: "PUT",
      form: { signal: on ? "1" : "0" },
    });

    ctx.log("info", on ? "set a Particle device signalling" : "stopped a device signalling", {
      id,
    });

    return {
      id,
      signaling: result?.signaling ?? on,
      connected: result?.connected !== false,
    };
  },
};

export default action;
