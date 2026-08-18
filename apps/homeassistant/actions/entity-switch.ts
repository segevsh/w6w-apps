import type { ActionDefinition } from "@w6w/types";
import { csv, entityId, HomeAssistantClient } from "../lib/client.ts";

/**
 * Turn entities on, off, or toggle them — the thing most workflows want,
 * without having to know the service grammar.
 *
 * It calls `homeassistant.turn_on` / `turn_off` / `toggle`, which are the
 * domain-agnostic services: they dispatch to whatever the target actually is,
 * so one action covers lights, switches, fans, media players, scripts and
 * scenes. Reaching for `light.turn_on` on a `switch` entity is a common and
 * confusing failure that this sidesteps entirely.
 *
 * It exists alongside `service-call` rather than replacing it, because anything
 * with parameters — brightness, colour, temperature — needs the general form.
 *
 * ## Reading the result back
 *
 * Home Assistant returns the states that changed. Toggling something already in
 * the requested state changes nothing and returns an empty list, which is
 * correct and is not confirmation of anything. This action reports what
 * changed, and for a definite answer the state should be read back.
 */
const action: ActionDefinition = {
  key: "entity-switch",
  type: "perform",
  resource: "service",
  title: "Turn entities on or off",
  description:
    "Turn things on, off, or toggle them. Uses the domain-agnostic services, so one action works " +
    "for lights, switches, fans, scripts and scenes alike.",
  idempotent: true,
  params: [
    {
      key: "entityId",
      label: "Entities",
      type: "string",
      required: true,
      default: "",
      placeholder: "light.kitchen, switch.desk_lamp",
      hint: "Comma-separated entity ids.",
    },
    {
      key: "action",
      label: "Action",
      type: "select",
      required: true,
      default: "turn_on",
      options: [
        { value: "turn_on", label: "Turn on" },
        { value: "turn_off", label: "Turn off" },
        { value: "toggle", label: "Toggle" },
      ],
    },
  ],
  output: [
    { key: "changed", type: "array", label: "States that changed" },
    {
      key: "changedCount",
      type: "number",
      label: "How many — zero means nothing needed to change",
    },
    { key: "entities", type: "array", label: "What was targeted" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const targets = csv(p.entityId)?.map((e, i) => entityId(e, `entityId[${i}]`));
    if (!targets || targets.length === 0) throw new Error("`entityId` is required");

    const verb = String(p.action ?? "turn_on");
    if (!["turn_on", "turn_off", "toggle"].includes(verb)) {
      throw new Error("`action` must be turn_on, turn_off or toggle");
    }

    const result = await new HomeAssistantClient(ctx).request<unknown[]>(
      `/services/homeassistant/${verb}`,
      { method: "POST", body: { entity_id: targets } },
    );
    const changed = Array.isArray(result) ? result : [];

    ctx.log("info", "switched Home Assistant entities", {
      action: verb,
      targets: targets.length,
      changedCount: changed.length,
    });

    return { changed, changedCount: changed.length, entities: targets };
  },
};

export default action;
