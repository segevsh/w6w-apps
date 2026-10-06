import { idsParam, listAction, paginationParams, updatedRangeParams } from "../lib/factory.ts";

/** `GET /v1.0/inventory` — stock per variant per store. */
export default listAction({
  key: "inventory-list",
  title: "List Inventory Levels",
  description: "List stock levels per item variant and store.",
  resource: "inventory",
  path: "/inventory",
  listKey: "inventory_levels",
  paginated: true,
  listQuery: { storeIds: "store_ids", variantIds: "variant_ids" },
  query: {
    updatedAtMin: "updated_at_min",
    updatedAtMax: "updated_at_max",
    limit: "limit",
    cursor: "cursor",
  },
  params: [
    idsParam("storeIds", "Store ids"),
    idsParam("variantIds", "Variant ids"),
    ...updatedRangeParams,
    ...paginationParams,
  ],
});
