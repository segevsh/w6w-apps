import type { ActionDefinition } from "@w6w/types";
import { assertUuid, BalenaClient, odataString, supervisorAccepted } from "../lib/client.ts";

/**
 * `POST /supervisor/v1/blink` — blink the device's LED for fifteen seconds.
 *
 * ## The only action here that reaches into the physical world
 *
 * Everything else in this app changes a database row or a container. This
 * makes a light flash on a board in a rack, a wall, or a machine on a factory
 * floor. It is the dashboard's "identify device" button, and its use is
 * answering "which of these forty identical boxes is `winter-sunset`?"
 *
 * That is worth an action of its own because the alternative is unplugging
 * things until something goes offline.
 *
 * ## Not every board has an LED
 *
 * The supervisor responds with an empty 200 whether or not the hardware can
 * blink. A device type with no user-controllable LED accepts the request and
 * nothing happens, and there is no way to tell from here — so this action says
 * so rather than reporting a success that may be invisible.
 */
const action: ActionDefinition = {
  key: "device-identify",
  type: "perform",
  resource: "device",
  title: "Identify a device",
  description:
    "Blink the device's LED for fifteen seconds — the dashboard's identify button, and the way " +
    "to tell which of forty identical boxes is which. Note the supervisor answers 200 whether " +
    "or not the hardware HAS an LED, so a silent success is possible.",
  idempotent: true,
  params: [
    { key: "uuid", label: "Device UUID", type: "string", required: true, default: "" },
  ],
  output: [
    { key: "uuid", type: "string", label: "Which device" },
    { key: "name", type: "string", label: "What it is called" },
    { key: "accepted", type: "boolean", label: "Whether the supervisor took the request" },
    { key: "durationSeconds", type: "number", label: "How long it blinks" },
    { key: "hardwareMayNotBlink", type: "boolean", label: "Always true — this cannot be verified" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const uuid = assertUuid(p.uuid);

    const client = new BalenaClient(ctx);
    const device = await client.one<{ is_online?: boolean; device_name?: string }>("device", {
      query: { $select: "is_online,device_name", $filter: `uuid eq ${odataString(uuid)}` },
    });
    if (!device) throw new Error(`no device has uuid ${uuid}`);
    if (device.is_online !== true) {
      throw new Error(`device ${uuid} is not online, so the supervisor cannot receive the request`);
    }

    const response = await client.supervisor("/v1/blink", uuid);

    return {
      uuid,
      name: device.device_name,
      accepted: supervisorAccepted(response),
      durationSeconds: 15,
      // The supervisor cannot report whether a light actually came on.
      hardwareMayNotBlink: true,
    };
  },
};

export default action;
