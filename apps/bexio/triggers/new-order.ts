import { pollFromListAction } from "../../_shared/poll/mod.ts";
import orderList from "../actions/order-list.ts";
import { idOf, rows } from "../lib/triggers.ts";

/**
 * Wraps `order-list` with `order_by=id_desc` — the documented `order_by` enum for
 * GET /2.0/kb_order takes an `_desc` suffix (https://docs.bexio.com, verified 2026-11-10).
 */
export default pollFromListAction({
  key: "new-order",
  title: "New Order",
  description: "The run gets each newly created order (sorted by ID, newest first).",
  action: orderList,
  input: () => ({ orderBy: "id", descending: true, limit: 100, offset: 0 }),
  items: rows,
  idOf: idOf,
  output: [
    { key: "id", type: "number", label: "Order ID" },
    { key: "document_nr", type: "string", label: "Order number" },
    { key: "total", type: "string", label: "Total" },
    { key: "updated_at", type: "string", label: "Last updated" },
  ],
  sample: { id: 101, document_nr: "RE-0001", total: "100.00", updated_at: "2026-11-09 09:00:00" },
  maxPages: 1,
});
