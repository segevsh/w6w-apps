import type { ActionDefinition } from "@w6w/types";
import { GumroadClient } from "../lib/client.ts";

/**
 * `GET /v2/products` — paged: the response carries `next_page_key` while more products follow,
 * which goes back as `page_key` (https://gumroad.com/api, verified 2026-11-10).
 * Needs the `view_profile` or `account` scope.
 */
interface Input {
  pageKey?: string;
}

const productList: ActionDefinition<Input> = {
  key: "product-list",
  type: "read",
  resource: "product",
  title: "List Products",
  description:
    "List the authenticated seller's products, 10 per page, newest first. Needs the `view_profile` or `account` scope.",
  params: [
    {
      "key": "pageKey",
      "label": "Page key",
      "type": "string",
      "hint": "`nextPageKey` from the previous page. Leave empty for the first page.",
    },
  ],
  output: [
    { "key": "products", "type": "array", "label": "The seller's products" },
    {
      "key": "nextPageKey",
      "type": "string",
      "label": "Pass as Page key to fetch the next page; absent on the last page",
    },
  ],

  async execute(input, ctx) {
    const body = await new GumroadClient(ctx).call("GET", `/products`, {
      query: { page_key: input.pageKey },
    });
    return {
      products: body.products ?? [],
      ...(body.next_page_key ? { nextPageKey: String(body.next_page_key) } : {}),
    };
  },
};

export default productList;
