import type { ActionDefinition } from "@w6w/types";
import { EventbriteClient } from "../lib/client.ts";
import { deepMerge } from "../lib/merge.ts";

type Obj = Record<string, unknown>;

/** Accepts an object or a JSON string; anything else yields undefined. */
function toObj(v: unknown): Obj | undefined {
  if (typeof v === "string" && v.trim()) {
    try {
      v = JSON.parse(v);
    } catch {
      throw new Error("Expected valid JSON");
    }
  }
  return v && typeof v === "object" && !Array.isArray(v) ? v as Obj : undefined;
}

function compact(o: Obj): Obj {
  return Object.fromEntries(
    Object.entries(o).filter(([, v]) => v !== undefined && v !== null && v !== ""),
  );
}

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
  name: string;
  tier?: number;
  seatmapNumber?: number;
  sortOrder?: number;
  color?: string;
  quantityTotal?: number;
  capacityTotal?: number;
  countAgainstEventCapacity?: boolean;
  imageId?: string;
  holds?: unknown;
  extra?: unknown;
}

const action: ActionDefinition<Input> = {
  key: "create-inventory-tier",
  type: "perform",
  idempotent: false,
  resource: "inventory_tier",
  title: "Create Inventory Tier",
  description:
    "Create a new Inventory Tier on an Event on Eventbrite (use create-multiple-inventory-tiers for several at once).",
  params: [
    {
      "key": "eventId",
      "label": "Event ID",
      "type": "string",
      "required": true,
    },
    {
      "key": "name",
      "label": "Name",
      "type": "string",
      "required": true,
    },
    {
      "key": "tier",
      "label": "Tier number",
      "type": "number",
      "hint": "Small unique integer within each seat map; assigned to seats in the seat map.",
    },
    {
      "key": "seatmapNumber",
      "label": "Seat map number",
      "type": "select",
      "options": [
        {
          "value": 0,
          "label": "0 - General admission",
        },
        {
          "value": 1,
          "label": "1 - Reserved seating",
        },
      ],
    },
    {
      "key": "sortOrder",
      "label": "Sort order",
      "type": "number",
    },
    {
      "key": "color",
      "label": "Color (hex)",
      "type": "string",
      "hint": "e.g. #fac114",
    },
    {
      "key": "quantityTotal",
      "label": "Quantity total",
      "type": "number",
    },
    {
      "key": "capacityTotal",
      "label": "Capacity total",
      "type": "number",
      "hint": "Required to create or adjust holds; includes quantity_total of all child holds.",
    },
    {
      "key": "countAgainstEventCapacity",
      "label": "Counts against event capacity",
      "type": "boolean",
      "hint": "Set false for add-on ticket tiers.",
    },
    {
      "key": "imageId",
      "label": "Image ID",
      "type": "string",
    },
    {
      "key": "holds",
      "label": "Holds",
      "type": "json",
      "advanced": true,
      "hint":
        'Array of GA hold tiers, e.g. [{"name":"Marketing","quantity_total":10}]. Requires capacityTotal.',
    },
    {
      "key": "extra",
      "label": "Additional fields",
      "type": "json",
      "advanced": true,
      "hint": "JSON object deep-merged into the request object for any field not listed above.",
    },
  ],
  output: [
    {
      "key": "inventory_tier",
      "type": "object",
      "label": "Inventory tier",
    },
  ],

  execute(input, ctx) {
    const client = new EventbriteClient(ctx);
    const tier = deepMerge(
      compact({
        name: input.name,
        tier: input.tier,
        seatmap_number: input.seatmapNumber,
        sort_order: input.sortOrder,
        color: input.color,
        quantity_total: input.quantityTotal,
        capacity_total: input.capacityTotal,
        count_against_event_capacity: input.countAgainstEventCapacity,
        image_id: input.imageId,
        holds: toArr(input.holds),
      }),
      toObj(input.extra),
    );
    return client.request(`/events/${encodeURIComponent(input.eventId)}/inventory_tiers/`, {
      method: "POST",
      body: { inventory_tier: tier },
    });
  },
};

export default action;
