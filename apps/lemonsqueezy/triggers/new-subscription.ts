import { pollFromListAction } from "../../_shared/poll/mod.ts";
import type { ActionDefinition } from "@w6w/types";
import action from "../actions/subscription-list.ts";

/**
 * `GET /v1/subscriptions` lists subscription objects ordered by `created_at` descending
 * (https://docs.lemonsqueezy.com/api/subscriptions/list-all-subscriptions, verified 2026-11-10), so page 1 is
 * newest first; the action exposes no sort parameter, so the documented default is relied on.
 */
export default pollFromListAction({
  key: "new-subscription",
  title: "New Subscription",
  description:
    "The run gets each newly created subscription, oldest first, polled from the existing `subscription-list` action in the vendor's documented default order (`created_at` descending).",
  action: action as unknown as ActionDefinition,
  input: () => ({ pageNumber: 1, pageSize: 100 }),
  items: (result) => (result as { data?: unknown[] }).data ?? [],
  idOf: (item) => String((item as { id?: unknown }).id),
  output: [
    {
      "key": "id",
      "type": "string",
      "label": "Subscription ID",
    },
    {
      "key": "attributes",
      "type": "object",
      "label": "Subscription attributes",
    },
  ],
  sample: {
    "id": "1",
    "type": "subscriptions",
    "attributes": {
      "store_id": 1,
      "status": "active",
      "user_email": "ada@example.com",
      "created_at": "2026-11-09T10:00:00.000000Z",
    },
  },
  maxPages: 1,
});
