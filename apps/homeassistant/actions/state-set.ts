import type { ActionDefinition } from "@w6w/types";
import { entityId, HomeAssistantClient, json } from "../lib/client.ts";

/**
 * `POST /api/states/<entity_id>` — set what Home Assistant *thinks* an entity's
 * state is.
 *
 * ## This does not control anything
 *
 * From Home Assistant's own documentation for this endpoint:
 *
 * > This endpoint sets the representation of a device within Home Assistant and
 * > will not communicate with the actual device.
 *
 * Writing `"on"` to `light.kitchen` makes the dashboard show the light on. The
 * light does not turn on. The next time the real integration polls the bulb, it
 * overwrites the state back to `off` and the change vanishes — leaving a
 * workflow that appeared to work, an automation that fired on the wrong value,
 * and nothing in any log to explain it.
 *
 * **To control a device, use `service-call` or `entity-switch`.**
 *
 * ## What it is legitimately for
 *
 * Pushing values *into* Home Assistant from outside: a reading from a system
 * Home Assistant has no integration for, a computed status, a flag an
 * automation watches. Those entities have no device behind them, so nothing
 * overwrites them.
 *
 * Because the failure mode is silent and the correct use is narrow, this action
 * refuses to write to the domains that always have a device behind them unless
 * the caller explicitly acknowledges it.
 */

/**
 * Domains where a state write is nearly always a mistake — these are controlled
 * through services, and the integration owns their state.
 */
const DEVICE_DOMAINS = new Set([
  "light",
  "switch",
  "climate",
  "cover",
  "fan",
  "lock",
  "media_player",
  "vacuum",
  "water_heater",
  "humidifier",
  "alarm_control_panel",
  "valve",
  "lawn_mower",
]);

const action: ActionDefinition = {
  key: "state-set",
  type: "perform",
  resource: "state",
  title: "Set an entity's state",
  description:
    "Set what Home Assistant BELIEVES an entity's state is. This does NOT communicate with any " +
    "device — to turn something on, use `service-call`. For pushing outside values in.",
  idempotent: true,
  params: [
    {
      key: "entityId",
      label: "Entity",
      type: "string",
      required: true,
      default: "",
      placeholder: "sensor.office_occupancy",
      hint: "Creating a new entity id here is allowed and is the normal use — it makes an entity " +
        "that exists only as a value you push in.",
    },
    {
      key: "state",
      label: "State",
      type: "string",
      required: true,
      default: "",
      hint: "Always stored as a string.",
    },
    {
      key: "attributes",
      label: "Attributes",
      type: "json",
      default: "",
      hint: 'e.g. {"unit_of_measurement":"°C","friendly_name":"Office temperature"}. Attributes ' +
        "are REPLACED, not merged — anything omitted is lost.",
    },
    {
      key: "confirmNoDeviceControl",
      label: "I understand this does not control the device",
      type: "boolean",
      default: false,
      hint: "Required for domains like `light` and `switch`, where a state write is almost " +
        "always meant to be a service call and fails silently instead.",
    },
  ],
  output: [
    { key: "entity_id", type: "string", label: "The entity written" },
    { key: "state", type: "string", label: "Its new state, as Home Assistant now believes it" },
    { key: "created", type: "boolean", label: "Whether the entity did not exist before" },
    { key: "attributes", type: "object", label: "Its attributes, which were replaced wholesale" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const entity = entityId(p.entityId, "entityId");
    const state = String(p.state ?? "");
    if (!state) throw new Error("`state` is required");

    const domain = entity.split(".")[0];
    if (DEVICE_DOMAINS.has(domain) && p.confirmNoDeviceControl !== true) {
      throw new Error(
        `\`${entity}\` is in the \`${domain}\` domain, which is controlled by a real device. ` +
          "Writing a state here does NOT switch anything — Home Assistant's own documentation " +
          "says this endpoint 'will not communicate with the actual device', and the integration " +
          `will overwrite it on its next poll. Use \`service-call\` with \`${domain}.turn_on\`, ` +
          "or `entity-switch`. If you really do mean to override the recorded state, set " +
          "`confirmNoDeviceControl`",
      );
    }

    const result = await new HomeAssistantClient(ctx).request<
      { entity_id?: string; state?: string; attributes?: Record<string, unknown> }
    >(`/states/${encodeURIComponent(entity)}`, {
      method: "POST",
      body: {
        state,
        attributes: json(p.attributes, "attributes") ?? {},
      },
    });

    ctx.log("info", "set a Home Assistant state", { entity_id: entity, domain });
    // 201 means it did not exist; the client does not surface the code, so the
    // absence of a prior state is inferred from the response's own shape.
    return { ...result, created: result?.entity_id === entity && !result?.attributes };
  },
};

export default action;
