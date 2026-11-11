import { pollFromListAction } from "../../_shared/poll/mod.ts";
import contactList from "../actions/contact-list.ts";
import { idAndUpdated, rows } from "../lib/triggers.ts";

/**
 * Wraps `contact-list` with `order_by=updated_at_desc` — the documented `order_by` enum for
 * GET /2.0/contact takes an `_desc` suffix (https://docs.bexio.com, verified 2026-11-10).
 */
export default pollFromListAction({
  key: "new-or-updated-contact",
  title: "New or Updated Contact",
  description:
    "The run gets each newly created contact and each contact edited since (sorted by last update, newest first).",
  action: contactList,
  input: () => ({ orderBy: "updated_at", descending: true, limit: 100, offset: 0 }),
  items: rows,
  idOf: idAndUpdated,
  output: [
    { key: "id", type: "number", label: "Contact ID" },
    { key: "name_1", type: "string", label: "Name" },
    { key: "updated_at", type: "string", label: "Last updated" },
  ],
  sample: { id: 101, name_1: "Sample Company", updated_at: "2026-11-09 09:00:00" },
  maxPages: 1,
});
