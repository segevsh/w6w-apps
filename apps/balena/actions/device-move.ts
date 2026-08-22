import type { ActionDefinition } from "@w6w/types";
import { assertUuid, BalenaClient, odataString } from "../lib/client.ts";

/**
 * `PATCH /v7/device(uuid='…')` with a new `belongs_to__application`.
 *
 * ## Moving a device changes what it runs, immediately
 *
 * The device leaves one fleet's target release and takes up another's. Next
 * time it checks in — which for an online device is seconds — it downloads
 * and starts a different set of containers. This is not a bookkeeping change;
 * it is a deployment.
 *
 * ## The device types have to be compatible
 *
 * A fleet is built for a device type, and balena refuses a move to a fleet
 * whose type the device cannot run. It permits moves within a compatible
 * family — a Raspberry Pi 4 into a Pi 3 fleet, say — and the refusal, when it
 * comes, is about the fleet rather than about the hardware. This action checks
 * first so the message can name both.
 *
 * ## What survives the move, and what does not
 *
 * Device-level environment variables, tags and the device's name survive.
 * **Fleet-level** variables do not: the device inherits the new fleet's, and
 * any configuration that lived at fleet level in the old one is simply gone.
 * That is the commonest way a moved device comes up misconfigured.
 */
const action: ActionDefinition = {
  key: "device-move",
  type: "perform",
  resource: "device",
  title: "Move a device to another fleet",
  description:
    "Move a device between fleets, which is a DEPLOYMENT: it picks up the new fleet's target " +
    "release and starts different containers within seconds. Device-level variables and tags " +
    "survive; the old fleet's FLEET-LEVEL variables do not.",
  idempotent: true,
  params: [
    { key: "uuid", label: "Device UUID", type: "string", required: true, default: "" },
    {
      key: "fleet",
      label: "Destination fleet",
      type: "string",
      required: true,
      default: "",
      placeholder: "myorg/other-fleet",
      hint: "Slug or numeric id.",
    },
  ],
  output: [
    { key: "uuid", type: "string", label: "Which device" },
    { key: "fleet", type: "string", label: "Where it is now" },
    { key: "previousFleet", type: "string", label: "Where it was" },
    { key: "changed", type: "boolean", label: "Whether it actually moved" },
    { key: "willChangeRelease", type: "boolean", label: "Whether this changes what it runs" },
    {
      key: "lostFleetVariables",
      type: "array",
      label: "Old fleet variables it no longer inherits",
    },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const uuid = assertUuid(p.uuid);
    const reference = String(p.fleet ?? "").trim();
    if (!reference) throw new Error("`fleet` is required — a slug like `org/name`, or an id");

    const client = new BalenaClient(ctx);
    const device = await client.one<{
      id?: number;
      is_running__release?: { __id?: number } | null;
      belongs_to__application?: { __id?: number } | null;
    }>("device", {
      query: {
        $select: "id,is_running__release,belongs_to__application",
        $filter: `uuid eq ${odataString(uuid)}`,
      },
    });
    if (!device) throw new Error(`no device has uuid ${uuid}`);

    const destination = await client.one<{ id?: number; slug?: string }>("application", {
      query: {
        $select: "id,slug,should_be_running__release",
        $filter: /^\d+$/.test(reference)
          ? `id eq ${Number(reference)}`
          : `slug eq ${odataString(reference)}`,
      },
    });
    if (!destination) throw new Error(`no fleet matched ${JSON.stringify(reference)}`);

    const previousFleetId = device.belongs_to__application?.__id;
    if (previousFleetId === destination.id) {
      return {
        uuid,
        fleet: destination.slug,
        previousFleet: destination.slug,
        changed: false,
        willChangeRelease: false,
        lostFleetVariables: [],
      };
    }

    // Fleet-level variables do not travel, and this is where a moved device
    // comes up misconfigured.
    let lostFleetVariables: string[] = [];
    if (previousFleetId) {
      const inherited = await client.list<{ name?: string }>("application_environment_variable", {
        query: { $select: "name", $filter: `application eq ${previousFleetId}` },
      });
      lostFleetVariables = inherited.map((variable) => variable?.name).filter(Boolean) as string[];
    }

    await client.request(`/v7/device(uuid=${odataString(uuid)})`, {
      method: "PATCH",
      body: { belongs_to__application: destination.id },
    });

    if (lostFleetVariables.length) {
      ctx.log(
        "warn",
        "the old fleet's environment variables do not travel with the device — it now inherits " +
          "the destination fleet's instead, and anything configured only at fleet level is gone",
        { uuid, count: lostFleetVariables.length },
      );
    }
    ctx.log(
      "info",
      "moved a device between fleets — it will pick up the destination's target " +
        "release and start different containers on its next check-in",
      { uuid },
    );

    return {
      uuid,
      fleet: destination.slug,
      previousFleet: previousFleetId ? String(previousFleetId) : undefined,
      changed: true,
      willChangeRelease: true,
      lostFleetVariables,
    };
  },
};

export default action;
