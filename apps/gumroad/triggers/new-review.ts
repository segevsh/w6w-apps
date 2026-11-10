import type { ActionDefinition } from "@w6w/types";
import { pollFromListAction } from "../../_shared/poll/mod.ts";
import reviewList from "../actions/review-list.ts";
import { productIdParam } from "../lib/triggers.ts";

/**
 * `GET /v2/products/:product_id/reviews` is documented "newest first" with `page_key` paging, up
 * to 100 per page (https://gumroad.com/api, verified 2026-11-10).
 */
export default pollFromListAction<{ productId: string }>({
  key: "new-review",
  title: "New Review",
  description: "The run gets each new written review on the chosen Gumroad product.",
  action: reviewList as unknown as ActionDefinition,
  params: [productIdParam],
  input: ({ productId }) => ({ productId }),
  items: (result) => (result as { productReviews?: unknown[] }).productReviews ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [
    { key: "id", type: "string", label: "Review ID" },
    { key: "rating", type: "number", label: "Stars (1-5)" },
    { key: "message", type: "string", label: "Review text" },
  ],
  sample: { id: "rev_1", rating: 5, message: "Great pack." },
});
