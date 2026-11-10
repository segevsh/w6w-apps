import type { ActionDefinition } from "@w6w/types";
import {
  inventoryList,
  type InventoryListInput,
  type InventoryListResult,
} from "../lib/inventory.ts";
import { organizationId, pageParams } from "../lib/params.ts";

const itemList: ActionDefinition<InventoryListInput, InventoryListResult<Record<string, unknown>>> =
  {
    key: "item-list",
    type: "read",
    resource: "item",
    title: "List Items",
    description: "List the products and services in the item catalog.",
    params: [
      organizationId,
      ...pageParams,
      {
        key: "sort_column",
        label: "Sort column",
        type: "string",
        hint:
          "name, sku, rate, purchase_rate, created_time, last_modified_time, reorder_level or stock_on_hand. Unset keeps Zoho's own order.",
      },
      {
        key: "sort_order",
        label: "Sort order",
        type: "string",
        hint: "A for ascending, D for descending. Unset keeps Zoho's own order.",
      },
    ],
    output: [
      { key: "data", type: "array", label: "Items" },
      { key: "pageContext", type: "object", label: "Pagination info" },
    ],

    execute(input, ctx) {
      return inventoryList(ctx, "/items", "items", input);
    },
  };

export default itemList;
