import type { ActionDefinition } from "@w6w/types";
import {
  assertUuid,
  BalenaClient,
  odataString,
  supervisorAccepted,
  supervisorError,
} from "../lib/client.ts";

/**
 * `POST /supervisor/v1/restart` — restart a device's services without
 * rebooting it.
 *
 * ## What "restart" means here is stronger than it sounds
 *
 * balena's own note: this route "will remove and recreate all service
 * containers". Not a signal to the process — the containers are destroyed and
 * built again from the same images. Anything in a container's writable layer
 * is gone; anything in a **named volume** or `/data` survives.
 *
 * That is usually what you want for a stuck service and it is not what
 * "restart" implies, so it is worth stating before somebody uses it to clear
 * a transient fault.
 *
 * ## It needs the fleet id, which the caller does not have
 *
 * The supervisor's body takes an `appId`, meaning the fleet the device belongs
 * to. Nobody driving a workflow has that to hand, so this action looks it up
 * from the uuid — the sort of thing an app should do rather than an API.
 *
 * ## Rebooting is the bigger hammer, and often the wrong one
 *
 * A reboot takes minutes and restarts the host OS. This takes seconds and
 * touches only the application. For a service that has wedged, this is the
 * proportionate response.
 */
const action: ActionDefinition = {
  key: "device-restart-services",
  type: "perform",
  resource: "device",
  title: "Restart a device's services",
  description:
    "Restart the application without rebooting the host. balena REMOVES AND RECREATES the " +
    "service containers — anything in a container's writable layer is gone, while named volumes " +
    "and `/data` survive. Looks up the fleet id the supervisor requires.",
  idempotent: true,
  params: [
    { key: "uuid", label: "Device UUID", type: "string", required: true, default: "" },
  ],
  output: [
    { key: "uuid", type: "string", label: "Which device" },
    { key: "fleetId", type: "number", label: "The fleet id the supervisor needed" },
    { key: "accepted", type: "boolean", label: "Whether the supervisor took the request" },
    { key: "blockedByLock", type: "boolean", label: "Refused because a service holds the lock" },
    { key: "response", type: "object", label: "What the supervisor said" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const uuid = assertUuid(p.uuid);

    const client = new BalenaClient(ctx);
    const device = await client.one<{
      is_online?: boolean;
      belongs_to__application?: { __id?: number } | null;
    }>("device", {
      query: {
        $select: "is_online,belongs_to__application",
        $filter: `uuid eq ${odataString(uuid)}`,
      },
    });
    if (!device) throw new Error(`no device has uuid ${uuid}`);
    if (device.is_online !== true) {
      throw new Error(
        `device ${uuid} is not online, so the supervisor cannot receive the request. balena does ` +
          "not queue supervisor actions for a device that is away",
      );
    }

    // The supervisor wants the fleet id; the caller has a uuid.
    const fleetId = device.belongs_to__application?.__id;
    if (!fleetId) {
      throw new Error(
        `device ${uuid} does not appear to belong to a fleet, so there is no ` +
          "`appId` to give the supervisor",
      );
    }

    const response = await client.supervisor("/v1/restart", uuid, { appId: fleetId });
    const error = supervisorError(response);
    const blockedByLock = Boolean(error && /lock/i.test(error));

    ctx.log(
      "info",
      "restarted a device's services — the containers were removed and recreated, " +
        "so anything written inside them and not in a volume is gone",
      { uuid },
    );

    return {
      uuid,
      fleetId,
      accepted: !blockedByLock && supervisorAccepted(response),
      blockedByLock,
      response,
    };
  },
};

export default action;
