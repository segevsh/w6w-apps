import { pollFromListAction } from "../../_shared/poll/mod.ts";
import type { ActionDefinition } from "@w6w/types";
import action from "../actions/checkout-list.ts";

/**
 * `GET /v1/checkouts` lists checkout objects ordered by `created_at` descending
 * (https://docs.lemonsqueezy.com/api/checkouts/list-all-checkouts, verified 2026-11-10), so page 1 is
 * newest first; the action exposes no sort parameter, so the documented default is relied on.
 */
export default pollFromListAction({
  key: "new-checkout",
  title: "New Checkout",
  description:
    "The run gets each newly created checkout, oldest first, polled from the existing `checkout-list` action in the vendor's documented default order (`created_at` descending).",
  action: action as unknown as ActionDefinition,
  input: () => ({ pageNumber: 1, pageSize: 100 }),
  items: (result) => (result as { data?: unknown[] }).data ?? [],
  idOf: (item) => String((item as { id?: unknown }).id),
  output: [
    {
      "key": "id",
      "type": "string",
      "label": "Checkout ID",
    },
    {
      "key": "attributes",
      "type": "object",
      "label": "Checkout attributes",
    },
  ],
  sample: {
    "id": "1",
    "type": "checkouts",
    "attributes": {
      "store_id": 1,
      "variant_id": 1,
      "created_at": "2026-11-09T10:00:00.000000Z",
    },
  },
  maxPages: 1,
});
