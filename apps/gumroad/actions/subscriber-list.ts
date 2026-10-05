import type { ActionDefinition } from "@w6w/types";
import { GumroadClient, seg } from "../lib/client.ts";

/**
 * `GET /v2/products/:product_id/subscribers`
 * Needs the `view_sales` or `account` scope.
 */
interface Input {
  productId: string;
  email?: string;
  paginated?: boolean;
  pageKey?: string;
}

const subscriberList: ActionDefinition<Input> = {
  key: "subscriber-list",
  type: "read",
  resource: "subscriber",
  title: "List Subscribers",
  description:
    "Subscribers of a membership product. Without Paginated, Gumroad returns ALL of them in one response. Needs the `view_sales` or `account` scope.",
  params: [
    {
      "key": "productId",
      "label": "Product ID",
      "type": "string",
      "required": true,
      "hint":
        "The product's `id` (from List Products, e.g. `A-m3CDDC5dlrSdKZp0RFhA==`), not its permalink.",
    },
    { "key": "email", "label": "Email", "type": "string", "hint": "Filter by subscriber email." },
    {
      "key": "paginated",
      "label": "Paginated",
      "type": "boolean",
      "default": true,
      "hint":
        "Limits a response to 100 subscribers and enables Page key. Gumroad's own default is false, which is unbounded.",
    },
    {
      "key": "pageKey",
      "label": "Page key",
      "type": "string",
      "hint": "`nextPageKey` from the previous page. Leave empty for the first page.",
    },
  ],
  output: [{ "key": "subscribers", "type": "array", "label": "Subscribers" }, {
    "key": "nextPageKey",
    "type": "string",
    "label": "Pass as Page key to fetch the next page; null on the last page",
  }],

  async execute(input, ctx) {
    const body = await new GumroadClient(ctx).call(
      "GET",
      `/products/${seg(input.productId)}/subscribers`,
      {
        query: { email: input.email, paginated: input.paginated ?? true, page_key: input.pageKey },
      },
    );
    return { subscribers: body.subscribers ?? [], nextPageKey: body.next_page_key ?? null };
  },
};

export default subscriberList;
