import { rechargeSince } from "../lib/triggers.ts";
import onetimeList from "../actions/onetime-list.ts";

/**
 * Since-filter shape over `onetime-list` (`GET /onetimes`): `created_at_min` window,
 * ascending id, `next_cursor` paging. Dedupes by id.
 * Docs: https://developer.rechargepayments.com/2021-11 (verified 2026-11-10).
 */
export default rechargeSince({
  key: "new-onetime",
  title: "New One-Time Purchase",
  description: "The run gets each newly created one-time purchase.",
  action: onetimeList as never,
  stamp: "created",
  output: [
    { key: "id", type: "number", label: "One-time ID" },
    { key: "customer_id", type: "number", label: "Customer ID" },
    { key: "address_id", type: "number", label: "Address ID" },
    { key: "product_title", type: "string", label: "Product title" },
    { key: "quantity", type: "number", label: "Quantity" },
    { key: "created_at", type: "string", label: "Created at" },
    { key: "updated_at", type: "string", label: "Updated at" },
  ],
  sample: {
    "id": 30,
    "customer_id": 1,
    "address_id": 10,
    "product_title": "Gift card",
    "quantity": 1,
    "created_at": "2026-11-09T10:00:00Z",
    "updated_at": "2026-11-09T10:00:00Z",
  },
});
