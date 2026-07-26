import type { ActionDefinition } from "@w6w/types";
import { ShopifyClient } from "../lib/client.ts";

interface Input {
  inventoryItemId: number;
  locationId: number;
  available: number;
}

/**
 * Sets stock to an absolute number, which is what makes this replayable — the
 * `adjust` endpoint applies a delta and would double-count on a retry.
 *
 * `inventoryItemId` is the variant's `inventory_item_id` (from `product-get`),
 * not the variant id.
 */
const inventoryLevelSet: ActionDefinition<Input> = {
  key: "inventory-level-set",
  type: "perform",
  resource: "inventory",
  title: "Set Inventory Level",
  description:
    "Set stock for an item at a location to an absolute number. Absolute, not a delta, so it is retry-safe.",
  idempotent: true,
  params: [
    {
      key: "inventoryItemId",
      label: "Inventory item ID",
      type: "number",
      required: true,
      hint: "The variant's `inventory_item_id` from `product-get` — not the variant id.",
    },
    {
      key: "locationId",
      label: "Location ID",
      type: "number",
      required: true,
      hint: "Get it from `location-get-many`.",
    },
    {
      key: "available",
      label: "Available",
      type: "number",
      required: true,
      validation: { integer: true },
      hint: "The absolute quantity to set, not a change.",
    },
  ],
  output: [
    { key: "inventory_level.available", type: "number", label: "Available" },
    { key: "inventory_level.location_id", type: "number", label: "Location ID" },
  ],

  execute(input, ctx) {
    return new ShopifyClient(ctx).request("/inventory_levels/set.json", {
      method: "POST",
      body: {
        inventory_item_id: input.inventoryItemId,
        location_id: input.locationId,
        available: input.available,
      },
    });
  },
};

export default inventoryLevelSet;
