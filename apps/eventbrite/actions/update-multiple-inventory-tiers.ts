import type { ActionDefinition } from "@w6w/types";
import { EventbriteClient } from "../lib/client.ts";

type Obj = Record<string, unknown>;

/** Accepts an array or a JSON string holding an array. */
function toArr(v: unknown): unknown[] | undefined {
  if (typeof v === "string" && v.trim()) {
    try {
      v = JSON.parse(v);
    } catch {
      throw new Error("Expected valid JSON");
    }
  }
  return Array.isArray(v) ? v : undefined;
}

interface Input {
  eventId: string;
  tiers: unknown;
}

const action: ActionDefinition<Input> = {
  key: "update-multiple-inventory-tiers",
  type: "perform",
  idempotent: true,
  resource: "inventory_tier",
  title: "Update Multiple Inventory Tiers",
  description:
    "Partially update several existing Inventory Tiers on an Event on Eventbrite in one request.",
  params: [
    {
      "key": "eventId",
      "label": "Event ID",
      "type": "string",
      "required": true,
    },
    {
      "key": "tiers",
      "label": "Inventory tiers",
      "type": "json",
      "required": true,
      "hint":
        'Array of objects, each with the tier `id` plus only the fields to change, e.g. [{"id":"1234","name":"New"}].',
    },
  ],
  output: [
    {
      "key": "inventory_tiers",
      "type": "array",
      "label": "Inventory tiers",
    },
  ],

  execute(input, ctx) {
    const client = new EventbriteClient(ctx);
    const tiers = toArr(input.tiers);
    if (!tiers || tiers.length === 0) throw new Error("tiers must be a non-empty array");
    return client.request(`/events/${encodeURIComponent(input.eventId)}/inventory_tiers/`, {
      method: "POST",
      body: { inventory_tiers: tiers },
    });
  },
};

export default action;
