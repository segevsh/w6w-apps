import type { ActionDefinition } from "@w6w/types";
import { assertUuid, BalenaClient, odataString } from "../lib/client.ts";

/**
 * Set, change or remove a device-level environment variable.
 *
 * `POST /v7/device_environment_variable` to create, `PATCH …(id)` to change,
 * `DELETE …(id)` to remove — balena has no upsert, so this reads first and
 * picks.
 *
 * ## This restarts the service, every time
 *
 * balena applies an environment change by **recreating the container**. There
 * is no reload: whatever was running stops and starts again with the new
 * value. So a workflow that adjusts a variable is a workflow that restarts
 * production, and doing it across a fleet one device at a time is a rolling
 * restart whether or not anybody meant one.
 *
 * ## A device variable shadows the fleet's, and outlives it
 *
 * Setting `LOG_LEVEL` on a device means that device ignores the fleet's
 * `LOG_LEVEL` from then on — including any future change to it. A variable set
 * once for debugging keeps overriding the fleet a year later, and nothing
 * surfaces that except comparing the two, which this action does.
 *
 * ## Removing is not the same as setting it empty
 *
 * `DELETE` restores the fleet's value. Setting `""` shadows the fleet with an
 * empty string, which is a different configuration and a common way to break
 * a service that checks whether a variable is set.
 */
const action: ActionDefinition = {
  key: "device-env-set",
  type: "perform",
  resource: "environment-variable",
  title: "Set a device environment variable",
  description:
    "Create, change or remove a device-level variable. balena applies it by RECREATING THE " +
    "CONTAINER, so every call restarts the service. Removing restores the fleet's value; " +
    "setting an empty string shadows it with an empty string, which is not the same thing.",
  idempotent: true,
  params: [
    { key: "uuid", label: "Device UUID", type: "string", required: true, default: "" },
    {
      key: "name",
      label: "Variable name",
      type: "string",
      required: true,
      default: "",
      placeholder: "LOG_LEVEL",
    },
    {
      key: "value",
      label: "Value",
      type: "string",
      default: "",
      hint: "Ignored when removing. An empty string is a real value that shadows the fleet's.",
    },
    {
      key: "remove",
      label: "Remove it",
      type: "boolean",
      default: false,
      hint: "Deletes the device-level variable, so the device inherits the fleet's value again.",
    },
  ],
  output: [
    { key: "uuid", type: "string", label: "Which device" },
    { key: "name", type: "string", label: "Which variable" },
    { key: "action", type: "string", label: "created, updated, removed or unchanged" },
    { key: "changed", type: "boolean", label: "Whether anything changed" },
    { key: "shadowsFleetValue", type: "boolean", label: "Whether the fleet also sets this name" },
    {
      key: "inheritedAfterRemoval",
      type: "boolean",
      label: "Whether removing leaves a fleet value",
    },
    { key: "willRestartService", type: "boolean", label: "True whenever anything changed" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const uuid = assertUuid(p.uuid);
    const name = String(p.name ?? "").trim();
    if (!name) throw new Error("`name` is required");

    const client = new BalenaClient(ctx);
    const device = await client.one<{
      id?: number;
      belongs_to__application?: { __id?: number } | null;
    }>("device", {
      query: {
        $select: "id,belongs_to__application",
        $filter: `uuid eq ${odataString(uuid)}`,
      },
    });
    if (!device) throw new Error(`no device has uuid ${uuid}`);
    const fleetId = device.belongs_to__application?.__id;

    const existing = await client.one<{ id?: number; value?: string }>(
      "device_environment_variable",
      {
        query: {
          $select: "id,value",
          $filter: `device eq ${device.id} and name eq ${odataString(name)}`,
        },
      },
    );

    // Whether the fleet sets the same name decides what removal means.
    const fleetVariable = fleetId
      ? await client.one<{ value?: string }>("application_environment_variable", {
        query: {
          $select: "value",
          $filter: `application eq ${fleetId} and name eq ${odataString(name)}`,
        },
      })
      : undefined;

    let result: string;
    if (p.remove === true) {
      if (!existing?.id) {
        result = "unchanged";
      } else {
        await client.request(`/v7/device_environment_variable(${existing.id})`, {
          method: "DELETE",
        });
        result = "removed";
      }
    } else {
      const value = String(p.value ?? "");
      if (!existing?.id) {
        await client.request("/v7/device_environment_variable", {
          method: "POST",
          body: { device: device.id, name, value },
        });
        result = "created";
      } else if (String(existing.value ?? "") === value) {
        result = "unchanged";
      } else {
        await client.request(`/v7/device_environment_variable(${existing.id})`, {
          method: "PATCH",
          body: { value },
        });
        result = "updated";
      }
    }

    const changed = result !== "unchanged";
    if (changed) {
      ctx.log(
        "warn",
        "balena applies an environment change by recreating the container, so the " +
          "service on this device is restarting now",
        { uuid, name },
      );
    }
    if (result === "removed" && fleetVariable) {
      ctx.log("info", "the device now inherits its fleet's value for this variable again", {
        uuid,
        name,
      });
    }

    return {
      uuid,
      name,
      action: result,
      changed,
      shadowsFleetValue: Boolean(fleetVariable),
      inheritedAfterRemoval: result === "removed" && Boolean(fleetVariable),
      willRestartService: changed,
    };
  },
};

export default action;
