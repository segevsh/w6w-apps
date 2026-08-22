import type { ActionDefinition } from "@w6w/types";
import { assertUuid, BalenaClient, odataString } from "../lib/client.ts";

/**
 * The environment a device's services actually see, which lives in three
 * places at once.
 *
 * `GET /v7/device_environment_variable`, `/v7/application_environment_variable`
 * and `/v7/device_service_environment_variable` — because a variable can be
 * set on the fleet, on the device, or on one service of one device, and the
 * more specific one wins.
 *
 * ## The layering is the whole point, and no single endpoint shows it
 *
 * A workflow asking "what is `LOG_LEVEL` on this device" and reading only the
 * device-level variables gets an answer that is wrong whenever the value came
 * from the fleet. This action reads all three and reports the **effective**
 * value alongside where it came from, which is what somebody debugging a
 * misconfigured device is actually looking for.
 *
 * ## Changing any of them restarts the service
 *
 * balena applies an environment change by recreating the container. That is a
 * restart of whatever was running, so setting a variable during business hours
 * is a deployment during business hours. `device-env-set` says so.
 */
const action: ActionDefinition = {
  key: "device-env-list",
  type: "read",
  resource: "environment-variable",
  title: "List a device's environment",
  description:
    "What a device's services actually see — fleet-level, device-level and per-service " +
    "variables read together, with the EFFECTIVE value and where it came from. No single balena " +
    "endpoint shows the layering, and reading only one of them gives wrong answers.",
  params: [
    { key: "uuid", label: "Device UUID", type: "string", required: true, default: "" },
    {
      key: "nameContains",
      label: "Name contains",
      type: "string",
      default: "",
    },
  ],
  output: [
    { key: "effective", type: "object", label: "Name to value, after layering" },
    { key: "sources", type: "object", label: "Name to where the winning value came from" },
    { key: "deviceVariables", type: "array", label: "Set on this device" },
    { key: "fleetVariables", type: "array", label: "Set on its fleet" },
    { key: "serviceVariables", type: "array", label: "Set on one service of this device" },
    { key: "overriddenFleetVariables", type: "array", label: "Fleet values this device shadows" },
    { key: "count", type: "number", label: "Distinct names" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const uuid = assertUuid(p.uuid);

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

    const deviceVariables = await client.list<{ id?: number; name?: string; value?: string }>(
      "device_environment_variable",
      { query: { $select: "id,name,value", $filter: `device eq ${device.id}` } },
    );
    const fleetVariables = fleetId
      ? await client.list<{ id?: number; name?: string; value?: string }>(
        "application_environment_variable",
        { query: { $select: "id,name,value", $filter: `application eq ${fleetId}` } },
      )
      : [];
    const serviceVariables = await client.list<
      { id?: number; name?: string; value?: string; service_install?: { __id?: number } | null }
    >("device_service_environment_variable", {
      query: {
        $select: "id,name,value,service_install",
        $filter: `service_install/any(s:s/device eq ${device.id})`,
      },
    });

    // Fleet is the floor, device overrides it, a service variable overrides
    // both for that one service.
    const effective: Record<string, string> = {};
    const sources: Record<string, string> = {};
    for (const variable of fleetVariables) {
      if (!variable?.name) continue;
      effective[variable.name] = String(variable.value ?? "");
      sources[variable.name] = "fleet";
    }
    const overriddenFleetVariables: string[] = [];
    for (const variable of deviceVariables) {
      if (!variable?.name) continue;
      if (sources[variable.name] === "fleet") overriddenFleetVariables.push(variable.name);
      effective[variable.name] = String(variable.value ?? "");
      sources[variable.name] = "device";
    }
    for (const variable of serviceVariables) {
      if (!variable?.name) continue;
      effective[variable.name] = String(variable.value ?? "");
      sources[variable.name] = "service";
    }

    const needle = String(p.nameContains ?? "").trim().toLowerCase();
    if (needle) {
      for (const name of Object.keys(effective)) {
        if (!name.toLowerCase().includes(needle)) {
          delete effective[name];
          delete sources[name];
        }
      }
    }

    // Names and layers. The values are the customer's configuration, and some
    // of them are secrets.
    ctx.log("info", "read a device's effective environment", {
      uuid,
      names: Object.keys(effective).length,
    });

    return {
      effective,
      sources,
      deviceVariables,
      fleetVariables,
      serviceVariables,
      overriddenFleetVariables,
      count: Object.keys(effective).length,
    };
  },
};

export default action;
