import { pollFromListAction } from "../../_shared/poll/mod.ts";
import type { ActionDefinition } from "@w6w/types";
import action from "../actions/discount-list.ts";

/**
 * `GET /v1/discounts` lists discount objects ordered by `created_at` descending
 * (https://docs.lemonsqueezy.com/api/discounts/list-all-discounts, verified 2026-11-10), so page 1 is
 * newest first; the action exposes no sort parameter, so the documented default is relied on.
 */
export default pollFromListAction({
  key: "new-discount",
  title: "New Discount",
  description:
    "The run gets each newly created discount, oldest first, polled from the existing `discount-list` action in the vendor's documented default order (`created_at` descending).",
  action: action as unknown as ActionDefinition,
  input: () => ({ pageNumber: 1, pageSize: 100 }),
  items: (result) => (result as { data?: unknown[] }).data ?? [],
  idOf: (item) => String((item as { id?: unknown }).id),
  output: [
    {
      "key": "id",
      "type": "string",
      "label": "Discount ID",
    },
    {
      "key": "attributes",
      "type": "object",
      "label": "Discount attributes",
    },
  ],
  sample: {
    "id": "1",
    "type": "discounts",
    "attributes": {
      "name": "Launch",
      "code": "LAUNCH10",
      "amount": 10,
      "created_at": "2026-11-09T10:00:00.000000Z",
    },
  },
  maxPages: 1,
});
