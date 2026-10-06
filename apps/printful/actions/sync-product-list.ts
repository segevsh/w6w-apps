import type { ActionDefinition } from "@w6w/types";
import { PrintfulClient } from "../lib/client.ts";
import { limitParam, offsetParam } from "../lib/params.ts";

interface Input {
  status?: string;
  categoryId?: string;
  offset?: number;
  limit?: number;
}

/** `GET /store/products` — List the products synced into the store's Printful catalog (the store's own products). */
const syncProductList: ActionDefinition<Input> = {
  key: "sync-product-list",
  type: "search",
  resource: "sync-product",
  title: "List Sync Products",
  description:
    "List the products synced into the store's Printful catalog (the store's own products).",
  params: [
    {
      key: "status",
      label: "Status",
      type: "string",
      hint:
        "Filter: `all`, `synced`, `unsynced`, `ignored`, `imported`, `discontinued` or `out_of_stock`.",
      options: ["all", "synced", "unsynced", "ignored", "imported", "discontinued", "out_of_stock"]
        .map((v) => ({ value: v, label: v })),
    },
    {
      key: "categoryId",
      label: "Category IDs",
      type: "string",
      hint: "Comma-separated category ids.",
    },
    offsetParam,
    limitParam,
  ],
  output: [
    { key: "syncProducts", type: "array", label: "Sync products" },
    { key: "paging", type: "object", label: "Paging" },
  ],

  async execute(input, ctx) {
    const { items, paging } = await new PrintfulClient(ctx).list("/store/products", {
      query: {
        status: input.status,
        category_id: input.categoryId,
        offset: input.offset,
        limit: input.limit,
      },
    });
    return { syncProducts: items, ...(paging ? { paging } : {}) };
  },
};

export default syncProductList;
