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
  inventoryTierId: string;
  name?: string;
  sortOrder?: number;
  color?: string;
  quantityTotal?: number;
  capacityTotal?: number;
  imageId?: string;
  holds?: unknown;
  extra?: unknown;
}

const action: ActionDefinition<Input> = {
  key: "update-inventory-tier",
  type: "perform",
  idempotent: true,
  resource: "inventory_tier",
  title: "Update Inventory Tier",
  description:
    "Partially update an existing Inventory Tier on Eventbrite; only the fields you supply change.",
  params: [
    {
      "key": "eventId",
      "label": "Event ID",
      "type": "string",
      "required": true,
    },
    {
      "key": "inventoryTierId",
      "label": "Inventory Tier ID",
      "type": "string",
      "required": true,
    },
    {
      "key": "name",
      "label": "Name",
      "type": "string",
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
    },
    {
      "key": "quantityTotal",
      "label": "Quantity total",
      "type": "number",
      "hint": "Only accepted for general admission tiers.",
    },
    {
      "key": "capacityTotal",
      "label": "Capacity total",
      "type": "number",
      "hint": "Required whenever hold quantities change.",
    },
    {
      "key": "imageId",
      "label": "Image ID",
      "type": "string",
      "hint": "Pass an empty value to leave unchanged.",
    },
    {
      "key": "holds",
      "label": "Holds",
      "type": "json",
      "advanced": true,
      "hint":
        "Array of hold changes: objects with `id` update/delete (`is_deleted: true`); without `id` create.",
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
        sort_order: input.sortOrder,
        color: input.color,
        quantity_total: input.quantityTotal,
        capacity_total: input.capacityTotal,
        image_id: input.imageId,
        holds: toArr(input.holds),
      }),
      toObj(input.extra),
    );
    return client.request(
      `/events/${encodeURIComponent(input.eventId)}/inventory_tiers/${
        encodeURIComponent(input.inventoryTierId)
      }/`,
      { method: "POST", body: { inventory_tier: tier } },
    );
  },
};

export default action;
