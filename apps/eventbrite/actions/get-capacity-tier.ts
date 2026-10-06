import type { ActionDefinition } from "@w6w/types";
import { EventbriteClient } from "../lib/client.ts";

interface Input {
  eventId: string;
}

const action: ActionDefinition<Input> = {
  key: "get-capacity-tier",
  type: "read",
  resource: "capacity",
  title: "Get Capacity Tier",
  description:
    "Retrieve the capacity tier (total capacity and general admission holds) for an event.",
  idempotent: true,
  params: [
    { key: "eventId", label: "Event ID", type: "string", required: true },
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
    return await client.request(`/events/${enc(input.eventId)}/capacity_tier/`, {
      method: "GET",
    });
  },
};

export default action;
