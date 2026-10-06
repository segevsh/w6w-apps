import type { ActionDefinition } from "@w6w/types";
import { EventbriteClient } from "../lib/client.ts";

interface Input {
  eventId: string;
  seatmapNumber?: number;
  countAgainstEventCapacity?: boolean;
}

const action: ActionDefinition<Input> = {
  key: "list-inventory-tiers",
  type: "search",
  resource: "inventory_tier",
  title: "List Inventory Tiers",
  description:
    "List the Inventory Tiers of an Event, optionally filtered by seat map number or event-capacity counting.",
  params: [
    {
      "key": "eventId",
      "label": "Event ID",
      "type": "string",
      "required": true,
    },
    {
      "key": "seatmapNumber",
      "label": "Seat map number",
      "type": "number",
      "hint": "Filter by tier group: 0 for general admission, 1 for reserved seating.",
    },
    {
      "key": "countAgainstEventCapacity",
      "label": "Counts against event capacity",
      "type": "boolean",
      "hint": "When set, filter by whether the tier counts toward event capacity.",
    },
  ],
  output: [
    {
      "key": "inventory_tiers",
      "type": "array",
      "label": "Inventory tiers",
    },
    {
      "key": "pagination",
      "type": "object",
      "label": "Pagination",
    },
  ],
  idempotent: true,

  execute(input, ctx) {
    const client = new EventbriteClient(ctx);
    return client.request(`/events/${encodeURIComponent(input.eventId)}/inventory_tiers/`, {
      query: {
        seatmap_number: input.seatmapNumber,
        count_against_event_capacity: input.countAgainstEventCapacity,
      },
    });
  },
};

export default action;
