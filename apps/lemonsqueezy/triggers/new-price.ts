import { pollFromListAction } from "../../_shared/poll/mod.ts";
import type { ActionDefinition } from "@w6w/types";
import action from "../actions/price-list.ts";

/**
 * `GET /v1/prices` lists price objects ordered by `created_at` descending
 * (https://docs.lemonsqueezy.com/api/prices/list-all-prices, verified 2026-11-10), so page 1 is
 * newest first; the action exposes no sort parameter, so the documented default is relied on.
 */
export default pollFromListAction({
  key: "new-price",
  title: "New Price",
  description:
    "The run gets each newly created price, oldest first, polled from the existing `price-list` action in the vendor's documented default order (`created_at` descending).",
  action: action as unknown as ActionDefinition,
  input: () => ({ pageNumber: 1, pageSize: 100 }),
  items: (result) => (result as { data?: unknown[] }).data ?? [],
  idOf: (item) => String((item as { id?: unknown }).id),
  output: [
    {
      "key": "id",
      "type": "string",
      "label": "Price ID",
    },
    {
      "key": "attributes",
      "type": "object",
      "label": "Price attributes",
    },
  ],
  sample: {
    "id": "1",
    "type": "prices",
    "attributes": {
      "variant_id": 1,
      "unit_price": 1199,
      "created_at": "2026-11-09T10:00:00.000000Z",
    },
  },
  maxPages: 1,
});
