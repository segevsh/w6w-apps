import { rechargeSince } from "../lib/triggers.ts";
import customerList from "../actions/customer-list.ts";

/**
 * Since-filter shape over `customer-list` (`GET /customers`): `updated_at_min` window,
 * ascending id, `next_cursor` paging. Dedupes by `id:updated_at`, so an edit is a new event.
 * Docs: https://developer.rechargepayments.com/2021-11 (verified 2026-11-10).
 */
export default rechargeSince({
  key: "new-or-updated-customer",
  title: "New or Updated Customer",
  description: "The run gets each customer that is new or was updated since the last check.",
  action: customerList as never,
  stamp: "updated",
  output: [
    { key: "id", type: "number", label: "Customer ID" },
    { key: "email", type: "string", label: "Email" },
    { key: "first_name", type: "string", label: "First name" },
    { key: "last_name", type: "string", label: "Last name" },
    { key: "created_at", type: "string", label: "Created at" },
    { key: "updated_at", type: "string", label: "Updated at" },
  ],
  sample: {
    "id": 1,
    "email": "ada@example.com",
    "first_name": "Ada",
    "last_name": "Lovelace",
    "created_at": "2026-11-09T10:00:00Z",
    "updated_at": "2026-11-09T10:00:00Z",
  },
});
