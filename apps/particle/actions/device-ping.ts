import type { ActionDefinition } from "@w6w/types";
import { deviceId, ParticleClient } from "../lib/client.ts";
import { DEVICE_PARAM } from "../lib/params.ts";

/**
 * `PUT /v1/devices/{id}/ping` — ask the cloud to actually check.
 *
 * ## `connected` can be stale; this cannot
 *
 * The `connected` flag on a device record is the cloud's belief about the
 * connection. A device that lost power, lost signal or crashed does not
 * announce it — the cloud finds out when the connection times out, which takes
 * a while. So a device can read `connected: true` and be gone.
 *
 * A ping forces a round trip **now**. It is the difference between "we think it
 * is there" and "it answered", and it is the only way to tell them apart.
 *
 * ## It costs the device something, which matters on cellular
 *
 * Every ping is data over the device's own connection, and on a metered
 * cellular SIM that is a real if small cost. Pinging a fleet on a schedule is a
 * data bill; pinging one device before acting on it is sensible. This action
 * exists for the second.
 *
 * ## The answer also updates `last_heard`
 *
 * So a successful ping is visible afterwards in `device-get`, which is
 * occasionally useful and occasionally confusing — a device may look recently
 * heard from because something pinged it, not because it reported anything.
 */
const action: ActionDefinition = {
  key: "device-ping",
  type: "perform",
  resource: "device",
  title: "Ping a device",
  description:
    "Force a round trip to the device, rather than trusting the cached `connected` flag — which " +
    "stays true until a lost connection times out. Costs the device a little data, which is real " +
    "on a metered cellular SIM.",
  idempotent: true,
  params: [DEVICE_PARAM],
  output: [
    { key: "online", type: "boolean", label: "Whether the device answered, right now" },
    { key: "id", type: "string", label: "The device" },
    { key: "cachedConnected", type: "boolean", label: "What the record said before the ping" },
    { key: "stale", type: "boolean", label: "True when the record disagreed with reality" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = deviceId(p.deviceId);

    const client = new ParticleClient(ctx);
    // What the cloud believed, before asking.
    const before = await client.request<{ connected?: boolean }>(`/v1/devices/${id}`);
    const cachedConnected = before?.connected === true;

    const result = await client.request<{ online?: boolean; ok?: boolean }>(
      `/v1/devices/${id}/ping`,
      { method: "PUT" },
    );
    const online = result?.online === true;

    // The interesting case: the record said one thing and the device said
    // another.
    const stale = cachedConnected !== online;
    if (stale) {
      ctx.log(
        "warn",
        online
          ? "this device answered a ping while its record said it was disconnected"
          : "this device did not answer a ping although its record says it is connected — the " +
            "flag stays true until the lost connection times out",
        { id },
      );
    }

    return { online, id, cachedConnected, stale };
  },
};

export default action;
