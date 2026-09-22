import type { ActionDefinition } from "@w6w/types";
import { API_V1, csvIds, MAX_CSV_IDS, SquarespaceClient } from "../lib/client.ts";
import { csvIdsParam } from "../lib/params.ts";

/**
 * `GET /1.0/commerce/inventory/{variantIdCsvs}` — specific inventory items.
 *
 * The route takes **comma-separated variant ids in the path** (up to 50), and
 * answers `{inventory: [...]}` with no pagination — this is the targeted read,
 * not a list. `list-inventory` is for walking everything; this is for asking
 * about the dozen variants a fulfilment actually touches, in one request.
 *
 * Ids that are unknown are simply absent from the array, so match on
 * `variantId` rather than by position.
 */
export interface InventoryItemList {
  inventory?: Array<Record<string, unknown>>;
}

interface Input {
  variantIds: string;
}

const getInventoryItems: ActionDefinition<Input, InventoryItemList> = {
  key: "get-inventory-items",
  type: "read",
  resource: "inventory",
  title: "Get Inventory Items",
  description:
    "Retrieve inventory for up to 50 specific variant ids in one request. No pagination: " +
    "unknown ids are omitted from the response.",
  params: [
    csvIdsParam(
      "variantIds",
      "Variant ids",
      "Variant ids to read stock for, e.g. from List inventory's `variantId`.",
      MAX_CSV_IDS,
    ),
  ],
  output: [{
    key: "inventory",
    type: "array",
    label: "Inventory items (`sku`, `variantId`, `quantity`, `isUnlimited`, `descriptor`)",
  }],

  execute(input, ctx) {
    const variantIds = csvIds(input.variantIds, {
      max: MAX_CSV_IDS,
      label: "variantIds",
    });
    return new SquarespaceClient(ctx).get<InventoryItemList>(
      `${API_V1}/commerce/inventory/${variantIds}`,
    );
  },
};

export default getInventoryItems;
