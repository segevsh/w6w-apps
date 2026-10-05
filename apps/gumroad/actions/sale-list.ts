import type { ActionDefinition } from "@w6w/types";
import { GumroadClient } from "../lib/client.ts";

/**
 * `GET /v2/sales`
 * Needs the `view_sales` or `account` scope.
 */
interface Input {
  after?: string;
  before?: string;
  productId?: string;
  email?: string;
  orderId?: string;
  name?: string;
  licenseKey?: string;
  pageKey?: string;
}

const saleList: ActionDefinition<Input> = {
  key: "sale-list",
  type: "read",
  resource: "sale",
  title: "List Sales",
  description:
    "Successful sales, newest first, with filters. Paginated via Page key. Needs the `view_sales` or `account` scope.",
  params: [
    {
      "key": "after",
      "label": "After",
      "type": "string",
      "hint": "YYYY-MM-DD. Only sales after this date.",
    },
    {
      "key": "before",
      "label": "Before",
      "type": "string",
      "hint": "YYYY-MM-DD. Only sales before this date.",
    },
    { "key": "productId", "label": "Product ID", "type": "string" },
    { "key": "email", "label": "Buyer email", "type": "string" },
    { "key": "orderId", "label": "Order ID", "type": "string" },
    { "key": "name", "label": "Customer name", "type": "string" },
    { "key": "licenseKey", "label": "License key", "type": "string" },
    {
      "key": "pageKey",
      "label": "Page key",
      "type": "string",
      "hint": "`nextPageKey` from the previous page. Leave empty for the first page.",
    },
  ],
  output: [{ "key": "sales", "type": "array", "label": "Sales" }, {
    "key": "nextPageKey",
    "type": "string",
    "label": "Pass as Page key to fetch the next page; null on the last page",
  }],

  async execute(input, ctx) {
    const body = await new GumroadClient(ctx).call("GET", `/sales`, {
      query: {
        after: input.after,
        before: input.before,
        product_id: input.productId,
        email: input.email,
        order_id: input.orderId,
        name: input.name,
        license_key: input.licenseKey,
        page_key: input.pageKey,
      },
    });
    return { sales: body.sales ?? [], nextPageKey: body.next_page_key ?? null };
  },
};

export default saleList;
