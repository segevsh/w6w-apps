import type { ActionDefinition } from "@w6w/types";
import { EventbriteClient } from "../lib/client.ts";
import { deepMerge } from "../lib/merge.ts";

interface Input {
  eventId: string;
  capacityTotal?: number;
  holds?: unknown[];
  extra?: Record<string, unknown>;
}

const action: ActionDefinition<Input> = {
  key: "update-capacity-tier",
  type: "perform",
  idempotent: true,
  resource: "capacity",
  title: "Update Capacity Tier",
  description:
    "Update an event's capacity tier on Eventbrite: total capacity and/or create, update or delete general admission capacity holds. Partial updates are supported.",
  params: [
    { key: "eventId", label: "Event ID", type: "string", required: true },
    {
      key: "capacityTotal",
      label: "Total capacity",
      type: "number",
      hint: "Total event capacity. Required when creating holds if the event has no capacity set.",
    },
    {
      key: "holds",
      label: "Holds",
      type: "array",
      item: {
        type: "object",
        fields: [
          { key: "id", label: "Hold ID (omit to create)", type: "string" },
          { key: "event_id", label: "Event ID", type: "string" },
          { key: "name", label: "Name", type: "string" },
          { key: "abbreviation", label: "Abbreviation", type: "string" },
          { key: "sort_order", label: "Sort order", type: "number" },
          { key: "color", label: "Color", type: "string" },
          { key: "quantity_total", label: "Quantity total", type: "number" },
          { key: "is_deleted", label: "Delete this hold", type: "boolean" },
        ],
      },
      hint:
        "GA capacity holds (Eventbrite snake_case fields). Include `id` to update a hold; `is_deleted` to delete; omit `id` to create (then `event_id`, `name`, `quantity_total` are needed).",
    },
    {
      key: "extra",
      label: "Additional fields",
      type: "json",
      hint:
        "Merged (deep) into the request object for any field not listed above, using Eventbrite's snake_case names.",
    },
  ],
  output: [
    { key: "event_id", type: "string", label: "Event ID" },
    { key: "quantity_pending", type: "number", label: "Pending quantity" },
    { key: "quantity_sold", type: "number", label: "Sold quantity" },
    { key: "quantity_total", type: "number", label: "Available quantity" },
    { key: "capacity_pending", type: "number", label: "Pending capacity" },
    { key: "capacity_sold", type: "number", label: "Sold capacity" },
    { key: "capacity_total", type: "number", label: "Total capacity" },
    { key: "capacity_is_custom", type: "boolean", label: "Capacity is custom" },
    { key: "holds", type: "array", label: "Holds" },
  ],

  async execute(input, ctx) {
    const client = new EventbriteClient(ctx);
    const enc = encodeURIComponent;
    const obj: Record<string, unknown> = {};
    if (input.capacityTotal !== undefined) obj.capacity_total = input.capacityTotal;
    if (input.holds !== undefined) obj.holds = input.holds;
    if (input.extra) deepMerge(obj, input.extra);
    return await client.request(`/events/${enc(input.eventId)}/capacity_tier/`, {
      method: "POST",
      body: obj,
    });
  },
};

export default action;
