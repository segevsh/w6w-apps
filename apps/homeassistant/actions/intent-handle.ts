import type { ActionDefinition } from "@w6w/types";
import { HomeAssistantClient, json } from "../lib/client.ts";

/**
 * `POST /api/intent/handle` — ask Home Assistant to do something by intent
 * rather than by service.
 *
 * ## The difference from a service call
 *
 * A service call names exactly what to do: `light.turn_on` on
 * `light.kitchen_ceiling_1`. An intent names what is *meant*: `HassTurnOn` with
 * `{"name": "kitchen light"}`, and Home Assistant works out which entity that
 * is — matching against friendly names, areas and aliases, the same resolution
 * the voice assistant uses.
 *
 * That makes it the right endpoint when the input is human — a message from a
 * chat integration, a transcript, an LLM's output — and the wrong one when the
 * entity is known, because the matching can pick something else.
 *
 * ## Intents have to be registered
 *
 * The built-in ones (`HassTurnOn`, `HassTurnOff`, `HassGetState`,
 * `HassLightSet`, `HassClimateSetTemperature`) come with the default
 * configuration. Custom intents defined in `configuration.yaml` work too. An
 * unregistered name returns a 400, not a "did you mean".
 */
const action: ActionDefinition = {
  key: "intent-handle",
  type: "perform",
  resource: "intent",
  title: "Handle an intent",
  description:
    "Do something by INTENT rather than by entity id — Home Assistant resolves 'kitchen light' " +
    "the way the voice assistant does. Right for human input, wrong when the entity is known.",
  idempotent: false,
  params: [
    {
      key: "name",
      label: "Intent",
      type: "string",
      required: true,
      default: "",
      placeholder: "HassTurnOn",
      hint: "Built-in ones include HassTurnOn, HassTurnOff, HassGetState, HassLightSet. Custom " +
        "intents from configuration.yaml work too; an unregistered name is a 400.",
    },
    {
      key: "data",
      label: "Slots",
      type: "json",
      default: "",
      hint: 'The intent\'s slots, e.g. {"name": "kitchen light"} or {"area": "kitchen", ' +
        '"domain": "light"}. Matched against friendly names, areas and aliases.',
    },
  ],
  output: [
    { key: "speech", type: "string", label: "What Home Assistant would say back" },
    { key: "matched", type: "array", label: "Entities the intent resolved to" },
    { key: "unmatched", type: "array", label: "Things it could not resolve" },
    { key: "response", type: "object", label: "The full intent response" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const name = String(p.name ?? "").trim();
    if (!name) throw new Error("`name` is required");

    const result = await new HomeAssistantClient(ctx).request<{
      speech?: { plain?: { speech?: string } };
      response_type?: string;
      data?: {
        success?: Array<{ id?: string; name?: string }>;
        failed?: unknown[];
        targets?: unknown[];
      };
    }>("/intent/handle", {
      method: "POST",
      body: { name, data: json(p.data, "data") ?? {} },
    });

    const matched = result?.data?.success ?? [];
    ctx.log("info", "handled a Home Assistant intent", {
      name,
      matched: matched.length,
      responseType: result?.response_type,
    });

    return {
      // The plain-text answer, which is what a chat integration wants back.
      speech: result?.speech?.plain?.speech,
      matched,
      unmatched: result?.data?.failed ?? [],
      response: result,
    };
  },
};

export default action;
