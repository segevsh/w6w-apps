import type { ActionDefinition } from "@w6w/types";
import { GumroadClient, seg } from "../lib/client.ts";

/**
 * `GET /v2/products/:product_id/reviews`
 */
interface Input {
  productId: string;
  pageKey?: string;
}

const reviewList: ActionDefinition<Input> = {
  key: "review-list",
  type: "read",
  resource: "product",
  title: "List Product Reviews",
  description:
    "Reviews shown on a product page, newest first, up to 100 per page. Star-only ratings with no message are not returned.",
  params: [{
    "key": "productId",
    "label": "Product ID",
    "type": "string",
    "required": true,
    "hint":
      "The product's `id` (from List Products, e.g. `A-m3CDDC5dlrSdKZp0RFhA==`), not its permalink.",
  }, {
    "key": "pageKey",
    "label": "Page key",
    "type": "string",
    "hint": "`nextPageKey` from the previous page. Leave empty for the first page.",
  }],
  output: [{ "key": "productReviews", "type": "array", "label": "Reviews" }, {
    "key": "nextPageKey",
    "type": "string",
    "label": "Pass as Page key to fetch the next page; null on the last page",
  }],

  async execute(input, ctx) {
    const body = await new GumroadClient(ctx).call(
      "GET",
      `/products/${seg(input.productId)}/reviews`,
      {
        query: { page_key: input.pageKey },
      },
    );
    return { productReviews: body.product_reviews ?? [], nextPageKey: body.next_page_key ?? null };
  },
};

export default reviewList;
