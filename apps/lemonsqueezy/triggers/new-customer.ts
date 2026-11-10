import { pollFromListAction } from "../../_shared/poll/mod.ts";
import type { ActionDefinition } from "@w6w/types";
import action from "../actions/customer-list.ts";

/**
 * `GET /v1/customers` lists customer objects ordered by `created_at` descending
 * (https://docs.lemonsqueezy.com/api/customers/list-all-customers, verified 2026-11-10), so page 1 is
 * newest first; the action exposes no sort parameter, so the documented default is relied on.
 */
export default pollFromListAction({
  key: "new-customer",
  title: "New Customer",
  description:
    "The run gets each newly created customer, oldest first, polled from the existing `customer-list` action in the vendor's documented default order (`created_at` descending).",
  action: action as unknown as ActionDefinition,
  input: () => ({ pageNumber: 1, pageSize: 100 }),
  items: (result) => (result as { data?: unknown[] }).data ?? [],
  idOf: (item) => String((item as { id?: unknown }).id),
  output: [
    {
      "key": "id",
      "type": "string",
      "label": "Customer ID",
    },
    {
      "key": "attributes",
      "type": "object",
      "label": "Customer attributes",
    },
  ],
  sample: {
    "id": "1",
    "type": "customers",
    "attributes": {
      "name": "Ada Lovelace",
      "email": "ada@example.com",
      "created_at": "2026-11-09T10:00:00.000000Z",
    },
  },
  maxPages: 1,
});
