import type { ActionDefinition } from "@w6w/types";
import { API_V1, SquarespaceClient } from "../lib/client.ts";
import { cursorParam, paginationOutput } from "../lib/params.ts";

/**
 * `GET /1.0/commerce/inventory` — up to 50 inventory items.
 *
 * "Inventory item" means *variant*: the response keys each row by `variantId`
 * and `sku`, so this lists every tracked variant of every physical or service
 * product on the site. A site with no such variants answers with an empty
 * array, which the vendor documents explicitly — that is an empty catalogue,
 * not a failure.
 */
export interface InventoryItemListResponse {
  inventory?: Array<Record<string, unknown>>;
  pagination?: { hasNextPage?: boolean; nextPageCursor?: string; nextPageUrl?: string };
}

interface Input {
  cursor?: string;
}

const listInventory: ActionDefinition<Input, InventoryItemListResponse> = {
  key: "list-inventory",
  type: "search",
  resource: "inventory",
  title: "List Inventory",
  description:
    "List up to 50 inventory items (one per tracked variant) with their SKU, quantity and " +
    "unlimited flag.",
  params: [cursorParam()],
  output: [{
    key: "inventory",
    type: "array",
    label: "Inventory items (`sku`, `variantId`, `quantity`, `isUnlimited`, `descriptor`)",
  }, paginationOutput],

  execute(input, ctx) {
    return new SquarespaceClient(ctx).get<InventoryItemListResponse>(
      `${API_V1}/commerce/inventory`,
      { cursor: input.cursor },
    );
  },
};

export default listInventory;
