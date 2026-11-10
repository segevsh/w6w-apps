import type { ActionDefinition } from "@w6w/types";
import action from "../actions/product-list.ts";
import { snapshotTrigger } from "../lib/triggers.ts";

/**
 * `GET /v1/products` lists product objects ordered by `name`, not by creation
 * (https://docs.lemonsqueezy.com/api/products/list-all-products, verified 2026-11-10), so a newest-first
 * window does not exist. The collection is small and bounded (a store's own catalogue), so each
 * check reads it whole (`page[size]=100`, at most 10 pages) and diffs the ids.
 */
export default snapshotTrigger({
  key: "new-product",
  title: "New Product",
  description:
    "The run gets each product that appears in the account, found by diffing the whole `product-list` listing between checks.",
  action: action as unknown as ActionDefinition,
  output: [
    {
      "key": "id",
      "type": "string",
      "label": "Product ID",
    },
    {
      "key": "attributes",
      "type": "object",
      "label": "Product attributes",
    },
  ],
  sample: {
    "id": "1",
    "type": "products",
    "attributes": {
      "name": "Pro plan",
      "status": "published",
      "created_at": "2026-11-09T10:00:00.000000Z",
    },
  },
});
