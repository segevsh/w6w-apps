import { walkTrigger } from "../lib/walk.ts";
import listContacts from "../actions/list-contacts.ts";
import { PAGE, parseWealthboxStamp, windowRequest } from "../lib/since.ts";

type Contact = { id?: unknown; created_at?: unknown };

/**
 * Wealthbox documents no created-first order (its collections "are not ordered", per
 * https://dev.wealthbox.com/), so this is the since-filter shape: `updated_since` ("Only returns
 * contacts updated on or after this timestamp") from the last check, deduped by id. A contact is
 * new when its `created_at` is not before the seed.
 */
export default walkTrigger({
  key: "new-contact",
  title: "New Contact",
  description: "The run gets each newly created contact.",
  action: listContacts as never,
  first: ({ sinceMs }) => windowRequest(sinceMs, 1),
  next: (req, _result, got) =>
    got.length >= PAGE ? { ...req, page: Number(req.page) + 1 } : undefined,
  items: (r) => (r as { contacts?: unknown[] }).contacts ?? [],
  idOf: (i) => String((i as Contact).id ?? ""),
  stampOf: (i) => parseWealthboxStamp((i as Contact).created_at),
  output: [
    { key: "id", type: "number", label: "Contact ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "created_at", type: "string", label: "Created at" },
    { key: "updated_at", type: "string", label: "Updated at" },
  ],
  sample: {
    id: 1,
    name: "Ada Lovelace",
    created_at: "2026-11-09 10:00 AM -0500",
    updated_at: "2026-11-09 10:00 AM -0500",
  },
});
