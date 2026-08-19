import type { ActionDefinition } from "@w6w/types";
import {
  assertUuid,
  BalenaClient,
  odataString,
  supervisorAccepted,
  supervisorError,
} from "../lib/client.ts";

/**
 * `POST /supervisor/v1/purge` — delete a device's persistent data.
 *
 * ## This is the destructive one
 *
 * It clears `/data` and every named volume. On a device that has been
 * collecting readings since it was installed, that is all of them — and there
 * is no undo, no snapshot, and nothing balena keeps.
 *
 * The containers are removed and recreated as a side effect, because a volume
 * cannot be deleted while a container holds it. So a purge is also a restart,
 * and it takes the services down for as long as recreating them takes.
 *
 * ## When it is the right answer
 *
 * A device whose local database has corrupted, a cache that has filled the
 * disk, a test device being handed to somebody else. All cases where the data
 * is known to be worthless — which is why this action requires saying so.
 *
 * ## It needs the fleet id, and the caller has a uuid
 *
 * Same as `device-restart-services`: the supervisor's body wants an `appId`.
 * This looks it up.
 */
const action: ActionDefinition = {
  key: "device-purge-data",
  type: "perform",
  resource: "device",
  title: "Purge a device's data",
  description:
    "DESTRUCTIVE. Clears `/data` and every named volume — years of readings, gone, with no " +
    "snapshot and no undo. It also removes and recreates the containers, because a volume " +
    "cannot be deleted while one holds it, so the services go down with it.",
  idempotent: false,
  params: [
    { key: "uuid", label: "Device UUID", type: "string", required: true, default: "" },
    {
      key: "confirm",
      label: "Confirm",
      type: "boolean",
      default: false,
      required: true,
      hint: "There is no undo. balena keeps no copy of what was in `/data` or in a named volume.",
    },
  ],
  output: [
    { key: "uuid", type: "string", label: "Which device" },
    { key: "name", type: "string", label: "What it is called" },
    { key: "fleetId", type: "number", label: "The fleet id the supervisor needed" },
    { key: "purged", type: "boolean", label: "Whether the data was cleared" },
    { key: "blockedByLock", type: "boolean", label: "Refused because a service holds the lock" },
    { key: "response", type: "object", label: "What the supervisor said" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const uuid = assertUuid(p.uuid);
    if (p.confirm !== true) {
      throw new Error(
        "set `confirm` to purge this device's data. It clears `/data` and every named volume — " +
          "everything the device has stored locally — and balena keeps no copy. The containers " +
          "are recreated as part of it, so the services also go down",
      );
    }

    const client = new BalenaClient(ctx);
    const device = await client.one<{
      is_online?: boolean;
      device_name?: string;
      belongs_to__application?: { __id?: number } | null;
    }>("device", {
      query: {
        $select: "is_online,device_name,belongs_to__application",
        $filter: `uuid eq ${odataString(uuid)}`,
      },
    });
    if (!device) throw new Error(`no device has uuid ${uuid}`);
    if (device.is_online !== true) {
      throw new Error(`device ${uuid} is not online, so the supervisor cannot receive the request`);
    }
    const fleetId = device.belongs_to__application?.__id;
    if (!fleetId) {
      throw new Error(
        `device ${uuid} does not appear to belong to a fleet, so there is no ` +
          "`appId` to give the supervisor",
      );
    }

    const response = await client.supervisor("/v1/purge", uuid, { appId: fleetId });
    const error = supervisorError(response);
    const blockedByLock = Boolean(error && /lock/i.test(error));

    if (!blockedByLock) {
      ctx.log(
        "warn",
        "purged a device's persistent data — `/data` and every named volume are " +
          "empty, and the containers were recreated",
        { uuid },
      );
    }

    return {
      uuid,
      name: device.device_name,
      fleetId,
      purged: !blockedByLock && supervisorAccepted(response),
      blockedByLock,
      response,
    };
  },
};

export default action;
