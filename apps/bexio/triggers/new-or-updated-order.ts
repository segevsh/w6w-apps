import { pollFromListAction } from "../../_shared/poll/mod.ts";
import orderList from "../actions/order-list.ts";
import { idAndUpdated, rows } from "../lib/triggers.ts";

/**
 * Wraps `order-list` with `order_by=updated_at_desc` — the documented `order_by` enum for
 * GET /2.0/kb_order takes an `_desc` suffix (https://docs.bexio.com, verified 2026-11-10).
 */
export default pollFromListAction({
  key: "new-or-updated-order",
  title: "New or Updated Order",
  description:
    "The run gets each newly created order and each order edited since (sorted by last update, newest first).",
  action: orderList,
  input: () => ({ orderBy: "updated_at", descending: true, limit: 100, offset: 0 }),
  items: rows,
  idOf: idAndUpdated,
  output: [
    { key: "id", type: "number", label: "Order ID" },
    { key: "document_nr", type: "string", label: "Order number" },
    { key: "total", type: "string", label: "Total" },
    { key: "updated_at", type: "string", label: "Last updated" },
  ],
  sample: { id: 101, document_nr: "RE-0001", total: "100.00", updated_at: "2026-11-09 09:00:00" },
  maxPages: 1,
});
