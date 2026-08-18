import type { ActionDefinition } from "@w6w/types";
import { entityId, type EntityState, HomeAssistantClient, isUsable } from "../lib/client.ts";

/**
 * `GET /api/states/<entity_id>` — one entity.
 *
 * ## The value is always a string
 *
 * A temperature sensor reading 21.5 degrees returns `"21.5"`, and a switch
 * returns `"on"`. Everything is a string, including the two that are not
 * values at all: `"unavailable"` (the integration cannot reach the device) and
 * `"unknown"` (it has never reported). Both parse to `NaN` without complaint.
 *
 * So this returns `usable` alongside the raw state, and `numericState` when the
 * value actually is a number — which is the check a workflow branching on a
 * temperature needs to make and usually does not.
 *
 * ## The units are in the attributes
 *
 * `unit_of_measurement` is an attribute, not part of the state, and it is per
 * entity: one sensor reports °C and another °F on the same instance. Reading
 * the number without the unit is how a thermostat automation ends up 30 degrees
 * out.
 */
const action: ActionDefinition = {
  key: "state-get",
  type: "read",
  resource: "state",
  title: "Get an entity's state",
  description:
    "One entity's state and attributes. The state is ALWAYS a string — including `unavailable` " +
    "and `unknown`, which parse to NaN — so this reports whether the value is usable.",
  params: [
    {
      key: "entityId",
      label: "Entity",
      type: "string",
      required: true,
      default: "",
      placeholder: "sensor.living_room_temperature",
      hint: "`domain.object_id`, lower case — not the friendly name.",
    },
  ],
  output: [
    { key: "state", type: "string", label: "The raw value, always a string" },
    { key: "usable", type: "boolean", label: "False for `unavailable` and `unknown`" },
    { key: "numericState", type: "number", label: "The value as a number, when it is one" },
    { key: "unit", type: "string", label: "unit_of_measurement, which varies per entity" },
    { key: "friendlyName", type: "string", label: "What the dashboard calls it" },
    { key: "attributes", type: "object", label: "Everything else" },
    { key: "lastChanged", type: "string", label: "When the state last changed" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const entity = entityId(p.entityId, "entityId");

    const result = await new HomeAssistantClient(ctx).request<EntityState>(
      `/states/${encodeURIComponent(entity)}`,
    );

    const state = String(result?.state ?? "");
    const usable = isUsable(state);
    // Only when it really is a number — "on" and "unavailable" must not become 0.
    const numeric = usable && state !== "" && Number.isFinite(Number(state))
      ? Number(state)
      : undefined;

    return {
      ...result,
      state,
      usable,
      numericState: numeric,
      unit: result?.attributes?.unit_of_measurement,
      friendlyName: result?.attributes?.friendly_name,
      lastChanged: result?.last_changed,
    };
  },
};

export default action;
