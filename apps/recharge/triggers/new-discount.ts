import { rechargeSince } from "../lib/triggers.ts";
import discountList from "../actions/discount-list.ts";

/**
 * Since-filter shape over `discount-list` (`GET /discounts`): `created_at_min` window,
 * ascending id, `next_cursor` paging. Dedupes by id.
 * Docs: https://developer.rechargepayments.com/2021-11 (verified 2026-11-10).
 */
export default rechargeSince({
  key: "new-discount",
  title: "New Discount",
  description: "The run gets each newly created discount.",
  action: discountList as never,
  stamp: "created",
  output: [
    { key: "id", type: "number", label: "Discount ID" },
    { key: "code", type: "string", label: "Code" },
    { key: "status", type: "string", label: "Status" },
    { key: "value", type: "number", label: "Value" },
    { key: "value_type", type: "string", label: "Value type" },
    { key: "created_at", type: "string", label: "Created at" },
    { key: "updated_at", type: "string", label: "Updated at" },
  ],
  sample: {
    "id": 40,
    "code": "WELCOME10",
    "status": "enabled",
    "value": 10,
    "value_type": "percentage",
    "created_at": "2026-11-09T10:00:00Z",
    "updated_at": "2026-11-09T10:00:00Z",
  },
});
