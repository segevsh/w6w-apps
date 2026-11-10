import { pollFromListAction } from "../../_shared/poll/mod.ts";
import invoiceList from "../actions/invoice-list.ts";
import { idAndUpdated, rows } from "../lib/triggers.ts";

/**
 * Wraps `invoice-list` with `order_by=updated_at_desc` — the documented `order_by` enum for
 * GET /2.0/kb_invoice takes an `_desc` suffix (https://docs.bexio.com, verified 2026-11-10).
 */
export default pollFromListAction({
  key: "new-or-updated-invoice",
  title: "New or Updated Invoice",
  description:
    "The run gets each newly created invoice and each invoice edited since (sorted by last update, newest first).",
  action: invoiceList,
  input: () => ({ orderBy: "updated_at", descending: true, limit: 100, offset: 0 }),
  items: rows,
  idOf: idAndUpdated,
  output: [
    { key: "id", type: "number", label: "Invoice ID" },
    { key: "document_nr", type: "string", label: "Invoice number" },
    { key: "total", type: "string", label: "Total" },
    { key: "updated_at", type: "string", label: "Last updated" },
  ],
  sample: { id: 101, document_nr: "RE-0001", total: "100.00", updated_at: "2026-11-09 09:00:00" },
  maxPages: 1,
});
