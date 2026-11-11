import { rechargeSince } from "../lib/triggers.ts";
import subscriptionList from "../actions/subscription-list.ts";

/**
 * Since-filter shape over `subscription-list` (`GET /subscriptions`): `created_at_min` window,
 * ascending id, `next_cursor` paging. Dedupes by id.
 * Docs: https://developer.rechargepayments.com/2021-11 (verified 2026-11-10).
 */
export default rechargeSince({
  key: "new-subscription",
  title: "New Subscription",
  description: "The run gets each newly created subscription.",
  action: subscriptionList as never,
  stamp: "created",
  output: [
    { key: "id", type: "number", label: "Subscription ID" },
    { key: "customer_id", type: "number", label: "Customer ID" },
    { key: "address_id", type: "number", label: "Address ID" },
    { key: "status", type: "string", label: "Status" },
    { key: "product_title", type: "string", label: "Product title" },
    { key: "quantity", type: "number", label: "Quantity" },
    { key: "created_at", type: "string", label: "Created at" },
    { key: "updated_at", type: "string", label: "Updated at" },
  ],
  sample: {
    "id": 20,
    "customer_id": 1,
    "address_id": 10,
    "status": "active",
    "product_title": "Coffee",
    "quantity": 1,
    "created_at": "2026-11-09T10:00:00Z",
    "updated_at": "2026-11-09T10:00:00Z",
  },
});
