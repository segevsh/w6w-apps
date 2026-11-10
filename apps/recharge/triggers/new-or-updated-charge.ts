import { rechargeSince } from "../lib/triggers.ts";
import chargeList from "../actions/charge-list.ts";

/**
 * Since-filter shape over `charge-list` (`GET /charges`): `updated_at_min` window,
 * ascending id, `next_cursor` paging. Dedupes by `id:updated_at`, so an edit is a new event.
 * Docs: https://developer.rechargepayments.com/2021-11 (verified 2026-11-10).
 */
export default rechargeSince({
  key: "new-or-updated-charge",
  title: "New or Updated Charge",
  description: "The run gets each charge that is new or was updated since the last check.",
  action: chargeList as never,
  stamp: "updated",
  output: [
    { key: "id", type: "number", label: "Charge ID" },
    { key: "customer_id", type: "number", label: "Customer ID" },
    { key: "address_id", type: "number", label: "Address ID" },
    { key: "status", type: "string", label: "Status" },
    { key: "total_price", type: "string", label: "Total price" },
    { key: "scheduled_at", type: "string", label: "Scheduled at" },
    { key: "created_at", type: "string", label: "Created at" },
    { key: "updated_at", type: "string", label: "Updated at" },
  ],
  sample: {
    "id": 50,
    "customer_id": 1,
    "address_id": 10,
    "status": "queued",
    "total_price": "24.00",
    "created_at": "2026-11-09T10:00:00Z",
    "updated_at": "2026-11-09T10:00:00Z",
  },
});
