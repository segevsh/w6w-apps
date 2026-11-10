import { rechargeSince } from "../lib/triggers.ts";
import addressList from "../actions/address-list.ts";

/**
 * Since-filter shape over `address-list` (`GET /addresses`): `updated_at_min` window,
 * ascending id, `next_cursor` paging. Dedupes by `id:updated_at`, so an edit is a new event.
 * Docs: https://developer.rechargepayments.com/2021-11 (verified 2026-11-10).
 */
export default rechargeSince({
  key: "new-or-updated-address",
  title: "New or Updated Address",
  description: "The run gets each address that is new or was updated since the last check.",
  action: addressList as never,
  stamp: "updated",
  output: [
    { key: "id", type: "number", label: "Address ID" },
    { key: "customer_id", type: "number", label: "Customer ID" },
    { key: "address1", type: "string", label: "Address line 1" },
    { key: "city", type: "string", label: "City" },
    { key: "country_code", type: "string", label: "Country code" },
    { key: "created_at", type: "string", label: "Created at" },
    { key: "updated_at", type: "string", label: "Updated at" },
  ],
  sample: {
    "id": 10,
    "customer_id": 1,
    "address1": "1 Main St",
    "city": "Austin",
    "country_code": "US",
    "created_at": "2026-11-09T10:00:00Z",
    "updated_at": "2026-11-09T10:00:00Z",
  },
});
