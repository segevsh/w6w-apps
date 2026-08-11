import type { ActionDefinition } from "@w6w/types";
import { BigCommerceClient, type BigCommercePage } from "../lib/client.ts";
import { paginationParams } from "../lib/params.ts";

/**
 * `GET /v3/inventory/items` — stock per item, per location.
 *
 * The row here is (item × location), not item: a store with several locations
 * reports the same SKU once per location it stocks at. That is what makes this
 * different from the `inventory_level` field on a product or variant, which is
 * the default allotment only.
 *
 * All five filters are `:in` list forms — `sku:in`, `variant_id:in`,
 * `product_id:in`, `location_id:in`, `location_code:in` — with no singular
 * variants, so a single-SKU lookup is still a one-element list.
 */
interface Input {
  skus?: string;
  productIds?: string;
  variantIds?: string;
  locationIds?: string;
  limit?: number;
  page?: number;
}

const inventoryItemList: ActionDefinition<Input, BigCommercePage<unknown>> = {
  key: "inventory-item-list",
  type: "search",
  resource: "inventory",
  title: "List Inventory",
  description: "Stock levels per item per location. One row per (item, location) pair.",
  params: [
    { key: "skus", label: "SKUs", type: "string", hint: "Comma-separated. Sent as `sku:in`." },
    {
      key: "productIds",
      label: "Product IDs",
      type: "string",
      hint: "Comma-separated. Sent as `product_id:in`.",
    },
    {
      key: "variantIds",
      label: "Variant IDs",
      type: "string",
      hint: "Comma-separated. Sent as `variant_id:in`.",
    },
    {
      key: "locationIds",
      label: "Location IDs",
      type: "string",
      hint: "Comma-separated. Sent as `location_id:in`. See List Inventory Locations.",
    },
    ...paginationParams(),
  ],
  output: [
    { key: "data", type: "array", label: "Inventory rows" },
    { key: "pagination", type: "object", label: "Pagination" },
  ],

  execute(input, ctx) {
    return new BigCommerceClient(ctx).v3Page("/inventory/items", {
      query: {
        "sku:in": input.skus,
        "product_id:in": input.productIds,
        "variant_id:in": input.variantIds,
        "location_id:in": input.locationIds,
        limit: input.limit,
        page: input.page,
      },
    });
  },
};

export default inventoryItemList;
