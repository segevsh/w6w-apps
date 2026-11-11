import { pollFromListAction } from "../../_shared/poll/mod.ts";
import quoteList from "../actions/quote-list.ts";
import { idOf, rows } from "../lib/triggers.ts";

/**
 * Wraps `quote-list` with `order_by=id_desc` — the documented `order_by` enum for
 * GET /2.0/kb_offer takes an `_desc` suffix (https://docs.bexio.com, verified 2026-11-10).
 */
export default pollFromListAction({
  key: "new-quote",
  title: "New Quote",
  description: "The run gets each newly created quote (sorted by ID, newest first).",
  action: quoteList,
  input: () => ({ orderBy: "id", descending: true, limit: 100, offset: 0 }),
  items: rows,
  idOf: idOf,
  output: [
    { key: "id", type: "number", label: "Quote ID" },
    { key: "document_nr", type: "string", label: "Quote number" },
    { key: "total", type: "string", label: "Total" },
    { key: "updated_at", type: "string", label: "Last updated" },
  ],
  sample: { id: 101, document_nr: "RE-0001", total: "100.00", updated_at: "2026-11-09 09:00:00" },
  maxPages: 1,
});
