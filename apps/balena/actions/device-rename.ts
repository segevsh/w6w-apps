import type { ActionDefinition } from "@w6w/types";
import { assertUuid, BalenaClient, odataString } from "../lib/client.ts";

/**
 * `PATCH /v7/device(uuid='…')` with a new `device_name`.
 *
 * ## Names are not unique, and nothing stops two devices sharing one
 *
 * balena generates a friendly name at provisioning — `winter-sunset`,
 * `holy-frost` — and a workflow renaming devices to something meaningful is a
 * good use of this API. What it will not get is uniqueness: two devices may
 * carry the same name, and every lookup by name then returns both.
 *
 * So this action refuses to rename a device to a name already in use *in the
 * same fleet* unless told to, which keeps the fleet's names usable as
 * identifiers even though balena does not require it.
 *
 * ## The uuid is the identifier, always
 *
 * Renaming changes nothing else. Anything keyed on the uuid keeps working, and
 * anything keyed on the name breaks — which is the argument for keying on the
 * uuid.
 */
const action: ActionDefinition = {
  key: "device-rename",
  type: "perform",
  resource: "device",
  title: "Rename a device",
  description:
    "Give a device a meaningful name. balena does NOT enforce uniqueness, so this refuses a " +
    "name already used in the same fleet unless told otherwise — a duplicate makes every " +
    "lookup by name ambiguous.",
  idempotent: true,
  params: [
    { key: "uuid", label: "Device UUID", type: "string", required: true, default: "" },
    {
      key: "name",
      label: "New name",
      type: "string",
      required: true,
      default: "",
    },
    {
      key: "allowDuplicate",
      label: "Allow a name already used in this fleet",
      type: "boolean",
      default: false,
    },
  ],
  output: [
    { key: "uuid", type: "string", label: "Which device" },
    { key: "name", type: "string", label: "What it is called now" },
    { key: "previousName", type: "string", label: "What it was called" },
    { key: "changed", type: "boolean", label: "Whether anything changed" },
    { key: "duplicateOf", type: "array", label: "Other devices in the fleet with this name" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const uuid = assertUuid(p.uuid);
    const name = String(p.name ?? "").trim();
    if (!name) throw new Error("`name` is required");

    const client = new BalenaClient(ctx);
    const device = await client.one<{
      id?: number;
      device_name?: string;
      belongs_to__application?: { __id?: number } | null;
    }>("device", {
      query: {
        $select: "id,device_name,belongs_to__application",
        $filter: `uuid eq ${odataString(uuid)}`,
      },
    });
    if (!device) throw new Error(`no device has uuid ${uuid}`);

    const fleetId = device.belongs_to__application?.__id;
    let duplicateOf: string[] = [];
    if (fleetId) {
      const sameName = await client.list<{ uuid?: string }>("device", {
        query: {
          $select: "uuid",
          $filter: `belongs_to__application eq ${fleetId} and device_name eq ${odataString(name)}`,
        },
      });
      duplicateOf = sameName.map((other) => other?.uuid).filter((other): other is string =>
        Boolean(other) && other !== uuid
      );
    }

    if (duplicateOf.length && p.allowDuplicate !== true) {
      throw new Error(
        `another device in this fleet is already called ${JSON.stringify(name)} (${
          duplicateOf.join(", ")
        }). balena permits duplicates and every lookup by name then returns both, so set ` +
          "`allowDuplicate` if that is intended",
      );
    }

    await client.request(`/v7/device(uuid=${odataString(uuid)})`, {
      method: "PATCH",
      body: { device_name: name },
    });

    return {
      uuid,
      name,
      previousName: device.device_name,
      changed: device.device_name !== name,
      duplicateOf,
    };
  },
};

export default action;
