import type { ActionDefinition } from "@w6w/types";
import { entityId, HomeAssistantClient } from "../lib/client.ts";

/**
 * `DELETE /api/states/<entity_id>` — remove an entity from the state machine.
 *
 * ## It removes the state, not the thing
 *
 * The mirror of `state-set`, and with the same caveat. Deleting
 * `light.kitchen` does not unpair the bulb, remove the integration, or change
 * anything about the device: it removes the entity from the state machine, and
 * the integration that owns it will put it straight back on its next update.
 *
 * So this is only meaningful for entities that have **no integration behind
 * them** — the ones created by `state-set`, pushed in from outside. Those have
 * nothing to recreate them, and deleting is how they go away.
 *
 * For a real device, removing it properly means removing the integration or the
 * device in Home Assistant's own config UI, which the REST API does not expose
 * at all.
 *
 * Because a delete against a device-backed entity is at best a no-op and at
 * worst a confusing flicker in every dashboard showing it, the domains that
 * always have a device are refused.
 */

/** The same list `state-set` guards, and for the same reason. */
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
  key: "state-delete",
  type: "perform",
  resource: "state",
  title: "Delete an entity's state",
  description:
    "Remove an entity from the state machine. Only meaningful for entities pushed in with " +
    "`state-set` — anything with an integration behind it is recreated on the next update.",
  idempotent: true,
  params: [
    {
      key: "entityId",
      label: "Entity",
      type: "string",
      required: true,
      default: "",
      hint: "An entity created by `state-set`, with no integration behind it.",
    },
  ],
  output: [
    { key: "deleted", type: "boolean", label: "Removed from the state machine" },
    { key: "entityId", type: "string", label: "What was removed" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const entity = entityId(p.entityId, "entityId");
    const domain = entity.split(".")[0];

    if (DEVICE_DOMAINS.has(domain)) {
      throw new Error(
        `\`${entity}\` is in the \`${domain}\` domain, which is owned by an integration. ` +
          "Deleting its state does not remove the device — the integration recreates the entity " +
          "on its next update, and in the meantime every dashboard showing it flickers. Remove " +
          "the device or the integration in Home Assistant's settings instead; the REST API " +
          "cannot do that",
      );
    }

    await new HomeAssistantClient(ctx).request(`/states/${encodeURIComponent(entity)}`, {
      method: "DELETE",
    });

    ctx.log("info", "deleted a Home Assistant entity state", { entityId: entity });
    return { deleted: true, entityId: entity };
  },
};

export default action;
